import { CustomerHandler } from './handlers/customer';
import { SubscriptionHandler } from './handlers/subscription';
import { BillingEngine } from './services/billingEngine';
import { PaymentHandler } from './handlers/payment';
import { handleScheduledPaymentRetry } from './workers/paymentRetry';
import { SubscriptionPlan } from './models/subscriptionPlan';
import { Customer } from './models/customer';

export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		try {
			const url = new URL(request.url);
			const { pathname } = url;
			const method = request.method;

			const routes: { [key: string]: (request: Request, env: any) => Promise<Response> } = {
				'GET /subscription-plans': () => this.getSubscriptionPlans(env),
				'POST /subscription-plans': () => this.createSubscriptionPlan(request, env),
				'GET /subscription-plans/:id': () => this.getSubscriptionPlan(request, env, pathname),
				'POST /customers': () => this.createCustomer(request, env),
				'GET /customers': () => this.getAllCustomers(request, env),
				'POST /customers/assign-subscription': () => this.assignSubscription(request, env),
				'POST /customers/cancel-subscription': () => this.cancelSubscription(request, env),
				'POST /generate-invoice': () => this.generateInvoice(request, env),
				'POST /subscriptions/change-plan': () => this.changePlan(request, env),
				'POST /process-payment': () => this.processPayment(request, env),
				// Scheduled tasks routes for testing
				'POST /test-scheduled': () => this.testScheduled(ctx, env)
			};

			const routeKey = `${method} ${this.stripTrailingSlash(pathname)}`;
			const routeHandler = routes[routeKey] || routes[`${method} ${this.getDynamicRoute(pathname)}`];

			if (routeHandler) {
				return await routeHandler(request, env);
			}

			return new Response('Not Found', { status: 404 });
		} catch (error) {
			return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500 });
		}
	},

	createErrorResponse(status: number, message: string): Response {
		return new Response(JSON.stringify({ error: message }), {
			status,
			headers: { 'Content-Type': 'application/json' },
		});
	},

	stripTrailingSlash(path: string) {
		return path.endsWith('/') ? path.slice(0, -1) : path;
	},

	getDynamicRoute(path: string): string {
		if (path.startsWith('/subscription-plans/')) {
			return '/subscription-plans/:id';
		}
		return '';
	},

	async getSubscriptionPlans(env: any): Promise<Response> {
		const subscriptionHandler = new SubscriptionHandler(env);
		const plans = await subscriptionHandler.getSubscriptionPlans();
		if (plans.length === 0) {
			return this.createErrorResponse(404, 'No subscription plans found');
		}
		return new Response(JSON.stringify(plans));
	},

	async createSubscriptionPlan(request: Request, env: any): Promise<Response> {
		const subscriptionHandler = new SubscriptionHandler(env);
		const plan = await request.json() as SubscriptionPlan;
		const newPlan = await subscriptionHandler.createSubscriptionPlan(plan);
		if (!newPlan) {
			return this.createErrorResponse(400, 'Failed to create subscription plan');
		}
		return new Response(JSON.stringify(newPlan), { status: 201 });
	},

	async getSubscriptionPlan(request: Request, env: any, pathname: string): Promise<Response> {
		const id = pathname.split('/').pop();
		const subscriptionHandler = new SubscriptionHandler(env);
		const plan = await subscriptionHandler.getSubscriptionPlan(id!);
		if (!plan) {
			return this.createErrorResponse(404, 'Plan not found');
		}
		return new Response(JSON.stringify(plan));
	},

	async createCustomer(request: Request, env: any): Promise<Response> {
		const customerHandler = new CustomerHandler(env);
		const customer = await request.json() as Customer;
		const newCustomer = await customerHandler.createCustomer(customer);
		if (!newCustomer) {
			return this.createErrorResponse(400, 'Failed to create customer');
		}
		return new Response(JSON.stringify(newCustomer), { status: 201 });
	},

	async getAllCustomers(request: Request, env: any): Promise<Response> {
		const customerHandler = new CustomerHandler(env);
		const customers = await customerHandler.getCustomers();
		return new Response(JSON.stringify(customers));
	},

	async assignSubscription(request: Request, env: any): Promise<Response> {
		const customerHandler = new CustomerHandler(env);
		const { customerId, planId } = await request.json() as { customerId: string, planId: string };
		const updatedCustomer = await customerHandler.assignSubscriptionToCustomer(customerId, planId);
		return new Response(JSON.stringify(updatedCustomer));
	},

	async cancelSubscription(request: Request, env: any): Promise<Response> {
		const customerHandler = new CustomerHandler(env);
		const { customerId } = await request.json() as { customerId: string };
		const updatedCustomer = await customerHandler.cancelSubscription(customerId);
		return new Response(JSON.stringify(updatedCustomer));
	},

	async generateInvoice(request: Request, env: any): Promise<Response> {
		const { customerId } = await request.json() as { customerId: string };
		const billingEngine = new BillingEngine(env);
		const invoice = await billingEngine.generateInvoice(customerId);
		return new Response(JSON.stringify(invoice), { status: 201 });
	},

	async changePlan(request: Request, env: any): Promise<Response> {
		const { customerId, newPlanId } = await request.json() as { customerId: string, newPlanId: string };
		const billingEngine = new BillingEngine(env);
		const invoice = await billingEngine.handlePlanChange(customerId, newPlanId);
		return new Response(JSON.stringify(invoice), { status: 200 });
	},

	async processPayment(request: Request, env: any): Promise<Response> {
		const { invoiceId, paymentMethod } = await request.json() as { invoiceId: string, paymentMethod: 'credit_card' | 'paypal' };
		const paymentHandler = new PaymentHandler(env);
		try {
			const payment = await paymentHandler.processPayment(invoiceId, paymentMethod);
			return new Response(JSON.stringify(payment), { status: 200 });
		} catch (error) {
			return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400 });
		}
	},

	async testScheduled(ctx: ExecutionContext, env: any): Promise<Response> {
		await this.scheduled({} as ScheduledEvent, env, ctx);
		return new Response('Scheduled job tested', { status: 200 });
	},

	async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
		console.log("Cron job running...");

		// Process all scheduled payment retries
		const retryKeys = await env.BILLING_KV.list({ prefix: 'retry:' });
		console.log("Retry keys:", retryKeys);
		for (const key of retryKeys.keys) {
			const invoiceId = key.name.split(':')[1];
			await handleScheduledPaymentRetry(env, invoiceId);
			await env.BILLING_KV.delete(key.name);
		}
	},
};
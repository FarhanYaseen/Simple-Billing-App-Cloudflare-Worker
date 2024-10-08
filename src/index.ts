import { CustomerHandler } from './handlers/customer';
import { SubscriptionHandler } from './handlers/subscription';
import { BillingEngine } from './services/billingEngine';
import { BillingDurableObject } from './durableObjects/billingDurableObject';
export { BillingDurableObject };
import { PaymentHandler } from './handlers/payment';
import { handleScheduledPaymentRetry } from './workers/paymentRetry';
import { SubscriptionPlan } from './models/subscriptionPlan';
import { Customer } from './models/customer';

export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const subscriptionHandler = new SubscriptionHandler(env);
		const customerHandler = new CustomerHandler(env);

		if (url.pathname === '/subscription-plans' && request.method === 'GET') {
			const plans = await subscriptionHandler.getSubscriptionPlans();
			return new Response(JSON.stringify(plans));
		}
		if (url.pathname === '/subscription-plans' && request.method === 'POST') {
			const plan = await request.json() as SubscriptionPlan;
			const newPlan = await subscriptionHandler.createSubscriptionPlan(plan);
			return new Response(JSON.stringify(newPlan), { status: 201 });
		}

		if (url.pathname.startsWith('/subscription-plans/') && request.method === 'GET') {
			const id = url.pathname.split('/').pop();
			const plan = await subscriptionHandler.getSubscriptionPlan(id!);
			return plan
				? new Response(JSON.stringify(plan))
				: new Response('Plan not found', { status: 404 });
		}

		if (url.pathname === '/customers' && request.method === 'POST') {
			const customer = await request.json() as Customer;
			const newCustomer = await customerHandler.createCustomer(customer);
			return new Response(JSON.stringify(newCustomer), { status: 201 });
		}

		if (url.pathname === '/customers/assign-subscription' && request.method === 'POST') {
			const { customerId, planId } = await request.json() as { customerId: string, planId: string };
			const updatedCustomer = await customerHandler.assignSubscriptionToCustomer(customerId, planId);
			return new Response(JSON.stringify(updatedCustomer));
		}

		if (url.pathname === '/customers/cancel-subscription' && request.method === 'POST') {
			const { customerId } = await request.json() as { customerId: string };
			const updatedCustomer = await customerHandler.cancelSubscription(customerId);
			return new Response(JSON.stringify(updatedCustomer));
		}

		if (url.pathname === '/generate-invoice' && request.method === 'POST') {
			const { customerId } = await request.json() as { customerId: string };
			const billingEngine = new BillingEngine(env);
			const invoice = await billingEngine.generateInvoice(customerId);
			return new Response(JSON.stringify(invoice), { status: 201 });
		}

		if (url.pathname === '/subscriptions/change-plan' && request.method === 'POST') {
			const { customerId, newPlanId } = await request.json() as { customerId: string, newPlanId: string };
			const billingEngine = new BillingEngine(env);
			const invoice = await billingEngine.handlePlanChange(customerId, newPlanId);
			return new Response(JSON.stringify(invoice), { status: 200 });
		}

		if (url.pathname === '/process-payment' && request.method === 'POST') {
			const { invoiceId, paymentMethod } = await request.json() as { invoiceId: string, paymentMethod: 'credit_card' | 'paypal' };
			const paymentHandler = new PaymentHandler(env);
			try {
				const payment = await paymentHandler.processPayment(invoiceId, paymentMethod);
				return new Response(JSON.stringify(payment), { status: 200 });
			} catch (error) {
				return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400 });
			}
		}

		if (url.pathname === '/test-scheduled' && request.method === 'POST') {
			await this.scheduled({} as ScheduledEvent, env, ctx);
			return new Response('Scheduled job tested', { status: 200 });
		}

		return new Response('Not Found', { status: 404 });
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
import { Invoice } from '../models/invoice';
import { Customer } from '../models/customer';
import { SubscriptionPlan } from '../models/subscriptionPlan';
import { NotificationService } from './notificationService';

export class BillingEngine {

    private notificationService: NotificationService;

    constructor(private env: any) {
        this.notificationService = new NotificationService(env);
    }

    async generateInvoice(customerId: string): Promise<Invoice> {
        const customer = await this.getCustomer(customerId);
        const plan = await this.getSubscriptionPlan(customer.subscriptionPlanId);

        const invoiceId = crypto.randomUUID();
        const dueDate = this.calculateDueDate(plan.billingCycle);

        const invoice: Invoice = {
            id: invoiceId,
            customerId,
            amount: plan.price,
            dueDate,
            paymentStatus: 'pending'
        };

        await this.env.BILLING_KV.put(`invoice:${invoiceId}`, JSON.stringify(invoice));
        await this.notificationService.sendInvoiceGeneratedNotification(customer, invoice);
        return invoice;
    }

    async handlePlanChange(customerId: string, newPlanId: string): Promise<Invoice> {
        const customer = await this.getCustomer(customerId);
        const oldPlan = await this.getSubscriptionPlan(customer.subscriptionPlanId);
        const newPlan = await this.getSubscriptionPlan(newPlanId);

        if (oldPlan.id === newPlan.id) {
            throw new Error('Customer already has the assigned subscription plan');
        }

        const daysInBillingCycle = this.getDaysInBillingCycle(oldPlan.billingCycle);
        const daysElapsed = this.getDaysElapsed(customer.subscriptionStartDate);
        const daysRemaining = daysInBillingCycle - daysElapsed;

        // Calculate proration based on elapsed and remaining days
        const oldPlanProration = (oldPlan.price / daysInBillingCycle) * daysElapsed;
        const newPlanProration = (newPlan.price / daysInBillingCycle) * daysRemaining;

        const proratedAmount = newPlanProration - oldPlanProration;

        const invoiceId = crypto.randomUUID();
        const dueDate = this.calculateDueDate(newPlan.billingCycle);

        const invoice: Invoice = {
            id: invoiceId,
            customerId,
            amount: proratedAmount,
            dueDate,
            paymentStatus: 'pending'
        };

        await this.env.BILLING_KV.put(`invoice:${invoiceId}`, JSON.stringify(invoice));

        // Update customer's subscription
        customer.subscriptionPlanId = newPlanId;
        customer.subscriptionStartDate = new Date().toISOString(); // Reset the start date for the new plan
        await this.env.BILLING_KV.put(`customer:${customerId}`, JSON.stringify(customer));

        return invoice;
    }

    private async getCustomer(customerId: string): Promise<Customer> {
        const customerData = await this.env.BILLING_KV.get(`customer:${customerId}`);
        if (!customerData) throw new Error('Customer not found');
        return JSON.parse(customerData);
    }

    private async getSubscriptionPlan(planId: string): Promise<SubscriptionPlan> {
        const planData = await this.env.BILLING_KV.get(`plan:${planId}`);
        if (!planData) throw new Error('Subscription plan not found');
        return JSON.parse(planData);
    }

    private calculateDueDate(billingCycle: 'monthly' | 'yearly'): string {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (billingCycle === 'monthly' ? 30 : 365));
        return dueDate.toISOString();
    }

    private getDaysInBillingCycle(billingCycle: 'monthly' | 'yearly'): number {
        return billingCycle === 'monthly' ? 30 : 365;
    }

    private getDaysElapsed(startDate: string): number {
        const start = new Date(startDate);
        const now = new Date();
        return Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }
}
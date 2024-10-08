import { SubscriptionPlan } from '../models/subscriptionPlan';
import { Customer } from '../models/customer';

export class SubscriptionHandler {
    constructor(private env: any) { }

    async createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id'>): Promise<SubscriptionPlan> {
        const id = crypto.randomUUID();
        const newPlan: SubscriptionPlan = { id, ...plan };
        await this.env.BILLING_KV.put(`plan:${id}`, JSON.stringify(newPlan));
        return newPlan;
    }

    async getSubscriptionPlan(id: string): Promise<SubscriptionPlan | null> {
        const plan = await this.env.BILLING_KV.get(`plan:${id}`);
        return plan ? JSON.parse(plan) : null;
    }


    async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
        const plans = await this.env.BILLING_KV.list({ prefix: "plan:" });
        const result = await Promise.all(
            plans.keys.map((key: any) => this.env.BILLING_KV.get(key.name))
          );
          return result;
    }
    
}
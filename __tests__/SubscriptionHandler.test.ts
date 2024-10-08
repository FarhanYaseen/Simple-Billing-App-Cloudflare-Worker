import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionHandler } from '../src/handlers/subscription';
import { SubscriptionPlan } from '../src/models/subscriptionPlan';
import { Customer } from '../src/models/customer';

const mockKV = {
    data: new Map<string, string>(),
    async put(key: string, value: string) {
        this.data.set(key, value);
    },
    async get(key: string) {
        return this.data.get(key) || null;
    },
    async list({ prefix }: { prefix: string }) {
        const keys = Array.from(this.data.keys())
            .filter(key => key.startsWith(prefix))
            .map(key => ({ name: key }));
        return { keys };
    }
};

vi.mock('crypto', () => ({
    randomUUID: () => 'mocked-uuid'
}));

describe('SubscriptionHandler', () => {
    let handler: SubscriptionHandler;

    beforeEach(() => {
        handler = new SubscriptionHandler({ BILLING_KV: mockKV });
        mockKV.data.clear();
    });

    it('should create a subscription plan', async () => {
        const plan: Omit<SubscriptionPlan, 'id'> = {
            name: 'Basic Plan',
            price: 10,
            billingCycle: 'monthly',
            status: 'active'
        };

        const { id, ...result } = await handler.createSubscriptionPlan(plan);
        expect(result).toEqual(plan);
        expect(id).toBeDefined();
    });

    it('should get a subscription plan by ID', async () => {
        const plan: SubscriptionPlan = {
            id: 'mocked-uuid',
            name: 'Basic Plan',
            price: 10,
            billingCycle: 'monthly',
            status: 'active'
        };
        await mockKV.put('plan:mocked-uuid', JSON.stringify(plan));

        const result = await handler.getSubscriptionPlan('mocked-uuid');

        expect(result).toEqual(plan);
    });

    it('should return null if subscription plan not found', async () => {
        const result = await handler.getSubscriptionPlan('non-existent-id');
        expect(result).toBeNull();
    });

    it('should get all subscription plans', async () => {
        const plan1: SubscriptionPlan = { id: 'plan-1', name: 'Basic Plan', price: 10, billingCycle: 'monthly', status: 'active' };
        const plan2: SubscriptionPlan = { id: 'plan-2', name: 'Premium Plan', price: 20, billingCycle: 'monthly', status: 'active' };
        await mockKV.put('plan:plan-1', JSON.stringify(plan1));
        await mockKV.put('plan:plan-2', JSON.stringify(plan2));

        const result = await handler.getSubscriptionPlans();

        expect(result).toEqual([JSON.stringify(plan1), JSON.stringify(plan2)]);
    });

    it('should assign a subscription plan to a customer', async () => {
        const customer: Customer = { id: 'customer-1', name: 'John Doe', subscriptionPlanId: 'plan-1', subscriptionStatus: 'active', email: 'john.doe@example.com', subscriptionStartDate: new Date().toISOString() };
        await mockKV.put('customer:customer-1', JSON.stringify(customer));

        const result = await handler.assignSubscriptionToCustomer('customer-1', 'plan-1');

        expect(result.subscriptionPlanId).toBe('plan-1');
        expect(result.subscriptionStatus).toBe('active');
        expect(mockKV.data.get('customer:customer-1')).toEqual(JSON.stringify(result));
    });

    it('should throw an error when assigning a subscription to a non-existent customer', async () => {
        await expect(handler.assignSubscriptionToCustomer('non-existent-customer', 'plan-1')).rejects.toThrow('Customer not found');
    });

    it('should cancel a customer subscription', async () => {
        const customer: Customer = { id: 'customer-1', name: 'John Doe', subscriptionPlanId: 'plan-1', subscriptionStatus: 'active', email: 'john.doe@example.com', subscriptionStartDate: new Date().toISOString() };
        await mockKV.put('customer:customer-1', JSON.stringify(customer));

        const result = await handler.cancelSubscription('customer-1');

        expect(result.subscriptionStatus).toBe('cancelled');
        expect(mockKV.data.get('customer:customer-1')).toEqual(JSON.stringify(result));
    });

    it('should throw an error when canceling a subscription for a non-existent customer', async () => {
        await expect(handler.cancelSubscription('non-existent-customer')).rejects.toThrow('Customer not found');
    });
});
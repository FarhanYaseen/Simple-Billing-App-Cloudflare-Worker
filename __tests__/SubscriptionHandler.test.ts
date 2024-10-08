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

});
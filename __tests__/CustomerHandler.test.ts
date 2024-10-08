import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CustomerHandler } from '../src/handlers/customer';
import { SubscriptionPlan } from '../src/models/subscriptionPlan';
import { Customer } from '../src/models/customer';
import { SubscriptionHandler } from '../src/handlers/subscription';

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
    let subscriptionHandler: SubscriptionHandler;   
    let customerHandler: CustomerHandler;   

    beforeEach(() => {
        subscriptionHandler = new SubscriptionHandler({ BILLING_KV: mockKV });  
        customerHandler = new CustomerHandler({ BILLING_KV: mockKV });
        mockKV.data.clear();
    });


    it('should create a customer', async () => {
        const customerData: Omit<Customer, 'id'> = {
            name: 'Jane Doe',
            email: 'jane.doe@example.com',
            subscriptionPlanId: 'plan-1',
            subscriptionStatus: 'active',
            subscriptionStartDate: new Date().toISOString()
        };

        const result = await customerHandler.createCustomer(customerData);

        expect(result.name).toBe(customerData.name);
        expect(result.email).toBe(customerData.email);
        expect(result.subscriptionPlanId).toBe(customerData.subscriptionPlanId);
        expect(result.subscriptionStatus).toBe(customerData.subscriptionStatus);
        expect(result.id).toBeDefined();
        expect(mockKV.data.get(`customer:${result.id}`)).toEqual(JSON.stringify(result));
    });

    it('should assign a subscription plan to a customer', async () => {
        const customer: Customer = { id: 'customer-1', name: 'John Doe', subscriptionPlanId: 'plan-1', subscriptionStatus: 'active', email: 'john.doe@example.com', subscriptionStartDate: new Date().toISOString() };
        await mockKV.put('customer:customer-1', JSON.stringify(customer));

        const result = await customerHandler.assignSubscriptionToCustomer('customer-1', 'plan-1');

        expect(result.subscriptionPlanId).toBe('plan-1');
        expect(result.subscriptionStatus).toBe('active');
        expect(mockKV.data.get('customer:customer-1')).toEqual(JSON.stringify(result));
    });

    it('should throw an error when assigning a subscription to a non-existent customer', async () => {
        await expect(customerHandler.assignSubscriptionToCustomer('non-existent-customer', 'plan-1')).rejects.toThrow('Customer not found');
    });

    it('should cancel a customer subscription', async () => {
        const customer: Customer = { id: 'customer-1', name: 'John Doe', subscriptionPlanId: 'plan-1', subscriptionStatus: 'active', email: 'john.doe@example.com', subscriptionStartDate: new Date().toISOString() };
        await mockKV.put('customer:customer-1', JSON.stringify(customer));

        const result = await customerHandler.cancelSubscription('customer-1');

        expect(result.subscriptionStatus).toBe('cancelled');
        expect(mockKV.data.get('customer:customer-1')).toEqual(JSON.stringify(result));
    });

    it('should throw an error when canceling a subscription for a non-existent customer', async () => {
        await expect(customerHandler.cancelSubscription('non-existent-customer')).rejects.toThrow('Customer not found');
    });

});
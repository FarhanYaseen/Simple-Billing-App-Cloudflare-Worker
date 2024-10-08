import { BillingEngine } from '../src/services/billingEngine';
import { describe, it, beforeEach, expect, vi } from 'vitest';

const mockEnv = {
    BILLING_KV: {
        get: vi.fn(),
        put: vi.fn()
    }
};
const mockNotificationService = {
    sendInvoiceGeneratedNotification: vi.fn()
};

vi.mock('../src/services/notificationService', () => {
    return {
        NotificationService: vi.fn().mockImplementation(() => mockNotificationService)
    };
});

const billingEngine = new BillingEngine(mockEnv);

const customerId = 'customer-123';
const subscriptionPlanId = 'plan-456';
const newSubscriptionPlanId = 'plan-789';
const customerData = {
    id: customerId,
    subscriptionPlanId,
    subscriptionStartDate: new Date().toISOString()
};
const oldPlanData = {
    id: subscriptionPlanId,
    billingCycle: 'monthly',
    price: 100
};
const newPlanData = {
    id: newSubscriptionPlanId,
    billingCycle: 'monthly',
    price: 150
};

const setupGetMocks = () => {
    mockEnv.BILLING_KV.get.mockImplementation(async (key: string) => {
        if (key === `customer:${customerId}`) return JSON.stringify(customerData);
        if (key === `plan:${subscriptionPlanId}`) return JSON.stringify(oldPlanData);
        if (key === `plan:${newSubscriptionPlanId}`) return JSON.stringify(newPlanData);
        return null;
    });
};

describe('BillingEngine', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setupGetMocks();
    });

    describe('generateInvoice', () => {
        it('should generate an invoice for a customer', async () => {
            const invoice = await billingEngine.generateInvoice(customerId);

            expect(mockEnv.BILLING_KV.put).toHaveBeenCalledWith(
                expect.stringContaining('invoice:'),
                expect.any(String)
            );
            expect(mockNotificationService.sendInvoiceGeneratedNotification).toHaveBeenCalledWith(
                customerData,
                expect.objectContaining({
                    customerId,
                    amount: oldPlanData.price,
                    paymentStatus: 'pending'
                })
            );
            expect(invoice.customerId).toBe(customerId);
            expect(invoice.amount).toBe(oldPlanData.price);
            expect(invoice.paymentStatus).toBe('pending');
        });

        it('should throw an error if customer is not found', async () => {
            mockEnv.BILLING_KV.get.mockResolvedValueOnce(null);
            await expect(billingEngine.generateInvoice('invalid-customer')).rejects.toThrow('Customer not found');
        });
    });

    describe('handlePlanChange', () => {
        it("should handle a customer's plan change and generate a prorated invoice", async () => {
            const invoice = await billingEngine.handlePlanChange(customerId, newSubscriptionPlanId);

            expect(mockEnv.BILLING_KV.put).toHaveBeenCalledWith(
                expect.stringContaining('invoice:'),
                expect.any(String)
            );
            expect(invoice.customerId).toBe(customerId);
            expect(invoice.amount).toBeGreaterThan(0); 
            expect(invoice.paymentStatus).toBe('pending');

            expect(mockEnv.BILLING_KV.put).toHaveBeenCalledWith(
                `customer:${customerId}`,
                expect.stringContaining(newSubscriptionPlanId)
            );
        });

        it('should throw an error if new plan is not found', async () => {
            mockEnv.BILLING_KV.get.mockImplementation(async (key: string) => {
                if (key === `customer:${customerId}`) return JSON.stringify(customerData);
                if (key === `plan:${subscriptionPlanId}`) return JSON.stringify(oldPlanData);
                if (key === `plan:${newSubscriptionPlanId}`) return null; 
                return null;
            });
            await expect(billingEngine.handlePlanChange(customerId, 'invalid-plan')).rejects.toThrow('Subscription plan not found');
        });
        it('should throw an error if customer is not found', async () => {
            mockEnv.BILLING_KV.get.mockResolvedValueOnce(null);
            await expect(billingEngine.handlePlanChange('invalid-customer', newSubscriptionPlanId)).rejects.toThrow('Customer not found');
        });
    });
});
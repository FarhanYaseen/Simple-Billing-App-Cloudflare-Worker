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

describe('BillingService - handlePlanChange', () => {
    let billingService: BillingService;

    beforeEach(() => {
        billingService = new BillingEngine(mockEnv);
        vi.spyOn(billingService.env.BILLING_KV, 'put').mockImplementation(async () => {});
    });

    it('should throw an error if the new plan is the same as the current plan', async () => {
        const customerId = 'customer123';
        const planId = 'plan123';

        vi.spyOn(billingService, 'getCustomer').mockResolvedValue({ subscriptionPlanId: planId });
        vi.spyOn(billingService, 'getSubscriptionPlan').mockResolvedValue({ id: planId });

        await expect(billingService.handlePlanChange(customerId, planId)).rejects.toThrow('Customer already has the assigned subscription plan');
    });

    it('should create a prorated invoice and update the customer subscription', async () => {
        const customerId = 'customer123';
        const oldPlanId = 'plan123';
        const newPlanId = 'plan456';
        const subscriptionStartDate = new Date();
        subscriptionStartDate.setDate(subscriptionStartDate.getDate() - 15); // Subscription started 15 days ago
        const daysInBillingCycle = 30;
        const daysElapsed = 15;
        const customer = {
            subscriptionPlanId: oldPlanId,
            subscriptionStartDate: subscriptionStartDate.toISOString(),
        };
        const oldPlan = {
            id: oldPlanId,
            price: 300,
            billingCycle: 'monthly',
        };
        const newPlan = {
            id: newPlanId,
            price: 600,
            billingCycle: 'monthly',
        };

        vi.spyOn(billingService, 'getCustomer').mockResolvedValue(customer);
        vi.spyOn(billingService, 'getSubscriptionPlan')
            .mockResolvedValueOnce(oldPlan)
            .mockResolvedValueOnce(newPlan);
        vi.spyOn(billingService, 'getDaysInBillingCycle').mockReturnValue(daysInBillingCycle);
        vi.spyOn(billingService, 'getDaysElapsed').mockReturnValue(daysElapsed);
        vi.spyOn(billingService, 'calculateDueDate').mockReturnValue('2024-10-01T00:00:00.000Z');
        vi.spyOn(crypto, 'randomUUID').mockReturnValue('invoice123');

        const invoice: Invoice = await billingService.handlePlanChange(customerId, newPlanId);

        const oldPlanProration = (oldPlan.price / daysInBillingCycle) * daysElapsed;
        const newPlanProration = (newPlan.price / daysInBillingCycle) * (daysInBillingCycle - daysElapsed);
        const expectedAmount = newPlanProration - oldPlanProration;
       
        expect(invoice).toEqual({
            id: 'invoice123',
            customerId,
            amount: expectedAmount,
            dueDate: '2024-10-01T00:00:00.000Z',
            paymentStatus: 'pending',
        });
    });
    
});

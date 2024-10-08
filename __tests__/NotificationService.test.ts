import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../src/services/notificationService';
import { Customer } from '../src/models/customer';
import { Invoice } from '../src/models/invoice';
import { Payment } from '../src/models/payment';

describe('NotificationService', () => {
    let envMock: any;
    let notificationService: NotificationService;

    beforeEach(() => {
        envMock = {
            EMAIL_SERVICE_API_KEY: 'dummy-key',
        };

        notificationService = new NotificationService(envMock);

        // Mock the sendEmail method to avoid actual email sending during tests
        vi.spyOn(notificationService as any, 'sendEmail').mockResolvedValue(undefined);
    });

    it('should send invoice generated notification', async () => {
        const customer: Customer = {
            id: 'customer123',
            name: 'John Doe',
            email: 'john@example.com',
            subscriptionPlanId: 'plan123',
            subscriptionStatus: 'active',
            subscriptionStartDate: '2023-01-01',
        };

        const invoice: Invoice = {
            id: 'invoice123',
            customerId: 'customer123',
            amount: 100,
            dueDate: '2024-12-01',
            paymentStatus: 'pending',
        };

        await notificationService.sendInvoiceGeneratedNotification(customer, invoice);

        expect(notificationService['sendEmail']).toHaveBeenCalledWith(
            'john@example.com',
            'New Invoice Generated',
            expect.stringContaining('A new invoice has been generated for your subscription.')
        );
    });

    it('should send payment successful notification', async () => {
        const customer: Customer = {
            id: 'customer123',
            name: 'John Doe',
            email: 'john@example.com',
            subscriptionPlanId: 'plan123',
            subscriptionStatus: 'active',
            subscriptionStartDate: '2023-01-01',
        };

        const payment: Payment = {
            id: 'payment123',
            invoiceId: 'invoice123',
            amount: 100,
            paymentMethod: 'credit_card',
            paymentDate: new Date().toISOString(),
        };

        await notificationService.sendPaymentSuccessfulNotification(customer, payment);

        expect(notificationService['sendEmail']).toHaveBeenCalledWith(
            'john@example.com',
            'Payment Successful',
            expect.stringContaining("We've successfully received your payment.")
        );
    });

    it('should send payment failed notification', async () => {
        const customer: Customer = {
            id: 'customer123',
            name: 'John Doe',
            email: 'john@example.com',
            subscriptionPlanId: 'plan123',
            subscriptionStatus: 'active',
            subscriptionStartDate: '2023-01-01',
        };

        const invoice: Invoice = {
            id: 'invoice123',
            customerId: 'customer123',
            amount: 100,
            dueDate: '2024-12-01',
            paymentStatus: 'failed',
        };

        await notificationService.sendPaymentFailedNotification(customer, invoice);

        expect(notificationService['sendEmail']).toHaveBeenCalledWith(
            'john@example.com',
            'Payment Failed',
            expect.stringContaining('We were unable to process your payment for the recent invoice.')
        );
    });
});
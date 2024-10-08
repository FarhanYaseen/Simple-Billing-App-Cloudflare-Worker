import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentHandler } from '../src/handlers/payment';
import { NotificationService } from '../src/services/notificationService';

describe('PaymentHandler', () => {
    let envMock: any;
    let notificationServiceMock: any;
    let paymentHandler: PaymentHandler;

    beforeEach(() => {
        envMock = {
            BILLING_KV: {
                put: vi.fn(),
                get: vi.fn(),
            },
        };

        notificationServiceMock = {
            sendPaymentSuccessfulNotification: vi.fn(),
            sendPaymentFailedNotification: vi.fn(),
        };

        // Mock NotificationService
        vi.spyOn(NotificationService.prototype, 'sendPaymentSuccessfulNotification')
            .mockImplementation(notificationServiceMock.sendPaymentSuccessfulNotification);
        vi.spyOn(NotificationService.prototype, 'sendPaymentFailedNotification')
            .mockImplementation(notificationServiceMock.sendPaymentFailedNotification);

        paymentHandler = new PaymentHandler(envMock);
    });

    it('should process payment successfully', async () => {
        // Mock getInvoice and getCustomer
        const invoice = {
            id: 'invoice123',
            customerId: 'customer123',
            amount: 100,
            paymentStatus: 'pending',
        };
        const customer = {
            id: 'customer123',
            name: 'John Doe',
            email: 'john@example.com',
        };

        envMock.BILLING_KV.get.mockResolvedValueOnce(JSON.stringify(invoice)); // Mock invoice
        envMock.BILLING_KV.get.mockResolvedValueOnce(JSON.stringify(customer)); // Mock customer

        // Call processPayment
        const payment = await paymentHandler.processPayment(invoice.id, 'credit_card');

        expect(payment).toBeDefined();
        expect(payment.amount).toBe(100);
        expect(payment.paymentMethod).toBe('credit_card');

        // Check if KV storage and notification methods were called correctly
        expect(envMock.BILLING_KV.put).toHaveBeenCalledTimes(2); // Save payment and invoice
        expect(notificationServiceMock.sendPaymentSuccessfulNotification).toHaveBeenCalledWith(customer, payment);
    });

    it('should fail to process payment and schedule retry', async () => {
        const invoice = {
          id: 'invoice123',
          customerId: 'customer123',
          amount: 100,
          paymentStatus: 'pending',
        };
        const customer = {
          id: 'customer123',
          name: 'John Doe',
          email: 'john@example.com',
        };
      
        envMock.BILLING_KV.get.mockResolvedValueOnce(JSON.stringify(invoice)); // Mock invoice
        envMock.BILLING_KV.get.mockResolvedValueOnce(JSON.stringify(customer)); // Mock customer
      
        // Force payment failure by mocking Math.random
        vi.spyOn(Math, 'random').mockReturnValue(0.91); // Fail because success rate is < 0.9
      
        try {
          await paymentHandler.processPayment(invoice.id, 'credit_card');
        } catch (error) {
          expect((error as Error).message).toBe('Payment processing failed. Retry scheduled.');
        }
      
        // Check if KV storage and notification methods were called correctly
        expect(envMock.BILLING_KV.put).toHaveBeenCalledTimes(2); // Update failed invoice and schedule retry
      
        // Since the invoice object has been mutated, expect the mutated state
        invoice.paymentStatus = 'failed';
        expect(notificationServiceMock.sendPaymentFailedNotification).toHaveBeenCalledWith(customer, invoice);
      });
      

    it('should throw an error if the invoice is already paid', async () => {
        const invoice = {
            id: 'invoice123',
            customerId: 'customer123',
            amount: 100,
            paymentStatus: 'paid', // Invoice already paid
        };

        envMock.BILLING_KV.get.mockResolvedValueOnce(JSON.stringify(invoice)); // Mock invoice

        try {
            await paymentHandler.processPayment(invoice.id, 'credit_card');
        } catch (error) {
            expect((error as Error).message).toBe('Invoice is already paid');
        }

        // Ensure no further processing occurred
        expect(envMock.BILLING_KV.put).not.toHaveBeenCalled();
    });
});

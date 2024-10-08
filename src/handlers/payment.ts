import { Payment } from '../models/payment';
import { Invoice } from '../models/invoice';
import { Customer } from '../models/customer';
import { NotificationService } from '../services/notificationService';


export class PaymentHandler {

    private notificationService: NotificationService;

    constructor(private env: any) {
        this.notificationService = new NotificationService(env);
    }

    async processPayment(invoiceId: string, paymentMethod: 'credit_card' | 'paypal'): Promise<Payment> {
        const invoice = await this.getInvoice(invoiceId);
      
        if (invoice.paymentStatus === 'paid') {
            throw new Error('Invoice is already paid');
        }

        // Simulate payment processing with a 90% success rate
        // This is used for testing and development purposes to get successful payments and failed payments
        // In a production environment, this would be replaced with actual payment gateway integration
        const paymentSuccessful = Math.random() < 0.9; // 90% success rate for simulation

        if (paymentSuccessful) {
            const payment: Payment = {
                id: crypto.randomUUID(),
                invoiceId,
                amount: invoice.amount,
                paymentMethod,
                paymentDate: new Date().toISOString()
            };

            await this.env.BILLING_KV.put(`payment:${payment.id}`, JSON.stringify(payment));
            invoice.paymentStatus = 'paid';
            invoice.paymentDate = payment.paymentDate;
            await this.env.BILLING_KV.put(`invoice:${invoiceId}`, JSON.stringify(invoice));
            const customer = await this.getCustomer(invoice.customerId);
            await this.notificationService.sendPaymentSuccessfulNotification(customer, payment);
            return payment;
        } else {
            invoice.paymentStatus = 'failed';
            await this.env.BILLING_KV.put(`invoice:${invoiceId}`, JSON.stringify(invoice));
            // Schedule a retry after 24 hours
            await this.schedulePaymentRetry(invoiceId);
            const customer = await this.getCustomer(invoice.customerId);
            await this.notificationService.sendPaymentFailedNotification(customer, invoice);
            throw new Error('Payment processing failed. Retry scheduled.');
        }
    }

    private async getInvoice(invoiceId: string): Promise<Invoice> {
        const invoiceData = await this.env.BILLING_KV.get(`invoice:${invoiceId}`);
        if (!invoiceData) throw new Error('Invoice not found');
        return JSON.parse(invoiceData);
    }

    private async schedulePaymentRetry(invoiceId: string) {
        // Schedule a retry after 24 hours
        await this.env.BILLING_KV.put(`retry:${invoiceId}`, '', { expirationTtl: 86400 }); // 24 hours in seconds
    }

    private async getCustomer(customerId: string): Promise<Customer> {
        const customerData = await this.env.BILLING_KV.get(`customer:${customerId}`);
        if (!customerData) throw new Error('Customer not found');
        return JSON.parse(customerData);
    }
}
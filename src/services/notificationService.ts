import { Customer } from '../models/customer';
import { Invoice } from '../models/invoice';
import { Payment } from '../models/payment';

export class NotificationService {
    constructor(private env: any) { }

    async sendInvoiceGeneratedNotification(customer: Customer, invoice: Invoice) {
        const message = `
      Dear ${customer.name},

      A new invoice has been generated for your subscription.

      Invoice Details:
      - Invoice ID: ${invoice.id}
      - Amount: $${invoice.amount}
      - Due Date: ${invoice.dueDate}

      Please log in to your account to view and pay the invoice.

      Thank you for your business!
    `;

        await this.sendEmail(customer.email, 'New Invoice Generated', message);
    }

    async sendPaymentSuccessfulNotification(customer: Customer, payment: Payment) {
        const message = `
      Dear ${customer.name},

      We've successfully received your payment.

      Payment Details:
      - Payment ID: ${payment.id}
      - Amount: $${payment.amount}
      - Date: ${payment.paymentDate}

      Thank you for your prompt payment!
    `;

        await this.sendEmail(customer.email, 'Payment Successful', message);
    }

    async sendPaymentFailedNotification(customer: Customer, invoice: Invoice) {
        const message = `
      Dear ${customer.name},

      We were unable to process your payment for the recent invoice.

      Invoice Details:
      - Invoice ID: ${invoice.id}
      - Amount: $${invoice.amount}
      - Due Date: ${invoice.dueDate}

      Please log in to your account to update your payment method or contact our support team for assistance.

      We will attempt to process the payment again in 24 hours.
    `;

        await this.sendEmail(customer.email, 'Payment Failed', message);
    }

    private async sendEmail(to: string, subject: string, body: string) {
        // In a real-world scenario, you would integrate with an email service API here
        // This is a mock implementation for demonstration purposes
        console.log(`Sending email to ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`Body: ${body}`);

        return;
        // Simulate API call to email service
        const response = await fetch('https://api.emailservice.com/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.env.EMAIL_SERVICE_API_KEY}`
            },
            body: JSON.stringify({
                to,
                subject,
                body
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send email');
        }
    }
}
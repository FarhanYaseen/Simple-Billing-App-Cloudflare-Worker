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
        console.log(`Attempting to send email to ${to}`);

        const msg = {
            personalizations: [{ to: [{ email: to }] }],
            from: { email: this.env.FROM_EMAIL },
            subject,
            content: [
                { type: 'text/plain', value: body },
                { type: 'text/html', value: body.replace(/\n/g, '<br>') }
            ]
        };

        if (!this.env.SENDGRID_API_KEY) {
            console.error('SENDGRID_API_KEY is not set');
            return;
        }
        try {
            const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.env.SENDGRID_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(msg)
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`SendGrid API error: ${response.status} ${response.statusText} - ${errorData}`);
            }

            console.log(`Email sent successfully to ${to}`);
        } catch (error) {
            console.error(`Error sending email to ${to}:`, error);
            throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
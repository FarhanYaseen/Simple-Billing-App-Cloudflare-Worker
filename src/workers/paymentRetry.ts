import { PaymentHandler } from '../handlers/payment';

export async function handleScheduledPaymentRetry(env: any, invoiceId: string) {
    const paymentHandler = new PaymentHandler(env);
    try {
        await paymentHandler.processPayment(invoiceId, 'credit_card');
        console.log(`Successfully processed retry payment for invoice ${invoiceId}`);
    } catch (error) {
        console.error(`Failed to process retry payment for invoice ${invoiceId}:`, error);
    }
}
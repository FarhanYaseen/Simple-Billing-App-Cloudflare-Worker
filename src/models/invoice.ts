export interface Invoice {
    id: string;
    customerId: string;
    amount: number;
    dueDate: string;
    paymentStatus: 'pending' | 'paid' | 'failed';
    paymentDate?: string;
  }
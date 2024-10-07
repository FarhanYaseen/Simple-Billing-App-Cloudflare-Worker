import { Customer } from '../models/customer';

export class CustomerHandler {
    constructor(private env: any) { }


    /*

    [
    {
      "id": "1a2b3c4d5e",
      "name": "John Doe",
      "email": "john.doe@example.com",
      "subscriptionPlanId": "basic123",
      "subscriptionStatus": "active"
    },
    {
      "id": "6f7g8h9i0j",
      "name": "Jane Smith",
      "email": "jane.smith@example.com",
      "subscriptionPlanId": "pro456",
      "subscriptionStatus": "cancelled"
    },
    {
      "id": "1k2l3m4n5o",
      "name": "Alice Johnson",
      "email": "alice.johnson@example.com",
      "subscriptionPlanId": "premium789",
      "subscriptionStatus": "active"
    },
    {
      "id": "6p7q8r9s0t",
      "name": "Bob Brown",
      "email": "bob.brown@example.com",
      "subscriptionPlanId": "basic123",
      "subscriptionStatus": "active"
    },
    {
      "id": "1u2v3w4x5y",
      "name": "Carol White",
      "email": "carol.white@example.com",
      "subscriptionPlanId": "pro456",
      "subscriptionStatus": "cancelled"
    }
  ]
    */
    async createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
        const id = crypto.randomUUID();
        const newCustomer: Customer = { id, ...customer };
        await this.env.BILLING_KV.put(`customer:${id}`, JSON.stringify(newCustomer));
        return newCustomer;
    }

    async getCustomer(id: string): Promise<Customer | null> {
        const customer = await this.env.BILLING_KV.get(`customer:${id}`);
        return customer ? JSON.parse(customer) : null;
    }

    async assignSubscriptionToCustomer(customerId: string, planId: string): Promise<Customer> {
        const customerKey = `customer:${customerId}`;
        const customerData = await this.env.BILLING_KV.get(customerKey);

        if (!customerData) {
            throw new Error('Customer not found');
        }

        const customer: Customer = JSON.parse(customerData);
        customer.subscriptionPlanId = planId;
        customer.subscriptionStatus = 'active';
        customer.subscriptionStartDate = new Date().toISOString();

        await this.env.BILLING_KV.put(customerKey, JSON.stringify(customer));
        return customer;
    }

    async cancelSubscription(customerId: string): Promise<Customer> {
        const customerKey = `customer:${customerId}`;
        const customerData = await this.env.BILLING_KV.get(customerKey);

        if (!customerData) {
            throw new Error('Customer not found');
        }

        const customer: Customer = JSON.parse(customerData);
        customer.subscriptionStatus = 'cancelled';

        await this.env.BILLING_KV.put(customerKey, JSON.stringify(customer));
        return customer;
    }

}
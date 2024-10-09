import { Customer } from '../models/customer';

export class CustomerHandler {
  constructor(private env: any) { }
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

  async getCustomers(): Promise<Customer[]> {
    const customers = await this.env.BILLING_KV.list({ prefix: "customer:" });
    const result = await Promise.all(
      customers.keys.map((key: any) => this.env.BILLING_KV.get(key.name))
    );
    if (result.length === 0) {
      throw new Error('No customers found');
    }
    return result;
  }

  async assignSubscriptionToCustomer(customerId: string, planId: string): Promise<Customer> {
    const customerKey = `customer:${customerId}`;
    const customerData = await this.env.BILLING_KV.get(customerKey);

    if (!customerData) {
      throw new Error('Customer not found');
    }

    const customer: Customer = JSON.parse(customerData);
    if (customer.subscriptionPlanId === planId && customer.subscriptionStatus === 'active') {
      throw new Error('Customer already has a subscription assigned to provided subscription plan');
    }

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
    if (customer.subscriptionStatus === 'cancelled') {
      throw new Error('Customer already has a subscription cancelled');
    }
    customer.subscriptionStatus = 'cancelled';

    await this.env.BILLING_KV.put(customerKey, JSON.stringify(customer));
    return customer;
  }

}
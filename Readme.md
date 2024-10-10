# SaaS Billing App - Cloudflare Workers

This project implements a billing app for a SaaS platform using Cloudflare Workers. It handles subscription management, billing, payment processing, and customer notifications.

## Features

- Subscription management
- Billing engine with prorated billing support
- Payment processing with retry logic
- Customer notifications via email

## Deployment

To deploy this project on Cloudflare Workers:

1. Ensure you have a Cloudflare account and have set up Wrangler CLI.

2. Clone the repository:
   ```
   git clone https://github.com/your-username/Simple-Billing-App-Cloudflare-Worker.git
   cd Simple-Billing-App-Cloudflare-Worker
   ```

3. Install dependencies:
   ```
   npm install
   ```

4. Configure your `wrangler.toml` file with your account details and KV namespace:
   ```toml
   id = "account-id"
   preview_id = "preview_id"
   [vars]
   SENDGRID_API_KEY = "your-sendgrid-api-key"
   FROM_EMAIL = "your-email@example.com"
   [[kv_namespaces]]
   binding = "BILLING_KV"
   id = "your-namespace-id"
   preview_id = "your-preview-namespace-id"
   ```

5. Create a KV namespace:
   ```
   wrangler kv:namespace create BILLING_KV
   ```
   Update the `wrangler.toml` file with the returned namespace ID.

6. Deploy the worker:
   ```
   wrangler deploy
   ```

## Usage

Once deployed, you can interact with the app using HTTP requests to your Cloudflare Worker's URL. Here are some example endpoints:

more details about api can be found here [API Documentation](api.md)

- Create a subscription plan: POST /subscription-plans
- Assign a subscription to a customer: POST /customers/assign-subscription
- Cancel a subscription: POST /customers/cancel-subscription
- Create a customer: POST /customers
- Get subscription plans: GET /subscription-plans
- Generate an invoice: POST /generate-invoice
- Process a payment: POST /process-payment
- Get all customers: GET /customers

Refer to the API documentation for detailed information on request/response formats for each endpoint.

## Testing

To run unit tests:

```
npm test
```

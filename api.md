# SaaS Billing App API Documentation

This document outlines the available endpoints, expected inputs, outputs, and error handling strategies for the SaaS Billing App API.

## Endpoints

### 1. Create Subscription Plan

- **URL**: `/subscription-plans`
- **Method**: `POST`
- **Input**:
    
    ```json
    {
      "name": "Basic Plan",
      "billingCycle": "monthly",
      "price": 9.99,
      "status": "active"
    }
    
    ```
    
- **Success Response**:
    - **Code**: 201
    - **Content**:
        
        ```json
        {
          "id": "plan-uuid",
          "name": "Basic Plan",
          "billingCycle": "monthly",
          "price": 9.99,
          "status": "active"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 400
    - **Content**: `{ "error": "Invalid input" }`

### 2. Get Subscription Plan

- **URL**: `/subscription-plans/:id`
- **Method**: `GET`
- **Success Response**:
    - **Code**: 200
    - **Content**:
        
        ```json
        {
          "id": "plan-uuid",
          "name": "Basic Plan",
          "billingCycle": "monthly",
          "price": 9.99,
          "status": "active"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 404
    - **Content**: `{ "error": "Plan not found" }`

### 3. Assign Subscription to Customer

- **URL**: `/customers/assign-subscription`
- **Method**: `POST`
- **Input**:
    
    ```json
    {
      "customerId": "customer-uuid",
      "planId": "plan-uuid"
    }
    
    ```
    
- **Success Response**:
    - **Code**: 200
    - **Content**:
        
        ```json
        {
          "id": "customer-uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "subscriptionPlanId": "plan-uuid",
          "subscriptionStatus": "active"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 404
    - **Content**: `{ "error": "Customer or plan not found" }`

### 4. Generate Invoice

- **URL**: `/generate-invoice`
- **Method**: `POST`
- **Input**:
    
    ```json
    {
      "customerId": "customer-uuid"
    }
    
    ```
    
- **Success Response**:
    - **Code**: 201
    - **Content**:
        
        ```json
        {
          "id": "invoice-uuid",
          "customerId": "customer-uuid",
          "amount": 9.99,
          "dueDate": "2023-06-01T00:00:00Z",
          "paymentStatus": "pending"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 404
    - **Content**: `{ "error": "Customer not found" }`

### 5. Process Payment

- **URL**: `/process-payment`
- **Method**: `POST`
- **Input**:
    
    ```json
    {
      "invoiceId": "invoice-uuid",
      "paymentMethod": "credit_card"
    }
    
    ```
    
- **Success Response**:
    - **Code**: 200
    - **Content**:
        
        ```json
        {
          "id": "payment-uuid",
          "invoiceId": "invoice-uuid",
          "amount": 9.99,
          "paymentMethod": "credit_card",
          "paymentDate": "2023-05-15T10:30:00Z"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 400
    - **Content**: `{ "error": "Payment processing failed" }`
    - **Code**: 404
    - **Content**: `{ "error": "Invoice not found" }`

### 6. Cancel Subscription

- **URL**: `/customers/cancel-subscription`
- **Method**: `POST`
- **Input**:
    
    ```json
    {
      "customerId": "customer-uuid"
    }
    
    ```
    
- **Success Response**:
    - **Code**: 200
    - **Content**:
        
        ```json
        {
          "id": "customer-uuid",
          "name": "John Doe",
          "email": "john@example.com",
          "subscriptionPlanId": "plan-uuid",
          "subscriptionStatus": "cancelled"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 404
    - **Content**: `{ "error": "Customer not found" }`

### 7. Change Subscription Plan

- **URL**: `/change-plan`
- **Method**: `POST`
- **Input**:
    
    ```json
    {
      "customerId": "customer-uuid",
      "newPlanId": "new-plan-uuid"
    }
    
    ```
    
- **Success Response**:
    - **Code**: 200
    - **Content**:
        
        ```json
        {
          "id": "invoice-uuid",
          "customerId": "customer-uuid",
          "amount": 15.99,
          "dueDate": "2023-06-01T00:00:00Z",
          "paymentStatus": "pending"
        }
        
        ```
        
- **Error Response**:
    - **Code**: 404
    - **Content**: `{ "error": "Customer or plan not found" }`

## Error Handling

The API uses conventional HTTP response codes to indicate the success or failure of an API request. In general:

- 2xx range indicate success
- 4xx range indicate an error that failed given the information provided (e.g., a required parameter was omitted, etc.)
- 5xx range indicate an error with our servers

### Error Response Format

All error responses will be returned in the following format:

```json
{
  "error": "Error message here"
}

```
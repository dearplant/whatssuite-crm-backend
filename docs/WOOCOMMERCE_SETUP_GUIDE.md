# WooCommerce Integration Setup Guide

This guide explains how to integrate WooCommerce stores with the WhatsApp CRM system.

## Overview

The WooCommerce integration allows you to:
- Sync orders from WooCommerce stores
- Receive real-time order updates via webhooks
- Automatically create contacts from WooCommerce customers
- Track order status and fulfillment
- Trigger automated WhatsApp messages based on order events

## Prerequisites

1. A WooCommerce store (self-hosted or managed)
2. WooCommerce REST API enabled
3. Admin access to generate API credentials

## Step 1: Generate WooCommerce API Credentials

1. Log in to your WordPress admin dashboard
2. Navigate to **WooCommerce > Settings > Advanced > REST API**
3. Click **Add Key**
4. Configure the API key:
   - **Description**: WhatsApp CRM Integration
   - **User**: Select an admin user
   - **Permissions**: Read/Write
5. Click **Generate API Key**
6. Copy the **Consumer Key** and **Consumer Secret** (you won't be able to see them again)

## Step 2: Connect WooCommerce to WhatsApp CRM

### Using the API

Make a POST request to create the integration:

```bash
POST /api/v1/ecommerce/integrations/woocommerce
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "storeUrl": "https://your-store.com",
  "consumerKey": "ck_xxxxxxxxxxxxxxxxxxxxx",
  "consumerSecret": "cs_xxxxxxxxxxxxxxxxxxxxx"
}
```

### Response

```json
{
  "success": true,
  "message": "WooCommerce integration created successfully",
  "data": {
    "id": "integration-uuid",
    "provider": "WooCommerce",
    "store_url": "https://your-store.com",
    "store_name": "Your Store Name",
    "status": "Active",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

## Step 3: Verify Webhook Registration

The system automatically registers the following webhooks:

1. **order.created** - Triggered when a new order is placed
2. **order.updated** - Triggered when an order is updated
3. **order.deleted** - Triggered when an order is deleted

To verify webhooks are registered:

1. Go to **WooCommerce > Settings > Advanced > Webhooks**
2. You should see three webhooks with names starting with "WhatsApp CRM"
3. Ensure all webhooks have status "Active"

## Step 4: Test the Integration

### Manual Order Sync

Trigger a manual sync to import existing orders:

```bash
POST /api/v1/ecommerce/integrations/{integration_id}/sync
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Test Webhook

1. Create a test order in your WooCommerce store
2. Check the CRM to verify:
   - Order appears in the orders list
   - Contact is created/updated with customer information
   - Order status is correctly mapped

## Order Status Mapping

WooCommerce statuses are mapped to CRM statuses as follows:

| WooCommerce Status | CRM Status  | Fulfillment Status |
|-------------------|-------------|-------------------|
| pending           | Pending     | unfulfilled       |
| processing        | Processing  | unfulfilled       |
| on-hold           | Processing  | unfulfilled       |
| completed         | Completed   | fulfilled         |
| cancelled         | Cancelled   | cancelled         |
| refunded          | Refunded    | cancelled         |
| failed            | Failed      | cancelled         |

## Webhook Security

Webhooks are secured using HMAC-SHA256 signatures:

1. Each webhook includes an `X-WC-Webhook-Signature` header
2. The signature is verified using the webhook secret
3. Invalid signatures are rejected with a 401 error

## Troubleshooting

### Webhooks Not Firing

1. Check webhook status in WooCommerce settings
2. Verify the delivery URL is accessible from your WooCommerce server
3. Check WooCommerce webhook logs for errors
4. Ensure your server accepts POST requests from WooCommerce

### Orders Not Syncing

1. Verify API credentials are correct
2. Check that the user has admin permissions
3. Ensure WooCommerce REST API is enabled
4. Check application logs for error messages

### Contact Creation Issues

1. Ensure orders have valid phone numbers in billing information
2. Check that phone numbers are in a valid format
3. Verify team_id is correctly associated with the integration

## API Endpoints

### Create Integration
```
POST /api/v1/ecommerce/integrations/woocommerce
```

### List Integrations
```
GET /api/v1/ecommerce/integrations
```

### Get Integration Details
```
GET /api/v1/ecommerce/integrations/{id}
```

### Sync Orders
```
POST /api/v1/ecommerce/integrations/{id}/sync
```

### List Orders
```
GET /api/v1/ecommerce/orders?status=Completed
```

## Webhook Endpoints

These endpoints are called by WooCommerce (no authentication required):

```
POST /api/v1/ecommerce/webhooks/woocommerce/orders-create
POST /api/v1/ecommerce/webhooks/woocommerce/orders-updated
POST /api/v1/ecommerce/webhooks/woocommerce/orders-deleted
```

## Environment Variables

No additional environment variables are required for WooCommerce integration. The system uses the existing `APP_URL` for webhook registration.

## Best Practices

1. **Use HTTPS**: Always use HTTPS for your store URL and webhook endpoints
2. **Secure Credentials**: Store consumer keys and secrets securely
3. **Monitor Webhooks**: Regularly check webhook delivery status
4. **Test Thoroughly**: Test with sample orders before going live
5. **Backup Data**: Keep backups of your integration settings

## Automation Examples

### Send Order Confirmation

Create a flow that triggers when an order is created:

```json
{
  "trigger": {
    "type": "ecommerce_order_created",
    "provider": "WooCommerce"
  },
  "actions": [
    {
      "type": "send_message",
      "template": "order_confirmation",
      "variables": {
        "order_number": "{{order.number}}",
        "total": "{{order.total}}",
        "currency": "{{order.currency}}"
      }
    }
  ]
}
```

### Abandoned Cart Recovery

Create a flow for abandoned checkouts (requires WooCommerce abandoned cart plugin):

```json
{
  "trigger": {
    "type": "abandoned_cart",
    "provider": "WooCommerce",
    "delay": "1 hour"
  },
  "actions": [
    {
      "type": "send_message",
      "template": "cart_recovery",
      "variables": {
        "cart_url": "{{cart.url}}",
        "total": "{{cart.total}}"
      }
    }
  ]
}
```

## Support

For issues or questions:
- Check application logs: `backend/logs/`
- Review WooCommerce webhook logs
- Contact support with integration ID and error details

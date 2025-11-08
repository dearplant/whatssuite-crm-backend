import ShopifyClient from './shopifyClient.js';
import prisma from '../../config/database.js';
import { encryptCredentials, decryptCredentials } from '../../utils/encryption.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';

class ShopifyService {
  /**
   * Generate OAuth install URL
   */
  generateInstallUrl(shop, redirectUri) {
    const scopes = process.env.SHOPIFY_SCOPES || 'read_orders,write_orders,read_checkouts';
    const apiKey = process.env.SHOPIFY_API_KEY;
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const installUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${redirectUri}&` +
      `state=${nonce}`;
    
    return { installUrl, nonce };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeToken(shop, code) {
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    
    const response = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to exchange authorization code');
    }
    
    const data = await response.json();
    return data.access_token;
  }

  /**
   * Create or update integration
   */
  async createIntegration(userId, teamId, shop, accessToken) {
    const client = new ShopifyClient(shop, accessToken);
    const shopInfo = await client.getShop();
    
    const encryptedToken = encryptCredentials({ accessToken });
    
    // Check if integration already exists
    const existing = await prisma.ecommerce_integrations.findFirst({
      where: {
        team_id: teamId,
        provider: 'Shopify',
        store_url: shop,
      },
    });
    
    const integrationData = {
      user_id: userId,
      store_name: shopInfo.name,
      access_token_encrypted: encryptedToken,
      webhook_secret: crypto.randomBytes(32).toString('hex'),
      status: 'Active',
      metadata: {
        shop_id: shopInfo.id,
        email: shopInfo.email,
        currency: shopInfo.currency,
      },
    };
    
    let integration;
    if (existing) {
      // Update existing integration
      integration = await prisma.ecommerce_integrations.update({
        where: { id: existing.id },
        data: {
          ...integrationData,
          updated_at: new Date(),
        },
      });
      logger.info(`Updated existing Shopify integration: ${integration.id}`);
    } else {
      // Create new integration
      integration = await prisma.ecommerce_integrations.create({
        data: {
          id: crypto.randomUUID(),
          team_id: teamId,
          provider: 'Shopify',
          store_url: shop,
          ...integrationData,
        },
      });
      logger.info(`Created new Shopify integration: ${integration.id}`);
    }
    
    // Register webhooks (non-blocking)
    try {
      await this.registerWebhooks(integration.id);
    } catch (error) {
      logger.warn(`Failed to register webhooks during installation: ${error.message}`);
      // Continue - webhooks can be registered later
    }
    
    // Start initial sync (non-blocking for development apps)
    try {
      await this.syncOrders(integration.id);
    } catch (error) {
      logger.warn(`Failed to sync orders during installation: ${error.message}`);
      // Continue - this is expected for development apps without approval
      // Orders will be synced via webhooks or manual sync later
    }
    
    return integration;
  }

  /**
   * Register Shopify webhooks
   */
  async registerWebhooks(integrationId) {
    const integration = await prisma.ecommerce_integrations.findUnique({
      where: { id: integrationId },
    });
    
    const credentials = decryptCredentials(integration.access_token_encrypted);
    const client = new ShopifyClient(integration.store_url, credentials.accessToken);
    
    const baseUrl = process.env.APP_URL || 'http://localhost:4500';
    const webhooks = [
      { topic: 'orders/create', path: '/api/v1/ecommerce/webhooks/shopify/orders-create' },
      { topic: 'orders/fulfilled', path: '/api/v1/ecommerce/webhooks/shopify/orders-fulfilled' },
      { topic: 'checkouts/create', path: '/api/v1/ecommerce/webhooks/shopify/checkouts-create' },
    ];
    
    for (const webhook of webhooks) {
      try {
        await client.registerWebhook(webhook.topic, `${baseUrl}${webhook.path}`);
        logger.info(`Registered webhook: ${webhook.topic}`);
      } catch (error) {
        logger.error(`Failed to register webhook ${webhook.topic}:`, error);
      }
    }
  }

  /**
   * Sync orders from Shopify
   */
  async syncOrders(integrationId, limit = 50) {
    const integration = await prisma.ecommerce_integrations.findUnique({
      where: { id: integrationId },
    });
    
    const credentials = decryptCredentials(integration.access_token_encrypted);
    const client = new ShopifyClient(integration.store_url, credentials.accessToken);
    
    const orders = await client.getOrders({ limit, status: 'any' });
    
    for (const order of orders) {
      await this.processOrder(integration, order);
    }
    
    await prisma.ecommerce_integrations.update({
      where: { id: integrationId },
      data: { last_sync_at: new Date() },
    });
    
    return orders.length;
  }

  /**
   * Process Shopify order
   */
  async processOrder(integration, orderData) {
    const contact = await this.findOrCreateContact(
      integration.team_id,
      orderData.customer
    );
    
    await prisma.ecommerce_orders.upsert({
      where: {
        integration_id_external_order_id: {
          integration_id: integration.id,
          external_order_id: orderData.id.toString(),
        },
      },
      create: {
        id: crypto.randomUUID(),
        integration_id: integration.id,
        team_id: integration.team_id,
        contact_id: contact?.id,
        external_order_id: orderData.id.toString(),
        order_number: orderData.order_number.toString(),
        customer_email: orderData.email,
        customer_phone: orderData.phone,
        customer_name: orderData.customer?.first_name + ' ' + orderData.customer?.last_name,
        total_amount: orderData.total_price,
        currency: orderData.currency,
        status: this.mapOrderStatus(orderData.financial_status),
        items: orderData.line_items,
        shipping_address: orderData.shipping_address,
        billing_address: orderData.billing_address,
        fulfillment_status: orderData.fulfillment_status,
        payment_status: orderData.financial_status,
      },
      update: {
        status: this.mapOrderStatus(orderData.financial_status),
        fulfillment_status: orderData.fulfillment_status,
        payment_status: orderData.financial_status,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Process abandoned checkout
   */
  async processCheckout(integration, checkoutData) {
    const contact = await this.findOrCreateContact(
      integration.team_id,
      checkoutData.customer
    );
    
    await prisma.abandoned_carts.upsert({
      where: {
        integration_id_external_cart_id: {
          integration_id: integration.id,
          external_cart_id: checkoutData.token,
        },
      },
      create: {
        id: crypto.randomUUID(),
        integration_id: integration.id,
        team_id: integration.team_id,
        contact_id: contact?.id,
        external_cart_id: checkoutData.token,
        customer_email: checkoutData.email,
        customer_phone: checkoutData.phone,
        customer_name: checkoutData.customer?.first_name + ' ' + checkoutData.customer?.last_name,
        cart_url: checkoutData.abandoned_checkout_url,
        total_amount: checkoutData.total_price,
        currency: checkoutData.currency,
        items: checkoutData.line_items,
        abandoned_at: new Date(checkoutData.created_at),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      update: {
        total_amount: checkoutData.total_price,
        items: checkoutData.line_items,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Find or create contact from customer data
   */
  async findOrCreateContact(teamId, customer) {
    if (!customer || !customer.phone) return null;
    
    const phone = customer.phone.replace(/\D/g, '');
    if (!phone) return null;
    
    let contact = await prisma.contacts.findFirst({
      where: {
        team_id: teamId,
        phone: { contains: phone },
      },
    });
    
    if (!contact) {
      contact = await prisma.contacts.create({
        data: {
          id: crypto.randomUUID(),
          team_id: teamId,
          phone: customer.phone,
          email: customer.email,
          first_name: customer.first_name,
          last_name: customer.last_name,
          source: 'Shopify',
        },
      });
    }
    
    return contact;
  }

  /**
   * Map Shopify order status to internal status
   */
  mapOrderStatus(financialStatus) {
    const statusMap = {
      pending: 'Pending',
      authorized: 'Processing',
      paid: 'Completed',
      partially_paid: 'Processing',
      refunded: 'Refunded',
      voided: 'Cancelled',
      partially_refunded: 'Refunded',
    };
    return statusMap[financialStatus] || 'Pending';
  }
}

export default new ShopifyService();

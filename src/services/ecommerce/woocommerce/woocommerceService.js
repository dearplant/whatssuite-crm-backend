import WooCommerceClient from './woocommerceClient.js';
import prisma from '../../../config/database.js';
import { encryptCredentials, decryptCredentials } from '../../../utils/encryption.js';
import logger from '../../../utils/logger.js';
import crypto from 'crypto';

class WooCommerceService {
  /**
   * Create or update WooCommerce integration
   */
  async createIntegration(userId, teamId, storeUrl, consumerKey, consumerSecret) {
    // Validate credentials by testing connection
    const client = new WooCommerceClient(storeUrl, consumerKey, consumerSecret);

    try {
      const settings = await client.getSettings();
      const storeName = settings.find((s) => s.id === 'woocommerce_store_name')?.value || storeUrl;
      const currency = settings.find((s) => s.id === 'woocommerce_currency')?.value || 'USD';

      // Encrypt credentials
      const encryptedCredentials = encryptCredentials({
        consumerKey,
        consumerSecret,
      });

      // Check if integration already exists
      const existing = await prisma.ecommerce_integrations.findFirst({
        where: {
          team_id: teamId,
          provider: 'WooCommerce',
          store_url: storeUrl,
        },
      });

      const integrationData = {
        user_id: userId,
        store_name: storeName,
        access_token_encrypted: encryptedCredentials,
        webhook_secret: crypto.randomBytes(32).toString('hex'),
        status: 'Active',
        metadata: {
          currency,
          api_version: 'wc/v3',
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
        logger.info(`Updated existing WooCommerce integration: ${integration.id}`);
      } else {
        // Create new integration
        integration = await prisma.ecommerce_integrations.create({
          data: {
            id: crypto.randomUUID(),
            team_id: teamId,
            provider: 'WooCommerce',
            store_url: storeUrl,
            ...integrationData,
          },
        });
        logger.info(`Created new WooCommerce integration: ${integration.id}`);
      }

      // Register webhooks (non-blocking)
      try {
        await this.registerWebhooks(integration.id);
      } catch (error) {
        logger.warn(`Failed to register webhooks during installation: ${error.message}`);
      }

      // Start initial sync (non-blocking)
      try {
        await this.syncOrders(integration.id, 50);
      } catch (error) {
        logger.warn(`Failed to sync orders during installation: ${error.message}`);
      }

      return integration;
    } catch (error) {
      logger.error('Failed to create WooCommerce integration:', error);
      throw new Error(`Invalid WooCommerce credentials or store URL: ${error.message}`);
    }
  }

  /**
   * Register WooCommerce webhooks
   */
  async registerWebhooks(integrationId) {
    const integration = await prisma.ecommerce_integrations.findUnique({
      where: { id: integrationId },
    });

    const credentials = decryptCredentials(integration.access_token_encrypted);
    const client = new WooCommerceClient(
      integration.store_url,
      credentials.consumerKey,
      credentials.consumerSecret
    );

    const baseUrl = process.env.APP_URL || 'http://localhost:4500';
    const webhooks = [
      { topic: 'order.created', path: '/api/v1/ecommerce/webhooks/woocommerce/orders-create' },
      { topic: 'order.updated', path: '/api/v1/ecommerce/webhooks/woocommerce/orders-updated' },
      { topic: 'order.deleted', path: '/api/v1/ecommerce/webhooks/woocommerce/orders-deleted' },
    ];

    // Get existing webhooks to avoid duplicates
    const existingWebhooks = await client.listWebhooks();

    for (const webhook of webhooks) {
      try {
        // Check if webhook already exists
        const exists = existingWebhooks.find(
          (w) => w.topic === webhook.topic && w.delivery_url === `${baseUrl}${webhook.path}`
        );

        if (!exists) {
          await client.registerWebhook(webhook.topic, `${baseUrl}${webhook.path}`);
          logger.info(`Registered WooCommerce webhook: ${webhook.topic}`);
        } else {
          logger.info(`WooCommerce webhook already exists: ${webhook.topic}`);
        }
      } catch (error) {
        logger.error(`Failed to register webhook ${webhook.topic}:`, error);
      }
    }
  }

  /**
   * Sync orders from WooCommerce
   */
  async syncOrders(integrationId, perPage = 50) {
    const integration = await prisma.ecommerce_integrations.findUnique({
      where: { id: integrationId },
    });

    const credentials = decryptCredentials(integration.access_token_encrypted);
    const client = new WooCommerceClient(
      integration.store_url,
      credentials.consumerKey,
      credentials.consumerSecret
    );

    let page = 1;
    let totalSynced = 0;
    let hasMore = true;

    while (hasMore && page <= 10) {
      // Limit to 10 pages (500 orders) per sync
      const orders = await client.getOrders({
        per_page: perPage,
        page,
        orderby: 'date',
        order: 'desc',
      });

      if (orders.length === 0) {
        hasMore = false;
        break;
      }

      for (const order of orders) {
        await this.processOrder(integration, order);
        totalSynced++;
      }

      if (orders.length < perPage) {
        hasMore = false;
      }

      page++;
    }

    await prisma.ecommerce_integrations.update({
      where: { id: integrationId },
      data: { last_sync_at: new Date() },
    });

    logger.info(`Synced ${totalSynced} orders from WooCommerce integration ${integrationId}`);
    return totalSynced;
  }

  /**
   * Process WooCommerce order
   */
  async processOrder(integration, orderData) {
    const contact = await this.findOrCreateContact(integration.team_id, orderData.billing);

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
        order_number: orderData.number.toString(),
        customer_email: orderData.billing.email,
        customer_phone: orderData.billing.phone,
        customer_name: `${orderData.billing.first_name} ${orderData.billing.last_name}`.trim(),
        total_amount: orderData.total,
        currency: orderData.currency,
        status: this.mapOrderStatus(orderData.status),
        items: orderData.line_items,
        shipping_address: orderData.shipping,
        billing_address: orderData.billing,
        fulfillment_status: this.mapFulfillmentStatus(orderData.status),
        payment_status: orderData.status,
        metadata: {
          payment_method: orderData.payment_method,
          payment_method_title: orderData.payment_method_title,
          transaction_id: orderData.transaction_id,
          date_paid: orderData.date_paid,
          date_completed: orderData.date_completed,
        },
      },
      update: {
        status: this.mapOrderStatus(orderData.status),
        fulfillment_status: this.mapFulfillmentStatus(orderData.status),
        payment_status: orderData.status,
        total_amount: orderData.total,
        items: orderData.line_items,
        metadata: {
          payment_method: orderData.payment_method,
          payment_method_title: orderData.payment_method_title,
          transaction_id: orderData.transaction_id,
          date_paid: orderData.date_paid,
          date_completed: orderData.date_completed,
        },
        updated_at: new Date(),
      },
    });

    logger.info(`Processed WooCommerce order ${orderData.id} for integration ${integration.id}`);
  }

  /**
   * Process abandoned checkout (WooCommerce doesn't have native abandoned cart webhooks)
   * This would need a plugin like "Abandoned Cart Lite" or custom implementation
   */
  async processAbandonedCart(integration, cartData) {
    const contact = await this.findOrCreateContact(
      integration.team_id,
      cartData.billing || cartData.customer
    );

    await prisma.abandoned_carts.upsert({
      where: {
        integration_id_external_cart_id: {
          integration_id: integration.id,
          external_cart_id: cartData.id.toString(),
        },
      },
      create: {
        id: crypto.randomUUID(),
        integration_id: integration.id,
        team_id: integration.team_id,
        contact_id: contact?.id,
        external_cart_id: cartData.id.toString(),
        customer_email: cartData.billing?.email || cartData.customer?.email,
        customer_phone: cartData.billing?.phone || cartData.customer?.phone,
        customer_name: cartData.billing
          ? `${cartData.billing.first_name} ${cartData.billing.last_name}`.trim()
          : cartData.customer?.name,
        cart_url: cartData.cart_url || `${integration.store_url}/cart`,
        total_amount: cartData.total || cartData.cart_total,
        currency: cartData.currency || 'USD',
        items: cartData.line_items || cartData.items,
        abandoned_at: new Date(cartData.abandoned_at || cartData.created_at),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
      update: {
        total_amount: cartData.total || cartData.cart_total,
        items: cartData.line_items || cartData.items,
        updated_at: new Date(),
      },
    });

    logger.info(`Processed abandoned cart ${cartData.id} for integration ${integration.id}`);
  }

  /**
   * Find or create contact from customer data
   */
  async findOrCreateContact(teamId, billingData) {
    if (!billingData || !billingData.phone) return null;

    const phone = billingData.phone.replace(/\D/g, '');
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
          phone: billingData.phone,
          email: billingData.email,
          first_name: billingData.first_name,
          last_name: billingData.last_name,
          source: 'WooCommerce',
          custom_fields: {
            company: billingData.company,
            address_1: billingData.address_1,
            address_2: billingData.address_2,
            city: billingData.city,
            state: billingData.state,
            postcode: billingData.postcode,
            country: billingData.country,
          },
        },
      });
      logger.info(`Created new contact from WooCommerce: ${contact.id}`);
    }

    return contact;
  }

  /**
   * Map WooCommerce order status to internal status
   */
  mapOrderStatus(wooStatus) {
    const statusMap = {
      pending: 'Pending',
      processing: 'Processing',
      'on-hold': 'Processing',
      completed: 'Completed',
      cancelled: 'Cancelled',
      refunded: 'Refunded',
      failed: 'Failed',
      trash: 'Cancelled',
    };
    return statusMap[wooStatus] || 'Pending';
  }

  /**
   * Map WooCommerce order status to fulfillment status
   */
  mapFulfillmentStatus(wooStatus) {
    const statusMap = {
      pending: 'unfulfilled',
      processing: 'unfulfilled',
      'on-hold': 'unfulfilled',
      completed: 'fulfilled',
      cancelled: 'cancelled',
      refunded: 'cancelled',
      failed: 'cancelled',
      trash: 'cancelled',
    };
    return statusMap[wooStatus] || 'unfulfilled';
  }

  /**
   * Delete integration and cleanup webhooks
   */
  async deleteIntegration(integrationId) {
    const integration = await prisma.ecommerce_integrations.findUnique({
      where: { id: integrationId },
    });

    if (!integration) {
      throw new Error('Integration not found');
    }

    try {
      // Delete webhooks from WooCommerce
      const credentials = decryptCredentials(integration.access_token_encrypted);
      const client = new WooCommerceClient(
        integration.store_url,
        credentials.consumerKey,
        credentials.consumerSecret
      );

      const webhooks = await client.listWebhooks();
      const baseUrl = process.env.APP_URL || 'http://localhost:4500';

      for (const webhook of webhooks) {
        if (webhook.delivery_url.startsWith(baseUrl)) {
          await client.deleteWebhook(webhook.id);
          logger.info(`Deleted WooCommerce webhook: ${webhook.id}`);
        }
      }
    } catch (error) {
      logger.warn(`Failed to delete webhooks during integration deletion: ${error.message}`);
    }

    // Delete integration from database
    await prisma.ecommerce_integrations.delete({
      where: { id: integrationId },
    });

    logger.info(`Deleted WooCommerce integration: ${integrationId}`);
  }
}

export default new WooCommerceService();

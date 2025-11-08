import shopifyService from '../services/ecommerce/shopifyService.js';
import ShopifyClient from '../services/ecommerce/shopifyClient.js';
import woocommerceService from '../services/ecommerce/woocommerce/woocommerceService.js';
import WooCommerceClient from '../services/ecommerce/woocommerce/woocommerceClient.js';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Initiate Shopify OAuth
 * GET /api/v1/ecommerce/shopify/install
 */
export async function initiateShopifyOAuth(req, res) {
  try {
    const { shop, userId: queryUserId, teamId: queryTeamId } = req.query;

    if (!shop) {
      return res.status(400).json({
        success: false,
        message: 'Shop parameter is required',
      });
    }

    // Get user info from authenticated session or query params (for testing)
    let userId, teamId;

    if (req.user) {
      // Authenticated user
      userId = req.user.id;
      teamId = req.user.teamId;
      logger.info(`Authenticated Shopify OAuth initiation for user ${userId}, team ${teamId}`);
    } else if (queryUserId && queryTeamId) {
      // Testing mode - allow userId and teamId in query params
      userId = queryUserId;
      teamId = queryTeamId;
      logger.warn(
        `Unauthenticated Shopify OAuth initiation with query params - userId: ${userId}, teamId: ${teamId}`
      );
    } else {
      return res.status(401).json({
        success: false,
        message:
          'Authentication required. Please provide userId and teamId query parameters for testing, or authenticate first.',
      });
    }

    const redirectUri = `${process.env.APP_URL || 'http://localhost:4500'}/api/v1/ecommerce/shopify/callback`;
    const { installUrl, nonce } = shopifyService.generateInstallUrl(shop, redirectUri);

    // Encode userId and teamId into the state parameter (format: "nonce:userId:teamId")
    const stateWithUserInfo = Buffer.from(`${nonce}:${userId}:${teamId}`).toString('base64');

    // Replace the nonce in the URL with our encoded state
    const finalInstallUrl = installUrl.replace(`state=${nonce}`, `state=${stateWithUserInfo}`);

    logger.info(`Initiating Shopify OAuth for shop ${shop}, user ${userId}, team ${teamId}`);

    return res.redirect(finalInstallUrl);
  } catch (error) {
    logger.error('Error initiating Shopify OAuth:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate OAuth',
      error: error.message,
    });
  }
}

/**
 * Shopify OAuth callback
 * GET /api/v1/ecommerce/shopify/callback
 */
export async function shopifyOAuthCallback(req, res) {
  try {
    const { code, shop, state } = req.query;

    if (!code || !shop || !state) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    // Decode state to get userId and teamId (format: "nonce:userId:teamId")
    const stateParts = Buffer.from(state, 'base64').toString('utf-8').split(':');

    if (stateParts.length !== 3) {
      logger.warn('Invalid state format in Shopify callback', { state });
      return res.status(400).json({
        success: false,
        message: 'Invalid state parameter. Please try the installation again.',
      });
    }

    const [, userId, teamId] = stateParts;

    if (!userId || !teamId) {
      logger.error('Missing user/team info in state during Shopify callback');
      return res.status(400).json({
        success: false,
        message: 'Invalid authentication data. Please try the installation again.',
      });
    }

    logger.info(`Processing Shopify callback for user ${userId}, team ${teamId}, shop ${shop}`);

    // Exchange code for access token
    const accessToken = await shopifyService.exchangeToken(shop, code);

    // Create integration
    const integration = await shopifyService.createIntegration(userId, teamId, shop, accessToken);

    logger.info(`Shopify integration created: ${integration.id}`);

    // Return HTML success page instead of JSON (Shopify loads this in browser)
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Shopify Integration Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            text-align: center;
            max-width: 500px;
          }
          .success-icon {
            font-size: 64px;
            margin-bottom: 1rem;
          }
          h1 {
            color: #2d3748;
            margin-bottom: 1rem;
          }
          p {
            color: #4a5568;
            line-height: 1.6;
            margin-bottom: 1.5rem;
          }
          .details {
            background: #f7fafc;
            padding: 1rem;
            border-radius: 8px;
            margin: 1.5rem 0;
            text-align: left;
          }
          .details strong {
            color: #2d3748;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: 600;
            transition: background 0.3s;
          }
          .button:hover {
            background: #5a67d8;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Integration Successful!</h1>
          <p>Your Shopify store has been successfully connected to your WhatsApp CRM.</p>
          <div class="details">
            <p><strong>Store:</strong> ${integration.store_name || shop}</p>
            <p><strong>Status:</strong> ${integration.status}</p>
            <p><strong>Integration ID:</strong> ${integration.id}</p>
          </div>
          <p>You can now close this window and return to your dashboard.</p>
          <a href="#" onclick="window.close()" class="button">Close Window</a>
        </div>
        <script>
          // Auto-close after 5 seconds
          setTimeout(() => {
            window.close();
          }, 5000);
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error in Shopify OAuth callback:', error.message, { stack: error.stack });
    return res.status(500).json({
      success: false,
      message: 'Failed to complete OAuth',
      error: error.message,
    });
  }
}

/**
 * Create integration
 * POST /api/v1/ecommerce/integrations
 */
export async function createIntegration(req, res) {
  try {
    const { provider, shop, accessToken } = req.body;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    if (provider !== 'Shopify') {
      return res.status(400).json({
        success: false,
        message: 'Only Shopify provider is supported currently',
      });
    }

    const integration = await shopifyService.createIntegration(userId, teamId, shop, accessToken);

    return res.status(201).json({
      success: true,
      data: integration,
    });
  } catch (error) {
    logger.error('Error creating integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create integration',
      error: error.message,
    });
  }
}

/**
 * List integrations
 * GET /api/v1/ecommerce/integrations
 */
export async function listIntegrations(req, res) {
  try {
    const teamId = req.user.teamId;

    const integrations = await prisma.ecommerce_integrations.findMany({
      where: { team_id: teamId },
      select: {
        id: true,
        provider: true,
        store_url: true,
        store_name: true,
        status: true,
        last_sync_at: true,
        created_at: true,
      },
      orderBy: { created_at: 'desc' },
    });

    return res.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    logger.error('Error listing integrations:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list integrations',
    });
  }
}

/**
 * Get integration
 * GET /api/v1/ecommerce/integrations/:id
 */
export async function getIntegration(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        id,
        team_id: teamId,
      },
      include: {
        _count: {
          select: {
            orders: true,
            abandoned_carts: true,
          },
        },
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found',
      });
    }

    return res.json({
      success: true,
      data: integration,
    });
  } catch (error) {
    logger.error('Error getting integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get integration',
    });
  }
}

/**
 * Update integration
 * PUT /api/v1/ecommerce/integrations/:id
 */
export async function updateIntegration(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const { is_active, webhook_secret, metadata } = req.body;

    // Verify integration belongs to team
    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        id,
        team_id: teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found',
      });
    }

    // Update integration
    const updateData = {};
    if (typeof is_active !== 'undefined') updateData.is_active = is_active;
    if (webhook_secret) updateData.webhook_secret = webhook_secret;
    if (metadata) updateData.metadata = metadata;

    const updatedIntegration = await prisma.ecommerce_integrations.update({
      where: { id },
      data: updateData,
    });

    logger.info('Integration updated', {
      integrationId: id,
      teamId,
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message: 'Integration updated successfully',
      data: updatedIntegration,
    });
  } catch (error) {
    logger.error('Error updating integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update integration',
    });
  }
}

/**
 * Sync orders
 * POST /api/v1/ecommerce/integrations/:id/sync
 */
export async function syncOrders(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        id,
        team_id: teamId,
      },
    });

    if (!integration) {
      return res.status(404).json({
        success: false,
        message: 'Integration not found',
      });
    }

    const count = await shopifyService.syncOrders(id);

    return res.json({
      success: true,
      message: `Synced ${count} orders`,
      data: { count },
    });
  } catch (error) {
    logger.error('Error syncing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to sync orders',
    });
  }
}

/**
 * Shopify webhook: Order created
 * POST /api/v1/ecommerce/webhooks/shopify/orders-create
 */
export async function shopifyOrderCreated(req, res) {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const shop = req.headers['x-shopify-shop-domain'];
    const rawBody = req.rawBody;

    // Find integration
    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'Shopify',
        store_url: shop,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Verify webhook
    const isValid = ShopifyClient.verifyWebhook(rawBody, hmac, integration.webhook_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Process order
    await shopifyService.processOrder(integration, req.body);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing Shopify order webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Shopify webhook: Checkout created
 * POST /api/v1/ecommerce/webhooks/shopify/checkouts-create
 */
export async function shopifyCheckoutCreated(req, res) {
  try {
    const checkoutData = req.body;
    const shopDomain = req.headers['x-shopify-shop-domain'];
    const hmac = req.headers['x-shopify-hmac-sha256'];

    logger.info('Received Shopify checkout created webhook', {
      checkoutId: checkoutData.id,
      shopDomain,
    });

    // Find integration by shop domain
    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'Shopify',
        store_url: { contains: shopDomain },
        status: 'Active',
      },
    });

    if (!integration) {
      logger.warn('No active Shopify integration found for shop', { shopDomain });
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Verify webhook signature
    const isValid = ShopifyClient.verifyWebhook(
      JSON.stringify(req.body),
      hmac,
      integration.webhook_secret
    );

    if (!isValid) {
      logger.warn('Invalid Shopify webhook signature', { shopDomain });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if checkout is abandoned (not completed)
    if (checkoutData.completed_at) {
      logger.info('Checkout already completed, skipping abandoned cart creation', {
        checkoutId: checkoutData.id,
      });
      return res.status(200).json({ message: 'Checkout completed' });
    }

    // Create abandoned cart
    const abandonedCartService = (await import('../services/ecommerce/abandonedCartService.js'))
      .default;

    const cartData = {
      integrationId: integration.id,
      teamId: integration.team_id,
      externalCartId: checkoutData.id.toString(),
      customerEmail: checkoutData.email,
      customerPhone: checkoutData.phone || checkoutData.billing_address?.phone,
      customerName: checkoutData.customer?.first_name
        ? `${checkoutData.customer.first_name} ${checkoutData.customer.last_name || ''}`.trim()
        : checkoutData.billing_address?.name,
      cartUrl: checkoutData.abandoned_checkout_url || checkoutData.web_url,
      totalAmount: parseFloat(checkoutData.total_price || 0),
      currency: checkoutData.currency || 'USD',
      items: checkoutData.line_items || [],
      abandonedAt: new Date(checkoutData.created_at),
      metadata: {
        token: checkoutData.token,
        cart_token: checkoutData.cart_token,
      },
    };

    await abandonedCartService.createOrUpdateCart(cartData);

    res.status(200).json({ message: 'Abandoned cart processed' });
  } catch (error) {
    logger.error('Error processing Shopify checkout webhook', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * List orders
 * GET /api/v1/ecommerce/orders
 */
export async function listOrders(req, res) {
  try {
    const teamId = req.user.teamId;
    const { page = 1, limit = 50, status } = req.query;

    const where = { team_id: teamId };
    if (status) where.status = status;

    const orders = await prisma.ecommerce_orders.findMany({
      where,
      include: {
        integration: {
          select: {
            provider: true,
            store_name: true,
          },
        },
        contacts: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.ecommerce_orders.count({ where });

    return res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing orders:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list orders',
    });
  }
}

/**
 * Get order by ID
 * GET /api/v1/ecommerce/orders/:id
 */
export async function getOrder(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const order = await prisma.ecommerce_orders.findFirst({
      where: {
        id,
        team_id: teamId,
      },
      include: {
        integration: {
          select: {
            id: true,
            provider: true,
            store_name: true,
            store_url: true,
          },
        },
        contacts: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    logger.error('Error getting order:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get order',
    });
  }
}

/**
 * Send notification for an order
 * POST /api/v1/ecommerce/orders/:id/notify
 */
export async function notifyOrder(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const { message, template } = req.body;

    // Get order with contact info
    const order = await prisma.ecommerce_orders.findFirst({
      where: {
        id,
        team_id: teamId,
      },
      include: {
        contacts: true,
        integration: true,
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    // Get WhatsApp account for the team
    const whatsappAccount = await prisma.whatsapp_accounts.findFirst({
      where: {
        team_id: teamId,
        is_active: true,
        status: 'connected',
      },
    });

    if (!whatsappAccount) {
      return res.status(400).json({
        success: false,
        message: 'No active WhatsApp account found',
      });
    }

    // Get phone number
    const phoneNumber = order.customer_phone || order.contacts?.phone;
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No phone number available for this order',
      });
    }

    // Generate message
    let notificationMessage = message;
    if (!notificationMessage && template) {
      // Use template
      notificationMessage = generateOrderNotificationMessage(order, template);
    } else if (!notificationMessage) {
      // Default message
      notificationMessage = `Hi ${order.customer_name || 'there'}! Your order #${order.order_number} has been updated. Status: ${order.status}. Thank you for your purchase!`;
    }

    // Queue message for sending
    const { addJob } = await import('../queues/index.js');
    await addJob('sendMessage', {
      accountId: whatsappAccount.id,
      to: phoneNumber,
      message: notificationMessage,
      metadata: {
        type: 'order_notification',
        orderId: order.id,
        externalOrderId: order.external_order_id,
      },
    });

    logger.info('Order notification queued', {
      orderId: id,
      phoneNumber,
      userId: req.user.id,
    });

    return res.json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        orderId: id,
        phoneNumber,
      },
    });
  } catch (error) {
    logger.error('Error sending order notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification',
    });
  }
}

/**
 * Generate order notification message
 */
function generateOrderNotificationMessage(order, template) {
  const templates = {
    created: `Hi ${order.customer_name || 'there'}! 🎉\n\nYour order #${order.order_number} has been received!\n\nTotal: ${order.currency} ${order.total_amount}\n\nWe'll notify you when it ships. Thank you for your purchase!`,
    fulfilled: `Hi ${order.customer_name || 'there'}! 📦\n\nGreat news! Your order #${order.order_number} has been fulfilled and is on its way!\n\n${order.tracking_number ? `Tracking: ${order.tracking_number}\n${order.tracking_url || ''}` : ''}\n\nThank you for shopping with us!`,
    shipped: `Hi ${order.customer_name || 'there'}! 🚚\n\nYour order #${order.order_number} has been shipped!\n\nTracking: ${order.tracking_number}\n${order.tracking_url || ''}\n\nExpected delivery soon!`,
    delivered: `Hi ${order.customer_name || 'there'}! ✅\n\nYour order #${order.order_number} has been delivered!\n\nWe hope you love your purchase. If you have any questions, just reply to this message!`,
  };

  return templates[template] || templates.created;
}

/**
 * List abandoned carts
 * GET /api/v1/ecommerce/abandoned-carts
 */
export async function listAbandonedCarts(req, res) {
  try {
    const { integrationId, status, page, limit, sortBy, sortOrder } = req.query;
    const teamId = req.user.teamId;

    const abandonedCartService = (await import('../services/ecommerce/abandonedCartService.js'))
      .default;

    const result = await abandonedCartService.getAbandonedCarts({
      teamId,
      integrationId,
      status,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: result.carts,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error listing abandoned carts:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list abandoned carts',
    });
  }
}

/**
 * Create WooCommerce integration
 * POST /api/v1/ecommerce/integrations/woocommerce
 */
export async function createWooCommerceIntegration(req, res) {
  try {
    const { storeUrl, consumerKey, consumerSecret } = req.body;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    if (!storeUrl || !consumerKey || !consumerSecret) {
      return res.status(400).json({
        success: false,
        message: 'Store URL, consumer key, and consumer secret are required',
      });
    }

    // Validate store URL format
    const urlPattern = /^https?:\/\/.+/;
    if (!urlPattern.test(storeUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid store URL format. Must start with http:// or https://',
      });
    }

    const integration = await woocommerceService.createIntegration(
      userId,
      teamId,
      storeUrl,
      consumerKey,
      consumerSecret
    );

    logger.info(`WooCommerce integration created: ${integration.id}`);

    return res.status(201).json({
      success: true,
      message: 'WooCommerce integration created successfully',
      data: {
        id: integration.id,
        provider: integration.provider,
        store_url: integration.store_url,
        store_name: integration.store_name,
        status: integration.status,
        created_at: integration.created_at,
      },
    });
  } catch (error) {
    logger.error('Error creating WooCommerce integration:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create WooCommerce integration',
      error: error.message,
    });
  }
}

/**
 * WooCommerce webhook: Order created
 * POST /api/v1/ecommerce/webhooks/woocommerce/orders-create
 */
export async function woocommerceOrderCreated(req, res) {
  try {
    const signature = req.headers['x-wc-webhook-signature'];
    const source = req.headers['x-wc-webhook-source'];
    const rawBody = req.rawBody;

    if (!signature || !source) {
      return res.status(400).json({ error: 'Missing webhook headers' });
    }

    // Find integration by store URL
    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'WooCommerce',
        store_url: source,
      },
    });

    if (!integration) {
      logger.warn(`WooCommerce webhook received for unknown store: ${source}`);
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Verify webhook signature
    const isValid = WooCommerceClient.verifyWebhook(rawBody, signature, integration.webhook_secret);

    if (!isValid) {
      logger.warn(`Invalid WooCommerce webhook signature for store: ${source}`);
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Process order
    await woocommerceService.processOrder(integration, req.body);

    logger.info(`Processed WooCommerce order webhook for order ${req.body.id}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing WooCommerce order webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * WooCommerce webhook: Order updated
 * POST /api/v1/ecommerce/webhooks/woocommerce/orders-updated
 */
export async function woocommerceOrderUpdated(req, res) {
  try {
    const signature = req.headers['x-wc-webhook-signature'];
    const source = req.headers['x-wc-webhook-source'];
    const rawBody = req.rawBody;

    if (!signature || !source) {
      return res.status(400).json({ error: 'Missing webhook headers' });
    }

    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'WooCommerce',
        store_url: source,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const isValid = WooCommerceClient.verifyWebhook(rawBody, signature, integration.webhook_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Process order update (same as create)
    await woocommerceService.processOrder(integration, req.body);

    logger.info(`Processed WooCommerce order update webhook for order ${req.body.id}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing WooCommerce order update webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * WooCommerce webhook: Order deleted
 * POST /api/v1/ecommerce/webhooks/woocommerce/orders-deleted
 */
export async function woocommerceOrderDeleted(req, res) {
  try {
    const signature = req.headers['x-wc-webhook-signature'];
    const source = req.headers['x-wc-webhook-source'];
    const rawBody = req.rawBody;

    if (!signature || !source) {
      return res.status(400).json({ error: 'Missing webhook headers' });
    }

    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'WooCommerce',
        store_url: source,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const isValid = WooCommerceClient.verifyWebhook(rawBody, signature, integration.webhook_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Mark order as deleted/cancelled
    await prisma.ecommerce_orders.updateMany({
      where: {
        integration_id: integration.id,
        external_order_id: req.body.id.toString(),
      },
      data: {
        status: 'Cancelled',
        updated_at: new Date(),
      },
    });

    logger.info(`Processed WooCommerce order deletion webhook for order ${req.body.id}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing WooCommerce order deletion webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get abandoned cart statistics
 * GET /api/v1/ecommerce/abandoned-carts/statistics
 */
export async function getAbandonedCartStatistics(req, res) {
  try {
    const { integrationId, startDate, endDate } = req.query;
    const teamId = req.user.teamId;

    const abandonedCartService = (await import('../services/ecommerce/abandonedCartService.js'))
      .default;

    const statistics = await abandonedCartService.getCartStatistics(teamId, {
      integrationId,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Error fetching abandoned cart statistics', {
      error: error.message,
      userId: req.user?.id,
    });
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message,
    });
  }
}

/**
 * Get abandoned cart by ID
 * GET /api/v1/ecommerce/abandoned-carts/:id
 */
export async function getAbandonedCart(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const abandonedCartService = (await import('../services/ecommerce/abandonedCartService.js'))
      .default;

    const cart = await abandonedCartService.getCartById(id, teamId);

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    logger.error('Error fetching abandoned cart', {
      error: error.message,
      cartId: req.params.id,
      userId: req.user?.id,
    });

    if (error.message === 'Cart not found') {
      return res.status(404).json({
        success: false,
        message: 'Abandoned cart not found',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch abandoned cart',
      error: error.message,
    });
  }
}

/**
 * Manually trigger recovery for an abandoned cart
 * POST /api/v1/ecommerce/abandoned-carts/:id/recover
 */
export async function recoverAbandonedCart(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const abandonedCartService = (await import('../services/ecommerce/abandonedCartService.js'))
      .default;

    // Verify cart belongs to team
    const cart = await abandonedCartService.getCartById(id, teamId);

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Abandoned cart not found',
      });
    }

    // Send recovery message immediately
    const result = await abandonedCartService.sendRecoveryMessage(id);

    if (result.skipped) {
      return res.status(400).json({
        success: false,
        message: `Recovery skipped: ${result.reason}`,
      });
    }

    res.json({
      success: true,
      message: 'Recovery message sent successfully',
      data: result,
    });
  } catch (error) {
    logger.error('Error recovering abandoned cart', {
      error: error.message,
      cartId: req.params.id,
      userId: req.user?.id,
    });

    res.status(500).json({
      success: false,
      message: 'Failed to send recovery message',
      error: error.message,
    });
  }
}

/**
 * Handle WooCommerce checkout updated webhook
 * POST /api/v1/ecommerce/webhooks/woocommerce/checkout-updated
 */
export async function woocommerceCheckoutUpdated(req, res) {
  try {
    const checkoutData = req.body;
    const storeUrl = req.headers['x-wc-webhook-source'];

    logger.info('Received WooCommerce checkout updated webhook', {
      checkoutId: checkoutData.id,
      storeUrl,
    });

    // Find integration by store URL
    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'WooCommerce',
        store_url: storeUrl,
        status: 'Active',
      },
    });

    if (!integration) {
      logger.warn('No active WooCommerce integration found for store', { storeUrl });
      return res.status(404).json({ error: 'Integration not found' });
    }

    // Verify webhook signature
    const signature = req.headers['x-wc-webhook-signature'];
    const isValid = WooCommerceClient.verifyWebhook(
      JSON.stringify(req.body),
      signature,
      integration.webhook_secret
    );

    if (!isValid) {
      logger.warn('Invalid WooCommerce webhook signature', { storeUrl });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Check if checkout is abandoned (status is pending or on-hold)
    const abandonedStatuses = ['pending', 'on-hold', 'checkout-draft'];
    if (!abandonedStatuses.includes(checkoutData.status)) {
      logger.info('Checkout not in abandoned status, skipping', {
        checkoutId: checkoutData.id,
        status: checkoutData.status,
      });
      return res.status(200).json({ message: 'Checkout not abandoned' });
    }

    // Create abandoned cart
    const abandonedCartService = (await import('../services/ecommerce/abandonedCartService.js'))
      .default;

    const cartData = {
      integrationId: integration.id,
      teamId: integration.team_id,
      externalCartId: checkoutData.id.toString(),
      customerEmail: checkoutData.billing?.email,
      customerPhone: checkoutData.billing?.phone,
      customerName: checkoutData.billing?.first_name
        ? `${checkoutData.billing.first_name} ${checkoutData.billing.last_name || ''}`.trim()
        : null,
      cartUrl: checkoutData.cart_url || `${storeUrl}/checkout/?order_id=${checkoutData.id}`,
      totalAmount: parseFloat(checkoutData.total || 0),
      currency: checkoutData.currency || 'USD',
      items: checkoutData.line_items || [],
      abandonedAt: new Date(checkoutData.date_created || checkoutData.date_modified),
      metadata: {
        order_key: checkoutData.order_key,
        cart_hash: checkoutData.cart_hash,
      },
    };

    await abandonedCartService.createOrUpdateCart(cartData);

    res.status(200).json({ message: 'Abandoned cart processed' });
  } catch (error) {
    logger.error('Error processing WooCommerce checkout webhook', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
}

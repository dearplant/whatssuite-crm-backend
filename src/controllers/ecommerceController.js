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
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const shop = req.headers['x-shopify-shop-domain'];
    const rawBody = req.rawBody;

    const integration = await prisma.ecommerce_integrations.findFirst({
      where: {
        provider: 'Shopify',
        store_url: shop,
      },
    });

    if (!integration) {
      return res.status(404).json({ error: 'Integration not found' });
    }

    const isValid = ShopifyClient.verifyWebhook(rawBody, hmac, integration.webhook_secret);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    await shopifyService.processCheckout(integration, req.body);

    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Error processing Shopify checkout webhook:', error);
    return res.status(500).json({ error: 'Internal server error' });
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
 * List abandoned carts
 * GET /api/v1/ecommerce/abandoned-carts
 */
export async function listAbandonedCarts(req, res) {
  try {
    const teamId = req.user.teamId;
    const { page = 1, limit = 50, status = 'Abandoned' } = req.query;

    const carts = await prisma.abandoned_carts.findMany({
      where: {
        team_id: teamId,
        status,
      },
      include: {
        integration: {
          select: {
            provider: true,
            store_name: true,
          },
        },
      },
      orderBy: { abandoned_at: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.abandoned_carts.count({
      where: { team_id: teamId, status },
    });

    return res.json({
      success: true,
      data: carts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
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

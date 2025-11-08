import express from 'express';
import * as ecommerceController from '../controllers/ecommerceController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// Optional authentication middleware - tries to authenticate but doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // If token exists, try to authenticate
      return authenticate(req, res, next);
    }
    // No token, continue without authentication
    next();
  } catch {
    // Authentication failed, continue without authentication
    next();
  }
};

// Shopify OAuth
router.get('/shopify/install', optionalAuth, ecommerceController.initiateShopifyOAuth);
router.get('/shopify/callback', ecommerceController.shopifyOAuthCallback);

// WooCommerce Integration
router.post(
  '/integrations/woocommerce',
  authenticate,
  authorize('ecommerce:create'),
  ecommerceController.createWooCommerceIntegration
);

// Integrations
router.post(
  '/integrations',
  authenticate,
  authorize('ecommerce:create'),
  ecommerceController.createIntegration
);

router.get(
  '/integrations',
  authenticate,
  authorize('ecommerce:read'),
  ecommerceController.listIntegrations
);

router.get(
  '/integrations/:id',
  authenticate,
  authorize('ecommerce:read'),
  ecommerceController.getIntegration
);

router.put(
  '/integrations/:id',
  authenticate,
  authorize('ecommerce:update'),
  ecommerceController.updateIntegration
);

router.post(
  '/integrations/:id/sync',
  authenticate,
  authorize('ecommerce:update'),
  ecommerceController.syncOrders
);

// Webhooks (no auth - verified by HMAC)
router.post('/webhooks/shopify/orders-create', ecommerceController.shopifyOrderCreated);
router.post('/webhooks/shopify/orders-fulfilled', ecommerceController.shopifyOrderCreated);
router.post('/webhooks/shopify/checkouts-create', ecommerceController.shopifyCheckoutCreated);

// WooCommerce Webhooks (no auth - verified by HMAC)
router.post('/webhooks/woocommerce/orders-create', ecommerceController.woocommerceOrderCreated);
router.post('/webhooks/woocommerce/orders-updated', ecommerceController.woocommerceOrderUpdated);
router.post('/webhooks/woocommerce/orders-deleted', ecommerceController.woocommerceOrderDeleted);
router.post(
  '/webhooks/woocommerce/checkout-updated',
  ecommerceController.woocommerceCheckoutUpdated
);

// Orders
router.get('/orders', authenticate, authorize('ecommerce:read'), ecommerceController.listOrders);

router.get('/orders/:id', authenticate, authorize('ecommerce:read'), ecommerceController.getOrder);

router.post(
  '/orders/:id/notify',
  authenticate,
  authorize('ecommerce:update'),
  ecommerceController.notifyOrder
);

// Abandoned Carts
router.get(
  '/abandoned-carts',
  authenticate,
  authorize('ecommerce:read'),
  ecommerceController.listAbandonedCarts
);

router.get(
  '/abandoned-carts/statistics',
  authenticate,
  authorize('ecommerce:read'),
  ecommerceController.getAbandonedCartStatistics
);

router.get(
  '/abandoned-carts/:id',
  authenticate,
  authorize('ecommerce:read'),
  ecommerceController.getAbandonedCart
);

router.post(
  '/abandoned-carts/:id/recover',
  authenticate,
  authorize('ecommerce:update'),
  ecommerceController.recoverAbandonedCart
);

export default router;

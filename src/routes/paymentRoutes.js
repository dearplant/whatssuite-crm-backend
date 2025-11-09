import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// Webhook routes (no auth - verified by signature)
router.post('/webhooks/stripe', paymentController.handleStripeWebhook);
router.post('/webhooks/paypal', paymentController.handlePayPalWebhook);
router.post('/webhooks/razorpay', paymentController.handleRazorpayWebhook);

// All other routes require authentication
router.use(authenticate);

// Payment gateway routes
router.post('/gateways', authorize('payments:create'), paymentController.createPaymentGateway);
router.get('/gateways', authorize('payments:read'), paymentController.listPaymentGateways);
router.get('/gateways/:id', authorize('payments:read'), paymentController.getPaymentGateway);
router.put('/gateways/:id', authorize('payments:update'), paymentController.updatePaymentGateway);
router.delete('/gateways/:id', authorize('payments:delete'), paymentController.deletePaymentGateway);

// Subscription plan routes (public for authenticated users)
router.get('/plans', paymentController.getSubscriptionPlans);
router.get('/plans/:id', paymentController.getSubscriptionPlan);
router.post('/plans', authorize('payments:create'), paymentController.createSubscriptionPlan);
router.put('/plans/:id', authorize('payments:update'), paymentController.updateSubscriptionPlan);

// Subscription routes
router.post('/subscriptions', authorize('payments:create'), paymentController.createSubscription);
router.get('/subscriptions', authorize('payments:read'), paymentController.getSubscriptions);
router.get('/subscriptions/:id', authorize('payments:read'), paymentController.getSubscription);
router.post(
  '/subscriptions/:id/cancel',
  authorize('payments:update'),
  paymentController.cancelSubscription
);

// Invoice routes - MUST come before generic payment routes to avoid route conflicts
router.post('/invoices', authorize('payments:create'), paymentController.createInvoice);
router.get('/invoices', authorize('payments:read'), paymentController.listInvoices);
router.get('/invoices/:id', authorize('payments:read'), paymentController.getInvoice);
router.get('/invoices/:id/pdf', authorize('payments:read'), paymentController.getInvoicePDF);
router.post('/invoices/:id/send', authorize('payments:update'), paymentController.sendInvoice);

// Payment routes - generic routes with :id parameter come AFTER specific routes
router.post('/checkout', authorize('payments:create'), paymentController.createPayment);
router.get('/', authorize('payments:read'), paymentController.listPayments);
router.get('/:id', authorize('payments:read'), paymentController.getPayment);
router.post('/:id/refund', authorize('payments:update'), paymentController.refundPayment);

export default router;

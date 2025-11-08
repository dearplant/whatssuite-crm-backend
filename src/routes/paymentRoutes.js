import express from 'express';
import * as paymentController from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Payment gateway routes
router.post('/gateways', authorize('payments:create'), paymentController.createPaymentGateway);
router.get('/gateways', authorize('payments:read'), paymentController.listPaymentGateways);

// Subscription plan routes (public for authenticated users)
router.get('/plans', paymentController.getSubscriptionPlans);

// Subscription routes
router.post('/subscriptions', authorize('payments:create'), paymentController.createSubscription);
router.get('/subscriptions', authorize('payments:read'), paymentController.getSubscriptions);
router.post(
  '/subscriptions/:id/cancel',
  authorize('payments:update'),
  paymentController.cancelSubscription
);

export default router;

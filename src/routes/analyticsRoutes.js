/**
 * Analytics Routes
 * Defines API endpoints for analytics
 */

import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/flows/dashboard
 * @desc    Get flow performance dashboard data
 * @access  Private (requires analytics.read permission)
 */
router.get(
  '/flows/dashboard',
  authorize('analytics:read'),
  analyticsController.getFlowPerformanceDashboard
);

/**
 * @route   GET /api/v1/analytics/flows/stats
 * @desc    Get overall flow statistics
 * @access  Private (requires analytics.read permission)
 */
router.get('/flows/stats', authorize('analytics:read'), analyticsController.getOverallFlowStats);

/**
 * @route   GET /api/v1/analytics/flows/most-used
 * @desc    Get most used flows
 * @access  Private (requires analytics.read permission)
 */
router.get('/flows/most-used', authorize('analytics:read'), analyticsController.getMostUsedFlows);

/**
 * @route   GET /api/v1/analytics/flows/slowest-nodes
 * @desc    Get slowest nodes across all flows
 * @access  Private (requires analytics.read permission)
 */
router.get(
  '/flows/slowest-nodes',
  authorize('analytics:read'),
  analyticsController.getSlowestNodes
);

/**
 * @route   GET /api/v1/analytics/flows/:flowId
 * @desc    Get analytics for a specific flow
 * @access  Private (requires analytics.read permission)
 */
router.get('/flows/:flowId', authorize('analytics:read'), analyticsController.getFlowAnalytics);

/**
 * @route   GET /api/v1/analytics/flows
 * @desc    Get analytics for all flows
 * @access  Private (requires analytics.read permission)
 */
router.get('/flows', authorize('analytics:read'), analyticsController.getAllFlowsAnalytics);

export default router;

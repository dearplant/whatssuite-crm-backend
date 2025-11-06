import express from 'express';
import {
  checkQueueInfrastructureHealth,
  getQueueMetrics,
  getQueueStatistics,
} from '../utils/queueHealth.js';
import { logger } from '../utils/logger.js';
import { authenticate } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = express.Router();

/**
 * GET /api/v1/queues/health
 * Get queue infrastructure health status
 * Requires: Admin role
 */
router.get('/health', authenticate, requireAdmin, async (req, res) => {
  try {
    const health = await checkQueueInfrastructureHealth();

    const statusCode = health.status === 'unhealthy' ? 503 : 200;

    res.status(statusCode).json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Failed to get queue health', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get queue health',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/queues/metrics
 * Get queue metrics for monitoring
 * Requires: Admin role
 */
router.get('/metrics', authenticate, requireAdmin, async (req, res) => {
  try {
    const metrics = await getQueueMetrics();

    res.status(200).json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    logger.error('Failed to get queue metrics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get queue metrics',
      message: error.message,
    });
  }
});

/**
 * GET /api/v1/queues/statistics
 * Get queue statistics summary
 * Requires: Admin role
 */
router.get('/statistics', authenticate, requireAdmin, async (req, res) => {
  try {
    const statistics = await getQueueStatistics();

    res.status(200).json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    logger.error('Failed to get queue statistics', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to get queue statistics',
      message: error.message,
    });
  }
});

export default router;

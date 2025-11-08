/**
 * Cron Management Routes
 * Endpoints for managing and monitoring scheduled jobs
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import cronScheduler from '../services/cronScheduler.js';
import whatsappHealthCheckService from '../services/whatsappHealthCheckService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route   GET /api/v1/cron/status
 * @desc    Get status of all cron jobs
 * @access  Private (Admin only)
 */
router.get('/status', authenticate, authorize('system:manage'), async (req, res) => {
  try {
    const status = cronScheduler.getStatus();

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Error getting cron status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get cron job status',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/cron/trigger/:jobName
 * @desc    Manually trigger a cron job
 * @access  Private (Admin only)
 */
router.post('/trigger/:jobName', authenticate, authorize('system:manage'), async (req, res) => {
  try {
    const { jobName } = req.params;

    logger.info(`Manual trigger requested for job: ${jobName} by user ${req.user.id}`);

    const result = await cronScheduler.triggerJob(jobName);

    res.json({
      success: true,
      message: `Job ${jobName} triggered successfully`,
      data: result,
    });
  } catch (error) {
    logger.error(`Error triggering job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to trigger job ${req.params.jobName}`,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/cron/stop/:jobName
 * @desc    Stop a specific cron job
 * @access  Private (Admin only)
 */
router.post('/stop/:jobName', authenticate, authorize('system:manage'), async (req, res) => {
  try {
    const { jobName } = req.params;

    const success = cronScheduler.stopJob(jobName);

    if (success) {
      res.json({
        success: true,
        message: `Job ${jobName} stopped successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Job ${jobName} not found`,
      });
    }
  } catch (error) {
    logger.error(`Error stopping job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to stop job ${req.params.jobName}`,
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/v1/cron/start/:jobName
 * @desc    Start a specific cron job
 * @access  Private (Admin only)
 */
router.post('/start/:jobName', authenticate, authorize('system:manage'), async (req, res) => {
  try {
    const { jobName } = req.params;

    const success = cronScheduler.startJob(jobName);

    if (success) {
      res.json({
        success: true,
        message: `Job ${jobName} started successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: `Job ${jobName} not found`,
      });
    }
  } catch (error) {
    logger.error(`Error starting job ${req.params.jobName}:`, error);
    res.status(500).json({
      success: false,
      message: `Failed to start job ${req.params.jobName}`,
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/v1/cron/health-check/stats
 * @desc    Get WhatsApp health check statistics
 * @access  Private (Admin only)
 */
router.get('/health-check/stats', authenticate, authorize('system:manage'), async (req, res) => {
  try {
    const stats = await whatsappHealthCheckService.getHealthCheckStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error getting health check stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get health check statistics',
      error: error.message,
    });
  }
});

export default router;

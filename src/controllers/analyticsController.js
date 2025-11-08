/**
 * Analytics Controller
 * Handles analytics-related HTTP requests
 */

import flowAnalyticsService from '../services/flowAnalyticsService.js';
import { logger } from '../utils/logger.js';

/**
 * Get flow analytics for a specific flow
 * GET /api/v1/analytics/flows/:flowId
 */
export async function getFlowAnalytics(req, res) {
  try {
    const { flowId } = req.params;
    const { startDate, endDate, limit } = req.query;
    const teamId = req.user.teamId;

    const analytics = await flowAnalyticsService.getFlowAnalytics(flowId, teamId, {
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error in getFlowAnalytics:', error);
    res.status(error.message === 'Flow not found' ? 404 : 500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get analytics for all flows
 * GET /api/v1/analytics/flows
 */
export async function getAllFlowsAnalytics(req, res) {
  try {
    const { startDate, endDate, sortBy, sortOrder } = req.query;
    const teamId = req.user.teamId;

    const analytics = await flowAnalyticsService.getAllFlowsAnalytics(teamId, {
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error in getAllFlowsAnalytics:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get most used flows
 * GET /api/v1/analytics/flows/most-used
 */
export async function getMostUsedFlows(req, res) {
  try {
    const { limit } = req.query;
    const teamId = req.user.teamId;

    const flows = await flowAnalyticsService.getMostUsedFlows(
      teamId,
      limit ? parseInt(limit) : undefined
    );

    res.json({
      success: true,
      data: flows,
    });
  } catch (error) {
    logger.error('Error in getMostUsedFlows:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get slowest nodes across all flows
 * GET /api/v1/analytics/flows/slowest-nodes
 */
export async function getSlowestNodes(req, res) {
  try {
    const { limit } = req.query;
    const teamId = req.user.teamId;

    const nodes = await flowAnalyticsService.getSlowestNodes(
      teamId,
      limit ? parseInt(limit) : undefined
    );

    res.json({
      success: true,
      data: nodes,
    });
  } catch (error) {
    logger.error('Error in getSlowestNodes:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get flow performance dashboard data
 * GET /api/v1/analytics/flows/dashboard
 */
export async function getFlowPerformanceDashboard(req, res) {
  try {
    const teamId = req.user.teamId;

    const dashboard = await flowAnalyticsService.getFlowPerformanceDashboard(teamId);

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    logger.error('Error in getFlowPerformanceDashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Get overall flow statistics
 * GET /api/v1/analytics/flows/stats
 */
export async function getOverallFlowStats(req, res) {
  try {
    const teamId = req.user.teamId;

    const stats = await flowAnalyticsService.getOverallFlowStats(teamId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error in getOverallFlowStats:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

export default {
  getFlowAnalytics,
  getAllFlowsAnalytics,
  getMostUsedFlows,
  getSlowestNodes,
  getFlowPerformanceDashboard,
  getOverallFlowStats,
};

/**
 * Analytics Routes
 * Defines API endpoints for analytics
 */

import express from 'express';
import * as analyticsController from '../controllers/analyticsController.js';
import * as reportController from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { createReportSchema, scheduleReportSchema, getReportsQuerySchema } from '../validators/reportValidator.js';

const router = express.Router();

// All analytics routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/v1/analytics/overview
 * @desc    Get overview analytics (key metrics summary)
 * @access  Private (requires analytics:read permission)
 */
router.get('/overview', authorize('analytics:read'), analyticsController.getOverview);

/**
 * @route   GET /api/v1/analytics/messages
 * @desc    Get message statistics with filters
 * @access  Private (requires analytics:read permission)
 */
router.get('/messages', authorize('analytics:read'), analyticsController.getMessageAnalytics);

/**
 * @route   GET /api/v1/analytics/campaigns
 * @desc    Get campaign performance metrics
 * @access  Private (requires analytics:read permission)
 */
router.get('/campaigns', authorize('analytics:read'), analyticsController.getCampaignAnalytics);

/**
 * @route   GET /api/v1/analytics/contacts
 * @desc    Get contact growth and segmentation stats
 * @access  Private (requires analytics:read permission)
 */
router.get('/contacts', authorize('analytics:read'), analyticsController.getContactAnalytics);

/**
 * @route   GET /api/v1/analytics/revenue
 * @desc    Get e-commerce revenue analytics
 * @access  Private (requires analytics:read permission)
 */
router.get('/revenue', authorize('analytics:read'), analyticsController.getRevenueAnalytics);

/**
 * @route   GET /api/v1/analytics/chatbots
 * @desc    Get chatbot performance metrics
 * @access  Private (requires analytics:read permission)
 */
router.get('/chatbots', authorize('analytics:read'), analyticsController.getChatbotAnalytics);

/**
 * @route   GET /api/v1/analytics/flows/:flowId
 * @desc    Get analytics for a specific flow
 * @access  Private (requires analytics:read permission)
 */
router.get('/flows/:flowId', authorize('analytics:read'), analyticsController.getFlowAnalytics);

/**
 * @route   GET /api/v1/analytics/flows
 * @desc    Get analytics for all flows
 * @access  Private (requires analytics:read permission)
 */
router.get('/flows', authorize('analytics:read'), analyticsController.getAllFlowsAnalytics);

/**
 * @route   POST /api/v1/analytics/reports/schedule
 * @desc    Schedule a recurring report
 * @access  Private (requires analytics:read permission)
 */
router.post('/reports/schedule', authorize('analytics:read'), validate(scheduleReportSchema), reportController.scheduleReport);

/**
 * @route   POST /api/v1/analytics/reports
 * @desc    Create and generate a report
 * @access  Private (requires analytics:read permission)
 */
router.post('/reports', authorize('analytics:read'), validate(createReportSchema), reportController.createReport);

/**
 * @route   GET /api/v1/analytics/reports
 * @desc    Get all reports for the team
 * @access  Private (requires analytics:read permission)
 */
router.get('/reports', authorize('analytics:read'), validate(getReportsQuerySchema, 'query'), reportController.getReports);

/**
 * @route   GET /api/v1/analytics/reports/:id
 * @desc    Get a specific report
 * @access  Private (requires analytics:read permission)
 */
router.get('/reports/:id', authorize('analytics:read'), reportController.getReport);

/**
 * @route   GET /api/v1/analytics/reports/:id/download
 * @desc    Download a report file
 * @access  Private (requires analytics:read permission)
 */
router.get('/reports/:id/download', authorize('analytics:read'), reportController.downloadReport);

/**
 * @route   DELETE /api/v1/analytics/reports/:id
 * @desc    Delete a report
 * @access  Private (requires analytics:read permission)
 */
router.delete('/reports/:id', authorize('analytics:read'), reportController.deleteReport);

export default router;

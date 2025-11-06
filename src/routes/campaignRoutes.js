/**
 * Campaign Routes
 *
 * Routes for campaign management with RBAC
 */

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.js';
import * as campaignController from '../controllers/campaignController.js';
import * as campaignValidator from '../validators/campaignValidator.js';

const router = express.Router();

/**
 * POST /api/v1/campaigns
 * Create a new campaign
 * Requires: campaigns:create permission
 */
router.post(
  '/',
  authenticate,
  authorize('campaigns:create'),
  validateBody(campaignValidator.createCampaignSchema),
  campaignController.createCampaign
);

/**
 * GET /api/v1/campaigns
 * List all campaigns
 * Requires: campaigns:read permission
 */
router.get(
  '/',
  authenticate,
  authorize('campaigns:read'),
  validateQuery(campaignValidator.listCampaignsSchema),
  campaignController.getCampaigns
);

/**
 * GET /api/v1/campaigns/:id
 * Get campaign details with stats
 * Requires: campaigns:read permission
 */
router.get(
  '/:id',
  authenticate,
  authorize('campaigns:read'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.getCampaignById
);

/**
 * PUT /api/v1/campaigns/:id
 * Update campaign
 * Requires: campaigns:update permission
 */
router.put(
  '/:id',
  authenticate,
  authorize('campaigns:update'),
  validateParams(campaignValidator.campaignIdSchema),
  validateBody(campaignValidator.updateCampaignSchema),
  campaignController.updateCampaign
);

/**
 * DELETE /api/v1/campaigns/:id
 * Delete campaign
 * Requires: campaigns:delete permission
 */
router.delete(
  '/:id',
  authenticate,
  authorize('campaigns:delete'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.deleteCampaign
);

/**
 * GET /api/v1/campaigns/:id/recipients
 * Get campaign recipients list
 * Requires: campaigns:read permission
 */
router.get(
  '/:id/recipients',
  authenticate,
  authorize('campaigns:read'),
  validateParams(campaignValidator.campaignIdSchema),
  validateQuery(campaignValidator.listRecipientsSchema),
  campaignController.getCampaignRecipients
);

/**
 * POST /api/v1/campaigns/:id/start
 * Start campaign execution
 * Requires: campaigns:start permission
 */
router.post(
  '/:id/start',
  authenticate,
  authorize('campaigns:start'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.startCampaign
);

/**
 * POST /api/v1/campaigns/:id/pause
 * Pause running campaign
 * Requires: campaigns:pause permission
 */
router.post(
  '/:id/pause',
  authenticate,
  authorize('campaigns:pause'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.pauseCampaign
);

/**
 * POST /api/v1/campaigns/:id/resume
 * Resume paused campaign
 * Requires: campaigns:start permission (same as start)
 */
router.post(
  '/:id/resume',
  authenticate,
  authorize('campaigns:start'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.resumeCampaign
);

/**
 * POST /api/v1/campaigns/:id/duplicate
 * Duplicate existing campaign
 * Requires: campaigns:duplicate permission
 */
router.post(
  '/:id/duplicate',
  authenticate,
  authorize('campaigns:duplicate'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.duplicateCampaign
);

/**
 * POST /api/v1/campaigns/ab-test
 * Create A/B test campaign
 * Requires: campaigns:create permission
 */
router.post(
  '/ab-test',
  authenticate,
  authorize('campaigns:create'),
  validateBody(campaignValidator.createABTestSchema),
  campaignController.createABTest
);

/**
 * GET /api/v1/campaigns/:id/ab-test/results
 * Get A/B test results
 * Requires: campaigns:read permission
 */
router.get(
  '/:id/ab-test/results',
  authenticate,
  authorize('campaigns:read'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.getABTestResults
);

/**
 * POST /api/v1/campaigns/:id/ab-test/select-winner
 * Select winning variant
 * Requires: campaigns:update permission
 */
router.post(
  '/:id/ab-test/select-winner',
  authenticate,
  authorize('campaigns:update'),
  validateParams(campaignValidator.campaignIdSchema),
  campaignController.selectWinningVariant
);

export default router;

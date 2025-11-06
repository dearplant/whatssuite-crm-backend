/**
 * Campaign Controller
 *
 * Handles HTTP requests for campaign management
 */

import * as campaignService from '../services/campaignService.js';
import logger from '../utils/logger.js';

/**
 * Create a new campaign
 * POST /api/v1/campaigns
 */
export async function createCampaign(req, res) {
  try {
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const campaign = await campaignService.createCampaign(userId, teamId, req.body);

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in createCampaign controller:', error);

    if (error.message.includes('not found') || error.message.includes('No recipients')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create campaign',
      error: error.message,
    });
  }
}

/**
 * Get campaigns with filters
 * GET /api/v1/campaigns
 */
export async function getCampaigns(req, res) {
  try {
    const teamId = req.user.teamId;

    // Use validatedQuery if available, otherwise fall back to req.query
    const query = req.validatedQuery || req.query;
    const result = await campaignService.getCampaigns(teamId, query);

    res.status(200).json({
      success: true,
      data: result.campaigns,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in getCampaigns controller:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaigns',
      error: error.message,
    });
  }
}

/**
 * Get campaign by ID with detailed stats
 * GET /api/v1/campaigns/:id
 */
export async function getCampaignById(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const campaign = await campaignService.getCampaignById(teamId, id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in getCampaignById controller:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign',
      error: error.message,
    });
  }
}

/**
 * Update campaign
 * PUT /api/v1/campaigns/:id
 */
export async function updateCampaign(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const campaign = await campaignService.updateCampaign(teamId, id, req.body);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Campaign updated successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in updateCampaign controller:', error);

    if (error.message.includes('Cannot update')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: error.message,
    });
  }
}

/**
 * Delete campaign
 * DELETE /api/v1/campaigns/:id
 */
export async function deleteCampaign(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const result = await campaignService.deleteCampaign(teamId, id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteCampaign controller:', error);

    if (error.message.includes('Cannot delete')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete campaign',
      error: error.message,
    });
  }
}

/**
 * Get campaign recipients
 * GET /api/v1/campaigns/:id/recipients
 */
export async function getCampaignRecipients(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const result = await campaignService.getCampaignRecipients(teamId, id, req.query);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result.recipients,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in getCampaignRecipients controller:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch campaign recipients',
      error: error.message,
    });
  }
}

/**
 * Start campaign execution
 * POST /api/v1/campaigns/:id/start
 */
export async function startCampaign(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const campaign = await campaignService.startCampaign(teamId, id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Campaign started successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in startCampaign controller:', error);

    if (error.message.includes('Cannot start') || error.message.includes('already')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to start campaign',
      error: error.message,
    });
  }
}

/**
 * Pause campaign execution
 * POST /api/v1/campaigns/:id/pause
 */
export async function pauseCampaign(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const campaign = await campaignService.pauseCampaign(teamId, id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Campaign paused successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in pauseCampaign controller:', error);

    if (error.message.includes('Cannot pause')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to pause campaign',
      error: error.message,
    });
  }
}

/**
 * Resume paused campaign
 * POST /api/v1/campaigns/:id/resume
 */
export async function resumeCampaign(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const campaign = await campaignService.resumeCampaign(teamId, id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Campaign resumed successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in resumeCampaign controller:', error);

    if (error.message.includes('Cannot resume')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to resume campaign',
      error: error.message,
    });
  }
}

/**
 * Duplicate campaign
 * POST /api/v1/campaigns/:id/duplicate
 */
export async function duplicateCampaign(req, res) {
  try {
    const userId = req.user.id;
    const teamId = req.user.teamId;
    const { id } = req.params;

    const campaign = await campaignService.duplicateCampaign(userId, teamId, id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Campaign duplicated successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in duplicateCampaign controller:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to duplicate campaign',
      error: error.message,
    });
  }
}

/**
 * Create A/B test campaign
 * POST /api/v1/campaigns/ab-test
 */
export async function createABTest(req, res) {
  try {
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const campaign = await campaignService.createABTestCampaign(userId, teamId, req.body);

    res.status(201).json({
      success: true,
      message: 'A/B test campaign created successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in createABTest controller:', error);

    if (error.message.includes('not found') || error.message.includes('No recipients')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create A/B test campaign',
      error: error.message,
    });
  }
}

/**
 * Get A/B test results
 * GET /api/v1/campaigns/:id/ab-test/results
 */
export async function getABTestResults(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;

    const results = await campaignService.getABTestResults(teamId, id);

    if (!results) {
      return res.status(404).json({
        success: false,
        message: 'A/B test campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Error in getABTestResults controller:', error);

    if (error.message.includes('not an A/B test')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to fetch A/B test results',
      error: error.message,
    });
  }
}

/**
 * Select winning variant
 * POST /api/v1/campaigns/:id/ab-test/select-winner
 */
export async function selectWinningVariant(req, res) {
  try {
    const teamId = req.user.teamId;
    const { id } = req.params;
    const { variantId } = req.body;

    if (!variantId) {
      return res.status(400).json({
        success: false,
        message: 'Variant ID is required',
      });
    }

    const campaign = await campaignService.selectWinner(teamId, id, variantId);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'A/B test campaign not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Winning variant selected successfully',
      data: campaign,
    });
  } catch (error) {
    logger.error('Error in selectWinningVariant controller:', error);

    if (error.message.includes('not an A/B test') || error.message.includes('not found')) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to select winning variant',
      error: error.message,
    });
  }
}

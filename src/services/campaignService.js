/**
 * Campaign Service
 *
 * Business logic for campaign management
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

/**
 * Calculate recipients based on audience configuration
 */
async function calculateRecipients(teamId, audienceType, audienceConfig) {
  let contactIds = [];

  try {
    switch (audienceType) {
      case 'all':
        // Get all active contacts for the team
        const allContacts = await prisma.contacts.findMany({
          where: {
            team_id: teamId,
            is_blocked: false,
            deleted_at: null,
          },
          select: { id: true },
        });
        contactIds = allContacts.map((c) => c.id);
        break;

      case 'segment':
        // Get contacts matching segment conditions
        if (!audienceConfig.segmentId) {
          throw new Error('Segment ID is required for segment audience type');
        }

        const segment = await prisma.segments.findUnique({
          where: { id: audienceConfig.segmentId },
        });

        if (!segment) {
          throw new Error('Segment not found');
        }

        // Build dynamic query based on segment conditions
        const conditions = segment.conditions || {};
        const whereClause = buildSegmentWhereClause(teamId, conditions);

        const segmentContacts = await prisma.contacts.findMany({
          where: whereClause,
          select: { id: true },
        });
        contactIds = segmentContacts.map((c) => c.id);
        break;

      case 'custom':
        // Use provided contact IDs
        if (!audienceConfig.contactIds || audienceConfig.contactIds.length === 0) {
          throw new Error('Contact IDs are required for custom audience type');
        }

        // Verify contacts exist and belong to team
        const customContacts = await prisma.contacts.findMany({
          where: {
            id: { in: audienceConfig.contactIds },
            team_id: teamId,
            is_blocked: false,
            deleted_at: null,
          },
          select: { id: true },
        });
        contactIds = customContacts.map((c) => c.id);
        break;

      case 'tags':
        // Get contacts with specific tags
        if (!audienceConfig.tags || audienceConfig.tags.length === 0) {
          throw new Error('Tags are required for tags audience type');
        }

        const taggedContacts = await prisma.contacts.findMany({
          where: {
            team_id: teamId,
            is_blocked: false,
            deleted_at: null,
            contact_tags: {
              some: {
                tags: {
                  name: { in: audienceConfig.tags },
                },
              },
            },
          },
          select: { id: true },
        });
        contactIds = taggedContacts.map((c) => c.id);
        break;

      default:
        throw new Error(`Invalid audience type: ${audienceType}`);
    }

    // Exclude specific contacts if provided
    if (audienceConfig.excludeContactIds && audienceConfig.excludeContactIds.length > 0) {
      contactIds = contactIds.filter((id) => !audienceConfig.excludeContactIds.includes(id));
    }

    return contactIds;
  } catch (error) {
    logger.error('Error calculating campaign recipients:', error);
    throw error;
  }
}

/**
 * Build WHERE clause for segment conditions
 */
function buildSegmentWhereClause(teamId, conditions) {
  const whereClause = {
    team_id: teamId,
    is_blocked: false,
    deleted_at: null,
  };

  // Add dynamic conditions based on segment configuration
  if (conditions.engagement_score) {
    const { operator, value } = conditions.engagement_score;
    switch (operator) {
      case 'gt':
        whereClause.engagement_score = { gt: value };
        break;
      case 'gte':
        whereClause.engagement_score = { gte: value };
        break;
      case 'lt':
        whereClause.engagement_score = { lt: value };
        break;
      case 'lte':
        whereClause.engagement_score = { lte: value };
        break;
      case 'eq':
        whereClause.engagement_score = value;
        break;
    }
  }

  if (conditions.source) {
    whereClause.source = conditions.source;
  }

  if (conditions.country) {
    whereClause.country = conditions.country;
  }

  if (conditions.city) {
    whereClause.city = conditions.city;
  }

  if (conditions.created_after) {
    whereClause.created_at = { gte: new Date(conditions.created_after) };
  }

  if (conditions.created_before) {
    whereClause.created_at = {
      ...whereClause.created_at,
      lte: new Date(conditions.created_before),
    };
  }

  return whereClause;
}

/**
 * Create a new campaign
 */
export async function createCampaign(userId, teamId, campaignData) {
  try {
    // Verify WhatsApp account belongs to team
    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: campaignData.accountId,
        team_id: teamId,
        is_active: true,
      },
    });

    if (!account) {
      throw new Error('WhatsApp account not found or inactive');
    }

    // Calculate recipients
    const recipientIds = await calculateRecipients(
      teamId,
      campaignData.audienceType,
      campaignData.audienceConfig
    );

    if (recipientIds.length === 0) {
      throw new Error('No recipients found for the specified audience');
    }

    // Determine initial status
    let status = 'draft';
    if (campaignData.scheduleType === 'now') {
      status = 'scheduled'; // Will be picked up by worker immediately
    } else if (campaignData.scheduleType === 'scheduled') {
      status = 'scheduled';
    }

    // Create campaign
    const campaign = await prisma.campaigns.create({
      data: {
        id: uuidv4(),
        team_id: teamId,
        user_id: userId,
        account_id: campaignData.accountId,
        template_id: campaignData.templateId || null,
        name: campaignData.name,
        description: campaignData.description || null,
        messageType: campaignData.messageType,
        message_content: campaignData.messageContent || null,
        template_variables: campaignData.templateVariables || null,
        audienceType: campaignData.audienceType,
        audience_config: campaignData.audienceConfig,
        schedule_type: campaignData.scheduleType,
        scheduled_at: campaignData.scheduledAt || new Date(),
        recurring_config: campaignData.recurringConfig || null,
        throttle_config: campaignData.throttleConfig,
        status,
        total_recipients: recipientIds.length,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Create campaign recipients
    const campaignMessages = recipientIds.map((contactId) => ({
      id: uuidv4(),
      campaign_id: campaign.id,
      contact_id: contactId,
      status: 'pending',
      created_at: new Date(),
    }));

    // Batch insert recipients
    await prisma.campaign_messages.createMany({
      data: campaignMessages,
    });

    logger.info(`Campaign created: ${campaign.id} with ${recipientIds.length} recipients`);

    return campaign;
  } catch (error) {
    logger.error('Error creating campaign:', error);
    throw error;
  }
}

/**
 * Get campaigns with filters and pagination
 */
export async function getCampaigns(teamId, filters) {
  try {
    const { page, limit, status, accountId, search, sortBy, sortOrder, startDate, endDate } =
      filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      team_id: teamId,
    };

    if (status) {
      where.status = status;
    }

    if (accountId) {
      where.account_id = accountId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = new Date(startDate);
      }
      if (endDate) {
        where.created_at.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.campaigns.count({ where });

    // Get campaigns
    const campaigns = await prisma.campaigns.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        whatsapp_accounts: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return {
      campaigns,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching campaigns:', error);
    throw error;
  }
}

/**
 * Get campaign by ID with detailed stats
 */
export async function getCampaignById(teamId, campaignId) {
  try {
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
      include: {
        whatsapp_accounts: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
        templates: {
          select: {
            id: true,
            name: true,
            category: true,
            status: true,
          },
        },
      },
    });

    if (!campaign) {
      return null;
    }

    // Calculate detailed stats
    const stats = {
      deliveryRate:
        campaign.total_recipients > 0
          ? ((campaign.messages_delivered / campaign.total_recipients) * 100).toFixed(2)
          : 0,
      readRate:
        campaign.messages_delivered > 0
          ? ((campaign.messages_read / campaign.messages_delivered) * 100).toFixed(2)
          : 0,
      failureRate:
        campaign.total_recipients > 0
          ? ((campaign.messages_failed / campaign.total_recipients) * 100).toFixed(2)
          : 0,
      replyRate:
        campaign.messages_delivered > 0
          ? ((campaign.messages_replied / campaign.messages_delivered) * 100).toFixed(2)
          : 0,
      pending: campaign.total_recipients - campaign.messages_sent,
    };

    return {
      ...campaign,
      stats,
    };
  } catch (error) {
    logger.error('Error fetching campaign:', error);
    throw error;
  }
}

/**
 * Update campaign
 */
export async function updateCampaign(teamId, campaignId, updateData) {
  try {
    // Check if campaign exists and belongs to team
    const existingCampaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
    });

    if (!existingCampaign) {
      return null;
    }

    // Prevent updates to running or completed campaigns
    if (['running', 'completed'].includes(existingCampaign.status)) {
      throw new Error(`Cannot update campaign with status: ${existingCampaign.status}`);
    }

    // Update campaign
    const campaign = await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    });

    logger.info(`Campaign updated: ${campaignId}`);

    return campaign;
  } catch (error) {
    logger.error('Error updating campaign:', error);
    throw error;
  }
}

/**
 * Delete campaign
 */
export async function deleteCampaign(teamId, campaignId) {
  try {
    // Check if campaign exists and belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
    });

    if (!campaign) {
      return null;
    }

    // Prevent deletion of running campaigns
    if (campaign.status === 'running') {
      throw new Error('Cannot delete a running campaign. Please pause it first.');
    }

    // Delete campaign and related messages (cascade)
    await prisma.campaigns.delete({
      where: { id: campaignId },
    });

    logger.info(`Campaign deleted: ${campaignId}`);

    return true;
  } catch (error) {
    logger.error('Error deleting campaign:', error);
    throw error;
  }
}

/**
 * Get campaign recipients with pagination
 */
export async function getCampaignRecipients(teamId, campaignId, filters) {
  try {
    // Verify campaign belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
    });

    if (!campaign) {
      return null;
    }

    const { page, limit, status, sortBy, sortOrder } = filters;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      campaign_id: campaignId,
    };

    if (status) {
      where.status = status;
    }

    // Get total count
    const total = await prisma.campaign_messages.count({ where });

    // Get recipients
    const recipients = await prisma.campaign_messages.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        contacts: {
          select: {
            id: true,
            phone: true,
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    return {
      recipients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching campaign recipients:', error);
    throw error;
  }
}

/**
 * Start campaign execution
 */
export async function startCampaign(teamId, campaignId) {
  try {
    // Check if campaign exists and belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
      include: {
        whatsapp_accounts: true,
      },
    });

    if (!campaign) {
      return null;
    }

    // Validate campaign can be started
    if (campaign.status === 'running') {
      throw new Error('Campaign is already running');
    }

    if (campaign.status === 'completed') {
      throw new Error('Cannot start a completed campaign');
    }

    // Verify WhatsApp account is connected
    if (campaign.whatsapp_accounts.status !== 'connected') {
      throw new Error(
        `WhatsApp account is not connected. Please connect the account before starting the campaign.`
      );
    }

    // Update campaign status to scheduled
    const updatedCampaign = await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'scheduled',
        scheduled_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Queue campaign for execution
    const { campaignQueue } = await import('../queues/index.js');
    await campaignQueue.add(
      { campaignId },
      {
        priority: campaign.priority === 'high' ? 1 : campaign.priority === 'low' ? 10 : 5,
        attempts: 2,
      }
    );

    logger.info(`Campaign ${campaignId} queued for execution`);

    return updatedCampaign;
  } catch (error) {
    logger.error('Error starting campaign:', error);
    throw error;
  }
}

/**
 * Pause campaign execution
 */
export async function pauseCampaign(teamId, campaignId) {
  try {
    // Check if campaign exists and belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
    });

    if (!campaign) {
      return null;
    }

    // Validate campaign can be paused
    if (campaign.status !== 'running' && campaign.status !== 'scheduled') {
      throw new Error(`Cannot pause campaign with status: ${campaign.status}`);
    }

    // Update campaign status to paused
    const updatedCampaign = await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'paused',
        updated_at: new Date(),
      },
    });

    logger.info(`Campaign ${campaignId} paused`);

    return updatedCampaign;
  } catch (error) {
    logger.error('Error pausing campaign:', error);
    throw error;
  }
}

/**
 * Resume paused campaign
 */
export async function resumeCampaign(teamId, campaignId) {
  try {
    // Check if campaign exists and belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
      include: {
        whatsapp_accounts: true,
      },
    });

    if (!campaign) {
      return null;
    }

    // Validate campaign can be resumed
    if (campaign.status !== 'paused') {
      throw new Error('Only paused campaigns can be resumed');
    }

    // Verify WhatsApp account is still connected
    if (campaign.whatsapp_accounts.status !== 'connected') {
      throw new Error(
        `WhatsApp account is not connected. Please connect the account before resuming the campaign.`
      );
    }

    // Update campaign status to scheduled
    const updatedCampaign = await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'scheduled',
        updated_at: new Date(),
      },
    });

    // Queue campaign for execution
    const { campaignQueue } = await import('../queues/index.js');
    await campaignQueue.add(
      { campaignId },
      {
        priority: campaign.priority === 'high' ? 1 : campaign.priority === 'low' ? 10 : 5,
        attempts: 2,
      }
    );

    logger.info(`Campaign ${campaignId} resumed and queued for execution`);

    return updatedCampaign;
  } catch (error) {
    logger.error('Error resuming campaign:', error);
    throw error;
  }
}

/**
 * Duplicate campaign
 */
export async function duplicateCampaign(userId, teamId, campaignId) {
  try {
    // Get original campaign
    const originalCampaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
      },
    });

    if (!originalCampaign) {
      return null;
    }

    // Create duplicate campaign
    const duplicateCampaign = await prisma.campaigns.create({
      data: {
        id: uuidv4(),
        team_id: teamId,
        user_id: userId,
        account_id: originalCampaign.account_id,
        template_id: originalCampaign.template_id,
        name: `${originalCampaign.name} (Copy)`,
        description: originalCampaign.description,
        messageType: originalCampaign.messageType,
        message_content: originalCampaign.message_content,
        template_variables: originalCampaign.template_variables,
        audienceType: originalCampaign.audienceType,
        audience_config: originalCampaign.audience_config,
        schedule_type: 'manual',
        scheduled_at: null,
        recurring_config: originalCampaign.recurring_config,
        throttle_config: originalCampaign.throttle_config,
        status: 'draft',
        total_recipients: 0,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Recalculate recipients for the duplicate
    const recipientIds = await calculateRecipients(
      teamId,
      duplicateCampaign.audienceType,
      duplicateCampaign.audience_config
    );

    // Create campaign recipients
    if (recipientIds.length > 0) {
      const campaignMessages = recipientIds.map((contactId) => ({
        id: uuidv4(),
        campaign_id: duplicateCampaign.id,
        contact_id: contactId,
        status: 'pending',
        created_at: new Date(),
      }));

      await prisma.campaign_messages.createMany({
        data: campaignMessages,
      });

      // Update total recipients
      await prisma.campaigns.update({
        where: { id: duplicateCampaign.id },
        data: { total_recipients: recipientIds.length },
      });
    }

    logger.info(`Campaign ${campaignId} duplicated as ${duplicateCampaign.id}`);

    return duplicateCampaign;
  } catch (error) {
    logger.error('Error duplicating campaign:', error);
    throw error;
  }
}

/**
 * Assign variant to recipients using weighted random distribution
 */
function assignVariants(recipientIds, variants) {
  const assignments = [];

  // Create cumulative distribution for weighted random selection
  const cumulativeDistribution = [];
  let cumulative = 0;

  for (const variant of variants) {
    cumulative += variant.percentage;
    cumulativeDistribution.push({
      variantId: variant.id,
      threshold: cumulative,
    });
  }

  // Assign each recipient to a variant
  for (const contactId of recipientIds) {
    const random = Math.random() * 100;
    const assignment = cumulativeDistribution.find((d) => random < d.threshold);

    assignments.push({
      contactId,
      variantId: assignment.variantId,
    });
  }

  return assignments;
}

/**
 * Calculate metrics for a specific variant
 */
async function calculateVariantMetrics(campaignId, variantId) {
  const stats = await prisma.campaign_messages.aggregate({
    where: {
      campaign_id: campaignId,
      variant_id: variantId,
    },
    _count: {
      id: true,
    },
  });

  const statusCounts = await prisma.campaign_messages.groupBy({
    by: ['status'],
    where: {
      campaign_id: campaignId,
      variant_id: variantId,
    },
    _count: {
      id: true,
    },
  });

  const total = stats._count.id;
  const sent =
    statusCounts.find((s) => ['sent', 'delivered', 'read'].includes(s.status))?._count.id || 0;
  const delivered =
    statusCounts.find((s) => ['delivered', 'read'].includes(s.status))?._count.id || 0;
  const read = statusCounts.find((s) => s.status === 'read')?._count.id || 0;

  // Count replies
  const replied = await prisma.campaign_messages.count({
    where: {
      campaign_id: campaignId,
      variant_id: variantId,
      replied_at: { not: null },
    },
  });

  return {
    total,
    sent,
    delivered,
    read,
    replied,
    deliveryRate: sent > 0 ? ((delivered / sent) * 100).toFixed(2) : 0,
    readRate: delivered > 0 ? ((read / delivered) * 100).toFixed(2) : 0,
    replyRate: delivered > 0 ? ((replied / delivered) * 100).toFixed(2) : 0,
    engagementRate: delivered > 0 ? (((read + replied) / delivered) * 100).toFixed(2) : 0,
  };
}

/**
 * Select winning variant based on criteria
 */
async function selectWinningVariant(campaignId, winnerCriteria) {
  const campaign = await prisma.campaigns.findUnique({
    where: { id: campaignId },
  });

  if (!campaign || !campaign.is_ab_test || !campaign.ab_test_config) {
    throw new Error('Invalid A/B test campaign');
  }

  const variants = campaign.ab_test_config.variants;
  const variantMetrics = [];

  // Calculate metrics for each variant
  for (const variant of variants) {
    const metrics = await calculateVariantMetrics(campaignId, variant.id);
    variantMetrics.push({
      variantId: variant.id,
      variantName: variant.name,
      metrics,
    });
  }

  // Select winner based on criteria
  let winner = variantMetrics[0];
  const criteriaMap = {
    delivery_rate: 'deliveryRate',
    read_rate: 'readRate',
    reply_rate: 'replyRate',
    engagement_rate: 'engagementRate',
  };

  const metricKey = criteriaMap[winnerCriteria];

  for (const variant of variantMetrics) {
    if (parseFloat(variant.metrics[metricKey]) > parseFloat(winner.metrics[metricKey])) {
      winner = variant;
    }
  }

  return {
    winningVariantId: winner.variantId,
    variantMetrics,
  };
}

/**
 * Create A/B test campaign
 */
export async function createABTestCampaign(userId, teamId, abTestData) {
  try {
    // Verify WhatsApp account belongs to team
    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: abTestData.accountId,
        team_id: teamId,
        is_active: true,
      },
    });

    if (!account) {
      throw new Error('WhatsApp account not found or inactive');
    }

    // Calculate recipients
    const recipientIds = await calculateRecipients(
      teamId,
      abTestData.audienceType,
      abTestData.audienceConfig
    );

    if (recipientIds.length === 0) {
      throw new Error('No recipients found for the specified audience');
    }

    // Generate variant IDs
    const variants = abTestData.variants.map((variant) => ({
      ...variant,
      id: uuidv4(),
    }));

    // Determine initial status
    let status = 'draft';
    if (abTestData.scheduleType === 'now') {
      status = 'scheduled';
    } else if (abTestData.scheduleType === 'scheduled') {
      status = 'scheduled';
    }

    // Create A/B test configuration
    const abTestConfig = {
      variants,
      winnerCriteria: abTestData.winnerCriteria,
      testDuration: abTestData.testDuration,
      autoSelectWinner: abTestData.autoSelectWinner,
      testStartedAt: null,
      testCompletedAt: null,
    };

    // Create campaign
    const campaign = await prisma.campaigns.create({
      data: {
        id: uuidv4(),
        team_id: teamId,
        user_id: userId,
        account_id: abTestData.accountId,
        name: abTestData.name,
        description: abTestData.description || null,
        messageType: 'text', // Will be overridden by variant
        message_content: null, // Will be overridden by variant
        audienceType: abTestData.audienceType,
        audience_config: abTestData.audienceConfig,
        schedule_type: abTestData.scheduleType,
        scheduled_at: abTestData.scheduledAt || new Date(),
        throttle_config: abTestData.throttleConfig,
        status,
        total_recipients: recipientIds.length,
        is_ab_test: true,
        ab_test_config: abTestConfig,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Assign variants to recipients
    const variantAssignments = assignVariants(recipientIds, variants);

    // Create campaign messages with variant assignments
    const campaignMessages = variantAssignments.map((assignment) => ({
      id: uuidv4(),
      campaign_id: campaign.id,
      contact_id: assignment.contactId,
      variant_id: assignment.variantId,
      status: 'pending',
      created_at: new Date(),
    }));

    // Batch insert recipients
    await prisma.campaign_messages.createMany({
      data: campaignMessages,
    });

    logger.info(
      `A/B test campaign created: ${campaign.id} with ${recipientIds.length} recipients and ${variants.length} variants`
    );

    return campaign;
  } catch (error) {
    logger.error('Error creating A/B test campaign:', error);
    throw error;
  }
}

/**
 * Get A/B test results
 */
export async function getABTestResults(teamId, campaignId) {
  try {
    // Verify campaign exists and belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
        is_ab_test: true,
      },
    });

    if (!campaign) {
      return null;
    }

    if (!campaign.ab_test_config) {
      throw new Error('Campaign is not an A/B test');
    }

    const variants = campaign.ab_test_config.variants;
    const variantResults = [];

    // Calculate metrics for each variant
    for (const variant of variants) {
      const metrics = await calculateVariantMetrics(campaignId, variant.id);
      variantResults.push({
        variantId: variant.id,
        variantName: variant.name,
        messageType: variant.messageType,
        messageContent: variant.messageContent,
        percentage: variant.percentage,
        metrics,
      });
    }

    // Determine if test is complete
    const testStartedAt = campaign.ab_test_config.testStartedAt
      ? new Date(campaign.ab_test_config.testStartedAt)
      : null;
    const testDuration = campaign.ab_test_config.testDuration;
    const isTestComplete =
      testStartedAt && Date.now() - testStartedAt.getTime() >= testDuration * 60 * 60 * 1000;

    return {
      campaign: {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        totalRecipients: campaign.total_recipients,
        winnerCriteria: campaign.ab_test_config.winnerCriteria,
        testDuration: campaign.ab_test_config.testDuration,
        autoSelectWinner: campaign.ab_test_config.autoSelectWinner,
        testStartedAt: campaign.ab_test_config.testStartedAt,
        testCompletedAt: campaign.ab_test_config.testCompletedAt,
        winningVariantId: campaign.winning_variant_id,
        isTestComplete,
      },
      variants: variantResults,
    };
  } catch (error) {
    logger.error('Error fetching A/B test results:', error);
    throw error;
  }
}

/**
 * Manually select winning variant
 */
export async function selectWinner(teamId, campaignId, variantId) {
  try {
    // Verify campaign exists and belongs to team
    const campaign = await prisma.campaigns.findFirst({
      where: {
        id: campaignId,
        team_id: teamId,
        is_ab_test: true,
      },
    });

    if (!campaign) {
      return null;
    }

    if (!campaign.ab_test_config) {
      throw new Error('Campaign is not an A/B test');
    }

    // Verify variant exists
    const variant = campaign.ab_test_config.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error('Variant not found');
    }

    // Update campaign with winning variant
    const updatedCampaign = await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        winning_variant_id: variantId,
        ab_test_config: {
          ...campaign.ab_test_config,
          testCompletedAt: new Date().toISOString(),
        },
        updated_at: new Date(),
      },
    });

    logger.info(`Winning variant ${variantId} selected for campaign ${campaignId}`);

    return updatedCampaign;
  } catch (error) {
    logger.error('Error selecting winning variant:', error);
    throw error;
  }
}

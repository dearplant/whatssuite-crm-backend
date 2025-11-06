/**
 * Campaign Worker
 *
 * Processes campaign execution jobs from the campaign queue
 * Handles batch processing, rate limiting, template rendering, and progress tracking
 */

import { PrismaClient } from '@prisma/client';
import { campaignQueue, messageQueue } from '../queues/index.js';
import logger from '../utils/logger.js';
import { getSocketIO } from '../sockets/index.js';

const prisma = new PrismaClient();

/**
 * Template variable rendering system
 * Replaces {{variable}} placeholders with actual values
 */
function renderTemplate(template, variables) {
  if (!template) return template;

  let rendered = template;

  // Replace all {{variable}} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  });

  // Remove any remaining unreplaced variables
  rendered = rendered.replace(/{{[^}]+}}/g, '');

  return rendered;
}

/**
 * Sleep utility for rate limiting
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate campaign metrics
 */
async function calculateCampaignMetrics(campaignId) {
  try {
    const stats = await prisma.campaign_messages.groupBy({
      by: ['status'],
      where: { campaign_id: campaignId },
      _count: true,
    });

    const metrics = {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      replied: 0,
    };

    stats.forEach((stat) => {
      switch (stat.status) {
        case 'sent':
          metrics.sent = stat._count;
          break;
        case 'delivered':
          metrics.delivered = stat._count;
          break;
        case 'read':
          metrics.read = stat._count;
          break;
        case 'failed':
          metrics.failed = stat._count;
          break;
        case 'replied':
          metrics.replied = stat._count;
          break;
      }
    });

    return metrics;
  } catch (error) {
    logger.error('Error calculating campaign metrics:', error);
    return null;
  }
}

/**
 * Update campaign statistics
 */
async function updateCampaignStats(campaignId) {
  try {
    const metrics = await calculateCampaignMetrics(campaignId);
    if (!metrics) return;

    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { total_recipients: true },
    });

    if (!campaign) return;

    // Calculate rates
    const deliveryRate =
      metrics.sent > 0 ? ((metrics.delivered / metrics.sent) * 100).toFixed(2) : 0;

    const readRate =
      metrics.delivered > 0 ? ((metrics.read / metrics.delivered) * 100).toFixed(2) : 0;

    const replyRate =
      metrics.delivered > 0 ? ((metrics.replied / metrics.delivered) * 100).toFixed(2) : 0;

    // Update campaign
    await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        messages_sent: metrics.sent,
        messages_delivered: metrics.delivered,
        messages_read: metrics.read,
        messages_failed: metrics.failed,
        messages_replied: metrics.replied,
        delivery_rate: parseFloat(deliveryRate),
        read_rate: parseFloat(readRate),
        reply_rate: parseFloat(replyRate),
        updated_at: new Date(),
      },
    });

    logger.debug(`Campaign stats updated: ${campaignId}`, metrics);
  } catch (error) {
    logger.error('Error updating campaign stats:', error);
  }
}

/**
 * Process campaign execution
 */
async function processCampaign(job) {
  const { campaignId } = job.data;
  const io = getSocketIO();

  try {
    logger.info(`Processing campaign: ${campaignId}`);

    // Fetch campaign with recipients
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
      include: {
        whatsapp_accounts: true,
      },
    });

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Check if campaign is already running or completed
    if (campaign.status === 'running') {
      logger.warn(`Campaign ${campaignId} is already running`);
      return;
    }

    if (campaign.status === 'completed') {
      logger.warn(`Campaign ${campaignId} is already completed`);
      return;
    }

    // Check if campaign is paused
    if (campaign.status === 'paused') {
      logger.info(`Campaign ${campaignId} is paused, skipping execution`);
      return;
    }

    // Verify WhatsApp account is connected
    if (campaign.whatsapp_accounts.status !== 'connected') {
      throw new Error(
        `WhatsApp account ${campaign.account_id} is not connected. Status: ${campaign.whatsapp_accounts.status}`
      );
    }

    // Update campaign status to running
    await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'running',
        started_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Emit start event
    io.to(campaign.user_id).emit('campaign:started', {
      campaignId,
      startedAt: new Date(),
    });

    logger.info(`Campaign ${campaignId} started execution`);

    // Get pending recipients
    const recipients = await prisma.campaign_messages.findMany({
      where: {
        campaign_id: campaignId,
        status: 'pending',
      },
      include: {
        contacts: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    if (recipients.length === 0) {
      logger.info(`No pending recipients for campaign ${campaignId}`);
      await completeCampaign(campaignId, campaign.user_id);
      return;
    }

    logger.info(`Processing ${recipients.length} recipients for campaign ${campaignId}`);

    // Get throttle configuration
    const throttleConfig = campaign.throttle_config || {};
    const messagesPerMinute = throttleConfig.messagesPerMinute || 20;
    const batchSize = throttleConfig.batchSize || 100;
    const delayBetweenBatches = throttleConfig.delayBetweenBatches || 0;

    // Calculate delay between messages (in milliseconds)
    const delayBetweenMessages = Math.ceil(60000 / messagesPerMinute);

    logger.info(`Campaign ${campaignId} throttle config:`, {
      messagesPerMinute,
      batchSize,
      delayBetweenMessages,
      delayBetweenBatches,
    });

    // Update A/B test start time if applicable
    if (campaign.is_ab_test && campaign.ab_test_config) {
      const abTestConfig = campaign.ab_test_config;
      if (!abTestConfig.testStartedAt) {
        await prisma.campaigns.update({
          where: { id: campaignId },
          data: {
            ab_test_config: {
              ...abTestConfig,
              testStartedAt: new Date().toISOString(),
            },
          },
        });
      }
    }

    // Process recipients in batches
    let processedCount = 0;
    const totalRecipients = recipients.length;

    for (let i = 0; i < totalRecipients; i += batchSize) {
      // Check if campaign was paused
      const currentCampaign = await prisma.campaigns.findUnique({
        where: { id: campaignId },
        select: { status: true },
      });

      if (currentCampaign.status === 'paused') {
        logger.info(`Campaign ${campaignId} was paused, stopping execution`);
        io.to(campaign.user_id).emit('campaign:paused', {
          campaignId,
          processedCount,
          totalRecipients,
        });
        return;
      }

      const batch = recipients.slice(i, i + batchSize);
      logger.info(`Processing batch ${Math.floor(i / batchSize) + 1} for campaign ${campaignId}`);

      // Process each recipient in the batch
      for (const recipient of batch) {
        try {
          // Build template variables
          const variables = {
            firstName: recipient.contacts.first_name || '',
            lastName: recipient.contacts.last_name || '',
            name:
              `${recipient.contacts.first_name || ''} ${recipient.contacts.last_name || ''}`.trim() ||
              'there',
            phone: recipient.contacts.phone || '',
            email: recipient.contacts.email || '',
            company: recipient.contacts.company || '',
            ...(campaign.template_variables || {}),
          };

          // Get message content and type based on variant (for A/B tests)
          let messageContent = campaign.message_content;
          let messageType = campaign.messageType;
          let templateId = campaign.template_id;
          let templateVariables = campaign.template_variables;

          if (campaign.is_ab_test && recipient.variant_id) {
            const variant = campaign.ab_test_config.variants.find(
              (v) => v.id === recipient.variant_id
            );
            if (variant) {
              messageContent = variant.messageContent;
              messageType = variant.messageType;
              templateId = variant.templateId || null;
              templateVariables = variant.templateVariables || {};
            }
          }

          // Render message content
          const renderedContent = renderTemplate(messageContent, variables);

          // Queue message for sending
          await messageQueue.add(
            {
              campaignId: campaign.id,
              campaignMessageId: recipient.id,
              accountId: campaign.account_id,
              contactId: recipient.contact_id,
              to: recipient.contacts.phone,
              type: messageType || 'text',
              content: renderedContent,
              templateId: templateId,
              templateVariables: { ...variables, ...templateVariables },
            },
            {
              priority: campaign.priority === 'high' ? 1 : campaign.priority === 'low' ? 10 : 5,
              attempts: 3,
            }
          );

          // Update recipient status to queued
          await prisma.campaign_messages.update({
            where: { id: recipient.id },
            data: {
              status: 'queued',
              queued_at: new Date(),
            },
          });

          processedCount++;

          // Emit progress update every 100 messages
          if (processedCount % 100 === 0) {
            const progress = ((processedCount / totalRecipients) * 100).toFixed(2);

            io.to(campaign.user_id).emit('campaign:progress', {
              campaignId,
              processedCount,
              totalRecipients,
              progress: parseFloat(progress),
            });

            logger.info(`Campaign ${campaignId} progress: ${progress}%`);
          }

          // Update campaign stats periodically
          if (processedCount % 50 === 0) {
            await updateCampaignStats(campaignId);
          }

          // Rate limiting: delay between messages
          if (processedCount < totalRecipients) {
            await sleep(delayBetweenMessages);
          }
        } catch (error) {
          logger.error(`Error processing recipient ${recipient.id}:`, error);

          // Mark recipient as failed
          await prisma.campaign_messages.update({
            where: { id: recipient.id },
            data: {
              status: 'failed',
              error_message: error.message,
              failed_at: new Date(),
            },
          });
        }
      }

      // Delay between batches if configured
      if (delayBetweenBatches > 0 && i + batchSize < totalRecipients) {
        logger.info(`Waiting ${delayBetweenBatches}ms before next batch`);
        await sleep(delayBetweenBatches);
      }
    }

    // Final progress update
    io.to(campaign.user_id).emit('campaign:progress', {
      campaignId,
      processedCount,
      totalRecipients,
      progress: 100,
    });

    // Update final stats
    await updateCampaignStats(campaignId);

    // Complete campaign
    await completeCampaign(campaignId, campaign.user_id);

    logger.info(`Campaign ${campaignId} completed successfully`);
  } catch (error) {
    logger.error(`Error processing campaign ${campaignId}:`, error);

    // Update campaign status to failed
    await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'failed',
        error_message: error.message,
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Emit failure event
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: { user_id: true },
    });

    if (campaign) {
      io.to(campaign.user_id).emit('campaign:failed', {
        campaignId,
        error: error.message,
        failedAt: new Date(),
      });
    }

    throw error;
  }
}

/**
 * Complete campaign execution
 */
async function completeCampaign(campaignId, userId) {
  try {
    // Update campaign status
    await prisma.campaigns.update({
      where: { id: campaignId },
      data: {
        status: 'completed',
        completed_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Final stats update
    await updateCampaignStats(campaignId);

    // Get final campaign data
    const campaign = await prisma.campaigns.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        total_recipients: true,
        messages_sent: true,
        messages_delivered: true,
        messages_read: true,
        messages_failed: true,
        messages_replied: true,
        delivery_rate: true,
        read_rate: true,
        reply_rate: true,
        started_at: true,
        completed_at: true,
      },
    });

    // Emit completion event
    const io = getSocketIO();
    io.to(userId).emit('campaign:completed', {
      campaignId,
      campaign,
      completedAt: new Date(),
    });

    logger.info(`Campaign ${campaignId} marked as completed`);
  } catch (error) {
    logger.error(`Error completing campaign ${campaignId}:`, error);
    throw error;
  }
}

/**
 * Initialize campaign worker
 */
export function initializeCampaignWorker() {
  // Process campaigns with concurrency of 5
  campaignQueue.process(5, processCampaign);

  logger.info('Campaign worker initialized with concurrency: 5');

  // Handle worker events
  campaignQueue.on('completed', (job, result) => {
    logger.info(`Campaign job ${job.id} completed`, { campaignId: job.data.campaignId });
  });

  campaignQueue.on('failed', (job, err) => {
    logger.error(`Campaign job ${job.id} failed`, {
      campaignId: job.data.campaignId,
      error: err.message,
    });
  });

  campaignQueue.on('stalled', (job) => {
    logger.warn(`Campaign job ${job.id} stalled`, { campaignId: job.data.campaignId });
  });
}

export default {
  initializeCampaignWorker,
  processCampaign,
  renderTemplate,
  calculateCampaignMetrics,
  updateCampaignStats,
};

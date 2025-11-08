/**
 * Message Worker
 * Processes message sending jobs from the queue
 */

import { messageQueue } from '../queues/index.js';
import messageModel from '../models/message.js';
import whatsappService from '../services/whatsappService.js';
import logger from '../utils/logger.js';

/**
 * Process message sending jobs
 * Only start processing if not in test environment
 */
if (process.env.NODE_ENV !== 'test') {
  // Process with concurrency of 10
  messageQueue.process(10, async (job) => {
    const {
      messageId,
      campaignId,
      campaignMessageId,
      accountId,
      contactId,
      to,
      type,
      content,
      templateId,
      templateVariables,
      retryCount = 0,
    } = job.data;

    logger.info(`Processing message job`, {
      jobId: job.id,
      messageId,
      campaignId,
      campaignMessageId,
      retryCount,
      attempt: job.attemptsMade,
    });

    try {
      let message;
      const isCampaignMessage = !!campaignId;

      // Handle campaign messages differently
      if (isCampaignMessage) {
        // Send message directly for campaign
        const result = await whatsappService.sendMessage({
          whatsappAccountId: accountId,
          to,
          type,
          content,
          templateId,
          templateVariables,
        });

        // Update campaign message status
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();

        await prisma.campaign_messages.update({
          where: { id: campaignMessageId },
          data: {
            status: 'sent',
            whatsapp_message_id: result.whatsappMessageId,
            sent_at: new Date(),
          },
        });

        await prisma.$disconnect();

        logger.info(`Campaign message sent successfully`, {
          jobId: job.id,
          campaignId,
          campaignMessageId,
          whatsappMessageId: result.whatsappMessageId,
        });

        return {
          campaignMessageId,
          whatsappMessageId: result.whatsappMessageId,
          status: 'sent',
        };
      } else {
        // Handle regular messages
        message = await messageModel.findById(messageId);

        if (!message) {
          throw new Error(`Message not found: ${messageId}`);
        }

        // Check if message is already sent
        if (
          message.status === 'Sent' ||
          message.status === 'Delivered' ||
          message.status === 'Read'
        ) {
          logger.info(`Message already sent, skipping`, { messageId });
          return { messageId, status: message.status, skipped: true };
        }

        // Send message via WhatsApp service
        const result = await whatsappService.sendMessage({
          whatsappAccountId: message.whatsappAccountId,
          to: message.contact.phone,
          type: message.type,
          content: message.content,
          mediaUrl: message.mediaUrl,
        });

        // Update message status to Sent
        await messageModel.updateStatus(messageId, 'Sent', {
          whatsappMessageId: result.whatsappMessageId || message.whatsappMessageId,
          sentAt: new Date(),
        });

        logger.info(`Message sent successfully`, {
          jobId: job.id,
          messageId,
          whatsappMessageId: result.whatsappMessageId,
        });

        return {
          messageId,
          whatsappMessageId: result.whatsappMessageId,
          status: 'Sent',
        };
      }
    } catch (error) {
      logger.error(`Message job failed`, {
        jobId: job.id,
        messageId,
        campaignId,
        campaignMessageId,
        error: error.message,
        attempt: job.attemptsMade,
        stack: error.stack,
      });

      // Update message status to Failed if this is the last attempt
      if (job.attemptsMade >= job.opts.attempts) {
        try {
          if (campaignMessageId) {
            // Update campaign message status
            const { PrismaClient } = await import('@prisma/client');
            const prisma = new PrismaClient();

            await prisma.campaign_messages.update({
              where: { id: campaignMessageId },
              data: {
                status: 'failed',
                error_message: error.message,
                failed_at: new Date(),
              },
            });

            await prisma.$disconnect();

            logger.error(`Campaign message marked as failed after ${job.attemptsMade} attempts`, {
              campaignMessageId,
            });
          } else if (messageId) {
            await messageModel.updateStatus(messageId, 'Failed', {
              errorMessage: error.message,
            });
            logger.error(`Message marked as failed after ${job.attemptsMade} attempts`, {
              messageId,
            });
          }
        } catch (updateError) {
          logger.error(`Failed to update message status`, {
            messageId,
            campaignMessageId,
            error: updateError.message,
          });
        }
      }

      throw error;
    }
  });

  /**
   * Queue event handlers
   */
  messageQueue.on('completed', (job, result) => {
    logger.debug(`Message job ${job.id} completed`, { result });
  });

  messageQueue.on('failed', (job, error) => {
    logger.error(`Message job ${job.id} failed after ${job.attemptsMade} attempts`, {
      error: error.message,
      data: job.data,
    });
  });

  messageQueue.on('stalled', (job) => {
    logger.warn(`Message job ${job.id} stalled`, { data: job.data });
  });

  logger.info('Message worker initialized successfully');
}

/**
 * Helper function to queue a message for sending
 * @param {string} messageId - Message ID
 * @param {Object} options - Queue options
 * @returns {Promise<Object>} Job object
 */
export async function queueMessage(messageId, options = {}) {
  return messageQueue.add(
    { messageId },
    {
      priority: options.priority || 5,
      delay: options.delay || 0,
      ...options,
    }
  );
}

/**
 * Helper function to queue multiple messages
 * @param {Array<string>} messageIds - Array of message IDs
 * @param {Object} options - Queue options
 * @returns {Promise<Array>} Array of job objects
 */
export async function queueMessages(messageIds, options = {}) {
  const jobs = messageIds.map((messageId) => ({
    data: { messageId },
    opts: {
      priority: options.priority || 5,
      delay: options.delay || 0,
      ...options,
    },
  }));

  return messageQueue.addBulk(jobs);
}

export default messageQueue;

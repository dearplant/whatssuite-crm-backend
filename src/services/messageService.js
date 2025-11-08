/**
 * Message Service
 * Business logic for message operations
 */

import messageModel from '../models/message.js';
import contactModel from '../models/contact.js';
import whatsappAccountModel from '../models/whatsappAccountWrapper.js';
import { queueMessage } from '../workers/messageWorker.js';
import { uploadToS3 } from '../utils/fileUpload.js';
import chatbotConversationService from './chatbotConversationService.js';
import logger from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import {
  emitMessageStatusUpdate,
  emitMessageReceived,
  emitMessageSent,
  emitMessageDelivered,
  emitMessageRead,
  emitMessageFailed,
} from '../sockets/index.js';

class MessageService {
  /**
   * Send a message
   * @param {Object} data - Message data
   * @returns {Promise<Object>} Created message
   */
  async sendMessage(data) {
    const {
      userId,
      whatsappAccountId,
      to,
      type,
      content,
      mediaUrl,
      mediaFile,
      scheduledFor,
      campaignId,
    } = data;

    try {
      // Validate WhatsApp account
      const whatsappAccount = await whatsappAccountModel.findById(whatsappAccountId);
      if (!whatsappAccount) {
        throw new Error('WhatsApp account not found');
      }

      if (whatsappAccount.userId !== userId) {
        throw new Error('Unauthorized access to WhatsApp account');
      }

      if (whatsappAccount.connectionStatus !== 'Connected') {
        throw new Error('WhatsApp account is not connected');
      }

      // Check daily limit
      if (whatsappAccount.messagesSentToday >= whatsappAccount.dailyLimit) {
        throw new Error('Daily message limit reached');
      }

      // Find or create contact
      let contact = await contactModel.findByPhone(whatsappAccountId, to);
      if (!contact) {
        contact = await contactModel.create({
          userId,
          whatsappAccountId,
          phone: to,
          name: to, // Use phone as name initially
          source: 'WhatsApp',
        });
      }

      // Handle media upload if file is provided
      let finalMediaUrl = mediaUrl;
      if (mediaFile) {
        const uploadResult = await uploadToS3(mediaFile, 'messages');
        finalMediaUrl = uploadResult.url;
      }

      // Create message record
      const message = await messageModel.create({
        userId,
        whatsappAccountId,
        contactId: contact.id,
        campaignId,
        direction: 'Outbound',
        type,
        content,
        mediaUrl: finalMediaUrl,
        whatsappMessageId: `temp_${uuidv4()}`, // Temporary ID until sent
        status: 'Queued',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        isFromBot: false,
      });

      // Queue message for sending
      const delay = scheduledFor ? new Date(scheduledFor).getTime() - Date.now() : 0;
      await queueMessage(message.id, {
        delay: Math.max(0, delay),
        priority: scheduledFor ? 7 : 5, // Lower priority for scheduled messages
      });

      // Update WhatsApp account message count
      await whatsappAccountModel.incrementMessagesSent(whatsappAccountId);

      // Update contact last message timestamp
      await contactModel.updateLastMessage(contact.id, 'Outbound');

      // Emit Socket.io event
      emitMessageStatusUpdate(userId, message.id, 'Queued', {
        contactId: contact.id,
        whatsappAccountId,
      });

      logger.info('Message queued for sending', {
        messageId: message.id,
        contactId: contact.id,
        type,
        scheduledFor,
      });

      return message;
    } catch (error) {
      logger.error('Failed to send message', {
        error: error.message,
        userId,
        whatsappAccountId,
        to,
      });
      throw error;
    }
  }

  /**
   * Handle incoming message from WhatsApp
   * @param {Object} data - Incoming message data
   * @returns {Promise<Object>} Created message
   */
  async handleIncomingMessage(data) {
    const { whatsappAccountId, from, type, content, mediaUrl, whatsappMessageId, timestamp } = data;

    try {
      // Check if message already exists
      const existingMessage = await messageModel.findByWhatsAppMessageId(whatsappMessageId);
      if (existingMessage) {
        logger.info('Message already processed', { whatsappMessageId });
        return existingMessage;
      }

      // Get WhatsApp account
      const whatsappAccount = await whatsappAccountModel.findById(whatsappAccountId);
      if (!whatsappAccount) {
        throw new Error('WhatsApp account not found');
      }

      // Find or create contact
      let contact = await contactModel.findByPhone(whatsappAccountId, from);
      if (!contact) {
        contact = await contactModel.create({
          userId: whatsappAccount.userId,
          whatsappAccountId,
          phone: from,
          name: from, // Use phone as name initially
          source: 'WhatsApp',
        });
      }

      // Create message record
      const message = await messageModel.create({
        userId: whatsappAccount.userId,
        whatsappAccountId,
        contactId: contact.id,
        direction: 'Inbound',
        type,
        content,
        mediaUrl,
        whatsappMessageId,
        status: 'Delivered', // Inbound messages are already delivered
        deliveredAt: timestamp ? new Date(timestamp) : new Date(),
        isFromBot: false,
      });

      // Update WhatsApp account received count
      await whatsappAccountModel.incrementMessagesReceived(whatsappAccountId);

      // Update contact last message timestamp and unread count
      await contactModel.updateLastMessage(contact.id, 'Inbound');
      await contactModel.incrementUnreadCount(contact.id);

      // Emit Socket.io event
      emitMessageReceived(whatsappAccount.userId, contact.id, message);

      logger.info('Incoming message processed', {
        messageId: message.id,
        contactId: contact.id,
        type,
        whatsappMessageId,
      });

      // Check for chatbot triggers (async, don't wait)
      chatbotConversationService.handleIncomingMessage(message, contact).catch((error) => {
        logger.error('Error checking chatbot triggers', {
          error: error.message,
          messageId: message.id,
        });
      });

      return message;
    } catch (error) {
      logger.error('Failed to handle incoming message', {
        error: error.message,
        whatsappAccountId,
        from,
        whatsappMessageId,
      });
      throw error;
    }
  }

  /**
   * Update message status (for delivery and read receipts)
   * @param {string} whatsappMessageId - WhatsApp message ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated message
   */
  async updateMessageStatus(whatsappMessageId, status) {
    try {
      const message = await messageModel.findByWhatsAppMessageId(whatsappMessageId);
      if (!message) {
        logger.warn('Message not found for status update', { whatsappMessageId, status });
        return null;
      }

      const updatedMessage = await messageModel.updateStatus(message.id, status);

      // Emit Socket.io event based on status
      if (status === 'Sent') {
        emitMessageSent(message.userId, message.contactId, updatedMessage);
      } else if (status === 'Delivered') {
        emitMessageDelivered(message.userId, message.id, updatedMessage.deliveredAt);
      } else if (status === 'Read') {
        emitMessageRead(message.userId, message.id, updatedMessage.readAt);
      } else if (status === 'Failed') {
        emitMessageFailed(message.userId, message.id, updatedMessage.errorMessage);
      }

      logger.info('Message status updated', {
        messageId: message.id,
        whatsappMessageId,
        status,
      });

      return updatedMessage;
    } catch (error) {
      logger.error('Failed to update message status', {
        error: error.message,
        whatsappMessageId,
        status,
      });
      throw error;
    }
  }

  /**
   * Get messages with filters
   * @param {Object} filters - Filter criteria
   * @param {Object} pagination - Pagination options
   * @returns {Promise<Object>} Messages and metadata
   */
  async getMessages(filters, pagination) {
    try {
      return await messageModel.findMany(filters, pagination);
    } catch (error) {
      logger.error('Failed to get messages', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get message by ID
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Message
   */
  async getMessageById(messageId, userId) {
    try {
      const message = await messageModel.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Unauthorized access to message');
      }

      return message;
    } catch (error) {
      logger.error('Failed to get message', {
        error: error.message,
        messageId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get message statistics
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(filters) {
    try {
      return await messageModel.getStatistics(filters);
    } catch (error) {
      logger.error('Failed to get message statistics', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Updated message
   */
  async markAsRead(messageId, userId) {
    try {
      const message = await messageModel.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Unauthorized access to message');
      }

      if (message.direction === 'Inbound') {
        // Decrement unread count for contact
        await contactModel.decrementUnreadCount(message.contactId);
      }

      return await messageModel.updateStatus(messageId, 'Read');
    } catch (error) {
      logger.error('Failed to mark message as read', {
        error: error.message,
        messageId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Retry failed message
   * @param {string} messageId - Message ID
   * @param {string} userId - User ID for authorization
   * @returns {Promise<Object>} Message
   */
  async retryMessage(messageId, userId) {
    try {
      const message = await messageModel.findById(messageId);
      if (!message) {
        throw new Error('Message not found');
      }

      if (message.userId !== userId) {
        throw new Error('Unauthorized access to message');
      }

      if (message.status !== 'Failed') {
        throw new Error('Only failed messages can be retried');
      }

      // Update status to Queued
      await messageModel.updateStatus(messageId, 'Queued', {
        errorMessage: null,
      });

      // Queue message for sending
      await queueMessage(messageId, {
        priority: 3, // Higher priority for retries
      });

      logger.info('Message queued for retry', { messageId });

      return await messageModel.findById(messageId);
    } catch (error) {
      logger.error('Failed to retry message', {
        error: error.message,
        messageId,
        userId,
      });
      throw error;
    }
  }
}

export default new MessageService();

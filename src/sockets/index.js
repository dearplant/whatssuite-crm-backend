/**
 * Socket.io Event Handlers
 *
 * This module exports helper functions for emitting real-time events
 * to connected clients via Socket.io
 */

import {
  getIO,
  emitToUser,
  emitToWhatsAppAccount,
  emitToCampaign,
  emitToContact,
  broadcastEvent,
} from '../config/socket.config.js';
import { logger } from '../utils/logger.js';

// Re-export socket utilities
export { getIO, emitToUser, emitToWhatsAppAccount, emitToCampaign, emitToContact, broadcastEvent };
export const getSocketIO = getIO; // Alias for backward compatibility

/**
 * WhatsApp Events
 */

export const emitWhatsAppConnectionStatus = (userId, accountId, status, data = {}) => {
  const payload = {
    accountId,
    status,
    timestamp: new Date().toISOString(),
    ...data,
  };

  emitToUser(userId, 'whatsapp:connection:status', payload);
  emitToWhatsAppAccount(accountId, 'connection:status', payload);

  logger.debug(`WhatsApp connection status emitted: ${accountId} - ${status}`);
};

export const emitWhatsAppQRCode = (userId, accountId, qrCode, expiresAt) => {
  const payload = {
    accountId,
    qrCode,
    expiresAt,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'whatsapp:qr:generated', payload);
  logger.debug(`WhatsApp QR code emitted for account: ${accountId}`);
};

export const emitWhatsAppReady = (userId, accountId, accountInfo) => {
  const payload = {
    accountId,
    accountInfo,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'whatsapp:ready', payload);
  emitToWhatsAppAccount(accountId, 'ready', payload);
  logger.debug(`WhatsApp ready event emitted for account: ${accountId}`);
};

export const emitWhatsAppDisconnected = (userId, accountId, reason) => {
  const payload = {
    accountId,
    reason,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'whatsapp:disconnected', payload);
  emitToWhatsAppAccount(accountId, 'disconnected', payload);
  logger.debug(`WhatsApp disconnected event emitted for account: ${accountId}`);
};

/**
 * Message Events
 */

export const emitMessageStatusUpdate = (userId, messageId, status, metadata = {}) => {
  const payload = {
    messageId,
    status,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  emitToUser(userId, 'message:status:update', payload);
  logger.debug(`Message status update emitted: ${messageId} - ${status}`);
};

export const emitMessageReceived = (userId, contactId, message) => {
  const payload = {
    message,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'message:received', payload);
  emitToContact(contactId, 'message:new', payload);
  logger.debug(`Message received event emitted for contact: ${contactId}`);
};

export const emitMessageSent = (userId, contactId, message) => {
  const payload = {
    message,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'message:sent', payload);
  emitToContact(contactId, 'message:new', payload);
  logger.debug(`Message sent event emitted for contact: ${contactId}`);
};

export const emitMessageDelivered = (userId, messageId, deliveredAt) => {
  const payload = {
    messageId,
    deliveredAt,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'message:delivered', payload);
  logger.debug(`Message delivered event emitted: ${messageId}`);
};

export const emitMessageRead = (userId, messageId, readAt) => {
  const payload = {
    messageId,
    readAt,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'message:read', payload);
  logger.debug(`Message read event emitted: ${messageId}`);
};

export const emitMessageFailed = (userId, messageId, error) => {
  const payload = {
    messageId,
    error,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'message:failed', payload);
  logger.debug(`Message failed event emitted: ${messageId}`);
};

/**
 * Campaign Events
 */

export const emitCampaignStarted = (userId, campaignId, campaign) => {
  const payload = {
    campaignId,
    campaign,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'campaign:started', payload);
  emitToCampaign(campaignId, 'started', payload);
  logger.debug(`Campaign started event emitted: ${campaignId}`);
};

export const emitCampaignProgress = (userId, campaignId, progress) => {
  const payload = {
    campaignId,
    progress,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'campaign:progress', payload);
  emitToCampaign(campaignId, 'progress', payload);
  logger.debug(`Campaign progress emitted: ${campaignId} - ${progress.percentage}%`);
};

export const emitCampaignCompleted = (userId, campaignId, stats) => {
  const payload = {
    campaignId,
    stats,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'campaign:completed', payload);
  emitToCampaign(campaignId, 'completed', payload);
  logger.debug(`Campaign completed event emitted: ${campaignId}`);
};

export const emitCampaignPaused = (userId, campaignId) => {
  const payload = {
    campaignId,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'campaign:paused', payload);
  emitToCampaign(campaignId, 'paused', payload);
  logger.debug(`Campaign paused event emitted: ${campaignId}`);
};

export const emitCampaignResumed = (userId, campaignId) => {
  const payload = {
    campaignId,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'campaign:resumed', payload);
  emitToCampaign(campaignId, 'resumed', payload);
  logger.debug(`Campaign resumed event emitted: ${campaignId}`);
};

export const emitCampaignFailed = (userId, campaignId, error) => {
  const payload = {
    campaignId,
    error,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'campaign:failed', payload);
  emitToCampaign(campaignId, 'failed', payload);
  logger.debug(`Campaign failed event emitted: ${campaignId}`);
};

/**
 * Contact Events
 */

export const emitContactCreated = (userId, contact) => {
  const payload = {
    contact,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'contact:created', payload);
  logger.debug(`Contact created event emitted: ${contact.id}`);
};

export const emitContactUpdated = (userId, contactId, updates) => {
  const payload = {
    contactId,
    updates,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'contact:updated', payload);
  emitToContact(contactId, 'updated', payload);
  logger.debug(`Contact updated event emitted: ${contactId}`);
};

export const emitContactDeleted = (userId, contactId) => {
  const payload = {
    contactId,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'contact:deleted', payload);
  logger.debug(`Contact deleted event emitted: ${contactId}`);
};

/**
 * Typing Indicator Events
 */

export const emitTypingIndicator = (contactId, whatsappAccountId, isTyping, userId) => {
  const payload = {
    contactId,
    whatsappAccountId,
    isTyping,
    userId,
    timestamp: new Date().toISOString(),
  };

  emitToContact(contactId, 'typing:indicator', payload);
  logger.debug(`Typing indicator emitted for contact: ${contactId} - ${isTyping}`);
};

/**
 * Flow Events
 */

export const emitFlowExecutionStarted = (userId, flowId, executionId) => {
  const payload = {
    flowId,
    executionId,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'flow:execution:started', payload);
  logger.debug(`Flow execution started event emitted: ${executionId}`);
};

export const emitFlowExecutionCompleted = (userId, flowId, executionId, result) => {
  const payload = {
    flowId,
    executionId,
    result,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'flow:execution:completed', payload);
  logger.debug(`Flow execution completed event emitted: ${executionId}`);
};

export const emitFlowExecutionFailed = (userId, flowId, executionId, error) => {
  const payload = {
    flowId,
    executionId,
    error,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'flow:execution:failed', payload);
  logger.debug(`Flow execution failed event emitted: ${executionId}`);
};

/**
 * System Notification Events
 */

export const emitSystemNotification = (userId, notification) => {
  const payload = {
    notification,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'system:notification', payload);
  logger.debug(`System notification emitted to user: ${userId}`);
};

/**
 * Team Activity Events
 */

export const emitTeamActivity = (userId, activity) => {
  const payload = {
    activity,
    timestamp: new Date().toISOString(),
  };

  emitToUser(userId, 'team:activity', payload);
  logger.debug(`Team activity emitted to user: ${userId}`);
};

/**
 * Export all event emitters
 */
export default {
  // WhatsApp events
  emitWhatsAppConnectionStatus,
  emitWhatsAppQRCode,
  emitWhatsAppReady,
  emitWhatsAppDisconnected,

  // Message events
  emitMessageStatusUpdate,
  emitMessageReceived,
  emitMessageSent,
  emitMessageDelivered,
  emitMessageRead,
  emitMessageFailed,

  // Campaign events
  emitCampaignStarted,
  emitCampaignProgress,
  emitCampaignCompleted,
  emitCampaignPaused,
  emitCampaignResumed,
  emitCampaignFailed,

  // Contact events
  emitContactCreated,
  emitContactUpdated,
  emitContactDeleted,

  // Typing indicator
  emitTypingIndicator,

  // Flow events
  emitFlowExecutionStarted,
  emitFlowExecutionCompleted,
  emitFlowExecutionFailed,

  // System events
  emitSystemNotification,
  emitTeamActivity,
};

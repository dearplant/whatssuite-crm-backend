/**
 * Message Handler
 * Handles incoming WhatsApp messages and acknowledgments
 * Breaks circular dependency by using event-driven architecture
 */

import whatsappEvents from '../events/whatsappEvents.js';
import logger from '../utils/logger.js';

class MessageHandler {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize message handlers
   * Call this once during application startup
   */
  initialize() {
    if (this.initialized) {
      logger.warn('MessageHandler already initialized');
      return;
    }

    // Register event handlers
    whatsappEvents.onIncomingMessage(this.handleIncomingMessage.bind(this));
    whatsappEvents.onMessageAck(this.handleMessageAck.bind(this));

    this.initialized = true;
    logger.info('MessageHandler initialized');
  }

  /**
   * Handle incoming WhatsApp message
   */
  async handleIncomingMessage({ accountId, message }) {
    try {
      logger.info(`Processing incoming message for account ${accountId}`);

      // Lazy load messageService to avoid circular dependency at module level
      const messageService = await import('../services/messageService.js');
      await messageService.default.handleIncomingMessage(accountId, message);

      logger.debug(`Successfully processed incoming message for account ${accountId}`);
    } catch (error) {
      logger.error(`Error handling incoming message for account ${accountId}:`, error);
    }
  }

  /**
   * Handle message acknowledgment
   */
  async handleMessageAck({ accountId, messageId, ack }) {
    try {
      logger.debug(`Processing message ack for account ${accountId}, message ${messageId}`);

      // Lazy load messageService
      const messageService = await import('../services/messageService.js');
      await messageService.default.updateMessageStatus(messageId, ack);

      logger.debug(`Successfully processed message ack for account ${accountId}`);
    } catch (error) {
      logger.error(`Error handling message ack for account ${accountId}:`, error);
    }
  }
}

// Export singleton instance
const messageHandler = new MessageHandler();
export default messageHandler;

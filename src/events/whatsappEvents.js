/**
 * WhatsApp Event Emitter
 * Breaks circular dependency between whatsappService and messageService
 */

import { EventEmitter } from 'events';
import logger from '../utils/logger.js';

class WhatsAppEventEmitter extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Increase for multiple WhatsApp accounts
  }

  /**
   * Emit incoming message event
   */
  emitIncomingMessage(accountId, message) {
    logger.debug(`Emitting incoming message event for account ${accountId}`);
    this.emit('message:incoming', { accountId, message });
  }

  /**
   * Emit message acknowledgment event
   */
  emitMessageAck(accountId, messageId, ack) {
    logger.debug(`Emitting message ack event for account ${accountId}`);
    this.emit('message:ack', { accountId, messageId, ack });
  }

  /**
   * Emit connection status change
   */
  emitConnectionStatus(accountId, status) {
    logger.debug(`Emitting connection status for account ${accountId}: ${status}`);
    this.emit('connection:status', { accountId, status });
  }

  /**
   * Register incoming message handler
   */
  onIncomingMessage(handler) {
    this.on('message:incoming', handler);
  }

  /**
   * Register message ack handler
   */
  onMessageAck(handler) {
    this.on('message:ack', handler);
  }

  /**
   * Register connection status handler
   */
  onConnectionStatus(handler) {
    this.on('connection:status', handler);
  }
}

// Export singleton instance
const whatsappEvents = new WhatsAppEventEmitter();
export default whatsappEvents;

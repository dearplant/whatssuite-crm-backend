/**
 * WhatsApp Account Model Wrapper
 * Provides a class-based interface for WhatsApp account operations
 */

import whatsappAccountModel from './whatsappAccount.js';

class WhatsAppAccountWrapper {
  async findById(id) {
    return whatsappAccountModel.findById(id);
  }

  async incrementMessagesSent(id) {
    return whatsappAccountModel.incrementMessagesSent(id);
  }

  async incrementMessagesReceived(id) {
    return whatsappAccountModel.incrementMessagesReceived(id);
  }

  async updateConnectionStatus(id, status, additionalData = {}) {
    return whatsappAccountModel.updateStatus(id, status, additionalData);
  }

  async update(id, data) {
    return whatsappAccountModel.update(id, data);
  }
}

export default new WhatsAppAccountWrapper();

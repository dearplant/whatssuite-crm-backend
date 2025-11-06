/**
 * WhatsApp Account Model Wrapper
 * Provides a class-based interface for WhatsApp account operations
 */

import whatsappAccountModel from './whatsappAccount.js';

class WhatsAppAccountWrapper {
  async findById(id) {
    return whatsappAccountModel.findWhatsAppAccountById(id);
  }

  async incrementMessagesSent(id) {
    return whatsappAccountModel.incrementMessageCounter(id, 'Outbound');
  }

  async incrementMessagesReceived(id) {
    return whatsappAccountModel.incrementMessageCounter(id, 'Inbound');
  }

  async updateConnectionStatus(id, status, additionalData = {}) {
    return whatsappAccountModel.updateConnectionStatus(id, status, additionalData);
  }

  async update(id, data) {
    return whatsappAccountModel.updateWhatsAppAccount(id, data);
  }
}

export default new WhatsAppAccountWrapper();

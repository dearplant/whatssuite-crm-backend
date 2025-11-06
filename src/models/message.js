import prisma from '../config/database.js';

/**
 * Message Model - Maps between camelCase API and snake_case database
 */
class MessageModel {
  /**
   * Map database fields to camelCase
   */
  mapToModel(dbMessage) {
    if (!dbMessage) return null;
    return {
      id: dbMessage.id,
      conversationId: dbMessage.conversation_id,
      whatsappMessageId: dbMessage.whatsapp_message_id,
      senderType: dbMessage.senderType,
      senderId: dbMessage.sender_id,
      contactId: dbMessage.contact_id,
      accountId: dbMessage.account_id,
      content: dbMessage.content,
      messageType: dbMessage.messageType,
      mediaUrl: dbMessage.media_url,
      mediaFilename: dbMessage.media_filename,
      mediaSize: dbMessage.media_size,
      templateName: dbMessage.template_name,
      templateVariables: dbMessage.template_variables,
      status: dbMessage.status,
      errorMessage: dbMessage.error_message,
      sentAt: dbMessage.sent_at,
      deliveredAt: dbMessage.delivered_at,
      readAt: dbMessage.read_at,
      createdAt: dbMessage.created_at,
    };
  }

  /**
   * Create a new message
   */
  async create(data) {
    const dbMessage = await prisma.messages.create({
      data: {
        id: data.id,
        conversation_id: data.conversationId || data.conversation_id,
        whatsapp_message_id: data.whatsappMessageId || data.whatsapp_message_id,
        senderType: data.senderType,
        sender_id: data.senderId || data.sender_id,
        contact_id: data.contactId || data.contact_id,
        account_id: data.accountId || data.account_id,
        content: data.content,
        messageType: data.messageType,
        media_url: data.mediaUrl || data.media_url,
        media_filename: data.mediaFilename || data.media_filename,
        media_size: data.mediaSize || data.media_size,
        template_name: data.templateName || data.template_name,
        template_variables: data.templateVariables || data.template_variables,
        status: data.status || 'pending',
        error_message: data.errorMessage || data.error_message,
        sent_at: data.sentAt || data.sent_at,
        delivered_at: data.deliveredAt || data.delivered_at,
        read_at: data.readAt || data.read_at,
        created_at: data.createdAt || data.created_at || new Date(),
      },
    });
    return this.mapToModel(dbMessage);
  }

  /**
   * Find message by ID
   */
  async findById(id) {
    const dbMessage = await prisma.messages.findUnique({
      where: { id },
    });
    return this.mapToModel(dbMessage);
  }

  /**
   * Find messages by conversation ID
   */
  async findByConversationId(conversationId, options = {}) {
    const { skip = 0, take = 50 } = options;

    const dbMessages = await prisma.messages.findMany({
      where: { conversation_id: conversationId },
      skip,
      take,
      orderBy: { created_at: 'desc' },
    });
    return dbMessages.map((m) => this.mapToModel(m));
  }

  /**
   * Update message
   */
  async update(id, data) {
    const updateData = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;
    if (data.error_message !== undefined) updateData.error_message = data.error_message;
    if (data.sentAt !== undefined) updateData.sent_at = data.sentAt;
    if (data.sent_at !== undefined) updateData.sent_at = data.sent_at;
    if (data.deliveredAt !== undefined) updateData.delivered_at = data.deliveredAt;
    if (data.delivered_at !== undefined) updateData.delivered_at = data.delivered_at;
    if (data.readAt !== undefined) updateData.read_at = data.readAt;
    if (data.read_at !== undefined) updateData.read_at = data.read_at;
    if (data.whatsappMessageId !== undefined)
      updateData.whatsapp_message_id = data.whatsappMessageId;
    if (data.whatsapp_message_id !== undefined)
      updateData.whatsapp_message_id = data.whatsapp_message_id;

    const dbMessage = await prisma.messages.update({
      where: { id },
      data: updateData,
    });
    return this.mapToModel(dbMessage);
  }

  /**
   * Delete message
   */
  async delete(id) {
    await prisma.messages.delete({
      where: { id },
    });
  }

  /**
   * Count messages by account ID
   */
  async countByAccountId(accountId) {
    return await prisma.messages.count({
      where: { account_id: accountId },
    });
  }
}

export default new MessageModel();

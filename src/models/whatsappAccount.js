import prisma from '../config/database.js';

/**
 * WhatsApp Account Model - Maps between camelCase API and snake_case database
 */
class WhatsAppAccountModel {
  /**
   * Map database fields to camelCase
   */
  mapToModel(dbAccount) {
    if (!dbAccount) return null;
    return {
      id: dbAccount.id,
      teamId: dbAccount.team_id,
      userId: dbAccount.user_id,
      name: dbAccount.name,
      phone: dbAccount.phone,
      type: dbAccount.type,
      status: dbAccount.status,
      healthScore: dbAccount.health_score,
      credentialsEncrypted: dbAccount.credentials_encrypted,
      webhookUrl: dbAccount.webhook_url,
      webhookSecret: dbAccount.webhook_secret,
      lastConnectedAt: dbAccount.last_connected_at,
      lastHealthCheckAt: dbAccount.last_health_check_at,
      dailyMessageLimit: dbAccount.daily_message_limit,
      messagesSentToday: dbAccount.messages_sent_today,
      isActive: dbAccount.is_active,
      createdAt: dbAccount.created_at,
      updatedAt: dbAccount.updated_at,
      deletedAt: dbAccount.deleted_at,
    };
  }

  /**
   * Find WhatsApp account by ID
   */
  async findById(id) {
    const dbAccount = await prisma.whatsapp_accounts.findUnique({
      where: { id },
    });
    return this.mapToModel(dbAccount);
  }

  /**
   * Find WhatsApp account by phone number
   */
  async findByPhone(phone) {
    const dbAccount = await prisma.whatsapp_accounts.findFirst({
      where: { phone },
    });
    return this.mapToModel(dbAccount);
  }

  /**
   * Find all WhatsApp accounts for a user
   */
  async findByUserId(userId) {
    const dbAccounts = await prisma.whatsapp_accounts.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return dbAccounts.map((acc) => this.mapToModel(acc));
  }

  /**
   * Find all WhatsApp accounts for a team
   */
  async findByTeamId(teamId) {
    const dbAccounts = await prisma.whatsapp_accounts.findMany({
      where: { team_id: teamId },
      orderBy: { created_at: 'desc' },
    });
    return dbAccounts.map((acc) => this.mapToModel(acc));
  }

  /**
   * Create a new WhatsApp account
   */
  async create(data) {
    const dbAccount = await prisma.whatsapp_accounts.create({
      data: {
        id: data.id,
        team_id: data.teamId || data.team_id,
        user_id: data.userId || data.user_id,
        name: data.name,
        phone: data.phone,
        type: data.type || 'business',
        status: data.status || 'disconnected',
        health_score: data.healthScore || data.health_score || 100,
        credentials_encrypted: data.credentialsEncrypted || data.credentials_encrypted,
        webhook_url: data.webhookUrl || data.webhook_url,
        webhook_secret: data.webhookSecret || data.webhook_secret,
        daily_message_limit: data.dailyMessageLimit || data.daily_message_limit || 1000,
        messages_sent_today: data.messagesSentToday || data.messages_sent_today || 0,
        is_active: data.isActive !== undefined ? data.isActive : true,
        created_at: data.createdAt || data.created_at || new Date(),
        updated_at: data.updatedAt || data.updated_at || new Date(),
      },
    });
    return this.mapToModel(dbAccount);
  }

  /**
   * Update WhatsApp account
   */
  async update(id, data) {
    const updateData = { updated_at: new Date() };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.healthScore !== undefined) updateData.health_score = data.healthScore;
    if (data.health_score !== undefined) updateData.health_score = data.health_score;
    if (data.credentialsEncrypted !== undefined)
      updateData.credentials_encrypted = data.credentialsEncrypted;
    if (data.credentials_encrypted !== undefined)
      updateData.credentials_encrypted = data.credentials_encrypted;
    if (data.webhookUrl !== undefined) updateData.webhook_url = data.webhookUrl;
    if (data.webhook_url !== undefined) updateData.webhook_url = data.webhook_url;
    if (data.webhookSecret !== undefined) updateData.webhook_secret = data.webhookSecret;
    if (data.webhook_secret !== undefined) updateData.webhook_secret = data.webhook_secret;
    if (data.lastConnectedAt !== undefined) updateData.last_connected_at = data.lastConnectedAt;
    if (data.last_connected_at !== undefined) updateData.last_connected_at = data.last_connected_at;
    if (data.lastHealthCheckAt !== undefined)
      updateData.last_health_check_at = data.lastHealthCheckAt;
    if (data.last_health_check_at !== undefined)
      updateData.last_health_check_at = data.last_health_check_at;
    if (data.dailyMessageLimit !== undefined)
      updateData.daily_message_limit = data.dailyMessageLimit;
    if (data.daily_message_limit !== undefined)
      updateData.daily_message_limit = data.daily_message_limit;
    if (data.messagesSentToday !== undefined)
      updateData.messages_sent_today = data.messagesSentToday;
    if (data.messages_sent_today !== undefined)
      updateData.messages_sent_today = data.messages_sent_today;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;

    const dbAccount = await prisma.whatsapp_accounts.update({
      where: { id },
      data: updateData,
    });
    return this.mapToModel(dbAccount);
  }

  /**
   * Delete WhatsApp account (soft delete)
   */
  async delete(id) {
    const dbAccount = await prisma.whatsapp_accounts.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    return this.mapToModel(dbAccount);
  }

  /**
   * Get connected accounts
   */
  async getConnectedAccounts() {
    const dbAccounts = await prisma.whatsapp_accounts.findMany({
      where: {
        status: 'connected',
        is_active: true,
      },
    });
    return dbAccounts.map((acc) => this.mapToModel(acc));
  }
}

export default new WhatsAppAccountModel();

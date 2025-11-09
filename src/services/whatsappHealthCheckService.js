/**
 * WhatsApp Session Health Check Service
 * Periodically validates WhatsApp sessions and triggers reconnection for failed sessions
 * Tracks session uptime metrics and sends notifications for prolonged outages
 */

import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import emailService from './emailService.js';
import whatsappService from './whatsappService.js';

class WhatsAppHealthCheckService {
  constructor() {
    this.OFFLINE_NOTIFICATION_THRESHOLD = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    this.notificationsSent = new Map(); // Track notifications to avoid spam
  }

  /**
   * Perform health check on all WhatsApp sessions
   */
  async performHealthCheck() {
    try {
      logger.info('Starting WhatsApp session health check...');

      // Get all active WhatsApp accounts
      const accounts = await prisma.whatsapp_accounts.findMany({
        where: {
          is_active: true,
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
            },
          },
        },
      });

      logger.info(`Found ${accounts.length} active WhatsApp accounts to check`);

      const results = {
        total: accounts.length,
        healthy: 0,
        warning: 0,
        critical: 0,
        reconnected: 0,
        notified: 0,
      };

      for (const account of accounts) {
        try {
          const healthStatus = await this.checkAccountHealth(account);

          // Update statistics
          if (healthStatus.status === 'Healthy') {
            results.healthy++;
          } else if (healthStatus.status === 'Warning') {
            results.warning++;
          } else if (healthStatus.status === 'Critical') {
            results.critical++;
          }

          if (healthStatus.reconnected) {
            results.reconnected++;
          }

          if (healthStatus.notified) {
            results.notified++;
          }
        } catch (error) {
          logger.error(`Error checking health for account ${account.id}:`, error);
        }
      }

      logger.info('WhatsApp session health check completed', results);
      return results;
    } catch (error) {
      logger.error('Error performing WhatsApp health check:', error);
      throw error;
    }
  }

  /**
   * Check health of a single WhatsApp account
   */
  async checkAccountHealth(account) {
    const result = {
      accountId: account.id,
      status: account.health_score >= 80 ? 'Healthy' : account.health_score >= 40 ? 'Warning' : 'Critical',
      reconnected: false,
      notified: false,
    };

    try {
      // Check if client is active
      const isClientActive = whatsappService.isAccountConnected(account.id);
      const currentStatus = account.status;
      const now = new Date();

      // Determine health status
      let newHealthStatus = account.health_score >= 80 ? 'Healthy' : account.health_score >= 40 ? 'Warning' : 'Critical';
      let newConnectionStatus = currentStatus;

      if (isClientActive) {
        // Client is active and connected
        newHealthStatus = 'Healthy';
        newConnectionStatus = 'connected';

        // Clear notification tracking if account is back online
        if (this.notificationsSent.has(account.id)) {
          this.notificationsSent.delete(account.id);
          logger.info(`Account ${account.id} is back online, cleared notification tracking`);
        }

        // Update uptime metrics
        await this.updateUptimeMetrics(account.id, true);
      } else {
        // Client is not active
        if (currentStatus === 'connected') {
          // Mark as disconnected if it was previously connected
          newConnectionStatus = 'disconnected';
          newHealthStatus = 'Warning';
          logger.warn(`Account ${account.id} appears disconnected, marking as Warning`);
        } else if (currentStatus === 'disconnected' || currentStatus === 'failed') {
          // Check how long it's been offline
          const lastDisconnectedAt = account.last_connected_at || account.updated_at;
          const offlineDuration = now - new Date(lastDisconnectedAt);

          if (offlineDuration > this.OFFLINE_NOTIFICATION_THRESHOLD) {
            newHealthStatus = 'Critical';

            // Send notification if not already sent
            if (!this.notificationsSent.has(account.id)) {
              await this.sendOfflineNotification(account, offlineDuration);
              this.notificationsSent.set(account.id, now);
              result.notified = true;
            }
          } else {
            newHealthStatus = 'Warning';
          }

          // Attempt reconnection for failed or disconnected sessions
          if (currentStatus === 'failed' || currentStatus === 'disconnected') {
            logger.info(`Attempting to reconnect account ${account.id}`);
            await this.attemptReconnection(account);
            result.reconnected = true;
          }
        }

        // Update uptime metrics
        await this.updateUptimeMetrics(account.id, false);
      }

      // Update database if status changed
      const oldHealthStatus = account.health_score >= 80 ? 'Healthy' : account.health_score >= 40 ? 'Warning' : 'Critical';
      if (newHealthStatus !== oldHealthStatus || newConnectionStatus !== currentStatus) {
        await prisma.whatsapp_accounts.update({
          where: { id: account.id },
          data: {
            status: newConnectionStatus,
            health_score: newHealthStatus === 'Healthy' ? 100 : newHealthStatus === 'Warning' ? 50 : 0,
            updated_at: now,
          },
        });

        logger.info(`Updated account ${account.id} status`, {
          oldHealth: oldHealthStatus,
          newHealth: newHealthStatus,
          oldConnection: currentStatus,
          newConnection: newConnectionStatus,
        });
      }

      result.status = newHealthStatus;
      return result;
    } catch (error) {
      logger.error(`Error checking health for account ${account.id}:`, error);
      throw error;
    }
  }

  /**
   * Attempt to reconnect a WhatsApp account
   */
  async attemptReconnection(account) {
    try {
      logger.info(`Attempting reconnection for account ${account.id}`);

      // Check if client already exists
      const existingClient = whatsappService.getActiveClient(account.id);

      if (existingClient) {
        // Try to reinitialize existing client
        try {
          await existingClient.initialize();
          logger.info(`Successfully reinitialized client for account ${account.id}`);
          return true;
        } catch (error) {
          logger.warn(`Failed to reinitialize existing client for account ${account.id}:`, error);
          // Continue to create new client
        }
      }

      // Create new connection
      // Note: This will generate a new QR code that the user needs to scan
      await prisma.whatsapp_accounts.update({
        where: { id: account.id },
        data: {
          status: 'connecting',
          health_score: 50,
        },
      });

      // Initialize new client (this will trigger QR code generation)
      const client = await whatsappService.getActiveClient(account.id);
      if (!client) {
        // Client doesn't exist, need to initialize
        logger.info(
          `No active client found for account ${account.id}, user needs to reconnect manually`
        );
        return false;
      }

      logger.info(`Reconnection initiated for account ${account.id}`);
      return true;
    } catch (error) {
      logger.error(`Error attempting reconnection for account ${account.id}:`, error);
      return false;
    }
  }

  /**
   * Send offline notification to admin
   */
  async sendOfflineNotification(account, offlineDuration) {
    try {
      const offlineHours = Math.floor(offlineDuration / (60 * 60 * 1000));
      const offlineMinutes = Math.floor((offlineDuration % (60 * 60 * 1000)) / (60 * 1000));

      logger.info(
        `Sending offline notification for account ${account.id} (offline for ${offlineHours}h ${offlineMinutes}m)`
      );

      // Get admin users for this account
      const adminEmail = account.users.email;
      const adminName = account.users.first_name;

      // Send email notification
      await emailService.sendEmail({
        to: adminEmail,
        subject: `WhatsApp Account Offline Alert - ${account.name || account.phone}`,
        template: 'whatsapp-offline-alert',
        templateData: {
          firstName: adminName,
          accountName: account.name || account.phone,
          phoneNumber: account.phone,
          offlineHours,
          offlineMinutes,
          lastConnectedAt: account.last_connected_at,
          accountId: account.id,
        },
        priority: 'high',
      });

      logger.info(`Offline notification sent to ${adminEmail} for account ${account.id}`);
    } catch (error) {
      // Don't throw error if email fails, just log it
      logger.error(`Failed to send offline notification for account ${account.id}:`, error);
    }
  }

  /**
   * Update uptime metrics for an account
   */
  async updateUptimeMetrics(accountId, isOnline) {
    try {
      // This could be expanded to track detailed uptime statistics
      // For now, we just update the last connected/disconnected timestamps
      const updateData = {};

      if (isOnline) {
        updateData.last_connected_at = new Date();
      } else {
        // Only update last_connected_at if it's not already set recently
        const account = await prisma.whatsapp_accounts.findUnique({
          where: { id: accountId },
          select: { last_connected_at: true },
        });

        if (
          !account.last_connected_at ||
          new Date() - new Date(account.last_connected_at) > 60000
        ) {
          // More than 1 minute - we'll just update it
          updateData.last_connected_at = new Date();
        }
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.whatsapp_accounts.update({
          where: { id: accountId },
          data: updateData,
        });
      }
    } catch (error) {
      logger.error(`Error updating uptime metrics for account ${accountId}:`, error);
    }
  }

  /**
   * Get health check statistics
   */
  async getHealthCheckStats() {
    try {
      const stats = await prisma.whatsapp_accounts.groupBy({
        by: ['status', 'health_score'],
        where: {
          is_active: true,
        },
        _count: true,
      });

      return stats;
    } catch (error) {
      logger.error('Error getting health check stats:', error);
      throw error;
    }
  }

  /**
   * Clear notification tracking (useful for testing)
   */
  clearNotificationTracking() {
    this.notificationsSent.clear();
    logger.info('Cleared notification tracking');
  }
}

// Export singleton instance
const whatsappHealthCheckService = new WhatsAppHealthCheckService();
export default whatsappHealthCheckService;

import prisma from '../../config/database.js';
import logger from '../../utils/logger.js';
import { addJob } from '../../queues/index.js';
import crypto from 'crypto';

/**
 * Order Automation Service
 * Handles automatic order notifications and contact linking
 */
class OrderAutomationService {
  /**
   * Process order and trigger automations
   * @param {Object} order - Order object
   * @returns {Promise<void>}
   */
  async processOrder(order) {
    try {
      // Link order to contact
      await this.linkOrderToContact(order);

      // Check if automatic notifications are enabled
      const integration = await prisma.ecommerce_integrations.findUnique({
        where: { id: order.integration_id },
      });

      if (!integration || !integration.is_active) {
        logger.info('Integration not active, skipping automation', {
          orderId: order.id,
        });
        return;
      }

      // Check notification settings
      const notificationSettings = integration.metadata?.notifications || {};
      const shouldNotify = notificationSettings.enabled !== false;

      if (shouldNotify) {
        await this.sendOrderNotification(order);
      }

      // Trigger flow events
      await this.triggerFlowEvents(order);

      logger.info('Order automation processed', {
        orderId: order.id,
        externalOrderId: order.external_order_id,
      });
    } catch (error) {
      logger.error('Error processing order automation', {
        error: error.message,
        orderId: order.id,
      });
      throw error;
    }
  }

  /**
   * Link order to existing contact or create new one
   * @param {Object} order - Order object
   * @returns {Promise<string|null>} Contact ID
   */
  async linkOrderToContact(order) {
    try {
      // Skip if already linked
      if (order.contact_id) {
        return order.contact_id;
      }

      // Try to find existing contact by email or phone
      let contact = null;
      if (order.customer_email || order.customer_phone) {
        contact = await prisma.contacts.findFirst({
          where: {
            team_id: order.team_id,
            OR: [
              order.customer_email ? { email: order.customer_email } : null,
              order.customer_phone ? { phone: order.customer_phone } : null,
            ].filter(Boolean),
          },
        });
      }

      // Create contact if not found
      if (!contact && (order.customer_email || order.customer_phone)) {
        const [firstName, ...lastNameParts] = (order.customer_name || '').split(' ');
        contact = await prisma.contacts.create({
          data: {
            id: crypto.randomUUID(),
            team_id: order.team_id,
            email: order.customer_email,
            phone: order.customer_phone,
            first_name: firstName || null,
            last_name: lastNameParts.join(' ') || null,
            source: 'ecommerce',
            custom_fields: {
              last_order_id: order.id,
              last_order_date: order.created_at,
              total_order_value: order.total_amount,
            },
            updated_at: new Date(),
          },
        });

        logger.info('Created contact from order', {
          contactId: contact.id,
          orderId: order.id,
        });
      }

      // Link order to contact
      if (contact) {
        await prisma.ecommerce_orders.update({
          where: { id: order.id },
          data: { contact_id: contact.id },
        });

        logger.info('Linked order to contact', {
          orderId: order.id,
          contactId: contact.id,
        });

        return contact.id;
      }

      return null;
    } catch (error) {
      logger.error('Error linking order to contact', {
        error: error.message,
        orderId: order.id,
      });
      throw error;
    }
  }

  /**
   * Send order notification
   * @param {Object} order - Order object
   * @returns {Promise<void>}
   */
  async sendOrderNotification(order) {
    try {
      // Get WhatsApp account
      const whatsappAccount = await prisma.whatsapp_accounts.findFirst({
        where: {
          team_id: order.team_id,
          is_active: true,
          status: 'connected',
        },
      });

      if (!whatsappAccount) {
        logger.warn('No active WhatsApp account found', {
          teamId: order.team_id,
        });
        return;
      }

      // Get phone number
      const phoneNumber = order.customer_phone;
      if (!phoneNumber) {
        logger.warn('No phone number for order', { orderId: order.id });
        return;
      }

      // Generate notification message based on order status
      const message = this.generateOrderNotification(order);

      // Queue message
      await addJob('sendMessage', {
        accountId: whatsappAccount.id,
        to: phoneNumber,
        message,
        metadata: {
          type: 'order_notification',
          orderId: order.id,
          externalOrderId: order.external_order_id,
          orderStatus: order.status,
        },
      });

      logger.info('Order notification queued', {
        orderId: order.id,
        phoneNumber,
      });
    } catch (error) {
      logger.error('Error sending order notification', {
        error: error.message,
        orderId: order.id,
      });
      throw error;
    }
  }

  /**
   * Generate order notification message
   * @param {Object} order - Order object
   * @returns {string} Notification message
   */
  generateOrderNotification(order) {
    const status = order.status.toLowerCase();
    const customerName = order.customer_name || 'there';
    const orderNumber = order.order_number;
    const amount = `${order.currency} ${order.total_amount}`;

    const templates = {
      pending: `Hi ${customerName}! 🛍️\n\nThank you for your order #${orderNumber}!\n\nTotal: ${amount}\n\nWe're processing your order and will update you soon.`,
      processing: `Hi ${customerName}! ⚙️\n\nYour order #${orderNumber} is being processed!\n\nTotal: ${amount}\n\nWe'll notify you once it's ready to ship.`,
      completed: `Hi ${customerName}! ✅\n\nGreat news! Your order #${orderNumber} is complete!\n\nTotal: ${amount}\n\nThank you for your purchase!`,
      cancelled: `Hi ${customerName}! ❌\n\nYour order #${orderNumber} has been cancelled.\n\nIf you have any questions, please reply to this message.`,
      refunded: `Hi ${customerName}! 💰\n\nYour refund for order #${orderNumber} has been processed.\n\nAmount: ${amount}\n\nPlease allow 5-10 business days for the refund to appear.`,
      failed: `Hi ${customerName}! ⚠️\n\nThere was an issue with your order #${orderNumber}.\n\nPlease contact us for assistance.`,
    };

    return templates[status] || templates.pending;
  }

  /**
   * Trigger flow events for order
   * @param {Object} order - Order object
   * @returns {Promise<void>}
   */
  async triggerFlowEvents(order) {
    try {
      // Find active flows with order triggers
      const flows = await prisma.flows.findMany({
        where: {
          team_id: order.team_id,
          is_active: true,
          triggerType: 'ecommerce_order',
        },
      });

      for (const flow of flows) {
        const triggerConfig = flow.trigger_config || {};

        // Check if flow should trigger for this order status
        const triggerStatuses = triggerConfig.statuses || [];
        if (triggerStatuses.length > 0 && !triggerStatuses.includes(order.status)) {
          continue;
        }

        // Check minimum order value
        if (triggerConfig.min_order_value && order.total_amount < triggerConfig.min_order_value) {
          continue;
        }

        // Trigger flow
        await addJob('flow', {
          flowId: flow.id,
          contactId: order.contact_id,
          trigger: {
            type: 'ecommerce_order',
            orderId: order.id,
            orderStatus: order.status,
            orderValue: order.total_amount,
          },
        });

        logger.info('Flow triggered for order', {
          flowId: flow.id,
          orderId: order.id,
        });
      }
    } catch (error) {
      logger.error('Error triggering flow events', {
        error: error.message,
        orderId: order.id,
      });
      // Don't throw - flow triggers are not critical
    }
  }

  /**
   * Update order status and trigger notifications
   * @param {string} orderId - Order ID
   * @param {string} newStatus - New order status
   * @returns {Promise<Object>} Updated order
   */
  async updateOrderStatus(orderId, newStatus) {
    try {
      const order = await prisma.ecommerce_orders.update({
        where: { id: orderId },
        data: { status: newStatus },
      });

      // Process automation for status change
      await this.processOrder(order);

      return order;
    } catch (error) {
      logger.error('Error updating order status', {
        error: error.message,
        orderId,
      });
      throw error;
    }
  }
}

export default new OrderAutomationService();

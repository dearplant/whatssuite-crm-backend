import prisma from '../../config/database.js';
import logger from '../../utils/logger.js';
import { addJob } from '../../queues/index.js';

/**
 * Abandoned Cart Recovery Service
 * Handles abandoned cart tracking, recovery, and notifications
 */
class AbandonedCartService {
  /**
   * Create or update an abandoned cart
   * @param {Object} cartData - Cart data from e-commerce platform
   * @returns {Promise<Object>} Created/updated cart
   */
  async createOrUpdateCart(cartData) {
    const {
      integrationId,
      teamId,
      externalCartId,
      customerEmail,
      customerPhone,
      customerName,
      cartUrl,
      totalAmount,
      currency = 'USD',
      items,
      abandonedAt,
      metadata,
    } = cartData;

    try {
      // Check if cart already exists
      const existingCart = await prisma.abandoned_carts.findUnique({
        where: {
          integration_id_external_cart_id: {
            integration_id: integrationId,
            external_cart_id: externalCartId,
          },
        },
      });

      // Calculate expiration (7 days from abandonment)
      const expiresAt = new Date(abandonedAt);
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Try to find contact by email or phone
      let contactId = null;
      if (customerEmail || customerPhone) {
        const contact = await prisma.contacts.findFirst({
          where: {
            team_id: teamId,
            OR: [
              customerEmail ? { email: customerEmail } : null,
              customerPhone ? { phone: customerPhone } : null,
            ].filter(Boolean),
          },
        });
        contactId = contact?.id || null;
      }

      const cartPayload = {
        integration_id: integrationId,
        team_id: teamId,
        contact_id: contactId,
        external_cart_id: externalCartId,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        customer_name: customerName,
        cart_url: cartUrl,
        total_amount: totalAmount,
        currency,
        items,
        status: 'Abandoned',
        abandoned_at: abandonedAt,
        expires_at: expiresAt,
        metadata,
      };

      let cart;
      if (existingCart) {
        // Update existing cart
        cart = await prisma.abandoned_carts.update({
          where: { id: existingCart.id },
          data: cartPayload,
        });
        logger.info('Updated abandoned cart', { cartId: cart.id, externalCartId });
      } else {
        // Create new cart
        cart = await prisma.abandoned_carts.create({
          data: cartPayload,
        });
        logger.info('Created abandoned cart', { cartId: cart.id, externalCartId });

        // Schedule recovery message (24 hours delay)
        await this.scheduleRecoveryMessage(cart.id);
      }

      return cart;
    } catch (error) {
      logger.error('Error creating/updating abandoned cart', {
        error: error.message,
        externalCartId,
      });
      throw error;
    }
  }

  /**
   * Schedule a recovery message for an abandoned cart
   * @param {string} cartId - Cart ID
   * @param {number} delayHours - Delay in hours (default: 24)
   * @returns {Promise<void>}
   */
  async scheduleRecoveryMessage(cartId, delayHours = 24) {
    try {
      const delayMs = delayHours * 60 * 60 * 1000;

      await addJob(
        'abandonedCartRecovery',
        {
          cartId,
        },
        {
          delay: delayMs,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 60000, // 1 minute
          },
        }
      );

      logger.info('Scheduled abandoned cart recovery', {
        cartId,
        delayHours,
      });
    } catch (error) {
      logger.error('Error scheduling cart recovery', {
        error: error.message,
        cartId,
      });
      throw error;
    }
  }

  /**
   * Send recovery message for an abandoned cart
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Result
   */
  async sendRecoveryMessage(cartId) {
    try {
      const cart = await prisma.abandoned_carts.findUnique({
        where: { id: cartId },
        include: {
          integration: true,
          contacts: true,
        },
      });

      if (!cart) {
        throw new Error(`Cart not found: ${cartId}`);
      }

      // Check if cart is still abandoned and not expired
      if (cart.status !== 'Abandoned') {
        logger.info('Cart is no longer abandoned, skipping recovery', {
          cartId,
          status: cart.status,
        });
        return { skipped: true, reason: 'Cart status changed' };
      }

      if (new Date() > new Date(cart.expires_at)) {
        // Mark as expired
        await prisma.abandoned_carts.update({
          where: { id: cartId },
          data: { status: 'Expired' },
        });
        logger.info('Cart expired, skipping recovery', { cartId });
        return { skipped: true, reason: 'Cart expired' };
      }

      // Check if recovery was already sent
      if (cart.recovery_sent_at) {
        logger.info('Recovery already sent for cart', { cartId });
        return { skipped: true, reason: 'Recovery already sent' };
      }

      // Get WhatsApp account for the team
      const whatsappAccount = await prisma.whatsapp_accounts.findFirst({
        where: {
          team_id: cart.team_id,
          is_active: true,
          status: 'connected',
        },
      });

      if (!whatsappAccount) {
        logger.warn('No active WhatsApp account found for team', {
          teamId: cart.team_id,
        });
        return { skipped: true, reason: 'No active WhatsApp account' };
      }

      // Prepare recovery message
      const message = this.generateRecoveryMessage(cart);

      // Send message via WhatsApp
      const phoneNumber = cart.customer_phone || cart.contacts?.phone;
      if (!phoneNumber) {
        logger.warn('No phone number available for cart recovery', { cartId });
        return { skipped: true, reason: 'No phone number' };
      }

      // Queue message for sending
      await addJob('sendMessage', {
        accountId: whatsappAccount.id,
        to: phoneNumber,
        message,
        metadata: {
          type: 'abandoned_cart_recovery',
          cartId: cart.id,
          externalCartId: cart.external_cart_id,
        },
      });

      // Update cart with recovery sent timestamp
      await prisma.abandoned_carts.update({
        where: { id: cartId },
        data: { recovery_sent_at: new Date() },
      });

      logger.info('Sent abandoned cart recovery message', {
        cartId,
        phoneNumber,
      });

      return {
        success: true,
        cartId,
        phoneNumber,
      };
    } catch (error) {
      logger.error('Error sending cart recovery message', {
        error: error.message,
        cartId,
      });
      throw error;
    }
  }

  /**
   * Generate recovery message text
   * @param {Object} cart - Cart object
   * @returns {string} Message text
   */
  generateRecoveryMessage(cart) {
    const itemCount = Array.isArray(cart.items) ? cart.items.length : 0;
    const itemText = itemCount === 1 ? 'item' : 'items';

    return `Hi ${cart.customer_name || 'there'}! 👋

We noticed you left ${itemCount} ${itemText} in your cart worth ${cart.currency} ${cart.total_amount}.

Complete your purchase now and get it delivered to you:
${cart.cart_url}

Need help? Just reply to this message!`;
  }

  /**
   * Mark cart as recovered
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Updated cart
   */
  async markAsRecovered(cartId) {
    try {
      const cart = await prisma.abandoned_carts.update({
        where: { id: cartId },
        data: {
          status: 'Recovered',
          recovered_at: new Date(),
        },
      });

      logger.info('Marked cart as recovered', { cartId });
      return cart;
    } catch (error) {
      logger.error('Error marking cart as recovered', {
        error: error.message,
        cartId,
      });
      throw error;
    }
  }

  /**
   * Mark cart as completed
   * @param {string} cartId - Cart ID
   * @returns {Promise<Object>} Updated cart
   */
  async markAsCompleted(cartId) {
    try {
      const cart = await prisma.abandoned_carts.update({
        where: { id: cartId },
        data: {
          status: 'Completed',
        },
      });

      logger.info('Marked cart as completed', { cartId });
      return cart;
    } catch (error) {
      logger.error('Error marking cart as completed', {
        error: error.message,
        cartId,
      });
      throw error;
    }
  }

  /**
   * Get abandoned carts with filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Carts and pagination
   */
  async getAbandonedCarts(filters = {}) {
    const {
      teamId,
      integrationId,
      status,
      page = 1,
      limit = 20,
      sortBy = 'abandoned_at',
      sortOrder = 'desc',
    } = filters;

    try {
      const where = {};

      if (teamId) where.team_id = teamId;
      if (integrationId) where.integration_id = integrationId;
      if (status) where.status = status;

      const [carts, total] = await Promise.all([
        prisma.abandoned_carts.findMany({
          where,
          include: {
            integration: {
              select: {
                id: true,
                provider: true,
                store_name: true,
              },
            },
            contacts: {
              select: {
                id: true,
                first_name: true,
                last_name: true,
                email: true,
                phone: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.abandoned_carts.count({ where }),
      ]);

      return {
        carts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error fetching abandoned carts', {
        error: error.message,
        filters,
      });
      throw error;
    }
  }

  /**
   * Get cart by ID
   * @param {string} cartId - Cart ID
   * @param {string} teamId - Team ID for authorization
   * @returns {Promise<Object>} Cart
   */
  async getCartById(cartId, teamId) {
    try {
      const cart = await prisma.abandoned_carts.findFirst({
        where: {
          id: cartId,
          team_id: teamId,
        },
        include: {
          integration: {
            select: {
              id: true,
              provider: true,
              store_name: true,
              store_url: true,
            },
          },
          contacts: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true,
              phone: true,
            },
          },
        },
      });

      if (!cart) {
        throw new Error('Cart not found');
      }

      return cart;
    } catch (error) {
      logger.error('Error fetching cart by ID', {
        error: error.message,
        cartId,
      });
      throw error;
    }
  }

  /**
   * Get cart statistics
   * @param {string} teamId - Team ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getCartStatistics(teamId, filters = {}) {
    const { startDate, endDate, integrationId } = filters;

    try {
      const where = { team_id: teamId };

      if (integrationId) where.integration_id = integrationId;
      if (startDate || endDate) {
        where.abandoned_at = {};
        if (startDate) where.abandoned_at.gte = new Date(startDate);
        if (endDate) where.abandoned_at.lte = new Date(endDate);
      }

      const [totalCarts, recoveredCarts, completedCarts, expiredCarts, totalValue, recoveredValue] =
        await Promise.all([
          prisma.abandoned_carts.count({ where }),
          prisma.abandoned_carts.count({
            where: { ...where, status: 'Recovered' },
          }),
          prisma.abandoned_carts.count({
            where: { ...where, status: 'Completed' },
          }),
          prisma.abandoned_carts.count({
            where: { ...where, status: 'Expired' },
          }),
          prisma.abandoned_carts.aggregate({
            where,
            _sum: { total_amount: true },
          }),
          prisma.abandoned_carts.aggregate({
            where: { ...where, status: 'Recovered' },
            _sum: { total_amount: true },
          }),
        ]);

      const recoveryRate = totalCarts > 0 ? (recoveredCarts / totalCarts) * 100 : 0;

      return {
        totalCarts,
        recoveredCarts,
        completedCarts,
        expiredCarts,
        abandonedCarts: totalCarts - recoveredCarts - completedCarts - expiredCarts,
        totalValue: totalValue._sum.total_amount || 0,
        recoveredValue: recoveredValue._sum.total_amount || 0,
        recoveryRate: Math.round(recoveryRate * 100) / 100,
      };
    } catch (error) {
      logger.error('Error fetching cart statistics', {
        error: error.message,
        teamId,
      });
      throw error;
    }
  }
}

export default new AbandonedCartService();

import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import paymentGatewayManager from '../services/payments/paymentGatewayManager.js';
import { encrypt } from '../utils/encryption.js';
import crypto from 'crypto';

/**
 * Create payment gateway
 * POST /api/v1/payments/gateways
 */
export async function createPaymentGateway(req, res) {
  try {
    const teamId = req.user.team_id;
    const { provider, credentials } = req.body;

    // Validate credentials
    const isValid = await paymentGatewayManager.validateCredentials(provider, credentials);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment gateway credentials',
      });
    }

    // Encrypt credentials
    const credentialsEncrypted = encrypt(JSON.stringify(credentials));

    // Create gateway
    const gateway = await prisma.payment_gateways.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        provider,
        credentials_encrypted: credentialsEncrypted,
        is_active: true,
      },
    });

    logger.info('Payment gateway created', {
      gatewayId: gateway.id,
      provider,
      teamId,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment gateway created successfully',
      data: {
        id: gateway.id,
        provider: gateway.provider,
        is_active: gateway.is_active,
        created_at: gateway.created_at,
      },
    });
  } catch (error) {
    logger.error('Error creating payment gateway:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment gateway',
    });
  }
}

/**
 * List payment gateways
 * GET /api/v1/payments/gateways
 */
export async function listPaymentGateways(req, res) {
  try {
    const teamId = req.user.team_id;

    const gateways = await prisma.payment_gateways.findMany({
      where: { team_id: teamId },
      select: {
        id: true,
        provider: true,
        is_active: true,
        created_at: true,
        updated_at: true,
      },
    });

    return res.json({
      success: true,
      data: gateways,
    });
  } catch (error) {
    logger.error('Error listing payment gateways:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list payment gateways',
    });
  }
}

/**
 * Get subscription plans
 * GET /api/v1/payments/plans
 */
export async function getSubscriptionPlans(req, res) {
  try {
    const plans = await prisma.subscription_plans.findMany({
      where: { is_active: true },
    });

    return res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    logger.error('Error getting subscription plans:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans',
    });
  }
}

/**
 * Create subscription
 * POST /api/v1/payments/subscriptions
 */
export async function createSubscription(req, res) {
  try {
    const teamId = req.user.team_id;
    const { plan_id, gateway_id } = req.body;

    // Get gateway
    const gateway = await prisma.payment_gateways.findFirst({
      where: {
        id: gateway_id,
        team_id: teamId,
        is_active: true,
      },
    });

    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway not found',
      });
    }

    // Get plan
    const plan = await prisma.subscription_plans.findUnique({
      where: { id: plan_id },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    // Create subscription via payment provider
    const provider = paymentGatewayManager.getProvider(
      gateway.provider,
      gateway.credentials_encrypted
    );

    const subscriptionData = await provider.createSubscription({
      plan_id: plan.id,
      customer_id: teamId, // This should be the external customer ID
    });

    // Create subscription in database
    const subscription = await prisma.subscriptions.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        plan_id: plan.id,
        gateway_id: gateway.id,
        external_subscription_id: subscriptionData.external_id,
        status: subscriptionData.status,
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
      },
    });

    logger.info('Subscription created', {
      subscriptionId: subscription.id,
      planId: plan.id,
      teamId,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
    });
  }
}

/**
 * Get subscriptions
 * GET /api/v1/payments/subscriptions
 */
export async function getSubscriptions(req, res) {
  try {
    const teamId = req.user.team_id;

    const subscriptions = await prisma.subscriptions.findMany({
      where: { team_id: teamId },
      include: {
        subscription_plans: true,
        payment_gateways: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: subscriptions,
    });
  } catch (error) {
    logger.error('Error getting subscriptions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get subscriptions',
    });
  }
}

/**
 * Cancel subscription
 * POST /api/v1/payments/subscriptions/:id/cancel
 */
export async function cancelSubscription(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.team_id;
    const { immediate = false } = req.body;

    // Get subscription
    const subscription = await prisma.subscriptions.findFirst({
      where: {
        id,
        team_id: teamId,
      },
      include: {
        payment_gateways: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    // Cancel via payment provider
    const provider = paymentGatewayManager.getProvider(
      subscription.payment_gateways.provider,
      subscription.payment_gateways.credentials_encrypted
    );

    await provider.cancelSubscription(subscription.external_subscription_id, immediate);

    // Update subscription
    const updatedSubscription = await prisma.subscriptions.update({
      where: { id },
      data: {
        status: immediate ? 'Cancelled' : 'Active',
        cancel_at_period_end: !immediate,
        cancelled_at: immediate ? new Date() : null,
      },
    });

    logger.info('Subscription cancelled', {
      subscriptionId: id,
      immediate,
      teamId,
    });

    return res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: updatedSubscription,
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
    });
  }
}

/**
 * Create payment
 * POST /api/v1/payments/checkout
 */
export async function createPayment(req, res) {
  try {
    const teamId = req.user.team_id;
    const { gateway_id, amount, currency = 'USD', metadata } = req.body;

    // Get gateway
    const gateway = await prisma.payment_gateways.findFirst({
      where: {
        id: gateway_id,
        team_id: teamId,
        is_active: true,
      },
    });

    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway not found',
      });
    }

    // Create payment via provider
    const provider = paymentGatewayManager.getProvider(
      gateway.provider,
      gateway.credentials_encrypted
    );

    const paymentData = await provider.createPayment({
      amount,
      currency,
      metadata,
    });

    // Create payment in database
    const payment = await prisma.payments.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        gateway_id: gateway.id,
        external_payment_id: paymentData.external_id,
        amount,
        currency,
        status: paymentData.status,
        metadata,
      },
    });

    logger.info('Payment created', {
      paymentId: payment.id,
      amount,
      teamId,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment,
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment',
    });
  }
}

/**
 * List payments
 * GET /api/v1/payments
 */
export async function listPayments(req, res) {
  try {
    const teamId = req.user.team_id;
    const { status, page = 1, limit = 20 } = req.query;

    const where = { team_id: teamId };
    if (status) where.status = status;

    const payments = await prisma.payments.findMany({
      where,
      include: {
        payment_gateways: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.payments.count({ where });

    return res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing payments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list payments',
    });
  }
}

/**
 * Get payment by ID
 * GET /api/v1/payments/:id
 */
export async function getPayment(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.team_id;

    const payment = await prisma.payments.findFirst({
      where: {
        id,
        team_id: teamId,
      },
      include: {
        payment_gateways: {
          select: {
            id: true,
            provider: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    return res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    logger.error('Error getting payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get payment',
    });
  }
}

/**
 * Refund payment
 * POST /api/v1/payments/:id/refund
 */
export async function refundPayment(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.team_id;
    const { amount } = req.body;

    // Get payment
    const payment = await prisma.payments.findFirst({
      where: {
        id,
        team_id: teamId,
      },
      include: {
        payment_gateways: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded',
      });
    }

    // Refund via provider
    const provider = paymentGatewayManager.getProvider(
      payment.payment_gateways.provider,
      payment.payment_gateways.credentials_encrypted
    );

    await provider.refundPayment(payment.external_payment_id, amount);

    // Update payment status
    const updatedPayment = await prisma.payments.update({
      where: { id },
      data: { status: 'Refunded' },
    });

    logger.info('Payment refunded', {
      paymentId: id,
      amount: amount || payment.amount,
      teamId,
    });

    return res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: updatedPayment,
    });
  } catch (error) {
    logger.error('Error refunding payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to refund payment',
    });
  }
}

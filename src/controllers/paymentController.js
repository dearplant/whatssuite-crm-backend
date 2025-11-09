import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import paymentGatewayManager from '../services/payments/paymentGatewayManager.js';
import { encrypt } from '../utils/encryption.js';
import crypto from 'crypto';

/**
 * Get team ID from request user, create team if needed
 */
async function getTeamId(req) {
  let teamId = req.user.teamId || req.user.team_id;
  
  if (!teamId) {
    const team = await prisma.teams.create({
      data: {
        id: crypto.randomUUID(),
        name: `${req.user.email}'s Team`,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    
    await prisma.team_members.create({
      data: {
        id: crypto.randomUUID(),
        team_id: team.id,
        user_id: req.user.id,
        role: 'Owner',
        created_at: new Date(),
      },
    });
    
    teamId = team.id;
    req.user.teamId = teamId;
  }
  
  return teamId;
}

/**
 * Create payment gateway
 * POST /api/v1/payments/gateways
 */
export async function createPaymentGateway(req, res) {
  try {
    const teamId = await getTeamId(req);
    const { provider, ...rest } = req.body;

    // Map request body to credentials format based on provider
    let credentials;
    const providerLower = provider.toLowerCase();
    
    if (providerLower === 'stripe') {
      credentials = {
        secret_key: rest.apiKey || rest.secretKey,
        webhook_secret: rest.webhookSecret,
      };
    } else if (providerLower === 'paypal') {
      credentials = {
        client_id: rest.clientId,
        client_secret: rest.clientSecret,
        mode: rest.mode || 'sandbox',
      };
    } else if (providerLower === 'razorpay') {
      credentials = {
        key_id: rest.keyId,
        key_secret: rest.keySecret,
        webhook_secret: rest.webhookSecret,
      };
    } else {
      return res.status(400).json({
        success: false,
        message: `Unsupported payment provider: ${provider}`,
      });
    }

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

    // Normalize provider name
    const normalizedProvider = paymentGatewayManager.normalizeProviderName(provider);

    // Create gateway
    const gateway = await prisma.payment_gateways.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        provider: normalizedProvider,
        credentials_encrypted: JSON.stringify(credentialsEncrypted),
        is_active: rest.isActive !== undefined ? rest.isActive : true,
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
    const teamId = await getTeamId(req);

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
    const teamId = await getTeamId(req);
    const { plan_id, gateway_id, customer_email, customer_name } = req.body;

    // Validate required fields
    if (!plan_id || !gateway_id) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: plan_id, gateway_id',
      });
    }

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
        message: 'Payment gateway not found or inactive',
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

    // Get payment provider
    const provider = paymentGatewayManager.getProvider(
      gateway.provider,
      gateway.credentials_encrypted
    );

    // Check if customer already exists for this team
    let externalCustomerId = null;
    const existingSubscription = await prisma.subscriptions.findFirst({
      where: {
        team_id: teamId,
        gateway_id: gateway.id,
      },
      select: {
        external_customer_id: true,
      },
    });

    if (existingSubscription?.external_customer_id) {
      externalCustomerId = existingSubscription.external_customer_id;
      logger.info('Using existing customer', { customerId: externalCustomerId });
    } else {
      // Create customer first
      try {
        const customerData = await provider.createCustomer({
          email: customer_email || req.user.email || `team-${teamId}@example.com`,
          name: customer_name || req.user.name || `Team ${teamId}`,
          metadata: {
            team_id: teamId,
          },
        });
        externalCustomerId = customerData.id;
        logger.info('Created new customer', { customerId: externalCustomerId });
      } catch (customerError) {
        logger.error('Error creating customer:', customerError);
        return res.status(400).json({
          success: false,
          message: `Failed to create customer: ${customerError.message}`,
          error_code: customerError.code || 'CUSTOMER_CREATION_FAILED',
        });
      }
    }

    // Create subscription via payment provider
    let subscriptionData;
    try {
      subscriptionData = await provider.createSubscription({
        customer_id: externalCustomerId,
        plan_id: plan.external_plan_id || plan.id,
        currency: plan.currency,
        metadata: {
          team_id: teamId,
          plan_name: plan.name,
        },
      });
    } catch (subscriptionError) {
      logger.error('Error creating subscription with provider:', subscriptionError);
      
      // Handle specific provider errors
      if (subscriptionError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          message: `Stripe Error: ${subscriptionError.message}`,
          error_code: subscriptionError.code,
          param: subscriptionError.param,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Payment provider error: ${subscriptionError.message}`,
        error_code: subscriptionError.code || 'SUBSCRIPTION_CREATION_FAILED',
      });
    }

    // Create subscription in database
    const subscription = await prisma.subscriptions.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        plan_id: plan.id,
        gateway_id: gateway.id,
        external_subscription_id: subscriptionData.id,
        external_customer_id: externalCustomerId,
        status: subscriptionData.status,
        current_period_start: new Date(subscriptionData.current_period_start * 1000),
        current_period_end: new Date(subscriptionData.current_period_end * 1000),
      },
    });

    logger.info('Subscription created successfully', {
      subscriptionId: subscription.id,
      externalSubscriptionId: subscriptionData.id,
      planId: plan.id,
      teamId,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription created successfully',
      data: {
        id: subscription.id,
        plan_id: subscription.plan_id,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        external_subscription_id: subscription.external_subscription_id,
      },
    });
  } catch (error) {
    logger.error('Error creating subscription:', error);
    
    // Return more specific error information
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription',
      error_code: error.code || 'INTERNAL_ERROR',
    });
  }
}

/**
 * Get subscriptions
 * GET /api/v1/payments/subscriptions
 */
export async function getSubscriptions(req, res) {
  try {
    const teamId = await getTeamId(req);

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
    const teamId = await getTeamId(req);
    const { immediate = false } = req.body;

    // Get subscription with payment gateway credentials
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

    // Check if already cancelled
    if (subscription.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Subscription is already cancelled',
        current_status: subscription.status,
      });
    }

    // Cancel via payment provider
    const provider = paymentGatewayManager.getProvider(
      subscription.payment_gateways.provider,
      subscription.payment_gateways.credentials_encrypted
    );

    try {
      await provider.cancelSubscription(subscription.external_subscription_id, immediate);
    } catch (providerError) {
      logger.error('Error cancelling subscription with provider:', providerError);
      
      // Handle specific provider errors
      if (providerError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          message: `Stripe Error: ${providerError.message}`,
          error_code: providerError.code,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Payment provider error: ${providerError.message}`,
        error_code: providerError.code || 'CANCELLATION_FAILED',
      });
    }

    // Update subscription
    const updatedSubscription = await prisma.subscriptions.update({
      where: { id },
      data: {
        status: immediate ? 'Cancelled' : 'Active',
        cancel_at_period_end: !immediate,
        cancelled_at: immediate ? new Date() : null,
        updated_at: new Date(),
      },
    });

    logger.info('Subscription cancelled successfully', {
      subscriptionId: id,
      externalSubscriptionId: subscription.external_subscription_id,
      immediate,
      teamId,
    });

    return res.json({
      success: true,
      message: immediate 
        ? 'Subscription cancelled immediately' 
        : 'Subscription will be cancelled at the end of the current billing period',
      data: {
        id: updatedSubscription.id,
        status: updatedSubscription.status,
        cancel_at_period_end: updatedSubscription.cancel_at_period_end,
        cancelled_at: updatedSubscription.cancelled_at,
        current_period_end: updatedSubscription.current_period_end,
      },
    });
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to cancel subscription',
      error_code: error.code || 'INTERNAL_ERROR',
    });
  }
}

/**
 * Create payment
 * POST /api/v1/payments/checkout
 */
export async function createPayment(req, res) {
  try {
    const teamId = await getTeamId(req);
    const { gateway_id, amount, currency = 'USD', metadata } = req.body;

    // Validate required fields
    if (!gateway_id || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: gateway_id, amount',
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

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
        message: 'Payment gateway not found or inactive',
      });
    }

    // Create payment via provider
    const provider = paymentGatewayManager.getProvider(
      gateway.provider,
      gateway.credentials_encrypted
    );

    let paymentData;
    try {
      paymentData = await provider.createPayment({
        amount,
        currency,
        metadata: {
          ...metadata,
          team_id: teamId,
        },
      });
    } catch (providerError) {
      logger.error('Error creating payment with provider:', providerError);
      
      // Handle specific provider errors
      if (providerError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          message: `Stripe Error: ${providerError.message}`,
          error_code: providerError.code,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Payment provider error: ${providerError.message}`,
        error_code: providerError.code || 'PAYMENT_CREATION_FAILED',
      });
    }

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

    logger.info('Payment created successfully', {
      paymentId: payment.id,
      externalPaymentId: paymentData.external_id,
      amount,
      currency,
      teamId,
    });

    return res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: {
        id: payment.id,
        external_payment_id: payment.external_payment_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        created_at: payment.created_at,
      },
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create payment',
      error_code: error.code || 'INTERNAL_ERROR',
    });
  }
}

/**
 * List payments
 * GET /api/v1/payments
 */
export async function listPayments(req, res) {
  try {
    const teamId = await getTeamId(req);
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
    const teamId = await getTeamId(req);

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
    const teamId = await getTeamId(req);
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
        message: `Cannot refund payment with status: ${payment.status}. Only completed payments can be refunded.`,
        current_status: payment.status,
      });
    }

    // Validate refund amount if provided
    if (amount && amount > parseFloat(payment.amount)) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (${amount}) cannot exceed payment amount (${payment.amount})`,
      });
    }

    // Refund via provider
    const provider = paymentGatewayManager.getProvider(
      payment.payment_gateways.provider,
      payment.payment_gateways.credentials_encrypted
    );

    let refundData;
    try {
      refundData = await provider.refundPayment(payment.external_payment_id, amount);
    } catch (providerError) {
      logger.error('Error refunding payment with provider:', providerError);
      
      // Handle specific provider errors
      if (providerError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({
          success: false,
          message: `Stripe Error: ${providerError.message}`,
          error_code: providerError.code,
        });
      }
      
      return res.status(400).json({
        success: false,
        message: `Payment provider error: ${providerError.message}`,
        error_code: providerError.code || 'REFUND_FAILED',
      });
    }

    // Update payment status
    const updatedPayment = await prisma.payments.update({
      where: { id },
      data: { 
        status: 'Refunded',
        updated_at: new Date(),
      },
    });

    logger.info('Payment refunded successfully', {
      paymentId: id,
      refundAmount: amount || payment.amount,
      externalPaymentId: payment.external_payment_id,
      teamId,
    });

    return res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        refund_amount: amount || updatedPayment.amount,
        updated_at: updatedPayment.updated_at,
      },
    });
  } catch (error) {
    logger.error('Error refunding payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to refund payment',
      error_code: error.code || 'INTERNAL_ERROR',
    });
  }
}

/**
 * List invoices
 * GET /api/v1/payments/invoices
 */
export async function listInvoices(req, res) {
  try {
    const teamId = await getTeamId(req);
    const { status, page = 1, limit = 20 } = req.query;

    const where = { team_id: teamId };
    if (status) where.status = status;

    const invoices = await prisma.invoices.findMany({
      where,
      include: {
        payment_gateways: {
          select: {
            id: true,
            provider: true,
          },
        },
        subscriptions: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit),
    });

    const total = await prisma.invoices.count({ where });

    return res.json({
      success: true,
      data: invoices,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to list invoices',
    });
  }
}

/**
 * Get invoice by ID
 * GET /api/v1/payments/invoices/:id
 */
export async function getInvoice(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);

    const invoice = await prisma.invoices.findFirst({
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
        subscriptions: true,
        payments: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error getting invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get invoice',
    });
  }
}

/**
 * Get invoice PDF
 * GET /api/v1/payments/invoices/:id/pdf
 */
export async function getInvoicePDF(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);

    const invoice = await prisma.invoices.findFirst({
      where: {
        id,
        team_id: teamId,
      },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // For now, return a simple message
    // In production, this would generate a PDF using pdfkit
    return res.json({
      success: true,
      message: 'PDF generation not yet implemented',
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        pdf_url: invoice.pdf_url,
      },
    });
  } catch (error) {
    logger.error('Error getting invoice PDF:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get invoice PDF',
    });
  }
}

/**
 * Create subscription plan (admin only)
 * POST /api/v1/payments/plans
 */
export async function createSubscriptionPlan(req, res) {
  try {
    const { name, description, price, currency, interval, features, gateway_id } = req.body;

    // Validate required fields
    if (!name || !price || !interval) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, price, interval',
      });
    }

    // Validate interval
    const validIntervals = ['day', 'week', 'month', 'year'];
    if (!validIntervals.includes(interval)) {
      return res.status(400).json({
        success: false,
        message: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`,
      });
    }

    let externalPlanId = null;

    // If gateway_id provided, create the plan in the payment provider
    if (gateway_id) {
      const teamId = await getTeamId(req);
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
          message: 'Payment gateway not found or inactive',
        });
      }

      try {
        const provider = paymentGatewayManager.getProvider(
          gateway.provider,
          gateway.credentials_encrypted
        );

        // Create product and price in Stripe
        const stripePrice = await provider.createPrice({
          product_name: name,
          unit_amount: Math.round(price * 100), // Convert to cents
          currency: (currency || 'USD').toLowerCase(),
          recurring_interval: interval,
          metadata: {
            description: description || '',
          },
        });

        externalPlanId = stripePrice.id;
        logger.info('Created price in payment provider', {
          provider: gateway.provider,
          priceId: externalPlanId,
        });
      } catch (providerError) {
        logger.error('Error creating price in payment provider:', providerError);
        return res.status(400).json({
          success: false,
          message: `Payment provider error: ${providerError.message}`,
          error_code: providerError.code || 'PRICE_CREATION_FAILED',
        });
      }
    }

    // Create plan in database
    const plan = await prisma.subscription_plans.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description,
        price,
        currency: currency || 'USD',
        interval,
        external_plan_id: externalPlanId,
        features: features || [],
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    logger.info('Subscription plan created successfully', {
      planId: plan.id,
      name,
      externalPlanId,
    });

    return res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      data: {
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        external_plan_id: plan.external_plan_id,
        features: plan.features,
        is_active: plan.is_active,
      },
    });
  } catch (error) {
    logger.error('Error creating subscription plan:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create subscription plan',
      error_code: error.code || 'INTERNAL_ERROR',
    });
  }
}


/**
 * Get payment gateway details
 * GET /api/v1/payments/gateways/:id
 */
export async function getPaymentGateway(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);

    const gateway = await prisma.payment_gateways.findFirst({
      where: { id, team_id: teamId },
    });

    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway not found',
      });
    }

    res.json({
      success: true,
      data: gateway,
    });
  } catch (error) {
    logger.error('Error getting payment gateway', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get payment gateway',
    });
  }
}

/**
 * Update payment gateway
 * PUT /api/v1/payments/gateways/:id
 */
export async function updatePaymentGateway(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);
    const { isActive, ...updateData } = req.body;

    const gateway = await prisma.payment_gateways.findFirst({
      where: { id, team_id: teamId },
    });

    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway not found',
      });
    }

    const updated = await prisma.payment_gateways.update({
      where: { id },
      data: {
        ...updateData,
        is_active: isActive,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Payment gateway updated successfully',
    });
  } catch (error) {
    logger.error('Error updating payment gateway', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update payment gateway',
    });
  }
}

/**
 * Delete payment gateway
 * DELETE /api/v1/payments/gateways/:id
 */
export async function deletePaymentGateway(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);

    const gateway = await prisma.payment_gateways.findFirst({
      where: { id, team_id: teamId },
    });

    if (!gateway) {
      return res.status(404).json({
        success: false,
        message: 'Payment gateway not found',
      });
    }

    await prisma.payment_gateways.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Payment gateway deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting payment gateway', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment gateway',
    });
  }
}

/**
 * Get subscription plan details
 * GET /api/v1/payments/plans/:id
 */
export async function getSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;

    const plan = await prisma.subscription_plans.findUnique({
      where: { id },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    logger.error('Error getting subscription plan', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plan',
    });
  }
}

/**
 * Update subscription plan
 * PUT /api/v1/payments/plans/:id
 */
export async function updateSubscriptionPlan(req, res) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const plan = await prisma.subscription_plans.findUnique({
      where: { id },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Subscription plan not found',
      });
    }

    const updated = await prisma.subscription_plans.update({
      where: { id },
      data: {
        ...updateData,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Subscription plan updated successfully',
    });
  } catch (error) {
    logger.error('Error updating subscription plan', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription plan',
    });
  }
}

/**
 * Get subscription details
 * GET /api/v1/payments/subscriptions/:id
 */
export async function getSubscription(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);

    const subscription = await prisma.subscriptions.findFirst({
      where: { id, team_id: teamId },
      include: {
        subscription_plans: true,
        payment_gateways: true,
      },
    });

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'Subscription not found',
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    logger.error('Error getting subscription', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription',
    });
  }
}

/**
 * Create invoice
 * POST /api/v1/payments/invoices
 */
export async function createInvoice(req, res) {
  try {
    const teamId = await getTeamId(req);
    const { customerId, items, dueDate, notes, gatewayId } = req.body;

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required',
      });
    }

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);

    const invoice = await prisma.invoices.create({
      data: {
        id: crypto.randomUUID(),
        team_id: teamId,
        gateway_id: gatewayId,
        invoice_number: `INV-${Date.now()}`,
        amount: total,
        currency: 'USD',
        status: 'Draft',
        due_date: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        metadata: { items, notes },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: invoice,
      message: 'Invoice created successfully',
    });
  } catch (error) {
    logger.error('Error creating invoice', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
    });
  }
}

/**
 * Send invoice email
 * POST /api/v1/payments/invoices/:id/send
 */
export async function sendInvoice(req, res) {
  try {
    const { id } = req.params;
    const teamId = await getTeamId(req);

    const invoice = await prisma.invoices.findFirst({
      where: { id, team_id: teamId },
    });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // TODO: Implement email sending logic
    await prisma.invoices.update({
      where: { id },
      data: {
        status: 'Sent',
        sent_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Invoice sent successfully',
    });
  } catch (error) {
    logger.error('Error sending invoice', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Failed to send invoice',
    });
  }
}

/**
 * Handle Stripe webhook
 * POST /api/v1/payments/webhooks/stripe
 */
export async function handleStripeWebhook(req, res) {
  try {
    const event = req.body;
    
    logger.info('Received Stripe webhook', { type: event.type });

    // TODO: Verify webhook signature
    // TODO: Process webhook event

    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling Stripe webhook', { error: error.message });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

/**
 * Handle PayPal webhook
 * POST /api/v1/payments/webhooks/paypal
 */
export async function handlePayPalWebhook(req, res) {
  try {
    const event = req.body;
    
    logger.info('Received PayPal webhook', { event_type: event.event_type });

    // TODO: Verify webhook signature
    // TODO: Process webhook event

    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling PayPal webhook', { error: error.message });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

/**
 * Handle Razorpay webhook
 * POST /api/v1/payments/webhooks/razorpay
 */
export async function handleRazorpayWebhook(req, res) {
  try {
    const event = req.body;
    
    logger.info('Received Razorpay webhook', { event: event.event });

    // TODO: Verify webhook signature
    // TODO: Process webhook event

    res.json({ received: true });
  } catch (error) {
    logger.error('Error handling Razorpay webhook', { error: error.message });
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

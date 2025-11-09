import Stripe from 'stripe';
import BasePaymentProvider from '../basePaymentProvider.js';
import logger from '../../../utils/logger.js';

/**
 * Stripe Payment Provider
 */
class StripeProvider extends BasePaymentProvider {
  constructor(credentials) {
    super(credentials);
    this.stripe = new Stripe(credentials.secret_key);
  }

  getProviderName() {
    return 'Stripe';
  }

  async createCustomer(customerData) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        phone: customerData.phone,
        metadata: customerData.metadata || {},
      });

      return {
        id: customer.id,
        external_id: customer.id,
        email: customer.email,
        name: customer.name,
      };
    } catch (error) {
      logger.error('Stripe createCustomer error:', error);
      throw error;
    }
  }

  async createPrice(priceData) {
    try {
      // First create a product
      const product = await this.stripe.products.create({
        name: priceData.product_name,
        metadata: priceData.metadata || {},
      });

      // Then create a price for that product
      const price = await this.stripe.prices.create({
        product: product.id,
        unit_amount: priceData.unit_amount,
        currency: priceData.currency,
        recurring: {
          interval: priceData.recurring_interval,
        },
      });

      return {
        id: price.id,
        product_id: product.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
      };
    } catch (error) {
      logger.error('Stripe createPrice error:', error);
      throw error;
    }
  }

  async createSubscription(subscriptionData) {
    try {
      const subscription = await this.stripe.subscriptions.create({
        customer: subscriptionData.customer_id,
        items: [{ price: subscriptionData.price_id || subscriptionData.plan_id }],
        currency: subscriptionData.currency,
        metadata: subscriptionData.metadata || {},
      });

      return {
        id: subscription.id,
        external_id: subscription.id,
        status: this.mapStripeStatus(subscription.status),
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
      };
    } catch (error) {
      logger.error('Stripe createSubscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(externalSubscriptionId, immediate = false) {
    try {
      const subscription = await this.stripe.subscriptions.update(externalSubscriptionId, {
        cancel_at_period_end: !immediate,
      });

      if (immediate) {
        await this.stripe.subscriptions.cancel(externalSubscriptionId);
      }

      return {
        external_id: subscription.id,
        status: this.mapStripeStatus(subscription.status),
        cancel_at_period_end: subscription.cancel_at_period_end,
      };
    } catch (error) {
      logger.error('Stripe cancelSubscription error:', error);
      throw error;
    }
  }

  async createPayment(paymentData) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(paymentData.amount * 100), // Convert to cents
        currency: paymentData.currency.toLowerCase(),
        customer: paymentData.customer_id,
        metadata: paymentData.metadata || {},
      });

      return {
        external_id: paymentIntent.id,
        status: this.mapPaymentStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
      };
    } catch (error) {
      logger.error('Stripe createPayment error:', error);
      throw error;
    }
  }

  async refundPayment(externalPaymentId, amount = null) {
    try {
      const refundData = {
        payment_intent: externalPaymentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.stripe.refunds.create(refundData);

      return {
        external_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      logger.error('Stripe refundPayment error:', error);
      throw error;
    }
  }

  async getPaymentStatus(externalPaymentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(externalPaymentId);

      return {
        external_id: paymentIntent.id,
        status: this.mapPaymentStatus(paymentIntent.status),
        amount: paymentIntent.amount / 100,
        currency: paymentIntent.currency.toUpperCase(),
      };
    } catch (error) {
      logger.error('Stripe getPaymentStatus error:', error);
      throw error;
    }
  }

  verifyWebhookSignature(payload, signature, secret) {
    try {
      this.stripe.webhooks.constructEvent(payload, signature, secret);
      return true;
    } catch (error) {
      logger.error('Stripe webhook signature verification failed:', error);
      return false;
    }
  }

  parseWebhookEvent(payload) {
    return {
      type: payload.type,
      data: payload.data.object,
    };
  }

  async testCredentials() {
    try {
      await this.stripe.customers.list({ limit: 1 });
      return true;
    } catch (error) {
      logger.error('Stripe credentials test failed:', error);
      return false;
    }
  }

  mapStripeStatus(stripeStatus) {
    const statusMap = {
      active: 'Active',
      canceled: 'Cancelled',
      incomplete: 'PastDue',
      past_due: 'PastDue',
      unpaid: 'PastDue',
    };
    return statusMap[stripeStatus] || 'Active';
  }

  /**
   * Test credentials by making a real API call
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async testCredentials() {
    try {
      // Make a real API call to validate credentials
      await this.stripe.balance.retrieve();
      logger.info('Stripe credentials validated successfully');
      return true;
    } catch (error) {
      logger.error('Stripe credential validation failed:', {
        error: error.message,
        type: error.type,
      });
      return false;
    }
  }
}

export default StripeProvider;

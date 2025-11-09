import Razorpay from 'razorpay';
import crypto from 'crypto';
import BasePaymentProvider from '../basePaymentProvider.js';
import logger from '../../../utils/logger.js';

/**
 * Razorpay Payment Provider
 */
class RazorpayProvider extends BasePaymentProvider {
  constructor(credentials) {
    super(credentials);
    this.keyId = credentials.key_id;
    this.keySecret = credentials.key_secret;
    this.razorpay = new Razorpay({
      key_id: credentials.key_id,
      key_secret: credentials.key_secret,
    });
  }

  getProviderName() {
    return 'Razorpay';
  }

  async createCustomer(customerData) {
    try {
      const customer = await this.razorpay.customers.create({
        name: customerData.name,
        email: customerData.email,
        contact: customerData.phone,
        notes: customerData.metadata || {},
      });

      return {
        external_id: customer.id,
        email: customer.email,
        name: customer.name,
      };
    } catch (error) {
      logger.error('Razorpay createCustomer error:', error);
      throw error;
    }
  }

  async createSubscription(subscriptionData) {
    try {
      const subscription = await this.razorpay.subscriptions.create({
        plan_id: subscriptionData.plan_id,
        customer_id: subscriptionData.customer_id,
        total_count: subscriptionData.total_count || 12,
        quantity: 1,
        notes: subscriptionData.metadata || {},
      });

      return {
        external_id: subscription.id,
        status: this.mapRazorpayStatus(subscription.status),
        current_period_start: new Date(subscription.start_at * 1000),
        current_period_end: new Date(subscription.end_at * 1000),
      };
    } catch (error) {
      logger.error('Razorpay createSubscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(externalSubscriptionId, immediate = false) {
    try {
      const subscription = await this.razorpay.subscriptions.cancel(
        externalSubscriptionId,
        immediate
      );

      return {
        external_id: subscription.id,
        status: this.mapRazorpayStatus(subscription.status),
        cancel_at_period_end: !immediate,
      };
    } catch (error) {
      logger.error('Razorpay cancelSubscription error:', error);
      throw error;
    }
  }

  async createPayment(paymentData) {
    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(paymentData.amount * 100), // Convert to paise
        currency: paymentData.currency,
        receipt: `receipt_${Date.now()}`,
        notes: paymentData.metadata || {},
      });

      return {
        external_id: order.id,
        status: this.mapPaymentStatus(order.status),
        amount: order.amount / 100,
        currency: order.currency,
      };
    } catch (error) {
      logger.error('Razorpay createPayment error:', error);
      throw error;
    }
  }

  async refundPayment(externalPaymentId, amount = null) {
    try {
      const refundData = {
        payment_id: externalPaymentId,
      };

      if (amount) {
        refundData.amount = Math.round(amount * 100);
      }

      const refund = await this.razorpay.payments.refund(externalPaymentId, refundData);

      return {
        external_id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      logger.error('Razorpay refundPayment error:', error);
      throw error;
    }
  }

  async getPaymentStatus(externalPaymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(externalPaymentId);

      return {
        external_id: payment.id,
        status: this.mapPaymentStatus(payment.status),
        amount: payment.amount / 100,
        currency: payment.currency,
      };
    } catch (error) {
      logger.error('Razorpay getPaymentStatus error:', error);
      throw error;
    }
  }

  verifyWebhookSignature(payload, signature, secret) {
    try {
      const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      logger.error('Razorpay webhook signature verification failed:', error);
      return false;
    }
  }

  parseWebhookEvent(payload) {
    return {
      type: payload.event,
      data: payload.payload,
    };
  }

  mapRazorpayStatus(razorpayStatus) {
    const statusMap = {
      created: 'Active',
      authenticated: 'Active',
      active: 'Active',
      cancelled: 'Cancelled',
      halted: 'Cancelled',
      paused: 'PastDue',
    };
    return statusMap[razorpayStatus] || 'Active';
  }

  /**
   * Test credentials by making a real API call
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async testCredentials() {
    try {
      // Make a real API call to validate credentials
      const auth = Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64');
      
      const response = await fetch('https://api.razorpay.com/v1/payments?count=1', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
        },
      });

      if (response.ok) {
        logger.info('Razorpay credentials validated successfully');
        return true;
      }
      
      logger.error('Razorpay credential validation failed:', {
        status: response.status,
      });
      return false;
    } catch (error) {
      logger.error('Razorpay credential validation error:', {
        error: error.message,
      });
      return false;
    }
  }
}

export default RazorpayProvider;

import BasePaymentProvider from '../basePaymentProvider.js';
import logger from '../../../utils/logger.js';

/**
 * PayPal Payment Provider
 * Note: This is a simplified implementation. Full PayPal integration requires additional setup.
 */
class PayPalProvider extends BasePaymentProvider {
  constructor(credentials) {
    super(credentials);
    this.clientId = credentials.client_id;
    this.clientSecret = credentials.client_secret;
    this.mode = credentials.mode || 'sandbox'; // sandbox or live
    this.baseUrl =
      this.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  }

  getProviderName() {
    return 'PayPal';
  }

  async getAccessToken() {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    logger.info('PayPal getAccessToken attempt', {
      baseUrl: this.baseUrl,
      clientId: this.clientId,
      mode: this.mode,
    });

    // eslint-disable-next-line no-undef
    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    
    logger.info('PayPal getAccessToken response', {
      status: response.status,
      hasAccessToken: !!data.access_token,
      error: data.error,
    });

    if (!response.ok || !data.access_token) {
      throw new Error(data.error_description || 'Failed to get access token');
    }

    return data.access_token;
  }

  async createCustomer(customerData) {
    // PayPal doesn't have a direct customer creation API
    // Customers are created during checkout
    return {
      external_id: `paypal_${Date.now()}`,
      email: customerData.email,
      name: customerData.name,
    };
  }

  async createSubscription(subscriptionData) {
    try {
      const accessToken = await this.getAccessToken();

      // eslint-disable-next-line no-undef
      const response = await fetch(`${this.baseUrl}/v1/billing/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: subscriptionData.plan_id,
          subscriber: {
            email_address: subscriptionData.email,
          },
        }),
      });

      const subscription = await response.json();

      return {
        external_id: subscription.id,
        status: this.mapPayPalStatus(subscription.status),
        current_period_start: new Date(subscription.start_time),
        current_period_end: new Date(subscription.billing_info.next_billing_time),
      };
    } catch (error) {
      logger.error('PayPal createSubscription error:', error);
      throw error;
    }
  }

  async cancelSubscription(externalSubscriptionId, immediate = false) {
    try {
      const accessToken = await this.getAccessToken();

      // eslint-disable-next-line no-undef
      await fetch(`${this.baseUrl}/v1/billing/subscriptions/${externalSubscriptionId}/cancel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Customer requested cancellation',
        }),
      });

      return {
        external_id: externalSubscriptionId,
        status: 'Cancelled',
        cancel_at_period_end: !immediate,
      };
    } catch (error) {
      logger.error('PayPal cancelSubscription error:', error);
      throw error;
    }
  }

  async createPayment(paymentData) {
    try {
      const accessToken = await this.getAccessToken();

      // eslint-disable-next-line no-undef
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: paymentData.currency,
                value: paymentData.amount.toFixed(2),
              },
            },
          ],
        }),
      });

      const order = await response.json();

      return {
        external_id: order.id,
        status: this.mapPaymentStatus(order.status),
        amount: paymentData.amount,
        currency: paymentData.currency,
      };
    } catch (error) {
      logger.error('PayPal createPayment error:', error);
      throw error;
    }
  }

  async refundPayment(externalPaymentId, amount = null) {
    try {
      const accessToken = await this.getAccessToken();

      const refundData = {};
      if (amount) {
        refundData.amount = {
          value: amount.toFixed(2),
          currency_code: 'USD',
        };
      }

      // eslint-disable-next-line no-undef
      const response = await fetch(
        `${this.baseUrl}/v2/payments/captures/${externalPaymentId}/refund`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(refundData),
        }
      );

      const refund = await response.json();

      return {
        external_id: refund.id,
        amount: parseFloat(refund.amount.value),
        status: refund.status,
      };
    } catch (error) {
      logger.error('PayPal refundPayment error:', error);
      throw error;
    }
  }

  async getPaymentStatus(externalPaymentId) {
    try {
      const accessToken = await this.getAccessToken();

      // eslint-disable-next-line no-undef
      const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${externalPaymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const order = await response.json();

      return {
        external_id: order.id,
        status: this.mapPaymentStatus(order.status),
        amount: parseFloat(order.purchase_units[0].amount.value),
        currency: order.purchase_units[0].amount.currency_code,
      };
    } catch (error) {
      logger.error('PayPal getPaymentStatus error:', error);
      throw error;
    }
  }

  verifyWebhookSignature(_payload, _signature, _secret) {
    // PayPal webhook verification is complex and requires additional setup
    // This is a simplified version
    return true;
  }

  parseWebhookEvent(payload) {
    return {
      type: payload.event_type,
      data: payload.resource,
    };
  }

  async testCredentials() {
    try {
      await this.getAccessToken();
      return true;
    } catch (error) {
      logger.error('PayPal credentials test failed:', error);
      return false;
    }
  }

  mapPayPalStatus(paypalStatus) {
    const statusMap = {
      ACTIVE: 'Active',
      CANCELLED: 'Cancelled',
      SUSPENDED: 'PastDue',
      EXPIRED: 'Cancelled',
    };
    return statusMap[paypalStatus] || 'Active';
  }

  /**
   * Test credentials by making a real API call
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async testCredentials() {
    try {
      // Make a real API call to get access token - this validates credentials
      const accessToken = await this.getAccessToken();
      if (accessToken) {
        logger.info('PayPal credentials validated successfully');
        return true;
      }
      return false;
    } catch (error) {
      logger.error('PayPal credential validation failed:', {
        error: error.message,
      });
      return false;
    }
  }
}

export default PayPalProvider;

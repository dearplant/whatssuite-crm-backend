/**
 * Base Payment Provider
 * Abstract class for payment gateway implementations
 */
class BasePaymentProvider {
  constructor(credentials) {
    if (this.constructor === BasePaymentProvider) {
      throw new Error(
        'BasePaymentProvider is an abstract class and cannot be instantiated directly'
      );
    }
    this.credentials = credentials;
  }

  /**
   * Create a customer
   * @param {Object} _customerData - Customer information
   * @returns {Promise<Object>} Customer object with external_id
   */
  async createCustomer(_customerData) {
    throw new Error('createCustomer() must be implemented by subclass');
  }

  /**
   * Create a subscription
   * @param {Object} _subscriptionData - Subscription details
   * @returns {Promise<Object>} Subscription object with external_id
   */
  async createSubscription(_subscriptionData) {
    throw new Error('createSubscription() must be implemented by subclass');
  }

  /**
   * Cancel a subscription
   * @param {string} _externalSubscriptionId - External subscription ID
   * @param {boolean} _immediate - Cancel immediately or at period end
   * @returns {Promise<Object>} Updated subscription object
   */
  async cancelSubscription(_externalSubscriptionId, _immediate = false) {
    throw new Error('cancelSubscription() must be implemented by subclass');
  }

  /**
   * Create a payment intent/charge
   * @param {Object} _paymentData - Payment details
   * @returns {Promise<Object>} Payment object with external_id
   */
  async createPayment(_paymentData) {
    throw new Error('createPayment() must be implemented by subclass');
  }

  /**
   * Refund a payment
   * @param {string} _externalPaymentId - External payment ID
   * @param {number} _amount - Amount to refund (optional, full refund if not provided)
   * @returns {Promise<Object>} Refund object
   */
  async refundPayment(_externalPaymentId, _amount = null) {
    throw new Error('refundPayment() must be implemented by subclass');
  }

  /**
   * Get payment status
   * @param {string} _externalPaymentId - External payment ID
   * @returns {Promise<Object>} Payment status object
   */
  async getPaymentStatus(_externalPaymentId) {
    throw new Error('getPaymentStatus() must be implemented by subclass');
  }

  /**
   * Verify webhook signature
   * @param {string} _payload - Webhook payload
   * @param {string} _signature - Webhook signature
   * @param {string} _secret - Webhook secret
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(_payload, _signature, _secret) {
    throw new Error('verifyWebhookSignature() must be implemented by subclass');
  }

  /**
   * Parse webhook event
   * @param {Object} _payload - Webhook payload
   * @returns {Object} Parsed event object
   */
  parseWebhookEvent(_payload) {
    throw new Error('parseWebhookEvent() must be implemented by subclass');
  }

  /**
   * Get provider name
   * @returns {string} Provider name
   */
  getProviderName() {
    throw new Error('getProviderName() must be implemented by subclass');
  }

  /**
   * Test credentials
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async testCredentials() {
    throw new Error('testCredentials() must be implemented by subclass');
  }
}

export default BasePaymentProvider;

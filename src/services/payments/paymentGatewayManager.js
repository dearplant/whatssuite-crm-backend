import StripeProvider from './providers/stripeProvider.js';
import PayPalProvider from './providers/paypalProvider.js';
import RazorpayProvider from './providers/razorpayProvider.js';
import { decrypt } from '../../utils/encryption.js';
import logger from '../../utils/logger.js';

/**
 * Payment Gateway Manager
 * Routes payment operations to the appropriate provider
 */
class PaymentGatewayManager {
  constructor() {
    this.providers = {
      Stripe: StripeProvider,
      PayPal: PayPalProvider,
      Razorpay: RazorpayProvider,
    };
  }

  /**
   * Get provider instance
   * @param {string} providerName - Provider name (Stripe, PayPal, Razorpay)
   * @param {string} encryptedCredentials - Encrypted credentials
   * @returns {BasePaymentProvider} Provider instance
   */
  getProvider(providerName, encryptedCredentials) {
    const ProviderClass = this.providers[providerName];

    if (!ProviderClass) {
      throw new Error(`Unsupported payment provider: ${providerName}`);
    }

    try {
      const credentials = JSON.parse(decrypt(encryptedCredentials));
      return new ProviderClass(credentials);
    } catch (error) {
      logger.error('Error initializing payment provider:', error);
      throw new Error('Failed to initialize payment provider');
    }
  }

  /**
   * Get list of supported providers
   * @returns {Array<string>} List of provider names
   */
  getSupportedProviders() {
    return Object.keys(this.providers);
  }

  /**
   * Validate provider credentials
   * @param {string} providerName - Provider name
   * @param {Object} credentials - Provider credentials
   * @returns {Promise<boolean>} True if credentials are valid
   */
  async validateCredentials(providerName, credentials) {
    try {
      const ProviderClass = this.providers[providerName];

      if (!ProviderClass) {
        throw new Error(`Unsupported payment provider: ${providerName}`);
      }

      const provider = new ProviderClass(credentials);
      return await provider.testCredentials();
    } catch (error) {
      logger.error('Error validating credentials:', error);
      return false;
    }
  }
}

export default new PaymentGatewayManager();

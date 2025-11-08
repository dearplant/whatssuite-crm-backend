import WooCommerceRestApi from '@woocommerce/woocommerce-rest-api';
const WooCommerce = WooCommerceRestApi.default || WooCommerceRestApi;
import crypto from 'crypto';
import logger from '../../../utils/logger.js';

/**
 * WooCommerce REST API Client
 * Handles all WooCommerce API interactions
 * - HTTPS: Uses query string authentication
 * - HTTP: Uses OAuth 1.0a authentication
 */
class WooCommerceClient {
  constructor(storeUrl, consumerKey, consumerSecret) {
    this.storeUrl = storeUrl.replace(/\/$/, ''); // Remove trailing slash
    this.consumerKey = consumerKey;
    this.consumerSecret = consumerSecret;

    // Use official WooCommerce REST API library
    this.client = new WooCommerce({
      url: this.storeUrl,
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      version: 'wc/v3',
      queryStringAuth: !this.storeUrl.startsWith('https://'), // Force OAuth 1.0a for HTTP
    });
  }

  /**
   * Verify WooCommerce webhook signature
   * WooCommerce uses HMAC-SHA256 with the consumer secret
   */
  static verifyWebhook(payload, signature, secret) {
    const hash = crypto.createHmac('sha256', secret).update(payload).digest('base64');
    return hash === signature;
  }

  /**
   * Test connection and get store information
   */
  async getSystemStatus() {
    try {
      const response = await this.client.get('system_status');
      return response.data;
    } catch (error) {
      logger.error('WooCommerce API error (getSystemStatus):', error.message);
      throw new Error(
        `Failed to get system status: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get store settings
   */
  async getSettings() {
    try {
      const response = await this.client.get('settings/general');
      return response.data;
    } catch (error) {
      logger.error('WooCommerce API error (getSettings):', error.message);
      throw new Error(`Failed to get settings: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Register webhook
   */
  async registerWebhook(topic, deliveryUrl) {
    try {
      const response = await this.client.post('webhooks', {
        name: `WhatsApp CRM - ${topic}`,
        topic,
        delivery_url: deliveryUrl,
        status: 'active',
      });
      return response.data;
    } catch (error) {
      logger.error(`WooCommerce API error (registerWebhook ${topic}):`, error.message);
      throw new Error(
        `Failed to register webhook: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * List all webhooks
   */
  async listWebhooks() {
    try {
      const response = await this.client.get('webhooks');
      return response.data;
    } catch (error) {
      logger.error('WooCommerce API error (listWebhooks):', error.message);
      throw new Error(`Failed to list webhooks: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    try {
      await this.client.delete(`webhooks/${webhookId}`, { force: true });
    } catch (error) {
      logger.error(`WooCommerce API error (deleteWebhook ${webhookId}):`, error.message);
      throw new Error(
        `Failed to delete webhook: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Get orders with pagination
   */
  async getOrders(params = {}) {
    try {
      const response = await this.client.get('orders', params);
      return response.data;
    } catch (error) {
      logger.error('WooCommerce API error (getOrders):', error.message);
      throw new Error(`Failed to get orders: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get single order
   */
  async getOrder(orderId) {
    try {
      const response = await this.client.get(`orders/${orderId}`);
      return response.data;
    } catch (error) {
      logger.error(`WooCommerce API error (getOrder ${orderId}):`, error.message);
      throw new Error(`Failed to get order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Update order
   */
  async updateOrder(orderId, data) {
    try {
      const response = await this.client.put(`orders/${orderId}`, data);
      return response.data;
    } catch (error) {
      logger.error(`WooCommerce API error (updateOrder ${orderId}):`, error.message);
      throw new Error(`Failed to update order: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get customers
   */
  async getCustomers(params = {}) {
    try {
      const response = await this.client.get('customers', params);
      return response.data;
    } catch (error) {
      logger.error('WooCommerce API error (getCustomers):', error.message);
      throw new Error(`Failed to get customers: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get single customer
   */
  async getCustomer(customerId) {
    try {
      const response = await this.client.get(`customers/${customerId}`);
      return response.data;
    } catch (error) {
      logger.error(`WooCommerce API error (getCustomer ${customerId}):`, error.message);
      throw new Error(`Failed to get customer: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default WooCommerceClient;

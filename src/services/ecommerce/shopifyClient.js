import axios from 'axios';
import crypto from 'crypto';
import logger from '../../utils/logger.js';

/**
 * Shopify API Client
 * Handles all Shopify API interactions
 */
class ShopifyClient {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.apiVersion = '2024-01';
    this.baseURL = `https://${shopDomain}/admin/api/${this.apiVersion}`;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Verify Shopify webhook HMAC
   */
  static verifyWebhook(data, hmacHeader, secret) {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(data, 'utf8')
      .digest('base64');
    return hash === hmacHeader;
  }

  /**
   * Get shop information
   */
  async getShop() {
    try {
      const response = await this.client.get('/shop.json');
      return response.data.shop;
    } catch (error) {
      logger.error('Shopify API error (getShop):', error.message);
      throw new Error(`Failed to get shop info: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * Register webhook
   */
  async registerWebhook(topic, address) {
    try {
      const response = await this.client.post('/webhooks.json', {
        webhook: {
          topic,
          address,
          format: 'json',
        },
      });
      return response.data.webhook;
    } catch (error) {
      logger.error(`Shopify API error (registerWebhook ${topic}):`, error.message);
      throw new Error(`Failed to register webhook: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * List all webhooks
   */
  async listWebhooks() {
    const response = await this.client.get('/webhooks.json');
    return response.data.webhooks;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId) {
    await this.client.delete(`/webhooks/${webhookId}.json`);
  }

  /**
   * Get orders
   */
  async getOrders(params = {}) {
    try {
      const response = await this.client.get('/orders.json', { params });
      return response.data.orders;
    } catch (error) {
      logger.error('Shopify API error (getOrders):', error.message);
      throw new Error(`Failed to get orders: ${error.response?.data?.errors || error.message}`);
    }
  }

  /**
   * Get single order
   */
  async getOrder(orderId) {
    const response = await this.client.get(`/orders/${orderId}.json`);
    return response.data.order;
  }

  /**
   * Get checkouts (abandoned carts)
   */
  async getCheckouts(params = {}) {
    const response = await this.client.get('/checkouts.json', { params });
    return response.data.checkouts;
  }

  /**
   * Get single checkout
   */
  async getCheckout(checkoutToken) {
    const response = await this.client.get(`/checkouts/${checkoutToken}.json`);
    return response.data.checkout;
  }
}

export default ShopifyClient;

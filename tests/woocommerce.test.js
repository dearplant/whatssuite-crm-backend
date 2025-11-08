import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import crypto from 'crypto';
import WooCommerceClient from '../src/services/ecommerce/woocommerce/woocommerceClient.js';

describe('WooCommerce Integration Tests', () => {
  let authToken;
  let userId;
  let teamId;
  let integrationId;

  const testStoreUrl = 'https://test-store.example.com';
  const testConsumerKey = 'ck_test_key_123';
  const testConsumerSecret = 'cs_test_secret_456';

  beforeAll(async () => {
    // Create test user and team
    teamId = crypto.randomUUID();
    userId = crypto.randomUUID();

    // Register user to get auth token (this creates both user and team)
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'woocommerce-test@example.com',
        password: 'TestPassword123!',
        firstName: 'WooCommerce',
        lastName: 'Tester',
      });

    if (!registerResponse.body.success) {
      throw new Error(`Registration failed: ${JSON.stringify(registerResponse.body)}`);
    }

    authToken = registerResponse.body.data?.accessToken;
    const user = registerResponse.body.data?.user;
    userId = user?.id;
    
    // Get team_id from the user's teams relation or fetch it
    if (userId) {
      const userWithTeam = await prisma.users.findUnique({
        where: { id: userId },
        include: { teams: true },
      });
      teamId = userWithTeam?.teams?.[0]?.id;
    }
  });

  afterAll(async () => {
    // Cleanup
    if (integrationId) {
      await prisma.ecommerce_orders.deleteMany({
        where: { integration_id: integrationId },
      });
      await prisma.ecommerce_integrations.deleteMany({
        where: { id: integrationId },
      });
    }
    await prisma.users.deleteMany({ where: { id: userId } });
    await prisma.teams.deleteMany({ where: { id: teamId } });
  });

  describe('POST /api/v1/ecommerce/integrations/woocommerce', () => {
    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/ecommerce/integrations/woocommerce')
        .send({
          storeUrl: testStoreUrl,
          consumerKey: testConsumerKey,
          consumerSecret: testConsumerSecret,
        });

      expect(response.status).toBe(401);
    });

    it('should reject request with missing parameters', async () => {
      const response = await request(app)
        .post('/api/v1/ecommerce/integrations/woocommerce')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeUrl: testStoreUrl,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('required');
    });

    it('should reject invalid store URL format', async () => {
      const response = await request(app)
        .post('/api/v1/ecommerce/integrations/woocommerce')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          storeUrl: 'invalid-url',
          consumerKey: testConsumerKey,
          consumerSecret: testConsumerSecret,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid store URL');
    });
  });

  describe('WooCommerce Webhook Signature Verification', () => {
    it('should verify valid webhook signature', () => {
      const payload = JSON.stringify({ id: 123, status: 'completed' });
      const secret = 'test-secret';
      
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      const isValid = WooCommerceClient.verifyWebhook(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const payload = JSON.stringify({ id: 123, status: 'completed' });
      const secret = 'test-secret';
      const invalidSignature = 'invalid-signature';

      const isValid = WooCommerceClient.verifyWebhook(payload, invalidSignature, secret);
      expect(isValid).toBe(false);
    });
  });

  describe('POST /api/v1/ecommerce/webhooks/woocommerce/orders-create', () => {
    beforeEach(async () => {
      // Clean up any existing integrations first
      await prisma.ecommerce_integrations.deleteMany({
        where: { team_id: teamId },
      });
      
      // Create test integration
      integrationId = crypto.randomUUID();
      await prisma.ecommerce_integrations.create({
        data: {
          id: integrationId,
          team_id: teamId,
          user_id: userId,
          provider: 'WooCommerce',
          store_url: testStoreUrl,
          store_name: 'Test Store',
          access_token_encrypted: 'encrypted-credentials',
          webhook_secret: 'test-webhook-secret',
          status: 'Active',
        },
      });
    });

    it('should reject webhook without signature header', async () => {
      const response = await request(app)
        .post('/api/v1/ecommerce/webhooks/woocommerce/orders-create')
        .send({ id: 123 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing webhook headers');
    });

    it('should reject webhook for unknown store', async () => {
      const payload = JSON.stringify({ id: 123 });
      const signature = crypto
        .createHmac('sha256', 'test-webhook-secret')
        .update(payload)
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/ecommerce/webhooks/woocommerce/orders-create')
        .set('x-wc-webhook-signature', signature)
        .set('x-wc-webhook-source', 'https://unknown-store.example.com')
        .send({ id: 123 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Integration not found');
    });
  });

  describe('WooCommerce Order Status Mapping', () => {
    it('should map WooCommerce statuses correctly', async () => {
      const { default: woocommerceService } = await import('../src/services/ecommerce/woocommerce/woocommerceService.js');
      
      expect(woocommerceService.mapOrderStatus('pending')).toBe('Pending');
      expect(woocommerceService.mapOrderStatus('processing')).toBe('Processing');
      expect(woocommerceService.mapOrderStatus('completed')).toBe('Completed');
      expect(woocommerceService.mapOrderStatus('cancelled')).toBe('Cancelled');
      expect(woocommerceService.mapOrderStatus('refunded')).toBe('Refunded');
      expect(woocommerceService.mapOrderStatus('failed')).toBe('Failed');
    });

    it('should map fulfillment statuses correctly', async () => {
      const { default: woocommerceService } = await import('../src/services/ecommerce/woocommerce/woocommerceService.js');
      
      expect(woocommerceService.mapFulfillmentStatus('pending')).toBe('unfulfilled');
      expect(woocommerceService.mapFulfillmentStatus('processing')).toBe('unfulfilled');
      expect(woocommerceService.mapFulfillmentStatus('completed')).toBe('fulfilled');
      expect(woocommerceService.mapFulfillmentStatus('cancelled')).toBe('cancelled');
    });
  });
});

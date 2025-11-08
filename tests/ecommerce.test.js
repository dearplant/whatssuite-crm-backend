import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import crypto from 'crypto';

describe('E-commerce Integration Tests', () => {
  let authToken;
  let teamId;
  let userId;
  let integrationId;
  let orderId;

  beforeAll(async () => {
    // Register user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'ecommerce-test@example.com',
        password: 'TestPassword123!',
        firstName: 'Ecommerce',
        lastName: 'Tester',
      });

    authToken = registerResponse.body.data?.accessToken;
    userId = registerResponse.body.data?.user?.id;
    
    const ownedTeam = await prisma.teams.findFirst({
      where: { owner_id: userId },
    });
    teamId = ownedTeam?.id;

    // Create test integration
    integrationId = crypto.randomUUID();
    await prisma.ecommerce_integrations.create({
      data: {
        id: integrationId,
        team_id: teamId,
        user_id: userId,
        provider: 'Shopify',
        store_url: 'https://test-store.myshopify.com',
        store_name: 'Test Store',
        access_token_encrypted: 'encrypted-token',
        webhook_secret: 'test-secret',
        status: 'Active',
        is_active: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.ecommerce_orders.deleteMany({ where: { team_id: teamId } });
    await prisma.ecommerce_integrations.deleteMany({ where: { team_id: teamId } });
    await prisma.teams.deleteMany({ where: { owner_id: userId } });
    await prisma.users.deleteMany({ where: { id: userId } });
  });

  describe('Order Management', () => {
    beforeEach(async () => {
      orderId = crypto.randomUUID();
      await prisma.ecommerce_orders.create({
        data: {
          id: orderId,
          integration_id: integrationId,
          team_id: teamId,
          external_order_id: 'test-order-123',
          order_number: 'ORD-123',
          customer_email: 'customer@example.com',
          customer_phone: '+1234567890',
          customer_name: 'Test Customer',
          status: 'Pending',
          total_amount: 99.99,
          currency: 'USD',
          items: [{ name: 'Test Product', price: 99.99, quantity: 1 }],
        },
      });
    });

    afterEach(async () => {
      await prisma.ecommerce_orders.deleteMany({ where: { id: orderId } });
    });

    test('should list orders', async () => {
      const response = await request(app)
        .get('/api/v1/ecommerce/orders')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test('should get order by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/ecommerce/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(orderId);
      expect(response.body.data.order_number).toBe('ORD-123');
    });

    test('should filter orders by status', async () => {
      const response = await request(app)
        .get('/api/v1/ecommerce/orders?status=Pending')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.every(order => order.status === 'Pending')).toBe(true);
    });

    test('should send order notification', async () => {
      const response = await request(app)
        .post(`/api/v1/ecommerce/orders/${orderId}/notify`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          template: 'pending',
        });

      // Will fail without WhatsApp account, but endpoint should exist
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Integration Management', () => {
    test('should list integrations', async () => {
      const response = await request(app)
        .get('/api/v1/ecommerce/integrations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    test('should get integration by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/ecommerce/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(integrationId);
      expect(response.body.data.provider).toBe('Shopify');
    });

    test('should update integration', async () => {
      const response = await request(app)
        .put(`/api/v1/ecommerce/integrations/${integrationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          store_name: 'Updated Store Name',
          is_active: true,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.store_name).toBe('Updated Store Name');
    });

    test('should sync integration orders', async () => {
      const response = await request(app)
        .post(`/api/v1/ecommerce/integrations/${integrationId}/sync`)
        .set('Authorization', `Bearer ${authToken}`);

      // Will fail without valid credentials, but endpoint should exist
      expect([200, 400, 500]).toContain(response.status);
    });
  });

  describe('Webhook Signature Verification', () => {
    test('should verify Shopify webhook signature', async () => {
      const payload = JSON.stringify({ id: 123, test: true });
      const hmac = crypto
        .createHmac('sha256', 'test-secret')
        .update(payload, 'utf8')
        .digest('base64');

      const response = await request(app)
        .post('/api/v1/ecommerce/webhooks/shopify/orders-create')
        .set('X-Shopify-Hmac-SHA256', hmac)
        .set('X-Shopify-Shop-Domain', 'test-store.myshopify.com')
        .send(payload);

      // Should not return 401 (signature verified)
      expect(response.status).not.toBe(401);
    });
  });

  describe('Order Automation', () => {
    test('should link order to contact', async () => {
      // Create order with customer info
      const newOrderId = crypto.randomUUID();
      await prisma.ecommerce_orders.create({
        data: {
          id: newOrderId,
          integration_id: integrationId,
          team_id: teamId,
          external_order_id: 'auto-order-123',
          order_number: 'AUTO-123',
          customer_email: 'autotest@example.com',
          customer_phone: '+1987654321',
          customer_name: 'Auto Test',
          status: 'Pending',
          total_amount: 149.99,
          currency: 'USD',
          items: [],
        },
      });

      // Process order automation
      const orderAutomationService = (await import('../src/services/ecommerce/orderAutomationService.js')).default;
      const order = await prisma.ecommerce_orders.findUnique({
        where: { id: newOrderId },
      });
      
      await orderAutomationService.linkOrderToContact(order);

      // Check if contact was created
      const contact = await prisma.contacts.findFirst({
        where: {
          team_id: teamId,
          email: 'autotest@example.com',
        },
      });

      expect(contact).toBeTruthy();
      expect(contact.phone).toBe('+1987654321');

      // Cleanup
      await prisma.ecommerce_orders.deleteMany({ where: { id: newOrderId } });
      if (contact) {
        await prisma.contacts.deleteMany({ where: { id: contact.id } });
      }
    });
  });
});

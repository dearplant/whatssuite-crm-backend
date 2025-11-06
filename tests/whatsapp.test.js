import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { generateTokens } from '../src/utils/jwt.js';

describe('WhatsApp Integration', () => {
  let authToken;
  let testUser;
  let testAccount;
  let testContact;

  beforeAll(async () => {
    // Create test user
    const crypto = await import('crypto');
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    testUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: 'whatsapp-test@example.com',
        password_hash: hashedPassword,
        first_name: 'WhatsApp',
        last_name: 'Test',
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Generate auth token
    const tokens = generateTokens(testUser);
    authToken = tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up test data
    if (testUser) {
      await prisma.messages.deleteMany({
        where: { user_id: testUser.id },
      });
      await prisma.contacts.deleteMany({
        where: { user_id: testUser.id },
      });
      await prisma.whatsapp_accounts.deleteMany({
        where: { user_id: testUser.id },
      });
      await prisma.users.delete({
        where: { id: testUser.id },
      });
    }
    await prisma.$disconnect();
  });

  describe('QR Code Generation and Connection Flow', () => {
    describe('POST /api/v1/whatsapp/connect', () => {
      it('should initiate WhatsApp connection and generate QR code', async () => {
        const response = await request(app)
          .post('/api/v1/whatsapp/connect')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Test Business',
          });

        expect(response.status).toBe(202);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('accountId');
        expect(response.body.data.status).toBe('Connecting');
        expect(response.body.data.message).toContain('QR code');

        // Store account ID for cleanup
        if (response.body.data.accountId) {
          testAccount = await prisma.whatsapp_accounts.findUnique({
            where: { id: response.body.data.accountId },
          });
        }
      });

      it('should reject connection without authentication', async () => {
        const response = await request(app).post('/api/v1/whatsapp/connect').send({
          name: 'Test Business',
        });

        expect(response.status).toBe(401);
      });

      it('should validate displayName is provided', async () => {
        const response = await request(app)
          .post('/api/v1/whatsapp/connect')
          .set('Authorization', `Bearer ${authToken}`)
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/v1/whatsapp/qr/:accountId', () => {
      beforeEach(async () => {
        // Create test account with QR code
        testAccount = await prisma.whatsapp_accounts.create({
          data: {
            user_id: testUser.id,
            phone: 'pending',
            name: 'Test QR Account',
            status: 'Connecting',
            health_status: 'Healthy',
            qr_code: 'test-qr-code-data',
            qr_code_expiry: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes from now
          },
        });
      });

      afterEach(async () => {
        if (testAccount) {
          await prisma.whatsapp_accounts.delete({
            where: { id: testAccount.id },
          });
          testAccount = null;
        }
      });

      it('should retrieve QR code for connecting account', async () => {
        const response = await request(app)
          .get(`/api/v1/whatsapp/qr/${testAccount.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('qrCode');
        expect(response.body.data).toHaveProperty('expiresAt');
        expect(response.body.data.status).toBe('Connecting');
      });

      it('should return error for expired QR code', async () => {
        // Update QR code to expired
        await prisma.whatsapp_accounts.update({
          where: { id: testAccount.id },
          data: {
            qr_code_expiry: new Date(Date.now() - 1000), // Expired 1 second ago
          },
        });

        const response = await request(app)
          .get(`/api/v1/whatsapp/qr/${testAccount.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('expired');
      });

      it('should return error when QR code not available', async () => {
        // Update account to remove QR code
        await prisma.whatsapp_accounts.update({
          where: { id: testAccount.id },
          data: {
            qr_code: null,
            qr_code_expiry: null,
          },
        });

        const response = await request(app)
          .get(`/api/v1/whatsapp/qr/${testAccount.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('not available');
      });
    });

    describe('Connection Status Updates', () => {
      beforeEach(async () => {
        testAccount = await prisma.whatsapp_accounts.create({
          data: {
            user_id: testUser.id,
            phone: '+1234567890',
            name: 'Test Status Account',
            status: 'Connecting',
            health_status: 'Healthy',
          },
        });
      });

      afterEach(async () => {
        if (testAccount) {
          await prisma.whatsapp_accounts.delete({
            where: { id: testAccount.id },
          });
          testAccount = null;
        }
      });

      it('should update connection status to Connected', async () => {
        await prisma.whatsapp_accounts.update({
          where: { id: testAccount.id },
          data: {
            status: 'Connected',
            last_connected_at: new Date(),
          },
        });

        const account = await prisma.whatsapp_accounts.findUnique({
          where: { id: testAccount.id },
        });

        expect(account.connectionStatus).toBe('Connected');
        expect(account.lastConnectedAt).toBeTruthy();
      });

      it('should track disconnection with timestamp', async () => {
        await prisma.whatsapp_accounts.update({
          where: { id: testAccount.id },
          data: {
            status: 'Disconnected',
            last_disconnected_at: new Date(),
          },
        });

        const account = await prisma.whatsapp_accounts.findUnique({
          where: { id: testAccount.id },
        });

        expect(account.connectionStatus).toBe('Disconnected');
        expect(account.lastDisconnectedAt).toBeTruthy();
      });
    });
  });

  describe('GET /api/v1/whatsapp/accounts', () => {
    it('should return list of WhatsApp accounts', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/whatsapp/accounts');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/whatsapp/accounts/:accountId', () => {
    let testAccount;

    beforeEach(async () => {
      // Create test account
      testAccount = await prisma.whatsapp_accounts.create({
        data: {
          user_id: testUser.id,
          phone: '+1234567890',
          name: 'Test Account',
          status: 'Connected',
          health_status: 'Healthy',
        },
      });
    });

    afterAll(async () => {
      // Clean up
      if (testAccount) {
        await prisma.whatsapp_accounts.delete({
          where: { id: testAccount.id },
        });
      }
    });

    it('should return account details', async () => {
      const response = await request(app)
        .get(`/api/v1/whatsapp/accounts/${testAccount.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testAccount.id);
      expect(response.body.data.phoneNumber).toBe('+1234567890');
    });

    it('should return 404 for non-existent account', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/v1/whatsapp/accounts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject invalid account ID format', async () => {
      const response = await request(app)
        .get('/api/v1/whatsapp/accounts/invalid-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/whatsapp/health/:accountId', () => {
    beforeEach(async () => {
      testAccount = await prisma.whatsapp_accounts.create({
        data: {
          user_id: testUser.id,
          phone: '+1234567890',
          name: 'Test Account',
          status: 'Connected',
          health_status: 'Healthy',
          messages_sent_today: 100,
          daily_limit: 1000,
        },
      });
    });

    afterEach(async () => {
      if (testAccount) {
        await prisma.whatsapp_accounts.delete({
          where: { id: testAccount.id },
        });
        testAccount = null;
      }
    });

    it('should return account health metrics', async () => {
      const response = await request(app)
        .get(`/api/v1/whatsapp/health/${testAccount.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('healthStatus');
      expect(response.body.data).toHaveProperty('usagePercentage');
      expect(response.body.data.messagesSentToday).toBe(100);
    });
  });

  describe('Message Sending with Different Media Types', () => {
    beforeEach(async () => {
      // Create test account
      testAccount = await prisma.whatsapp_accounts.create({
        data: {
          user_id: testUser.id,
          phone: '+1234567890',
          name: 'Test Message Account',
          status: 'Connected',
          health_status: 'Healthy',
          messages_sent_today: 0,
          daily_limit: 1000,
        },
      });

      // Create test contact
      testContact = await prisma.contacts.create({
        data: {
          user_id: testUser.id,
          whatsapp_account_id: testAccount.id,
          phone: '+9876543210',
          name: 'Test Contact',
          source: 'Manual',
        },
      });
    });

    afterEach(async () => {
      if (testContact) {
        await prisma.messages.deleteMany({
          where: { contact_id: testContact.id },
        });
        await prisma.contacts.delete({
          where: { id: testContact.id },
        });
        testContact = null;
      }
      if (testAccount) {
        await prisma.whatsapp_accounts.delete({
          where: { id: testAccount.id },
        });
        testAccount = null;
      }
    });

    it('should send text message', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Text',
          content: 'Hello, this is a test message!',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data.status).toBe('Queued');
    });

    it('should queue image message with media URL', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Image',
          content: 'Check out this image!',
          mediaUrl: 'https://example.com/test-image.jpg',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messageId');
      expect(response.body.data.status).toBe('Queued');

      // Verify message was created with correct type
      const message = await prisma.messages.findUnique({
        where: { id: response.body.data.messageId },
      });
      expect(message.type).toBe('Image');
      expect(message.mediaUrl).toBe('https://example.com/test-image.jpg');
    });

    it('should queue video message with media URL', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Video',
          content: 'Watch this video!',
          mediaUrl: 'https://example.com/test-video.mp4',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('Queued');

      const message = await prisma.messages.findUnique({
        where: { id: response.body.data.messageId },
      });
      expect(message.type).toBe('Video');
      expect(message.mediaUrl).toBe('https://example.com/test-video.mp4');
    });

    it('should queue audio message with media URL', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Audio',
          mediaUrl: 'https://example.com/test-audio.mp3',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);

      const message = await prisma.messages.findUnique({
        where: { id: response.body.data.messageId },
      });
      expect(message.type).toBe('Audio');
      expect(message.mediaUrl).toBe('https://example.com/test-audio.mp3');
    });

    it('should queue document message with media URL', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Document',
          content: 'Here is the document',
          mediaUrl: 'https://example.com/test-document.pdf',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);

      const message = await prisma.messages.findUnique({
        where: { id: response.body.data.messageId },
      });
      expect(message.type).toBe('Document');
      expect(message.mediaUrl).toBe('https://example.com/test-document.pdf');
    });

    it('should reject message with invalid media type', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'InvalidType',
          content: 'Test message',
        });

      expect(response.status).toBe(400);
    });

    it('should reject media message without mediaUrl', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Image',
          content: 'Image without URL',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('mediaUrl');
    });
  });

  describe('Message Status Updates', () => {
    let testMessage;

    beforeEach(async () => {
      testAccount = await prisma.whatsapp_accounts.create({
        data: {
          user_id: testUser.id,
          phone: '+1234567890',
          name: 'Test Status Account',
          status: 'Connected',
          health_status: 'Healthy',
        },
      });

      testContact = await prisma.contacts.create({
        data: {
          user_id: testUser.id,
          whatsapp_account_id: testAccount.id,
          phone: '+9876543210',
          name: 'Test Contact',
          source: 'Manual',
        },
      });

      testMessage = await prisma.messages.create({
        data: {
          user_id: testUser.id,
          whatsapp_account_id: testAccount.id,
          contact_id: testContact.id,
          direction: 'Outbound',
          type: 'Text',
          content: 'Test message',
          whatsapp_message_id: `test-msg-${Date.now()}`,
          status: 'Queued',
        },
      });
    });

    afterEach(async () => {
      if (testMessage) {
        await prisma.messages.delete({
          where: { id: testMessage.id },
        });
        testMessage = null;
      }
      if (testContact) {
        await prisma.contacts.delete({
          where: { id: testContact.id },
        });
        testContact = null;
      }
      if (testAccount) {
        await prisma.whatsapp_accounts.delete({
          where: { id: testAccount.id },
        });
        testAccount = null;
      }
    });

    it('should update message status from Queued to Sent', async () => {
      await prisma.messages.update({
        where: { id: testMessage.id },
        data: {
          status: 'Sent',
          sent_at: new Date(),
        },
      });

      const message = await prisma.messages.findUnique({
        where: { id: testMessage.id },
      });

      expect(message.status).toBe('Sent');
      expect(message.sentAt).toBeTruthy();
    });

    it('should update message status from Sent to Delivered', async () => {
      await prisma.messages.update({
        where: { id: testMessage.id },
        data: {
          status: 'Delivered',
          delivered_at: new Date(),
        },
      });

      const message = await prisma.messages.findUnique({
        where: { id: testMessage.id },
      });

      expect(message.status).toBe('Delivered');
      expect(message.deliveredAt).toBeTruthy();
    });

    it('should update message status from Delivered to Read', async () => {
      await prisma.messages.update({
        where: { id: testMessage.id },
        data: {
          status: 'Read',
          read_at: new Date(),
        },
      });

      const message = await prisma.messages.findUnique({
        where: { id: testMessage.id },
      });

      expect(message.status).toBe('Read');
      expect(message.readAt).toBeTruthy();
    });

    it('should update message status to Failed with error message', async () => {
      const errorMessage = 'Failed to send message: Network error';

      await prisma.messages.update({
        where: { id: testMessage.id },
        data: {
          status: 'Failed',
          errorMessage,
        },
      });

      const message = await prisma.messages.findUnique({
        where: { id: testMessage.id },
      });

      expect(message.status).toBe('Failed');
      expect(message.errorMessage).toBe(errorMessage);
    });

    it('should track all status timestamps correctly', async () => {
      const sentAt = new Date();
      const deliveredAt = new Date(sentAt.getTime() + 1000);
      const readAt = new Date(deliveredAt.getTime() + 2000);

      await prisma.messages.update({
        where: { id: testMessage.id },
        data: {
          status: 'Read',
          sentAt,
          deliveredAt,
          readAt,
        },
      });

      const message = await prisma.messages.findUnique({
        where: { id: testMessage.id },
      });

      expect(message.sentAt).toBeTruthy();
      expect(message.deliveredAt).toBeTruthy();
      expect(message.readAt).toBeTruthy();
      expect(message.deliveredAt.getTime()).toBeGreaterThan(message.sentAt.getTime());
      expect(message.readAt.getTime()).toBeGreaterThan(message.deliveredAt.getTime());
    });
  });

  describe('Rate Limiting Enforcement', () => {
    beforeEach(async () => {
      testAccount = await prisma.whatsapp_accounts.create({
        data: {
          user_id: testUser.id,
          phone: '+1234567890',
          name: 'Test Rate Limit Account',
          status: 'Connected',
          health_status: 'Healthy',
          messages_sent_today: 0,
          daily_limit: 1000,
        },
      });

      testContact = await prisma.contacts.create({
        data: {
          user_id: testUser.id,
          whatsapp_account_id: testAccount.id,
          phone: '+9876543210',
          name: 'Test Contact',
          source: 'Manual',
        },
      });
    });

    afterEach(async () => {
      if (testContact) {
        await prisma.messages.deleteMany({
          where: { contact_id: testContact.id },
        });
        await prisma.contacts.delete({
          where: { id: testContact.id },
        });
        testContact = null;
      }
      if (testAccount) {
        await prisma.whatsapp_accounts.delete({
          where: { id: testAccount.id },
        });
        testAccount = null;
      }
    });

    it('should allow message when under daily limit', async () => {
      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Text',
          content: 'Test message',
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
    });

    it('should reject message when daily limit reached', async () => {
      // Update account to be at daily limit
      await prisma.whatsapp_accounts.update({
        where: { id: testAccount.id },
        data: {
          messages_sent_today: 1000,
        },
      });

      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Text',
          content: 'Test message',
        });

      expect(response.status).toBe(429);
      expect(response.body.message).toContain('limit');
    });

    it('should reject message when exceeding daily limit', async () => {
      // Update account to exceed daily limit
      await prisma.whatsapp_accounts.update({
        where: { id: testAccount.id },
        data: {
          messages_sent_today: 1001,
        },
      });

      const response = await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Text',
          content: 'Test message',
        });

      expect(response.status).toBe(429);
    });

    it('should track message count increment', async () => {
      const initialCount = testAccount.messagesSentToday;

      await request(app)
        .post('/api/v1/messages/send')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          whatsapp_account_id: testAccount.id,
          to: testContact.phone,
          type: 'Text',
          content: 'Test message',
        });

      const updatedAccount = await prisma.whatsapp_accounts.findUnique({
        where: { id: testAccount.id },
      });

      expect(updatedAccount.messagesSentToday).toBe(initialCount + 1);
    });

    it('should update health status to Warning when usage exceeds 70%', async () => {
      // Set messages sent to 71% of daily limit
      await prisma.whatsapp_accounts.update({
        where: { id: testAccount.id },
        data: {
          messages_sent_today: 710,
        },
      });

      const response = await request(app)
        .get(`/api/v1/whatsapp/health/${testAccount.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usagePercentage).toBeGreaterThan(70);
      expect(response.body.data.healthStatus).toBe('Warning');
    });

    it('should update health status to Critical when usage exceeds 90%', async () => {
      // Set messages sent to 91% of daily limit
      await prisma.whatsapp_accounts.update({
        where: { id: testAccount.id },
        data: {
          messages_sent_today: 910,
        },
      });

      const response = await request(app)
        .get(`/api/v1/whatsapp/health/${testAccount.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usagePercentage).toBeGreaterThan(90);
      expect(response.body.data.healthStatus).toBe('Critical');
    });

    it('should calculate usage percentage correctly', async () => {
      await prisma.whatsapp_accounts.update({
        where: { id: testAccount.id },
        data: {
          messages_sent_today: 500,
          daily_limit: 1000,
        },
      });

      const response = await request(app)
        .get(`/api/v1/whatsapp/health/${testAccount.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.usagePercentage).toBe(50);
    });
  });
});

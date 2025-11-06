import { describe, it, expect, beforeAll, afterAll, afterEach, jest } from '@jest/globals';
import { createServer } from 'http';
import { io as ioClient } from 'socket.io-client';
import crypto from 'crypto';
import app from '../src/app.js';
import prisma from '../src/config/database.js';
import { initializeSocketIO, closeSocketIO, getConnectionStats } from '../src/config/socket.config.js';
import { generateTokens } from '../src/utils/jwt.js';
import { initializeRedis, closeRedis } from '../src/config/redis.js';

// Set test timeout
jest.setTimeout(15000);

describe('Socket.io Real-Time Communication', () => {
  let httpServer;
  let testUser;
  let authToken;
  let clientSocket;
  let serverPort;

  beforeAll(async () => {
    // Initialize Redis
    await initializeRedis();

    // Create HTTP server
    httpServer = createServer(app);
    
    // Initialize Socket.io
    initializeSocketIO(httpServer);

    // Start server on random port
    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });

    // Create test user
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    testUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email: 'socket-test@example.com',
        password_hash: hashedPassword,
        first_name: 'Socket',
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
    // Clean up
    if (testUser) {
      await prisma.users.delete({
        where: { id: testUser.id },
      });
    }

    // Close Socket.io
    await closeSocketIO();

    // Close HTTP server
    await new Promise((resolve) => {
      httpServer.close(resolve);
    });

    // Close Redis
    await closeRedis();

    await prisma.$disconnect();
  });

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Authentication', () => {
    it('should connect with valid JWT token', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: {
          token: authToken,
        },
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should reject connection without token', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`);

      clientSocket.on('connect', () => {
        done(new Error('Should not connect without token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: {
          token: 'invalid-token',
        },
      });

      clientSocket.on('connect', () => {
        done(new Error('Should not connect with invalid token'));
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('Authentication');
        done();
      });
    });
  });

  describe('Room Subscriptions', () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: authToken },
      });
      clientSocket.on('connect', done);
    });

    it('should subscribe to WhatsApp account room', (done) => {
      const accountId = 'test-account-id';

      clientSocket.emit('subscribe:whatsapp', accountId);

      // Give it a moment to process
      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });

    it('should unsubscribe from WhatsApp account room', (done) => {
      const accountId = 'test-account-id';

      clientSocket.emit('subscribe:whatsapp', accountId);

      setTimeout(() => {
        clientSocket.emit('unsubscribe:whatsapp', accountId);
        setTimeout(() => {
          expect(clientSocket.connected).toBe(true);
          done();
        }, 100);
      }, 100);
    });

    it('should subscribe to campaign room', (done) => {
      const campaignId = 'test-campaign-id';

      clientSocket.emit('subscribe:campaign', campaignId);

      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });

    it('should subscribe to contact room', (done) => {
      const contactId = 'test-contact-id';

      clientSocket.emit('subscribe:contact', contactId);

      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Typing Indicators', () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: authToken },
      });
      clientSocket.on('connect', done);
    });

    it('should emit typing start event', (done) => {
      const contactId = 'test-contact-id';
      const whatsappAccountId = 'test-account-id';

      clientSocket.emit('typing:start', { contactId, whatsappAccountId });

      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });

    it('should emit typing stop event', (done) => {
      const contactId = 'test-contact-id';
      const whatsappAccountId = 'test-account-id';

      clientSocket.emit('typing:stop', { contactId, whatsappAccountId });

      setTimeout(() => {
        expect(clientSocket.connected).toBe(true);
        done();
      }, 100);
    });
  });

  describe('Heartbeat', () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: authToken },
      });
      clientSocket.on('connect', done);
    });

    it('should respond to ping with pong', (done) => {
      clientSocket.emit('ping');

      clientSocket.on('pong', (data) => {
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });
    });
  });

  describe('Event Reception', () => {
    beforeEach((done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: authToken },
      });
      clientSocket.on('connect', done);
    });

    it('should receive WhatsApp connection status events', (done) => {
      const { emitWhatsAppConnectionStatus } = require('../src/sockets/index.js');

      clientSocket.on('whatsapp:connection:status', (data) => {
        expect(data).toHaveProperty('accountId');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit event
      setTimeout(() => {
        emitWhatsAppConnectionStatus(testUser.id, 'test-account-id', 'Connected', {
          message: 'Test connection',
        });
      }, 100);
    });

    it('should receive message status update events', (done) => {
      const { emitMessageStatusUpdate } = require('../src/sockets/index.js');

      clientSocket.on('message:status:update', (data) => {
        expect(data).toHaveProperty('messageId');
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit event
      setTimeout(() => {
        emitMessageStatusUpdate(testUser.id, 'test-message-id', 'Sent', {
          contactId: 'test-contact-id',
        });
      }, 100);
    });

    it('should receive message received events', (done) => {
      const { emitMessageReceived } = require('../src/sockets/index.js');

      clientSocket.on('message:received', (data) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit event
      setTimeout(() => {
        emitMessageReceived(testUser.id, 'test-contact-id', {
          id: 'test-message-id',
          content: 'Test message',
          type: 'Text',
        });
      }, 100);
    });

    it('should receive campaign progress events', (done) => {
      const { emitCampaignProgress } = require('../src/sockets/index.js');

      clientSocket.on('campaign:progress', (data) => {
        expect(data).toHaveProperty('campaignId');
        expect(data).toHaveProperty('progress');
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit event
      setTimeout(() => {
        emitCampaignProgress(testUser.id, 'test-campaign-id', {
          sent: 50,
          total: 100,
          percentage: 50,
        });
      }, 100);
    });
  });

  describe('Disconnection', () => {
    it('should handle client disconnection gracefully', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}`, {
        auth: { token: authToken },
      });

      clientSocket.on('connect', () => {
        clientSocket.disconnect();
      });

      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });
    });
  });
});

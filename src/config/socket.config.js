import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from './redis.js';
import { logger } from '../utils/logger.js';
import { verifyToken } from '../utils/jwt.js';

let io = null;

/**
 * Initialize Socket.io server with Redis adapter
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
export const initializeSocketIO = (httpServer) => {
  if (io) {
    logger.warn('Socket.io already initialized');
    return io;
  }

  // Create Socket.io server with CORS configuration
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    connectTimeout: 45000,
  });

  // Set up Redis adapter for horizontal scaling
  const redisClient = getRedisClient();
  const pubClient = redisClient.duplicate();
  const subClient = redisClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('✅ Socket.io Redis adapter initialized');
    })
    .catch((error) => {
      logger.error('Failed to initialize Socket.io Redis adapter:', error);
    });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = await verifyToken(token);

      if (!decoded) {
        return next(new Error('Invalid or expired token'));
      }

      // Attach user info to socket
      socket.userId = decoded.sub;
      socket.userEmail = decoded.email;
      socket.userRole = decoded.role;

      logger.debug(`Socket authenticated for user: ${socket.userEmail}`);
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id} (User: ${socket.userEmail})`);

    // Join user-specific room
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    logger.debug(`Socket ${socket.id} joined room: ${userRoom}`);

    // Handle client events
    socket.on('subscribe:whatsapp', (accountId) => {
      const whatsappRoom = `whatsapp:${accountId}`;
      socket.join(whatsappRoom);
      logger.debug(`Socket ${socket.id} subscribed to WhatsApp account: ${accountId}`);
    });

    socket.on('unsubscribe:whatsapp', (accountId) => {
      const whatsappRoom = `whatsapp:${accountId}`;
      socket.leave(whatsappRoom);
      logger.debug(`Socket ${socket.id} unsubscribed from WhatsApp account: ${accountId}`);
    });

    socket.on('subscribe:campaign', (campaignId) => {
      const campaignRoom = `campaign:${campaignId}`;
      socket.join(campaignRoom);
      logger.debug(`Socket ${socket.id} subscribed to campaign: ${campaignId}`);
    });

    socket.on('unsubscribe:campaign', (campaignId) => {
      const campaignRoom = `campaign:${campaignId}`;
      socket.leave(campaignRoom);
      logger.debug(`Socket ${socket.id} unsubscribed from campaign: ${campaignId}`);
    });

    socket.on('subscribe:contact', (contactId) => {
      const contactRoom = `contact:${contactId}`;
      socket.join(contactRoom);
      logger.debug(`Socket ${socket.id} subscribed to contact: ${contactId}`);
    });

    socket.on('unsubscribe:contact', (contactId) => {
      const contactRoom = `contact:${contactId}`;
      socket.leave(contactRoom);
      logger.debug(`Socket ${socket.id} unsubscribed from contact: ${contactId}`);
    });

    // Typing indicator
    socket.on('typing:start', ({ contactId, whatsappAccountId }) => {
      socket.to(`contact:${contactId}`).emit('typing:indicator', {
        contactId,
        whatsappAccountId,
        isTyping: true,
        userId: socket.userId,
      });
    });

    socket.on('typing:stop', ({ contactId, whatsappAccountId }) => {
      socket.to(`contact:${contactId}`).emit('typing:indicator', {
        contactId,
        whatsappAccountId,
        isTyping: false,
        userId: socket.userId,
      });
    });

    // Heartbeat/ping
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Disconnect handler
    socket.on('disconnect', (reason) => {
      logger.info(
        `Client disconnected: ${socket.id} (User: ${socket.userEmail}, Reason: ${reason})`
      );
    });

    // Error handler
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Error handler for Socket.io server
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.io connection error:', {
      code: err.code,
      message: err.message,
      context: err.context,
    });
  });

  logger.info('✅ Socket.io server initialized');
  return io;
};

/**
 * Get Socket.io server instance
 * @returns {Object} Socket.io server instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO first.');
  }
  return io;
};

/**
 * Emit event to user-specific room
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToUser = (userId, event, data) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit event');
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
  logger.debug(`Emitted ${event} to user:${userId}`);
};

/**
 * Emit event to WhatsApp account room
 * @param {string} accountId - WhatsApp account ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToWhatsAppAccount = (accountId, event, data) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit event');
    return;
  }
  io.to(`whatsapp:${accountId}`).emit(event, data);
  logger.debug(`Emitted ${event} to whatsapp:${accountId}`);
};

/**
 * Emit event to campaign room
 * @param {string} campaignId - Campaign ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToCampaign = (campaignId, event, data) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit event');
    return;
  }
  io.to(`campaign:${campaignId}`).emit(event, data);
  logger.debug(`Emitted ${event} to campaign:${campaignId}`);
};

/**
 * Emit event to contact room
 * @param {string} contactId - Contact ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToContact = (contactId, event, data) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit event');
    return;
  }
  io.to(`contact:${contactId}`).emit(event, data);
  logger.debug(`Emitted ${event} to contact:${contactId}`);
};

/**
 * Broadcast event to all connected clients
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const broadcastEvent = (event, data) => {
  if (!io) {
    logger.warn('Socket.io not initialized, cannot emit event');
    return;
  }
  io.emit(event, data);
  logger.debug(`Broadcasted ${event} to all clients`);
};

/**
 * Get connection statistics
 * @returns {Object} Connection statistics
 */
export const getConnectionStats = async () => {
  if (!io) {
    return { connected: 0, rooms: [] };
  }

  const sockets = await io.fetchSockets();
  const rooms = new Set();

  sockets.forEach((socket) => {
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        rooms.add(room);
      }
    });
  });

  return {
    connected: sockets.length,
    rooms: Array.from(rooms),
  };
};

/**
 * Close Socket.io server
 */
export const closeSocketIO = async () => {
  if (io) {
    await io.close();
    io = null;
    logger.info('Socket.io server closed');
  }
};

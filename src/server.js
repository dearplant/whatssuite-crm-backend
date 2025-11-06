import dotenv from 'dotenv';
import { createServer } from 'http';
import app from './app.js';
import { logger } from './utils/logger.js';
import { initializeRedis, closeRedis } from './config/redis.js';
import { closeAllQueues } from './queues/index.js';
import { initializeSocketIO, closeSocketIO } from './config/socket.config.js';
import whatsappService from './services/whatsappService.js';
import './workers/messageWorker.js'; // Initialize message worker
import './workers/contactImportWorker.js'; // Initialize contact import worker
import './workers/flowWorker.js'; // Initialize flow worker
import './workers/chatbotWorker.js'; // Initialize chatbot worker
import './workers/transcriptionWorker.js'; // Initialize transcription worker
import { initializeCampaignWorker } from './workers/campaignWorker.js'; // Initialize campaign worker
import { initializeTriggers } from './services/flowTriggers.js';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize Redis and start server
const startServer = async () => {
  try {
    // Initialize Redis connection
    await initializeRedis();
    logger.info('✅ Redis initialized successfully');

    // Create HTTP server
    const httpServer = createServer(app);

    // Initialize Socket.io
    initializeSocketIO(httpServer);
    logger.info('✅ Socket.io initialized successfully');

    // Initialize campaign worker
    initializeCampaignWorker();
    logger.info('✅ Campaign worker initialized successfully');

    // Initialize flow triggers
    try {
      await initializeTriggers();
      logger.info('✅ Flow triggers initialized successfully');
    } catch (error) {
      logger.warn('⚠️  Failed to initialize flow triggers:', error.message);
    }

    // Restore active WhatsApp connections
    try {
      await whatsappService.restoreActiveConnections();
      logger.info('✅ WhatsApp connections restored');
    } catch (error) {
      logger.warn('⚠️  Failed to restore WhatsApp connections:', error.message);
    }

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
    });

    return httpServer;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
const server = await startServer();

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Close HTTP server
  server.close(async () => {
    logger.info('HTTP server closed');

    try {
      // Close Socket.io
      await closeSocketIO();
      logger.info('Socket.io closed');

      // Close all Bull queues
      await closeAllQueues();
      logger.info('All queues closed');

      // Close Redis connection
      await closeRedis();
      logger.info('Redis connection closed');

      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default server;

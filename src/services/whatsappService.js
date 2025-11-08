import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import {
  emitWhatsAppConnectionStatus,
  emitWhatsAppQRCode,
  emitWhatsAppReady,
  emitWhatsAppDisconnected,
} from '../sockets/index.js';

// Store active WhatsApp clients
const activeClients = new Map();

// Encryption configuration
const ENCRYPTION_KEY = Buffer.from(
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'),
  'hex'
);
const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypt session data
 */
function encryptSessionData(data) {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  } catch (error) {
    logger.error('Error encrypting session data:', error);
    throw new Error('Failed to encrypt session data');
  }
}

/**
 * Decrypt session data
 */
function decryptSessionData(encryptedData) {
  try {
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(encryptedData.iv, 'hex')
    );

    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    logger.error('Error decrypting session data:', error);
    throw new Error('Failed to decrypt session data');
  }
}

/**
 * Initialize WhatsApp client with automatic reconnection
 */
async function initializeClient(accountId, userId) {
  try {
    logger.info(`Initializing WhatsApp client for account ${accountId}`);

    // Check if client already exists
    if (activeClients.has(accountId)) {
      logger.info(`Client already exists for account ${accountId}`);
      return activeClients.get(accountId);
    }

    // Create session directory
    const sessionPath = path.join(process.cwd(), 'sessions', accountId);
    await fs.mkdir(sessionPath, { recursive: true });

    // Initialize client with LocalAuth
    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: accountId,
        dataPath: sessionPath,
      }),
      puppeteer: {
        headless: true,
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
        ],
      },
    });

    // Store client metadata
    client.accountId = accountId;
    client.userId = userId;
    client.reconnectAttempts = 0;
    client.maxReconnectAttempts = 5;

    // Set up event handlers
    setupClientEventHandlers(client);

    // Store client
    activeClients.set(accountId, client);

    return client;
  } catch (error) {
    logger.error(`Error initializing WhatsApp client for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Set up event handlers for WhatsApp client
 */
function setupClientEventHandlers(client) {
  const { accountId } = client;

  // QR Code generation
  client.on('qr', async (qr) => {
    try {
      logger.info(`QR code generated for account ${accountId}`);

      // Display QR in terminal for development
      if (process.env.NODE_ENV === 'development') {
        qrcode.generate(qr, { small: true });
      }

      // Store QR code in database with 2-minute expiry
      const qrCodeExpiry = new Date(Date.now() + 2 * 60 * 1000);

      await prisma.whatsapp_accounts.update({
        where: { id: accountId },
        data: {
          qrCode: qr,
          qrCodeExpiry,
          connectionStatus: 'Connecting',
        },
      });

      // Emit Socket.io event
      emitWhatsAppQRCode(client.userId, accountId, qr, qrCodeExpiry);

      logger.info(`QR code stored for account ${accountId}, expires at ${qrCodeExpiry}`);
    } catch (error) {
      logger.error(`Error handling QR code for account ${accountId}:`, error);
    }
  });

  // Client ready
  client.on('ready', async () => {
    try {
      logger.info(`WhatsApp client ready for account ${accountId}`);

      // Get account info
      const info = client.info;

      // Update database
      await prisma.whatsapp_accounts.update({
        where: { id: accountId },
        data: {
          phoneNumber: info.wid.user,
          displayName: info.pushname || 'WhatsApp User',
          connectionStatus: 'Connected',
          healthStatus: 'Healthy',
          lastConnectedAt: new Date(),
          qrCode: null,
          qrCodeExpiry: null,
        },
      });

      // Reset reconnect attempts
      client.reconnectAttempts = 0;

      // Emit Socket.io event
      emitWhatsAppReady(client.userId, accountId, {
        phoneNumber: info.wid.user,
        displayName: info.pushname || 'WhatsApp User',
      });

      logger.info(`Account ${accountId} connected successfully`);
    } catch (error) {
      logger.error(`Error handling ready event for account ${accountId}:`, error);
    }
  });

  // Authentication success
  client.on('authenticated', async () => {
    try {
      logger.info(`WhatsApp client authenticated for account ${accountId}`);

      await prisma.whatsapp_accounts.update({
        where: { id: accountId },
        data: {
          connectionStatus: 'Connected',
          qrCode: null,
          qrCodeExpiry: null,
        },
      });

      // Emit Socket.io event
      emitWhatsAppConnectionStatus(client.userId, accountId, 'Connected', {
        message: 'WhatsApp authenticated successfully',
      });
    } catch (error) {
      logger.error(`Error handling authenticated event for account ${accountId}:`, error);
    }
  });

  // Authentication failure
  client.on('auth_failure', async (message) => {
    try {
      logger.error(`Authentication failed for account ${accountId}:`, message);

      await prisma.whatsapp_accounts.update({
        where: { id: accountId },
        data: {
          connectionStatus: 'Failed',
          healthStatus: 'Critical',
        },
      });

      // Emit Socket.io event
      emitWhatsAppConnectionStatus(client.userId, accountId, 'Failed', {
        message: 'Authentication failed',
        error: message,
      });

      // Remove client from active clients
      activeClients.delete(accountId);
    } catch (error) {
      logger.error(`Error handling auth_failure for account ${accountId}:`, error);
    }
  });

  // Disconnected
  client.on('disconnected', async (reason) => {
    try {
      logger.warn(`WhatsApp client disconnected for account ${accountId}. Reason: ${reason}`);

      await prisma.whatsapp_accounts.update({
        where: { id: accountId },
        data: {
          connectionStatus: 'Disconnected',
          lastDisconnectedAt: new Date(),
        },
      });

      // Emit Socket.io event
      emitWhatsAppDisconnected(client.userId, accountId, reason);

      // Attempt automatic reconnection with exponential backoff
      if (client.reconnectAttempts < client.maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, client.reconnectAttempts), 30000);
        client.reconnectAttempts++;

        logger.info(
          `Attempting reconnection ${client.reconnectAttempts}/${client.maxReconnectAttempts} for account ${accountId} in ${delay}ms`
        );

        // Emit reconnection attempt status
        emitWhatsAppConnectionStatus(client.userId, accountId, 'Reconnecting', {
          attempt: client.reconnectAttempts,
          maxAttempts: client.maxReconnectAttempts,
          nextAttemptIn: delay,
        });

        setTimeout(async () => {
          try {
            await client.initialize();
          } catch (error) {
            logger.error(`Reconnection attempt failed for account ${accountId}:`, error);
          }
        }, delay);
      } else {
        logger.error(`Max reconnection attempts reached for account ${accountId}`);
        await prisma.whatsapp_accounts.update({
          where: { id: accountId },
          data: {
            healthStatus: 'Critical',
          },
        });
        emitWhatsAppConnectionStatus(client.userId, accountId, 'Failed', {
          message: 'Max reconnection attempts reached',
        });
        activeClients.delete(accountId);
      }
    } catch (error) {
      logger.error(`Error handling disconnected event for account ${accountId}:`, error);
    }
  });

  // Loading screen
  client.on('loading_screen', (percent, message) => {
    logger.info(`Loading screen for account ${accountId}: ${percent}% - ${message}`);
  });

  // Change state
  client.on('change_state', (state) => {
    logger.info(`State changed for account ${accountId}: ${state}`);
  });

  // Incoming messages
  client.on('message', async (msg) => {
    try {
      logger.info(`Incoming message for account ${accountId}`, {
        from: msg.from,
        type: msg.type,
        hasMedia: msg.hasMedia,
      });

      // Import messageService dynamically to avoid circular dependency
      const { default: messageService } = await import('./messageService.js');

      // Handle incoming message
      await messageService.handleIncomingMessage({
        whatsappAccountId: accountId,
        from: msg.from.replace('@c.us', ''),
        type: msg.type === 'chat' ? 'Text' : msg.type.charAt(0).toUpperCase() + msg.type.slice(1),
        content: msg.body || '',
        mediaUrl: msg.hasMedia ? await getMediaUrl(msg) : null,
        whatsappMessageId: msg.id._serialized,
        timestamp: msg.timestamp * 1000, // Convert to milliseconds
      });
    } catch (error) {
      logger.error(`Error handling incoming message for account ${accountId}:`, error);
    }
  });

  // Message acknowledgement (delivery and read receipts)
  client.on('message_ack', async (msg, ack) => {
    try {
      // ack values: 1 = sent, 2 = delivered, 3 = read, 4 = played (for voice messages)
      let status;
      if (ack === 1) {
        status = 'Sent';
      } else if (ack === 2) {
        status = 'Delivered';
      } else if (ack === 3 || ack === 4) {
        status = 'Read';
      }

      if (status) {
        // Import messageService dynamically to avoid circular dependency
        const { default: messageService } = await import('./messageService.js');
        await messageService.updateMessageStatus(msg.id._serialized, status);
      }
    } catch (error) {
      logger.error(`Error handling message ack for account ${accountId}:`, error);
    }
  });
}

/**
 * Get media URL from message
 */
async function getMediaUrl(msg) {
  try {
    const media = await msg.downloadMedia();
    if (!media) {
      return null;
    }

    // Import file upload utility
    const { uploadToS3 } = await import('../utils/fileUpload.js');

    // Convert media to buffer
    const buffer = Buffer.from(media.data, 'base64');

    // Create file object
    const file = {
      buffer,
      mimetype: media.mimetype,
      originalname: media.filename || `media_${Date.now()}`,
      size: buffer.length,
    };

    // Upload to S3
    const result = await uploadToS3(file, 'messages');
    return result.url;
  } catch (error) {
    logger.error('Error getting media URL:', error);
    return null;
  }
}

/**
 * Connect WhatsApp account
 */
async function connectWhatsAppAccount(userId, teamId, accountData) {
  try {
    logger.info(`Connecting WhatsApp account for user ${userId}`);

    // Create WhatsApp account record
    const accountId = crypto.randomUUID();
    const account = await prisma.whatsapp_accounts.create({
      data: {
        id: accountId,
        user_id: userId,
        team_id: teamId,
        name: accountData.displayName || 'WhatsApp Account',
        phone: accountData.phoneNumber || 'pending',
        type: 'business',
        status: 'disconnected',
        health_score: 100,
        daily_message_limit: 1000,
        messages_sent_today: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    // Initialize client
    const client = await initializeClient(account.id, userId);

    // Start client
    await client.initialize();

    return {
      accountId: account.id,
      status: 'Connecting',
      message: 'QR code will be generated shortly. Please scan it with your WhatsApp mobile app.',
    };
  } catch (error) {
    logger.error('Error connecting WhatsApp account:', error);
    throw error;
  }
}

/**
 * Disconnect WhatsApp account
 */
async function disconnectWhatsAppAccount(accountId) {
  try {
    logger.info(`Disconnecting WhatsApp account ${accountId}`);

    const client = activeClients.get(accountId);

    if (client) {
      // Destroy client
      await client.destroy();

      // Remove from active clients
      activeClients.delete(accountId);
    }

    // Update database
    await prisma.whatsapp_accounts.update({
      where: { id: accountId },
      data: {
        connectionStatus: 'Disconnected',
        lastDisconnectedAt: new Date(),
        qrCode: null,
        qrCodeExpiry: null,
      },
    });

    // Clean up session directory
    const sessionPath = path.join(process.cwd(), 'sessions', accountId);
    try {
      await fs.rm(sessionPath, { recursive: true, force: true });
    } catch (error) {
      logger.warn(`Failed to clean up session directory for account ${accountId}:`, error);
    }

    return {
      accountId,
      status: 'Disconnected',
      message: 'WhatsApp account disconnected successfully',
    };
  } catch (error) {
    logger.error(`Error disconnecting WhatsApp account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Get QR code for account
 */
async function getQRCode(accountId) {
  try {
    const account = await prisma.whatsapp_accounts.findUnique({
      where: { id: accountId },
      select: {
        qrCode: true,
        qrCodeExpiry: true,
        connectionStatus: true,
      },
    });

    if (!account) {
      throw new Error('WhatsApp account not found');
    }

    if (!account.qrCode) {
      throw new Error('QR code not available. Please initiate connection first.');
    }

    if (account.qrCodeExpiry && new Date() > account.qrCodeExpiry) {
      throw new Error('QR code expired. Please request a new one.');
    }

    return {
      qrCode: account.qrCode,
      expiresAt: account.qrCodeExpiry,
      status: account.connectionStatus,
    };
  } catch (error) {
    logger.error(`Error getting QR code for account ${accountId}:`, error);
    throw error;
  }
}

/**
 * Get account health status
 */
async function getAccountHealth(accountId) {
  try {
    const account = await prisma.whatsapp_accounts.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        phoneNumber: true,
        displayName: true,
        connectionStatus: true,
        healthStatus: true,
        messagesSentToday: true,
        messagesReceivedToday: true,
        dailyLimit: true,
        lastConnectedAt: true,
        lastDisconnectedAt: true,
        isActive: true,
      },
    });

    if (!account) {
      throw new Error('WhatsApp account not found');
    }

    const client = activeClients.get(accountId);
    const isClientActive = client && client.info;

    // Calculate health metrics
    const usagePercentage = (account.messagesSentToday / account.dailyLimit) * 100;
    let healthStatus = account.healthStatus;

    if (usagePercentage > 90) {
      healthStatus = 'Critical';
    } else if (usagePercentage > 70) {
      healthStatus = 'Warning';
    } else if (account.connectionStatus === 'Connected' && isClientActive) {
      healthStatus = 'Healthy';
    }

    // Update health status if changed
    if (healthStatus !== account.healthStatus) {
      await prisma.whatsapp_accounts.update({
        where: { id: accountId },
        data: { healthStatus },
      });
    }

    return {
      ...account,
      healthStatus,
      usagePercentage: Math.round(usagePercentage),
      isClientActive,
      clientInfo: isClientActive ? client.info : null,
    };
  } catch (error) {
    logger.error(`Error getting account health for ${accountId}:`, error);
    throw error;
  }
}

/**
 * Get all WhatsApp accounts for a user
 */
async function getUserWhatsAppAccounts(userId) {
  try {
    const accounts = await prisma.whatsapp_accounts.findMany({
      where: { user_id: userId },
      select: {
        id: true,
        phone: true,
        name: true,
        status: true,
        health_score: true,
        messages_sent_today: true,
        daily_message_limit: true,
        last_connected_at: true,
        is_active: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return accounts;
  } catch (error) {
    logger.error(`Error getting WhatsApp accounts for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get active client for account
 */
function getActiveClient(accountId) {
  return activeClients.get(accountId);
}

/**
 * Check if account is connected
 */
function isAccountConnected(accountId) {
  const client = activeClients.get(accountId);
  return client && client.info;
}

/**
 * Restore active connections on server start
 */
async function restoreActiveConnections() {
  try {
    logger.info('Restoring active WhatsApp connections...');

    // TODO: Fix field name mismatches between code and database schema
    // The database uses snake_case (status, is_active) but code expects camelCase
    // Skipping restoration until schema is aligned
    logger.warn('WhatsApp connection restoration temporarily disabled due to schema mismatch');
    return;

    const connectedAccounts = await prisma.whatsapp_accounts.findMany({
      where: {
        status: 'Connected',
        is_active: true,
      },
    });

    logger.info(`Found ${connectedAccounts.length} connected accounts to restore`);

    for (const account of connectedAccounts) {
      try {
        const client = await initializeClient(account.id, account.userId);
        await client.initialize();
        logger.info(`Restored connection for account ${account.id}`);
      } catch (error) {
        logger.error(`Failed to restore connection for account ${account.id}:`, error);
        await prisma.whatsapp_accounts.update({
          where: { id: account.id },
          data: {
            connectionStatus: 'Disconnected',
            healthStatus: 'Critical',
          },
        });
      }
    }

    logger.info('Active connections restoration complete');
  } catch (error) {
    logger.error('Error restoring active connections:', error);
  }
}

/**
 * Cleanup inactive clients
 */
async function cleanupInactiveClients() {
  try {
    logger.info('Cleaning up inactive WhatsApp clients...');

    for (const [accountId, client] of activeClients.entries()) {
      if (!client.info) {
        logger.info(`Removing inactive client for account ${accountId}`);
        try {
          await client.destroy();
        } catch (error) {
          logger.warn(`Error destroying client for account ${accountId}:`, error);
        }
        activeClients.delete(accountId);
      }
    }

    logger.info('Inactive clients cleanup complete');
  } catch (error) {
    logger.error('Error cleaning up inactive clients:', error);
  }
}

/**
 * Reset daily message counters (should be called by cron job)
 */
async function resetDailyMessageCounters() {
  try {
    logger.info('Resetting daily message counters...');

    await prisma.whatsapp_accounts.updateMany({
      data: {
        messagesSentToday: 0,
        messagesReceivedToday: 0,
      },
    });

    logger.info('Daily message counters reset successfully');
  } catch (error) {
    logger.error('Error resetting daily message counters:', error);
  }
}

/**
 * Send WhatsApp message (used by message worker)
 */
async function sendMessage(messageData) {
  try {
    const { whatsappAccountId, to, type, content, mediaUrl } = messageData;

    // Get active client
    const client = activeClients.get(whatsappAccountId);
    if (!client || !client.info) {
      throw new Error('WhatsApp client is not active');
    }

    // Format phone number for WhatsApp
    const chatId = to.includes('@') ? to : `${to}@c.us`;

    // Send message via WhatsApp client
    let sentMessage;
    if (type === 'Text' || !type) {
      sentMessage = await client.sendMessage(chatId, content);
    } else if (type === 'Image' && mediaUrl) {
      const { MessageMedia } = await import('whatsapp-web.js');
      const media = await MessageMedia.fromUrl(mediaUrl);
      sentMessage = await client.sendMessage(chatId, media, { caption: content || '' });
    } else if (type === 'Document' && mediaUrl) {
      const { MessageMedia } = await import('whatsapp-web.js');
      const media = await MessageMedia.fromUrl(mediaUrl);
      sentMessage = await client.sendMessage(chatId, media, { caption: content || '' });
    } else if (type === 'Audio' && mediaUrl) {
      const { MessageMedia } = await import('whatsapp-web.js');
      const media = await MessageMedia.fromUrl(mediaUrl);
      sentMessage = await client.sendMessage(chatId, media, { sendAudioAsVoice: true });
    } else if (type === 'Video' && mediaUrl) {
      const { MessageMedia } = await import('whatsapp-web.js');
      const media = await MessageMedia.fromUrl(mediaUrl);
      sentMessage = await client.sendMessage(chatId, media, { caption: content || '' });
    }

    logger.info(`Message sent via WhatsApp`, {
      whatsappAccountId,
      to,
      type,
      whatsappMessageId: sentMessage.id._serialized,
    });

    return {
      whatsappMessageId: sentMessage.id._serialized,
      timestamp: sentMessage.timestamp,
    };
  } catch (error) {
    logger.error('Error in sendMessage:', error);
    throw error;
  }
}

/**
 * Get messages with filters
 */
async function getMessages(userId, filters = {}) {
  try {
    const {
      accountId,
      contactId,
      direction,
      type,
      status,
      startDate,
      endDate,
      limit = 50,
      offset = 0,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build where clause
    const where = {
      userId,
    };

    if (accountId) {
      where.whatsappAccountId = accountId;
    }

    if (contactId) {
      where.contactId = contactId;
    }

    if (direction) {
      where.direction = direction;
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Get total count
    const total = await prisma.message.count({ where });

    // Get messages
    const messages = await prisma.message.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        whatsappAccount: {
          select: {
            id: true,
            phoneNumber: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    return {
      messages,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    };
  } catch (error) {
    logger.error('Error getting messages:', error);
    throw error;
  }
}

export default {
  connectWhatsAppAccount,
  disconnectWhatsAppAccount,
  getQRCode,
  getAccountHealth,
  getUserWhatsAppAccounts,
  getActiveClient,
  isAccountConnected,
  restoreActiveConnections,
  cleanupInactiveClients,
  resetDailyMessageCounters,
  sendMessage,
  getMessages,
  encryptSessionData,
  decryptSessionData,
};

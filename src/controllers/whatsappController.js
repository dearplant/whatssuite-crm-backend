import whatsappService from '../services/whatsappService.js';
import prisma from '../config/database.js';
import logger from '../utils/logger.js';

/**
 * Connect WhatsApp account
 * POST /api/v1/whatsapp/connect
 */
export async function connectAccount(req, res) {
  try {
    const userId = req.user.id;
    const { phoneNumber, displayName } = req.body;

    const result = await whatsappService.connectWhatsAppAccount(userId, {
      phoneNumber,
      displayName,
    });

    logger.info(`WhatsApp connection initiated for user ${userId}`);

    return res.status(202).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in connectAccount controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to connect WhatsApp account',
      details: error.message,
    });
  }
}

/**
 * Disconnect WhatsApp account
 * POST /api/v1/whatsapp/disconnect/:accountId
 */
export async function disconnectAccount(req, res) {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    // Verify account belongs to user
    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: accountId,
        user_id: userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'WhatsApp account not found',
      });
    }

    const result = await whatsappService.disconnectWhatsAppAccount(accountId);

    logger.info(`WhatsApp account ${accountId} disconnected by user ${userId}`);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in disconnectAccount controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to disconnect WhatsApp account',
      details: error.message,
    });
  }
}

/**
 * Get QR code for account
 * GET /api/v1/whatsapp/qr-code/:accountId
 */
export async function getQRCode(req, res) {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    // Verify account belongs to user
    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: accountId,
        user_id: userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'WhatsApp account not found',
      });
    }

    const result = await whatsappService.getQRCode(accountId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in getQRCode controller:', error);
    return res.status(error.message.includes('not found') ? 404 : 400).json({
      error: error.message.includes('not found') ? 'NotFound' : 'BadRequest',
      message: error.message,
    });
  }
}

/**
 * Get all WhatsApp accounts for user
 * GET /api/v1/whatsapp/accounts
 */
export async function getAccounts(req, res) {
  try {
    const userId = req.user.id;

    const accounts = await whatsappService.getUserWhatsAppAccounts(userId);

    return res.status(200).json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error) {
    logger.error('Error in getAccounts controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve WhatsApp accounts',
      details: error.message,
    });
  }
}

/**
 * Get account health status
 * GET /api/v1/whatsapp/health/:accountId
 */
export async function getAccountHealth(req, res) {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    // Verify account belongs to user
    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: accountId,
        user_id: userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'WhatsApp account not found',
      });
    }

    const health = await whatsappService.getAccountHealth(accountId);

    return res.status(200).json({
      success: true,
      data: health,
    });
  } catch (error) {
    logger.error('Error in getAccountHealth controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve account health',
      details: error.message,
    });
  }
}

/**
 * Get account details
 * GET /api/v1/whatsapp/accounts/:accountId
 */
export async function getAccountDetails(req, res) {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: accountId,
        user_id: userId,
      },
      include: {
        _count: {
          select: {
            messages: true,
            campaigns: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'WhatsApp account not found',
      });
    }

    // Check if client is active
    const isConnected = whatsappService.isAccountConnected(accountId);

    return res.status(200).json({
      success: true,
      data: {
        ...account,
        isConnected,
      },
    });
  } catch (error) {
    logger.error('Error in getAccountDetails controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve account details',
      details: error.message,
    });
  }
}

/**
 * Send WhatsApp message
 * POST /api/v1/whatsapp/send-message
 */
export async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { accountId, contactId, type, content, mediaUrl } = req.body;

    // Verify account belongs to user
    const account = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: accountId,
        user_id: userId,
      },
    });

    if (!account) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'WhatsApp account not found',
      });
    }

    const message = await whatsappService.sendMessage(accountId, userId, {
      contactId,
      type,
      content,
      mediaUrl,
    });

    logger.info(`Message sent by user ${userId} from account ${accountId}`);

    return res.status(202).json({
      success: true,
      data: message,
      message: 'Message queued for sending',
    });
  } catch (error) {
    logger.error('Error in sendMessage controller:', error);

    const statusCode = error.message.includes('not found')
      ? 404
      : error.message.includes('not connected') || error.message.includes('limit reached')
        ? 400
        : 500;

    return res.status(statusCode).json({
      error:
        statusCode === 404 ? 'NotFound' : statusCode === 400 ? 'BadRequest' : 'InternalServerError',
      message: error.message,
    });
  }
}

/**
 * Get messages with filters
 * GET /api/v1/whatsapp/messages
 */
export async function getMessages(req, res) {
  try {
    const userId = req.user.id;
    const filters = {
      accountId: req.query.accountId,
      contactId: req.query.contactId,
      direction: req.query.direction,
      type: req.query.type,
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      limit: req.query.limit || 50,
      offset: req.query.offset || 0,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
    };

    const result = await whatsappService.getMessages(userId, filters);

    return res.status(200).json({
      success: true,
      data: result.messages,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in getMessages controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve messages',
      details: error.message,
    });
  }
}

export default {
  connectAccount,
  disconnectAccount,
  getQRCode,
  getAccounts,
  getAccountHealth,
  getAccountDetails,
  sendMessage,
  getMessages,
};

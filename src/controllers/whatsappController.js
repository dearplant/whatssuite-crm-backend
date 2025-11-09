import whatsappService from '../services/whatsappService.js';
import logger from '../utils/logger.js';
import { isApiError, handleError } from '../utils/errors.js';

/**
 * Connect WhatsApp account
 * POST /api/v1/whatsapp/connect
 */
export async function connectAccount(req, res) {
  try {
    const userId = req.user.id;
    const teamId = req.user.teamId;
    const { phoneNumber, displayName } = req.body;

    if (!teamId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'User must belong to a team to connect WhatsApp account',
      });
    }

    const result = await whatsappService.connectWhatsAppAccount(userId, teamId, {
      phoneNumber,
      displayName,
    });

    logger.info(`WhatsApp connection initiated for user ${userId}, team ${teamId}`);

    return res.status(202).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in connectAccount controller:', error);
    if (isApiError(error)) {
      return handleError(error, res);
    }
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to connect WhatsApp account',
    });
  }
}

/**
 * Disconnect WhatsApp account
 * POST /api/v1/whatsapp/disconnect/:accountId
 * Note: Account ownership is verified by middleware
 */
export async function disconnectAccount(req, res) {
  try {
    const { accountId } = req.params;
    const userId = req.user.id;

    const result = await whatsappService.disconnectWhatsAppAccount(accountId);

    logger.info(`WhatsApp account ${accountId} disconnected by user ${userId}`);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in disconnectAccount controller:', error);
    if (isApiError(error)) {
      return handleError(error, res);
    }
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to disconnect WhatsApp account',
    });
  }
}

/**
 * Get QR code for account
 * GET /api/v1/whatsapp/qr-code/:accountId
 * Note: Account ownership is verified by middleware
 */
export async function getQRCode(req, res) {
  try {
    const { accountId } = req.params;

    const result = await whatsappService.getQRCode(accountId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Error in getQRCode controller:', error);
    if (isApiError(error)) {
      return handleError(error, res);
    }
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to get QR code',
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
 * Note: Account ownership is verified by middleware
 */
export async function getAccountHealth(req, res) {
  try {
    const { accountId } = req.params;

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
 * Note: Account ownership is verified by middleware
 */
export async function getAccountDetails(req, res) {
  try {
    const { accountId } = req.params;
    
    // Account is already verified by middleware and attached to req.whatsappAccount
    const account = req.whatsappAccount;

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
    if (isApiError(error)) {
      return handleError(error, res);
    }
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to retrieve account details',
    });
  }
}

/**
 * Send WhatsApp message
 * POST /api/v1/whatsapp/send-message
 * Note: Account ownership is verified by middleware
 */
export async function sendMessage(req, res) {
  try {
    const userId = req.user.id;
    const { accountId, contactId, type, content, mediaUrl } = req.body;

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
    
    // Use proper error handling
    if (isApiError(error)) {
      return handleError(error, res);
    }
    
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to send message',
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

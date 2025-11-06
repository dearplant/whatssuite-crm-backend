import express from 'express';
import whatsappController from '../controllers/whatsappController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import {
  validateConnectAccount,
  validateAccountId,
  validateSendMessage,
  validateGetMessages,
} from '../validators/whatsappValidator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/whatsapp/connect
 * @desc    Connect a new WhatsApp account
 * @access  Private (Owner, Admin)
 */
router.post(
  '/connect',
  authorize('whatsapp:connect'),
  validateConnectAccount,
  whatsappController.connectAccount
);

/**
 * @route   POST /api/v1/whatsapp/disconnect/:accountId
 * @desc    Disconnect a WhatsApp account
 * @access  Private (Owner, Admin)
 */
router.post(
  '/disconnect/:accountId',
  authorize('whatsapp:disconnect'),
  validateAccountId,
  whatsappController.disconnectAccount
);

/**
 * @route   GET /api/v1/whatsapp/qr-code/:accountId
 * @desc    Get QR code for WhatsApp account connection
 * @access  Private (Owner, Admin, Manager, Agent)
 */
router.get(
  '/qr-code/:accountId',
  authorize('whatsapp:read'),
  validateAccountId,
  whatsappController.getQRCode
);

/**
 * @route   GET /api/v1/whatsapp/accounts
 * @desc    Get all WhatsApp accounts for the authenticated user
 * @access  Private
 */
router.get('/accounts', authorize('whatsapp:read'), whatsappController.getAccounts);

/**
 * @route   GET /api/v1/whatsapp/accounts/:accountId
 * @desc    Get details of a specific WhatsApp account
 * @access  Private
 */
router.get(
  '/accounts/:accountId',
  authorize('whatsapp:read'),
  validateAccountId,
  whatsappController.getAccountDetails
);

/**
 * @route   GET /api/v1/whatsapp/health/:accountId
 * @desc    Get health status of a WhatsApp account
 * @access  Private
 */
router.get(
  '/health/:accountId',
  authorize('whatsapp:read'),
  validateAccountId,
  whatsappController.getAccountHealth
);

/**
 * @route   POST /api/v1/whatsapp/send-message
 * @desc    Send a WhatsApp message
 * @access  Private (Owner, Admin, Manager, Agent)
 */
router.post(
  '/send-message',
  authorize('messages:send'),
  validateSendMessage,
  whatsappController.sendMessage
);

/**
 * @route   GET /api/v1/whatsapp/messages
 * @desc    Get WhatsApp messages with filters
 * @access  Private
 */
router.get(
  '/messages',
  authorize('whatsapp:read'),
  validateGetMessages,
  whatsappController.getMessages
);

export default router;

/**
 * Message Routes
 * API endpoints for message operations
 */

import express from 'express';
import messageController from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validateSendMessage, validateGetMessages } from '../validators/messageValidator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/messages
 * @desc    Send a message
 * @access  Private (messages.create permission)
 */
router.post(
  '/',
  authorize('messages.create'),
  validateSendMessage,
  messageController.sendMessage
);

/**
 * @route   GET /api/v1/messages
 * @desc    Get messages with filters
 * @access  Private (messages.read permission)
 */
router.get(
  '/',
  authorize('messages.read'),
  validateGetMessages,
  messageController.getMessages
);

/**
 * @route   GET /api/v1/messages/statistics
 * @desc    Get message statistics
 * @access  Private (messages.read permission)
 */
router.get(
  '/statistics',
  authorize('messages.read'),
  messageController.getStatistics
);

/**
 * @route   GET /api/v1/messages/:id
 * @desc    Get message by ID
 * @access  Private (messages.read permission)
 */
router.get(
  '/:id',
  authorize('messages.read'),
  messageController.getMessageById
);

/**
 * @route   PUT /api/v1/messages/:id/read
 * @desc    Mark message as read
 * @access  Private (messages.update permission)
 */
router.put(
  '/:id/read',
  authorize('messages.update'),
  messageController.markAsRead
);

/**
 * @route   POST /api/v1/messages/:id/retry
 * @desc    Retry failed message
 * @access  Private (messages.create permission)
 */
router.post(
  '/:id/retry',
  authorize('messages.create'),
  messageController.retryMessage
);

export default router;

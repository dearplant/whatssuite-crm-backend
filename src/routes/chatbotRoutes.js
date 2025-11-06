import express from 'express';
import chatbotController from '../controllers/chatbotController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import {
  createChatbotSchema,
  updateChatbotSchema,
  testChatbotSchema,
  getChatbotsQuerySchema,
} from '../validators/chatbotValidator.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/v1/ai/chatbots
 * @desc    Create a new chatbot
 * @access  Private (Owner, Admin, Manager)
 */
router.post(
  '/',
  authorize('chatbots:create'),
  validateBody(createChatbotSchema),
  chatbotController.createChatbot
);

/**
 * @route   GET /api/v1/ai/chatbots
 * @desc    Get all chatbots for the authenticated user
 * @access  Private
 */
router.get(
  '/',
  authorize('chatbots:read'),
  validateQuery(getChatbotsQuerySchema),
  chatbotController.getChatbots
);

/**
 * @route   GET /api/v1/ai/chatbots/:id
 * @desc    Get a single chatbot by ID
 * @access  Private
 */
router.get(
  '/:id',
  authorize('chatbots:read'),
  chatbotController.getChatbotById
);

/**
 * @route   PUT /api/v1/ai/chatbots/:id
 * @desc    Update a chatbot
 * @access  Private (Owner, Admin, Manager)
 */
router.put(
  '/:id',
  authorize('chatbots:update'),
  validateBody(updateChatbotSchema),
  chatbotController.updateChatbot
);

/**
 * @route   POST /api/v1/ai/chatbots/:id/activate
 * @desc    Activate a chatbot
 * @access  Private (Owner, Admin, Manager)
 */
router.post(
  '/:id/activate',
  authorize('chatbots:update'),
  chatbotController.activateChatbot
);

/**
 * @route   POST /api/v1/ai/chatbots/:id/deactivate
 * @desc    Deactivate a chatbot
 * @access  Private (Owner, Admin, Manager)
 */
router.post(
  '/:id/deactivate',
  authorize('chatbots:update'),
  chatbotController.deactivateChatbot
);

/**
 * @route   POST /api/v1/ai/chatbots/:id/test
 * @desc    Test a chatbot with a sample message
 * @access  Private
 */
router.post(
  '/:id/test',
  authorize('chatbots:read'),
  validateBody(testChatbotSchema),
  chatbotController.testChatbot
);

/**
 * @route   DELETE /api/v1/ai/chatbots/:id
 * @desc    Delete a chatbot
 * @access  Private (Owner, Admin)
 */
router.delete(
  '/:id',
  authorize('chatbots:delete'),
  chatbotController.deleteChatbot
);

/**
 * @route   GET /api/v1/ai/chatbots/:id/conversations
 * @desc    Get all conversations for a chatbot
 * @access  Private
 */
router.get(
  '/:id/conversations',
  authorize('chatbots:read'),
  chatbotController.getChatbotConversations
);

/**
 * @route   GET /api/v1/ai/chatbots/:id/stats
 * @desc    Get conversation statistics for a chatbot
 * @access  Private
 */
router.get(
  '/:id/stats',
  authorize('chatbots:read'),
  chatbotController.getChatbotStats
);

export default router;

import express from 'express';
import chatbotController from '../controllers/chatbotController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validation.js';
import Joi from 'joi';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Validation schema for handoff request
 */
const handoffSchema = Joi.object({
  reason: Joi.string().max(500).optional().default('Manual handoff'),
});

/**
 * @route   GET /api/v1/ai/conversations/:id
 * @desc    Get conversation by ID with messages
 * @access  Private
 */
router.get('/:id', authorize('chatbots:read'), chatbotController.getConversation);

/**
 * @route   POST /api/v1/ai/conversations/:id/handoff
 * @desc    Handoff conversation to human agent
 * @access  Private (Owner, Admin, Manager)
 */
router.post(
  '/:id/handoff',
  authorize('chatbots:update'),
  validateBody(handoffSchema),
  chatbotController.handoffConversation
);

export default router;

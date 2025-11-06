import express from 'express';
import aiController from '../controllers/aiController.js';
import chatbotRoutes from './chatbotRoutes.js';
import conversationRoutes from './conversationRoutes.js';
import transcriptionRoutes from './transcriptionRoutes.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import {
  validate,
  createProviderSchema,
  updateProviderSchema,
  testProviderSchema,
} from '../validators/aiValidator.js';

const router = express.Router();

/**
 * All AI routes require authentication
 */
router.use(authenticate);

/**
 * POST /api/v1/ai/providers
 * Create or update AI provider configuration
 * Requires: ai:manage permission
 */
router.post(
  '/providers',
  authorize('ai:manage'),
  validate(createProviderSchema),
  aiController.createProvider
);

/**
 * GET /api/v1/ai/providers
 * Get all AI providers for authenticated user
 * Requires: ai:read permission
 */
router.get('/providers', authorize('ai:read'), aiController.getProviders);

/**
 * GET /api/v1/ai/providers/:id
 * Get single AI provider by ID
 * Requires: ai:read permission
 */
router.get('/providers/:id', authorize('ai:read'), aiController.getProvider);

/**
 * PUT /api/v1/ai/providers/:id
 * Update AI provider configuration
 * Requires: ai:manage permission
 */
router.put(
  '/providers/:id',
  authorize('ai:manage'),
  validate(updateProviderSchema),
  aiController.updateProvider
);

/**
 * DELETE /api/v1/ai/providers/:id
 * Delete AI provider
 * Requires: ai:manage permission
 */
router.delete('/providers/:id', authorize('ai:manage'), aiController.deleteProvider);

/**
 * POST /api/v1/ai/providers/:id/test
 * Test AI provider with a sample message
 * Requires: ai:manage permission
 */
router.post(
  '/providers/:id/test',
  authorize('ai:manage'),
  validate(testProviderSchema),
  aiController.testProvider
);

/**
 * Chatbot routes
 * All chatbot endpoints are under /api/v1/ai/chatbots
 */
router.use('/chatbots', chatbotRoutes);

/**
 * Conversation routes
 * All conversation endpoints are under /api/v1/ai/conversations
 */
router.use('/conversations', conversationRoutes);

/**
 * Transcription routes
 * Transcription endpoints are under /api/v1/ai/transcribe and /api/v1/ai/transcriptions
 */
router.use('/', transcriptionRoutes);

export default router;

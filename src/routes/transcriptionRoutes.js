import express from 'express';
import transcriptionController from '../controllers/transcriptionController.js';
import { authenticate } from '../middleware/auth.js';
import { authorize } from '../middleware/rbac.js';
import { validate, createTranscriptionSchema } from '../validators/transcriptionValidator.js';

const router = express.Router();

/**
 * All transcription routes require authentication
 */
router.use(authenticate);

/**
 * POST /api/v1/ai/transcribe
 * Create transcription for audio message
 * Requires: ai:read permission
 */
router.post(
  '/transcribe',
  authorize('ai:read'),
  validate(createTranscriptionSchema),
  transcriptionController.createTranscription
);

/**
 * GET /api/v1/ai/transcriptions
 * List transcriptions for authenticated user
 * Requires: ai:read permission
 */
router.get('/transcriptions', authorize('ai:read'), transcriptionController.listTranscriptions);

/**
 * GET /api/v1/ai/transcriptions/:id
 * Get transcription by ID
 * Requires: ai:read permission
 */
router.get('/transcriptions/:id', authorize('ai:read'), transcriptionController.getTranscription);

/**
 * GET /api/v1/ai/transcriptions/message/:messageId
 * Get transcription by message ID
 * Requires: ai:read permission
 */
router.get(
  '/transcriptions/message/:messageId',
  authorize('ai:read'),
  transcriptionController.getTranscriptionByMessage
);

/**
 * GET /api/v1/ai/transcription/providers
 * Get available transcription providers
 * Requires: ai:read permission
 */
router.get('/transcription/providers', authorize('ai:read'), transcriptionController.getProviders);

export default router;

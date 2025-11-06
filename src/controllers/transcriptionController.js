import transcriptionService from '../services/transcription/transcriptionService.js';
import { aiQueue } from '../queues/index.js';
import logger from '../utils/logger.js';

/**
 * Transcription Controller
 * Handles voice transcription HTTP requests
 */

/**
 * Create transcription for audio message
 * POST /api/v1/ai/transcribe
 */
export const createTranscription = async (req, res, next) => {
  try {
    const { messageId, audioUrl, language, provider, triggerChatbot = false } = req.body;
    const userId = req.user.id;

    logger.info(`Creating transcription for message ${messageId}`);

    // Check if transcription already exists
    const existing = await transcriptionService.getTranscriptionByMessageId(messageId);
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Transcription already exists',
        data: existing,
      });
    }

    // Queue transcription job
    const job = await aiQueue.add(
      'transcription',
      {
        userId,
        messageId,
        audioUrl,
        options: {
          language,
          provider,
          triggerChatbot,
        },
      },
      {
        priority: 5,
        attempts: 2,
      }
    );

    logger.info(`Transcription job ${job.id} queued for message ${messageId}`);

    res.status(202).json({
      success: true,
      message: 'Transcription job queued',
      data: {
        jobId: job.id,
        messageId,
        status: 'queued',
      },
    });
  } catch (error) {
    logger.error(`Error creating transcription: ${error.message}`);
    next(error);
  }
};

/**
 * Get transcription by ID
 * GET /api/v1/ai/transcriptions/:id
 */
export const getTranscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info(`Fetching transcription ${id}`);

    const transcription = await transcriptionService.getTranscription(id);

    if (!transcription) {
      return res.status(404).json({
        success: false,
        message: 'Transcription not found',
      });
    }

    // Verify ownership
    if (transcription.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: transcription,
    });
  } catch (error) {
    logger.error(`Error fetching transcription: ${error.message}`);
    next(error);
  }
};

/**
 * Get transcription by message ID
 * GET /api/v1/ai/transcriptions/message/:messageId
 */
export const getTranscriptionByMessage = async (req, res, next) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    logger.info(`Fetching transcription for message ${messageId}`);

    const transcription = await transcriptionService.getTranscriptionByMessageId(messageId);

    if (!transcription) {
      return res.status(404).json({
        success: false,
        message: 'Transcription not found',
      });
    }

    // Verify ownership
    if (transcription.user_id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: transcription,
    });
  } catch (error) {
    logger.error(`Error fetching transcription: ${error.message}`);
    next(error);
  }
};

/**
 * List transcriptions for authenticated user
 * GET /api/v1/ai/transcriptions
 */
export const listTranscriptions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;

    logger.info(`Listing transcriptions for user ${userId}`);

    const transcriptions = await transcriptionService.listTranscriptions(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.status(200).json({
      success: true,
      data: transcriptions,
      count: transcriptions.length,
    });
  } catch (error) {
    logger.error(`Error listing transcriptions: ${error.message}`);
    next(error);
  }
};

/**
 * Get available transcription providers
 * GET /api/v1/ai/transcription/providers
 */
export const getProviders = async (req, res, next) => {
  try {
    const providers = transcriptionService.getAvailableProviders();

    res.status(200).json({
      success: true,
      data: providers,
    });
  } catch (error) {
    logger.error(`Error fetching providers: ${error.message}`);
    next(error);
  }
};

export default {
  createTranscription,
  getTranscription,
  getTranscriptionByMessage,
  listTranscriptions,
  getProviders,
};

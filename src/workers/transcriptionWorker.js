import { aiQueue } from '../queues/index.js';
import transcriptionService from '../services/transcription/transcriptionService.js';
import logger from '../utils/logger.js';
import { emitToUser } from '../sockets/index.js';

/**
 * Transcription Worker
 * Processes voice transcription jobs from the AI queue
 */

/**
 * Process transcription job
 */
const processTranscription = async (job) => {
  const { userId, messageId, audioUrl, options = {} } = job.data;

  try {
    logger.info(
      `[TranscriptionWorker] Processing transcription job ${job.id} for message ${messageId}`
    );

    // Perform transcription
    const transcription = await transcriptionService.transcribe(
      userId,
      messageId,
      audioUrl,
      options
    );

    logger.info(`[TranscriptionWorker] Transcription completed for message ${messageId}`);

    // Emit Socket.io event to user
    emitToUser(userId, 'transcription:completed', {
      messageId,
      transcriptionId: transcription.id,
      transcription: transcription.transcription,
      language: transcription.language,
      duration: transcription.duration,
      provider: transcription.provider,
    });

    // If chatbot integration is enabled, trigger chatbot response
    if (options.triggerChatbot) {
      logger.info(`[TranscriptionWorker] Triggering chatbot for transcribed message ${messageId}`);

      // Add chatbot job to queue
      await aiQueue.add(
        'chatbot-response',
        {
          userId,
          messageId,
          content: transcription.transcription,
          isTranscribed: true,
        },
        {
          priority: 5,
        }
      );
    }

    return {
      success: true,
      transcriptionId: transcription.id,
      transcription: transcription.transcription,
    };
  } catch (error) {
    logger.error(`[TranscriptionWorker] Job ${job.id} failed: ${error.message}`, {
      error: error.stack,
      messageId,
    });

    // Emit error event to user
    emitToUser(userId, 'transcription:failed', {
      messageId,
      error: error.message,
    });

    throw error;
  }
};

// Register transcription worker
aiQueue.process('transcription', 2, processTranscription); // Process 2 jobs concurrently

logger.info('[TranscriptionWorker] Registered successfully');

export default {
  processTranscription,
};

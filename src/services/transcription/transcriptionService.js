import WhisperApiProvider from './providers/whisperApiProvider.js';
import WhisperCppProvider from './providers/whisperCppProvider.js';
import prisma from '../../config/database.js';
import logger from '../../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

/**
 * Transcription Service
 * Manages voice transcription using various providers
 */
class TranscriptionService {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = null;
    this.initializeProviders();
  }

  /**
   * Initialize transcription providers
   */
  initializeProviders() {
    try {
      // Initialize Whisper API provider if API key is available
      if (process.env.OPENAI_API_KEY) {
        const whisperApi = new WhisperApiProvider({
          apiKey: process.env.OPENAI_API_KEY,
        });
        this.providers.set('WhisperAPI', whisperApi);
        this.defaultProvider = 'WhisperAPI';
        logger.info('[TranscriptionService] Whisper API provider initialized');
      }

      // Initialize Whisper.cpp provider if configured
      if (process.env.WHISPER_CPP_PATH) {
        const whisperCpp = new WhisperCppProvider({
          whisperPath: process.env.WHISPER_CPP_PATH,
          modelPath: process.env.WHISPER_MODEL_PATH,
          model: process.env.WHISPER_MODEL || 'base',
        });
        this.providers.set('WhisperCpp', whisperCpp);
        
        // Use WhisperCpp as default if WhisperAPI is not available
        if (!this.defaultProvider) {
          this.defaultProvider = 'WhisperCpp';
        }
        logger.info('[TranscriptionService] Whisper.cpp provider initialized');
      }

      if (this.providers.size === 0) {
        logger.warn('[TranscriptionService] No transcription providers configured');
      }
    } catch (error) {
      logger.error(`[TranscriptionService] Error initializing providers: ${error.message}`);
    }
  }

  /**
   * Get provider instance
   * @param {string} providerName - Provider name
   * @returns {BaseTranscriptionProvider}
   */
  getProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Transcription provider ${providerName} not found or not configured`);
    }
    return provider;
  }

  /**
   * Download audio file from URL
   * @param {string} audioUrl - URL to audio file
   * @returns {Promise<string>} Local file path
   */
  async downloadAudio(audioUrl) {
    try {
      const tempDir = path.join(process.cwd(), 'temp', 'audio');
      
      // Create temp directory if it doesn't exist
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const fileName = `${uuidv4()}.ogg`;
      const filePath = path.join(tempDir, fileName);

      // Download file
      const response = await axios({
        method: 'GET',
        url: audioUrl,
        responseType: 'stream',
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => resolve(filePath));
        writer.on('error', reject);
      });
    } catch (error) {
      logger.error(`[TranscriptionService] Error downloading audio: ${error.message}`);
      throw error;
    }
  }

  /**
   * Transcribe audio file
   * @param {string} userId - User ID
   * @param {string} messageId - Message ID
   * @param {string} audioUrl - URL to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(userId, messageId, audioUrl, options = {}) {
    const startTime = Date.now();
    let localAudioPath = null;

    try {
      logger.info(`[TranscriptionService] Starting transcription for message ${messageId}`);

      // Check if transcription already exists
      const existing = await prisma.voice_transcriptions.findUnique({
        where: { message_id: messageId },
      });

      if (existing) {
        logger.info(`[TranscriptionService] Transcription already exists for message ${messageId}`);
        return existing;
      }

      // Get provider
      const providerName = options.provider || this.defaultProvider;
      if (!providerName) {
        throw new Error('No transcription provider available');
      }

      const provider = this.getProvider(providerName);

      // Download audio file
      localAudioPath = await this.downloadAudio(audioUrl);

      // Get audio duration
      const stats = fs.statSync(localAudioPath);
      const duration = options.duration || 0;

      // Transcribe
      const result = await provider.transcribe(localAudioPath, {
        language: options.language,
        temperature: options.temperature,
      });

      // Calculate cost
      const cost = provider.calculateCost(duration);

      // Save transcription to database
      const transcription = await prisma.voice_transcriptions.create({
        data: {
          id: uuidv4(),
          user_id: userId,
          message_id: messageId,
          audio_url: audioUrl,
          transcription: result.transcription,
          language: result.language,
          duration: result.duration || duration,
          provider: providerName,
          confidence: result.confidence,
          processing_time: result.processingTime,
          cost: cost,
        },
      });

      logger.info(`[TranscriptionService] Transcription saved for message ${messageId}`);

      // Clean up local file
      if (localAudioPath && fs.existsSync(localAudioPath)) {
        fs.unlinkSync(localAudioPath);
      }

      return transcription;
    } catch (error) {
      logger.error(`[TranscriptionService] Transcription failed: ${error.message}`);
      
      // Clean up local file on error
      if (localAudioPath && fs.existsSync(localAudioPath)) {
        fs.unlinkSync(localAudioPath);
      }

      throw error;
    }
  }

  /**
   * Get transcription by ID
   * @param {string} transcriptionId - Transcription ID
   * @returns {Promise<Object>}
   */
  async getTranscription(transcriptionId) {
    return await prisma.voice_transcriptions.findUnique({
      where: { id: transcriptionId },
    });
  }

  /**
   * Get transcription by message ID
   * @param {string} messageId - Message ID
   * @returns {Promise<Object>}
   */
  async getTranscriptionByMessageId(messageId) {
    return await prisma.voice_transcriptions.findUnique({
      where: { message_id: messageId },
    });
  }

  /**
   * List transcriptions for user
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async listTranscriptions(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    return await prisma.voice_transcriptions.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get available providers
   * @returns {Array<string>}
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }
}

// Export singleton instance
const transcriptionService = new TranscriptionService();
export default transcriptionService;

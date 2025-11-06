import BaseTranscriptionProvider from '../baseTranscriptionProvider.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import logger from '../../../utils/logger.js';

const readFile = promisify(fs.readFile);

/**
 * Whisper API Provider (OpenAI)
 * Uses OpenAI's Whisper API for transcription
 */
class WhisperApiProvider extends BaseTranscriptionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'WhisperAPI';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    
    if (!this.apiKey) {
      throw new Error('OpenAI API key is required for Whisper API provider');
    }

    this.client = new OpenAI({
      apiKey: this.apiKey,
    });

    this.model = config.model || 'whisper-1';
  }

  /**
   * Transcribe audio file using Whisper API
   * @param {string} audioPath - Local path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioPath, options = {}) {
    const startTime = Date.now();

    try {
      logger.info(`[WhisperAPI] Starting transcription for ${audioPath}`);

      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Create read stream for the audio file
      const audioFile = fs.createReadStream(audioPath);

      // Call Whisper API
      const response = await this.client.audio.transcriptions.create({
        file: audioFile,
        model: this.model,
        language: options.language || undefined,
        response_format: 'verbose_json',
        temperature: options.temperature || 0,
      });

      const processingTime = Date.now() - startTime;

      logger.info(`[WhisperAPI] Transcription completed in ${processingTime}ms`);

      return {
        transcription: response.text,
        language: response.language || options.language || 'en',
        duration: Math.round(response.duration || 0),
        confidence: null, // Whisper API doesn't provide confidence scores
        processingTime,
        provider: 'WhisperAPI',
      };
    } catch (error) {
      logger.error(`[WhisperAPI] Transcription failed: ${error.message}`);
      throw new Error(`Whisper API transcription failed: ${error.message}`);
    }
  }

  /**
   * Validate provider configuration
   * @returns {Promise<boolean>}
   */
  async validateConfig() {
    try {
      // Test API key by making a simple request
      await this.client.models.retrieve('whisper-1');
      return true;
    } catch (error) {
      logger.error(`[WhisperAPI] Config validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate cost for transcription
   * Whisper API costs $0.006 per minute
   * @param {number} duration - Audio duration in seconds
   * @returns {number} Cost in USD
   */
  calculateCost(duration) {
    const minutes = duration / 60;
    return minutes * 0.006;
  }
}

export default WhisperApiProvider;

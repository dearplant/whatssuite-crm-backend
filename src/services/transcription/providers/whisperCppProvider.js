import BaseTranscriptionProvider from '../baseTranscriptionProvider.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import logger from '../../../utils/logger.js';

const execAsync = promisify(exec);

/**
 * Whisper.cpp Provider (Self-hosted)
 * Uses local whisper.cpp installation for transcription
 */
class WhisperCppProvider extends BaseTranscriptionProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'WhisperCpp';
    
    // Path to whisper.cpp executable
    this.whisperPath = config.whisperPath || process.env.WHISPER_CPP_PATH || 'whisper';
    
    // Model to use (tiny, base, small, medium, large)
    this.model = config.model || 'base';
    
    // Model path
    this.modelPath = config.modelPath || process.env.WHISPER_MODEL_PATH || './models';
  }

  /**
   * Transcribe audio file using whisper.cpp
   * @param {string} audioPath - Local path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioPath, options = {}) {
    const startTime = Date.now();

    try {
      logger.info(`[WhisperCpp] Starting transcription for ${audioPath}`);

      // Check if file exists
      if (!fs.existsSync(audioPath)) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Build whisper.cpp command
      const outputDir = path.dirname(audioPath);
      const outputFile = path.join(outputDir, `${path.basename(audioPath, path.extname(audioPath))}.txt`);
      
      const language = options.language ? `-l ${options.language}` : '';
      const threads = options.threads || 4;
      
      const command = `${this.whisperPath} -m ${this.modelPath}/ggml-${this.model}.bin -f "${audioPath}" -t ${threads} ${language} -otxt -of "${outputFile.replace('.txt', '')}"`;

      logger.debug(`[WhisperCpp] Executing command: ${command}`);

      // Execute whisper.cpp
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      // Read transcription from output file
      if (!fs.existsSync(outputFile)) {
        throw new Error('Transcription output file not found');
      }

      const transcription = fs.readFileSync(outputFile, 'utf-8').trim();
      
      // Clean up output file
      fs.unlinkSync(outputFile);

      const processingTime = Date.now() - startTime;

      // Extract duration from stderr (whisper.cpp outputs timing info there)
      let duration = 0;
      const durationMatch = stderr.match(/total time = (\d+\.\d+) ms/);
      if (durationMatch) {
        duration = Math.round(parseFloat(durationMatch[1]) / 1000);
      }

      logger.info(`[WhisperCpp] Transcription completed in ${processingTime}ms`);

      return {
        transcription,
        language: options.language || 'en',
        duration,
        confidence: null, // whisper.cpp doesn't provide confidence scores by default
        processingTime,
        provider: 'WhisperCpp',
      };
    } catch (error) {
      logger.error(`[WhisperCpp] Transcription failed: ${error.message}`);
      throw new Error(`Whisper.cpp transcription failed: ${error.message}`);
    }
  }

  /**
   * Validate provider configuration
   * @returns {Promise<boolean>}
   */
  async validateConfig() {
    try {
      // Check if whisper executable exists
      const { stdout } = await execAsync(`${this.whisperPath} --help`);
      
      // Check if model file exists
      const modelFile = path.join(this.modelPath, `ggml-${this.model}.bin`);
      if (!fs.existsSync(modelFile)) {
        logger.error(`[WhisperCpp] Model file not found: ${modelFile}`);
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`[WhisperCpp] Config validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Calculate cost for transcription
   * Self-hosted is free (only compute costs)
   * @param {number} duration - Audio duration in seconds
   * @returns {number} Cost in USD
   */
  calculateCost(duration) {
    return 0; // Self-hosted has no API costs
  }
}

export default WhisperCppProvider;

/**
 * Base Transcription Provider
 * Abstract class that all transcription providers must extend
 */
class BaseTranscriptionProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'BaseProvider';
  }

  /**
   * Transcribe audio file
   * @param {string} audioUrl - URL or path to audio file
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audioUrl, options = {}) {
    throw new Error('transcribe() must be implemented by provider');
  }

  /**
   * Validate provider configuration
   * @returns {Promise<boolean>}
   */
  async validateConfig() {
    throw new Error('validateConfig() must be implemented by provider');
  }

  /**
   * Get supported languages
   * @returns {Array<string>}
   */
  getSupportedLanguages() {
    return ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ar', 'zh', 'ja', 'ko'];
  }

  /**
   * Calculate cost for transcription
   * @param {number} duration - Audio duration in seconds
   * @returns {number} Cost in USD
   */
  calculateCost(duration) {
    return 0;
  }
}

export default BaseTranscriptionProvider;

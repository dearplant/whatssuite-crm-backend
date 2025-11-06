/**
 * Base AI Provider Class
 * Abstract class that all AI providers must extend
 */
export class BaseAIProvider {
  constructor(credentials, config = {}) {
    if (this.constructor === BaseAIProvider) {
      throw new Error('BaseAIProvider is an abstract class and cannot be instantiated directly');
    }

    this.credentials = credentials;
    this.config = config;
    this.client = null;
    this.providerName = this.constructor.name;
  }

  /**
   * Initialize the AI provider client
   * Must be implemented by subclasses
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Generate a chat completion
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options (temperature, maxTokens, etc.)
   * @returns {Promise<Object>} - Response with content, usage, and metadata
   */
  async generateChatCompletion(messages, options = {}) {
    throw new Error('generateChatCompletion() must be implemented by subclass');
  }

  /**
   * Generate a streaming chat completion
   * @param {Array} messages - Array of message objects with role and content
   * @param {Object} options - Additional options
   * @returns {AsyncGenerator} - Async generator yielding response chunks
   */
  async *generateStreamingCompletion(messages, options = {}) {
    throw new Error('generateStreamingCompletion() must be implemented by subclass');
  }

  /**
   * Validate credentials by making a test API call
   * @returns {Promise<boolean>} - True if credentials are valid
   */
  async validateCredentials() {
    try {
      await this.generateChatCompletion(
        [{ role: 'user', content: 'Hello' }],
        { maxTokens: 10 }
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Calculate cost based on token usage
   * @param {number} promptTokens - Number of prompt tokens
   * @param {number} completionTokens - Number of completion tokens
   * @param {string} model - Model name
   * @returns {number} - Cost in USD
   */
  calculateCost(promptTokens, completionTokens, model) {
    // Default implementation - should be overridden by subclasses
    return 0;
  }

  /**
   * Get available models for this provider
   * @returns {Array<Object>} - Array of model objects with name and description
   */
  getAvailableModels() {
    throw new Error('getAvailableModels() must be implemented by subclass');
  }

  /**
   * Get provider capabilities
   * @returns {Object} - Object describing provider capabilities
   */
  getCapabilities() {
    return {
      streaming: false,
      functionCalling: false,
      vision: false,
      maxContextLength: 4096,
    };
  }

  /**
   * Format messages to provider-specific format
   * @param {Array} messages - Standard message format
   * @returns {Array} - Provider-specific message format
   */
  formatMessages(messages) {
    // Default implementation - can be overridden
    return messages;
  }

  /**
   * Parse provider response to standard format
   * @param {Object} response - Provider-specific response
   * @returns {Object} - Standard response format
   */
  parseResponse(response) {
    throw new Error('parseResponse() must be implemented by subclass');
  }

  /**
   * Handle provider-specific errors
   * @param {Error} error - Original error
   * @returns {Error} - Standardized error
   */
  handleError(error) {
    // Default error handling
    const standardError = new Error(error.message);
    standardError.provider = this.providerName;
    standardError.originalError = error;

    // Categorize errors
    if (error.message?.includes('API key') || error.message?.includes('authentication')) {
      standardError.type = 'AUTHENTICATION_ERROR';
      standardError.statusCode = 401;
    } else if (error.message?.includes('rate limit')) {
      standardError.type = 'RATE_LIMIT_ERROR';
      standardError.statusCode = 429;
    } else if (error.message?.includes('quota') || error.message?.includes('billing')) {
      standardError.type = 'QUOTA_ERROR';
      standardError.statusCode = 402;
    } else if (error.message?.includes('timeout')) {
      standardError.type = 'TIMEOUT_ERROR';
      standardError.statusCode = 504;
    } else {
      standardError.type = 'PROVIDER_ERROR';
      standardError.statusCode = 500;
    }

    return standardError;
  }

  /**
   * Get provider name
   * @returns {string} - Provider name
   */
  getName() {
    return this.providerName;
  }

  /**
   * Check if provider is initialized
   * @returns {boolean} - True if initialized
   */
  isInitialized() {
    return this.client !== null;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.client = null;
  }
}

export default BaseAIProvider;

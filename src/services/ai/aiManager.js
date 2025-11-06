import { OpenAIProvider } from './providers/openaiProvider.js';
import { ClaudeProvider } from './providers/claudeProvider.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { CohereProvider } from './providers/cohereProvider.js';
import { OllamaProvider } from './providers/ollamaProvider.js';
import { encryptCredentials, decryptCredentials } from '../../utils/encryption.js';
import prisma from '../../config/database.js';
import logger from '../../utils/logger.js';

/**
 * AI Manager - Central manager for all AI providers
 * Handles provider initialization, routing, and credential management
 */
export class AIManager {
  constructor() {
    this.providers = new Map();
    this.providerClasses = {
      OpenAI: OpenAIProvider,
      Claude: ClaudeProvider,
      Gemini: GeminiProvider,
      Cohere: CohereProvider,
      Ollama: OllamaProvider,
    };
  }

  /**
   * Get or create provider instance
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type (OpenAI, Claude, etc.)
   * @returns {Promise<BaseAIProvider>} - Provider instance
   */
  async getProvider(userId, providerType) {
    const cacheKey = `${userId}:${providerType}`;

    // Check if provider is already initialized
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey);
    }

    // Fetch provider configuration from database
    const providerConfig = await this.getProviderConfig(userId, providerType);

    if (!providerConfig) {
      throw new Error(`AI provider ${providerType} not configured for user ${userId}`);
    }

    if (!providerConfig.isActive) {
      throw new Error(`AI provider ${providerType} is not active`);
    }

    // Decrypt credentials
    const credentials = decryptCredentials(providerConfig.credentials);

    // Create provider instance
    const ProviderClass = this.providerClasses[providerType];
    if (!ProviderClass) {
      throw new Error(`Unknown AI provider type: ${providerType}`);
    }

    const provider = new ProviderClass(credentials, providerConfig.modelConfig);

    // Initialize provider
    await provider.initialize();

    // Cache provider instance
    this.providers.set(cacheKey, provider);

    logger.info(`AI provider ${providerType} initialized for user ${userId}`);

    return provider;
  }

  /**
   * Get provider configuration from database
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @returns {Promise<Object>} - Provider configuration
   */
  async getProviderConfig(userId, providerType) {
    try {
      const provider = await prisma.aIProvider.findFirst({
        where: {
          userId,
          provider: providerType,
        },
      });

      return provider;
    } catch (error) {
      logger.error(`Error fetching AI provider config: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create or update AI provider configuration
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @param {Object} credentials - Provider credentials
   * @param {Object} modelConfig - Model configuration
   * @returns {Promise<Object>} - Created/updated provider
   */
  async configureProvider(userId, providerType, credentials, modelConfig = {}) {
    try {
      // Validate provider type
      if (!this.providerClasses[providerType]) {
        throw new Error(`Unknown AI provider type: ${providerType}`);
      }

      // Test credentials by creating a temporary provider
      const ProviderClass = this.providerClasses[providerType];
      const testProvider = new ProviderClass(credentials, modelConfig);
      await testProvider.initialize();

      // Validate credentials with a test call
      const isValid = await testProvider.validateCredentials();
      if (!isValid) {
        throw new Error('Invalid credentials - test API call failed');
      }

      // Cleanup test provider
      await testProvider.cleanup();

      // Encrypt credentials
      const encryptedCredentials = encryptCredentials(credentials);

      // Check if provider already exists
      const existingProvider = await prisma.aIProvider.findFirst({
        where: {
          userId,
          provider: providerType,
        },
      });

      let provider;
      if (existingProvider) {
        // Update existing provider
        provider = await prisma.aIProvider.update({
          where: { id: existingProvider.id },
          data: {
            credentials: encryptedCredentials,
            modelConfig,
            isActive: true,
            lastUsedAt: new Date(),
          },
        });

        // Invalidate cache
        const cacheKey = `${userId}:${providerType}`;
        this.providers.delete(cacheKey);

        logger.info(`AI provider ${providerType} updated for user ${userId}`);
      } else {
        // Create new provider
        provider = await prisma.aIProvider.create({
          data: {
            userId,
            provider: providerType,
            credentials: encryptedCredentials,
            modelConfig,
            isActive: true,
          },
        });

        logger.info(`AI provider ${providerType} created for user ${userId}`);
      }

      return provider;
    } catch (error) {
      logger.error(`Error configuring AI provider: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete AI provider configuration
   * @param {string} userId - User ID
   * @param {string} providerId - Provider ID
   * @returns {Promise<boolean>} - Success status
   */
  async deleteProvider(userId, providerId) {
    try {
      const provider = await prisma.aIProvider.findFirst({
        where: {
          id: providerId,
          userId,
        },
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      await prisma.aIProvider.delete({
        where: { id: providerId },
      });

      // Invalidate cache
      const cacheKey = `${userId}:${provider.provider}`;
      this.providers.delete(cacheKey);

      logger.info(`AI provider ${provider.provider} deleted for user ${userId}`);

      return true;
    } catch (error) {
      logger.error(`Error deleting AI provider: ${error.message}`);
      throw error;
    }
  }

  /**
   * List all configured providers for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} - List of providers
   */
  async listProviders(userId) {
    try {
      const providers = await prisma.aIProvider.findMany({
        where: { userId },
        select: {
          id: true,
          provider: true,
          isActive: true,
          modelConfig: true,
          usageCount: true,
          totalTokens: true,
          totalCost: true,
          lastUsedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return providers;
    } catch (error) {
      logger.error(`Error listing AI providers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate chat completion using specified provider
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @param {Array} messages - Chat messages
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - AI response
   */
  async generateCompletion(userId, providerType, messages, options = {}) {
    try {
      const provider = await this.getProvider(userId, providerType);
      const response = await provider.generateChatCompletion(messages, options);

      // Track usage
      await this.trackUsage(userId, providerType, response);

      return response;
    } catch (error) {
      logger.error(`Error generating completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate streaming chat completion
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @param {Array} messages - Chat messages
   * @param {Object} options - Generation options
   * @returns {AsyncGenerator} - Streaming response
   */
  async *generateStreamingCompletion(userId, providerType, messages, options = {}) {
    try {
      const provider = await this.getProvider(userId, providerType);
      const stream = provider.generateStreamingCompletion(messages, options);

      let fullContent = '';
      for await (const chunk of stream) {
        if (chunk.content) {
          fullContent += chunk.content;
        }
        yield chunk;
      }

      // Track usage (estimate tokens from content)
      const estimatedTokens = Math.ceil(fullContent.length / 4);
      await this.trackUsage(userId, providerType, {
        usage: {
          promptTokens: estimatedTokens,
          completionTokens: estimatedTokens,
          totalTokens: estimatedTokens * 2,
        },
        cost: 0,
      });
    } catch (error) {
      logger.error(`Error generating streaming completion: ${error.message}`);
      throw error;
    }
  }

  /**
   * Track AI usage and costs
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @param {Object} response - AI response with usage data
   */
  async trackUsage(userId, providerType, response) {
    try {
      await prisma.aIProvider.updateMany({
        where: {
          userId,
          provider: providerType,
        },
        data: {
          usageCount: { increment: 1 },
          totalTokens: { increment: response.usage.totalTokens },
          totalCost: { increment: response.cost },
          lastUsedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error(`Error tracking AI usage: ${error.message}`);
      // Don't throw - usage tracking failure shouldn't break the main flow
    }
  }

  /**
   * Get available models for a provider
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @returns {Promise<Array>} - List of available models
   */
  async getAvailableModels(userId, providerType) {
    try {
      const provider = await this.getProvider(userId, providerType);
      return provider.getAvailableModels();
    } catch (error) {
      logger.error(`Error getting available models: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get provider capabilities
   * @param {string} userId - User ID
   * @param {string} providerType - Provider type
   * @returns {Promise<Object>} - Provider capabilities
   */
  async getProviderCapabilities(userId, providerType) {
    try {
      const provider = await this.getProvider(userId, providerType);
      return provider.getCapabilities();
    } catch (error) {
      logger.error(`Error getting provider capabilities: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear provider cache
   * @param {string} userId - User ID (optional)
   * @param {string} providerType - Provider type (optional)
   */
  clearCache(userId = null, providerType = null) {
    if (userId && providerType) {
      const cacheKey = `${userId}:${providerType}`;
      this.providers.delete(cacheKey);
    } else if (userId) {
      // Clear all providers for user
      for (const key of this.providers.keys()) {
        if (key.startsWith(`${userId}:`)) {
          this.providers.delete(key);
        }
      }
    } else {
      // Clear all
      this.providers.clear();
    }
  }

  /**
   * Get all supported provider types
   * @returns {Array<string>} - List of supported provider types
   */
  getSupportedProviders() {
    return Object.keys(this.providerClasses);
  }
}

// Export singleton instance
const aiManager = new AIManager();
export default aiManager;

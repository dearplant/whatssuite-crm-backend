import aiManager from '../services/ai/aiManager.js';
import logger from '../utils/logger.js';

/**
 * AI Provider Controller
 * Handles all AI provider-related HTTP requests
 */

/**
 * Create or update AI provider configuration
 * POST /api/v1/ai/providers
 */
export const createProvider = async (req, res, next) => {
  try {
    const { provider, credentials, modelConfig } = req.body;
    const userId = req.user.id;

    logger.info(`Creating/updating AI provider ${provider} for user ${userId}`);

    // Configure provider (includes credential validation)
    const providerConfig = await aiManager.configureProvider(
      userId,
      provider,
      credentials,
      modelConfig || {}
    );

    // Return provider without sensitive credentials
    const response = {
      id: providerConfig.id,
      provider: providerConfig.provider,
      isActive: providerConfig.isActive,
      modelConfig: providerConfig.modelConfig,
      usageCount: providerConfig.usageCount,
      totalTokens: providerConfig.totalTokens,
      totalCost: providerConfig.totalCost,
      lastUsedAt: providerConfig.lastUsedAt,
      createdAt: providerConfig.createdAt,
      updatedAt: providerConfig.updatedAt,
    };

    res.status(201).json({
      success: true,
      message: 'AI provider configured successfully',
      data: response,
    });
  } catch (error) {
    logger.error(`Error creating AI provider: ${error.message}`);
    next(error);
  }
};

/**
 * Get all AI providers for authenticated user
 * GET /api/v1/ai/providers
 */
export const getProviders = async (req, res, next) => {
  try {
    const userId = req.user.id;

    logger.info(`Fetching AI providers for user ${userId}`);

    const providers = await aiManager.listProviders(userId);

    res.status(200).json({
      success: true,
      data: providers,
      count: providers.length,
    });
  } catch (error) {
    logger.error(`Error fetching AI providers: ${error.message}`);
    next(error);
  }
};

/**
 * Get single AI provider by ID
 * GET /api/v1/ai/providers/:id
 */
export const getProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info(`Fetching AI provider ${id} for user ${userId}`);

    const provider = await aiManager.getProviderConfig(userId, null);

    // Find the specific provider by ID
    const providers = await aiManager.listProviders(userId);
    const targetProvider = providers.find((p) => p.id === id);

    if (!targetProvider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found',
      });
    }

    res.status(200).json({
      success: true,
      data: targetProvider,
    });
  } catch (error) {
    logger.error(`Error fetching AI provider: ${error.message}`);
    next(error);
  }
};

/**
 * Update AI provider configuration
 * PUT /api/v1/ai/providers/:id
 */
export const updateProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { credentials, modelConfig, isActive } = req.body;
    const userId = req.user.id;

    logger.info(`Updating AI provider ${id} for user ${userId}`);

    // First, get the existing provider to know its type
    const providers = await aiManager.listProviders(userId);
    const existingProvider = providers.find((p) => p.id === id);

    if (!existingProvider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found',
      });
    }

    // If credentials are provided, reconfigure the provider
    if (credentials) {
      const updatedProvider = await aiManager.configureProvider(
        userId,
        existingProvider.provider,
        credentials,
        modelConfig || existingProvider.modelConfig
      );

      const response = {
        id: updatedProvider.id,
        provider: updatedProvider.provider,
        isActive: updatedProvider.isActive,
        modelConfig: updatedProvider.modelConfig,
        usageCount: updatedProvider.usageCount,
        totalTokens: updatedProvider.totalTokens,
        totalCost: updatedProvider.totalCost,
        lastUsedAt: updatedProvider.lastUsedAt,
        createdAt: updatedProvider.createdAt,
        updatedAt: updatedProvider.updatedAt,
      };

      return res.status(200).json({
        success: true,
        message: 'AI provider updated successfully',
        data: response,
      });
    }

    // Otherwise, just update the config/status
    const prisma = (await import('../config/database.js')).default;
    const updateData = {};

    if (modelConfig !== undefined) {
      updateData.modelConfig = modelConfig;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updatedProvider = await prisma.aIProvider.update({
      where: { id },
      data: updateData,
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

    // Clear cache
    aiManager.clearCache(userId, updatedProvider.provider);

    res.status(200).json({
      success: true,
      message: 'AI provider updated successfully',
      data: updatedProvider,
    });
  } catch (error) {
    logger.error(`Error updating AI provider: ${error.message}`);
    next(error);
  }
};

/**
 * Delete AI provider
 * DELETE /api/v1/ai/providers/:id
 */
export const deleteProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    logger.info(`Deleting AI provider ${id} for user ${userId}`);

    await aiManager.deleteProvider(userId, id);

    res.status(200).json({
      success: true,
      message: 'AI provider deleted successfully',
    });
  } catch (error) {
    logger.error(`Error deleting AI provider: ${error.message}`);
    next(error);
  }
};

/**
 * Test AI provider with a sample message
 * POST /api/v1/ai/providers/:id/test
 */
export const testProvider = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { message, maxTokens } = req.body;
    const userId = req.user.id;

    logger.info(`Testing AI provider ${id} for user ${userId}`);

    // Get the provider
    const providers = await aiManager.listProviders(userId);
    const provider = providers.find((p) => p.id === id);

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: 'AI provider not found',
      });
    }

    if (!provider.isActive) {
      return res.status(400).json({
        success: false,
        message: 'AI provider is not active',
      });
    }

    // Test the provider with a sample message
    const testMessage = message || 'Hello, this is a test message.';
    const startTime = Date.now();

    const response = await aiManager.generateCompletion(
      userId,
      provider.provider,
      [{ role: 'user', content: testMessage }],
      { maxTokens: maxTokens || 50 }
    );

    const responseTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      message: 'AI provider test successful',
      data: {
        provider: provider.provider,
        model: response.model,
        content: response.content,
        usage: response.usage,
        cost: response.cost,
        responseTime: `${responseTime}ms`,
      },
    });
  } catch (error) {
    logger.error(`Error testing AI provider: ${error.message}`);

    // Return a more user-friendly error for test failures
    res.status(400).json({
      success: false,
      message: 'AI provider test failed',
      error: error.message,
    });
  }
};

export default {
  createProvider,
  getProviders,
  getProvider,
  updateProvider,
  deleteProvider,
  testProvider,
};

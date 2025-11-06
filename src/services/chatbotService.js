import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Create a new chatbot
 */
const createChatbot = async (userId, data) => {
  try {
    const {
      accountId,
      aiProviderId,
      name,
      description,
      systemPrompt,
      welcomeMessage,
      fallbackMessage,
      triggers,
      conversationTimeout,
      maxConversationTurns,
      contextWindow,
    } = data;

    // Verify AI provider exists and belongs to user
    const aiProvider = await prisma.ai_providers.findFirst({
      where: {
        id: aiProviderId,
        user_id: userId,
      },
    });

    if (!aiProvider) {
      throw new Error('AI provider not found or does not belong to user');
    }

    // Verify WhatsApp account exists and belongs to user
    const whatsappAccount = await prisma.whatsapp_accounts.findFirst({
      where: {
        id: accountId,
        user_id: userId,
      },
    });

    if (!whatsappAccount) {
      throw new Error('WhatsApp account not found or does not belong to user');
    }

    const chatbot = await prisma.chatbots.create({
      data: {
        id: uuidv4(),
        user_id: userId,
        account_id: accountId,
        ai_provider_id: aiProviderId,
        name,
        description,
        system_prompt: systemPrompt,
        welcome_message: welcomeMessage,
        fallback_message: fallbackMessage,
        triggers: triggers || {},
        conversation_timeout: conversationTimeout || 60,
        max_conversation_turns: maxConversationTurns || 10,
        context_window: contextWindow || 5,
        is_active: false,
        updated_at: new Date(),
      },
      include: {
        ai_providers: {
          select: {
            id: true,
            provider: true,
            is_active: true,
          },
        },
        whatsapp_accounts: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    logger.info(`Chatbot created: ${chatbot.id} by user ${userId}`);
    return chatbot;
  } catch (error) {
    logger.error('Error creating chatbot:', error);
    throw error;
  }
};

/**
 * Get all chatbots for a user
 */
const getChatbots = async (userId, filters = {}) => {
  try {
    const { accountId, isActive, page = 1, limit = 20 } = filters;

    const where = {
      user_id: userId,
    };

    if (accountId) {
      where.account_id = accountId;
    }

    if (isActive !== undefined) {
      where.is_active = isActive === 'true' || isActive === true;
    }

    const skip = (page - 1) * limit;

    const [chatbots, total] = await Promise.all([
      prisma.chatbots.findMany({
        where,
        include: {
          ai_providers: {
            select: {
              id: true,
              provider: true,
              is_active: true,
            },
          },
          whatsapp_accounts: {
            select: {
              id: true,
              name: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: parseInt(limit),
      }),
      prisma.chatbots.count({ where }),
    ]);

    return {
      chatbots,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Error fetching chatbots:', error);
    throw error;
  }
};

/**
 * Get a single chatbot by ID
 */
const getChatbotById = async (userId, chatbotId) => {
  try {
    const chatbot = await prisma.chatbots.findFirst({
      where: {
        id: chatbotId,
        user_id: userId,
      },
      include: {
        ai_providers: {
          select: {
            id: true,
            provider: true,
            is_active: true,
            model_config: true,
          },
        },
        whatsapp_accounts: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!chatbot) {
      throw new Error('Chatbot not found');
    }

    // Get conversation statistics
    const conversationStats = await prisma.chatbot_conversations.groupBy({
      by: ['status'],
      where: {
        chatbot_id: chatbotId,
      },
      _count: true,
    });

    const stats = conversationStats.reduce((acc, stat) => {
      acc[stat.status.toLowerCase()] = stat._count;
      return acc;
    }, {});

    return {
      ...chatbot,
      stats,
    };
  } catch (error) {
    logger.error('Error fetching chatbot:', error);
    throw error;
  }
};

/**
 * Update a chatbot
 */
const updateChatbot = async (userId, chatbotId, data) => {
  try {
    // Verify chatbot exists and belongs to user
    const existingChatbot = await prisma.chatbots.findFirst({
      where: {
        id: chatbotId,
        user_id: userId,
      },
    });

    if (!existingChatbot) {
      throw new Error('Chatbot not found');
    }

    const updateData = {
      updated_at: new Date(),
    };

    // Only update fields that are provided
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.systemPrompt !== undefined) updateData.system_prompt = data.systemPrompt;
    if (data.welcomeMessage !== undefined) updateData.welcome_message = data.welcomeMessage;
    if (data.fallbackMessage !== undefined) updateData.fallback_message = data.fallbackMessage;
    if (data.triggers !== undefined) updateData.triggers = data.triggers;
    if (data.conversationTimeout !== undefined) updateData.conversation_timeout = data.conversationTimeout;
    if (data.maxConversationTurns !== undefined) updateData.max_conversation_turns = data.maxConversationTurns;
    if (data.contextWindow !== undefined) updateData.context_window = data.contextWindow;

    // Verify AI provider if being updated
    if (data.aiProviderId) {
      const aiProvider = await prisma.ai_providers.findFirst({
        where: {
          id: data.aiProviderId,
          user_id: userId,
        },
      });

      if (!aiProvider) {
        throw new Error('AI provider not found or does not belong to user');
      }

      updateData.ai_provider_id = data.aiProviderId;
    }

    const chatbot = await prisma.chatbots.update({
      where: {
        id: chatbotId,
      },
      data: updateData,
      include: {
        ai_providers: {
          select: {
            id: true,
            provider: true,
            is_active: true,
          },
        },
        whatsapp_accounts: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    logger.info(`Chatbot updated: ${chatbotId} by user ${userId}`);
    return chatbot;
  } catch (error) {
    logger.error('Error updating chatbot:', error);
    throw error;
  }
};

/**
 * Activate or deactivate a chatbot
 */
const toggleChatbotStatus = async (userId, chatbotId, isActive) => {
  try {
    // Verify chatbot exists and belongs to user
    const existingChatbot = await prisma.chatbots.findFirst({
      where: {
        id: chatbotId,
        user_id: userId,
      },
      include: {
        ai_providers: true,
        whatsapp_accounts: true,
      },
    });

    if (!existingChatbot) {
      throw new Error('Chatbot not found');
    }

    // Verify AI provider is active
    if (isActive && !existingChatbot.ai_providers.is_active) {
      throw new Error('Cannot activate chatbot: AI provider is not active');
    }

    // Verify WhatsApp account is connected
    if (isActive && existingChatbot.whatsapp_accounts.status !== 'connected') {
      throw new Error('Cannot activate chatbot: WhatsApp account is not connected');
    }

    const chatbot = await prisma.chatbots.update({
      where: {
        id: chatbotId,
      },
      data: {
        is_active: isActive,
        updated_at: new Date(),
      },
      include: {
        ai_providers: {
          select: {
            id: true,
            provider: true,
            is_active: true,
          },
        },
        whatsapp_accounts: {
          select: {
            id: true,
            name: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    logger.info(`Chatbot ${isActive ? 'activated' : 'deactivated'}: ${chatbotId} by user ${userId}`);
    return chatbot;
  } catch (error) {
    logger.error('Error toggling chatbot status:', error);
    throw error;
  }
};

/**
 * Test a chatbot with a sample message
 */
const testChatbot = async (userId, chatbotId, testMessage) => {
  try {
    // Verify chatbot exists and belongs to user
    const chatbot = await prisma.chatbots.findFirst({
      where: {
        id: chatbotId,
        user_id: userId,
      },
      include: {
        ai_providers: true,
      },
    });

    if (!chatbot) {
      throw new Error('Chatbot not found');
    }

    // Verify AI provider is active
    if (!chatbot.ai_providers.is_active) {
      throw new Error('AI provider is not active');
    }

    // Import AI manager
    const { AIManager } = await import('./ai/aiManager.js');
    const aiManager = new AIManager();

    // Build test context
    const messages = [
      {
        role: 'system',
        content: chatbot.system_prompt,
      },
      {
        role: 'user',
        content: testMessage,
      },
    ];

    const startTime = Date.now();

    // Generate response
    const response = await aiManager.generateResponse(
      chatbot.ai_providers.id,
      messages,
      chatbot.ai_providers.model_config
    );

    const responseTime = Date.now() - startTime;

    logger.info(`Chatbot test completed: ${chatbotId} in ${responseTime}ms`);

    return {
      success: true,
      response: response.content,
      tokensUsed: response.tokensUsed,
      responseTime,
      provider: chatbot.ai_providers.provider,
    };
  } catch (error) {
    logger.error('Error testing chatbot:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Delete a chatbot
 */
const deleteChatbot = async (userId, chatbotId) => {
  try {
    // Verify chatbot exists and belongs to user
    const existingChatbot = await prisma.chatbots.findFirst({
      where: {
        id: chatbotId,
        user_id: userId,
      },
    });

    if (!existingChatbot) {
      throw new Error('Chatbot not found');
    }

    // Deactivate before deleting
    if (existingChatbot.is_active) {
      await prisma.chatbots.update({
        where: { id: chatbotId },
        data: { is_active: false, updated_at: new Date() },
      });
    }

    // Delete chatbot (cascade will handle conversations and messages)
    await prisma.chatbots.delete({
      where: {
        id: chatbotId,
      },
    });

    logger.info(`Chatbot deleted: ${chatbotId} by user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting chatbot:', error);
    throw error;
  }
};

export default {
  createChatbot,
  getChatbots,
  getChatbotById,
  updateChatbot,
  toggleChatbotStatus,
  testChatbot,
  deleteChatbot,
};

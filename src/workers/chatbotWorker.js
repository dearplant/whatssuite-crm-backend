/**
 * Chatbot Worker
 * Processes chatbot conversation jobs
 */

import { aiQueue } from '../queues/index.js';
import prisma from '../config/database.js';
import { AIManager } from '../services/ai/aiManager.js';
import messageService from '../services/messageService.js';
import logger from '../utils/logger.js';

const aiManager = new AIManager();

/**
 * Process chatbot conversation job
 * @param {Object} job - Bull job
 */
const processChatbotConversation = async (job) => {
  const { chatbotId, contactId, messageId, messageContent } = job.data;

  try {
    logger.info(`Processing chatbot conversation`, {
      jobId: job.id,
      chatbotId,
      contactId,
      messageId,
    });

    // Get chatbot configuration
    const chatbot = await prisma.chatbots.findUnique({
      where: { id: chatbotId },
      include: {
        ai_providers: true,
        whatsapp_accounts: true,
      },
    });

    if (!chatbot) {
      throw new Error('Chatbot not found');
    }

    if (!chatbot.is_active) {
      logger.info('Chatbot is not active, skipping', { chatbotId });
      return { success: false, reason: 'Chatbot not active' };
    }

    // Get or create conversation
    let conversation = await getOrCreateConversation(chatbot, contactId);

    // Check conversation limits
    if (conversation.turn_count >= chatbot.max_conversation_turns) {
      logger.info('Conversation turn limit reached', {
        conversationId: conversation.id,
        turnCount: conversation.turn_count,
      });
      await endConversation(conversation.id, 'Timeout', 'Turn limit reached');
      return { success: false, reason: 'Turn limit reached' };
    }

    // Check conversation timeout
    const timeoutMinutes = chatbot.conversation_timeout;
    const lastMessageTime = new Date(conversation.started_at);
    const minutesSinceStart = (Date.now() - lastMessageTime.getTime()) / 1000 / 60;

    if (minutesSinceStart > timeoutMinutes) {
      logger.info('Conversation timeout', {
        conversationId: conversation.id,
        minutesSinceStart,
      });
      await endConversation(conversation.id, 'Timeout', 'Conversation timeout');
      conversation = await getOrCreateConversation(chatbot, contactId);
    }

    // Save user message to conversation
    await prisma.chatbot_messages.create({
      data: {
        chatbot_conversation_id: conversation.id,
        message_id: messageId,
        role: 'user',
        content: messageContent,
        created_at: new Date(),
      },
    });

    // Build conversation context
    const context = await buildConversationContext(conversation.id, chatbot.context_window);

    // Add system prompt
    const messages = [
      {
        role: 'system',
        content: chatbot.system_prompt,
      },
      ...context,
    ];

    // Generate AI response
    const startTime = Date.now();
    const response = await aiManager.generateCompletion(
      chatbot.user_id,
      chatbot.ai_providers.provider,
      messages,
      chatbot.ai_providers.model_config
    );
    const responseTime = Date.now() - startTime;

    // Send response message
    const contact = await prisma.contacts.findUnique({
      where: { id: contactId },
    });

    const sentMessage = await messageService.sendMessage({
      userId: chatbot.user_id,
      whatsappAccountId: chatbot.account_id,
      to: contact.phone,
      type: 'Text',
      content: response.content,
      isFromBot: true,
    });

    // Save assistant message to conversation
    await prisma.chatbot_messages.create({
      data: {
        chatbot_conversation_id: conversation.id,
        message_id: sentMessage.id,
        role: 'assistant',
        content: response.content,
        tokens_used: response.usage.totalTokens,
        response_time: responseTime,
        created_at: new Date(),
      },
    });

    // Update conversation turn count
    await prisma.chatbot_conversations.update({
      where: { id: conversation.id },
      data: {
        turn_count: { increment: 1 },
      },
    });

    // Update chatbot statistics
    await prisma.chatbots.update({
      where: { id: chatbotId },
      data: {
        total_messages: { increment: 1 },
        avg_response_time: responseTime,
        updated_at: new Date(),
      },
    });

    logger.info(`Chatbot response sent`, {
      conversationId: conversation.id,
      responseTime,
      tokensUsed: response.usage.totalTokens,
    });

    return {
      success: true,
      conversationId: conversation.id,
      messageId: sentMessage.id,
      responseTime,
      tokensUsed: response.usage.totalTokens,
    };
  } catch (error) {
    logger.error('Error processing chatbot conversation', {
      error: error.message,
      stack: error.stack,
      jobId: job.id,
      chatbotId,
      contactId,
    });

    // Send fallback message if available
    try {
      const chatbot = await prisma.chatbots.findUnique({
        where: { id: chatbotId },
      });

      if (chatbot && chatbot.fallback_message) {
        const contact = await prisma.contacts.findUnique({
          where: { id: contactId },
        });

        await messageService.sendMessage({
          userId: chatbot.user_id,
          whatsappAccountId: chatbot.account_id,
          to: contact.phone,
          type: 'Text',
          content: chatbot.fallback_message,
          isFromBot: true,
        });
      }
    } catch (fallbackError) {
      logger.error('Error sending fallback message', {
        error: fallbackError.message,
      });
    }

    throw error;
  }
};

/**
 * Get or create conversation for contact
 * @param {Object} chatbot - Chatbot configuration
 * @param {string} contactId - Contact ID
 * @returns {Promise<Object>} - Conversation
 */
const getOrCreateConversation = async (chatbot, contactId) => {
  // Find active conversation
  let conversation = await prisma.chatbot_conversations.findFirst({
    where: {
      chatbot_id: chatbot.id,
      contact_id: contactId,
      status: 'Active',
    },
    orderBy: {
      started_at: 'desc',
    },
  });

  if (!conversation) {
    // Create new conversation
    conversation = await prisma.chatbot_conversations.create({
      data: {
        chatbot_id: chatbot.id,
        contact_id: contactId,
        conversation_id: `conv_${Date.now()}_${contactId}`,
        status: 'Active',
        turn_count: 0,
        started_at: new Date(),
      },
    });

    // Update chatbot total conversations
    await prisma.chatbots.update({
      where: { id: chatbot.id },
      data: {
        total_conversations: { increment: 1 },
      },
    });

    // Send welcome message if configured
    if (chatbot.welcome_message) {
      const contact = await prisma.contacts.findUnique({
        where: { id: contactId },
      });

      const welcomeMsg = await messageService.sendMessage({
        userId: chatbot.user_id,
        whatsappAccountId: chatbot.account_id,
        to: contact.phone,
        type: 'Text',
        content: chatbot.welcome_message,
        isFromBot: true,
      });

      // Save welcome message to conversation
      await prisma.chatbot_messages.create({
        data: {
          chatbot_conversation_id: conversation.id,
          message_id: welcomeMsg.id,
          role: 'assistant',
          content: chatbot.welcome_message,
          created_at: new Date(),
        },
      });
    }

    logger.info('New chatbot conversation created', {
      conversationId: conversation.id,
      chatbotId: chatbot.id,
      contactId,
    });
  }

  return conversation;
};

/**
 * Build conversation context from recent messages
 * @param {string} conversationId - Conversation ID
 * @param {number} contextWindow - Number of messages to include
 * @returns {Promise<Array>} - Context messages
 */
const buildConversationContext = async (conversationId, contextWindow) => {
  const messages = await prisma.chatbot_messages.findMany({
    where: {
      chatbot_conversation_id: conversationId,
    },
    orderBy: {
      created_at: 'desc',
    },
    take: contextWindow * 2, // Get last N exchanges (user + assistant)
  });

  // Reverse to get chronological order
  return messages.reverse().map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
};

/**
 * End a conversation
 * @param {string} conversationId - Conversation ID
 * @param {string} status - End status
 * @param {string} reason - End reason
 */
const endConversation = async (conversationId, status, reason = null) => {
  await prisma.chatbot_conversations.update({
    where: { id: conversationId },
    data: {
      status,
      handoff_reason: reason,
      ended_at: new Date(),
    },
  });

  logger.info('Conversation ended', {
    conversationId,
    status,
    reason,
  });
};

/**
 * Queue chatbot conversation job
 * @param {Object} data - Job data
 * @param {Object} options - Job options
 */
export const queueChatbotConversation = async (data, options = {}) => {
  try {
    const job = await aiQueue.add('chatbot-conversation', data, {
      priority: options.priority || 5,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      ...options,
    });

    logger.info('Chatbot conversation job queued', {
      jobId: job.id,
      chatbotId: data.chatbotId,
      contactId: data.contactId,
    });

    return job;
  } catch (error) {
    logger.error('Failed to queue chatbot conversation', {
      error: error.message,
      data,
    });
    throw error;
  }
};

/**
 * Process chatbot response for transcribed message
 * @param {Object} job - Bull job
 */
const processChatbotResponse = async (job) => {
  const { userId, messageId, content, isTranscribed = false } = job.data;

  try {
    logger.info(`Processing chatbot response for ${isTranscribed ? 'transcribed' : 'text'} message`, {
      jobId: job.id,
      messageId,
    });

    // Get message details
    const message = await prisma.messages.findUnique({
      where: { id: messageId },
      include: {
        contacts: true,
        conversations: true,
      },
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Find active chatbot for this account
    const chatbot = await prisma.chatbots.findFirst({
      where: {
        account_id: message.account_id,
        is_active: true,
      },
      include: {
        ai_providers: true,
      },
    });

    if (!chatbot) {
      logger.info('No active chatbot found for account', {
        accountId: message.account_id,
      });
      return { success: false, reason: 'No active chatbot' };
    }

    // Check if message matches chatbot triggers
    const triggers = chatbot.triggers || {};
    const shouldRespond = checkTriggers(content, triggers);

    if (!shouldRespond) {
      logger.info('Message does not match chatbot triggers', {
        messageId,
        chatbotId: chatbot.id,
      });
      return { success: false, reason: 'No trigger match' };
    }

    // Queue chatbot conversation
    await queueChatbotConversation({
      chatbotId: chatbot.id,
      contactId: message.contact_id,
      messageId: message.id,
      messageContent: content,
    });

    return {
      success: true,
      chatbotId: chatbot.id,
      isTranscribed,
    };
  } catch (error) {
    logger.error('Error processing chatbot response', {
      error: error.message,
      stack: error.stack,
      jobId: job.id,
      messageId,
    });
    throw error;
  }
};

/**
 * Check if message matches chatbot triggers
 * @param {string} content - Message content
 * @param {Object} triggers - Chatbot triggers
 * @returns {boolean}
 */
const checkTriggers = (content, triggers) => {
  if (!triggers || Object.keys(triggers).length === 0) {
    return true; // Respond to all messages if no triggers configured
  }

  const lowerContent = content.toLowerCase();

  // Check keyword triggers
  if (triggers.keywords && Array.isArray(triggers.keywords)) {
    for (const keyword of triggers.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return true;
      }
    }
  }

  // Check pattern triggers
  if (triggers.patterns && Array.isArray(triggers.patterns)) {
    for (const pattern of triggers.patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(content)) {
        return true;
      }
    }
  }

  return false;
};

// Register workers
aiQueue.process('chatbot-conversation', 5, processChatbotConversation);
aiQueue.process('chatbot-response', 3, processChatbotResponse);

logger.info('Chatbot workers registered');

export default {
  queueChatbotConversation,
  processChatbotConversation,
  processChatbotResponse,
};

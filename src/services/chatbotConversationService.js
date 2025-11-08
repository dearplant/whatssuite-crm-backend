/**
 * Chatbot Conversation Service
 * Handles chatbot conversation logic, trigger matching, and conversation management
 */

import prisma from '../config/database.js';
import { queueChatbotConversation } from '../workers/chatbotWorker.js';
import logger from '../utils/logger.js';

class ChatbotConversationService {
  /**
   * Handle incoming message and check for chatbot triggers
   * @param {Object} message - Incoming message
   * @param {Object} contact - Contact who sent the message
   */
  async handleIncomingMessage(message, contact) {
    try {
      // Find active chatbots for this WhatsApp account
      const chatbots = await prisma.chatbots.findMany({
        where: {
          account_id: message.whatsappAccountId,
          is_active: true,
        },
        include: {
          ai_providers: true,
        },
      });

      if (chatbots.length === 0) {
        return;
      }

      // Check each chatbot for trigger match
      for (const chatbot of chatbots) {
        const shouldTrigger = await this.checkTriggers(chatbot, message, contact);

        if (shouldTrigger) {
          logger.info('Chatbot triggered', {
            chatbotId: chatbot.id,
            chatbotName: chatbot.name,
            contactId: contact.id,
            messageId: message.id,
          });

          // Queue chatbot conversation
          await queueChatbotConversation({
            chatbotId: chatbot.id,
            contactId: contact.id,
            messageId: message.id,
            messageContent: message.content,
          });

          // Only trigger one chatbot per message
          break;
        }
      }
    } catch (error) {
      logger.error('Error handling incoming message for chatbot', {
        error: error.message,
        messageId: message.id,
      });
      // Don't throw - chatbot errors shouldn't break message processing
    }
  }

  /**
   * Check if chatbot triggers match for a message
   * @param {Object} chatbot - Chatbot configuration
   * @param {Object} message - Incoming message
   * @param {Object} contact - Contact who sent the message
   * @returns {Promise<boolean>} - Whether chatbot should be triggered
   */
  async checkTriggers(chatbot, message, contact) {
    const triggers = chatbot.triggers || {};

    // Check if there's an active conversation (always respond if conversation is active)
    const activeConversation = await prisma.chatbot_conversations.findFirst({
      where: {
        chatbot_id: chatbot.id,
        contact_id: contact.id,
        status: 'Active',
      },
    });

    if (activeConversation) {
      // Check conversation timeout
      const timeoutMinutes = chatbot.conversation_timeout;
      const lastMessageTime = new Date(activeConversation.started_at);
      const minutesSinceStart = (Date.now() - lastMessageTime.getTime()) / 1000 / 60;

      if (minutesSinceStart <= timeoutMinutes) {
        return true; // Continue active conversation
      }
    }

    // Auto-reply trigger (responds to all messages)
    if (triggers.autoReply === true) {
      return true;
    }

    // Keyword triggers
    if (triggers.keywords && Array.isArray(triggers.keywords) && triggers.keywords.length > 0) {
      const messageContent = message.content.toLowerCase();
      const hasKeyword = triggers.keywords.some((keyword) =>
        messageContent.includes(keyword.toLowerCase())
      );

      if (hasKeyword) {
        return true;
      }
    }

    // Tag-based triggers
    if (triggers.tags && Array.isArray(triggers.tags) && triggers.tags.length > 0) {
      const contactTags = contact.tags || [];
      const hasMatchingTag = triggers.tags.some((tag) => contactTags.includes(tag));

      if (hasMatchingTag) {
        return true;
      }
    }

    // Time-based triggers
    if (triggers.timeBasedStart && triggers.timeBasedEnd) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      const isWithinTimeRange =
        currentTime >= triggers.timeBasedStart && currentTime <= triggers.timeBasedEnd;

      if (!isWithinTimeRange) {
        return false; // Outside time window
      }

      // If within time range and has other triggers, check them
      // If no other triggers, time-based alone doesn't trigger
      if (triggers.keywords || triggers.tags || triggers.autoReply) {
        // Other triggers will be checked above
        return false;
      }
    }

    return false;
  }

  /**
   * Get conversation by ID
   * @param {string} userId - User ID for authorization
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} - Conversation with messages
   */
  async getConversation(userId, conversationId) {
    try {
      const conversation = await prisma.chatbot_conversations.findFirst({
        where: {
          id: conversationId,
        },
        include: {
          chatbots: {
            select: {
              id: true,
              name: true,
              user_id: true,
            },
          },
          contacts: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          chatbot_messages: {
            orderBy: {
              created_at: 'asc',
            },
            include: {
              messages: {
                select: {
                  id: true,
                  type: true,
                  status: true,
                  created_at: true,
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check authorization
      if (conversation.chatbots.user_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      return conversation;
    } catch (error) {
      logger.error('Error getting conversation', {
        error: error.message,
        conversationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get all conversations for a chatbot
   * @param {string} userId - User ID for authorization
   * @param {string} chatbotId - Chatbot ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Conversations with pagination
   */
  async getConversations(userId, chatbotId, filters = {}) {
    try {
      // Verify chatbot belongs to user
      const chatbot = await prisma.chatbots.findFirst({
        where: {
          id: chatbotId,
          user_id: userId,
        },
      });

      if (!chatbot) {
        throw new Error('Chatbot not found');
      }

      const { status, page = 1, limit = 20 } = filters;

      const where = {
        chatbot_id: chatbotId,
      };

      if (status) {
        where.status = status;
      }

      const skip = (page - 1) * limit;

      const [conversations, total] = await Promise.all([
        prisma.chatbot_conversations.findMany({
          where,
          include: {
            contacts: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
            _count: {
              select: {
                chatbot_messages: true,
              },
            },
          },
          orderBy: {
            started_at: 'desc',
          },
          skip,
          take: parseInt(limit),
        }),
        prisma.chatbot_conversations.count({ where }),
      ]);

      return {
        conversations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error('Error getting conversations', {
        error: error.message,
        chatbotId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Handoff conversation to human agent
   * @param {string} userId - User ID for authorization
   * @param {string} conversationId - Conversation ID
   * @param {string} reason - Handoff reason
   * @returns {Promise<Object>} - Updated conversation
   */
  async handoffConversation(userId, conversationId, reason = 'Manual handoff') {
    try {
      const conversation = await prisma.chatbot_conversations.findFirst({
        where: {
          id: conversationId,
        },
        include: {
          chatbots: {
            select: {
              user_id: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check authorization
      if (conversation.chatbots.user_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      if (conversation.status !== 'Active') {
        throw new Error('Only active conversations can be handed off');
      }

      // Update conversation status
      const updatedConversation = await prisma.chatbot_conversations.update({
        where: {
          id: conversationId,
        },
        data: {
          status: 'HandedOff',
          handoff_reason: reason,
          ended_at: new Date(),
        },
        include: {
          contacts: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      logger.info('Conversation handed off to human', {
        conversationId,
        reason,
      });

      return updatedConversation;
    } catch (error) {
      logger.error('Error handing off conversation', {
        error: error.message,
        conversationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * End a conversation
   * @param {string} userId - User ID for authorization
   * @param {string} conversationId - Conversation ID
   * @param {string} status - End status (Completed, Timeout)
   * @param {string} reason - End reason
   * @returns {Promise<Object>} - Updated conversation
   */
  async endConversation(userId, conversationId, status = 'Completed', reason = null) {
    try {
      const conversation = await prisma.chatbot_conversations.findFirst({
        where: {
          id: conversationId,
        },
        include: {
          chatbots: {
            select: {
              user_id: true,
            },
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Check authorization
      if (conversation.chatbots.user_id !== userId) {
        throw new Error('Unauthorized access to conversation');
      }

      if (conversation.status !== 'Active') {
        throw new Error('Only active conversations can be ended');
      }

      // Update conversation status
      const updatedConversation = await prisma.chatbot_conversations.update({
        where: {
          id: conversationId,
        },
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

      return updatedConversation;
    } catch (error) {
      logger.error('Error ending conversation', {
        error: error.message,
        conversationId,
        userId,
      });
      throw error;
    }
  }

  /**
   * Get conversation statistics for a chatbot
   * @param {string} userId - User ID for authorization
   * @param {string} chatbotId - Chatbot ID
   * @returns {Promise<Object>} - Statistics
   */
  async getConversationStats(userId, chatbotId) {
    try {
      // Verify chatbot belongs to user
      const chatbot = await prisma.chatbots.findFirst({
        where: {
          id: chatbotId,
          user_id: userId,
        },
      });

      if (!chatbot) {
        throw new Error('Chatbot not found');
      }

      const [statusCounts, avgTurnCount, avgResponseTime] = await Promise.all([
        prisma.chatbot_conversations.groupBy({
          by: ['status'],
          where: {
            chatbot_id: chatbotId,
          },
          _count: true,
        }),
        prisma.chatbot_conversations.aggregate({
          where: {
            chatbot_id: chatbotId,
          },
          _avg: {
            turn_count: true,
          },
        }),
        prisma.chatbot_messages.aggregate({
          where: {
            chatbot_conversation_id: {
              in: await prisma.chatbot_conversations
                .findMany({
                  where: { chatbot_id: chatbotId },
                  select: { id: true },
                })
                .then((convs) => convs.map((c) => c.id)),
            },
            role: 'assistant',
          },
          _avg: {
            response_time: true,
          },
        }),
      ]);

      const stats = {
        byStatus: statusCounts.reduce((acc, stat) => {
          acc[stat.status.toLowerCase()] = stat._count;
          return acc;
        }, {}),
        avgTurnCount: avgTurnCount._avg.turn_count || 0,
        avgResponseTime: avgResponseTime._avg.response_time || 0,
        totalConversations: chatbot.total_conversations,
        totalMessages: chatbot.total_messages,
      };

      return stats;
    } catch (error) {
      logger.error('Error getting conversation stats', {
        error: error.message,
        chatbotId,
        userId,
      });
      throw error;
    }
  }
}

export default new ChatbotConversationService();

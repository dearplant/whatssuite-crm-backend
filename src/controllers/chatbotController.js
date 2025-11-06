import chatbotService from '../services/chatbotService.js';
import chatbotConversationService from '../services/chatbotConversationService.js';
import { logger } from '../utils/logger.js';

/**
 * Create a new chatbot
 * POST /api/v1/ai/chatbots
 */
const createChatbot = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatbot = await chatbotService.createChatbot(userId, req.body);

    res.status(201).json({
      success: true,
      message: 'Chatbot created successfully',
      data: chatbot,
    });
  } catch (error) {
    logger.error('Error in createChatbot controller:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      message: error.message || 'Failed to create chatbot',
    });
  }
};

/**
 * Get all chatbots for the authenticated user
 * GET /api/v1/ai/chatbots
 */
const getChatbots = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await chatbotService.getChatbots(userId, req.query);

    res.status(200).json({
      success: true,
      data: result.chatbots,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in getChatbots controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chatbots',
    });
  }
};

/**
 * Get a single chatbot by ID
 * GET /api/v1/ai/chatbots/:id
 */
const getChatbotById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const chatbot = await chatbotService.getChatbotById(userId, id);

    res.status(200).json({
      success: true,
      data: chatbot,
    });
  } catch (error) {
    logger.error('Error in getChatbotById controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to fetch chatbot',
    });
  }
};

/**
 * Update a chatbot
 * PUT /api/v1/ai/chatbots/:id
 */
const updateChatbot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const chatbot = await chatbotService.updateChatbot(userId, id, req.body);

    res.status(200).json({
      success: true,
      message: 'Chatbot updated successfully',
      data: chatbot,
    });
  } catch (error) {
    logger.error('Error in updateChatbot controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 400).json({
      success: false,
      message: error.message || 'Failed to update chatbot',
    });
  }
};

/**
 * Activate a chatbot
 * POST /api/v1/ai/chatbots/:id/activate
 */
const activateChatbot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const chatbot = await chatbotService.toggleChatbotStatus(userId, id, true);

    res.status(200).json({
      success: true,
      message: 'Chatbot activated successfully',
      data: chatbot,
    });
  } catch (error) {
    logger.error('Error in activateChatbot controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 400).json({
      success: false,
      message: error.message || 'Failed to activate chatbot',
    });
  }
};

/**
 * Deactivate a chatbot
 * POST /api/v1/ai/chatbots/:id/deactivate
 */
const deactivateChatbot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const chatbot = await chatbotService.toggleChatbotStatus(userId, id, false);

    res.status(200).json({
      success: true,
      message: 'Chatbot deactivated successfully',
      data: chatbot,
    });
  } catch (error) {
    logger.error('Error in deactivateChatbot controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 400).json({
      success: false,
      message: error.message || 'Failed to deactivate chatbot',
    });
  }
};

/**
 * Test a chatbot with a sample message
 * POST /api/v1/ai/chatbots/:id/test
 */
const testChatbot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { message } = req.body;

    const result = await chatbotService.testChatbot(userId, id, message);

    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    logger.error('Error in testChatbot controller:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test chatbot',
    });
  }
};

/**
 * Delete a chatbot
 * DELETE /api/v1/ai/chatbots/:id
 */
const deleteChatbot = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await chatbotService.deleteChatbot(userId, id);

    res.status(200).json({
      success: true,
      message: 'Chatbot deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteChatbot controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to delete chatbot',
    });
  }
};

/**
 * Get conversation by ID
 * GET /api/v1/ai/conversations/:id
 */
const getConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const conversation = await chatbotConversationService.getConversation(userId, id);

    res.status(200).json({
      success: true,
      data: conversation,
    });
  } catch (error) {
    logger.error('Error in getConversation controller:', error);
    res.status(error.message === 'Conversation not found' ? 404 : error.message.includes('Unauthorized') ? 403 : 500).json({
      success: false,
      message: error.message || 'Failed to fetch conversation',
    });
  }
};

/**
 * Get all conversations for a chatbot
 * GET /api/v1/ai/chatbots/:id/conversations
 */
const getChatbotConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await chatbotConversationService.getConversations(userId, id, req.query);

    res.status(200).json({
      success: true,
      data: result.conversations,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error('Error in getChatbotConversations controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to fetch conversations',
    });
  }
};

/**
 * Handoff conversation to human agent
 * POST /api/v1/ai/conversations/:id/handoff
 */
const handoffConversation = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { reason } = req.body;

    const conversation = await chatbotConversationService.handoffConversation(userId, id, reason);

    res.status(200).json({
      success: true,
      message: 'Conversation handed off to human agent',
      data: conversation,
    });
  } catch (error) {
    logger.error('Error in handoffConversation controller:', error);
    res.status(error.message === 'Conversation not found' ? 404 : error.message.includes('Unauthorized') ? 403 : 400).json({
      success: false,
      message: error.message || 'Failed to handoff conversation',
    });
  }
};

/**
 * Get conversation statistics for a chatbot
 * GET /api/v1/ai/chatbots/:id/stats
 */
const getChatbotStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const stats = await chatbotConversationService.getConversationStats(userId, id);

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Error in getChatbotStats controller:', error);
    res.status(error.message === 'Chatbot not found' ? 404 : 500).json({
      success: false,
      message: error.message || 'Failed to fetch chatbot statistics',
    });
  }
};

export default {
  createChatbot,
  getChatbots,
  getChatbotById,
  updateChatbot,
  activateChatbot,
  deactivateChatbot,
  testChatbot,
  deleteChatbot,
  getConversation,
  getChatbotConversations,
  handoffConversation,
  getChatbotStats,
};

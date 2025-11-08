import Joi from 'joi';

const createChatbotSchema = Joi.object({
  accountId: Joi.string().uuid().required().messages({
    'string.empty': 'WhatsApp account ID is required',
    'string.uuid': 'Invalid WhatsApp account ID format',
    'any.required': 'WhatsApp account ID is required',
  }),
  aiProviderId: Joi.string().uuid().required().messages({
    'string.empty': 'AI provider ID is required',
    'string.uuid': 'Invalid AI provider ID format',
    'any.required': 'AI provider ID is required',
  }),
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Chatbot name is required',
    'string.min': 'Chatbot name must be at least 1 character',
    'string.max': 'Chatbot name must not exceed 100 characters',
    'any.required': 'Chatbot name is required',
  }),
  description: Joi.string().max(500).allow(null, '').messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  systemPrompt: Joi.string().min(10).max(5000).required().messages({
    'string.empty': 'System prompt is required',
    'string.min': 'System prompt must be at least 10 characters',
    'string.max': 'System prompt must not exceed 5000 characters',
    'any.required': 'System prompt is required',
  }),
  welcomeMessage: Joi.string().max(1000).allow(null, '').messages({
    'string.max': 'Welcome message must not exceed 1000 characters',
  }),
  fallbackMessage: Joi.string().min(1).max(1000).required().messages({
    'string.empty': 'Fallback message is required',
    'string.min': 'Fallback message must be at least 1 character',
    'string.max': 'Fallback message must not exceed 1000 characters',
    'any.required': 'Fallback message is required',
  }),
  triggers: Joi.object({
    keywords: Joi.array().items(Joi.string()).default([]),
    tags: Joi.array().items(Joi.string()).default([]),
    timeBasedStart: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .allow(null),
    timeBasedEnd: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .allow(null),
    autoReply: Joi.boolean().default(false),
  }).default({}),
  conversationTimeout: Joi.number().integer().min(1).max(1440).default(60).messages({
    'number.min': 'Conversation timeout must be at least 1 minute',
    'number.max': 'Conversation timeout must not exceed 1440 minutes (24 hours)',
  }),
  maxConversationTurns: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.min': 'Max conversation turns must be at least 1',
    'number.max': 'Max conversation turns must not exceed 100',
  }),
  contextWindow: Joi.number().integer().min(1).max(20).default(5).messages({
    'number.min': 'Context window must be at least 1',
    'number.max': 'Context window must not exceed 20',
  }),
});

const updateChatbotSchema = Joi.object({
  name: Joi.string().min(1).max(100).messages({
    'string.empty': 'Chatbot name cannot be empty',
    'string.min': 'Chatbot name must be at least 1 character',
    'string.max': 'Chatbot name must not exceed 100 characters',
  }),
  description: Joi.string().max(500).allow(null, '').messages({
    'string.max': 'Description must not exceed 500 characters',
  }),
  systemPrompt: Joi.string().min(10).max(5000).messages({
    'string.min': 'System prompt must be at least 10 characters',
    'string.max': 'System prompt must not exceed 5000 characters',
  }),
  welcomeMessage: Joi.string().max(1000).allow(null, '').messages({
    'string.max': 'Welcome message must not exceed 1000 characters',
  }),
  fallbackMessage: Joi.string().min(1).max(1000).messages({
    'string.empty': 'Fallback message cannot be empty',
    'string.min': 'Fallback message must be at least 1 character',
    'string.max': 'Fallback message must not exceed 1000 characters',
  }),
  triggers: Joi.object({
    keywords: Joi.array().items(Joi.string()),
    tags: Joi.array().items(Joi.string()),
    timeBasedStart: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .allow(null),
    timeBasedEnd: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .allow(null),
    autoReply: Joi.boolean(),
  }),
  conversationTimeout: Joi.number().integer().min(1).max(1440).messages({
    'number.min': 'Conversation timeout must be at least 1 minute',
    'number.max': 'Conversation timeout must not exceed 1440 minutes (24 hours)',
  }),
  maxConversationTurns: Joi.number().integer().min(1).max(100).messages({
    'number.min': 'Max conversation turns must be at least 1',
    'number.max': 'Max conversation turns must not exceed 100',
  }),
  contextWindow: Joi.number().integer().min(1).max(20).messages({
    'number.min': 'Context window must be at least 1',
    'number.max': 'Context window must not exceed 20',
  }),
  aiProviderId: Joi.string().uuid().messages({
    'string.uuid': 'Invalid AI provider ID format',
  }),
}).min(1);

const testChatbotSchema = Joi.object({
  message: Joi.string().min(1).max(1000).required().messages({
    'string.empty': 'Test message is required',
    'string.min': 'Test message must be at least 1 character',
    'string.max': 'Test message must not exceed 1000 characters',
    'any.required': 'Test message is required',
  }),
});

const getChatbotsQuerySchema = Joi.object({
  accountId: Joi.string().uuid().messages({
    'string.uuid': 'Invalid WhatsApp account ID format',
  }),
  isActive: Joi.string().valid('true', 'false').messages({
    'any.only': 'isActive must be either "true" or "false"',
  }),
  page: Joi.number().integer().min(1).default(1).messages({
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
});

export { createChatbotSchema, updateChatbotSchema, testChatbotSchema, getChatbotsQuerySchema };

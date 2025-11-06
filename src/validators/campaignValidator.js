/**
 * Campaign Validation Schemas
 *
 * Joi validation schemas for campaign-related operations
 */

import Joi from 'joi';

/**
 * Schema for creating a new campaign
 */
export const createCampaignSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Campaign name is required',
    'string.max': 'Campaign name must not exceed 255 characters',
  }),

  description: Joi.string().max(1000).allow(null, '').optional(),

  accountId: Joi.string().uuid().required().messages({
    'string.empty': 'WhatsApp account ID is required',
    'string.guid': 'Invalid WhatsApp account ID format',
  }),

  templateId: Joi.string().uuid().allow(null).optional(),

  messageType: Joi.string()
    .valid('text', 'template', 'image', 'video', 'document')
    .required()
    .messages({
      'any.only': 'Message type must be one of: text, template, image, video, document',
    }),

  messageContent: Joi.string().when('messageType', {
    is: Joi.string().valid('text', 'image', 'video', 'document'),
    then: Joi.string().required().max(4096),
    otherwise: Joi.string().allow(null, '').optional(),
  }).messages({
    'string.empty': 'Message content is required for this message type',
    'string.max': 'Message content must not exceed 4096 characters',
  }),

  templateVariables: Joi.object().when('messageType', {
    is: 'template',
    then: Joi.object().optional(),
    otherwise: Joi.forbidden(),
  }),

  audienceType: Joi.string()
    .valid('all', 'segment', 'custom', 'tags')
    .required()
    .messages({
      'any.only': 'Audience type must be one of: all, segment, custom, tags',
    }),

  audienceConfig: Joi.object({
    segmentId: Joi.string().uuid().when('...audienceType', {
      is: 'segment',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    contactIds: Joi.array().items(Joi.string().uuid()).min(1).max(10000).when('...audienceType', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    tags: Joi.array().items(Joi.string()).min(1).when('...audienceType', {
      is: 'tags',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    excludeContactIds: Joi.array().items(Joi.string().uuid()).optional(),
  }).required(),

  scheduleType: Joi.string()
    .valid('now', 'scheduled', 'recurring')
    .default('now')
    .messages({
      'any.only': 'Schedule type must be one of: now, scheduled, recurring',
    }),

  scheduledAt: Joi.date().when('scheduleType', {
    is: 'scheduled',
    then: Joi.date().greater('now').required(),
    otherwise: Joi.forbidden(),
  }).messages({
    'date.greater': 'Scheduled time must be in the future',
  }),

  recurringConfig: Joi.object({
    frequency: Joi.string().valid('daily', 'weekly', 'monthly').required(),
    interval: Joi.number().integer().min(1).max(365).required(),
    endDate: Joi.date().greater('now').optional(),
    maxOccurrences: Joi.number().integer().min(1).optional(),
  }).when('scheduleType', {
    is: 'recurring',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  throttleConfig: Joi.object({
    messagesPerMinute: Joi.number().integer().min(1).max(100).default(10),
  }).default({ messagesPerMinute: 10 }),
});

/**
 * Schema for updating a campaign
 */
export const updateCampaignSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).allow(null, '').optional(),
  messageContent: Joi.string().max(4096).optional(),
  templateVariables: Joi.object().optional(),
  scheduledAt: Joi.date().greater('now').optional(),
  throttleConfig: Joi.object({
    messagesPerMinute: Joi.number().integer().min(1).max(100),
  }).optional(),
  status: Joi.string()
    .valid('draft', 'scheduled', 'paused')
    .optional()
    .messages({
      'any.only': 'Status can only be updated to: draft, scheduled, paused',
    }),
}).min(1);

/**
 * Schema for listing campaigns with filters
 */
export const listCampaignsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string()
    .valid('draft', 'scheduled', 'running', 'paused', 'completed', 'failed')
    .optional(),
  accountId: Joi.string().uuid().optional(),
  search: Joi.string().max(255).optional(),
  sortBy: Joi.string()
    .valid('created_at', 'updated_at', 'scheduled_at', 'name', 'status')
    .default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().greater(Joi.ref('startDate')).optional(),
});

/**
 * Schema for campaign ID parameter
 */
export const campaignIdSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid campaign ID format',
  }),
});

/**
 * Schema for listing campaign recipients
 */
export const listRecipientsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  status: Joi.string()
    .valid('pending', 'sent', 'delivered', 'read', 'failed')
    .optional(),
  sortBy: Joi.string()
    .valid('created_at', 'sent_at', 'delivered_at', 'read_at', 'status')
    .default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

/**
 * Schema for creating an A/B test campaign
 */
export const createABTestSchema = Joi.object({
  name: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Campaign name is required',
    'string.max': 'Campaign name must not exceed 255 characters',
  }),

  description: Joi.string().max(1000).allow(null, '').optional(),

  accountId: Joi.string().uuid().required().messages({
    'string.empty': 'WhatsApp account ID is required',
    'string.guid': 'Invalid WhatsApp account ID format',
  }),

  variants: Joi.array()
    .items(
      Joi.object({
        name: Joi.string().min(1).max(100).required(),
        messageType: Joi.string()
          .valid('text', 'template', 'image', 'video', 'document')
          .required(),
        messageContent: Joi.string().max(4096).required(),
        templateId: Joi.string().uuid().optional(),
        templateVariables: Joi.object().optional(),
        percentage: Joi.number().min(1).max(100).required(),
      })
    )
    .min(2)
    .max(5)
    .required()
    .custom((variants, helpers) => {
      // Validate that percentages sum to 100
      const totalPercentage = variants.reduce((sum, v) => sum + v.percentage, 0);
      if (totalPercentage !== 100) {
        return helpers.error('any.invalid', {
          message: 'Variant percentages must sum to 100',
        });
      }
      return variants;
    })
    .messages({
      'array.min': 'At least 2 variants are required for A/B testing',
      'array.max': 'Maximum 5 variants allowed for A/B testing',
    }),

  audienceType: Joi.string()
    .valid('all', 'segment', 'custom', 'tags')
    .required()
    .messages({
      'any.only': 'Audience type must be one of: all, segment, custom, tags',
    }),

  audienceConfig: Joi.object({
    segmentId: Joi.string().uuid().when('...audienceType', {
      is: 'segment',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    contactIds: Joi.array().items(Joi.string().uuid()).min(1).max(10000).when('...audienceType', {
      is: 'custom',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    tags: Joi.array().items(Joi.string()).min(1).when('...audienceType', {
      is: 'tags',
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    }),
    excludeContactIds: Joi.array().items(Joi.string().uuid()).optional(),
  }).required(),

  scheduleType: Joi.string()
    .valid('now', 'scheduled')
    .default('now')
    .messages({
      'any.only': 'Schedule type must be one of: now, scheduled',
    }),

  scheduledAt: Joi.date().when('scheduleType', {
    is: 'scheduled',
    then: Joi.date().greater('now').required(),
    otherwise: Joi.forbidden(),
  }).messages({
    'date.greater': 'Scheduled time must be in the future',
  }),

  throttleConfig: Joi.object({
    messagesPerMinute: Joi.number().integer().min(1).max(100).default(10),
  }).default({ messagesPerMinute: 10 }),

  winnerCriteria: Joi.string()
    .valid('delivery_rate', 'read_rate', 'reply_rate', 'engagement_rate')
    .default('read_rate')
    .messages({
      'any.only':
        'Winner criteria must be one of: delivery_rate, read_rate, reply_rate, engagement_rate',
    }),

  testDuration: Joi.number().integer().min(1).max(168).default(24).messages({
    'number.min': 'Test duration must be at least 1 hour',
    'number.max': 'Test duration cannot exceed 168 hours (7 days)',
  }),

  autoSelectWinner: Joi.boolean().default(true),
});

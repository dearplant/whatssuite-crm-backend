/**
 * Analytics Validator
 * Validation schemas for analytics endpoints
 */

import Joi from 'joi';

/**
 * Validate date range query parameters
 */
export const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  compareWith: Joi.string().valid('previous', 'none').optional(),
  accountId: Joi.string().uuid().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
});

/**
 * Validate message analytics query parameters
 */
export const messageAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  accountId: Joi.string().uuid().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
  status: Joi.string().valid('pending', 'sent', 'delivered', 'read', 'failed').optional(),
});

/**
 * Validate campaign analytics query parameters
 */
export const campaignAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  accountId: Joi.string().uuid().optional(),
  status: Joi.string().valid('draft', 'scheduled', 'running', 'paused', 'completed', 'failed').optional(),
});

/**
 * Validate contact analytics query parameters
 */
export const contactAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
});

/**
 * Validate revenue analytics query parameters
 */
export const revenueAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  integrationId: Joi.string().uuid().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').optional(),
});

/**
 * Validate chatbot analytics query parameters
 */
export const chatbotAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
  chatbotId: Joi.string().uuid().optional(),
});

export default {
  dateRangeSchema,
  messageAnalyticsSchema,
  campaignAnalyticsSchema,
  contactAnalyticsSchema,
  revenueAnalyticsSchema,
  chatbotAnalyticsSchema,
};

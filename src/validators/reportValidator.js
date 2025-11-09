/**
 * Report Validation Schemas
 */

import Joi from 'joi';

/**
 * Validation schema for creating a report
 */
export const createReportSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  reportType: Joi.string()
    .valid('Overview', 'Messages', 'Campaigns', 'Contacts', 'Revenue', 'Chatbots', 'Flows', 'Custom')
    .required(),
  format: Joi.string()
    .valid('CSV', 'PDF', 'Excel')
    .required(),
  filters: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    accountId: Joi.string().uuid(),
    groupBy: Joi.string().valid('day', 'week', 'month'),
    status: Joi.string(),
    integrationId: Joi.string().uuid(),
    chatbotId: Joi.string().uuid()
  }).optional()
});

/**
 * Validation schema for scheduling a report
 */
export const scheduleReportSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  reportType: Joi.string()
    .valid('Overview', 'Messages', 'Campaigns', 'Contacts', 'Revenue', 'Chatbots', 'Flows', 'Custom')
    .required(),
  format: Joi.string()
    .valid('CSV', 'PDF', 'Excel')
    .required(),
  filters: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().min(Joi.ref('startDate')),
    accountId: Joi.string().uuid(),
    groupBy: Joi.string().valid('day', 'week', 'month'),
    status: Joi.string(),
    integrationId: Joi.string().uuid(),
    chatbotId: Joi.string().uuid()
  }).optional(),
  frequency: Joi.string()
    .valid('daily', 'weekly', 'monthly')
    .required(),
  dayOfWeek: Joi.number().integer().min(0).max(6).when('frequency', {
    is: 'weekly',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  dayOfMonth: Joi.number().integer().min(1).max(31).when('frequency', {
    is: 'monthly',
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  time: Joi.string().pattern(/^([01]\d|2[0-3]):([0-5]\d)$/).required(), // HH:mm format
  timezone: Joi.string().default('UTC')
});

/**
 * Validation schema for query parameters
 */
export const getReportsQuerySchema = Joi.object({
  status: Joi.string().valid('Pending', 'Processing', 'Completed', 'Failed', 'Expired'),
  reportType: Joi.string().valid('Overview', 'Messages', 'Campaigns', 'Contacts', 'Revenue', 'Chatbots', 'Flows', 'Custom'),
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0)
});

export default {
  createReportSchema,
  scheduleReportSchema,
  getReportsQuerySchema
};

/**
 * Message Validators
 * Input validation for message operations
 */

import Joi from 'joi';

/**
 * Validate send message request
 */
export const validateSendMessage = (req, res, next) => {
  const schema = Joi.object({
    whatsappAccountId: Joi.string().uuid().required().messages({
      'string.empty': 'WhatsApp account ID is required',
      'string.uuid': 'Invalid WhatsApp account ID format',
      'any.required': 'WhatsApp account ID is required',
    }),
    to: Joi.string()
      .pattern(/^\+?[1-9]\d{1,14}$/)
      .required()
      .messages({
        'string.empty': 'Phone number is required',
        'string.pattern.base': 'Phone number must be in E.164 format',
        'any.required': 'Phone number is required',
      }),
    type: Joi.string()
      .valid('Text', 'Image', 'Video', 'Audio', 'Document')
      .default('Text')
      .messages({
        'any.only': 'Type must be one of: Text, Image, Video, Audio, Document',
      }),
    content: Joi.string().max(4096).required().messages({
      'string.empty': 'Message content is required',
      'string.max': 'Message content must not exceed 4096 characters',
      'any.required': 'Message content is required',
    }),
    mediaUrl: Joi.string().uri().optional().messages({
      'string.uri': 'Media URL must be a valid URL',
    }),
    scheduledFor: Joi.date().iso().greater('now').optional().messages({
      'date.base': 'Scheduled date must be a valid date',
      'date.greater': 'Scheduled date must be in the future',
    }),
    campaignId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Invalid campaign ID format',
    }),
  });

  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = {};
    error.details.forEach((detail) => {
      errors[detail.path[0]] = detail.message;
    });

    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Invalid input data',
      details: errors,
    });
  }

  req.body = value;
  next();
};

/**
 * Validate get messages request
 */
export const validateGetMessages = (req, res, next) => {
  const schema = Joi.object({
    whatsappAccountId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Invalid WhatsApp account ID format',
    }),
    contactId: Joi.string().uuid().optional().messages({
      'string.uuid': 'Invalid contact ID format',
    }),
    direction: Joi.string().valid('Inbound', 'Outbound').optional().messages({
      'any.only': 'Direction must be either Inbound or Outbound',
    }),
    type: Joi.string().valid('Text', 'Image', 'Video', 'Audio', 'Document').optional().messages({
      'any.only': 'Type must be one of: Text, Image, Video, Audio, Document',
    }),
    status: Joi.string()
      .valid('Queued', 'Sent', 'Delivered', 'Read', 'Failed')
      .optional()
      .messages({
        'any.only': 'Status must be one of: Queued, Sent, Delivered, Read, Failed',
      }),
    startDate: Joi.date().iso().optional().messages({
      'date.base': 'Start date must be a valid date',
    }),
    endDate: Joi.date().iso().min(Joi.ref('startDate')).optional().messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date',
    }),
    page: Joi.number().integer().min(1).default(1).optional().messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1',
    }),
    limit: Joi.number().integer().min(1).max(100).default(50).optional().messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100',
    }),
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errors = {};
    error.details.forEach((detail) => {
      errors[detail.path[0]] = detail.message;
    });

    return res.status(400).json({
      success: false,
      error: 'ValidationError',
      message: 'Invalid query parameters',
      details: errors,
    });
  }

  req.query = value;
  next();
};

export default {
  validateSendMessage,
  validateGetMessages,
};

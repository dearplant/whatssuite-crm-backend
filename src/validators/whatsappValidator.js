import Joi from 'joi';

/**
 * Validation schema for connecting WhatsApp account
 */
export const connectAccountSchema = Joi.object({
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be in E.164 format (e.g., +1234567890)',
    }),
  displayName: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Display name must be at least 2 characters',
    'string.max': 'Display name must not exceed 100 characters',
  }),
});

/**
 * Validation schema for account ID parameter
 */
export const accountIdSchema = Joi.object({
  accountId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid account ID format',
    'any.required': 'Account ID is required',
  }),
});

/**
 * Validation schema for sending message
 */
export const sendMessageSchema = Joi.object({
  accountId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid account ID format',
    'any.required': 'Account ID is required',
  }),
  contactId: Joi.string().uuid().required().messages({
    'string.guid': 'Invalid contact ID format',
    'any.required': 'Contact ID is required',
  }),
  type: Joi.string().valid('Text', 'Image', 'Video', 'Audio', 'Document').default('Text').messages({
    'any.only': 'Message type must be one of: Text, Image, Video, Audio, Document',
  }),
  content: Joi.string().max(4096).required().messages({
    'string.max': 'Message content must not exceed 4096 characters',
    'any.required': 'Message content is required',
  }),
  mediaUrl: Joi.string().uri().optional().messages({
    'string.uri': 'Media URL must be a valid URL',
  }),
});

/**
 * Validation schema for getting messages
 */
export const getMessagesSchema = Joi.object({
  accountId: Joi.string().uuid().optional(),
  contactId: Joi.string().uuid().optional(),
  direction: Joi.string().valid('Inbound', 'Outbound').optional(),
  type: Joi.string().valid('Text', 'Image', 'Video', 'Audio', 'Document').optional(),
  status: Joi.string().valid('Queued', 'Sent', 'Delivered', 'Read', 'Failed').optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(100).default(50).optional(),
  offset: Joi.number().integer().min(0).default(0).optional(),
  sortBy: Joi.string()
    .valid('createdAt', 'sentAt', 'deliveredAt', 'readAt')
    .default('createdAt')
    .optional(),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').optional(),
});

/**
 * Middleware to validate connect account request
 */
export function validateConnectAccount(req, res, next) {
  const { error, value } = connectAccountSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = {};
    error.details.forEach((detail) => {
      details[detail.path[0]] = detail.message;
    });

    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid input data',
      details,
    });
  }

  req.validatedData = value;
  next();
}

/**
 * Middleware to validate account ID parameter
 */
export function validateAccountId(req, res, next) {
  const { error } = accountIdSchema.validate(req.params, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      error: 'ValidationError',
      message: error.details[0].message,
    });
  }

  next();
}

/**
 * Middleware to validate send message request
 */
export function validateSendMessage(req, res, next) {
  const { error, value } = sendMessageSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = {};
    error.details.forEach((detail) => {
      details[detail.path[0]] = detail.message;
    });

    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid input data',
      details,
    });
  }

  req.validatedData = value;
  next();
}

/**
 * Middleware to validate get messages query parameters
 */
export function validateGetMessages(req, res, next) {
  const { error, value } = getMessagesSchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = {};
    error.details.forEach((detail) => {
      details[detail.path[0]] = detail.message;
    });

    return res.status(400).json({
      error: 'ValidationError',
      message: 'Invalid query parameters',
      details,
    });
  }

  req.query = value;
  next();
}

export default {
  connectAccountSchema,
  accountIdSchema,
  sendMessageSchema,
  getMessagesSchema,
  validateConnectAccount,
  validateAccountId,
  validateSendMessage,
  validateGetMessages,
};

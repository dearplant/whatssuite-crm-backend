import Joi from 'joi';

/**
 * Contact Validation Schemas
 */

/**
 * Create contact validation schema
 */
export const createContactSchema = Joi.object({
  whatsappAccountId: Joi.string().uuid().required().messages({
    'string.uuid': 'WhatsApp account ID must be a valid UUID',
    'any.required': 'WhatsApp account ID is required',
  }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be in E.164 format (e.g., +1234567890)',
      'any.required': 'Phone number is required',
    }),
  name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 100 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Email must be a valid email address',
  }),
  company: Joi.string().max(100).optional().allow(''),
  jobTitle: Joi.string().max(100).optional().allow(''),
  address: Joi.string().max(255).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
  postalCode: Joi.string().max(20).optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional(),
  customFields: Joi.object().optional(),
  notes: Joi.string().optional().allow(''),
  isBlocked: Joi.boolean().optional(),
  isPinned: Joi.boolean().optional(),
});

/**
 * Update contact validation schema
 */
export const updateContactSchema = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional().allow(''),
  company: Joi.string().max(100).optional().allow(''),
  jobTitle: Joi.string().max(100).optional().allow(''),
  address: Joi.string().max(255).optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
  postalCode: Joi.string().max(20).optional().allow(''),
  tags: Joi.array().items(Joi.string()).optional(),
  customFields: Joi.object().optional(),
  notes: Joi.string().optional().allow(''),
  isBlocked: Joi.boolean().optional(),
  isPinned: Joi.boolean().optional(),
}).min(1);

/**
 * Query contacts validation schema
 */
export const queryContactsSchema = Joi.object({
  whatsappAccountId: Joi.string().uuid().optional(),
  search: Joi.string().optional(),
  tags: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()))
    .optional(),
  isBlocked: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(50),
});

/**
 * Import contacts validation schema
 */
export const importContactsSchema = Joi.object({
  whatsappAccountId: Joi.string().uuid().required().messages({
    'string.empty': 'WhatsApp account ID is required',
    'string.uuid': 'WhatsApp account ID must be a valid UUID',
    'any.required': 'WhatsApp account ID is required',
  }),
});

/**
 * Export contacts validation schema
 */
export const exportContactsSchema = Joi.object({
  whatsappAccountId: Joi.string().uuid().optional().messages({
    'string.uuid': 'WhatsApp account ID must be a valid UUID',
  }),
  search: Joi.string().optional(),
  tags: Joi.string().optional(),
  source: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
});

/**
 * Validation middleware factory
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
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
  };
}

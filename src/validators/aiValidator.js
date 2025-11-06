import Joi from 'joi';

/**
 * Validation middleware wrapper
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }
    next();
  };
};

/**
 * Schema for creating/updating AI provider
 */
export const createProviderSchema = Joi.object({
  provider: Joi.string()
    .valid('OpenAI', 'Claude', 'Gemini', 'Cohere', 'Ollama')
    .required()
    .messages({
      'any.required': 'Provider type is required',
      'any.only': 'Provider must be one of: OpenAI, Claude, Gemini, Cohere, Ollama',
    }),
  credentials: Joi.object().required().messages({
    'any.required': 'Credentials are required',
    'object.base': 'Credentials must be an object',
  }),
  modelConfig: Joi.object({
    model: Joi.string(),
    temperature: Joi.number().min(0).max(2),
    maxTokens: Joi.number().min(1).max(100000),
    topP: Joi.number().min(0).max(1),
    frequencyPenalty: Joi.number().min(-2).max(2),
    presencePenalty: Joi.number().min(-2).max(2),
  }).optional(),
});

/**
 * Schema for updating AI provider
 */
export const updateProviderSchema = Joi.object({
  credentials: Joi.object().optional(),
  modelConfig: Joi.object({
    model: Joi.string(),
    temperature: Joi.number().min(0).max(2),
    maxTokens: Joi.number().min(1).max(100000),
    topP: Joi.number().min(0).max(1),
    frequencyPenalty: Joi.number().min(-2).max(2),
    presencePenalty: Joi.number().min(-2).max(2),
  }).optional(),
  isActive: Joi.boolean().optional(),
});

/**
 * Schema for testing AI provider
 */
export const testProviderSchema = Joi.object({
  message: Joi.string().optional().default('Hello, this is a test message.'),
  maxTokens: Joi.number().min(1).max(1000).optional().default(50),
});

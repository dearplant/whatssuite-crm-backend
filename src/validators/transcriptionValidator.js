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
 * Schema for creating transcription
 */
export const createTranscriptionSchema = Joi.object({
  messageId: Joi.string().required().messages({
    'any.required': 'Message ID is required',
    'string.empty': 'Message ID cannot be empty',
  }),
  audioUrl: Joi.string().uri().required().messages({
    'any.required': 'Audio URL is required',
    'string.uri': 'Audio URL must be a valid URL',
  }),
  language: Joi.string()
    .valid('en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ru', 'ar', 'zh', 'ja', 'ko')
    .optional()
    .messages({
      'any.only': 'Language must be a supported language code',
    }),
  provider: Joi.string()
    .valid('WhisperAPI', 'WhisperCpp', 'GoogleSTT', 'AssemblyAI')
    .optional()
    .messages({
      'any.only': 'Provider must be one of: WhisperAPI, WhisperCpp, GoogleSTT, AssemblyAI',
    }),
  triggerChatbot: Joi.boolean().optional().default(false),
});

export default {
  validate,
  createTranscriptionSchema,
};

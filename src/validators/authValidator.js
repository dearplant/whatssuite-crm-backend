import Joi from 'joi';

/**
 * Validation schemas for authentication endpoints
 */

// Password validation rules
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    'any.required': 'Password is required',
  });

// Register validation schema
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: passwordSchema,
  firstName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'string.max': 'First name must not exceed 50 characters',
    'any.required': 'First name is required',
  }),
  lastName: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'string.max': 'Last name must not exceed 50 characters',
    'any.required': 'Last name is required',
  }),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone must be in E.164 format (e.g., +1234567890)',
    }),
  language: Joi.string().valid('en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja').optional(),
  timezone: Joi.string().optional(),
});

// Login validation schema
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// Refresh token validation schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

// Forgot password validation schema
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
});

// Reset password validation schema
export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Reset token is required',
  }),
  password: passwordSchema,
});

// Verify email validation schema
export const verifyEmailSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Verification token is required',
  }),
});

// Update profile validation schema
export const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  phone: Joi.string()
    .pattern(/^\+[1-9]\d{1,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Phone must be in E.164 format (e.g., +1234567890)',
    }),
  language: Joi.string().valid('en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja').optional(),
  timezone: Joi.string().optional(),
  profilePicture: Joi.string().uri().optional(),
}).min(1);

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @returns {Function} Express middleware
 */
export function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
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
        timestamp: new Date().toISOString(),
      });
    }

    req.validatedData = value;
    next();
  };
}

/**
 * Validation Middleware
 *
 * Generic validation middleware for request validation using Joi schemas
 */

import logger from '../utils/logger.js';

/**
 * Validate request body against a Joi schema
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error:', { errors, body: req.body });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.body with validated and sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate request query parameters against a Joi schema
 */
export function validateQuery(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Query validation error:', { errors, query: req.query });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Store validated value in a new property to avoid read-only issues
    req.validatedQuery = value;
    next();
  };
}

/**
 * Validate request params against a Joi schema
 */
export function validateParams(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Params validation error:', { errors, params: req.params });

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
      });
    }

    // Replace req.params with validated value
    req.params = value;
    next();
  };
}

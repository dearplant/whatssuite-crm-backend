/**
 * Segment Validators
 *
 * Validation schemas for segment endpoints
 */

import Joi from 'joi';

/**
 * Validation middleware
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = {};
      error.details.forEach((detail) => {
        details[detail.path.join('.')] = detail.message;
      });

      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: details,
      });
    }

    // Store validated data in a separate property to avoid overwriting read-only properties
    if (source === 'query') {
      req.validatedQuery = value;
    } else if (source === 'body') {
      req.validatedData = value;
    } else {
      req[source] = value;
    }
    next();
  };
}

/**
 * Segment rule schema
 */
const segmentRuleSchema = Joi.object({
  field: Joi.string()
    .valid(
      'first_name',
      'last_name',
      'email',
      'phone',
      'company',
      'city',
      'country',
      'source',
      'engagement_score',
      'created_at',
      'updated_at',
      'last_contacted_at',
      'tags',
      'is_blocked',
      'custom_fields'
    )
    .required(),
  operator: Joi.string()
    .valid(
      'equals',
      'not_equals',
      'contains',
      'not_contains',
      'starts_with',
      'ends_with',
      'is_empty',
      'is_not_empty',
      'greater_than',
      'greater_than_or_equal',
      'less_than',
      'less_than_or_equal',
      'before',
      'after',
      'between',
      'has_any',
      'has_all',
      'has_none',
      'has_key',
      'key_equals'
    )
    .required(),
  value: Joi.alternatives().try(
    Joi.string(),
    Joi.number(),
    Joi.boolean(),
    Joi.array().items(Joi.string()),
    Joi.object()
  ),
});

/**
 * Segment conditions schema
 */
const segmentConditionsSchema = Joi.object({
  operator: Joi.string().valid('AND', 'OR').default('AND'),
  rules: Joi.array().items(segmentRuleSchema).min(1).required(),
});

/**
 * Create segment schema
 */
export const createSegmentSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional().allow('', null),
  conditions: segmentConditionsSchema.required(),
});

/**
 * Update segment schema
 */
export const updateSegmentSchema = Joi.object({
  name: Joi.string().min(1).max(100).optional(),
  description: Joi.string().max(500).optional().allow('', null),
  conditions: segmentConditionsSchema.optional(),
});

/**
 * Query segment contacts schema
 */
export const querySegmentContactsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
  sortBy: Joi.string()
    .valid(
      'created_at',
      'updated_at',
      'first_name',
      'last_name',
      'email',
      'engagement_score',
      'last_contacted_at'
    )
    .default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

/**
 * Bulk action schema
 */
export const bulkActionSchema = Joi.object({
  action: Joi.string().valid('add_tags', 'remove_tags', 'delete', 'update_field').required(),
  contactIds: Joi.array().items(Joi.string().uuid()).min(1).max(1000).optional(),
  segmentId: Joi.string().uuid().optional(),
  data: Joi.object().optional(),
}).or('contactIds', 'segmentId');

/**
 * Get tags schema
 */
export const queryTagsSchema = Joi.object({
  search: Joi.string().max(100).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

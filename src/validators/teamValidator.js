import Joi from 'joi';

/**
 * Validation schema for inviting a team member
 */
const inviteTeamMemberSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  role: Joi.string()
    .valid('Owner', 'Admin', 'Manager', 'Agent')
    .required()
    .messages({
      'any.only': 'Role must be one of: Owner, Admin, Manager, Agent',
      'any.required': 'Role is required'
    })
});

/**
 * Validation schema for updating member role
 */
const updateMemberRoleSchema = Joi.object({
  role: Joi.string()
    .valid('Owner', 'Admin', 'Manager', 'Agent')
    .required()
    .messages({
      'any.only': 'Role must be one of: Owner, Admin, Manager, Agent',
      'any.required': 'Role is required'
    })
});

/**
 * Validation schema for getting team members
 */
const getTeamMembersSchema = Joi.object({
  role: Joi.string()
    .valid('Owner', 'Admin', 'Manager', 'Agent')
    .optional(),
  status: Joi.string()
    .valid('Invited', 'Active', 'Suspended', 'Removed')
    .optional()
});

/**
 * Validation schema for getting activity logs
 */
const getActivityLogsSchema = Joi.object({
  userId: Joi.string().uuid().optional(),
  action: Joi.string().optional(),
  resource: Joi.string().optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100).optional(),
  offset: Joi.number().integer().min(0).default(0).optional()
});

export {
  inviteTeamMemberSchema,
  updateMemberRoleSchema,
  getTeamMembersSchema,
  getActivityLogsSchema
};

import Joi from 'joi';

// Node schema
const nodeSchema = Joi.object({
  id: Joi.string().required(),
  type: Joi.string().valid(
    'trigger', 'wait', 'send_message', 'condition', 'add_tag', 
    'remove_tag', 'update_field', 'http_request', 'ai_chatbot', 
    'branch', 'join', 'end'
  ).required(),
  config: Joi.object().optional(),
  position: Joi.object({
    x: Joi.number().required(),
    y: Joi.number().required()
  }).optional()
});

// Edge schema
const edgeSchema = Joi.object({
  id: Joi.string().required(),
  source: Joi.string().required(),
  target: Joi.string().required(),
  label: Joi.string().optional(),
  type: Joi.string().optional()
});

// Create flow schema
const createFlowSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  triggerType: Joi.string().valid(
    'message_received', 'keyword', 'tag_added', 'tag_removed', 
    'field_updated', 'time_based', 'webhook'
  ).required(),
  trigger_config: Joi.object().optional().default({}),
  nodes: Joi.array().items(nodeSchema).min(1).required(),
  edges: Joi.array().items(edgeSchema).required(),
  variables: Joi.object().optional().default({}),
  is_active: Joi.boolean().optional().default(false)
});

// Update flow schema
const updateFlowSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  triggerType: Joi.string().valid(
    'message_received', 'keyword', 'tag_added', 'tag_removed', 
    'field_updated', 'time_based', 'webhook'
  ).optional(),
  trigger_config: Joi.object().optional(),
  nodes: Joi.array().items(nodeSchema).min(1).optional(),
  edges: Joi.array().items(edgeSchema).optional(),
  variables: Joi.object().optional(),
  is_active: Joi.boolean().optional()
}).min(1);

// Query filters schema
const flowFiltersSchema = Joi.object({
  is_active: Joi.boolean().optional(),
  triggerType: Joi.string().valid(
    'message_received', 'keyword', 'tag_added', 'tag_removed', 
    'field_updated', 'time_based', 'webhook'
  ).optional(),
  search: Joi.string().max(255).optional()
});

export {
  createFlowSchema,
  updateFlowSchema,
  flowFiltersSchema
};

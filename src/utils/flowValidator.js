import { logger } from './logger.js';

/**
 * Flow Validator Utility
 * Validates flow structure, detects cycles, and validates node configurations
 */

// Supported node types
const NODE_TYPES = {
  TRIGGER: 'trigger',
  WAIT: 'wait',
  SEND_MESSAGE: 'send_message',
  CONDITION: 'condition',
  ADD_TAG: 'add_tag',
  REMOVE_TAG: 'remove_tag',
  UPDATE_FIELD: 'update_field',
  HTTP_REQUEST: 'http_request',
  AI_CHATBOT: 'ai_chatbot',
  BRANCH: 'branch',
  JOIN: 'join',
  END: 'end',
};

// Supported trigger types
const TRIGGER_TYPES = {
  MESSAGE_RECEIVED: 'message_received',
  KEYWORD: 'keyword',
  TAG_ADDED: 'tag_added',
  TAG_REMOVED: 'tag_removed',
  FIELD_UPDATED: 'field_updated',
  TIME_BASED: 'time_based',
  WEBHOOK: 'webhook',
};

// Supported condition operators
const CONDITION_OPERATORS = {
  EQUALS: 'equals',
  NOT_EQUALS: 'not_equals',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  STARTS_WITH: 'starts_with',
  ENDS_WITH: 'ends_with',
  GREATER_THAN: 'greater_than',
  LESS_THAN: 'less_than',
  GREATER_THAN_OR_EQUAL: 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL: 'less_than_or_equal',
  IS_EMPTY: 'is_empty',
  IS_NOT_EMPTY: 'is_not_empty',
};

/**
 * Validate complete flow structure
 */
function validateFlow(flowData) {
  const errors = [];

  // Validate basic structure
  if (!flowData.name || typeof flowData.name !== 'string') {
    errors.push('Flow name is required and must be a string');
  }

  if (!flowData.triggerType || !Object.values(TRIGGER_TYPES).includes(flowData.triggerType)) {
    errors.push(`Invalid trigger type. Must be one of: ${Object.values(TRIGGER_TYPES).join(', ')}`);
  }

  if (!flowData.nodes || !Array.isArray(flowData.nodes)) {
    errors.push('Flow must have a nodes array');
  }

  if (!flowData.edges || !Array.isArray(flowData.edges)) {
    errors.push('Flow must have an edges array');
  }

  // If basic structure is invalid, return early
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Validate nodes
  const nodeErrors = validateNodes(flowData.nodes);
  errors.push(...nodeErrors);

  // Validate edges
  const edgeErrors = validateEdges(flowData.edges, flowData.nodes);
  errors.push(...edgeErrors);

  // Check for cycles
  const cycleErrors = detectCycles(flowData.nodes, flowData.edges);
  errors.push(...cycleErrors);

  // Validate trigger configuration
  const triggerErrors = validateTriggerConfig(flowData.triggerType, flowData.trigger_config);
  errors.push(...triggerErrors);

  // Check for orphaned nodes
  const orphanErrors = detectOrphanedNodes(flowData.nodes, flowData.edges);
  errors.push(...orphanErrors);

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all nodes in the flow
 */
function validateNodes(nodes) {
  const errors = [];
  const nodeIds = new Set();

  if (nodes.length === 0) {
    errors.push('Flow must have at least one node');
    return errors;
  }

  nodes.forEach((node, index) => {
    // Check required fields
    if (!node.id) {
      errors.push(`Node at index ${index} is missing an id`);
      return;
    }

    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node id: ${node.id}`);
    }
    nodeIds.add(node.id);

    if (!node.type || !Object.values(NODE_TYPES).includes(node.type)) {
      errors.push(
        `Node ${node.id} has invalid type. Must be one of: ${Object.values(NODE_TYPES).join(', ')}`
      );
      return;
    }

    // Validate node-specific configuration
    const nodeErrors = validateNodeConfig(node);
    errors.push(...nodeErrors);
  });

  return errors;
}

/**
 * Validate node-specific configuration
 */
function validateNodeConfig(node) {
  const errors = [];

  switch (node.type) {
    case NODE_TYPES.WAIT:
      if (!node.config || !node.config.duration) {
        errors.push(`Wait node ${node.id} must have a duration in config`);
      } else if (typeof node.config.duration !== 'number' || node.config.duration <= 0) {
        errors.push(`Wait node ${node.id} duration must be a positive number`);
      }
      break;

    case NODE_TYPES.SEND_MESSAGE:
      if (!node.config || !node.config.message) {
        errors.push(`Send message node ${node.id} must have a message in config`);
      }
      if (
        node.config &&
        node.config.messageType &&
        !['text', 'image', 'video', 'audio', 'document'].includes(node.config.messageType)
      ) {
        errors.push(`Send message node ${node.id} has invalid messageType`);
      }
      break;

    case NODE_TYPES.CONDITION:
      if (!node.config || !node.config.conditions || !Array.isArray(node.config.conditions)) {
        errors.push(`Condition node ${node.id} must have conditions array in config`);
      } else {
        node.config.conditions.forEach((condition, idx) => {
          if (!condition.field) {
            errors.push(`Condition ${idx} in node ${node.id} must have a field`);
          }
          if (
            !condition.operator ||
            !Object.values(CONDITION_OPERATORS).includes(condition.operator)
          ) {
            errors.push(`Condition ${idx} in node ${node.id} has invalid operator`);
          }
        });
      }
      break;

    case NODE_TYPES.ADD_TAG:
    case NODE_TYPES.REMOVE_TAG:
      if (!node.config || !node.config.tagId) {
        errors.push(`${node.type} node ${node.id} must have a tagId in config`);
      }
      break;

    case NODE_TYPES.UPDATE_FIELD:
      if (!node.config || !node.config.field) {
        errors.push(`Update field node ${node.id} must have a field in config`);
      }
      if (!node.config || node.config.value === undefined) {
        errors.push(`Update field node ${node.id} must have a value in config`);
      }
      break;

    case NODE_TYPES.HTTP_REQUEST:
      if (!node.config || !node.config.url) {
        errors.push(`HTTP request node ${node.id} must have a url in config`);
      }
      if (
        !node.config ||
        !node.config.method ||
        !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(node.config.method)
      ) {
        errors.push(
          `HTTP request node ${node.id} must have a valid method (GET, POST, PUT, PATCH, DELETE)`
        );
      }
      break;

    case NODE_TYPES.AI_CHATBOT:
      if (!node.config || !node.config.chatbotId) {
        errors.push(`AI chatbot node ${node.id} must have a chatbotId in config`);
      }
      break;

    case NODE_TYPES.BRANCH:
      if (!node.config || !node.config.branches || !Array.isArray(node.config.branches)) {
        errors.push(`Branch node ${node.id} must have branches array in config`);
      }
      break;
  }

  return errors;
}

/**
 * Validate edges
 */
function validateEdges(edges, nodes) {
  const errors = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  edges.forEach((edge, index) => {
    if (!edge.id) {
      errors.push(`Edge at index ${index} is missing an id`);
    }

    if (!edge.source) {
      errors.push(`Edge ${edge.id || index} is missing source node id`);
    } else if (!nodeIds.has(edge.source)) {
      errors.push(`Edge ${edge.id || index} references non-existent source node: ${edge.source}`);
    }

    if (!edge.target) {
      errors.push(`Edge ${edge.id || index} is missing target node id`);
    } else if (!nodeIds.has(edge.target)) {
      errors.push(`Edge ${edge.id || index} references non-existent target node: ${edge.target}`);
    }
  });

  return errors;
}

/**
 * Detect cycles in the flow graph
 */
function detectCycles(nodes, edges) {
  const errors = [];
  const adjacencyList = buildAdjacencyList(nodes, edges);
  const visited = new Set();
  const recursionStack = new Set();

  function hasCycle(nodeId, path = []) {
    if (recursionStack.has(nodeId)) {
      const cycleStart = path.indexOf(nodeId);
      const cycle = path.slice(cycleStart).concat(nodeId);
      errors.push(`Cycle detected: ${cycle.join(' -> ')}`);
      return true;
    }

    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycle(neighbor, [...path])) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check for cycles starting from each node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      hasCycle(node.id);
    }
  }

  return errors;
}

/**
 * Build adjacency list from nodes and edges
 */
function buildAdjacencyList(nodes, edges) {
  const adjacencyList = new Map();

  // Initialize with all nodes
  nodes.forEach((node) => {
    adjacencyList.set(node.id, []);
  });

  // Add edges
  edges.forEach((edge) => {
    const neighbors = adjacencyList.get(edge.source) || [];
    neighbors.push(edge.target);
    adjacencyList.set(edge.source, neighbors);
  });

  return adjacencyList;
}

/**
 * Validate trigger configuration
 */
function validateTriggerConfig(triggerType, config = {}) {
  const errors = [];

  switch (triggerType) {
    case TRIGGER_TYPES.KEYWORD:
      if (!config.keywords || !Array.isArray(config.keywords) || config.keywords.length === 0) {
        errors.push('Keyword trigger must have at least one keyword');
      }
      break;

    case TRIGGER_TYPES.TAG_ADDED:
    case TRIGGER_TYPES.TAG_REMOVED:
      if (!config.tagId) {
        errors.push(`${triggerType} trigger must have a tagId`);
      }
      break;

    case TRIGGER_TYPES.FIELD_UPDATED:
      if (!config.field) {
        errors.push('Field updated trigger must have a field name');
      }
      break;

    case TRIGGER_TYPES.TIME_BASED:
      if (!config.schedule) {
        errors.push('Time-based trigger must have a schedule');
      }
      break;

    case TRIGGER_TYPES.WEBHOOK:
      if (!config.webhookUrl) {
        errors.push('Webhook trigger must have a webhookUrl');
      }
      break;
  }

  return errors;
}

/**
 * Detect orphaned nodes (nodes with no incoming or outgoing edges)
 */
function detectOrphanedNodes(nodes, edges) {
  const errors = [];
  const nodesWithIncoming = new Set();
  const nodesWithOutgoing = new Set();

  edges.forEach((edge) => {
    nodesWithOutgoing.add(edge.source);
    nodesWithIncoming.add(edge.target);
  });

  // Find trigger node (should have no incoming edges)
  const triggerNodes = nodes.filter((n) => n.type === NODE_TYPES.TRIGGER);
  if (triggerNodes.length === 0) {
    errors.push('Flow must have at least one trigger node');
  }

  // Find end nodes (should have no outgoing edges)
  const endNodes = nodes.filter((n) => n.type === NODE_TYPES.END);

  // Check for orphaned nodes (excluding trigger and end nodes)
  nodes.forEach((node) => {
    if (node.type === NODE_TYPES.TRIGGER) {
      // Trigger nodes should have outgoing edges
      if (!nodesWithOutgoing.has(node.id)) {
        errors.push(`Trigger node ${node.id} has no outgoing edges`);
      }
    } else if (node.type === NODE_TYPES.END) {
      // End nodes should have incoming edges
      if (!nodesWithIncoming.has(node.id)) {
        errors.push(`End node ${node.id} has no incoming edges`);
      }
    } else {
      // Other nodes should have both incoming and outgoing edges
      if (!nodesWithIncoming.has(node.id) && !nodesWithOutgoing.has(node.id)) {
        errors.push(`Node ${node.id} is orphaned (no incoming or outgoing edges)`);
      }
    }
  });

  return errors;
}

export {
  validateFlow,
  validateNodes,
  validateEdges,
  detectCycles,
  validateTriggerConfig,
  NODE_TYPES,
  TRIGGER_TYPES,
  CONDITION_OPERATORS,
};

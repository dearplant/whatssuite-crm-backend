/**
 * Flow Executor Service
 * Handles flow execution logic with node-by-node processing
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import messageService from './messageService.js';
import contactService from './contactService.js';
import { flowQueue } from '../queues/index.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Node type handlers
 */
const nodeHandlers = {
  trigger: handleTriggerNode,
  wait: handleWaitNode,
  send_message: handleSendMessageNode,
  condition: handleConditionNode,
  add_tag: handleAddTagNode,
  remove_tag: handleRemoveTagNode,
  update_field: handleUpdateFieldNode,
  http_request: handleHttpRequestNode,
  ai_chatbot: handleAIChatbotNode,
  branch: handleBranchNode,
  join: handleJoinNode,
  end: handleEndNode,
};

/**
 * Start a new flow execution
 */
export async function startFlowExecution(flowId, contactId, triggerData = {}, conversationId = null) {
  try {
    // Get flow details
    const flow = await prisma.flows.findUnique({
      where: { id: flowId },
    });

    if (!flow) {
      throw new Error(`Flow not found: ${flowId}`);
    }

    if (!flow.is_active) {
      throw new Error(`Flow is not active: ${flowId}`);
    }

    // Create flow execution record
    const execution = await prisma.flow_executions.create({
      data: {
        id: uuidv4(),
        flow_id: flowId,
        contact_id: contactId,
        conversation_id: conversationId,
        status: 'running',
        current_node_id: null,
        variables: {
          ...flow.variables,
          trigger: triggerData,
        },
        started_at: new Date(),
        last_activity_at: new Date(),
      },
    });

    logger.info(`Flow execution started`, {
      executionId: execution.id,
      flowId,
      contactId,
    });

    // Queue the first node for execution
    await queueFlowExecution(execution.id);

    return execution;
  } catch (error) {
    logger.error('Error starting flow execution:', error);
    throw error;
  }
}

/**
 * Queue a flow execution for processing
 */
export async function queueFlowExecution(executionId, delay = 0) {
  return flowQueue.add(
    { executionId },
    {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    }
  );
}

/**
 * Process a flow execution (called by worker)
 */
export async function processFlowExecution(executionId) {
  try {
    // Get execution details
    const execution = await prisma.flow_executions.findUnique({
      where: { id: executionId },
      include: {
        flows: true,
        contacts: true,
      },
    });

    if (!execution) {
      throw new Error(`Flow execution not found: ${executionId}`);
    }

    if (execution.status !== 'running') {
      logger.info(`Flow execution not in running state, skipping`, {
        executionId,
        status: execution.status,
      });
      return;
    }

    const flow = execution.flows;
    const contact = execution.contacts;

    // Determine next node to execute
    const nextNode = getNextNode(flow, execution);

    if (!nextNode) {
      // No more nodes to execute, complete the flow
      await completeFlowExecution(executionId);
      return;
    }

    logger.info(`Executing node`, {
      executionId,
      nodeId: nextNode.id,
      nodeType: nextNode.type,
    });

    // Update current node
    await prisma.flow_executions.update({
      where: { id: executionId },
      data: {
        current_node_id: nextNode.id,
        last_activity_at: new Date(),
      },
    });

    // Execute the node
    const handler = nodeHandlers[nextNode.type];
    if (!handler) {
      throw new Error(`Unknown node type: ${nextNode.type}`);
    }

    const result = await handler(nextNode, execution, contact, flow);

    // Handle the result
    if (result.delay) {
      // Schedule next execution with delay
      await queueFlowExecution(executionId, result.delay);
    } else if (result.complete) {
      // Flow completed
      await completeFlowExecution(executionId);
    } else if (result.nextNodeId) {
      // Move to specific next node
      await updateExecutionVariables(executionId, result.variables || {});
      await queueFlowExecution(executionId);
    } else {
      // Continue to next node
      await updateExecutionVariables(executionId, result.variables || {});
      await queueFlowExecution(executionId);
    }
  } catch (error) {
    logger.error('Error processing flow execution:', error);
    await failFlowExecution(executionId, error.message);
    throw error;
  }
}

/**
 * Get the next node to execute
 */
function getNextNode(flow, execution) {
  const nodes = flow.nodes || [];
  const edges = flow.edges || [];

  // If no current node, find the trigger node
  if (!execution.current_node_id) {
    return nodes.find((node) => node.type === 'trigger');
  }

  // Find edges from current node
  const outgoingEdges = edges.filter((edge) => edge.source === execution.current_node_id);

  if (outgoingEdges.length === 0) {
    return null; // No more nodes
  }

  // For now, take the first edge (will be enhanced for branching)
  const nextEdge = outgoingEdges[0];
  return nodes.find((node) => node.id === nextEdge.target);
}

/**
 * Update execution variables
 */
async function updateExecutionVariables(executionId, newVariables) {
  const execution = await prisma.flow_executions.findUnique({
    where: { id: executionId },
  });

  const updatedVariables = {
    ...execution.variables,
    ...newVariables,
  };

  await prisma.flow_executions.update({
    where: { id: executionId },
    data: {
      variables: updatedVariables,
      last_activity_at: new Date(),
    },
  });
}

/**
 * Complete a flow execution
 */
async function completeFlowExecution(executionId) {
  await prisma.flow_executions.update({
    where: { id: executionId },
    data: {
      status: 'completed',
      completed_at: new Date(),
      last_activity_at: new Date(),
    },
  });

  logger.info(`Flow execution completed`, { executionId });
}

/**
 * Fail a flow execution
 */
async function failFlowExecution(executionId, errorMessage) {
  await prisma.flow_executions.update({
    where: { id: executionId },
    data: {
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date(),
      last_activity_at: new Date(),
    },
  });

  logger.error(`Flow execution failed`, { executionId, errorMessage });
}

/**
 * Node Handlers
 */

async function handleTriggerNode(node, execution, contact, flow) {
  // Trigger node just passes through
  logger.debug(`Trigger node executed`, { nodeId: node.id });
  return { variables: {} };
}

async function handleWaitNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { duration, unit } = nodeData;
  
  // Calculate delay in milliseconds
  let delayMs = 0;
  switch (unit) {
    case 'seconds':
      delayMs = duration * 1000;
      break;
    case 'minutes':
      delayMs = duration * 60 * 1000;
      break;
    case 'hours':
      delayMs = duration * 60 * 60 * 1000;
      break;
    case 'days':
      delayMs = duration * 24 * 60 * 60 * 1000;
      break;
    default:
      delayMs = duration * 1000; // Default to seconds
  }

  logger.debug(`Wait node executed`, { nodeId: node.id, delayMs });
  return { delay: delayMs, variables: {} };
}

async function handleSendMessageNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { message, messageType = 'text', mediaUrl } = nodeData;
  
  // Replace variables in message
  const processedMessage = replaceVariables(message, execution.variables, contact);

  // Send message (skip actual sending in test mode)
  if (execution.variables.testMode) {
    logger.debug(`Send message node executed (test mode)`, { nodeId: node.id, message: processedMessage });
    return { variables: { lastMessageId: 'test-message-id' } };
  }

  // Send message
  const result = await messageService.sendMessage({
    whatsappAccountId: flow.team_id, // This should be the account ID
    contactId: contact.id,
    type: messageType,
    content: processedMessage,
    mediaUrl: mediaUrl ? replaceVariables(mediaUrl, execution.variables, contact) : null,
  });

  logger.debug(`Send message node executed`, { nodeId: node.id, messageId: result.id });
  return { variables: { lastMessageId: result.id } };
}

async function handleConditionNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { conditions, operator = 'AND' } = nodeData;
  
  // Evaluate conditions
  const results = conditions.map((condition) => evaluateCondition(condition, execution.variables, contact));
  
  let conditionMet = false;
  if (operator === 'AND') {
    conditionMet = results.every((r) => r);
  } else if (operator === 'OR') {
    conditionMet = results.some((r) => r);
  }

  logger.debug(`Condition node executed`, { nodeId: node.id, conditionMet });
  
  // Find the appropriate edge based on condition result
  const edges = flow.edges || [];
  const outgoingEdges = edges.filter((edge) => edge.source === node.id);
  
  // Look for edge with matching condition
  const nextEdge = outgoingEdges.find((edge) => {
    if (conditionMet && edge.label === 'true') return true;
    if (!conditionMet && edge.label === 'false') return true;
    return false;
  });

  if (nextEdge) {
    const nextNode = flow.nodes.find((n) => n.id === nextEdge.target);
    return { nextNodeId: nextNode?.id, variables: { conditionResult: conditionMet } };
  }

  return { variables: { conditionResult: conditionMet } };
}

async function handleAddTagNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { tags } = nodeData;
  
  if (tags && tags.length > 0) {
    // Add tags to contact
    for (const tagName of tags) {
      await contactService.addTagToContact(contact.id, tagName, flow.team_id);
    }
  }

  logger.debug(`Add tag node executed`, { nodeId: node.id, tags });
  return { variables: {} };
}

async function handleRemoveTagNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { tags } = nodeData;
  
  if (tags && tags.length > 0) {
    // Remove tags from contact
    for (const tagName of tags) {
      await contactService.removeTagFromContact(contact.id, tagName, flow.team_id);
    }
  }

  logger.debug(`Remove tag node executed`, { nodeId: node.id, tags });
  return { variables: {} };
}

async function handleUpdateFieldNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { field, value } = nodeData;
  
  // Process value with variables
  const processedValue = replaceVariables(value, execution.variables, contact);
  
  // Update contact field
  const updateData = {};
  
  // Handle custom fields
  if (field.startsWith('custom_')) {
    const customFieldName = field.replace('custom_', '');
    updateData.custom_fields = {
      ...contact.custom_fields,
      [customFieldName]: processedValue,
    };
  } else {
    // Handle standard fields
    updateData[field] = processedValue;
  }

  await prisma.contacts.update({
    where: { id: contact.id },
    data: updateData,
  });

  logger.debug(`Update field node executed`, { nodeId: node.id, field, value: processedValue });
  return { variables: {} };
}

async function handleHttpRequestNode(node, execution, contact, flow) {
  // Support both 'data' and 'config' for backwards compatibility
  const nodeData = node.data || node.config || {};
  const { url, method = 'GET', headers = {}, body } = nodeData;
  
  // Replace variables in URL and body
  const processedUrl = replaceVariables(url, execution.variables, contact);
  const processedBody = body ? replaceVariables(JSON.stringify(body), execution.variables, contact) : null;

  try {
    const response = await fetch(processedUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: processedBody,
      timeout: 30000, // 30 second timeout
    });

    const responseData = await response.json();

    logger.debug(`HTTP request node executed`, { nodeId: node.id, url: processedUrl, status: response.status });
    return { 
      variables: { 
        httpResponse: responseData,
        httpStatus: response.status,
      } 
    };
  } catch (error) {
    logger.error(`HTTP request node failed`, { nodeId: node.id, error: error.message });
    return { 
      variables: { 
        httpError: error.message,
        httpStatus: 0,
      } 
    };
  }
}

async function handleAIChatbotNode(node, execution, contact, flow) {
  // This would integrate with AI service
  // For now, just log and continue
  logger.debug(`AI chatbot node executed`, { nodeId: node.id });
  return { variables: {} };
}

async function handleBranchNode(node, execution, contact, flow) {
  // Branch node splits execution into multiple paths
  // For now, just continue with first path
  logger.debug(`Branch node executed`, { nodeId: node.id });
  return { variables: {} };
}

async function handleJoinNode(node, execution, contact, flow) {
  // Join node waits for multiple paths to complete
  // For now, just continue
  logger.debug(`Join node executed`, { nodeId: node.id });
  return { variables: {} };
}

async function handleEndNode(node, execution, contact, flow) {
  logger.debug(`End node executed`, { nodeId: node.id });
  return { complete: true, variables: {} };
}

/**
 * Helper Functions
 */

function replaceVariables(text, variables, contact) {
  if (!text) return text;
  
  let result = text;
  
  // Replace contact variables
  result = result.replace(/\{\{contact\.(\w+)\}\}/g, (match, field) => {
    return contact[field] || contact.custom_fields?.[field] || match;
  });
  
  // Replace execution variables
  result = result.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return variables[varName] !== undefined ? variables[varName] : match;
  });
  
  return result;
}

function evaluateCondition(condition, variables, contact) {
  const { field, operator, value } = condition;
  
  // Get field value
  let fieldValue;
  if (field.startsWith('contact.')) {
    const contactField = field.replace('contact.', '');
    fieldValue = contact[contactField] || contact.custom_fields?.[contactField];
  } else {
    fieldValue = variables[field];
  }
  
  // Evaluate based on operator
  switch (operator) {
    case 'equals':
      return fieldValue == value;
    case 'not_equals':
      return fieldValue != value;
    case 'contains':
      return String(fieldValue).includes(value);
    case 'not_contains':
      return !String(fieldValue).includes(value);
    case 'starts_with':
      return String(fieldValue).startsWith(value);
    case 'ends_with':
      return String(fieldValue).endsWith(value);
    case 'greater_than':
      return Number(fieldValue) > Number(value);
    case 'less_than':
      return Number(fieldValue) < Number(value);
    case 'greater_than_or_equal':
      return Number(fieldValue) >= Number(value);
    case 'less_than_or_equal':
      return Number(fieldValue) <= Number(value);
    case 'is_empty':
      return !fieldValue || fieldValue === '';
    case 'is_not_empty':
      return fieldValue && fieldValue !== '';
    default:
      return false;
  }
}

export default {
  startFlowExecution,
  processFlowExecution,
  queueFlowExecution,
};

/**
 * Flow Trigger Registration System
 * Manages flow triggers and fires flows when events occur
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { startFlowExecution } from './flowExecutor.js';

/**
 * Trigger types supported
 */
export const TRIGGER_TYPES = {
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_SENT: 'message_sent',
  CONTACT_CREATED: 'contact_created',
  CONTACT_UPDATED: 'contact_updated',
  TAG_ADDED: 'tag_added',
  TAG_REMOVED: 'tag_removed',
  CAMPAIGN_COMPLETED: 'campaign_completed',
  KEYWORD_MATCH: 'keyword_match',
  TIME_BASED: 'time_based',
  WEBHOOK: 'webhook',
  MANUAL: 'manual',
};

/**
 * In-memory cache of active flows by trigger type
 * Structure: { triggerType: [{ flowId, teamId, config }] }
 */
const triggerCache = {};

/**
 * Initialize trigger system - load all active flows
 */
export async function initializeTriggers() {
  try {
    const activeFlows = await prisma.flows.findMany({
      where: {
        is_active: true,
        deleted_at: null,
      },
      select: {
        id: true,
        team_id: true,
        triggerType: true,
        trigger_config: true,
      },
    });

    // Clear cache
    Object.keys(triggerCache).forEach((key) => {
      triggerCache[key] = [];
    });

    // Populate cache
    activeFlows.forEach((flow) => {
      registerTrigger(flow.id, flow.team_id, flow.triggerType, flow.trigger_config);
    });

    logger.info(`Flow triggers initialized`, {
      totalFlows: activeFlows.length,
      triggerTypes: Object.keys(triggerCache),
    });
  } catch (error) {
    logger.error('Error initializing flow triggers:', error);
    throw error;
  }
}

/**
 * Register a flow trigger in the cache
 */
export function registerTrigger(flowId, teamId, triggerType, config = {}) {
  if (!triggerCache[triggerType]) {
    triggerCache[triggerType] = [];
  }

  // Remove existing registration if any
  triggerCache[triggerType] = triggerCache[triggerType].filter(
    (t) => t.flowId !== flowId
  );

  // Add new registration
  triggerCache[triggerType].push({
    flowId,
    teamId,
    config,
  });

  logger.debug(`Trigger registered`, { flowId, triggerType });
}

/**
 * Unregister a flow trigger from the cache
 */
export function unregisterTrigger(flowId, triggerType) {
  if (triggerCache[triggerType]) {
    triggerCache[triggerType] = triggerCache[triggerType].filter(
      (t) => t.flowId !== flowId
    );
    logger.debug(`Trigger unregistered`, { flowId, triggerType });
  }
}

/**
 * Fire a trigger event - find and start matching flows
 */
export async function fireTrigger(triggerType, eventData) {
  try {
    const triggers = triggerCache[triggerType] || [];

    if (triggers.length === 0) {
      logger.debug(`No flows registered for trigger type`, { triggerType });
      return [];
    }

    logger.info(`Firing trigger`, {
      triggerType,
      flowCount: triggers.length,
      eventData,
    });

    const executions = [];

    for (const trigger of triggers) {
      try {
        // Check if trigger conditions match
        if (!matchesTriggerConditions(trigger, eventData)) {
          continue;
        }

        // Start flow execution
        const execution = await startFlowExecution(
          trigger.flowId,
          eventData.contactId,
          eventData,
          eventData.conversationId
        );

        executions.push(execution);

        logger.info(`Flow execution started from trigger`, {
          flowId: trigger.flowId,
          executionId: execution.id,
          triggerType,
        });
      } catch (error) {
        logger.error(`Error starting flow from trigger`, {
          flowId: trigger.flowId,
          triggerType,
          error: error.message,
        });
      }
    }

    return executions;
  } catch (error) {
    logger.error('Error firing trigger:', error);
    throw error;
  }
}

/**
 * Check if event data matches trigger conditions
 */
function matchesTriggerConditions(trigger, eventData) {
  const { config } = trigger;

  // Team ID must match
  if (eventData.teamId && trigger.teamId !== eventData.teamId) {
    return false;
  }

  // Check trigger-specific conditions
  switch (trigger.config.type) {
    case TRIGGER_TYPES.KEYWORD_MATCH:
      return matchesKeyword(config, eventData);
    
    case TRIGGER_TYPES.TAG_ADDED:
    case TRIGGER_TYPES.TAG_REMOVED:
      return matchesTag(config, eventData);
    
    case TRIGGER_TYPES.MESSAGE_RECEIVED:
      return matchesMessageConditions(config, eventData);
    
    default:
      return true; // No specific conditions, match all
  }
}

/**
 * Check if message matches keyword conditions
 */
function matchesKeyword(config, eventData) {
  if (!config.keywords || config.keywords.length === 0) {
    return true;
  }

  const message = (eventData.message || '').toLowerCase();
  const matchType = config.matchType || 'contains';

  return config.keywords.some((keyword) => {
    const kw = keyword.toLowerCase();
    
    switch (matchType) {
      case 'exact':
        return message === kw;
      case 'starts_with':
        return message.startsWith(kw);
      case 'ends_with':
        return message.endsWith(kw);
      case 'contains':
      default:
        return message.includes(kw);
    }
  });
}

/**
 * Check if tag matches
 */
function matchesTag(config, eventData) {
  if (!config.tags || config.tags.length === 0) {
    return true;
  }

  return config.tags.includes(eventData.tagName);
}

/**
 * Check if message matches conditions
 */
function matchesMessageConditions(config, eventData) {
  // Check message type if specified
  if (config.messageTypes && config.messageTypes.length > 0) {
    if (!config.messageTypes.includes(eventData.messageType)) {
      return false;
    }
  }

  // Check account ID if specified
  if (config.accountId && config.accountId !== eventData.accountId) {
    return false;
  }

  return true;
}

/**
 * Trigger helper functions for common events
 */

export async function triggerOnMessageReceived(message, contact, conversation) {
  return fireTrigger(TRIGGER_TYPES.MESSAGE_RECEIVED, {
    teamId: contact.team_id,
    contactId: contact.id,
    conversationId: conversation.id,
    accountId: conversation.account_id,
    message: message.content,
    messageType: message.messageType,
    messageId: message.id,
  });
}

export async function triggerOnMessageSent(message, contact, conversation) {
  return fireTrigger(TRIGGER_TYPES.MESSAGE_SENT, {
    teamId: contact.team_id,
    contactId: contact.id,
    conversationId: conversation.id,
    accountId: conversation.account_id,
    message: message.content,
    messageType: message.messageType,
    messageId: message.id,
  });
}

export async function triggerOnContactCreated(contact) {
  return fireTrigger(TRIGGER_TYPES.CONTACT_CREATED, {
    teamId: contact.team_id,
    contactId: contact.id,
    source: contact.source,
  });
}

export async function triggerOnContactUpdated(contact, changes) {
  return fireTrigger(TRIGGER_TYPES.CONTACT_UPDATED, {
    teamId: contact.team_id,
    contactId: contact.id,
    changes,
  });
}

export async function triggerOnTagAdded(contact, tagName) {
  return fireTrigger(TRIGGER_TYPES.TAG_ADDED, {
    teamId: contact.team_id,
    contactId: contact.id,
    tagName,
  });
}

export async function triggerOnTagRemoved(contact, tagName) {
  return fireTrigger(TRIGGER_TYPES.TAG_REMOVED, {
    teamId: contact.team_id,
    contactId: contact.id,
    tagName,
  });
}

export async function triggerOnCampaignCompleted(campaign) {
  return fireTrigger(TRIGGER_TYPES.CAMPAIGN_COMPLETED, {
    teamId: campaign.team_id,
    campaignId: campaign.id,
    campaignName: campaign.name,
  });
}

export async function triggerManual(flowId, contactId, data = {}) {
  const flow = await prisma.flows.findUnique({
    where: { id: flowId },
  });

  if (!flow) {
    throw new Error(`Flow not found: ${flowId}`);
  }

  return startFlowExecution(flowId, contactId, {
    type: TRIGGER_TYPES.MANUAL,
    ...data,
  });
}

/**
 * Get all registered triggers
 */
export function getAllTriggers() {
  return triggerCache;
}

/**
 * Get triggers for a specific type
 */
export function getTriggersByType(triggerType) {
  return triggerCache[triggerType] || [];
}

export default {
  TRIGGER_TYPES,
  initializeTriggers,
  registerTrigger,
  unregisterTrigger,
  fireTrigger,
  triggerOnMessageReceived,
  triggerOnMessageSent,
  triggerOnContactCreated,
  triggerOnContactUpdated,
  triggerOnTagAdded,
  triggerOnTagRemoved,
  triggerOnCampaignCompleted,
  triggerManual,
  getAllTriggers,
  getTriggersByType,
};

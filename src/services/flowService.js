import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';
import { validateFlow } from '../utils/flowValidator.js';
import { registerTrigger, unregisterTrigger } from './flowTriggers.js';

/**
 * Flow Service
 * Handles business logic for flow automation
 */

/**
 * Create a new flow
 */
async function createFlow(userId, teamId, flowData) {
  try {
    // Validate flow structure
    const validation = validateFlow(flowData);
    if (!validation.valid) {
      throw new Error(`Flow validation failed: ${validation.errors.join(', ')}`);
    }

    // Create flow in database
    const flow = await prisma.flows.create({
      data: {
        team_id: teamId,
        user_id: userId,
        name: flowData.name,
        description: flowData.description || null,
        triggerType: flowData.triggerType,
        trigger_config: flowData.trigger_config || {},
        nodes: flowData.nodes || [],
        edges: flowData.edges || [],
        variables: flowData.variables || {},
        is_active: flowData.is_active || false,
        version: 1,
      },
    });

    logger.info(`Flow created: ${flow.id} by user ${userId}`);
    return flow;
  } catch (error) {
    logger.error('Error creating flow:', error);
    throw error;
  }
}

/**
 * Get all flows for a team
 */
async function getFlows(teamId, filters = {}) {
  try {
    const where = {
      team_id: teamId,
      deleted_at: null,
    };

    // Apply filters
    if (filters.is_active !== undefined) {
      where.is_active = filters.is_active;
    }

    if (filters.triggerType) {
      where.triggerType = filters.triggerType;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const flows = await prisma.flows.findMany({
      where,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        _count: {
          select: {
            flow_executions: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return flows;
  } catch (error) {
    logger.error('Error fetching flows:', error);
    throw error;
  }
}

/**
 * Get a single flow by ID
 */
async function getFlowById(flowId, teamId) {
  try {
    const flow = await prisma.flows.findFirst({
      where: {
        id: flowId,
        team_id: teamId,
        deleted_at: null,
      },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
        _count: {
          select: {
            flow_executions: true,
          },
        },
      },
    });

    if (!flow) {
      throw new Error('Flow not found');
    }

    return flow;
  } catch (error) {
    logger.error('Error fetching flow:', error);
    throw error;
  }
}

/**
 * Update a flow
 */
async function updateFlow(flowId, teamId, userId, updateData) {
  try {
    // Check if flow exists
    const existingFlow = await prisma.flows.findFirst({
      where: {
        id: flowId,
        team_id: teamId,
        deleted_at: null,
      },
    });

    if (!existingFlow) {
      throw new Error('Flow not found');
    }

    // If updating flow structure, validate it
    if (updateData.nodes || updateData.edges || updateData.triggerType) {
      const flowToValidate = {
        name: updateData.name || existingFlow.name,
        triggerType: updateData.triggerType || existingFlow.triggerType,
        trigger_config: updateData.trigger_config || existingFlow.trigger_config,
        nodes: updateData.nodes || existingFlow.nodes,
        edges: updateData.edges || existingFlow.edges,
      };

      const validation = validateFlow(flowToValidate);
      if (!validation.valid) {
        throw new Error(`Flow validation failed: ${validation.errors.join(', ')}`);
      }
    }

    // Prepare update data
    const dataToUpdate = {
      updated_at: new Date(),
    };

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.triggerType !== undefined) dataToUpdate.triggerType = updateData.triggerType;
    if (updateData.trigger_config !== undefined)
      dataToUpdate.trigger_config = updateData.trigger_config;
    if (updateData.nodes !== undefined) dataToUpdate.nodes = updateData.nodes;
    if (updateData.edges !== undefined) dataToUpdate.edges = updateData.edges;
    if (updateData.variables !== undefined) dataToUpdate.variables = updateData.variables;
    if (updateData.is_active !== undefined) dataToUpdate.is_active = updateData.is_active;

    // Increment version if structure changed
    if (updateData.nodes || updateData.edges || updateData.triggerType) {
      dataToUpdate.version = existingFlow.version + 1;
    }

    // Update flow
    const updatedFlow = await prisma.flows.update({
      where: { id: flowId },
      data: dataToUpdate,
      include: {
        users: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
          },
        },
      },
    });

    logger.info(`Flow updated: ${flowId} by user ${userId}`);
    return updatedFlow;
  } catch (error) {
    logger.error('Error updating flow:', error);
    throw error;
  }
}

/**
 * Delete a flow (soft delete)
 */
async function deleteFlow(flowId, teamId, userId) {
  try {
    // Check if flow exists
    const existingFlow = await prisma.flows.findFirst({
      where: {
        id: flowId,
        team_id: teamId,
        deleted_at: null,
      },
    });

    if (!existingFlow) {
      throw new Error('Flow not found');
    }

    // Check if flow is active
    if (existingFlow.is_active) {
      throw new Error('Cannot delete an active flow. Please deactivate it first.');
    }

    // Soft delete
    const deletedFlow = await prisma.flows.update({
      where: { id: flowId },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });

    logger.info(`Flow deleted: ${flowId} by user ${userId}`);
    return deletedFlow;
  } catch (error) {
    logger.error('Error deleting flow:', error);
    throw error;
  }
}

/**
 * Activate a flow
 */
async function activateFlow(flowId, teamId, userId) {
  try {
    const flow = await getFlowById(flowId, teamId);

    // Validate flow before activation
    const validation = validateFlow({
      name: flow.name,
      triggerType: flow.triggerType,
      trigger_config: flow.trigger_config,
      nodes: flow.nodes,
      edges: flow.edges,
    });

    if (!validation.valid) {
      throw new Error(
        `Cannot activate flow with validation errors: ${validation.errors.join(', ')}`
      );
    }

    const updatedFlow = await prisma.flows.update({
      where: { id: flowId },
      data: {
        is_active: true,
        updated_at: new Date(),
      },
    });

    // Register trigger
    registerTrigger(flowId, flow.team_id, flow.triggerType, flow.trigger_config);

    logger.info(`Flow activated: ${flowId} by user ${userId}`);
    return updatedFlow;
  } catch (error) {
    logger.error('Error activating flow:', error);
    throw error;
  }
}

/**
 * Deactivate a flow
 */
async function deactivateFlow(flowId, teamId, userId) {
  try {
    await getFlowById(flowId, teamId); // Check if exists

    const flow = await getFlowById(flowId, teamId);

    const updatedFlow = await prisma.flows.update({
      where: { id: flowId },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    // Unregister trigger
    unregisterTrigger(flowId, flow.triggerType);

    logger.info(`Flow deactivated: ${flowId} by user ${userId}`);
    return updatedFlow;
  } catch (error) {
    logger.error('Error deactivating flow:', error);
    throw error;
  }
}

/**
 * Get flow execution statistics
 */
async function getFlowStats(flowId, teamId) {
  try {
    await getFlowById(flowId, teamId); // Check if exists

    const stats = await prisma.flow_executions.groupBy({
      by: ['status'],
      where: {
        flow_id: flowId,
      },
      _count: {
        status: true,
      },
    });

    const totalExecutions = await prisma.flow_executions.count({
      where: { flow_id: flowId },
    });

    const avgExecutionTime = await prisma.flow_executions.aggregate({
      where: {
        flow_id: flowId,
        status: 'completed',
        completed_at: { not: null },
      },
      _avg: {
        // Calculate average duration in seconds
      },
    });

    return {
      totalExecutions,
      statusBreakdown: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {}),
      avgExecutionTime: avgExecutionTime._avg || 0,
    };
  } catch (error) {
    logger.error('Error fetching flow stats:', error);
    throw error;
  }
}

export {
  createFlow,
  getFlows,
  getFlowById,
  updateFlow,
  deleteFlow,
  activateFlow,
  deactivateFlow,
  getFlowStats,
};

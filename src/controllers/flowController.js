import * as flowService from '../services/flowService.js';
import { logger } from '../utils/logger.js';

/**
 * Flow Controller
 * Handles HTTP requests for flow automation
 */

/**
 * Create a new flow
 * POST /api/v1/flows
 */
async function createFlow(req, res) {
  try {
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const flow = await flowService.createFlow(userId, teamId, req.validatedData);

    return res.status(201).json({
      message: 'Flow created successfully',
      flow,
    });
  } catch (error) {
    logger.error('Error in createFlow controller:', error);

    if (error.message.includes('validation failed')) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to create flow',
    });
  }
}

/**
 * Get all flows
 * GET /api/v1/flows
 */
async function getFlows(req, res) {
  try {
    const teamId = req.user.teamId;

    const filters = {
      is_active:
        req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
      triggerType: req.query.triggerType,
      search: req.query.search,
    };

    const flows = await flowService.getFlows(teamId, filters);

    return res.status(200).json({
      flows,
      total: flows.length,
    });
  } catch (error) {
    logger.error('Error in getFlows controller:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch flows',
    });
  }
}

/**
 * Get a single flow by ID
 * GET /api/v1/flows/:id
 */
async function getFlowById(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const flow = await flowService.getFlowById(id, teamId);

    return res.status(200).json({ flow });
  } catch (error) {
    logger.error('Error in getFlowById controller:', error);

    if (error.message === 'Flow not found') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Flow not found',
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch flow',
    });
  }
}

/**
 * Update a flow
 * PUT /api/v1/flows/:id
 */
async function updateFlow(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const flow = await flowService.updateFlow(id, teamId, userId, req.validatedData);

    return res.status(200).json({
      message: 'Flow updated successfully',
      flow,
    });
  } catch (error) {
    logger.error('Error in updateFlow controller:', error);

    if (error.message === 'Flow not found') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Flow not found',
      });
    }

    if (error.message.includes('validation failed')) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to update flow',
    });
  }
}

/**
 * Delete a flow
 * DELETE /api/v1/flows/:id
 */
async function deleteFlow(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    await flowService.deleteFlow(id, teamId, userId);

    return res.status(200).json({
      message: 'Flow deleted successfully',
    });
  } catch (error) {
    logger.error('Error in deleteFlow controller:', error);

    if (error.message === 'Flow not found') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Flow not found',
      });
    }

    if (error.message.includes('Cannot delete an active flow')) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to delete flow',
    });
  }
}

/**
 * Activate a flow
 * POST /api/v1/flows/:id/activate
 */
async function activateFlow(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const flow = await flowService.activateFlow(id, teamId, userId);

    return res.status(200).json({
      message: 'Flow activated successfully',
      flow,
    });
  } catch (error) {
    logger.error('Error in activateFlow controller:', error);

    if (error.message === 'Flow not found') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Flow not found',
      });
    }

    if (error.message.includes('validation errors')) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to activate flow',
    });
  }
}

/**
 * Deactivate a flow
 * POST /api/v1/flows/:id/deactivate
 */
async function deactivateFlow(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const teamId = req.user.teamId;

    const flow = await flowService.deactivateFlow(id, teamId, userId);

    return res.status(200).json({
      message: 'Flow deactivated successfully',
      flow,
    });
  } catch (error) {
    logger.error('Error in deactivateFlow controller:', error);

    if (error.message === 'Flow not found') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Flow not found',
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to deactivate flow',
    });
  }
}

/**
 * Get flow statistics
 * GET /api/v1/flows/:id/stats
 */
async function getFlowStats(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    const stats = await flowService.getFlowStats(id, teamId);

    return res.status(200).json({ stats });
  } catch (error) {
    logger.error('Error in getFlowStats controller:', error);

    if (error.message === 'Flow not found') {
      return res.status(404).json({
        error: 'NotFoundError',
        message: 'Flow not found',
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch flow statistics',
    });
  }
}

/**
 * Test a flow (dry run)
 * POST /api/v1/flows/:id/test
 */
async function testFlow(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const { contactId } = req.body;

    if (!contactId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Contact ID is required for flow testing',
      });
    }

    // Get flow
    const flow = await flowService.getFlowById(id, teamId);

    // Verify contact exists and belongs to team
    const { default: prisma } = await import('../config/database.js');
    const contact = await prisma.contacts.findFirst({
      where: {
        id: contactId,
        team_id: teamId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Contact not found',
      });
    }

    // Start flow execution in test mode
    const { startFlowExecution } = await import('../services/flowExecutor.js');
    const execution = await startFlowExecution(id, contactId, {
      testMode: true,
      triggeredBy: req.user.id,
    });

    return res.status(200).json({
      message: 'Flow test started',
      execution: {
        id: execution.id,
        status: execution.status,
        started_at: execution.started_at,
      },
    });
  } catch (error) {
    logger.error('Error in testFlow controller:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to test flow',
    });
  }
}

/**
 * Get flow executions
 * GET /api/v1/flows/:id/executions
 */
async function getFlowExecutions(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;

    // Verify flow exists and belongs to team
    await flowService.getFlowById(id, teamId);

    const { default: prisma } = await import('../config/database.js');

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [executions, total] = await Promise.all([
      prisma.flow_executions.findMany({
        where: {
          flow_id: id,
        },
        include: {
          contacts: {
            select: {
              id: true,
              phone: true,
              first_name: true,
              last_name: true,
              email: true,
            },
          },
        },
        orderBy: {
          started_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.flow_executions.count({
        where: {
          flow_id: id,
        },
      }),
    ]);

    return res.status(200).json({
      executions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error in getFlowExecutions controller:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch flow executions',
    });
  }
}

/**
 * Get a single flow execution with step details
 * GET /api/v1/flows/executions/:executionId
 */
async function getFlowExecution(req, res) {
  try {
    const { executionId } = req.params;
    const teamId = req.user.teamId;

    const { default: prisma } = await import('../config/database.js');

    const execution = await prisma.flow_executions.findFirst({
      where: {
        id: executionId,
      },
      include: {
        flows: {
          select: {
            id: true,
            name: true,
            description: true,
            team_id: true,
            nodes: true,
            edges: true,
            triggerType: true,
          },
        },
        contacts: {
          select: {
            id: true,
            phone: true,
            first_name: true,
            last_name: true,
            email: true,
            company: true,
          },
        },
        conversations: {
          select: {
            id: true,
            status: true,
            last_message_at: true,
          },
        },
      },
    });

    if (!execution) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Flow execution not found',
      });
    }

    // Verify execution belongs to user's team
    if (execution.flows.team_id !== teamId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied',
      });
    }

    // Calculate execution duration if completed
    let duration = null;
    if (execution.completed_at) {
      duration = Math.floor(
        (new Date(execution.completed_at) - new Date(execution.started_at)) / 1000
      );
    }

    // Parse variables to extract step history if available
    const variables = execution.variables || {};
    const stepHistory = variables._stepHistory || [];

    // Enrich response with computed fields
    const enrichedExecution = {
      ...execution,
      duration,
      stepHistory,
      totalSteps: stepHistory.length,
      currentStep: stepHistory.length > 0 ? stepHistory[stepHistory.length - 1] : null,
    };

    return res.status(200).json({
      execution: enrichedExecution,
    });
  } catch (error) {
    logger.error('Error in getFlowExecution controller:', error);

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to fetch flow execution',
    });
  }
}

/**
 * Manually trigger a flow
 * POST /api/v1/flows/:id/trigger
 */
async function triggerFlow(req, res) {
  try {
    const { id } = req.params;
    const teamId = req.user.teamId;
    const { contactId, data = {} } = req.body;

    if (!contactId) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Contact ID is required',
      });
    }

    // Verify flow exists and belongs to team
    await flowService.getFlowById(id, teamId);

    // Verify contact exists and belongs to team
    const { default: prisma } = await import('../config/database.js');
    const contact = await prisma.contacts.findFirst({
      where: {
        id: contactId,
        team_id: teamId,
      },
    });

    if (!contact) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Contact not found',
      });
    }

    // Trigger flow manually
    const { triggerManual } = await import('../services/flowTriggers.js');
    const execution = await triggerManual(id, contactId, {
      ...data,
      triggeredBy: req.user.id,
      triggeredAt: new Date(),
    });

    return res.status(200).json({
      message: 'Flow triggered successfully',
      execution: {
        id: execution.id,
        status: execution.status,
        started_at: execution.started_at,
      },
    });
  } catch (error) {
    logger.error('Error in triggerFlow controller:', error);

    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
      });
    }

    return res.status(500).json({
      error: 'InternalServerError',
      message: 'Failed to trigger flow',
    });
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
  testFlow,
  getFlowExecutions,
  getFlowExecution,
  triggerFlow,
};

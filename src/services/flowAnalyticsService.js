/**
 * Flow Analytics Service
 * Handles flow performance analytics and aggregation
 */

import prisma from '../config/database.js';
import { logger } from '../utils/logger.js';

/**
 * Aggregate flow execution metrics for a specific time period
 * This runs hourly to collect node-level performance data
 */
async function aggregateFlowMetrics() {
  try {
    logger.info('Starting flow analytics aggregation...');

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get all flows with executions in the last hour
    const flows = await prisma.flows.findMany({
      where: {
        deleted_at: null,
        flow_executions: {
          some: {
            started_at: {
              gte: oneHourAgo,
              lte: now,
            },
          },
        },
      },
      include: {
        flow_executions: {
          where: {
            started_at: {
              gte: oneHourAgo,
              lte: now,
            },
          },
        },
      },
    });

    const aggregationResults = [];

    for (const flow of flows) {
      const metrics = await calculateFlowMetrics(flow);
      aggregationResults.push({
        flowId: flow.id,
        flowName: flow.name,
        metrics,
      });
    }

    logger.info(`Flow analytics aggregation completed. Processed ${flows.length} flows`);
    return aggregationResults;
  } catch (error) {
    logger.error('Error aggregating flow metrics:', error);
    throw error;
  }
}

/**
 * Calculate comprehensive metrics for a flow
 */
async function calculateFlowMetrics(flow) {
  const executions = flow.flow_executions || [];
  const nodes = flow.nodes || [];

  // Overall flow metrics
  const totalExecutions = executions.length;
  const completedExecutions = executions.filter((e) => e.status === 'completed').length;
  const failedExecutions = executions.filter((e) => e.status === 'failed').length;
  const runningExecutions = executions.filter((e) => e.status === 'running').length;

  const completionRate = totalExecutions > 0 ? (completedExecutions / totalExecutions) * 100 : 0;

  // Calculate average execution time for completed flows
  const completedWithTime = executions.filter(
    (e) => e.status === 'completed' && e.completed_at && e.started_at
  );

  const avgExecutionTime =
    completedWithTime.length > 0
      ? completedWithTime.reduce((sum, e) => {
          const duration = new Date(e.completed_at).getTime() - new Date(e.started_at).getTime();
          return sum + duration;
        }, 0) / completedWithTime.length
      : 0;

  // Per-node metrics
  const nodeMetrics = await calculateNodeMetrics(flow.id, nodes, executions);

  // Identify bottlenecks (nodes with longest average execution time)
  const bottlenecks = nodeMetrics
    .filter((n) => n.avgExecutionTime > 0)
    .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
    .slice(0, 3)
    .map((n) => ({
      nodeId: n.nodeId,
      nodeType: n.nodeType,
      avgExecutionTime: n.avgExecutionTime,
    }));

  return {
    totalExecutions,
    completedExecutions,
    failedExecutions,
    runningExecutions,
    completionRate: Math.round(completionRate * 100) / 100,
    avgExecutionTime: Math.round(avgExecutionTime),
    nodeMetrics,
    bottlenecks,
    timestamp: new Date(),
  };
}

/**
 * Calculate per-node execution metrics
 */
async function calculateNodeMetrics(flowId, nodes, executions) {
  const nodeMetrics = [];

  for (const node of nodes) {
    // Count how many times this node was reached
    let successCount = 0;
    let failureCount = 0;
    let totalExecutionTime = 0;
    let executionCount = 0;

    for (const execution of executions) {
      // Check if this node was in the execution path
      const variables = execution.variables || {};
      const executionPath = variables.executionPath || [];

      if (executionPath.includes(node.id)) {
        executionCount++;

        // Determine if this node succeeded or failed
        if (execution.status === 'completed') {
          successCount++;
        } else if (execution.status === 'failed' && execution.current_node_id === node.id) {
          failureCount++;
        }

        // For wait nodes, calculate actual wait time
        if (node.type === 'wait' && execution.completed_at && execution.started_at) {
          const duration =
            new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime();
          totalExecutionTime += duration;
        }
      }
    }

    const avgExecutionTime = executionCount > 0 ? totalExecutionTime / executionCount : 0;

    nodeMetrics.push({
      nodeId: node.id,
      nodeType: node.type,
      nodeName: node.data?.label || node.type,
      executionCount,
      successCount,
      failureCount,
      successRate: executionCount > 0 ? (successCount / executionCount) * 100 : 0,
      avgExecutionTime: Math.round(avgExecutionTime),
    });
  }

  return nodeMetrics;
}

/**
 * Get flow analytics for a specific flow
 */
async function getFlowAnalytics(flowId, teamId, options = {}) {
  try {
    const { startDate, endDate, limit = 100 } = options;

    // Verify flow exists and belongs to team
    const flow = await prisma.flows.findFirst({
      where: {
        id: flowId,
        team_id: teamId,
        deleted_at: null,
      },
    });

    if (!flow) {
      throw new Error('Flow not found');
    }

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get executions with date filter
    const executions = await prisma.flow_executions.findMany({
      where: {
        flow_id: flowId,
        ...(Object.keys(dateFilter).length > 0 && {
          started_at: dateFilter,
        }),
      },
      orderBy: {
        started_at: 'desc',
      },
      take: limit,
    });

    // Calculate metrics
    const metrics = await calculateFlowMetrics({ ...flow, flow_executions: executions });

    return {
      flowId: flow.id,
      flowName: flow.name,
      isActive: flow.is_active,
      ...metrics,
    };
  } catch (error) {
    logger.error('Error getting flow analytics:', error);
    throw error;
  }
}

/**
 * Get analytics for all flows in a team
 */
async function getAllFlowsAnalytics(teamId, options = {}) {
  try {
    const { startDate, endDate, sortBy = 'totalExecutions', sortOrder = 'desc' } = options;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    // Get all flows for the team
    const flows = await prisma.flows.findMany({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
      include: {
        flow_executions: {
          where: Object.keys(dateFilter).length > 0 ? { started_at: dateFilter } : undefined,
        },
      },
    });

    // Calculate metrics for each flow
    const flowsWithMetrics = await Promise.all(
      flows.map(async (flow) => {
        const metrics = await calculateFlowMetrics(flow);
        return {
          flowId: flow.id,
          flowName: flow.name,
          isActive: flow.is_active,
          triggerType: flow.triggerType,
          createdAt: flow.created_at,
          ...metrics,
        };
      })
    );

    // Sort results
    flowsWithMetrics.sort((a, b) => {
      const aValue = a[sortBy] || 0;
      const bValue = b[sortBy] || 0;
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    return flowsWithMetrics;
  } catch (error) {
    logger.error('Error getting all flows analytics:', error);
    throw error;
  }
}

/**
 * Get most used flows (by execution count)
 */
async function getMostUsedFlows(teamId, limit = 10) {
  try {
    const flows = await prisma.flows.findMany({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
      include: {
        _count: {
          select: {
            flow_executions: true,
          },
        },
      },
      orderBy: {
        flow_executions: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return flows.map((flow) => ({
      flowId: flow.id,
      flowName: flow.name,
      isActive: flow.is_active,
      triggerType: flow.triggerType,
      totalExecutions: flow._count.flow_executions,
    }));
  } catch (error) {
    logger.error('Error getting most used flows:', error);
    throw error;
  }
}

/**
 * Get slowest nodes across all flows
 */
async function getSlowestNodes(teamId, limit = 10) {
  try {
    const flows = await prisma.flows.findMany({
      where: {
        team_id: teamId,
        deleted_at: null,
      },
      include: {
        flow_executions: {
          where: {
            status: 'completed',
            completed_at: { not: null },
          },
          orderBy: {
            started_at: 'desc',
          },
          take: 100, // Analyze last 100 executions per flow
        },
      },
    });

    const allNodeMetrics = [];

    for (const flow of flows) {
      const metrics = await calculateFlowMetrics(flow);

      for (const nodeMetric of metrics.nodeMetrics) {
        allNodeMetrics.push({
          flowId: flow.id,
          flowName: flow.name,
          ...nodeMetric,
        });
      }
    }

    // Sort by average execution time and return top slowest
    const slowestNodes = allNodeMetrics
      .filter((n) => n.avgExecutionTime > 0)
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime)
      .slice(0, limit);

    return slowestNodes;
  } catch (error) {
    logger.error('Error getting slowest nodes:', error);
    throw error;
  }
}

/**
 * Get flow performance dashboard data
 */
async function getFlowPerformanceDashboard(teamId) {
  try {
    const [mostUsedFlows, slowestNodes, overallStats] = await Promise.all([
      getMostUsedFlows(teamId, 5),
      getSlowestNodes(teamId, 5),
      getOverallFlowStats(teamId),
    ]);

    return {
      mostUsedFlows,
      slowestNodes,
      overallStats,
    };
  } catch (error) {
    logger.error('Error getting flow performance dashboard:', error);
    throw error;
  }
}

/**
 * Get overall flow statistics for a team
 */
async function getOverallFlowStats(teamId) {
  try {
    const [totalFlows, activeFlows, totalExecutions, recentExecutions] = await Promise.all([
      prisma.flows.count({
        where: {
          team_id: teamId,
          deleted_at: null,
        },
      }),
      prisma.flows.count({
        where: {
          team_id: teamId,
          deleted_at: null,
          is_active: true,
        },
      }),
      prisma.flow_executions.count({
        where: {
          flows: {
            team_id: teamId,
          },
        },
      }),
      prisma.flow_executions.count({
        where: {
          flows: {
            team_id: teamId,
          },
          started_at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
      }),
    ]);

    // Get status breakdown
    const statusBreakdown = await prisma.flow_executions.groupBy({
      by: ['status'],
      where: {
        flows: {
          team_id: teamId,
        },
      },
      _count: {
        status: true,
      },
    });

    const statusCounts = statusBreakdown.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {});

    return {
      totalFlows,
      activeFlows,
      totalExecutions,
      recentExecutions,
      statusCounts,
    };
  } catch (error) {
    logger.error('Error getting overall flow stats:', error);
    throw error;
  }
}

export default {
  aggregateFlowMetrics,
  getFlowAnalytics,
  getAllFlowsAnalytics,
  getMostUsedFlows,
  getSlowestNodes,
  getFlowPerformanceDashboard,
  getOverallFlowStats,
};

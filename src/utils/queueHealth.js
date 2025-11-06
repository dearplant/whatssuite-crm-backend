import { getAllQueuesHealth } from '../queues/index.js';
import { isRedisConnected } from '../config/redis.js';
import logger from './logger.js';

/**
 * Check overall queue infrastructure health
 */
export const checkQueueInfrastructureHealth = async () => {
  try {
    // Check Redis connection
    const redisHealthy = isRedisConnected();

    if (!redisHealthy) {
      return {
        status: 'unhealthy',
        redis: {
          connected: false,
          message: 'Redis is not connected',
        },
        queues: {},
        timestamp: new Date().toISOString(),
      };
    }

    // Get all queue health statuses
    const queuesHealth = await getAllQueuesHealth();

    // Determine overall health
    const hasErrors = Object.values(queuesHealth).some((queue) => queue.error);
    const hasPausedQueues = Object.values(queuesHealth).some((queue) => queue.isPaused);

    // Calculate total counts
    const totals = Object.values(queuesHealth).reduce(
      (acc, queue) => {
        if (!queue.error) {
          acc.waiting += queue.waiting || 0;
          acc.active += queue.active || 0;
          acc.completed += queue.completed || 0;
          acc.failed += queue.failed || 0;
          acc.delayed += queue.delayed || 0;
        }
        return acc;
      },
      { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }
    );

    // Determine status
    let status = 'healthy';
    if (hasErrors) {
      status = 'unhealthy';
    } else if (hasPausedQueues || totals.failed > 100) {
      status = 'degraded';
    }

    return {
      status,
      redis: {
        connected: true,
      },
      queues: queuesHealth,
      totals,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Queue health check failed', { error: error.message });
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get queue metrics for monitoring
 */
export const getQueueMetrics = async () => {
  try {
    const health = await checkQueueInfrastructureHealth();

    if (health.status === 'unhealthy' && health.error) {
      return {
        error: health.error,
        timestamp: health.timestamp,
      };
    }

    return {
      status: health.status,
      redis: health.redis,
      totals: health.totals,
      queues: Object.entries(health.queues).map(([name, queue]) => ({
        name,
        waiting: queue.waiting || 0,
        active: queue.active || 0,
        completed: queue.completed || 0,
        failed: queue.failed || 0,
        delayed: queue.delayed || 0,
        isPaused: queue.isPaused || false,
        hasError: !!queue.error,
      })),
      timestamp: health.timestamp,
    };
  } catch (error) {
    logger.error('Failed to get queue metrics', { error: error.message });
    throw error;
  }
};

/**
 * Check if queue infrastructure is ready
 */
export const isQueueInfrastructureReady = async () => {
  try {
    const health = await checkQueueInfrastructureHealth();
    return health.status !== 'unhealthy';
  } catch (error) {
    logger.error('Queue readiness check failed', { error: error.message });
    return false;
  }
};

/**
 * Get queue statistics summary
 */
export const getQueueStatistics = async () => {
  try {
    const queuesHealth = await getAllQueuesHealth();

    const statistics = Object.entries(queuesHealth).map(([name, queue]) => {
      if (queue.error) {
        return {
          name,
          error: queue.error,
        };
      }

      const total = queue.waiting + queue.active + queue.completed + queue.failed + queue.delayed;
      const successRate =
        queue.completed + queue.failed > 0
          ? ((queue.completed / (queue.completed + queue.failed)) * 100).toFixed(2)
          : 0;

      return {
        name,
        counts: {
          waiting: queue.waiting,
          active: queue.active,
          completed: queue.completed,
          failed: queue.failed,
          delayed: queue.delayed,
          total,
        },
        successRate: `${successRate}%`,
        isPaused: queue.isPaused,
      };
    });

    return {
      statistics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get queue statistics', { error: error.message });
    throw error;
  }
};

export default {
  checkQueueInfrastructureHealth,
  getQueueMetrics,
  isQueueInfrastructureReady,
  getQueueStatistics,
};

import Queue from 'bull';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Create Bull queue with standard configuration
 */
const createQueue = (name, options = {}) => {
  const queue = new Queue(name, {
    redis: {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000, // Start with 5 seconds
      },
      removeOnComplete: 100, // Keep last 100 completed jobs
      removeOnFail: 500, // Keep last 500 failed jobs
      ...options.defaultJobOptions,
    },
    ...options,
  });

  // Event handlers for monitoring
  queue.on('error', (error) => {
    logger.error(`Queue [${name}]: Error occurred`, { error: error.message });
  });

  queue.on('waiting', (jobId) => {
    logger.debug(`Queue [${name}]: Job ${jobId} is waiting`);
  });

  queue.on('active', (job) => {
    logger.debug(`Queue [${name}]: Job ${job.id} started processing`);
  });

  queue.on('completed', (job, result) => {
    logger.debug(`Queue [${name}]: Job ${job.id} completed`, { result });
  });

  queue.on('failed', (job, err) => {
    logger.error(`Queue [${name}]: Job ${job.id} failed`, {
      error: err.message,
      attempts: job.attemptsMade,
      data: job.data,
    });
  });

  queue.on('stalled', (job) => {
    logger.warn(`Queue [${name}]: Job ${job.id} stalled`);
  });

  logger.info(`Queue [${name}]: Initialized successfully`);
  return queue;
};

/**
 * Message Queue
 * Handles individual message sending operations
 */
export const messageQueue = createQueue('messages', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    priority: 5, // Default priority
  },
  limiter: {
    max: 20, // 20 jobs
    duration: 60000, // per minute (rate limiting)
  },
});

/**
 * Campaign Queue
 * Handles campaign processing and batch message sending
 */
export const campaignQueue = createQueue('campaigns', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

/**
 * Flow Queue
 * Handles automated workflow executions
 */
export const flowQueue = createQueue('flows', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

/**
 * Email Queue
 * Handles email notifications and transactional emails
 */
export const emailQueue = createQueue('emails', {
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

/**
 * Webhook Queue
 * Handles outbound webhook deliveries
 */
export const webhookQueue = createQueue('webhooks', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

/**
 * AI Queue
 * Handles AI chatbot responses and voice transcription
 */
export const aiQueue = createQueue('ai', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

/**
 * Import Queue
 * Handles contact imports and bulk operations
 */
export const importQueue = createQueue('imports', {
  defaultJobOptions: {
    attempts: 1, // Don't retry imports
    timeout: 600000, // 10 minutes timeout for large imports
  },
});

/**
 * Export Queue
 * Handles data exports and report generation
 */
export const exportQueue = createQueue('exports', {
  defaultJobOptions: {
    attempts: 2,
    timeout: 300000, // 5 minutes timeout
  },
});

/**
 * Analytics Queue
 * Handles analytics snapshot generation
 */
export const analyticsQueue = createQueue('analytics', {
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
});

/**
 * Notification Queue
 * Handles system notifications and alerts
 */
export const notificationQueue = createQueue('notifications', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Abandoned Cart Recovery Queue
 * Handles abandoned cart recovery messages
 */
export const abandonedCartQueue = createQueue('abandonedCartRecovery', {
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60000, // 1 minute
    },
  },
});

/**
 * Get all queues for monitoring
 */
export const getAllQueues = () => {
  return {
    messageQueue,
    campaignQueue,
    flowQueue,
    emailQueue,
    webhookQueue,
    aiQueue,
    importQueue,
    exportQueue,
    analyticsQueue,
    notificationQueue,
    abandonedCartQueue,
  };
};

/**
 * Close all queues gracefully
 */
export const closeAllQueues = async () => {
  const queues = getAllQueues();
  const closePromises = Object.entries(queues).map(async ([name, queue]) => {
    try {
      await queue.close();
      logger.info(`Queue [${name}]: Closed successfully`);
    } catch (error) {
      logger.error(`Queue [${name}]: Error closing`, { error: error.message });
    }
  });

  await Promise.all(closePromises);
  logger.info('All queues closed');
};

/**
 * Get queue health status
 */
export const getQueueHealth = async (queue) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queue.name,
      waiting,
      active,
      completed,
      failed,
      delayed,
      isPaused: await queue.isPaused(),
    };
  } catch (error) {
    logger.error(`Queue health check failed for ${queue.name}`, {
      error: error.message,
    });
    return {
      name: queue.name,
      error: error.message,
    };
  }
};

/**
 * Get health status for all queues
 */
export const getAllQueuesHealth = async () => {
  const queues = getAllQueues();
  const healthPromises = Object.values(queues).map((queue) => getQueueHealth(queue));
  const healthStatuses = await Promise.all(healthPromises);

  return healthStatuses.reduce((acc, status) => {
    acc[status.name] = status;
    return acc;
  }, {});
};

/**
 * Helper function to add a job to a queue
 */
export const addJob = async (queueName, data, options = {}) => {
  const queues = getAllQueues();
  const queue = queues[`${queueName}Queue`] || queues.messageQueue;

  return await queue.add(data, options);
};

/**
 * Helper function to get a queue by name
 */
export const getQueue = (queueName) => {
  const queues = getAllQueues();
  return queues[`${queueName}Queue`] || queues.messageQueue;
};

export default {
  messageQueue,
  campaignQueue,
  flowQueue,
  emailQueue,
  webhookQueue,
  aiQueue,
  importQueue,
  exportQueue,
  analyticsQueue,
  notificationQueue,
  abandonedCartQueue,
  getAllQueues,
  closeAllQueues,
  getQueueHealth,
  getAllQueuesHealth,
  addJob,
  getQueue,
};

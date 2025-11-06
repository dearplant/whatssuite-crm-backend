/**
 * Flow Worker
 * Processes flow execution jobs from the queue
 */

import { flowQueue } from '../queues/index.js';
import { processFlowExecution } from '../services/flowExecutor.js';
import logger from '../utils/logger.js';

/**
 * Process flow execution jobs
 * Only start processing if not in test environment
 */
if (process.env.NODE_ENV !== 'test') {
  // Process with concurrency of 5
  flowQueue.process(5, async (job) => {
    const { executionId } = job.data;

    logger.info(`Processing flow execution job`, {
      jobId: job.id,
      executionId,
      attempt: job.attemptsMade,
    });

    try {
      await processFlowExecution(executionId);

      logger.info(`Flow execution job completed`, {
        jobId: job.id,
        executionId,
      });

      return {
        executionId,
        status: 'completed',
      };
    } catch (error) {
      logger.error(`Flow execution job failed`, {
        jobId: job.id,
        executionId,
        error: error.message,
        attempt: job.attemptsMade,
        stack: error.stack,
      });

      throw error;
    }
  });

  /**
   * Queue event handlers
   */
  flowQueue.on('completed', (job, result) => {
    logger.debug(`Flow job ${job.id} completed`, { result });
  });

  flowQueue.on('failed', (job, error) => {
    logger.error(`Flow job ${job.id} failed after ${job.attemptsMade} attempts`, {
      error: error.message,
      data: job.data,
    });
  });

  flowQueue.on('stalled', (job) => {
    logger.warn(`Flow job ${job.id} stalled`, { data: job.data });
  });

  logger.info('Flow worker initialized successfully');
}

export default flowQueue;

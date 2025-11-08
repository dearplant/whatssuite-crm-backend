import { getQueue } from '../queues/index.js';
import abandonedCartService from '../services/ecommerce/abandonedCartService.js';
import logger from '../utils/logger.js';

/**
 * Abandoned Cart Recovery Worker
 * Processes abandoned cart recovery jobs
 */

const abandonedCartQueue = getQueue('abandonedCartRecovery');

// Process abandoned cart recovery jobs
abandonedCartQueue.process(async (job) => {
  const { cartId } = job.data;

  logger.info('Processing abandoned cart recovery job', {
    jobId: job.id,
    cartId,
  });

  try {
    const result = await abandonedCartService.sendRecoveryMessage(cartId);

    logger.info('Abandoned cart recovery job completed', {
      jobId: job.id,
      cartId,
      result,
    });

    return result;
  } catch (error) {
    logger.error('Abandoned cart recovery job failed', {
      jobId: job.id,
      cartId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

// Event listeners
abandonedCartQueue.on('completed', (job, result) => {
  logger.info('Abandoned cart recovery job completed', {
    jobId: job.id,
    cartId: job.data.cartId,
    result,
  });
});

abandonedCartQueue.on('failed', (job, error) => {
  logger.error('Abandoned cart recovery job failed', {
    jobId: job.id,
    cartId: job.data.cartId,
    error: error.message,
    attempts: job.attemptsMade,
  });
});

abandonedCartQueue.on('stalled', (job) => {
  logger.warn('Abandoned cart recovery job stalled', {
    jobId: job.id,
    cartId: job.data.cartId,
  });
});

logger.info('Abandoned cart recovery worker initialized');

export default abandonedCartQueue;

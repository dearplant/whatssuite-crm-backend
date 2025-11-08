import { getQueue } from '../queues/index.js';
import orderAutomationService from '../services/ecommerce/orderAutomationService.js';
import logger from '../utils/logger.js';

/**
 * Order Worker
 * Processes order automation jobs
 */

const orderQueue = getQueue('order');

// Process order automation jobs
orderQueue.process(async (job) => {
  const { orderId } = job.data;

  logger.info('Processing order automation job', {
    jobId: job.id,
    orderId,
  });

  try {
    // Get order with details
    const prisma = (await import('../config/database.js')).default;
    const order = await prisma.ecommerce_orders.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    await orderAutomationService.processOrder(order);

    logger.info('Order automation job completed', {
      jobId: job.id,
      orderId,
    });

    return { success: true, orderId };
  } catch (error) {
    logger.error('Order automation job failed', {
      jobId: job.id,
      orderId,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
});

// Event listeners
orderQueue.on('completed', (job, result) => {
  logger.info('Order automation job completed', {
    jobId: job.id,
    orderId: job.data.orderId,
    result,
  });
});

orderQueue.on('failed', (job, error) => {
  logger.error('Order automation job failed', {
    jobId: job.id,
    orderId: job.data.orderId,
    error: error.message,
    attempts: job.attemptsMade,
  });
});

orderQueue.on('stalled', (job) => {
  logger.warn('Order automation job stalled', {
    jobId: job.id,
    orderId: job.data.orderId,
  });
});

logger.info('Order automation worker initialized');

export default orderQueue;

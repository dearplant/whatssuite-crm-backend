/**
 * Contact Import Queue
 *
 * Queue for processing contact imports asynchronously
 */

import Queue from 'bull';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Create contact import queue
const contactImportQueue = new Queue('contact-import', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
});

// Event listeners
contactImportQueue.on('completed', (job, result) => {
  logger.info(`Contact import job ${job.id} completed`, {
    jobId: job.id,
    userId: job.data.userId,
    totalContacts: result.totalContacts,
    imported: result.imported,
    skipped: result.skipped,
    failed: result.failed,
  });
});

contactImportQueue.on('failed', (job, err) => {
  logger.error(`Contact import job ${job.id} failed`, {
    jobId: job.id,
    userId: job.data.userId,
    error: err.message,
    stack: err.stack,
  });
});

contactImportQueue.on('progress', (job, progress) => {
  logger.debug(`Contact import job ${job.id} progress: ${progress}%`, {
    jobId: job.id,
    userId: job.data.userId,
  });
});

export default contactImportQueue;

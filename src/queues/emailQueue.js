/**
 * Email Queue
 * Handles asynchronous email sending with retry logic
 */

import Queue from 'bull';
import config from '../config/index.js';
import emailConfig from '../config/email.config.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';

// Create email queue
const emailQueue = new Queue('email', {
  redis: {
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password,
    db: config.redis.db,
  },
  defaultJobOptions: {
    attempts: emailConfig.queue.attempts,
    backoff: emailConfig.queue.backoff,
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 500, // Keep last 500 failed jobs
  },
});

/**
 * Process email jobs
 * Only start processing if not in test environment
 */
if (process.env.NODE_ENV !== 'test') {
  emailQueue.process(async (job) => {
    const { type, data } = job.data;

    logger.info(`Processing email job: ${type}`, {
      jobId: job.id,
      to: data.to,
    });

    try {
      let result;

      switch (type) {
        case 'verification':
          result = await emailService.sendVerificationEmail(data.user, data.token);
          break;

        case 'password-reset':
          result = await emailService.sendPasswordResetEmail(data.user, data.token);
          break;

        case 'welcome':
          result = await emailService.sendWelcomeEmail(data.user);
          break;

        case 'account-lockout':
          result = await emailService.sendAccountLockoutEmail(data.user);
          break;

        case 'password-changed':
          result = await emailService.sendPasswordChangedEmail(data.user);
          break;

        case 'custom':
          result = await emailService.sendEmail(data);
          break;

        default:
          throw new Error(`Unknown email type: ${type}`);
      }

      logger.info(`Email job completed: ${type}`, {
        jobId: job.id,
        messageId: result.messageId,
      });

      return result;
    } catch (error) {
      logger.error(`Email job failed: ${type}`, {
        jobId: job.id,
        error: error.message,
        attempt: job.attemptsMade,
      });

      throw error;
    }
  });
}

/**
 * Queue event handlers
 * Only attach if not in test environment
 */
if (process.env.NODE_ENV !== 'test') {
  emailQueue.on('completed', (job, result) => {
    logger.debug(`Email job ${job.id} completed`, { result });
  });

  emailQueue.on('failed', (job, error) => {
    logger.error(`Email job ${job.id} failed after ${job.attemptsMade} attempts`, {
      error: error.message,
    });
  });

  emailQueue.on('stalled', (job) => {
    logger.warn(`Email job ${job.id} stalled`);
  });
}

/**
 * Helper functions to add jobs to queue
 */

/**
 * Queue verification email
 * @param {Object} user - User object
 * @param {string} token - Verification token
 * @param {Object} options - Queue options
 */
export async function queueVerificationEmail(user, token, options = {}) {
  return emailQueue.add(
    {
      type: 'verification',
      data: { user, token },
    },
    {
      priority: emailConfig.queue.priority.high,
      ...options,
    }
  );
}

/**
 * Queue password reset email
 * @param {Object} user - User object
 * @param {string} token - Reset token
 * @param {Object} options - Queue options
 */
export async function queuePasswordResetEmail(user, token, options = {}) {
  return emailQueue.add(
    {
      type: 'password-reset',
      data: { user, token },
    },
    {
      priority: emailConfig.queue.priority.high,
      ...options,
    }
  );
}

/**
 * Queue welcome email
 * @param {Object} user - User object
 * @param {Object} options - Queue options
 */
export async function queueWelcomeEmail(user, options = {}) {
  return emailQueue.add(
    {
      type: 'welcome',
      data: { user },
    },
    {
      priority: emailConfig.queue.priority.normal,
      ...options,
    }
  );
}

/**
 * Queue account lockout email
 * @param {Object} user - User object
 * @param {Object} options - Queue options
 */
export async function queueAccountLockoutEmail(user, options = {}) {
  return emailQueue.add(
    {
      type: 'account-lockout',
      data: { user },
    },
    {
      priority: emailConfig.queue.priority.high,
      ...options,
    }
  );
}

/**
 * Queue password changed email
 * @param {Object} user - User object
 * @param {Object} options - Queue options
 */
export async function queuePasswordChangedEmail(user, options = {}) {
  return emailQueue.add(
    {
      type: 'password-changed',
      data: { user },
    },
    {
      priority: emailConfig.queue.priority.high,
      ...options,
    }
  );
}

/**
 * Queue custom email
 * @param {Object} emailData - Email data
 * @param {Object} options - Queue options
 */
export async function queueCustomEmail(emailData, options = {}) {
  return emailQueue.add(
    {
      type: 'custom',
      data: emailData,
    },
    {
      priority: emailConfig.queue.priority.normal,
      ...options,
    }
  );
}

export default emailQueue;

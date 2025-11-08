/**
 * Cron Scheduler Service
 * Manages all scheduled tasks for the application
 */

import cron from 'node-cron';
import logger from '../utils/logger.js';
import whatsappHealthCheckService from './whatsappHealthCheckService.js';
import whatsappService from './whatsappService.js';
import flowAnalyticsService from './flowAnalyticsService.js';

class CronScheduler {
  constructor() {
    this.jobs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize all cron jobs
   */
  initialize() {
    if (this.isInitialized) {
      logger.warn('Cron scheduler already initialized');
      return;
    }

    logger.info('Initializing cron scheduler...');

    try {
      // WhatsApp session health check - every 15 minutes
      this.scheduleWhatsAppHealthCheck();

      // Daily message counter reset - every day at midnight
      this.scheduleDailyMessageCounterReset();

      // Cleanup inactive clients - every hour
      this.scheduleInactiveClientCleanup();

      // Flow analytics aggregation - every hour
      this.scheduleFlowAnalyticsAggregation();

      this.isInitialized = true;
      logger.info('Cron scheduler initialized successfully');
    } catch (error) {
      logger.error('Error initializing cron scheduler:', error);
      throw error;
    }
  }

  /**
   * Schedule WhatsApp session health check (every 15 minutes)
   */
  scheduleWhatsAppHealthCheck() {
    const jobName = 'whatsapp-health-check';

    // Run every 15 minutes: */15 * * * *
    const job = cron.schedule(
      '*/15 * * * *',
      async () => {
        try {
          logger.info('Running scheduled WhatsApp health check...');
          const results = await whatsappHealthCheckService.performHealthCheck();
          logger.info('Scheduled WhatsApp health check completed', results);
        } catch (error) {
          logger.error('Error in scheduled WhatsApp health check:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (every 15 minutes)`);
  }

  /**
   * Schedule daily message counter reset (every day at midnight)
   */
  scheduleDailyMessageCounterReset() {
    const jobName = 'daily-message-counter-reset';

    // Run every day at midnight: 0 0 * * *
    const job = cron.schedule(
      '0 0 * * *',
      async () => {
        try {
          logger.info('Running scheduled daily message counter reset...');
          await whatsappService.resetDailyMessageCounters();
          logger.info('Scheduled daily message counter reset completed');
        } catch (error) {
          logger.error('Error in scheduled daily message counter reset:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (daily at midnight)`);
  }

  /**
   * Schedule inactive client cleanup (every hour)
   */
  scheduleInactiveClientCleanup() {
    const jobName = 'inactive-client-cleanup';

    // Run every hour: 0 * * * *
    const job = cron.schedule(
      '0 * * * *',
      async () => {
        try {
          logger.info('Running scheduled inactive client cleanup...');
          await whatsappService.cleanupInactiveClients();
          logger.info('Scheduled inactive client cleanup completed');
        } catch (error) {
          logger.error('Error in scheduled inactive client cleanup:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (every hour)`);
  }

  /**
   * Schedule flow analytics aggregation (every hour)
   */
  scheduleFlowAnalyticsAggregation() {
    const jobName = 'flow-analytics-aggregation';

    // Run every hour at 5 minutes past: 5 * * * *
    const job = cron.schedule(
      '5 * * * *',
      async () => {
        try {
          logger.info('Running scheduled flow analytics aggregation...');
          const results = await flowAnalyticsService.aggregateFlowMetrics();
          logger.info('Scheduled flow analytics aggregation completed', {
            flowsProcessed: results.length,
          });
        } catch (error) {
          logger.error('Error in scheduled flow analytics aggregation:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (every hour at :05)`);
  }

  /**
   * Stop a specific cron job
   */
  stopJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.stop();
      logger.info(`Stopped cron job: ${jobName}`);
      return true;
    }
    logger.warn(`Cron job not found: ${jobName}`);
    return false;
  }

  /**
   * Start a specific cron job
   */
  startJob(jobName) {
    const job = this.jobs.get(jobName);
    if (job) {
      job.start();
      logger.info(`Started cron job: ${jobName}`);
      return true;
    }
    logger.warn(`Cron job not found: ${jobName}`);
    return false;
  }

  /**
   * Stop all cron jobs
   */
  stopAll() {
    logger.info('Stopping all cron jobs...');
    for (const [jobName, job] of this.jobs.entries()) {
      job.stop();
      logger.info(`Stopped cron job: ${jobName}`);
    }
    logger.info('All cron jobs stopped');
  }

  /**
   * Get status of all cron jobs
   */
  getStatus() {
    const status = {};
    for (const [jobName, job] of this.jobs.entries()) {
      status[jobName] = {
        running: job.running || false,
      };
    }
    return status;
  }

  /**
   * Manually trigger a job (for testing)
   */
  async triggerJob(jobName) {
    logger.info(`Manually triggering job: ${jobName}`);

    try {
      switch (jobName) {
        case 'whatsapp-health-check':
          return await whatsappHealthCheckService.performHealthCheck();
        case 'daily-message-counter-reset':
          return await whatsappService.resetDailyMessageCounters();
        case 'inactive-client-cleanup':
          return await whatsappService.cleanupInactiveClients();
        case 'flow-analytics-aggregation':
          return await flowAnalyticsService.aggregateFlowMetrics();
        default:
          throw new Error(`Unknown job: ${jobName}`);
      }
    } catch (error) {
      logger.error(`Error triggering job ${jobName}:`, error);
      throw error;
    }
  }
}

// Export singleton instance
const cronScheduler = new CronScheduler();
export default cronScheduler;

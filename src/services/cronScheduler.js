/**
 * Cron Scheduler Service
 * Manages all scheduled tasks for the application
 */

import cron from 'node-cron';
import logger from '../utils/logger.js';
import whatsappHealthCheckService from './whatsappHealthCheckService.js';
import whatsappService from './whatsappService.js';
import flowAnalyticsService from './flowAnalyticsService.js';
import analyticsService from './analyticsService.js';
import reportService from './reportService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

      // Cleanup orphaned session files - every day at 3 AM
      this.scheduleOrphanedSessionCleanup();

      // Flow analytics aggregation - every hour
      this.scheduleFlowAnalyticsAggregation();

      // Daily analytics snapshot generation - every day at 2 AM
      this.scheduleDailySnapshotGeneration();

      // Weekly analytics snapshot generation - every Monday at 3 AM
      this.scheduleWeeklySnapshotGeneration();

      // Monthly analytics snapshot generation - first day of month at 4 AM
      this.scheduleMonthlySnapshotGeneration();

      // Scheduled report processing - every hour
      this.scheduleReportProcessing();

      // Expired report cleanup - daily at 1 AM
      this.scheduleExpiredReportCleanup();

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
   * Schedule orphaned session cleanup (every day at 3 AM)
   */
  scheduleOrphanedSessionCleanup() {
    const jobName = 'orphaned-session-cleanup';

    // Run every day at 3 AM: 0 3 * * *
    const job = cron.schedule(
      '0 3 * * *',
      async () => {
        try {
          logger.info('Running scheduled orphaned session cleanup...');
          await whatsappService.cleanupOrphanedSessions();
          logger.info('Scheduled orphaned session cleanup completed');
        } catch (error) {
          logger.error('Error in scheduled orphaned session cleanup:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (daily at 3 AM)`);
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
   * Schedule daily analytics snapshot generation (every day at 2 AM)
   */
  scheduleDailySnapshotGeneration() {
    const jobName = 'daily-analytics-snapshot';

    // Run every day at 2 AM: 0 2 * * *
    const job = cron.schedule(
      '0 2 * * *',
      async () => {
        try {
          logger.info('Running scheduled daily analytics snapshot generation...');
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);

          // Get all teams
          const teams = await prisma.teams.findMany({
            select: { id: true }
          });

          let successCount = 0;
          let errorCount = 0;

          for (const team of teams) {
            try {
              // Generate team-wide snapshot
              await analyticsService.generateSnapshot(team.id, null, yesterday, 'Daily');
              
              // Generate per-account snapshots
              const accounts = await prisma.whatsapp_accounts.findMany({
                where: { team_id: team.id, is_active: true },
                select: { id: true }
              });

              for (const account of accounts) {
                await analyticsService.generateSnapshot(team.id, account.id, yesterday, 'Daily');
              }

              successCount++;
            } catch (error) {
              logger.error(`Error generating daily snapshot for team ${team.id}:`, error);
              errorCount++;
            }
          }

          logger.info('Scheduled daily analytics snapshot generation completed', {
            teamsProcessed: teams.length,
            successCount,
            errorCount
          });
        } catch (error) {
          logger.error('Error in scheduled daily analytics snapshot generation:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (daily at 2 AM)`);
  }

  /**
   * Schedule weekly analytics snapshot generation (every Monday at 3 AM)
   */
  scheduleWeeklySnapshotGeneration() {
    const jobName = 'weekly-analytics-snapshot';

    // Run every Monday at 3 AM: 0 3 * * 1
    const job = cron.schedule(
      '0 3 * * 1',
      async () => {
        try {
          logger.info('Running scheduled weekly analytics snapshot generation...');
          
          // Get the start of last week (Monday)
          const lastMonday = new Date();
          lastMonday.setDate(lastMonday.getDate() - 7);
          const dayOfWeek = lastMonday.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          lastMonday.setDate(lastMonday.getDate() + diff);
          lastMonday.setHours(0, 0, 0, 0);

          // Get all teams
          const teams = await prisma.teams.findMany({
            select: { id: true }
          });

          let successCount = 0;
          let errorCount = 0;

          for (const team of teams) {
            try {
              // Generate team-wide snapshot
              await analyticsService.generateSnapshot(team.id, null, lastMonday, 'Weekly');
              
              // Generate per-account snapshots
              const accounts = await prisma.whatsapp_accounts.findMany({
                where: { team_id: team.id, is_active: true },
                select: { id: true }
              });

              for (const account of accounts) {
                await analyticsService.generateSnapshot(team.id, account.id, lastMonday, 'Weekly');
              }

              successCount++;
            } catch (error) {
              logger.error(`Error generating weekly snapshot for team ${team.id}:`, error);
              errorCount++;
            }
          }

          logger.info('Scheduled weekly analytics snapshot generation completed', {
            teamsProcessed: teams.length,
            successCount,
            errorCount
          });
        } catch (error) {
          logger.error('Error in scheduled weekly analytics snapshot generation:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (every Monday at 3 AM)`);
  }

  /**
   * Schedule monthly analytics snapshot generation (first day of month at 4 AM)
   */
  scheduleMonthlySnapshotGeneration() {
    const jobName = 'monthly-analytics-snapshot';

    // Run on first day of month at 4 AM: 0 4 1 * *
    const job = cron.schedule(
      '0 4 1 * *',
      async () => {
        try {
          logger.info('Running scheduled monthly analytics snapshot generation...');
          
          // Get the first day of last month
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          lastMonth.setDate(1);
          lastMonth.setHours(0, 0, 0, 0);

          // Get all teams
          const teams = await prisma.teams.findMany({
            select: { id: true }
          });

          let successCount = 0;
          let errorCount = 0;

          for (const team of teams) {
            try {
              // Generate team-wide snapshot
              await analyticsService.generateSnapshot(team.id, null, lastMonth, 'Monthly');
              
              // Generate per-account snapshots
              const accounts = await prisma.whatsapp_accounts.findMany({
                where: { team_id: team.id, is_active: true },
                select: { id: true }
              });

              for (const account of accounts) {
                await analyticsService.generateSnapshot(team.id, account.id, lastMonth, 'Monthly');
              }

              successCount++;
            } catch (error) {
              logger.error(`Error generating monthly snapshot for team ${team.id}:`, error);
              errorCount++;
            }
          }

          logger.info('Scheduled monthly analytics snapshot generation completed', {
            teamsProcessed: teams.length,
            successCount,
            errorCount
          });
        } catch (error) {
          logger.error('Error in scheduled monthly analytics snapshot generation:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (first day of month at 4 AM)`);
  }

  /**
   * Schedule report processing (every hour)
   */
  scheduleReportProcessing() {
    const jobName = 'scheduled-report-processing';

    // Run every hour at 10 minutes past: 10 * * * *
    const job = cron.schedule(
      '10 * * * *',
      async () => {
        try {
          logger.info('Running scheduled report processing...');
          await reportService.processScheduledReports();
          logger.info('Scheduled report processing completed');
        } catch (error) {
          logger.error('Error in scheduled report processing:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (every hour at :10)`);
  }

  /**
   * Schedule expired report cleanup (daily at 1 AM)
   */
  scheduleExpiredReportCleanup() {
    const jobName = 'expired-report-cleanup';

    // Run every day at 1 AM: 0 1 * * *
    const job = cron.schedule(
      '0 1 * * *',
      async () => {
        try {
          logger.info('Running scheduled expired report cleanup...');
          await reportService.cleanupExpiredReports();
          logger.info('Scheduled expired report cleanup completed');
        } catch (error) {
          logger.error('Error in scheduled expired report cleanup:', error);
        }
      },
      {
        scheduled: true,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, job);
    logger.info(`Scheduled job: ${jobName} (daily at 1 AM)`);
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
        case 'daily-analytics-snapshot':
          // Generate for yesterday
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          yesterday.setHours(0, 0, 0, 0);
          const teams = await prisma.teams.findMany({ select: { id: true } });
          const results = [];
          for (const team of teams) {
            results.push(await analyticsService.generateSnapshot(team.id, null, yesterday, 'Daily'));
          }
          return results;
        case 'weekly-analytics-snapshot':
          // Generate for last week
          const lastMonday = new Date();
          lastMonday.setDate(lastMonday.getDate() - 7);
          const dayOfWeek = lastMonday.getDay();
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          lastMonday.setDate(lastMonday.getDate() + diff);
          lastMonday.setHours(0, 0, 0, 0);
          const teamsWeekly = await prisma.teams.findMany({ select: { id: true } });
          const resultsWeekly = [];
          for (const team of teamsWeekly) {
            resultsWeekly.push(await analyticsService.generateSnapshot(team.id, null, lastMonday, 'Weekly'));
          }
          return resultsWeekly;
        case 'monthly-analytics-snapshot':
          // Generate for last month
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          lastMonth.setDate(1);
          lastMonth.setHours(0, 0, 0, 0);
          const teamsMonthly = await prisma.teams.findMany({ select: { id: true } });
          const resultsMonthly = [];
          for (const team of teamsMonthly) {
            resultsMonthly.push(await analyticsService.generateSnapshot(team.id, null, lastMonth, 'Monthly'));
          }
          return resultsMonthly;
        case 'scheduled-report-processing':
          return await reportService.processScheduledReports();
        case 'expired-report-cleanup':
          return await reportService.cleanupExpiredReports();
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

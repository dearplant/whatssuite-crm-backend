import express from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import config from '../config/index.js';
import { queueHealth } from '../utils/queueHealth.js';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Basic health check endpoint
 * Returns 200 if service is up
 */
router.get('/health', async (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * Detailed health check with component status
 * Checks database, Redis, and queue health
 */
router.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.app.env,
    version: process.env.npm_package_version || '1.0.0',
    components: {},
  };

  let allHealthy = true;

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.components.database = {
      status: 'healthy',
      responseTime: 0,
    };
  } catch (error) {
    allHealthy = false;
    health.components.database = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check Redis
  try {
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    const start = Date.now();
    await redis.ping();
    const responseTime = Date.now() - start;

    health.components.redis = {
      status: 'healthy',
      responseTime,
    };

    redis.disconnect();
  } catch (error) {
    allHealthy = false;
    health.components.redis = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Check queues
  try {
    const queuesHealth = await queueHealth();
    health.components.queues = queuesHealth;

    // Check if any queue is unhealthy
    const unhealthyQueues = Object.values(queuesHealth).filter((q) => q.status === 'unhealthy');
    if (unhealthyQueues.length > 0) {
      allHealthy = false;
    }
  } catch (error) {
    allHealthy = false;
    health.components.queues = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  health.components.memory = {
    status: 'healthy',
    rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
  };

  // CPU usage (approximate)
  const cpuUsage = process.cpuUsage();
  health.components.cpu = {
    status: 'healthy',
    user: cpuUsage.user,
    system: cpuUsage.system,
  };

  health.status = allHealthy ? 'ok' : 'degraded';

  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json(health);
});

/**
 * Readiness check for load balancers
 * Returns 200 only if all critical components are ready
 */
router.get('/readiness', async (req, res) => {
  try {
    // Check database
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });

    await redis.ping();
    redis.disconnect();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Liveness check for Kubernetes
 * Returns 200 if process is alive
 */
router.get('/liveness', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;

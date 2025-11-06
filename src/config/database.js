import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger.js';

// Prisma Client configuration with connection pooling
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
});

// Log slow queries (> 1 second)
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    logger.warn('Slow query detected', {
      query: e.query,
      duration: `${e.duration}ms`,
      params: e.params,
    });
  }
});

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Database error', {
    message: e.message,
    target: e.target,
  });
});

// Log database warnings
prisma.$on('warn', (e) => {
  logger.warn('Database warning', {
    message: e.message,
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Disconnecting from database...');
  await prisma.$disconnect();
  process.exit(0);
});

// Test database connection
export async function testDatabaseConnection() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    logger.info('✅ Database connection established successfully');
    return true;
  } catch (error) {
    logger.error('❌ Failed to connect to database', {
      error: error.message,
      stack: error.stack,
    });
    return false;
  }
}

// Health check function
export async function checkDatabaseHealth() {
  try {
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;

    return {
      status: 'healthy',
      responseTime: `${responseTime}ms`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

// Get database statistics
export async function getDatabaseStats() {
  try {
    const [userCount, contactCount, messageCount, campaignCount, flowCount] = await Promise.all([
      prisma.user.count(),
      prisma.contact.count(),
      prisma.message.count(),
      prisma.campaign.count(),
      prisma.flow.count(),
    ]);

    return {
      users: userCount,
      contacts: contactCount,
      messages: messageCount,
      campaigns: campaignCount,
      flows: flowCount,
    };
  } catch (error) {
    logger.error('Failed to get database statistics', {
      error: error.message,
    });
    return null;
  }
}

export default prisma;

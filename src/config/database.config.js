/**
 * Database Configuration Module
 * Handles PostgreSQL and Prisma configuration
 */

const databaseConfig = {
  // Connection URL
  url: process.env.DATABASE_URL,

  // Connection pooling
  poolMin: parseInt(process.env.DATABASE_POOL_MIN, 10) || 2,
  poolMax: parseInt(process.env.DATABASE_POOL_MAX, 10) || 10,
  poolTimeout: parseInt(process.env.DATABASE_POOL_TIMEOUT, 10) || 30000, // 30 seconds

  // Query settings
  queryTimeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT, 10) || 30000, // 30 seconds
  statementTimeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT, 10) || 60000, // 60 seconds

  // Logging
  logQueries: process.env.DATABASE_LOG_QUERIES === 'true',
  logSlowQueries: process.env.DATABASE_LOG_SLOW_QUERIES !== 'false', // Default true
  slowQueryThreshold: parseInt(process.env.DATABASE_SLOW_QUERY_THRESHOLD, 10) || 1000, // 1 second

  // SSL Configuration
  ssl: {
    enabled: process.env.DATABASE_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
  },

  // Retry configuration
  retry: {
    maxAttempts: parseInt(process.env.DATABASE_RETRY_MAX_ATTEMPTS, 10) || 5,
    initialDelay: parseInt(process.env.DATABASE_RETRY_INITIAL_DELAY, 10) || 1000, // 1 second
    maxDelay: parseInt(process.env.DATABASE_RETRY_MAX_DELAY, 10) || 30000, // 30 seconds
  },

  // Migration settings
  migrations: {
    autoRun: process.env.DATABASE_AUTO_MIGRATE === 'true',
    tableName: process.env.DATABASE_MIGRATIONS_TABLE || '_prisma_migrations',
  },

  // Backup settings
  backup: {
    enabled: process.env.DATABASE_BACKUP_ENABLED === 'true',
    schedule: process.env.DATABASE_BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.DATABASE_BACKUP_RETENTION_DAYS, 10) || 30,
    compression: process.env.DATABASE_BACKUP_COMPRESSION !== 'false', // Default true
  },

  // Read replica configuration (for future scaling)
  readReplica: {
    enabled: process.env.DATABASE_READ_REPLICA_ENABLED === 'true',
    url: process.env.DATABASE_READ_REPLICA_URL,
  },

  // Health check settings
  healthCheck: {
    enabled: process.env.DATABASE_HEALTH_CHECK_ENABLED !== 'false', // Default true
    interval: parseInt(process.env.DATABASE_HEALTH_CHECK_INTERVAL, 10) || 30000, // 30 seconds
  },
};

export default databaseConfig;

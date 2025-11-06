/**
 * Redis Configuration Module
 * Handles Redis connection and caching configuration
 */

const redisConfig = {
  // Connection settings
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB, 10) || 0,
  username: process.env.REDIS_USERNAME || undefined,

  // Connection options
  connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT, 10) || 10000, // 10 seconds
  commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT, 10) || 5000, // 5 seconds
  keepAlive: parseInt(process.env.REDIS_KEEP_ALIVE, 10) || 30000, // 30 seconds

  // Retry strategy
  retry: {
    maxAttempts: parseInt(process.env.REDIS_RETRY_MAX_ATTEMPTS, 10) || 10,
    initialDelay: parseInt(process.env.REDIS_RETRY_INITIAL_DELAY, 10) || 50, // 50ms
    maxDelay: parseInt(process.env.REDIS_RETRY_MAX_DELAY, 10) || 3000, // 3 seconds
  },

  // TLS/SSL Configuration
  tls: {
    enabled: process.env.REDIS_TLS_ENABLED === 'true',
    rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.REDIS_TLS_CA,
    cert: process.env.REDIS_TLS_CERT,
    key: process.env.REDIS_TLS_KEY,
  },

  // Sentinel configuration (for high availability)
  sentinel: {
    enabled: process.env.REDIS_SENTINEL_ENABLED === 'true',
    masterName: process.env.REDIS_SENTINEL_MASTER_NAME || 'mymaster',
    sentinels: process.env.REDIS_SENTINEL_HOSTS
      ? process.env.REDIS_SENTINEL_HOSTS.split(',').map((host) => {
          const [h, p] = host.trim().split(':');
          return { host: h, port: parseInt(p, 10) || 26379 };
        })
      : [],
  },

  // Cluster configuration (for horizontal scaling)
  cluster: {
    enabled: process.env.REDIS_CLUSTER_ENABLED === 'true',
    nodes: process.env.REDIS_CLUSTER_NODES
      ? process.env.REDIS_CLUSTER_NODES.split(',').map((node) => {
          const [host, port] = node.trim().split(':');
          return { host, port: parseInt(port, 10) || 6379 };
        })
      : [],
    options: {
      maxRedirections: parseInt(process.env.REDIS_CLUSTER_MAX_REDIRECTIONS, 10) || 16,
      retryDelayOnFailover: parseInt(process.env.REDIS_CLUSTER_RETRY_DELAY, 10) || 100,
    },
  },

  // Cache settings
  cache: {
    defaultTTL: parseInt(process.env.REDIS_CACHE_DEFAULT_TTL, 10) || 300, // 5 minutes
    keyPrefix: process.env.REDIS_CACHE_KEY_PREFIX || 'whatsapp-crm:',

    // Specific cache TTLs
    ttl: {
      user: parseInt(process.env.REDIS_CACHE_TTL_USER, 10) || 300, // 5 minutes
      contact: parseInt(process.env.REDIS_CACHE_TTL_CONTACT, 10) || 60, // 1 minute
      campaign: parseInt(process.env.REDIS_CACHE_TTL_CAMPAIGN, 10) || 30, // 30 seconds
      analytics: parseInt(process.env.REDIS_CACHE_TTL_ANALYTICS, 10) || 300, // 5 minutes
      segment: parseInt(process.env.REDIS_CACHE_TTL_SEGMENT, 10) || 300, // 5 minutes
      permissions: parseInt(process.env.REDIS_CACHE_TTL_PERMISSIONS, 10) || 300, // 5 minutes
    },
  },

  // Queue settings (for Bull)
  queue: {
    prefix: process.env.REDIS_QUEUE_PREFIX || 'bull',
    defaultJobOptions: {
      attempts: parseInt(process.env.REDIS_QUEUE_DEFAULT_ATTEMPTS, 10) || 3,
      backoff: {
        type: 'exponential',
        delay: parseInt(process.env.REDIS_QUEUE_BACKOFF_DELAY, 10) || 5000, // 5 seconds
      },
      removeOnComplete: parseInt(process.env.REDIS_QUEUE_REMOVE_ON_COMPLETE, 10) || 100,
      removeOnFail: parseInt(process.env.REDIS_QUEUE_REMOVE_ON_FAIL, 10) || 500,
    },
  },

  // Session settings
  session: {
    prefix: process.env.REDIS_SESSION_PREFIX || 'sess:',
    ttl: parseInt(process.env.REDIS_SESSION_TTL, 10) || 86400, // 24 hours
  },

  // Rate limiting settings
  rateLimit: {
    prefix: process.env.REDIS_RATE_LIMIT_PREFIX || 'rl:',
    blockDuration: parseInt(process.env.REDIS_RATE_LIMIT_BLOCK_DURATION, 10) || 900, // 15 minutes
  },

  // Health check settings
  healthCheck: {
    enabled: process.env.REDIS_HEALTH_CHECK_ENABLED !== 'false', // Default true
    interval: parseInt(process.env.REDIS_HEALTH_CHECK_INTERVAL, 10) || 30000, // 30 seconds
    timeout: parseInt(process.env.REDIS_HEALTH_CHECK_TIMEOUT, 10) || 5000, // 5 seconds
  },

  // Monitoring
  monitoring: {
    enabled: process.env.REDIS_MONITORING_ENABLED === 'true',
    slowCommandThreshold: parseInt(process.env.REDIS_SLOW_COMMAND_THRESHOLD, 10) || 100, // 100ms
  },
};

export default redisConfig;

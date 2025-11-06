import { createClient } from 'redis';
import config from './index.js';
import logger from '../utils/logger.js';

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis client with error handling and reconnection logic
 */
const initializeRedis = async () => {
  if (redisClient) {
    return redisClient;
  }

  try {
    // Create Redis client with configuration
    redisClient = createClient({
      socket: {
        host: config.redis.host,
        port: config.redis.port,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          // Exponential backoff: 50ms, 100ms, 200ms, 400ms, etc.
          const delay = Math.min(retries * 50, 3000);
          logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
      password: config.redis.password,
      database: config.redis.db,
    });

    // Event handlers
    redisClient.on('connect', () => {
      logger.info('Redis: Connecting...');
    });

    redisClient.on('ready', () => {
      isConnected = true;
      logger.info('Redis: Connected and ready');
    });

    redisClient.on('error', (err) => {
      logger.error('Redis: Error occurred', { error: err.message });
    });

    redisClient.on('reconnecting', () => {
      logger.warn('Redis: Reconnecting...');
    });

    redisClient.on('end', () => {
      isConnected = false;
      logger.warn('Redis: Connection closed');
    });

    // Connect to Redis
    await redisClient.connect();

    logger.info('Redis client initialized successfully');
    return redisClient;
  } catch (error) {
    logger.error('Redis: Failed to initialize', { error: error.message });
    throw error;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call initializeRedis() first.');
  }
  return redisClient;
};

/**
 * Check if Redis is connected
 */
const isRedisConnected = () => {
  return isConnected && redisClient?.isOpen;
};

/**
 * Gracefully close Redis connection
 */
const closeRedis = async () => {
  if (redisClient && isConnected) {
    try {
      await redisClient.quit();
      logger.info('Redis: Connection closed gracefully');
    } catch (error) {
      logger.error('Redis: Error closing connection', { error: error.message });
      // Force close if graceful close fails
      try {
        await redisClient.disconnect();
      } catch (disconnectError) {
        // Ignore disconnect errors if already closed
      }
    } finally {
      redisClient = null;
      isConnected = false;
    }
  }
};

/**
 * Redis wrapper with error handling
 */
class RedisWrapper {
  /**
   * Get value from Redis
   */
  async get(key) {
    try {
      const client = getRedisClient();
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis: GET error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in Redis with optional TTL
   */
  async set(key, value, ttl = null) {
    try {
      const client = getRedisClient();
      const serialized = JSON.stringify(value);

      if (ttl) {
        await client.setEx(key, ttl, serialized);
      } else {
        await client.set(key, serialized);
      }

      return true;
    } catch (error) {
      logger.error('Redis: SET error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete key from Redis
   */
  async del(key) {
    try {
      const client = getRedisClient();
      await client.del(key);
      return true;
    } catch (error) {
      logger.error('Redis: DEL error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete multiple keys matching pattern
   */
  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
      }

      return keys.length;
    } catch (error) {
      logger.error('Redis: DEL pattern error', { pattern, error: error.message });
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    try {
      const client = getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis: EXISTS error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key, seconds) {
    try {
      const client = getRedisClient();
      await client.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error('Redis: EXPIRE error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Increment value
   */
  async incr(key) {
    try {
      const client = getRedisClient();
      return await client.incr(key);
    } catch (error) {
      logger.error('Redis: INCR error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Decrement value
   */
  async decr(key) {
    try {
      const client = getRedisClient();
      return await client.decr(key);
    } catch (error) {
      logger.error('Redis: DECR error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Get cached data or fetch and cache
   */
  async getCached(key, fetchFn, ttl = 300) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Fetch data
      const data = await fetchFn();

      // Cache the result
      if (data !== null && data !== undefined) {
        await this.set(key, data, ttl);
      }

      return data;
    } catch (error) {
      logger.error('Redis: getCached error', { key, error: error.message });
      // If caching fails, still return the fetched data
      try {
        return await fetchFn();
      } catch (fetchError) {
        logger.error('Redis: fetchFn error', { key, error: fetchError.message });
        throw fetchError;
      }
    }
  }

  /**
   * Flush all data from current database
   */
  async flushDb() {
    try {
      const client = getRedisClient();
      await client.flushDb();
      logger.info('Redis: Database flushed');
      return true;
    } catch (error) {
      logger.error('Redis: FLUSHDB error', { error: error.message });
      return false;
    }
  }
}

// Create singleton instance
const redis = new RedisWrapper();

export { initializeRedis, getRedisClient, isRedisConnected, closeRedis, redis };
export default redis;

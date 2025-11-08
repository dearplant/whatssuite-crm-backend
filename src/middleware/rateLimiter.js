import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import { logger } from '../utils/logger.js';

/**
 * Rate limiting middleware configurations
 */

/**
 * Global rate limiter for all API endpoints
 * 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'TooManyRequests',
    message: 'Too many requests from this IP, please try again later',
    retryAfter: 900, // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Too many requests from this IP, please try again later',
      retryAfter: 900,
      timestamp: new Date().toISOString(),
    });
  },
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    return req.path === '/health';
  },
});

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP (disabled in test environment)
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // Higher limit for tests
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'TooManyRequests',
    message: 'Too many authentication attempts, please try again later',
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      email: req.body?.email,
    });

    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Too many authentication attempts, please try again in 15 minutes',
      retryAfter: 900,
      timestamp: new Date().toISOString(),
    });
  },
});

/**
 * Create Redis-backed rate limiter (for production with multiple instances)
 * @param {Object} options - Rate limiter options
 * @returns {Function} Rate limiter middleware
 */
export function createRedisRateLimiter(options = {}) {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    prefix = 'rl:',
    skipSuccessfulRequests = false,
  } = options;

  try {
    const redisClient = getRedisClient();
    return rateLimit({
      store: new RedisStore({
        client: redisClient,
        prefix,
        sendCommand: (...args) => redisClient.sendCommand(args),
      }),
      windowMs,
      max,
      skipSuccessfulRequests,
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('Redis rate limit exceeded', {
          ip: req.ip,
          path: req.path,
          method: req.method,
        });

        res.status(429).json({
          error: 'TooManyRequests',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(windowMs / 1000),
          timestamp: new Date().toISOString(),
        });
      },
    });
  } catch (error) {
    logger.error('Failed to create Redis rate limiter, falling back to memory store', {
      error: error.message,
    });

    // Fallback to memory store if Redis is unavailable
    return rateLimit({
      windowMs,
      max,
      skipSuccessfulRequests,
      standardHeaders: true,
      legacyHeaders: false,
    });
  }
}

/**
 * Message sending rate limiter
 * 20 messages per minute per user
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  keyGenerator: (req, _res) => {
    // Use user ID as key, or fall back to the built-in IP key generator
    if (req.user?.id) {
      return req.user.id;
    }
    // Use the default key generator for IP-based limiting (handles IPv6 correctly)
    return undefined;
  },
  message: {
    error: 'TooManyRequests',
    message: 'Message rate limit exceeded. Maximum 20 messages per minute.',
    retryAfter: 60,
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Message rate limit exceeded', {
      userId: req.user?.id,
      ip: req.ip,
    });

    res.status(429).json({
      error: 'TooManyRequests',
      message: 'Message rate limit exceeded. Maximum 20 messages per minute.',
      retryAfter: 60,
      timestamp: new Date().toISOString(),
    });
  },
});

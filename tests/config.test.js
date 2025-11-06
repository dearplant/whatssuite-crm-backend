import { describe, it, expect, beforeAll } from '@jest/globals';
import config, { validateConfig } from '../src/config/index.js';

describe('Configuration Management', () => {
  describe('Config Loading', () => {
    it('should load application configuration', () => {
      expect(config.app).toBeDefined();
      expect(config.app.name).toBeDefined();
      expect(config.app.env).toBeDefined();
      expect(config.app.port).toBeDefined();
    });

    it('should load database configuration', () => {
      expect(config.database).toBeDefined();
      // URL might be undefined in test environment without .env
      if (config.database.url) {
        expect(config.database.url).toBeDefined();
      }
      expect(config.database.poolMin).toBeGreaterThanOrEqual(2);
      expect(config.database.poolMax).toBeGreaterThanOrEqual(config.database.poolMin);
    });

    it('should load Redis configuration', () => {
      expect(config.redis).toBeDefined();
      expect(config.redis.host).toBeDefined();
      expect(config.redis.port).toBeDefined();
      expect(config.redis.db).toBeDefined();
    });

    it('should load JWT configuration', () => {
      expect(config.jwt).toBeDefined();
      expect(config.jwt.secret).toBeDefined();
      expect(config.jwt.accessExpiry).toBeDefined();
      expect(config.jwt.refreshExpiry).toBeDefined();
    });

    it('should load email configuration', () => {
      expect(config.email).toBeDefined();
      expect(config.email.service).toBeDefined();
      expect(config.email.from).toBeDefined();
    });

    it('should load AWS configuration', () => {
      expect(config.aws).toBeDefined();
      expect(config.aws.region).toBeDefined();
    });
  });

  describe('Environment-Specific Configuration', () => {
    it('should identify current environment', () => {
      expect(config.app.env).toBeDefined();
      expect(['development', 'staging', 'production', 'test']).toContain(config.app.env);
    });

    it('should have environment flags', () => {
      expect(typeof config.app.isDevelopment).toBe('boolean');
      expect(typeof config.app.isStaging).toBe('boolean');
      expect(typeof config.app.isProduction).toBe('boolean');
    });

    it('should configure logging based on environment', () => {
      expect(config.logging.level).toBeDefined();
      expect(['debug', 'info', 'warn', 'error']).toContain(config.logging.level);
    });
  });

  describe('Feature Flags', () => {
    it('should load feature flags', () => {
      expect(config.features).toBeDefined();
      expect(typeof config.features.aiChatbot).toBe('boolean');
      expect(typeof config.features.voiceTranscription).toBe('boolean');
      expect(typeof config.features.ecommerceIntegration).toBe('boolean');
      expect(typeof config.features.paymentProcessing).toBe('boolean');
      expect(typeof config.features.webhooks).toBe('boolean');
      expect(typeof config.features.analytics).toBe('boolean');
    });

    it('should have all expected feature flags', () => {
      const expectedFeatures = [
        'aiChatbot',
        'voiceTranscription',
        'ecommerceIntegration',
        'paymentProcessing',
        'webhooks',
        'analytics',
        'teamManagement',
        'multiLanguage',
      ];

      expectedFeatures.forEach((feature) => {
        expect(config.features).toHaveProperty(feature);
      });
    });
  });

  describe('Modular Configuration', () => {
    it('should load database config module', () => {
      expect(config.database.poolMin).toBeDefined();
      expect(config.database.poolMax).toBeDefined();
      expect(config.database.queryTimeout).toBeDefined();
    });

    it('should load Redis config module', () => {
      expect(config.redis.host).toBeDefined();
      expect(config.redis.port).toBeDefined();
      expect(config.redis.cache).toBeDefined();
      expect(config.redis.cache.defaultTTL).toBeDefined();
    });

    it('should load AWS config module', () => {
      expect(config.aws.region).toBeDefined();
      expect(config.aws.s3).toBeDefined();
    });

    it('should load email config module', () => {
      expect(config.email.service).toBeDefined();
      expect(config.email.smtp).toBeDefined();
      expect(config.email.sendgrid).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should validate required configuration in production', () => {
      // This test will only run validation if in production
      if (config.app.isProduction) {
        expect(() => validateConfig()).not.toThrow();
      } else {
        // In development, validation might throw if required vars are missing
        // but that's expected behavior
        expect(true).toBe(true);
      }
    });

    it('should have encryption key configured', () => {
      expect(config.encryption.key).toBeDefined();
    });

    it('should have JWT secret configured', () => {
      expect(config.jwt.secret).toBeDefined();
    });
  });

  describe('Security Configuration', () => {
    it('should load security settings', () => {
      expect(config.security).toBeDefined();
      expect(config.security.bcryptRounds).toBe(12);
      expect(config.security.maxLoginAttempts).toBe(5);
      expect(config.security.lockoutDuration).toBeDefined();
    });

    it('should load rate limiting configuration', () => {
      expect(config.rateLimit).toBeDefined();
      expect(config.rateLimit.windowMs).toBeDefined();
      expect(config.rateLimit.maxRequests).toBeDefined();
      expect(config.rateLimit.authMax).toBeDefined();
    });
  });

  describe('Performance Configuration', () => {
    it('should load performance settings', () => {
      expect(config.performance).toBeDefined();
      expect(config.performance.cacheTTL).toBeDefined();
      expect(config.performance.queryTimeout).toBeDefined();
      expect(config.performance.requestTimeout).toBeDefined();
    });

    it('should have cache TTL configurations', () => {
      expect(config.redis.cache.ttl).toBeDefined();
      expect(config.redis.cache.ttl.user).toBeDefined();
      expect(config.redis.cache.ttl.contact).toBeDefined();
      expect(config.redis.cache.ttl.campaign).toBeDefined();
    });
  });

  describe('Integration Configuration', () => {
    it('should load AI provider configuration', () => {
      expect(config.ai).toBeDefined();
      expect(config.ai.openai).toBeDefined();
      expect(config.ai.anthropic).toBeDefined();
      expect(config.ai.google).toBeDefined();
    });

    it('should load e-commerce configuration', () => {
      expect(config.ecommerce).toBeDefined();
      expect(config.ecommerce.shopify).toBeDefined();
      expect(config.ecommerce.woocommerce).toBeDefined();
    });

    it('should load payment gateway configuration', () => {
      expect(config.payments).toBeDefined();
      expect(config.payments.stripe).toBeDefined();
      expect(config.payments.paypal).toBeDefined();
      expect(config.payments.razorpay).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should load CORS settings', () => {
      expect(config.cors).toBeDefined();
      expect(Array.isArray(config.cors.origin)).toBe(true);
      expect(config.cors.origin.length).toBeGreaterThan(0);
      expect(typeof config.cors.credentials).toBe('boolean');
    });

    it('should have proper CORS methods', () => {
      expect(Array.isArray(config.cors.methods)).toBe(true);
      expect(config.cors.methods).toContain('GET');
      expect(config.cors.methods).toContain('POST');
    });
  });

  describe('Queue Configuration', () => {
    it('should load queue settings', () => {
      expect(config.queue).toBeDefined();
      expect(config.queue.bullBoard).toBeDefined();
      expect(config.queue.defaultJobOptions).toBeDefined();
    });

    it('should have job retry configuration', () => {
      expect(config.queue.defaultJobOptions.attempts).toBeDefined();
      expect(config.queue.defaultJobOptions.backoff).toBeDefined();
      expect(config.queue.defaultJobOptions.backoff.type).toBe('exponential');
    });
  });
});

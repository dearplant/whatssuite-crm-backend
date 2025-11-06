# Configuration Management

## Overview

The WhatsApp CRM Backend uses a centralized configuration system that loads settings from environment variables and organizes them into modular configuration files.

## Configuration Structure

```
src/config/
├── index.js           # Main configuration hub
├── database.config.js # Database settings
├── redis.config.js    # Redis and caching settings
├── aws.config.js      # AWS services configuration
└── email.config.js    # Email service configuration
```

## Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

### Application Settings

```env
NODE_ENV=development          # Environment: development, staging, production
PORT=5000                     # Server port
API_VERSION=v1                # API version
APP_NAME=WhatsApp CRM Backend
APP_URL=http://localhost:5000
```

### Database Configuration

```env
DATABASE_URL=postgresql://user:password@localhost:5432/whatsapp_crm
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Redis Configuration

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Authentication

```env
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=7d
JWT_REFRESH_EXPIRY=30d
ENCRYPTION_KEY=your-32-character-encryption-key-change-this
```

### Email Configuration

```env
EMAIL_SERVICE=smtp            # smtp, sendgrid, ses
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
EMAIL_FROM=noreply@whatsappcrm.com
EMAIL_FROM_NAME=WhatsApp CRM
```

### AWS Configuration

```env
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=us-east-1
AWS_S3_BUCKET=whatsapp-crm-media
```

### Feature Flags

```env
ENABLE_AI_CHATBOT=true
ENABLE_VOICE_TRANSCRIPTION=true
ENABLE_ECOMMERCE_INTEGRATION=true
ENABLE_PAYMENT_PROCESSING=true
ENABLE_WEBHOOKS=true
ENABLE_ANALYTICS=true
```

## Configuration Modules

### Main Configuration (`config/index.js`)

The main configuration file imports all modular configs and provides:

- Environment-specific settings
- Configuration validation
- Feature flags management
- Security settings
- Performance tuning

**Usage:**

```javascript
import config from './config/index.js';

console.log(config.app.env);        // Current environment
console.log(config.app.port);       // Server port
console.log(config.features.aiChatbot); // Feature flag
```

### Database Configuration (`config/database.config.js`)

Manages PostgreSQL and Prisma settings:

- Connection pooling (min/max connections)
- Query timeouts
- Slow query logging
- SSL configuration
- Backup settings
- Read replica support

**Key Settings:**

```javascript
config.database.poolMin          // Minimum pool connections (default: 2)
config.database.poolMax          // Maximum pool connections (default: 10)
config.database.queryTimeout     // Query timeout in ms (default: 30000)
config.database.slowQueryThreshold // Log queries slower than this (default: 1000ms)
```

### Redis Configuration (`config/redis.config.js`)

Manages Redis connection and caching:

- Connection settings and retry logic
- Cache TTL configurations per data type
- Queue settings for Bull
- Cluster and Sentinel support
- Session management

**Key Settings:**

```javascript
config.redis.host                // Redis host
config.redis.port                // Redis port
config.redis.cache.defaultTTL    // Default cache TTL (default: 300s)
config.redis.cache.ttl.user      // User cache TTL (default: 300s)
config.redis.cache.ttl.contact   // Contact cache TTL (default: 60s)
```

### AWS Configuration (`config/aws.config.js`)

Manages AWS services:

- S3 storage with folder structure
- SES email service
- CloudFront CDN
- SNS notifications
- SQS queues
- Lambda functions

**Key Settings:**

```javascript
config.aws.s3.bucket             // S3 bucket name
config.aws.s3.maxFileSize        // Max upload size (default: 10MB)
config.aws.s3.folders.messages   // Messages folder path
config.aws.ses.enabled           // Enable SES for emails
```

### Email Configuration (`config/email.config.js`)

Manages email services:

- SMTP configuration
- SendGrid integration
- AWS SES integration
- Template engine settings
- Rate limiting
- Queue settings

**Key Settings:**

```javascript
config.email.service             // Email service: smtp, sendgrid, ses
config.email.smtp.host           // SMTP host
config.email.smtp.port           // SMTP port
config.email.queue.enabled       // Use queue for async sending
config.email.rateLimit.maxPerHour // Max emails per hour
```

## Environment-Specific Configuration

The system automatically adjusts settings based on the environment:

### Development

- Logging level: `debug`
- Console logging: enabled
- File logging: enabled
- Strict validation: disabled
- HTTPS required: no

### Staging

- Logging level: `info`
- Console logging: enabled
- File logging: enabled
- Strict validation: enabled
- HTTPS required: yes

### Production

- Logging level: `warn`
- Console logging: disabled
- File logging: enabled
- Strict validation: enabled
- HTTPS required: yes
- Sentry enabled (if configured)

## Configuration Validation

The system validates required configuration on startup:

**Required in all environments:**
- `DATABASE_URL`
- `JWT_SECRET` (minimum 32 characters)
- `ENCRYPTION_KEY` (minimum 32 characters)

**Required in production:**
- `SENTRY_DSN`
- Email configuration (SMTP or SendGrid or SES)

**Conditional requirements:**
- If AI chatbot is enabled, at least one AI provider must be configured

## Feature Flags

Feature flags allow enabling/disabling features without code changes:

```javascript
config.features.aiChatbot              // AI chatbot functionality
config.features.voiceTranscription     // Voice message transcription
config.features.ecommerceIntegration   // Shopify/WooCommerce integration
config.features.paymentProcessing      // Payment gateway integration
config.features.webhooks               // Webhook support
config.features.analytics              // Analytics and reporting
config.features.teamManagement         // Team collaboration features
config.features.multiLanguage          // Multi-language support
```

## Security Configuration

```javascript
config.security.bcryptRounds           // Password hashing rounds (default: 12)
config.security.maxLoginAttempts       // Max failed login attempts (default: 5)
config.security.lockoutDuration        // Account lockout duration (default: 15 min)
config.security.sessionTimeout         // Session timeout (default: 24 hours)
```

## Performance Configuration

```javascript
config.performance.cacheTTL            // Default cache TTL (default: 300s)
config.performance.queryTimeout        // Database query timeout (default: 30s)
config.performance.requestTimeout      // HTTP request timeout (default: 30s)
config.performance.maxRequestSize      // Max request body size (default: 10mb)
```

## Rate Limiting Configuration

```javascript
config.rateLimit.windowMs              // Time window (default: 15 min)
config.rateLimit.maxRequests           // Max requests per window (default: 100)
config.rateLimit.authMax               // Max auth attempts (default: 5)
```

## CORS Configuration

```javascript
config.cors.origin                     // Allowed origins (array)
config.cors.credentials                // Allow credentials (boolean)
config.cors.methods                    // Allowed HTTP methods (array)
config.cors.allowedHeaders             // Allowed headers (array)
```

## Queue Configuration

```javascript
config.queue.bullBoard.username        // Bull Board admin username
config.queue.bullBoard.password        // Bull Board admin password
config.queue.defaultJobOptions.attempts // Job retry attempts (default: 3)
config.queue.defaultJobOptions.backoff  // Backoff strategy (exponential)
```

## Usage Examples

### Accessing Configuration

```javascript
import config from './config/index.js';

// Check environment
if (config.app.isProduction) {
  // Production-specific logic
}

// Use feature flags
if (config.features.aiChatbot) {
  // Initialize AI chatbot
}

// Access nested configuration
const s3Bucket = config.aws.s3.bucket;
const redisHost = config.redis.host;
```

### Validating Configuration

```javascript
import { validateConfig } from './config/index.js';

try {
  validateConfig();
  console.log('Configuration is valid');
} catch (error) {
  console.error('Configuration error:', error.message);
}
```

### Environment Detection

```javascript
import config from './config/index.js';

console.log(`Running in ${config.app.env} mode`);
console.log(`Is Development: ${config.app.isDevelopment}`);
console.log(`Is Production: ${config.app.isProduction}`);
```

## Best Practices

1. **Never commit `.env` files** - Use `.env.example` as a template
2. **Use strong secrets** - JWT_SECRET and ENCRYPTION_KEY should be at least 32 characters
3. **Enable Sentry in production** - For error tracking and monitoring
4. **Configure rate limiting** - Protect against abuse
5. **Use feature flags** - Enable/disable features without code changes
6. **Set appropriate timeouts** - Prevent hanging requests
7. **Configure caching** - Improve performance with proper TTL values
8. **Enable SSL in production** - Use HTTPS for all connections
9. **Monitor configuration** - Check logs for configuration warnings
10. **Test configuration changes** - Run tests after updating config

## Troubleshooting

### Configuration Validation Errors

If you see validation errors on startup:

1. Check that all required environment variables are set
2. Verify that secrets meet minimum length requirements
3. Ensure DATABASE_URL is a valid PostgreSQL connection string
4. Check that conditional requirements are met (e.g., AI providers when chatbot is enabled)

### Connection Issues

If services fail to connect:

1. Verify database URL and credentials
2. Check Redis host and port
3. Ensure AWS credentials are valid
4. Test SMTP settings with a simple email

### Performance Issues

If experiencing slow performance:

1. Increase database pool size
2. Adjust cache TTL values
3. Enable compression
4. Configure CDN for static assets
5. Review query timeout settings

## Additional Resources

- [Environment Variables Reference](.env.example)
- [Database Setup](./DATABASE_SETUP.md)
- [Redis Queue Setup](./REDIS_QUEUE_SETUP.md)
- [Setup Guide](./SETUP.md)

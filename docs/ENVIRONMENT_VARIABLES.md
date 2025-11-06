# Environment Variables Documentation

This document describes all environment variables used in the WhatsApp CRM Backend system.

## Table of Contents

- [Application Configuration](#application-configuration)
- [Database Configuration](#database-configuration)
- [Redis Configuration](#redis-configuration)
- [Authentication & Security](#authentication--security)
- [Email Configuration](#email-configuration)
- [File Storage](#file-storage)
- [Error Tracking](#error-tracking)
- [Rate Limiting](#rate-limiting)
- [WhatsApp Integration](#whatsapp-integration)
- [AI Providers](#ai-providers)
- [E-commerce Integration](#e-commerce-integration)
- [Payment Gateways](#payment-gateways)
- [Logging](#logging)
- [Monitoring](#monitoring)
- [Backup](#backup)

---

## Application Configuration

### `NODE_ENV`
- **Description**: Application environment
- **Type**: String
- **Values**: `development`, `staging`, `production`
- **Default**: `development`
- **Required**: Yes
- **Example**: `NODE_ENV=production`

### `PORT`
- **Description**: Port number for the application server
- **Type**: Number
- **Default**: `5000`
- **Required**: Yes
- **Example**: `PORT=5000`

### `FRONTEND_URL`
- **Description**: URL of the frontend application (for CORS and redirects)
- **Type**: String
- **Required**: Yes
- **Example**: `FRONTEND_URL=https://app.whatsapp-crm.com`

---

## Database Configuration

### `DATABASE_URL`
- **Description**: PostgreSQL connection string
- **Type**: String
- **Format**: `postgresql://user:password@host:port/database?schema=public`
- **Required**: Yes
- **Example**: `DATABASE_URL=postgresql://postgres:password@localhost:5432/whatsapp_crm?schema=public`
- **Notes**: 
  - Use `sslmode=require` for production
  - Prisma uses this for database connections

### `POSTGRES_USER`
- **Description**: PostgreSQL username
- **Type**: String
- **Required**: Yes (for Docker Compose)
- **Example**: `POSTGRES_USER=postgres`

### `POSTGRES_PASSWORD`
- **Description**: PostgreSQL password
- **Type**: String
- **Required**: Yes (for Docker Compose)
- **Example**: `POSTGRES_PASSWORD=strong-password`
- **Security**: Use strong passwords in production

### `POSTGRES_DB`
- **Description**: PostgreSQL database name
- **Type**: String
- **Required**: Yes (for Docker Compose)
- **Example**: `POSTGRES_DB=whatsapp_crm`

### `POSTGRES_PORT`
- **Description**: PostgreSQL port
- **Type**: Number
- **Default**: `5432`
- **Required**: No
- **Example**: `POSTGRES_PORT=5432`

---

## Redis Configuration

### `REDIS_HOST`
- **Description**: Redis server hostname
- **Type**: String
- **Required**: Yes
- **Example**: `REDIS_HOST=localhost`

### `REDIS_PORT`
- **Description**: Redis server port
- **Type**: Number
- **Default**: `6379`
- **Required**: Yes
- **Example**: `REDIS_PORT=6379`

### `REDIS_PASSWORD`
- **Description**: Redis authentication password
- **Type**: String
- **Required**: Yes (recommended)
- **Example**: `REDIS_PASSWORD=strong-redis-password`
- **Security**: Always use password in production

---

## Authentication & Security

### `JWT_SECRET`
- **Description**: Secret key for signing JWT access tokens
- **Type**: String
- **Required**: Yes
- **Minimum Length**: 32 characters (64+ recommended for production)
- **Example**: `JWT_SECRET=your-super-secret-jwt-key-min-32-chars`
- **Security**: 
  - Use cryptographically secure random string
  - Never commit to version control
  - Rotate periodically in production

### `JWT_REFRESH_SECRET`
- **Description**: Secret key for signing JWT refresh tokens
- **Type**: String
- **Required**: Yes
- **Minimum Length**: 32 characters (64+ recommended for production)
- **Example**: `JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars`
- **Security**: Must be different from `JWT_SECRET`

### `JWT_EXPIRES_IN`
- **Description**: Access token expiration time
- **Type**: String (time format)
- **Default**: `7d`
- **Required**: No
- **Example**: `JWT_EXPIRES_IN=7d`
- **Format**: `1h`, `7d`, `30m`, etc.

### `JWT_REFRESH_EXPIRES_IN`
- **Description**: Refresh token expiration time
- **Type**: String (time format)
- **Default**: `30d`
- **Required**: No
- **Example**: `JWT_REFRESH_EXPIRES_IN=30d`

### `ENCRYPTION_KEY`
- **Description**: Key for encrypting sensitive data (AI credentials, payment gateway keys)
- **Type**: String
- **Required**: Yes
- **Minimum Length**: 32 characters (64+ recommended)
- **Example**: `ENCRYPTION_KEY=your-encryption-key-min-32-chars`
- **Security**: 
  - Use AES-256-GCM compatible key
  - Store in secrets manager in production

---

## Email Configuration

### `SMTP_HOST`
- **Description**: SMTP server hostname
- **Type**: String
- **Required**: Yes
- **Example**: `SMTP_HOST=smtp.sendgrid.net`

### `SMTP_PORT`
- **Description**: SMTP server port
- **Type**: Number
- **Common Values**: `25`, `465`, `587`, `2525`
- **Required**: Yes
- **Example**: `SMTP_PORT=587`

### `SMTP_USER`
- **Description**: SMTP authentication username
- **Type**: String
- **Required**: Yes
- **Example**: `SMTP_USER=apikey`

### `SMTP_PASSWORD`
- **Description**: SMTP authentication password
- **Type**: String
- **Required**: Yes
- **Example**: `SMTP_PASSWORD=your-smtp-password`
- **Security**: Use API keys when possible

### `SMTP_FROM`
- **Description**: Default sender email address
- **Type**: String (email)
- **Required**: Yes
- **Example**: `SMTP_FROM=noreply@whatsapp-crm.com`

### `SMTP_FROM_NAME`
- **Description**: Default sender name
- **Type**: String
- **Required**: No
- **Example**: `SMTP_FROM_NAME=WhatsApp CRM`

### `SENDGRID_API_KEY`
- **Description**: SendGrid API key (alternative to SMTP)
- **Type**: String
- **Required**: No
- **Example**: `SENDGRID_API_KEY=SG.xxxxxxxxxxxxx`

---

## File Storage

### AWS S3

#### `AWS_ACCESS_KEY_ID`
- **Description**: AWS access key ID
- **Type**: String
- **Required**: Yes (if using S3)
- **Example**: `AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE`

#### `AWS_SECRET_ACCESS_KEY`
- **Description**: AWS secret access key
- **Type**: String
- **Required**: Yes (if using S3)
- **Example**: `AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`
- **Security**: Never commit to version control

#### `AWS_REGION`
- **Description**: AWS region for S3 bucket
- **Type**: String
- **Required**: Yes (if using S3)
- **Example**: `AWS_REGION=us-east-1`

#### `AWS_S3_BUCKET`
- **Description**: S3 bucket name for file storage
- **Type**: String
- **Required**: Yes (if using S3)
- **Example**: `AWS_S3_BUCKET=whatsapp-crm-files`

### Cloudinary (Alternative)

#### `CLOUDINARY_CLOUD_NAME`
- **Description**: Cloudinary cloud name
- **Type**: String
- **Required**: No
- **Example**: `CLOUDINARY_CLOUD_NAME=your-cloud-name`

#### `CLOUDINARY_API_KEY`
- **Description**: Cloudinary API key
- **Type**: String
- **Required**: No
- **Example**: `CLOUDINARY_API_KEY=123456789012345`

#### `CLOUDINARY_API_SECRET`
- **Description**: Cloudinary API secret
- **Type**: String
- **Required**: No
- **Example**: `CLOUDINARY_API_SECRET=your-api-secret`

---

## Error Tracking

### `SENTRY_DSN`
- **Description**: Sentry Data Source Name for error tracking
- **Type**: String (URL)
- **Required**: No (recommended for production)
- **Example**: `SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0`

### `SENTRY_ENVIRONMENT`
- **Description**: Environment name for Sentry
- **Type**: String
- **Values**: `development`, `staging`, `production`
- **Required**: No
- **Example**: `SENTRY_ENVIRONMENT=production`

### `SENTRY_TRACES_SAMPLE_RATE`
- **Description**: Percentage of transactions to trace (0.0 to 1.0)
- **Type**: Number
- **Default**: `0.1`
- **Required**: No
- **Example**: `SENTRY_TRACES_SAMPLE_RATE=0.1`

---

## Rate Limiting

### `RATE_LIMIT_WINDOW_MS`
- **Description**: Time window for rate limiting (milliseconds)
- **Type**: Number
- **Default**: `900000` (15 minutes)
- **Required**: No
- **Example**: `RATE_LIMIT_WINDOW_MS=900000`

### `RATE_LIMIT_MAX_REQUESTS`
- **Description**: Maximum requests per window
- **Type**: Number
- **Default**: `100`
- **Required**: No
- **Example**: `RATE_LIMIT_MAX_REQUESTS=100`

---

## WhatsApp Integration

### `WHATSAPP_SESSION_PATH`
- **Description**: Directory path for WhatsApp session storage
- **Type**: String (path)
- **Default**: `./sessions`
- **Required**: No
- **Example**: `WHATSAPP_SESSION_PATH=./sessions`

### Meta Cloud API

#### `META_APP_ID`
- **Description**: Meta (Facebook) App ID for Cloud API
- **Type**: String
- **Required**: No (if using Cloud API)
- **Example**: `META_APP_ID=123456789012345`

#### `META_APP_SECRET`
- **Description**: Meta (Facebook) App Secret
- **Type**: String
- **Required**: No (if using Cloud API)
- **Example**: `META_APP_SECRET=your-app-secret`
- **Security**: Never commit to version control

#### `META_WEBHOOK_VERIFY_TOKEN`
- **Description**: Token for webhook verification
- **Type**: String
- **Required**: No (if using Cloud API)
- **Example**: `META_WEBHOOK_VERIFY_TOKEN=your-verify-token`

#### `META_REDIRECT_URI`
- **Description**: OAuth redirect URI for Meta authentication
- **Type**: String (URL)
- **Required**: No (if using Cloud API)
- **Example**: `META_REDIRECT_URI=https://app.whatsapp-crm.com/api/v1/whatsapp/cloud-api/callback`

---

## AI Providers

### `OPENAI_API_KEY`
- **Description**: OpenAI API key
- **Type**: String
- **Required**: No
- **Example**: `OPENAI_API_KEY=sk-xxxxxxxxxxxxx`

### `ANTHROPIC_API_KEY`
- **Description**: Anthropic (Claude) API key
- **Type**: String
- **Required**: No
- **Example**: `ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx`

### `GOOGLE_AI_API_KEY`
- **Description**: Google AI (Gemini) API key
- **Type**: String
- **Required**: No
- **Example**: `GOOGLE_AI_API_KEY=AIzaSyxxxxxxxxxxxxx`

### `COHERE_API_KEY`
- **Description**: Cohere API key
- **Type**: String
- **Required**: No
- **Example**: `COHERE_API_KEY=xxxxxxxxxxxxx`

### `OLLAMA_BASE_URL`
- **Description**: Ollama server base URL (for self-hosted models)
- **Type**: String (URL)
- **Default**: `http://localhost:11434`
- **Required**: No
- **Example**: `OLLAMA_BASE_URL=http://localhost:11434`

---

## E-commerce Integration

### Shopify

#### `SHOPIFY_API_KEY`
- **Description**: Shopify API key
- **Type**: String
- **Required**: No (if using Shopify)
- **Example**: `SHOPIFY_API_KEY=your-api-key`

#### `SHOPIFY_API_SECRET`
- **Description**: Shopify API secret
- **Type**: String
- **Required**: No (if using Shopify)
- **Example**: `SHOPIFY_API_SECRET=your-api-secret`

---

## Payment Gateways

### Stripe

#### `STRIPE_SECRET_KEY`
- **Description**: Stripe secret key
- **Type**: String
- **Required**: No (if using Stripe)
- **Example**: `STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx`

#### `STRIPE_WEBHOOK_SECRET`
- **Description**: Stripe webhook signing secret
- **Type**: String
- **Required**: No (if using Stripe webhooks)
- **Example**: `STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx`

### Razorpay

#### `RAZORPAY_KEY_ID`
- **Description**: Razorpay key ID
- **Type**: String
- **Required**: No (if using Razorpay)
- **Example**: `RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx`

#### `RAZORPAY_KEY_SECRET`
- **Description**: Razorpay key secret
- **Type**: String
- **Required**: No (if using Razorpay)
- **Example**: `RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx`

---

## Logging

### `LOG_LEVEL`
- **Description**: Logging level
- **Type**: String
- **Values**: `error`, `warn`, `info`, `debug`
- **Default**: `info`
- **Required**: No
- **Example**: `LOG_LEVEL=info`
- **Recommendations**:
  - Development: `debug`
  - Staging: `info`
  - Production: `warn`

### `LOG_FILE_PATH`
- **Description**: Directory path for log files
- **Type**: String (path)
- **Default**: `./logs`
- **Required**: No
- **Example**: `LOG_FILE_PATH=./logs`

---

## Monitoring

### `PROMETHEUS_ENABLED`
- **Description**: Enable Prometheus metrics
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Example**: `PROMETHEUS_ENABLED=true`

### `GRAFANA_ENABLED`
- **Description**: Enable Grafana integration
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Example**: `GRAFANA_ENABLED=true`

---

## Backup

### `BACKUP_ENABLED`
- **Description**: Enable automated backups
- **Type**: Boolean
- **Default**: `false`
- **Required**: No
- **Example**: `BACKUP_ENABLED=true`

### `BACKUP_S3_BUCKET`
- **Description**: S3 bucket for backup storage
- **Type**: String
- **Required**: No (if backups enabled)
- **Example**: `BACKUP_S3_BUCKET=whatsapp-crm-backups`

### `BACKUP_RETENTION_DAYS`
- **Description**: Number of days to retain backups
- **Type**: Number
- **Default**: `90`
- **Required**: No
- **Example**: `BACKUP_RETENTION_DAYS=90`

---

## Bull Queue Dashboard

### `BULL_BOARD_USERNAME`
- **Description**: Username for Bull Board dashboard
- **Type**: String
- **Default**: `admin`
- **Required**: No
- **Example**: `BULL_BOARD_USERNAME=admin`

### `BULL_BOARD_PASSWORD`
- **Description**: Password for Bull Board dashboard
- **Type**: String
- **Required**: Yes (if using Bull Board)
- **Example**: `BULL_BOARD_PASSWORD=strong-password`
- **Security**: Use strong password in production

---

## Environment-Specific Recommendations

### Development
- Use `.env.dev` file
- Set `LOG_LEVEL=debug`
- Use local database and Redis
- Use Mailtrap or similar for email testing
- Disable Sentry or use development DSN

### Staging
- Use `.env.staging` file
- Set `LOG_LEVEL=info`
- Use managed database and Redis services
- Use real SMTP service
- Enable Sentry with staging environment

### Production
- Use `.env.prod` file or secrets manager
- Set `LOG_LEVEL=warn`
- Use managed, highly available services
- Enable all monitoring and error tracking
- Use strong, rotated secrets
- Enable SSL/TLS for all connections
- Use secrets management system (AWS Secrets Manager, HashiCorp Vault)

---

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong, random secrets** for JWT and encryption keys
3. **Rotate secrets periodically** in production
4. **Use secrets management systems** in production (AWS Secrets Manager, HashiCorp Vault)
5. **Restrict database and Redis access** to application servers only
6. **Use SSL/TLS** for all external connections
7. **Enable audit logging** for sensitive operations
8. **Use different secrets** for each environment
9. **Limit access** to environment variables to authorized personnel only
10. **Monitor for exposed secrets** using tools like GitGuardian

---

## Validation

The application validates required environment variables on startup. If any required variable is missing, the application will fail to start with a clear error message.

To validate your environment configuration:

```bash
npm run start
```

If validation fails, check the error message for missing or invalid variables.

---

## Loading Environment Variables

The application loads environment variables in the following order:

1. System environment variables
2. `.env` file (if exists)
3. Environment-specific file (`.env.dev`, `.env.staging`, `.env.prod`)

To use a specific environment file:

```bash
# Development
cp .env.dev .env
npm run dev

# Staging
cp .env.staging .env
npm start

# Production
cp .env.prod .env
npm start
```

---

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` format
- Check database server is running
- Verify credentials and permissions
- Check network connectivity

### Redis Connection Issues
- Verify `REDIS_HOST` and `REDIS_PORT`
- Check Redis server is running
- Verify `REDIS_PASSWORD` if authentication is enabled

### Email Sending Issues
- Verify SMTP credentials
- Check SMTP server allows connections from your IP
- Test with a tool like Mailtrap in development

### File Upload Issues
- Verify AWS credentials and permissions
- Check S3 bucket exists and is accessible
- Verify bucket CORS configuration

---

For more information, see the main [README.md](../README.md) and [SETUP.md](./SETUP.md) documentation.

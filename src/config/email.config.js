/**
 * Email Configuration Module
 * Handles email service configuration (SMTP, SendGrid, AWS SES)
 */

const emailConfig = {
  // Service selection
  service: process.env.EMAIL_SERVICE || 'smtp', // smtp, sendgrid, ses

  // From address
  from: process.env.EMAIL_FROM || 'noreply@whatsappcrm.com',
  fromName: process.env.EMAIL_FROM_NAME || 'WhatsApp CRM',
  replyTo: process.env.EMAIL_REPLY_TO,

  // SMTP Configuration
  smtp: {
    enabled: process.env.EMAIL_SERVICE === 'smtp' || !process.env.EMAIL_SERVICE,
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },

    // Connection settings
    pool: process.env.SMTP_POOL === 'true', // Use pooled connections
    maxConnections: parseInt(process.env.SMTP_MAX_CONNECTIONS, 10) || 5,
    maxMessages: parseInt(process.env.SMTP_MAX_MESSAGES, 10) || 100,
    rateDelta: parseInt(process.env.SMTP_RATE_DELTA, 10) || 1000, // 1 second
    rateLimit: parseInt(process.env.SMTP_RATE_LIMIT, 10) || 5, // 5 emails per rateDelta

    // TLS options
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false',
      minVersion: process.env.SMTP_TLS_MIN_VERSION || 'TLSv1.2',
    },

    // Timeout settings
    connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT, 10) || 10000, // 10 seconds
    greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT, 10) || 10000, // 10 seconds
    socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT, 10) || 60000, // 60 seconds

    // Debug
    debug: process.env.SMTP_DEBUG === 'true',
    logger: process.env.SMTP_LOGGER === 'true',
  },

  // SendGrid Configuration
  sendgrid: {
    enabled: process.env.EMAIL_SERVICE === 'sendgrid',
    apiKey: process.env.SENDGRID_API_KEY,

    // Tracking settings
    tracking: {
      clickTracking: process.env.SENDGRID_CLICK_TRACKING !== 'false',
      openTracking: process.env.SENDGRID_OPEN_TRACKING !== 'false',
      subscriptionTracking: process.env.SENDGRID_SUBSCRIPTION_TRACKING === 'true',
    },

    // Categories for analytics
    categories: process.env.SENDGRID_CATEGORIES
      ? process.env.SENDGRID_CATEGORIES.split(',').map((c) => c.trim())
      : ['whatsapp-crm'],

    // IP Pool
    ipPoolName: process.env.SENDGRID_IP_POOL_NAME,

    // Sandbox mode (for testing)
    sandboxMode: process.env.SENDGRID_SANDBOX_MODE === 'true',
  },

  // AWS SES Configuration (imported from aws.config.js)
  ses: {
    enabled: process.env.EMAIL_SERVICE === 'ses',
    // Configuration is in aws.config.js
  },

  // Email templates
  templates: {
    path: process.env.EMAIL_TEMPLATES_PATH || './src/templates/emails',
    engine: process.env.EMAIL_TEMPLATE_ENGINE || 'handlebars', // handlebars, ejs, pug
    cache: process.env.EMAIL_TEMPLATE_CACHE !== 'false', // Default true
  },

  // Queue settings for async email sending
  queue: {
    enabled: process.env.EMAIL_QUEUE_ENABLED !== 'false', // Default true
    priority: {
      high: 1,
      normal: 5,
      low: 10,
    },
    attempts: parseInt(process.env.EMAIL_QUEUE_ATTEMPTS, 10) || 3,
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.EMAIL_QUEUE_BACKOFF_DELAY, 10) || 5000, // 5 seconds
    },
  },

  // Rate limiting
  rateLimit: {
    enabled: process.env.EMAIL_RATE_LIMIT_ENABLED !== 'false', // Default true
    maxPerHour: parseInt(process.env.EMAIL_RATE_LIMIT_MAX_PER_HOUR, 10) || 1000,
    maxPerDay: parseInt(process.env.EMAIL_RATE_LIMIT_MAX_PER_DAY, 10) || 10000,
  },

  // Bounce and complaint handling
  bounceHandling: {
    enabled: process.env.EMAIL_BOUNCE_HANDLING_ENABLED === 'true',
    maxBounces: parseInt(process.env.EMAIL_MAX_BOUNCES, 10) || 3,
    suppressAfterBounces: process.env.EMAIL_SUPPRESS_AFTER_BOUNCES !== 'false',
  },

  // Email verification
  verification: {
    enabled: process.env.EMAIL_VERIFICATION_ENABLED !== 'false', // Default true
    tokenExpiry: parseInt(process.env.EMAIL_VERIFICATION_TOKEN_EXPIRY, 10) || 86400, // 24 hours
    resendDelay: parseInt(process.env.EMAIL_VERIFICATION_RESEND_DELAY, 10) || 60, // 60 seconds
  },

  // Email types configuration
  types: {
    transactional: {
      enabled: true,
      priority: 'high',
    },
    marketing: {
      enabled: process.env.EMAIL_MARKETING_ENABLED !== 'false',
      priority: 'normal',
      unsubscribeLink: process.env.EMAIL_MARKETING_UNSUBSCRIBE_LINK !== 'false',
    },
    notification: {
      enabled: true,
      priority: 'normal',
    },
  },

  // Default email options
  defaults: {
    charset: 'UTF-8',
    encoding: 'base64',
    textEncoding: 'quoted-printable',

    // Headers
    headers: {
      'X-Mailer': 'WhatsApp CRM',
      'X-Priority': '3',
    },
  },

  // Attachments
  attachments: {
    maxSize: parseInt(process.env.EMAIL_ATTACHMENT_MAX_SIZE, 10) || 10485760, // 10MB
    allowedTypes: process.env.EMAIL_ATTACHMENT_ALLOWED_TYPES
      ? process.env.EMAIL_ATTACHMENT_ALLOWED_TYPES.split(',').map((t) => t.trim())
      : ['application/pdf', 'image/jpeg', 'image/png', 'application/msword'],
  },

  // Testing
  testing: {
    enabled: process.env.EMAIL_TESTING_ENABLED === 'true',
    testEmail: process.env.EMAIL_TEST_ADDRESS,
    interceptAll: process.env.EMAIL_INTERCEPT_ALL === 'true', // Send all emails to test address
  },

  // Logging
  logging: {
    enabled: process.env.EMAIL_LOGGING_ENABLED !== 'false', // Default true
    logLevel: process.env.EMAIL_LOG_LEVEL || 'info',
    logSentEmails: process.env.EMAIL_LOG_SENT === 'true',
    logFailedEmails: process.env.EMAIL_LOG_FAILED !== 'false', // Default true
  },
};

export default emailConfig;

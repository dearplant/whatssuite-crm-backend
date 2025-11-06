import dotenv from 'dotenv';
import databaseConfig from './database.config.js';
import redisConfig from './redis.config.js';
import awsConfig from './aws.config.js';
import emailConfig from './email.config.js';

// Load environment variables
dotenv.config();

/**
 * Environment-specific configuration
 */
const environments = {
  development: {
    logging: {
      level: 'debug',
      enableConsole: true,
      enableFile: true,
    },
    security: {
      strictValidation: false,
      requireHttps: false,
    },
  },
  staging: {
    logging: {
      level: 'info',
      enableConsole: true,
      enableFile: true,
    },
    security: {
      strictValidation: true,
      requireHttps: true,
    },
  },
  production: {
    logging: {
      level: 'warn',
      enableConsole: false,
      enableFile: true,
    },
    security: {
      strictValidation: true,
      requireHttps: true,
    },
  },
};

const currentEnv = process.env.NODE_ENV || 'development';
const envConfig = environments[currentEnv] || environments.development;

/**
 * Main configuration object
 */
const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'WhatsApp CRM Backend',
    env: currentEnv,
    port: parseInt(process.env.PORT, 10) || 5000,
    apiVersion: process.env.API_VERSION || 'v1',
    url: process.env.APP_URL || 'http://localhost:5000',
    isDevelopment: currentEnv === 'development',
    isStaging: currentEnv === 'staging',
    isProduction: currentEnv === 'production',
  },

  // Import modular configurations
  database: databaseConfig,
  redis: redisConfig,
  aws: awsConfig,
  email: emailConfig,

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '7d',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '30d',
    algorithm: 'HS256',
    issuer: process.env.APP_NAME || 'WhatsApp CRM Backend',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: 'aes-256-gcm',
  },
  
  // Shorthand for encryption key (for backward compatibility)
  encryptionKey: process.env.ENCRYPTION_KEY,

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    enabled: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
  },

  // Sentry
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || currentEnv,
    enabled: !!process.env.SENTRY_DSN && currentEnv !== 'development',
    tracesSampleRate: currentEnv === 'production' ? 0.1 : 1.0,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 5,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  },

  // WhatsApp
  whatsapp: {
    sessionPath: process.env.WHATSAPP_SESSION_PATH || './sessions',
    maxConnections: parseInt(process.env.WHATSAPP_MAX_CONNECTIONS, 10) || 10,
    messageRateLimit: parseInt(process.env.WHATSAPP_MESSAGE_RATE_LIMIT, 10) || 20,
    qrCodeTimeout: 120000, // 2 minutes
    reconnectAttempts: 5,
    reconnectDelay: 5000, // 5 seconds
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || ['http://localhost:3000'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: 86400, // 24 hours
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || envConfig.logging.level,
    filePath: process.env.LOG_FILE_PATH || './logs',
    enableConsole: envConfig.logging.enableConsole,
    enableFile: envConfig.logging.enableFile,
    maxFiles: 30, // Keep logs for 30 days
    maxSize: '20m', // Max log file size
  },

  // Queue
  queue: {
    bullBoard: {
      username: process.env.BULL_BOARD_USERNAME || 'admin',
      password: process.env.BULL_BOARD_PASSWORD || 'admin123',
      path: '/admin/queues',
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },

  // Feature Flags
  features: {
    aiChatbot: process.env.ENABLE_AI_CHATBOT !== 'false', // Default true
    voiceTranscription: process.env.ENABLE_VOICE_TRANSCRIPTION !== 'false',
    ecommerceIntegration: process.env.ENABLE_ECOMMERCE_INTEGRATION !== 'false',
    paymentProcessing: process.env.ENABLE_PAYMENT_PROCESSING !== 'false',
    webhooks: process.env.ENABLE_WEBHOOKS !== 'false',
    analytics: process.env.ENABLE_ANALYTICS !== 'false',
    teamManagement: process.env.ENABLE_TEAM_MANAGEMENT !== 'false',
    multiLanguage: process.env.ENABLE_MULTI_LANGUAGE !== 'false',
  },

  // Multi-language
  i18n: {
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'en',
    supportedLanguages: process.env.SUPPORTED_LANGUAGES?.split(',').map((l) => l.trim()) || ['en'],
    fallbackLanguage: 'en',
  },

  // Socket.io
  socketio: {
    corsOrigin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:3000',
    maxConnections: parseInt(process.env.SOCKET_IO_MAX_CONNECTIONS, 10) || 100000,
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  },

  // Performance
  performance: {
    cacheTTL: parseInt(process.env.CACHE_TTL_SECONDS, 10) || 300,
    queryTimeout: parseInt(process.env.QUERY_TIMEOUT_MS, 10) || 30000,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 30000,
    maxRequestSize: process.env.MAX_REQUEST_SIZE || '10mb',
    compressionThreshold: 1024, // Compress responses > 1KB
  },

  // Security
  security: {
    strictValidation: envConfig.security.strictValidation,
    requireHttps: envConfig.security.requireHttps,
    bcryptRounds: 12,
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
    sessionTimeout: 86400000, // 24 hours
  },

  // Backup
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS, 10) || 30,
  },

  // AI Providers
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      enabled: !!process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      enabled: !!process.env.ANTHROPIC_API_KEY,
    },
    google: {
      apiKey: process.env.GOOGLE_AI_API_KEY,
      enabled: !!process.env.GOOGLE_AI_API_KEY,
    },
    cohere: {
      apiKey: process.env.COHERE_API_KEY,
      enabled: !!process.env.COHERE_API_KEY,
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      enabled: !!process.env.OLLAMA_BASE_URL,
    },
  },

  // E-commerce
  ecommerce: {
    shopify: {
      apiKey: process.env.SHOPIFY_API_KEY,
      apiSecret: process.env.SHOPIFY_API_SECRET,
      scopes:
        process.env.SHOPIFY_SCOPES || 'read_orders,write_orders,read_customers,write_customers',
      enabled: !!(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
    },
    woocommerce: {
      consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
      consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET,
      enabled: !!(process.env.WOOCOMMERCE_CONSUMER_KEY && process.env.WOOCOMMERCE_CONSUMER_SECRET),
    },
  },

  // Payment Gateways
  payments: {
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      enabled: !!process.env.STRIPE_SECRET_KEY,
    },
    paypal: {
      clientId: process.env.PAYPAL_CLIENT_ID,
      clientSecret: process.env.PAYPAL_CLIENT_SECRET,
      mode: process.env.PAYPAL_MODE || 'sandbox',
      enabled: !!(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    },
    razorpay: {
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
      enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    },
  },
};

/**
 * Validation rules for configuration
 */
const validationRules = {
  required: [
    { path: 'database.url', message: 'DATABASE_URL is required' },
    { path: 'jwt.secret', message: 'JWT_SECRET is required' },
    { path: 'encryption.key', message: 'ENCRYPTION_KEY is required' },
  ],
  conditional: [
    {
      condition: () => config.app.isProduction,
      rules: [
        { path: 'sentry.dsn', message: 'SENTRY_DSN is required in production' },
        { path: 'email.smtp.host', message: 'Email configuration is required in production' },
      ],
    },
    {
      condition: () => config.features.aiChatbot,
      rules: [
        {
          validate: () => {
            const hasAnyProvider =
              config.ai.openai.enabled ||
              config.ai.anthropic.enabled ||
              config.ai.google.enabled ||
              config.ai.cohere.enabled ||
              config.ai.ollama.enabled;
            return hasAnyProvider;
          },
          message: 'At least one AI provider must be configured when AI chatbot is enabled',
        },
      ],
    },
  ],
  format: [
    {
      path: 'encryption.key',
      validate: (value) => value && value.length >= 32,
      message: 'ENCRYPTION_KEY must be at least 32 characters long',
    },
    {
      path: 'jwt.secret',
      validate: (value) => value && value.length >= 32,
      message: 'JWT_SECRET must be at least 32 characters long',
    },
    {
      path: 'database.url',
      validate: (value) => value && value.startsWith('postgresql://'),
      message: 'DATABASE_URL must be a valid PostgreSQL connection string',
    },
  ],
};

/**
 * Get nested configuration value
 */
function getConfigValue(obj, path) {
  const keys = path.split('.');
  let value = obj;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) break;
  }
  return value;
}

/**
 * Validate configuration
 */
function validateConfig() {
  const errors = [];

  // Check required fields
  for (const rule of validationRules.required) {
    const value = getConfigValue(config, rule.path);
    if (!value) {
      errors.push(rule.message);
    }
  }

  // Check conditional requirements
  for (const conditionalRule of validationRules.conditional) {
    if (conditionalRule.condition()) {
      for (const rule of conditionalRule.rules) {
        if (rule.validate) {
          if (!rule.validate()) {
            errors.push(rule.message);
          }
        } else if (rule.path) {
          const value = getConfigValue(config, rule.path);
          if (!value) {
            errors.push(rule.message);
          }
        }
      }
    }
  }

  // Check format validations
  for (const rule of validationRules.format) {
    const value = getConfigValue(config, rule.path);
    if (value && !rule.validate(value)) {
      errors.push(rule.message);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join('\n')}`
    );
  }
}

/**
 * Initialize and validate configuration
 */
function initializeConfig() {
  try {
    // Validate configuration
    validateConfig();

    // Log configuration summary (without sensitive data)
    console.log('✅ Configuration loaded successfully');
    console.log(`   Environment: ${config.app.env}`);
    console.log(`   Port: ${config.app.port}`);
    console.log(`   Database: ${config.database.url.split('@')[1] || 'configured'}`);
    console.log(`   Redis: ${config.redis.host}:${config.redis.port}`);
    console.log(
      `   Features: ${Object.entries(config.features)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(', ')}`
    );

    return config;
  } catch (error) {
    console.error('❌ Configuration validation failed:', error.message);
    if (config.app.isProduction) {
      process.exit(1);
    }
    throw error;
  }
}

// Initialize configuration on module load
if (config.app.isProduction || config.app.isStaging) {
  initializeConfig();
}

export { validateConfig, initializeConfig };
export default config;

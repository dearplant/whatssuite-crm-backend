/**
 * AWS Configuration Module
 * Handles AWS services configuration (S3, SES, etc.)
 */

const awsConfig = {
  // Credentials
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',

  // Service availability
  enabled: !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY),

  // S3 Configuration
  s3: {
    bucket: process.env.AWS_S3_BUCKET,
    region: process.env.AWS_S3_REGION || process.env.AWS_REGION || 'us-east-1',

    // Upload settings
    maxFileSize: parseInt(process.env.AWS_S3_MAX_FILE_SIZE, 10) || 10485760, // 10MB
    allowedMimeTypes: process.env.AWS_S3_ALLOWED_MIME_TYPES
      ? process.env.AWS_S3_ALLOWED_MIME_TYPES.split(',').map((t) => t.trim())
      : [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'video/mp4',
          'video/mpeg',
          'audio/mpeg',
          'audio/ogg',
          'audio/wav',
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],

    // Storage settings
    storageClass: process.env.AWS_S3_STORAGE_CLASS || 'STANDARD',
    acl: process.env.AWS_S3_ACL || 'private',

    // Folder structure
    folders: {
      messages: process.env.AWS_S3_FOLDER_MESSAGES || 'messages',
      campaigns: process.env.AWS_S3_FOLDER_CAMPAIGNS || 'campaigns',
      profiles: process.env.AWS_S3_FOLDER_PROFILES || 'profiles',
      documents: process.env.AWS_S3_FOLDER_DOCUMENTS || 'documents',
      backups: process.env.AWS_S3_FOLDER_BACKUPS || 'backups',
      exports: process.env.AWS_S3_FOLDER_EXPORTS || 'exports',
    },

    // URL settings
    urlExpiration: parseInt(process.env.AWS_S3_URL_EXPIRATION, 10) || 3600, // 1 hour
    useAccelerateEndpoint: process.env.AWS_S3_USE_ACCELERATE === 'true',

    // CloudFront CDN
    cloudFront: {
      enabled: process.env.AWS_CLOUDFRONT_ENABLED === 'true',
      domain: process.env.AWS_CLOUDFRONT_DOMAIN,
      keyPairId: process.env.AWS_CLOUDFRONT_KEY_PAIR_ID,
      privateKey: process.env.AWS_CLOUDFRONT_PRIVATE_KEY,
    },

    // Lifecycle policies
    lifecycle: {
      enabled: process.env.AWS_S3_LIFECYCLE_ENABLED === 'true',
      transitionToIA: parseInt(process.env.AWS_S3_TRANSITION_TO_IA_DAYS, 10) || 30, // 30 days
      transitionToGlacier: parseInt(process.env.AWS_S3_TRANSITION_TO_GLACIER_DAYS, 10) || 90, // 90 days
      expiration: parseInt(process.env.AWS_S3_EXPIRATION_DAYS, 10) || 365, // 1 year
    },
  },

  // SES (Simple Email Service) Configuration
  ses: {
    enabled: process.env.AWS_SES_ENABLED === 'true',
    region: process.env.AWS_SES_REGION || process.env.AWS_REGION || 'us-east-1',
    fromEmail: process.env.AWS_SES_FROM_EMAIL,
    fromName: process.env.AWS_SES_FROM_NAME,
    replyToEmail: process.env.AWS_SES_REPLY_TO_EMAIL,

    // Configuration set for tracking
    configurationSet: process.env.AWS_SES_CONFIGURATION_SET,

    // Rate limiting
    maxSendRate: parseInt(process.env.AWS_SES_MAX_SEND_RATE, 10) || 14, // emails per second
    maxDailyQuota: parseInt(process.env.AWS_SES_MAX_DAILY_QUOTA, 10) || 50000,
  },

  // SNS (Simple Notification Service) Configuration
  sns: {
    enabled: process.env.AWS_SNS_ENABLED === 'true',
    region: process.env.AWS_SNS_REGION || process.env.AWS_REGION || 'us-east-1',
    topicArn: process.env.AWS_SNS_TOPIC_ARN,
  },

  // SQS (Simple Queue Service) Configuration
  sqs: {
    enabled: process.env.AWS_SQS_ENABLED === 'true',
    region: process.env.AWS_SQS_REGION || process.env.AWS_REGION || 'us-east-1',
    queueUrl: process.env.AWS_SQS_QUEUE_URL,
    visibilityTimeout: parseInt(process.env.AWS_SQS_VISIBILITY_TIMEOUT, 10) || 30, // seconds
    maxMessages: parseInt(process.env.AWS_SQS_MAX_MESSAGES, 10) || 10,
    waitTimeSeconds: parseInt(process.env.AWS_SQS_WAIT_TIME, 10) || 20,
  },

  // Lambda Configuration
  lambda: {
    enabled: process.env.AWS_LAMBDA_ENABLED === 'true',
    region: process.env.AWS_LAMBDA_REGION || process.env.AWS_REGION || 'us-east-1',
    functionName: process.env.AWS_LAMBDA_FUNCTION_NAME,
    timeout: parseInt(process.env.AWS_LAMBDA_TIMEOUT, 10) || 30, // seconds
  },

  // CloudWatch Configuration
  cloudWatch: {
    enabled: process.env.AWS_CLOUDWATCH_ENABLED === 'true',
    region: process.env.AWS_CLOUDWATCH_REGION || process.env.AWS_REGION || 'us-east-1',
    logGroup: process.env.AWS_CLOUDWATCH_LOG_GROUP || '/aws/whatsapp-crm',
    logStream: process.env.AWS_CLOUDWATCH_LOG_STREAM,
    retentionDays: parseInt(process.env.AWS_CLOUDWATCH_RETENTION_DAYS, 10) || 30,
  },

  // SDK Configuration
  sdk: {
    maxRetries: parseInt(process.env.AWS_SDK_MAX_RETRIES, 10) || 3,
    timeout: parseInt(process.env.AWS_SDK_TIMEOUT, 10) || 120000, // 2 minutes
    httpOptions: {
      connectTimeout: parseInt(process.env.AWS_SDK_CONNECT_TIMEOUT, 10) || 5000, // 5 seconds
    },
  },
};

export default awsConfig;

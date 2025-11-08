import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import { logger } from './utils/logger.js';
import { initializeBullBoard, bullBoardAuth } from './config/bullBoard.js';
import { checkQueueInfrastructureHealth } from './utils/queueHealth.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { handleMulterError } from './middleware/upload.js';

const app = express();

// Trust proxy - important for rate limiting and getting real IP behind load balancers
app.set('trust proxy', 1);

// Security middleware - Helmet sets various HTTP headers for security
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration - Allow cross-origin requests from frontend
const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: process.env.CORS_CREDENTIALS === 'true' || true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400, // 24 hours
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Parse URL-encoded bodies
// Note: Multipart form data is handled by multer middleware in specific routes

// Compression middleware - Compress response bodies
app.use(compression());

// Request logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Concise output for development
} else {
  // Combined Apache-style logs for production, piped to Winston
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
      skip: (req, res) => res.statusCode < 400, // Only log errors in production
    })
  );
}

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const queueHealth = await checkQueueInfrastructureHealth();
    const isHealthy = queueHealth.status !== 'unhealthy';

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      redis: queueHealth.redis,
      queues: queueHealth.status,
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Bull Board - Queue monitoring dashboard
const serverAdapter = initializeBullBoard();
app.use('/admin/queues', bullBoardAuth, serverAdapter.getRouter());

// Swagger API Documentation
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'WhatsApp CRM API Docs',
  })
);

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// ============================================
// API Routes - Version 1
// ============================================
import queueRoutes from './routes/queueRoutes.js';
import authRoutes from './routes/authRoutes.js';
import whatsappRoutes from './routes/whatsappRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import flowRoutes from './routes/flowRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import cronRoutes from './routes/cronRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import ecommerceRoutes from './routes/ecommerceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

// API root endpoint
app.get('/api/v1', (req, res) => {
  res.json({
    success: true,
    message: 'WhatsApp CRM API v1',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      queues: '/api/v1/queues',
      auth: '/api/v1/auth',
      contacts: '/api/v1/contacts',
      messages: '/api/v1/messages',
      campaigns: '/api/v1/campaigns',
      flows: '/api/v1/flows',
      ai: '/api/v1/ai',
      ecommerce: '/api/v1/ecommerce',
      payments: '/api/v1/payments',
      analytics: '/api/v1/analytics',
      team: '/api/v1/team',
      webhooks: '/api/v1/webhooks',
    },
  });
});

// Mount API v1 routes
app.use('/api/v1/queues', queueRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/whatsapp', whatsappRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/contacts', contactRoutes);
app.use('/api/v1/campaigns', campaignRoutes);
app.use('/api/v1/flows', flowRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/cron', cronRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ecommerce', ecommerceRoutes);
app.use('/api/v1/payments', paymentRoutes);
// Additional routes will be added here as they are implemented:
// app.use('/api/v1/team', teamRoutes);
// app.use('/api/v1/webhooks', webhookRoutes);

// ============================================
// Error Handling
// ============================================

// Handle multer errors (file upload errors)
app.use(handleMulterError);

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Global error handler - must be last
app.use(errorHandler);

export default app;

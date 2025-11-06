import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import config from './index.js';
import logger from '../utils/logger.js';
import {
  messageQueue,
  campaignQueue,
  flowQueue,
  emailQueue,
  webhookQueue,
  aiQueue,
  importQueue,
  exportQueue,
  analyticsQueue,
  notificationQueue,
} from '../queues/index.js';

/**
 * Initialize Bull Board for queue monitoring
 */
const initializeBullBoard = () => {
  try {
    // Create Express adapter for Bull Board
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    // Create Bull Board with all queues
    createBullBoard({
      queues: [
        new BullAdapter(messageQueue),
        new BullAdapter(campaignQueue),
        new BullAdapter(flowQueue),
        new BullAdapter(emailQueue),
        new BullAdapter(webhookQueue),
        new BullAdapter(aiQueue),
        new BullAdapter(importQueue),
        new BullAdapter(exportQueue),
        new BullAdapter(analyticsQueue),
        new BullAdapter(notificationQueue),
      ],
      serverAdapter,
    });

    logger.info('Bull Board initialized successfully');
    return serverAdapter;
  } catch (error) {
    logger.error('Failed to initialize Bull Board', { error: error.message });
    throw error;
  }
};

/**
 * Basic authentication middleware for Bull Board
 */
const bullBoardAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
  }

  const auth = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
  const username = auth[0];
  const password = auth[1];

  if (
    username === config.queue.bullBoard.username &&
    password === config.queue.bullBoard.password
  ) {
    return next();
  }

  res.setHeader('WWW-Authenticate', 'Basic realm="Bull Board"');
  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Invalid credentials',
  });
};

export { initializeBullBoard, bullBoardAuth };
export default { initializeBullBoard, bullBoardAuth };

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
import Bull from 'bull';

const app = express();
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

// Redis configuration
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },
};

// Create queue instances
const messageQueue = new Bull('message-queue', redisConfig);
const campaignQueue = new Bull('campaign-queue', redisConfig);
const flowQueue = new Bull('flow-queue', redisConfig);
const contactImportQueue = new Bull('contact-import-queue', redisConfig);
const emailQueue = new Bull('email-queue', redisConfig);
const chatbotQueue = new Bull('chatbot-queue', redisConfig);
const transcriptionQueue = new Bull('transcription-queue', redisConfig);

// Create Bull Board
createBullBoard({
  queues: [
    new BullAdapter(messageQueue),
    new BullAdapter(campaignQueue),
    new BullAdapter(flowQueue),
    new BullAdapter(contactImportQueue),
    new BullAdapter(emailQueue),
    new BullAdapter(chatbotQueue),
    new BullAdapter(transcriptionQueue),
  ],
  serverAdapter,
});

app.use('/', serverAdapter.getRouter());

const PORT = process.env.BULL_BOARD_PORT || 3001;

app.listen(PORT, () => {
  console.log(`Bull Board running on http://localhost:${PORT}`);
});

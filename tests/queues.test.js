import { initializeRedis, closeRedis } from '../src/config/redis.js';
import {
  messageQueue,
  campaignQueue,
  flowQueue,
  getAllQueuesHealth,
  closeAllQueues,
} from '../src/queues/index.js';
import { checkQueueInfrastructureHealth } from '../src/utils/queueHealth.js';

describe('Queue Infrastructure', () => {
  beforeAll(async () => {
    await initializeRedis();
  });

  afterAll(async () => {
    await closeAllQueues();
    await closeRedis();
  });

  describe('Queue Creation', () => {
    it('should create message queue', () => {
      expect(messageQueue).toBeDefined();
      expect(messageQueue.name).toBe('messages');
    });

    it('should create campaign queue', () => {
      expect(campaignQueue).toBeDefined();
      expect(campaignQueue.name).toBe('campaigns');
    });

    it('should create flow queue', () => {
      expect(flowQueue).toBeDefined();
      expect(flowQueue.name).toBe('flows');
    });
  });

  describe('Queue Health', () => {
    it('should get health status for all queues', async () => {
      const health = await getAllQueuesHealth();

      expect(health).toBeDefined();
      expect(health.messages).toBeDefined();
      expect(health.campaigns).toBeDefined();
      expect(health.flows).toBeDefined();

      // Check structure
      expect(health.messages).toHaveProperty('name');
      expect(health.messages).toHaveProperty('waiting');
      expect(health.messages).toHaveProperty('active');
      expect(health.messages).toHaveProperty('completed');
      expect(health.messages).toHaveProperty('failed');
    });

    it('should check queue infrastructure health', async () => {
      const health = await checkQueueInfrastructureHealth();

      expect(health).toBeDefined();
      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('queues');
      expect(health).toHaveProperty('timestamp');

      expect(health.redis.connected).toBe(true);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
    });
  });

  describe('Queue Operations', () => {
    it('should add a job to message queue', async () => {
      const job = await messageQueue.add({
        to: '+1234567890',
        content: 'Test message',
      });

      expect(job).toBeDefined();
      expect(job.id).toBeDefined();
      expect(job.data.to).toBe('+1234567890');

      // Clean up
      await job.remove();
    });

    it('should add a delayed job', async () => {
      const job = await campaignQueue.add(
        {
          campaignId: 'test-campaign-123',
        },
        {
          delay: 5000, // 5 seconds
        }
      );

      expect(job).toBeDefined();
      expect(job.opts.delay).toBe(5000);

      // Clean up
      await job.remove();
    });

    it('should add a job with priority', async () => {
      const job = await messageQueue.add(
        {
          to: '+1234567890',
          content: 'High priority message',
        },
        {
          priority: 1, // High priority
        }
      );

      expect(job).toBeDefined();
      expect(job.opts.priority).toBe(1);

      // Clean up
      await job.remove();
    });
  });
});

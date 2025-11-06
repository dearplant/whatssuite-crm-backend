import { initializeRedis, closeRedis, isRedisConnected, redis } from '../src/config/redis.js';

describe('Redis Infrastructure', () => {
  beforeAll(async () => {
    await initializeRedis();
  });

  afterAll(async () => {
    await closeRedis();
  });

  describe('Redis Connection', () => {
    it('should connect to Redis successfully', () => {
      expect(isRedisConnected()).toBe(true);
    });

    it('should set and get a value', async () => {
      const key = 'test:key';
      const value = { message: 'Hello Redis' };

      await redis.set(key, value, 60);
      const retrieved = await redis.get(key);

      expect(retrieved).toEqual(value);

      // Cleanup
      await redis.del(key);
    });

    it('should delete a key', async () => {
      const key = 'test:delete';
      await redis.set(key, 'value', 60);

      const deleted = await redis.del(key);
      expect(deleted).toBe(true);

      const retrieved = await redis.get(key);
      expect(retrieved).toBeNull();
    });

    it('should check if key exists', async () => {
      const key = 'test:exists';
      await redis.set(key, 'value', 60);

      const exists = await redis.exists(key);
      expect(exists).toBe(true);

      await redis.del(key);
      const notExists = await redis.exists(key);
      expect(notExists).toBe(false);
    });

    it('should increment and decrement values', async () => {
      const key = 'test:counter';

      const incremented = await redis.incr(key);
      expect(incremented).toBe(1);

      const incremented2 = await redis.incr(key);
      expect(incremented2).toBe(2);

      const decremented = await redis.decr(key);
      expect(decremented).toBe(1);

      // Cleanup
      await redis.del(key);
    });

    it('should use getCached helper', async () => {
      const key = 'test:cached';
      let fetchCount = 0;

      const fetchFn = async () => {
        fetchCount++;
        return { data: 'fetched data', count: fetchCount };
      };

      // First call should fetch
      const result1 = await redis.getCached(key, fetchFn, 60);
      expect(result1.count).toBe(1);
      expect(fetchCount).toBe(1);

      // Second call should use cache
      const result2 = await redis.getCached(key, fetchFn, 60);
      expect(result2.count).toBe(1);
      expect(fetchCount).toBe(1);

      // Cleanup
      await redis.del(key);
    });
  });
});

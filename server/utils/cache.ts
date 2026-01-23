import Redis from 'ioredis';
import logger from './logger.js';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const CACHE_ENABLED = process.env.CACHE_ENABLED !== 'false';

// Cache TTL (time-to-live) in seconds
export const CACHE_TTL = {
  SHORT: 60,           // 1 minute - for frequently changing data
  MEDIUM: 300,         // 5 minutes - for moderately static data
  LONG: 3600,          // 1 hour - for static data
  EXERCISES: 86400,    // 24 hours - exercises rarely change
};

// Cache key prefixes
export const CACHE_KEYS = {
  USER: (userId: string) => `user:${userId}`,
  USER_PROFILE: (userId: string) => `user:profile:${userId}`,
  EXERCISES: (userId: string) => `exercises:${userId}`,
  EXERCISE: (exerciseId: string) => `exercise:${exerciseId}`,
  DASHBOARD: (userId: string) => `dashboard:${userId}`,
  WORKOUT: (workoutId: string) => `workout:${workoutId}`,
  WORKOUT_LIST: (userId: string) => `workouts:${userId}`,
  MUSCLE_GROUPS: (userId: string, period: string) => `muscle_groups:${userId}:${period}`,
  PERSONAL_RECORDS: (userId: string) => `personal_records:${userId}`,
};

class CacheService {
  private client: Redis | null = null;
  private connected = false;

  async connect(): Promise<void> {
    if (!CACHE_ENABLED) {
      logger.info('Cache disabled by configuration');
      return;
    }

    try {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            logger.warn('Redis connection failed, cache disabled');
            return null; // Stop retrying
          }
          return Math.min(times * 100, 3000);
        },
        lazyConnect: true,
      });

      this.client.on('error', (err) => {
        logger.error({ error: err.message }, 'Redis error');
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis connected');
        this.connected = true;
      });

      this.client.on('close', () => {
        logger.debug('Redis connection closed');
        this.connected = false;
      });

      await this.client.connect();
    } catch (error) {
      logger.warn({ error }, 'Failed to connect to Redis, cache disabled');
      this.client = null;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logger.info('Redis disconnected');
    }
  }

  isConnected(): boolean {
    return this.connected && this.client !== null;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;

    try {
      const data = await this.client!.get(key);
      if (data) {
        logger.debug({ key }, 'Cache hit');
        return JSON.parse(data) as T;
      }
      logger.debug({ key }, 'Cache miss');
      return null;
    } catch (error) {
      logger.error({ key, error }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: unknown, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.client!.setex(key, ttl, JSON.stringify(value));
      logger.debug({ key, ttl }, 'Cache set');
    } catch (error) {
      logger.error({ key, error }, 'Cache set error');
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      await this.client!.del(key);
      logger.debug({ key }, 'Cache deleted');
    } catch (error) {
      logger.error({ key, error }, 'Cache delete error');
    }
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isConnected()) return;

    try {
      const keys = await this.client!.keys(pattern);
      if (keys.length > 0) {
        await this.client!.del(...keys);
        logger.debug({ pattern, count: keys.length }, 'Cache pattern deleted');
      }
    } catch (error) {
      logger.error({ pattern, error }, 'Cache pattern delete error');
    }
  }

  // Invalidate all caches for a user
  async invalidateUser(userId: string): Promise<void> {
    await this.delPattern(`*:${userId}*`);
  }

  // Invalidate workout-related caches
  async invalidateWorkouts(userId: string): Promise<void> {
    await Promise.all([
      this.del(CACHE_KEYS.WORKOUT_LIST(userId)),
      this.del(CACHE_KEYS.DASHBOARD(userId)),
      this.delPattern(`workout:*`),
    ]);
  }

  // Cache wrapper for async functions
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = CACHE_TTL.MEDIUM
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Execute function and cache result
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  }
}

// Export singleton instance
export const cache = new CacheService();
export default cache;

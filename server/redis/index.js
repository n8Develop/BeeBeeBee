import Redis from 'ioredis';
import { config } from '../config.js';

export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 10) return null; // stop retrying after 10 attempts
    return Math.min(times * 200, 5000);
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('reconnecting', (ms) => {
  console.log(`Redis reconnecting in ${ms}ms`);
});

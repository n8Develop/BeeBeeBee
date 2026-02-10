import { redis } from '../redis/index.js';

/**
 * Check if a user is rate limited. Uses Redis SET with NX and EX 1
 * to allow 1 action per second per user.
 * Returns true if the action is allowed, false if rate limited.
 */
export async function checkRateLimit(userId) {
  const key = `bbb:ratelimit:${userId}`;
  // SET key 1 EX 1 NX — returns 'OK' if set, null if already exists
  const result = await redis.set(key, '1', 'EX', 1, 'NX');
  return result === 'OK';
}

import { redis } from './index.js';

export async function addGlobalOnline(userId) {
  await redis.sadd('bbb:online', String(userId));
}

export async function removeGlobalOnline(userId) {
  await redis.srem('bbb:online', String(userId));
}

export async function isGlobalOnline(userId) {
  return await redis.sismember('bbb:online', String(userId));
}

export async function getMultipleOnlineStatus(userIds) {
  if (userIds.length === 0) return {};
  const pipeline = redis.pipeline();
  for (const id of userIds) {
    pipeline.sismember('bbb:online', String(id));
  }
  const results = await pipeline.exec();
  const status = {};
  for (let i = 0; i < userIds.length; i++) {
    status[userIds[i]] = results[i][1] === 1;
  }
  return status;
}

export async function cacheBlockList(userId, blockedIds) {
  const key = `bbb:blocks:${userId}`;
  await redis.del(key);
  if (blockedIds.length > 0) {
    await redis.sadd(key, ...blockedIds.map(String));
  }
}

export async function clearBlockCache(userId) {
  await redis.del(`bbb:blocks:${userId}`);
}

export async function isBlockedBetween(userIdA, userIdB) {
  const [aBlocksB, bBlocksA] = await Promise.all([
    redis.sismember(`bbb:blocks:${userIdA}`, String(userIdB)),
    redis.sismember(`bbb:blocks:${userIdB}`, String(userIdA)),
  ]);
  return aBlocksB === 1 || bBlocksA === 1;
}

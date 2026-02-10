import { redis } from './index.js';

const MSG_TTL = 172800; // 48 hours in seconds

/**
 * Store a message in Redis with 48h TTL and append its ID to the room's message list.
 */
export async function storeMessage(roomId, message) {
  const key = `bbb:msg:${message.id}`;
  const listKey = `bbb:room:${roomId}:msglist`;

  await redis.set(key, JSON.stringify(message), 'EX', MSG_TTL);
  await redis.rpush(listKey, message.id);
}

/**
 * Retrieve a single message by ID. Returns parsed object or null if expired/missing.
 */
export async function getMessage(messageId) {
  const data = await redis.get(`bbb:msg:${messageId}`);
  return data ? JSON.parse(data) : null;
}

/**
 * Update a message in Redis (preserving remaining TTL).
 */
export async function updateMessage(messageId, message) {
  const key = `bbb:msg:${messageId}`;
  const ttl = await redis.ttl(key);
  if (ttl <= 0) return false;
  await redis.set(key, JSON.stringify(message), 'EX', ttl);
  return true;
}

/**
 * Delete a message from Redis and remove its ID from the room's list.
 */
export async function deleteMessage(roomId, messageId) {
  await redis.del(`bbb:msg:${messageId}`);
  await redis.lrem(`bbb:room:${roomId}:msglist`, 0, messageId);
}

/**
 * Get room message history. Fetches all IDs from the list, MGETs them,
 * filters out nulls (expired), and lazily prunes stale IDs from the list.
 */
export async function getRoomMessages(roomId) {
  const listKey = `bbb:room:${roomId}:msglist`;
  const messageIds = await redis.lrange(listKey, 0, -1);

  if (messageIds.length === 0) return [];

  const keys = messageIds.map((id) => `bbb:msg:${id}`);
  const results = await redis.mget(...keys);

  const messages = [];
  const staleIds = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i] !== null) {
      messages.push(JSON.parse(results[i]));
    } else {
      staleIds.push(messageIds[i]);
    }
  }

  // Lazily prune stale IDs from the list
  if (staleIds.length > 0) {
    const pipeline = redis.pipeline();
    for (const id of staleIds) {
      pipeline.lrem(listKey, 0, id);
    }
    pipeline.exec();
  }

  return messages;
}

/**
 * Add a user to the room's online set.
 */
export async function addOnlineUser(roomId, userId) {
  await redis.sadd(`bbb:room:${roomId}:online`, String(userId));
}

/**
 * Remove a user from the room's online set.
 */
export async function removeOnlineUser(roomId, userId) {
  await redis.srem(`bbb:room:${roomId}:online`, String(userId));
}

/**
 * Get all online user IDs for a room.
 */
export async function getOnlineUsers(roomId) {
  const members = await redis.smembers(`bbb:room:${roomId}:online`);
  return members.map(Number);
}

/**
 * Set a user as typing in a room (stores current timestamp).
 */
export async function setTyping(roomId, userId) {
  await redis.hset(`bbb:room:${roomId}:typing`, String(userId), Date.now());
}

/**
 * Remove a user from the typing set.
 */
export async function removeTyping(roomId, userId) {
  await redis.hdel(`bbb:room:${roomId}:typing`, String(userId));
}

/**
 * Get all currently typing users (filtering out stale entries older than 5s).
 * Returns array of userId numbers.
 */
export async function getTypingUsers(roomId) {
  const key = `bbb:room:${roomId}:typing`;
  const entries = await redis.hgetall(key);
  const now = Date.now();
  const active = [];
  const stale = [];

  for (const [userId, timestamp] of Object.entries(entries)) {
    if (now - Number(timestamp) < 5000) {
      active.push(Number(userId));
    } else {
      stale.push(userId);
    }
  }

  // Clean up stale entries
  if (stale.length > 0) {
    await redis.hdel(key, ...stale);
  }

  return active;
}

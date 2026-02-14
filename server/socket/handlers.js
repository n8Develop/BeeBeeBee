import { nanoid } from 'nanoid';
import { unlinkSync } from 'fs';
import path from 'path';
import { isRoomMember, getRoomMembers, findRoomById } from '../db/queries.js';
import { isBlockedBetween } from '../redis/presence.js';
import {
  storeMessage,
  getMessage,
  updateMessage,
  deleteMessage,
  getRoomMessages,
  addOnlineUser,
  removeOnlineUser,
  getOnlineUsers,
  setTyping,
  removeTyping,
  getTypingUsers,
} from '../redis/messages.js';
import { checkRateLimit } from './rateLimiter.js';

const VALID_TYPES = ['drawing', 'text', 'image'];
const VALID_EMOJIS = ['heart', 'laugh', 'fire', 'sad', 'thumbsup', 'thumbsdown', 'star', 'question'];
const MAX_TEXT_LENGTH = 2000;

function emitError(socket, code, message) {
  socket.emit('error', { code, message });
}

/**
 * Validate that the user is a member of the given room.
 * Returns true if valid, false if not (and emits error).
 */
function validateMembership(socket, roomId) {
  const room = findRoomById.get(roomId);
  if (!room) {
    emitError(socket, 'NOT_FOUND', 'Room not found');
    return false;
  }

  const member = isRoomMember.get(roomId, socket.user.id);
  if (!member) {
    emitError(socket, 'NOT_MEMBER', 'You are not a member of this room');
    return false;
  }

  return true;
}

/**
 * Build the room members list with online status.
 */
async function buildMembersList(roomId) {
  const dbMembers = getRoomMembers.all(roomId);
  const onlineUserIds = await getOnlineUsers(roomId);
  const onlineSet = new Set(onlineUserIds);

  return dbMembers.map((m) => ({
    userId: m.id,
    username: m.username,
    online: onlineSet.has(m.id),
  }));
}

/**
 * Build the typing users list with usernames.
 */
async function buildTypingList(roomId) {
  const typingUserIds = await getTypingUsers(roomId);
  const dbMembers = getRoomMembers.all(roomId);
  const memberMap = new Map(dbMembers.map((m) => [m.id, m.username]));

  return typingUserIds
    .filter((id) => memberMap.has(id))
    .map((id) => ({ userId: id, username: memberMap.get(id) }));
}

/**
 * Validate message content based on type.
 */
function validateContent(type, content) {
  if (type === 'text') {
    if (typeof content !== 'string' || content.length === 0 || content.length > MAX_TEXT_LENGTH) {
      return false;
    }
  } else if (type === 'drawing') {
    if (typeof content !== 'object' || !Array.isArray(content.operations) || !content.width || !content.height) {
      return false;
    }
  } else if (type === 'image') {
    if (typeof content !== 'string' || content.length === 0) {
      return false;
    }
  }
  return true;
}

/**
 * Register all event handlers on a socket.
 */
export function registerHandlers(io, socket) {
  // Track which rooms this socket has joined (for disconnect cleanup)
  const joinedRooms = new Set();

  socket.on('room:join', async ({ roomId }) => {
    if (!roomId) {
      return emitError(socket, 'VALIDATION_ERROR', 'roomId is required');
    }

    if (!validateMembership(socket, roomId)) return;

    // Join the Socket.io room
    socket.join(roomId);
    joinedRooms.add(roomId);

    // Add to online set
    await addOnlineUser(roomId, socket.user.id);

    // Fetch and send message history
    const messages = await getRoomMessages(roomId);
    socket.emit('room:history', { roomId, messages });

    // Send current members list to the joining user
    const members = await buildMembersList(roomId);
    socket.emit('room:members', { roomId, members });

    // Broadcast to others in the room that this user joined
    socket.to(roomId).emit('room:user-joined', {
      roomId,
      userId: socket.user.id,
      username: socket.user.username,
    });

    // Broadcast updated members list to everyone in the room
    const updatedMembers = await buildMembersList(roomId);
    socket.to(roomId).emit('room:members', { roomId, members: updatedMembers });
  });

  socket.on('room:leave', async ({ roomId }) => {
    if (!roomId) {
      return emitError(socket, 'VALIDATION_ERROR', 'roomId is required');
    }

    await handleLeaveRoom(io, socket, roomId, joinedRooms);
  });

  socket.on('message:send', async ({ roomId, type, content }) => {
    if (!roomId || !type || content === undefined || content === null) {
      return emitError(socket, 'VALIDATION_ERROR', 'roomId, type, and content are required');
    }

    if (!VALID_TYPES.includes(type)) {
      return emitError(socket, 'VALIDATION_ERROR', `Invalid message type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    if (!validateContent(type, content)) {
      return emitError(socket, 'VALIDATION_ERROR', 'Invalid message content');
    }

    if (!validateMembership(socket, roomId)) return;

    // Rate limit check
    const allowed = await checkRateLimit(socket.user.id);
    if (!allowed) {
      return emitError(socket, 'RATE_LIMITED', 'You are sending messages too quickly');
    }

    const id = nanoid();
    const timestamp = new Date().toISOString();

    const message = {
      id,
      roomId,
      userId: socket.user.id,
      username: socket.user.username,
      type,
      content,
      reactions: [],
      timestamp,
    };

    await storeMessage(roomId, message);

    // Deliver to each socket in the room, filtering blocked pairs
    const sockets = await io.in(roomId).fetchSockets();
    for (const s of sockets) {
      if (!(await isBlockedBetween(socket.user.id, s.user.id))) {
        s.emit('message:new', message);
      }
    }
  });

  socket.on('message:delete', async ({ roomId, messageId }) => {
    if (!roomId || !messageId) {
      return emitError(socket, 'VALIDATION_ERROR', 'roomId and messageId are required');
    }

    if (!validateMembership(socket, roomId)) return;

    const message = await getMessage(messageId);
    if (!message) {
      return emitError(socket, 'NOT_FOUND', 'Message not found');
    }

    // Only the message author can delete
    if (message.userId !== socket.user.id) {
      return emitError(socket, 'UNAUTHORIZED', 'You can only delete your own messages');
    }

    // If image message, delete the file
    if (message.type === 'image' && typeof message.content === 'string') {
      try {
        const uploadsDir = path.resolve('uploads/messages');
        const filePath = path.resolve(message.content.replace(/^\//, ''));
        if (filePath.startsWith(uploadsDir)) {
          unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Failed to delete image for message ${messageId}:`, err.message);
      }
    }

    await deleteMessage(roomId, messageId);

    io.to(roomId).emit('message:deleted', { roomId, messageId });
  });

  socket.on('reaction:add', async ({ roomId, messageId, emoji }) => {
    if (!roomId || !messageId || !emoji) {
      return emitError(socket, 'VALIDATION_ERROR', 'roomId, messageId, and emoji are required');
    }

    if (!VALID_EMOJIS.includes(emoji)) {
      return emitError(socket, 'VALIDATION_ERROR', `Invalid emoji. Must be one of: ${VALID_EMOJIS.join(', ')}`);
    }

    if (!validateMembership(socket, roomId)) return;

    const message = await getMessage(messageId);
    if (!message) {
      return emitError(socket, 'NOT_FOUND', 'Message not found');
    }

    // Add reaction
    const reactions = message.reactions || [];
    let reactionGroup = reactions.find((r) => r.emoji === emoji);
    if (!reactionGroup) {
      reactionGroup = { emoji, userIds: [] };
      reactions.push(reactionGroup);
    }

    if (!reactionGroup.userIds.includes(socket.user.id)) {
      reactionGroup.userIds.push(socket.user.id);
    }

    message.reactions = reactions;
    await updateMessage(messageId, message);

    io.to(roomId).emit('reaction:updated', { roomId, messageId, reactions });
  });

  socket.on('reaction:remove', async ({ roomId, messageId, emoji }) => {
    if (!roomId || !messageId || !emoji) {
      return emitError(socket, 'VALIDATION_ERROR', 'roomId, messageId, and emoji are required');
    }

    if (!VALID_EMOJIS.includes(emoji)) {
      return emitError(socket, 'VALIDATION_ERROR', `Invalid emoji. Must be one of: ${VALID_EMOJIS.join(', ')}`);
    }

    if (!validateMembership(socket, roomId)) return;

    const message = await getMessage(messageId);
    if (!message) {
      return emitError(socket, 'NOT_FOUND', 'Message not found');
    }

    // Remove reaction
    const reactions = message.reactions || [];
    const reactionGroup = reactions.find((r) => r.emoji === emoji);
    if (reactionGroup) {
      reactionGroup.userIds = reactionGroup.userIds.filter((id) => id !== socket.user.id);
      // Remove the group entirely if no users left
      message.reactions = reactions.filter((r) => r.userIds.length > 0);
    }

    await updateMessage(messageId, message);

    io.to(roomId).emit('reaction:updated', { roomId, messageId, reactions: message.reactions });
  });

  socket.on('typing:start', async ({ roomId }) => {
    if (!roomId) return;
    if (!validateMembership(socket, roomId)) return;

    await setTyping(roomId, socket.user.id);

    const typingUsers = await buildTypingList(roomId);
    socket.to(roomId).emit('typing:update', { roomId, users: typingUsers });
  });

  socket.on('typing:stop', async ({ roomId }) => {
    if (!roomId) return;
    if (!validateMembership(socket, roomId)) return;

    await removeTyping(roomId, socket.user.id);

    const typingUsers = await buildTypingList(roomId);
    socket.to(roomId).emit('typing:update', { roomId, users: typingUsers });
  });

  socket.on('disconnect', async () => {
    for (const roomId of joinedRooms) {
      await removeOnlineUser(roomId, socket.user.id);
      await removeTyping(roomId, socket.user.id);

      socket.to(roomId).emit('room:user-left', {
        roomId,
        userId: socket.user.id,
        username: socket.user.username,
      });

      // Broadcast updated members list
      const members = await buildMembersList(roomId);
      socket.to(roomId).emit('room:members', { roomId, members });
    }
  });
}

async function handleLeaveRoom(io, socket, roomId, joinedRooms) {
  socket.leave(roomId);
  joinedRooms.delete(roomId);

  await removeOnlineUser(roomId, socket.user.id);
  await removeTyping(roomId, socket.user.id);

  socket.to(roomId).emit('room:user-left', {
    roomId,
    userId: socket.user.id,
    username: socket.user.username,
  });

  // Broadcast updated members list
  const members = await buildMembersList(roomId);
  socket.to(roomId).emit('room:members', { roomId, members });
}


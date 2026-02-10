import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { config } from '../config.js';
import { findUserById, getFriendsList, getBlockedByUser } from '../db/queries.js';
import { registerHandlers } from './handlers.js';
import { setIo } from './io.js';
import { addGlobalOnline, removeGlobalOnline, cacheBlockList, clearBlockCache } from '../redis/presence.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });

  setIo(io);

  // JWT cookie authentication middleware
  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || '');
    const token = cookies.token;
    if (!token) return next(new Error('Not authenticated'));

    try {
      const payload = jwt.verify(token, config.JWT_SECRET);
      const user = findUserById.get(payload.id);
      if (!user) return next(new Error('Not authenticated'));
      socket.user = { id: user.id, username: user.username };
      next();
    } catch {
      next(new Error('Not authenticated'));
    }
  });

  io.on('connection', async (socket) => {
    // Join personal room for friend notifications
    socket.join(`user:${socket.user.id}`);

    // Mark as globally online
    await addGlobalOnline(socket.user.id);

    // Cache block list in Redis
    const blocked = getBlockedByUser.all(socket.user.id).map((r) => r.friend_id);
    await cacheBlockList(socket.user.id, blocked);

    // Notify friends that this user is online
    const friends = getFriendsList.all(socket.user.id);
    for (const friend of friends) {
      io.to(`user:${friend.userId}`).emit('friend:online', {
        userId: socket.user.id,
        username: socket.user.username,
      });
    }

    registerHandlers(io, socket);

    socket.on('disconnect', async () => {
      await removeGlobalOnline(socket.user.id);
      await clearBlockCache(socket.user.id);

      // Notify friends that this user is offline
      const friends = getFriendsList.all(socket.user.id);
      for (const friend of friends) {
        io.to(`user:${friend.userId}`).emit('friend:offline', {
          userId: socket.user.id,
          username: socket.user.username,
        });
      }
    });
  });

  return io;
}

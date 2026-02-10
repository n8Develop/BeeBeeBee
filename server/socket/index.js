import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { config } from '../config.js';
import { findUserById } from '../db/queries.js';
import { registerHandlers } from './handlers.js';

export function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: config.FRONTEND_URL,
      credentials: true,
    },
  });

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

  io.on('connection', (socket) => {
    registerHandlers(io, socket);
  });

  return io;
}

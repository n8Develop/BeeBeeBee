import { io } from 'socket.io-client';
import { friendsStore } from './friends.svelte.js';

function createSocket() {
  let socket = $state(null);
  let connected = $state(false);
  let messages = $state([]);
  let members = $state([]);
  let typingUsers = $state([]);
  let error = $state(null);
  let currentRoomId = $state(null);

  function setupListeners(sock) {
    sock.on('connect', () => {
      connected = true;
      error = null;
    });

    sock.on('disconnect', () => {
      connected = false;
    });

    sock.on('room:history', (data) => {
      if (data.roomId === currentRoomId) {
        messages = data.messages || [];
      }
    });

    sock.on('message:new', (msg) => {
      if (msg.roomId === currentRoomId) {
        messages = [...messages, msg];
      }
    });

    sock.on('message:deleted', (data) => {
      if (data.roomId === currentRoomId) {
        messages = messages.filter((m) => m.id !== data.messageId);
      }
    });

    sock.on('reaction:updated', (data) => {
      if (data.roomId === currentRoomId) {
        messages = messages.map((m) => {
          if (m.id === data.messageId) {
            return { ...m, reactions: data.reactions };
          }
          return m;
        });
      }
    });

    sock.on('room:members', (data) => {
      if (data.roomId === currentRoomId) {
        members = data.members || [];
      }
    });

    sock.on('room:user-joined', (data) => {
      if (data.roomId === currentRoomId) {
        const exists = members.find((m) => m.userId === data.userId);
        if (!exists) {
          members = [...members, { userId: data.userId, username: data.username, online: true }];
        } else {
          members = members.map((m) =>
            m.userId === data.userId ? { ...m, online: true } : m
          );
        }
      }
    });

    sock.on('room:user-left', (data) => {
      if (data.roomId === currentRoomId) {
        members = members.map((m) =>
          m.userId === data.userId ? { ...m, online: false } : m
        );
      }
    });

    sock.on('typing:update', (data) => {
      if (data.roomId === currentRoomId) {
        typingUsers = data.users || [];
      }
    });

    sock.on('friend:online', (data) => {
      friendsStore.handleFriendOnline(data);
    });

    sock.on('friend:offline', (data) => {
      friendsStore.handleFriendOffline(data);
    });

    sock.on('friend:request-received', (data) => {
      friendsStore.handleRequestReceived(data);
    });

    sock.on('friend:request-accepted', (data) => {
      friendsStore.handleRequestAccepted(data);
    });

    sock.on('error', (data) => {
      error = data;
    });
  }

  return {
    get connected() { return connected; },
    get messages() { return messages; },
    get members() { return members; },
    get typingUsers() { return typingUsers; },
    get error() { return error; },
    get currentRoomId() { return currentRoomId; },

    connect() {
      if (socket) return;
      socket = io({ withCredentials: true });
      setupListeners(socket);
    },

    disconnect() {
      if (!socket) return;
      socket.disconnect();
      socket = null;
      connected = false;
      messages = [];
      members = [];
      typingUsers = [];
      currentRoomId = null;
    },

    joinRoom(roomId) {
      if (!socket) return;
      currentRoomId = roomId;
      messages = [];
      members = [];
      typingUsers = [];
      socket.emit('room:join', { roomId });
    },

    leaveRoom(roomId) {
      if (!socket) return;
      socket.emit('room:leave', { roomId });
      if (currentRoomId === roomId) {
        currentRoomId = null;
        messages = [];
        members = [];
        typingUsers = [];
      }
    },

    sendMessage(roomId, type, content) {
      if (!socket) return;
      socket.emit('message:send', { roomId, type, content });
    },

    deleteMessage(roomId, messageId) {
      if (!socket) return;
      socket.emit('message:delete', { roomId, messageId });
    },

    addReaction(roomId, messageId, emoji) {
      if (!socket) return;
      socket.emit('reaction:add', { roomId, messageId, emoji });
    },

    removeReaction(roomId, messageId, emoji) {
      if (!socket) return;
      socket.emit('reaction:remove', { roomId, messageId, emoji });
    },

    startTyping(roomId) {
      if (!socket) return;
      socket.emit('typing:start', { roomId });
    },

    stopTyping(roomId) {
      if (!socket) return;
      socket.emit('typing:stop', { roomId });
    },

    clearError() {
      error = null;
    }
  };
}

export const socket = createSocket();

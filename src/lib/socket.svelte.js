import { io } from 'socket.io-client';
import { friendsStore } from './friends.svelte.js';
import { settings } from './settings.svelte.js';
import { messageReceived } from './canvas/sounds.js';

function createSocket() {
  let socket = $state(null);
  let connected = $state(false);
  let reconnecting = $state(false);
  let messages = $state([]);
  let members = $state([]);
  let typingUsers = $state([]);
  let error = $state(null);
  let sendError = $state(null);
  let currentRoomId = $state(null);
  let currentUserId = $state(null);

  let sendErrorTimer = null;

  function setSendError(msg) {
    sendError = msg;
    clearTimeout(sendErrorTimer);
    sendErrorTimer = setTimeout(() => { sendError = null; }, 3000);
  }

  function setupListeners(sock) {
    sock.on('connect', () => {
      // Re-join room after reconnect (connect fires on initial + reconnect)
      if (reconnecting && currentRoomId) {
        sock.emit('room:join', { roomId: currentRoomId });
      }
      connected = true;
      reconnecting = false;
      error = null;
    });

    sock.on('disconnect', () => {
      connected = false;
    });

    // Manager-level events for reconnection
    sock.io.on('reconnect_attempt', () => {
      reconnecting = true;
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

      // Sound + browser notification for messages from others
      if (msg.userId !== currentUserId) {
        const vol = settings.notificationVolume * settings.masterVolume;
        if (vol > 0) messageReceived(vol);

        if (typeof document !== 'undefined' && document.hidden) {
          showBrowserNotification(msg);
        }
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
      if (data?.context === 'message:send') {
        setSendError(data.message || 'Failed to send message');
      }
    });
  }

  function showBrowserNotification(msg) {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission === 'default') {
      Notification.requestPermission();
      return;
    }
    if (Notification.permission !== 'granted') return;

    let body;
    if (msg.type === 'text') {
      body = msg.content?.length > 100 ? msg.content.slice(0, 100) + '...' : msg.content;
    } else if (msg.type === 'drawing') {
      body = 'sent a drawing';
    } else if (msg.type === 'image') {
      body = 'sent an image';
    } else {
      body = 'sent a message';
    }

    new Notification(msg.username || 'New message', { body, icon: '/favicon.png' });
  }

  return {
    get connected() { return connected; },
    get reconnecting() { return reconnecting; },
    get messages() { return messages; },
    get members() { return members; },
    get typingUsers() { return typingUsers; },
    get error() { return error; },
    get sendError() { return sendError; },
    get currentRoomId() { return currentRoomId; },

    connect(userId) {
      if (socket) return;
      currentUserId = userId || null;
      socket = io({
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 20,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });
      setupListeners(socket);
    },

    disconnect() {
      if (!socket) return;
      socket.disconnect();
      socket = null;
      connected = false;
      reconnecting = false;
      messages = [];
      members = [];
      typingUsers = [];
      currentRoomId = null;
      currentUserId = null;
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
    },

    clearSendError() {
      sendError = null;
      clearTimeout(sendErrorTimer);
    }
  };
}

export const socket = createSocket();

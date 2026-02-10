import { api } from './api.js';

function createFriends() {
  let friends = $state([]);
  let incomingRequests = $state([]);
  let outgoingRequests = $state([]);

  return {
    get friends() { return friends; },
    get incomingRequests() { return incomingRequests; },
    get outgoingRequests() { return outgoingRequests; },

    async fetchFriends() {
      friends = await api.get('/api/friends');
    },

    async fetchRequests() {
      const data = await api.get('/api/friends/requests');
      incomingRequests = data.incoming || [];
      outgoingRequests = data.outgoing || [];
    },

    async sendRequest(username) {
      await api.post('/api/friends/request', { username });
      await this.fetchRequests();
    },

    async acceptRequest(userId) {
      await api.post('/api/friends/accept', { userId });
      await this.fetchRequests();
      await this.fetchFriends();
    },

    async declineRequest(userId) {
      await api.post('/api/friends/decline', { userId });
      await this.fetchRequests();
    },

    async removeFriend(userId) {
      await api.delete(`/api/friends/${userId}`);
      await this.fetchFriends();
    },

    async blockUser(userId) {
      await api.post('/api/friends/block', { userId });
      await this.fetchFriends();
    },

    async startDirectMessage(friendId) {
      return await api.post('/api/rooms/direct', { friendId });
    },

    handleFriendOnline(data) {
      friends = friends.map(f => f.userId === data.userId ? { ...f, online: true } : f);
    },

    handleFriendOffline(data) {
      friends = friends.map(f => f.userId === data.userId ? { ...f, online: false } : f);
    },

    handleRequestReceived(data) {
      incomingRequests = [...incomingRequests, { userId: data.fromUserId, username: data.fromUsername }];
    },

    handleRequestAccepted(data) {
      outgoingRequests = outgoingRequests.filter(r => r.userId !== data.userId);
      friends = [...friends, { userId: data.userId, username: data.username, online: true }];
    }
  };
}

export const friendsStore = createFriends();

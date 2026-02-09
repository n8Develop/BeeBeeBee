import { api } from './api.js';

function createAuth() {
  let user = $state(null);
  let loading = $state(true);

  return {
    get user() { return user; },
    get loading() { return loading; },

    async checkAuth() {
      try {
        user = await api.get('/api/auth/me');
      } catch {
        user = null;
      } finally {
        loading = false;
      }
    },

    async login(username, password) {
      user = await api.post('/api/auth/login', { username, password });
    },

    async register(username, password) {
      user = await api.post('/api/auth/register', { username, password });
    },

    async logout() {
      await api.post('/api/auth/logout');
      user = null;
    }
  };
}

export const auth = createAuth();

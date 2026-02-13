import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': 'http://localhost:3069',
      '/socket.io': { target: 'http://localhost:3069', ws: true },
      '/uploads': 'http://localhost:3069'
    }
  }
});

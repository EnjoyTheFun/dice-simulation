import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/dice-simulation/' : '/',
  build: {
    chunkSizeWarningLimit: 750,
  },
});

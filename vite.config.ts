import { defineConfig } from 'vite';

export default defineConfig({
  base: '/math-defense/',
  build: {
    chunkSizeWarningLimit: 2000,
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});

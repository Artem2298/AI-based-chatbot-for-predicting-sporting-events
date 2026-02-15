import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/integration/**', '**/node_modules/**'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      exclude: [
        'src/generated/**',
        'node_modules/**',
        'src/__tests__/**',
        'prisma/**',
      ],
    },
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

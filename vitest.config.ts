import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/integration/**', '**/node_modules/**', '**/dist/**'],
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/generated/**',
        'src/index.ts',
        'src/config/**',
        'src/db/**',
        'src/types/**',
        'src/**/*.types.ts',
        'src/api/football-data/constants.ts',
        'src/api/football-data/types.ts',
        'src/utils/logger.ts',
        'src/bot/handlers/index.ts',
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

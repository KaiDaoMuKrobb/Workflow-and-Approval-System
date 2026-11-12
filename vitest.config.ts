import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// Ensure .env is loaded if process.loadEnvFile is available (Node 20+)
if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // Ignore if already loaded or not found
  }
}

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    exclude: ['**/node_modules/**', '**/dist/**', '**/tests/e2e/**'],
    env: {
      JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-for-development-cpe334-expenseflow',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

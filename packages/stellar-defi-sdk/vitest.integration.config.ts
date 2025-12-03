import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    testTimeout: 60000, // 60 seconds for integration tests
    hookTimeout: 30000,
    setupFiles: ['./vitest.setup.ts'],
    maxConcurrency: 1, // Sequential to avoid rate limits on real API
    retry: 1, // Retry flaky network tests once
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
});

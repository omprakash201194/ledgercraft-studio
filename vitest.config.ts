import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**'],
    pool: 'forks',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['electron/**/*.ts', 'renderer/src/**/*.ts', 'renderer/src/**/*.tsx'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'electron/main.ts',
        'electron/preload.ts',
        'electron/ipc/**',
        // React UI components require Playwright E2E tests (not unit tests);
        // exclude them from the unit-test coverage threshold.
        'renderer/src/components/**',
        'renderer/src/pages/**',
        'renderer/src/layouts/**',
        'renderer/src/App.tsx',
        'renderer/src/main.tsx',
        'renderer/src/global.d.ts',
        'renderer/src/services/**',
        'renderer/src/tests/**',
      ],
      thresholds: {
        // Thresholds reflect the current electron service-layer + renderer utility coverage.
        // React UI components are excluded (require E2E/Playwright tests, not unit tests).
        // Target: raise these incrementally as more service-layer tests are added.
        lines: 35,
        functions: 30,
        branches: 30,
        statements: 35,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src'),
    },
  },
});

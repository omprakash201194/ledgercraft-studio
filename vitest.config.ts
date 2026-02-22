import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', 'e2e/**'],
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
        // Raised from 60% after closing coverage gaps in auth, templateService, dateUtils,
        // clientTypeService, and clientService.
        lines: 68,
        functions: 62,
        branches: 70,
        statements: 68,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer/src'),
    },
  },
});

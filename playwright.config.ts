import { defineConfig } from '@playwright/test';

/**
 * Playwright E2E configuration for LedgerCraft Studio renderer.
 *
 * Tests run against the Vite dev server (`npm run dev:renderer`).
 * `window.api` is injected as a mock via `page.addInitScript()` in each spec,
 * so no Electron process is required for the headless UI regression suite.
 */
export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: process.env.CI ? 1 : 0,
    workers: 1,
    reporter: [['html', { open: 'never' }]],
    use: {
        baseURL: 'http://localhost:5173',
        headless: true,
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'npm run dev:renderer',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
    },
});

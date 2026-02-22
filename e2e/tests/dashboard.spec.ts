import { expect } from '@playwright/test';
import { test } from '../fixtures/electron.fixture';
import { LoginPage } from '../page-objects/LoginPage';
import { DashboardPage } from '../page-objects/DashboardPage';

/**
 * Dashboard Business Flow Validation Suite
 *
 * Covers:
 *  - Dashboard loads with expected UI elements after login
 *  - Navigation links are present
 *  - Quick-action cards are accessible
 */

test.describe('Dashboard', () => {
    test.beforeEach(async ({ window }) => {
        await new LoginPage(window).login('admin', 'admin123');
        await new DashboardPage(window).waitForLoad();
    });

    test('dashboard heading is visible', async ({ window }) => {
        await expect(window.locator('text=Dashboard')).toBeVisible();
    });

    test('sidebar navigation is present', async ({ window }) => {
        // The sidebar/drawer should contain navigation items
        const nav = window.locator('[data-testid="main-navigation"]');
        await expect(nav).toBeVisible();
    });

    test('quick-action cards are rendered', async ({ window }) => {
        // Dashboard has card-based navigation shortcuts
        const cards = window.locator('[role="button"], .MuiCard-root, .MuiCardActionArea-root');
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('app title is shown', async ({ window }) => {
        const title = await window.title();
        expect(title).toMatch(/LedgerCraft/i);
    });
});

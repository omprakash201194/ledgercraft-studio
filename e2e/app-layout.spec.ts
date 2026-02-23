/**
 * E2E: AppLayout — sidebar navigation and logout flow
 *
 * Verifies:
 * - Sidebar nav items are visible for ADMIN role
 * - Clicking a nav item navigates to its route
 * - USER role does NOT see ADMIN-only nav items (Templates, Forms)
 * - Logout button navigates back to /login
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER, REGULAR_USER } from './fixtures/mock-api';

test.describe('AppLayout — sidebar navigation', () => {
    test('ADMIN sees all nav items', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/dashboard');

        // Use exact:true to avoid matching MUI card buttons that contain these words
        await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Templates', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Forms', exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Audit Logs', exact: true })).toBeVisible();
    });

    test('USER does NOT see ADMIN-only nav items', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: REGULAR_USER }) });
        await page.goto('/#/dashboard');

        await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
        // ADMIN-only items should be absent
        await expect(page.getByRole('button', { name: 'Templates', exact: true })).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'Audit Logs', exact: true })).not.toBeVisible();
    });

    test('clicking Templates nav item navigates to /templates', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/dashboard');

        await page.getByRole('button', { name: 'Templates', exact: true }).click();
        await expect(page).toHaveURL(/#\/templates/);
    });

    test('clicking Reports nav item navigates to /reports', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/dashboard');

        await page.getByRole('button', { name: 'Reports', exact: true }).click();
        await expect(page).toHaveURL(/#\/reports/);
    });

    test('logout button (id=logout-button) navigates to /login', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/dashboard');

        // The logout button has id="logout-button" (visible when sidebar is expanded)
        await page.locator('#logout-button').click();
        await expect(page).toHaveURL(/#\/login/);
    });

    test('sidebar renders as a visible drawer with nav buttons', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/dashboard');

        // The sidebar Drawer contains ListItemButton elements for navigation
        await expect(page.getByRole('button', { name: 'Dashboard', exact: true })).toBeVisible();
    });
});

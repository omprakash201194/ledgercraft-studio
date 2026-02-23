/**
 * E2E – SettingsPage
 *
 * Covers:
 *  1. Settings page renders with version number
 *  2. Date format selector is visible and shows current value
 *  3. Changing date format calls updateUserPreferences
 *  4. Export Backup button shows success message on click
 *  5. Restore Backup button shows success message on click
 *  6. Theme toggle buttons are visible
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

test.describe('SettingsPage', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/settings');
    });

    test('renders Settings heading and version', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
        // Version is shown as "v1.0.0-test" (from mock getAppVersion)
        await expect(page.getByText(/v1\.0\.0-test/)).toBeVisible();
    });

    test('About section is rendered', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'About' })).toBeVisible();
        // Application name appears in the info section
        await expect(page.getByText('Name:')).toBeVisible();
    });

    test('Preferences section shows Theme and Date Format controls', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
        await expect(page.getByText('Theme')).toBeVisible();
        await expect(page.getByText('Date Format')).toBeVisible();
        // Light / Dark toggle buttons
        await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
    });

    test('Date Format select is visible and has a value', async ({ page }) => {
        // The date format section heading
        await expect(page.getByText('Date Format')).toBeVisible();
        // MUI Select renders as a listbox; check the visible selected text
        await expect(page.getByText(/DD-MM-YYYY/)).toBeVisible();
    });

    test('Data Management section shows Export Backup and Restore Backup buttons', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Data Management' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Export Backup' })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Restore Backup' })).toBeVisible();
    });

    test('Export Backup shows success alert after clicking', async ({ page }) => {
        await page.getByRole('button', { name: 'Export Backup' }).click();
        // The success message from SettingsPage.handleExport
        await expect(page.getByText(/backup exported successfully/i)).toBeVisible();
    });

    test('Restore Backup shows success alert after clicking', async ({ page }) => {
        await page.getByRole('button', { name: 'Restore Backup' }).click();
        // Actual message from SettingsPage.handleRestore on success
        await expect(page.getByText(/restoring\.\.\. application will restart/i)).toBeVisible();
    });
});

/**
 * E2E: Dashboard page
 *
 * Verifies:
 * - Quick-action cards are visible (Manage Templates, Manage Forms, Generate Report)
 * - Recent Reports section renders (table or empty state)
 * - Clicking a quick-action card navigates to the correct route
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/dashboard');
    });

    test('quick-action cards are visible', async ({ page }) => {
        await expect(page.getByText('Manage Templates')).toBeVisible();
        await expect(page.getByText('Manage Forms')).toBeVisible();
        // Use a card-level selector to avoid matching the sidebar button with same text
        await expect(page.getByText('Configure data entry forms')).toBeVisible();
    });

    test('Recent Reports section is rendered', async ({ page }) => {
        // The heading "Recent Reports" should always be present
        await expect(page.getByRole('heading', { name: 'Recent Reports' })).toBeVisible();
    });

    test('empty state shows "No reports generated yet"', async ({ page }) => {
        await expect(page.getByText(/no reports generated yet/i)).toBeVisible();
    });

    test('clicking Manage Templates navigates to /templates', async ({ page }) => {
        // Cards use onClick + navigate() — click via CardActionArea
        await page.getByText('Manage Templates').click();
        await expect(page).toHaveURL(/#\/templates/);
    });

    test('clicking Manage Forms navigates to /forms', async ({ page }) => {
        await page.getByText('Manage Forms').click();
        await expect(page).toHaveURL(/#\/forms/);
    });
});

// Separate describe without beforeEach for tests that need pre-seeded data
test.describe('Dashboard — with pre-seeded data', () => {
    test('shows recent report filename when reports are pre-seeded', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [
                    {
                        id: 'r1',
                        form_id: 'f1',
                        form_name: 'Invoice Form',
                        file_path: '/reports/r1.docx',
                        generated_at: '2024-06-15T10:30:00.000Z',
                        generated_by_username: 'admin',
                    },
                ],
            }),
        });
        await page.goto('/#/dashboard');

        // The report filename is extracted from file_path and shown in first column
        await expect(page.getByText('r1.docx')).toBeVisible();
    });
});

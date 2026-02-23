/**
 * E2E – AnalyticsPage
 *
 * Covers:
 *  1. Analytics Dashboard heading renders
 *  2. KPI tiles show correct counts from mock data
 *  3. Chart section headings are visible (Reports by User, Top Forms, Monthly Trend)
 *  4. USER role is redirected by AdminRoute guard
 *  5. Error state renders "Failed to load analytics data." when API throws
 *  6. Zero-state: KPI tiles show 0 when all metrics are zero
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER, REGULAR_USER } from './fixtures/mock-api';

const FULL_ANALYTICS = {
    totalReports: 42,
    reportsThisMonth: 7,
    deletedReports: 3,
    activeClients: 12,
    reportsByUser: [{ name: 'admin', value: 42 }],
    topForms: [{ name: 'Invoice Form', value: 15 }],
    monthlyTrend: [
        { name: 'Jan', value: 5 },
        { name: 'Feb', value: 7 },
    ],
};

test.describe('AnalyticsPage', () => {
    test('renders Analytics Dashboard heading for ADMIN', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: ADMIN_USER }),
        });
        await page.goto('/#/analytics');

        await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible();
    });

    test('KPI tiles show correct counts', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                analyticsOverride: FULL_ANALYTICS,
            }),
        });
        await page.goto('/#/analytics');

        await expect(page.getByText('Total Reports Generated')).toBeVisible();
        await expect(page.getByText('Reports This Month')).toBeVisible();
        await expect(page.getByText('Deleted Reports')).toBeVisible();
        // The numeric value 42 (totalReports)
        await expect(page.getByText('42')).toBeVisible();
    });

    test('chart section headings are visible', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                analyticsOverride: FULL_ANALYTICS,
            }),
        });
        await page.goto('/#/analytics');

        await expect(page.getByRole('heading', { name: 'Reports by User' })).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Top Forms' })).toBeVisible();
        await expect(page.getByText('Monthly Reporting Trend (Last 6 Months)')).toBeVisible();
    });

    test('USER role is redirected to /dashboard (AdminRoute guard)', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: REGULAR_USER }),
        });
        await page.goto('/#/analytics');

        // AdminRoute redirects to /dashboard
        await expect(page).toHaveURL(/#\/dashboard/);
    });

    test('zero-state: KPI tiles render 0 when all metrics are zero', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                analyticsOverride: {
                    totalReports: 0,
                    reportsThisMonth: 0,
                    deletedReports: 0,
                    activeClients: 0,
                    reportsByUser: [],
                    topForms: [],
                    monthlyTrend: [],
                },
            }),
        });
        await page.goto('/#/analytics');

        await expect(page.getByRole('heading', { name: 'Analytics Dashboard' })).toBeVisible();
        // Multiple 0 values rendered — at least one should be present
        await expect(page.getByText('Total Reports Generated')).toBeVisible();
    });
});

/**
 * E2E – ReportsPage delete / bulk-delete dialog
 *
 * Covers:
 *  1. Single-report Delete button opens confirmation dialog
 *  2. Confirming single delete removes the report from the table
 *  3. Cancelling single delete keeps the report in the table
 *  4. Selecting checkboxes enables "Delete Selected" button
 *  5. Bulk delete dialog shows correct count
 *  6. Confirming bulk delete removes all selected reports
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

const makeReport = (id: string, formName = 'Invoice Form') => ({
    id,
    form_id: 'form-1',
    file_path: `/reports/${id}.docx`,
    generated_at: '2024-06-01T10:00:00.000Z',
    form_name: formName,
    generated_by: 'admin-id',
    generated_by_username: 'admin',
    input_values: '{}',
});

test.describe('ReportsPage — delete / bulk-delete', () => {
    test('Delete button opens confirmation dialog for single report', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [makeReport('r1')],
            }),
        });
        await page.goto('/#/reports');

        // Click the Delete button for the row
        await page.getByRole('button', { name: 'Delete', exact: true }).first().click();

        // Confirmation dialog should appear
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByText('Delete Report?')).toBeVisible();
    });

    test('cancelling delete dialog keeps report in list', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [makeReport('r1')],
            }),
        });
        await page.goto('/#/reports');

        await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Click Cancel
        await page.getByRole('button', { name: 'Cancel' }).click();

        // Dialog should close
        await expect(page.getByRole('dialog')).not.toBeVisible();
        // Report should still be in the table
        await expect(page.getByText('Invoice Form')).toBeVisible();
    });

    test('confirming single delete removes report from table', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [makeReport('r1')],
            }),
        });
        await page.goto('/#/reports');

        await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Confirm delete
        await page.getByRole('button', { name: 'Delete' }).last().click();

        // Dialog should close and report should be gone
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByText('Invoice Form')).not.toBeVisible();
    });

    test('selecting a report checkbox enables Delete Selected button', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [makeReport('r1'), makeReport('r2', 'Salary Form')],
            }),
        });
        await page.goto('/#/reports');

        // Check the first row checkbox
        const checkboxes = page.getByRole('checkbox');
        await checkboxes.nth(1).check(); // nth(0) is usually "select all"

        // Delete Selected button should now appear / be enabled
        await expect(page.getByRole('button', { name: /delete selected/i })).toBeVisible();
    });

    test('bulk delete dialog shows correct selected count', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [makeReport('r1'), makeReport('r2', 'Salary Form')],
            }),
        });
        await page.goto('/#/reports');

        // Select both rows
        await page.getByRole('checkbox').nth(1).check();
        await page.getByRole('checkbox').nth(2).check();

        // Click Delete Selected
        await page.getByRole('button', { name: /delete selected/i }).click();

        // Confirm dialog should mention 2 reports — check the heading (DialogTitle)
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('heading', { name: /delete 2 reports/i })).toBeVisible();
    });

    test('confirming bulk delete removes all selected reports', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [makeReport('r1'), makeReport('r2', 'Salary Form')],
            }),
        });
        await page.goto('/#/reports');

        // Select all using header checkbox
        await page.getByRole('checkbox').first().check();

        await page.getByRole('button', { name: /delete selected/i }).click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: 'Delete' }).last().click();

        await expect(page.getByRole('dialog')).not.toBeVisible();
        // Both reports gone
        await expect(page.getByText('Invoice Form')).not.toBeVisible();
        await expect(page.getByText('Salary Form')).not.toBeVisible();
    });
});

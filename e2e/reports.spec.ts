/**
 * E2E – Single report generation
 *
 * Covers:
 *  1. Form tree is visible on the Generate Report page
 *  2. Selecting a form loads its fields in the right pane
 *  3. Filling fields and clicking "Generate Report" calls the API and shows success
 *  4. Generated report appears on the Reports page
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

const SEED_FORM = {
    id: 'form-invoice',
    name: 'Invoice Form',
    template_id: 'tmpl-1',
    template_name: 'invoice.docx',
    field_count: 2,
    created_at: '2024-01-01T00:00:00.000Z',
    usage_count: 0,
};

const SEED_FORM_FIELDS = [
    {
        id: 'field-cn',
        form_id: 'form-invoice',
        label: 'Client Name',
        field_key: 'client_name',
        data_type: 'text',
        required: 1,
        placeholder_mapping: 'client_name',
        options_json: null,
    },
    {
        id: 'field-amt',
        form_id: 'form-invoice',
        label: 'Amount',
        field_key: 'amount',
        data_type: 'number',
        required: 1,
        placeholder_mapping: 'amount',
        options_json: null,
    },
];

test.describe('Single report generation', () => {
    test('form tree shows forms on Generate Report page', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialForms: [SEED_FORM],
                initialFormFields: SEED_FORM_FIELDS,
            }),
        });
        await page.goto('/#/generate-report');

        await expect(page.getByRole('heading', { name: 'Generate Report' })).toBeVisible();

        // The form should appear in the tree (use treeitem role to disambiguate from Recent Forms list)
        await expect(page.getByRole('treeitem', { name: 'Invoice Form' })).toBeVisible();
    });

    test('selecting a form loads fields in the right pane', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialForms: [SEED_FORM],
                initialFormFields: SEED_FORM_FIELDS,
            }),
        });
        await page.goto('/#/generate-report');

        // Click on the form in the tree (use treeitem role to avoid matching Recent Forms list item)
        await page.getByRole('treeitem', { name: 'Invoice Form' }).click();

        // Right pane should now show the form fields
        await expect(page.getByLabel('Client Name')).toBeVisible();
        await expect(page.getByLabel('Amount')).toBeVisible();
        // Use CSS button selector to avoid matching the sidebar nav ListItemButton (a div)
        await expect(page.locator('button:has-text("Generate Report")')).toBeVisible();
    });

    test('generates a report and shows success message', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialForms: [SEED_FORM],
                initialFormFields: SEED_FORM_FIELDS,
            }),
        });
        await page.goto('/#/generate-report');

        // Select the form (use treeitem role to avoid matching Recent Forms list item)
        await page.getByRole('treeitem', { name: 'Invoice Form' }).click();

        // Fill required fields
        await page.getByLabel('Client Name').fill('Acme Corp');
        await page.getByLabel('Amount').fill('5000');

        // Generate the report (use CSS button selector to avoid nav ListItemButton)
        await page.locator('button:has-text("Generate Report")').click();

        // Success snackbar should appear
        await expect(page.getByText(/Report generated successfully/i)).toBeVisible();
    });

    test('generated report is listed on the Reports page', async ({ page }) => {
        const existingReport = {
            id: 'rep-existing',
            form_id: 'form-invoice',
            file_path: '/reports/report-existing.docx',
            generated_at: '2024-06-01T10:00:00.000Z',
            form_name: 'Invoice Form',
            generated_by: 'admin-id',
            generated_by_username: 'admin',
            input_values: '{}',
        };

        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialReports: [existingReport],
            }),
        });
        await page.goto('/#/reports');

        await expect(page.getByText('Invoice Form')).toBeVisible();
    });
});

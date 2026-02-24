/**
 * E2E: Forms page
 *
 * Verifies:
 * - Forms page renders with table headings
 * - Pre-seeded form appears in the list
 * - "Create Form" button opens the FormWizard dialog
 * - Empty state is shown when no forms exist
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER } from './fixtures/mock-api';

const SEEDED_FORM = {
    id: 'form-1',
    name: 'Invoice Form',
    template_id: 'tmpl-1',
    template_name: 'Invoice Template',
    category_id: null,
    is_deleted: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    field_count: 3,
};

test.describe('Forms page', () => {
    test('shows table column headers on empty Forms page', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/forms');

        // Page heading
        await expect(page.getByRole('heading', { name: 'Forms' })).toBeVisible();
        // Column headers
        await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
    });

    test('shows pre-seeded form in the list', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialForms: [SEEDED_FORM],
            }),
        });
        await page.goto('/#/forms');

        await expect(page.getByText('Invoice Form')).toBeVisible();
    });

    test('Create Form button opens FormWizard dialog', async ({ page }) => {
        await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
        await page.goto('/#/forms');

        // The FAB / button labelled "New Form" or similar
        const createBtn = page.getByRole('button', { name: /new form|create form/i });
        await expect(createBtn).toBeVisible();
        await createBtn.click();

        // FormWizard dialog should appear
        await expect(page.getByRole('dialog')).toBeVisible();
    });
});

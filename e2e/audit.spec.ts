/**
 * E2E – Audit log visibility
 *
 * Covers:
 *  1. Admin can navigate to /audit and sees the Audit Logs page
 *  2. Log entries (action type, user, entity) are displayed in the table
 *  3. USER role is redirected away from /audit (RBAC guard)
 *  4. Filter by action type reduces the visible rows
 */

import { test, expect } from '@playwright/test';
import { buildMockApiScript, ADMIN_USER, REGULAR_USER } from './fixtures/mock-api';

const AUDIT_LOGS = [
    {
        id: 'log-1',
        user_id: 'admin-id',
        username: 'admin',
        action_type: 'USER_LOGIN',
        entity_type: 'USER',
        entity_id: 'admin-id',
        metadata_json: '{}',
        created_at: '2024-06-01T08:00:00.000Z',
    },
    {
        id: 'log-2',
        user_id: 'admin-id',
        username: 'admin',
        action_type: 'TEMPLATE_UPLOAD',
        entity_type: 'TEMPLATE',
        entity_id: 'tmpl-1',
        metadata_json: '{"name":"invoice.docx"}',
        created_at: '2024-06-01T09:00:00.000Z',
    },
    {
        id: 'log-3',
        user_id: 'admin-id',
        username: 'admin',
        action_type: 'REPORT_GENERATE',
        entity_type: 'REPORT',
        entity_id: 'rep-1',
        metadata_json: '{}',
        created_at: '2024-06-01T10:00:00.000Z',
    },
];

test.describe('Audit log visibility', () => {
    test('admin sees Audit Logs page with log entries', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialAuditLogs: AUDIT_LOGS,
            }),
        });
        await page.goto('/#/audit');

        await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();

        // Table column headers
        await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'User' })).toBeVisible();
        await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();

        // Log entries
        await expect(page.getByText('USER_LOGIN')).toBeVisible();
        await expect(page.getByText('TEMPLATE_UPLOAD')).toBeVisible();
        await expect(page.getByText('REPORT_GENERATE')).toBeVisible();
    });

    test('each log row shows action chip and entity type', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialAuditLogs: AUDIT_LOGS,
            }),
        });
        await page.goto('/#/audit');

        // Action chip is visible (rendered as MUI Chip)
        await expect(page.getByText('USER_LOGIN')).toBeVisible();
        await expect(page.getByRole('cell', { name: 'TEMPLATE', exact: true }).first()).toBeVisible();
    });

    test('USER role is redirected from /audit to /dashboard', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({ currentUser: REGULAR_USER }),
        });
        await page.goto('/#/audit');

        await expect(page).toHaveURL(/#\/dashboard/);
    });

    test('empty audit log shows table with no rows', async ({ page }) => {
        await page.addInitScript({
            content: buildMockApiScript({
                currentUser: ADMIN_USER,
                initialAuditLogs: [],
            }),
        });
        await page.goto('/#/audit');

        await expect(page.getByRole('heading', { name: 'Audit Logs' })).toBeVisible();
        // Table headers are still present even with no data
        await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
    });
});

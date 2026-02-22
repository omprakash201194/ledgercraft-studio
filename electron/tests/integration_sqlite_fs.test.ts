/**
 * SQLite + File System Integration Tests
 *
 * Uses a REAL SQLite database in a temporary directory and REAL file system
 * operations. Mocks only electron (app.getPath), auth (getCurrentUser), and
 * docx rendering (PizZip/Docxtemplater) to keep the focus on DB + FS behaviour.
 *
 * Tests:
 *  1. SQLite initializes with WAL mode on a real database file
 *  2. All schema tables are present after initialization
 *  3. Soft delete filtering — rows are retained but hidden from active queries
 *  4. Report generation writes a file to the file system and creates a DB record
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';

// ─── Temp directory — must be hoisted so vi.mock factories can reference it ───
/* eslint-disable @typescript-eslint/no-require-imports */
const { TMP_DIR } = vi.hoisted(() => {
    const _fs = require('fs') as typeof import('fs');
    const _path = require('path') as typeof import('path');
    const _os = require('os') as typeof import('os');
    return { TMP_DIR: _fs.mkdtempSync(_path.join(_os.tmpdir(), 'ledgercraft-it-')) };
});
/* eslint-enable @typescript-eslint/no-require-imports */

// ─── Mocks (must be declared before importing anything they intercept) ────────

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn((_key: string) => TMP_DIR),
    },
}));

// Bypass bcrypt so login works without real hashing
vi.mock('bcryptjs', () => ({
    default: {
        compareSync: vi.fn((plain: string, stored: string) => plain === stored),
        genSaltSync: vi.fn(() => 'salt'),
        hashSync: vi.fn((plain: string) => plain),
    },
    compareSync: vi.fn((plain: string, stored: string) => plain === stored),
    genSaltSync: vi.fn(() => 'salt'),
    hashSync: vi.fn((plain: string) => plain),
}));

// Suppress audit log DB writes — they're tested in audit_service.test.ts
vi.mock('../auditService', () => ({
    logAction: vi.fn(),
}));

// Mock PizZip / Docxtemplater — docx parsing is covered in template_utils.test.ts
// Here we test SQLite DB writes + real file system writes, not docx rendering.
const mockDocRender = vi.fn();
const mockDocGenerate = vi.fn(() => Buffer.from('INTEGRATION-TEST-DOCX-OUTPUT'));

vi.mock('pizzip', () => ({
    default: class { constructor() {} },
}));

vi.mock('docxtemplater', () => ({
    default: class {
        render(data: Record<string, string>) { mockDocRender(data); }
        getZip() { return { generate: mockDocGenerate }; }
    },
}));

// ─── Real imports (database + services use real SQLite and real fs) ───────────

import { database } from '../database';
import { login, logout } from '../auth';
import { generateReport } from '../reportService';

// ─── Test suite ───────────────────────────────────────────────────────────────

describe('SQLite + File System Integration Tests', () => {

    // IDs shared across tests
    const userId = 'it-user-1';
    const templateId = 'it-tmpl-1';
    const formId_ref = { id: '' }; // filled in test 3

    beforeAll(() => {
        // 1. Create storage subdirectories
        fs.mkdirSync(path.join(TMP_DIR, 'templates'), { recursive: true });
        fs.mkdirSync(path.join(TMP_DIR, 'reports'), { recursive: true });

        // 2. Initialise a real SQLite DB in TMP_DIR
        database.initialize(TMP_DIR);

        // 3. Seed a user directly (bcrypt mock returns plain password as hash)
        const db = database.getConnection();
        db.prepare(
            'INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)'
        ).run(userId, 'admin', 'admin123', 'ADMIN', new Date().toISOString());

        // 4. Authenticate so getCurrentUser() is non-null throughout
        login('admin', 'admin123');
    });

    afterAll(() => {
        logout();
        database.close();
        fs.rmSync(TMP_DIR, { recursive: true, force: true });
    });

    // ─── 1. WAL mode ──────────────────────────────────────────────────────────

    it('1. should initialize SQLite with WAL mode', () => {
        const db = database.getConnection();
        const journalMode = db.pragma('journal_mode', { simple: true }) as string;
        expect(journalMode).toBe('wal');
    });

    // ─── 2. Schema ────────────────────────────────────────────────────────────

    it('2. should create all required schema tables', () => {
        const db = database.getConnection();
        const tables = db.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ).all() as { name: string }[];
        const tableNames = tables.map(t => t.name);

        for (const required of ['users', 'templates', 'forms', 'form_fields', 'reports', 'audit_logs', 'categories', 'client_types', 'clients']) {
            expect(tableNames).toContain(required);
        }
    });

    // ─── 3. Soft delete filtering ─────────────────────────────────────────────

    it('3. should enforce soft delete filtering accurately', () => {
        const db = database.getConnection();

        // Insert template FIRST so the FK constraint on forms.template_id is satisfied
        const templateFilePath = path.join(TMP_DIR, 'templates', 'soft-delete-test.docx');
        fs.writeFileSync(templateFilePath, Buffer.from('placeholder-docx'));

        db.prepare(
            'INSERT INTO templates (id, name, file_path, created_at) VALUES (?, ?, ?, ?)'
        ).run(templateId, 'Soft Delete Test Template', templateFilePath, new Date().toISOString());

        // Now create the form (template exists → FK satisfied)
        const form = database.createForm(
            { name: 'Soft Delete Form', template_id: templateId, category_id: null },
            []
        );
        formId_ref.id = form.id;

        // Soft-delete the form
        db.prepare('UPDATE forms SET is_deleted = 1 WHERE id = ?').run(form.id);

        // Row still exists in DB (soft delete preserves data)
        interface FormRow { id: string; is_deleted: number; name: string; }
        const rawRow = db.prepare('SELECT * FROM forms WHERE id = ?').get(form.id) as FormRow;
        expect(rawRow).toBeDefined();
        expect(rawRow.is_deleted).toBe(1);

        // Active query (is_deleted = 0) returns nothing
        const activeRow = db.prepare('SELECT * FROM forms WHERE is_deleted = 0 AND id = ?').get(form.id);
        expect(activeRow).toBeUndefined();
    });

    // ─── 4. Report generation ─────────────────────────────────────────────────

    it('4. should generate report, preserve template, and save properly to the file system', () => {
        const db = database.getConnection();

        // Template record already in DB from test 3 (templateId = 'it-tmpl-1')
        // Ensure the template FILE exists on disk (created in test 3)
        const templateFilePath = path.join(TMP_DIR, 'templates', 'soft-delete-test.docx');
        expect(fs.existsSync(templateFilePath)).toBe(true);

        // Create an active (not soft-deleted) form referencing the template
        const form = database.createForm(
            { name: 'Report Generation Form', template_id: templateId, category_id: null },
            [
                {
                    label: 'Client Name',
                    field_key: 'client_name',
                    data_type: 'text',
                    required: 1,
                    placeholder_mapping: 'CLIENT_NAME',
                    options_json: null,
                    format_options: null,
                }
            ]
        );

        // Generate a report for the form
        const result = generateReport({
            form_id: form.id,
            values: { client_name: 'Integration Test Corp' },
        });

        // ASSERT: generation succeeded
        expect(result.success).toBe(true);
        expect(result.report).toBeDefined();

        // ASSERT: report file was written to the reports directory
        expect(fs.existsSync(result.report!.file_path)).toBe(true);

        // ASSERT: file is under the reports sub-directory
        expect(result.report!.file_path.startsWith(path.join(TMP_DIR, 'reports'))).toBe(true);

        // ASSERT: DB record was created for the report
        interface ReportRow { id: string; form_id: string; generated_by: string; file_path: string; }
        const dbRecord = db.prepare('SELECT * FROM reports WHERE id = ?').get(result.report!.id) as ReportRow;
        expect(dbRecord).toBeDefined();
        expect(dbRecord.form_id).toBe(form.id);
        expect(dbRecord.generated_by).toBe(userId);

        // ASSERT: template file is preserved (report generation must NOT modify it)
        expect(fs.existsSync(templateFilePath)).toBe(true);

        // ASSERT: placeholder values were rendered
        expect(mockDocRender).toHaveBeenCalledWith(
            expect.objectContaining({ CLIENT_NAME: 'Integration Test Corp' })
        );
    });
});

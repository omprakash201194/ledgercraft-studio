
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { uploadTemplate } from '../templateService';
import { mirrorCategoryHierarchy } from '../categoryService';

// Hoist mockDb
const { mockDb } = vi.hoisted(() => {
    return {
        mockDb: {
            initialize: vi.fn(),
            close: vi.fn(),
            getConnection: vi.fn(),
            createCategory: vi.fn(),
            getCategoryById: vi.fn(),
            createTemplate: vi.fn(),
            createPlaceholder: vi.fn(),
            createForm: vi.fn(),
            getFormsWithDetails: vi.fn(),
            getPlaceholdersByTemplateId: vi.fn(),
            getAllCategoriesByType: vi.fn(),
            // getCategoryChain is NOT on database object, so we don't mock it here
        }
    };
});

// Mock database
vi.mock('../database', () => ({
    database: mockDb
}));

// Mock templateUtils
vi.mock('../templateUtils', () => ({
    extractPlaceholders: vi.fn(() => ['MOCKED_PLACEHOLDER']),
}));

// Mock fs
// CJS interop: 'import fs from "fs"' uses the default export in Vitest's module system
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
}));

// Mock getCurrentUser
vi.mock('../auth', () => ({
    getCurrentUser: vi.fn(() => ({ id: 'admin-id', role: 'ADMIN' })),
}));

// Mock app.getPath
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock-data-path'),
    },
}));

// Mock auditService
vi.mock('../auditService', () => ({
    logAction: vi.fn(),
}));

describe('Template Upload Logic (Unit)', () => {

    beforeEach(() => {
        vi.clearAllMocks();

        // Default mocks
        mockDb.createTemplate.mockReturnValue({ id: 'tmpl-1', name: 'Test', created_at: 'now' });
        mockDb.createCategory.mockImplementation((cat: any) => ({ ...cat, id: 'new-cat-id' }));
        mockDb.createForm.mockReturnValue({ id: 'form-1', name: 'Mock Form', created_at: 'now' });
    });

    describe('mirrorCategoryHierarchy', () => {
        it('should mirror a simple category hierarchy', () => {
            // Mock getCategoryById to simulate chain logic in getCategoryChain (which is in categoryService.ts)
            // chain: Invoices (id:3) -> Finance (id:2) -> Root (id:1)
            mockDb.getCategoryById.mockImplementation((id: string) => {
                if (id === '3') return { id: '3', name: 'Invoices', parent_id: '2' };
                if (id === '2') return { id: '2', name: 'Finance', parent_id: '1' };
                if (id === '1') return { id: '1', name: 'Root', parent_id: null };
                return null;
            });

            // Mock DB prepare/get for existing check
            const mockStmt = { get: vi.fn() };
            const mockConn = { prepare: vi.fn(() => mockStmt) };
            mockDb.getConnection.mockReturnValue(mockConn);

            // Scenario: No existing FORM categories
            mockStmt.get.mockReturnValue(undefined);

            // Act
            const result = mirrorCategoryHierarchy('3');

            // Assert
            // 3 createCategory calls: Root, Finance, Invoices
            expect(mockDb.createCategory).toHaveBeenCalledTimes(3);

            expect(mockDb.createCategory).toHaveBeenNthCalledWith(1, expect.objectContaining({ name: 'Root', type: 'FORM', parent_id: null }));
            expect(mockDb.createCategory).toHaveBeenNthCalledWith(2, expect.objectContaining({ name: 'Finance', type: 'FORM', parent_id: 'new-cat-id' }));
            // Note: parent_id 'new-cat-id' comes from the mockDb.createCategory implementation
        });
    });

    describe('uploadTemplate with Auto-Create', () => {
        it('should call createForm with correct params', () => {
            // Mock getCategoryById for mirroring
            mockDb.getCategoryById.mockImplementation((id: string) => {
                if (id === 'template-cat-id') return { id: 'template-cat-id', name: 'TestCat', parent_id: null };
                return null;
            });

            mockDb.getConnection.mockReturnValue({ prepare: vi.fn(() => ({ get: vi.fn() })) });

            // Mock placeholders return for generateFieldsFromTemplate (DB query)
            mockDb.getPlaceholdersByTemplateId.mockReturnValue([
                { id: 'p1', template_id: 'tmpl-1', placeholder_key: 'TEST' }
            ]);

            const buffer = Buffer.from('dummy');

            // Act
            const result = uploadTemplate(buffer, 'MyForm.docx', true, 'template-cat-id');

            // Assert
            expect(result.success).toBe(true);

            // Verify createForm called
            expect(mockDb.createForm).toHaveBeenCalled();
            const callArgs = mockDb.createForm.mock.calls[0][0];
            expect(callArgs.name).toBe('MyForm');
            expect(callArgs.template_id).toBe('tmpl-1');

            // fields should be generated
            const fields = mockDb.createForm.mock.calls[0][1];
            expect(fields).toHaveLength(1);
            expect(fields[0].field_key).toBe('test');
        });

        it('should handle name conflicts', () => {
            const buffer = Buffer.from('dummy');
            mockDb.getCategoryById.mockReturnValue({ id: '1', name: 'TestCat', parent_id: null });

            // Mock placeholders return
            mockDb.getPlaceholdersByTemplateId.mockReturnValue([
                { id: 'p1', template_id: 'tmpl-1', placeholder_key: 'TEST' }
            ]);

            // Mock name check to return TRUE (conflict) for "Conflict"
            const mockStmt = { get: vi.fn() };
            const mockConn = { prepare: vi.fn(() => mockStmt) };
            mockDb.getConnection.mockReturnValue(mockConn);

            // 1st: mirrorCategoryHierarchy check (Category exists)
            // 2nd: checkName("Conflict") -> exists (Conflict)
            // 3rd: checkName("Conflict (Auto)") -> does not exist (OK)
            mockStmt.get
                .mockReturnValueOnce({ id: 'target-cat-id' }) // Category check
                .mockReturnValueOnce({ id: 'existing' })      // First name busy
                .mockReturnValueOnce(undefined);              // Second name free

            // Act
            uploadTemplate(buffer, 'Conflict.docx', true, '1');

            // Assert
            const callArgs = mockDb.createForm.mock.calls[0][0];
            expect(callArgs.name).toBe('Conflict (Auto)');
        });
    });
});

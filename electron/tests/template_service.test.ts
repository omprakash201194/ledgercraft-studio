/**
 * Template Service — Extended tests
 *
 * Covers uncovered lines:
 *  - uploadTemplate() — auth check, write error (outer catch), autoCreateForm path,
 *    double name-conflict (baseName AND "(Auto)" both taken)
 *  - getTemplates() delegation
 *  - getTemplatePlaceholders() delegation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
    mockDb: {
        getConnection: vi.fn(),
        createTemplate: vi.fn(),
        createPlaceholder: vi.fn(),
        getTemplatesWithPlaceholderCount: vi.fn(),
        getPlaceholdersByTemplateId: vi.fn(),
        getCategoryById: vi.fn(),
        createCategory: vi.fn(),
        createForm: vi.fn(),
    },
}));

const mockFs = vi.hoisted(() => ({
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
}));

const mockCurrentUser = vi.hoisted(() => ({ fn: vi.fn() }));
const mockCreateForm = vi.hoisted(() => ({ fn: vi.fn() }));
const mockGenerateFields = vi.hoisted(() => ({ fn: vi.fn(() => []) }));
const mockMirrorCategory = vi.hoisted(() => ({ fn: vi.fn(() => 'form-cat-id') }));

vi.mock('../database', () => ({ database: mockDb }));
vi.mock('../auth', () => ({ getCurrentUser: mockCurrentUser.fn }));
vi.mock('../auditService', () => ({ logAction: vi.fn() }));
vi.mock('../templateUtils', () => ({ extractPlaceholders: vi.fn(() => ['client_name', 'amount']) }));
vi.mock('electron', () => ({ app: { getPath: vi.fn(() => '/mock-data') } }));
vi.mock('fs', () => ({ default: mockFs, ...mockFs }));

vi.mock('../formService', () => ({
    createForm: mockCreateForm.fn,
    generateFieldsFromTemplate: mockGenerateFields.fn,
}));
vi.mock('../categoryService', () => ({
    mirrorCategoryHierarchy: mockMirrorCategory.fn,
}));

import { uploadTemplate, getTemplates, getTemplatePlaceholders } from '../templateService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Template Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentUser.fn.mockReturnValue({ id: 'admin-id', role: 'ADMIN' });
        mockFs.existsSync.mockReturnValue(true);
        mockFs.writeFileSync.mockImplementation(() => undefined);
        mockDb.createTemplate.mockReturnValue({
            id: 'tmpl-1',
            name: 'invoice.docx',
            file_path: '/mock-data/templates/abc.docx',
            created_at: '2024-01-01T00:00:00.000Z',
        });
        mockDb.createPlaceholder.mockReturnValue(undefined);
        mockCreateForm.fn.mockReturnValue({ id: 'form-1' });
        mockGenerateFields.fn.mockReturnValue([]);
        mockMirrorCategory.fn.mockReturnValue('form-cat-id');
    });

    // ── uploadTemplate() ──────────────────────────────────────────────────────

    describe('uploadTemplate()', () => {
        it('returns failure when caller is not ADMIN', () => {
            mockCurrentUser.fn.mockReturnValue({ id: 'u1', role: 'USER' });

            const result = uploadTemplate(Buffer.from('test'), 'doc.docx');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('returns failure when caller is not authenticated', () => {
            mockCurrentUser.fn.mockReturnValue(null);

            const result = uploadTemplate(Buffer.from('test'), 'doc.docx');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('creates template directory when it does not exist', () => {
            mockFs.existsSync.mockReturnValue(false);

            uploadTemplate(Buffer.from('content'), 'invoice.docx');

            expect(mockFs.mkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('templates'),
                expect.objectContaining({ recursive: true })
            );
        });

        it('skips mkdir when templates directory already exists', () => {
            mockFs.existsSync.mockReturnValue(true);

            uploadTemplate(Buffer.from('content'), 'invoice.docx');

            expect(mockFs.mkdirSync).not.toHaveBeenCalled();
        });

        it('returns success with placeholders on happy path', () => {
            const result = uploadTemplate(Buffer.from('content'), 'invoice.docx');

            expect(result.success).toBe(true);
            expect(result.template).toBeDefined();
            expect(result.template?.name).toBe('invoice.docx');
            expect(result.template?.placeholders).toEqual(['client_name', 'amount']);
            expect(mockDb.createPlaceholder).toHaveBeenCalledTimes(2);
        });

        it('catches and returns failure on write error', () => {
            mockFs.writeFileSync.mockImplementation(() => {
                throw new Error('disk full');
            });

            const result = uploadTemplate(Buffer.from('content'), 'bad.docx');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/disk full/i);
        });

        it('calls createForm when autoCreateForm=true', () => {
            // When no categoryId, code calls database.getConnection() to check name conflicts
            const mockStmt = { get: vi.fn(() => undefined) }; // name not taken
            mockDb.getConnection.mockReturnValue({ prepare: vi.fn(() => mockStmt) });

            const result = uploadTemplate(Buffer.from('content'), 'invoice.docx', true);

            expect(result.success).toBe(true);
            expect(mockCreateForm.fn).toHaveBeenCalled();
        });

        it('does NOT call createForm when autoCreateForm=false (default)', () => {
            uploadTemplate(Buffer.from('content'), 'invoice.docx', false);

            expect(mockCreateForm.fn).not.toHaveBeenCalled();
        });

        it('continues success if autoCreateForm throws internally', () => {
            mockCreateForm.fn.mockImplementation(() => {
                throw new Error('form creation failed');
            });

            const result = uploadTemplate(Buffer.from('content'), 'invoice.docx', true);

            // Template upload still succeeds even if form creation fails
            expect(result.success).toBe(true);
        });

        it('handles double name conflict (baseName AND "(Auto)" both taken)', () => {
            const mockStmt = { get: vi.fn() };
            mockDb.getConnection.mockReturnValue({ prepare: vi.fn(() => mockStmt) });

            // First call: baseName exists; second call: "(Auto)" also exists
            mockStmt.get
                .mockReturnValueOnce({ id: 'existing-1' })   // baseName taken
                .mockReturnValueOnce({ id: 'existing-2' });  // "(Auto)" taken

            uploadTemplate(Buffer.from('content'), 'Invoice.docx', true, null);

            expect(mockCreateForm.fn).toHaveBeenCalled();
            const formName: string = mockCreateForm.fn.mock.calls[0][0].name;
            // Should have fallen back to timestamped name
            expect(formName).toMatch(/Invoice.*Auto/i);
        });

        it('stores categoryId on template when provided', () => {
            uploadTemplate(Buffer.from('content'), 'invoice.docx', false, 'cat-123');

            expect(mockDb.createTemplate).toHaveBeenCalledWith(
                expect.objectContaining({ category_id: 'cat-123' })
            );
        });
    });

    // ── getTemplates() ────────────────────────────────────────────────────────

    describe('getTemplates()', () => {
        it('delegates to database.getTemplatesWithPlaceholderCount()', () => {
            const mockList = [{ id: 't1', name: 'invoice.docx', placeholder_count: 3 }];
            mockDb.getTemplatesWithPlaceholderCount.mockReturnValue(mockList);

            const result = getTemplates();

            expect(result).toBe(mockList);
            expect(mockDb.getTemplatesWithPlaceholderCount).toHaveBeenCalledOnce();
        });
    });

    // ── getTemplatePlaceholders() ─────────────────────────────────────────────

    describe('getTemplatePlaceholders()', () => {
        it('delegates to database.getPlaceholdersByTemplateId()', () => {
            const mockPlaceholders = [
                { id: 'p1', template_id: 'tmpl-1', placeholder_key: 'client_name' },
            ];
            mockDb.getPlaceholdersByTemplateId.mockReturnValue(mockPlaceholders);

            const result = getTemplatePlaceholders('tmpl-1');

            expect(result).toBe(mockPlaceholders);
            expect(mockDb.getPlaceholdersByTemplateId).toHaveBeenCalledWith('tmpl-1');
        });
    });
});

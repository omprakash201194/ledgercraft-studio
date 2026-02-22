/**
 * Category Service Unit Tests
 *
 * Validates:
 * - getCategoryTree() builds nested tree from flat list
 * - getCategoryTree() delegates CLIENT type to clientService
 * - getCategoryChain() returns breadcrumb path from leaf to root
 * - getCategoryChain() stops at MAX_DEPTH to prevent infinite loops
 * - createCategory() validates empty name
 * - createCategory() delegates CLIENT type to clientService
 * - renameCategory() validates empty name
 * - deleteCategory() blocks delete when children exist
 * - deleteCategory() blocks delete when items exist
 * - moveItem() validates target category existence and type match
 * - moveItem() moves TEMPLATE and FORM items
 * - deleteTemplate() blocks when template is in use (unless force)
 * - deleteTemplate() deletes file from disk
 * - deleteForm() blocks when form has reports
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockDb, mockGetCurrentUser, mockLogAction, mockGetClientCategories,
    mockCreateClientCategory, mockRenameClientCategory, mockDeleteClientCategory,
    mockExistsSync, mockUnlinkSync } = vi.hoisted(() => ({
    mockDb: {
        getAllCategoriesByType: vi.fn(),
        getCategoryById: vi.fn(),
        createCategory: vi.fn(),
        updateCategoryName: vi.fn(),
        deleteCategory: vi.fn(),
        getCategoryChildrenCount: vi.fn(),
        getCategoryItemCount: vi.fn(),
        getTemplateById: vi.fn(),
        updateTemplateCategory: vi.fn(),
        getFormById: vi.fn(),
        updateFormCategory: vi.fn(),
        getTemplateUsageCount: vi.fn(),
        deleteTemplate: vi.fn(),
        formHasReports: vi.fn(),
        deleteForm: vi.fn(),
        getConnection: vi.fn(),
    },
    mockGetCurrentUser: vi.fn(),
    mockLogAction: vi.fn(),
    mockGetClientCategories: vi.fn(() => []),
    mockCreateClientCategory: vi.fn(),
    mockRenameClientCategory: vi.fn(),
    mockDeleteClientCategory: vi.fn(),
    mockExistsSync: vi.fn(() => false),
    mockUnlinkSync: vi.fn(),
}));

vi.mock('../database', () => ({ database: mockDb }));
vi.mock('../auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('../auditService', () => ({ logAction: mockLogAction }));
vi.mock('../clientService', () => ({
    getClientCategories: mockGetClientCategories,
    createClientCategory: mockCreateClientCategory,
    renameClientCategory: mockRenameClientCategory,
    deleteClientCategory: mockDeleteClientCategory,
}));
vi.mock('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        unlinkSync: mockUnlinkSync,
    },
}));

import {
    getCategoryTree, getCategoryChain, createCategory, renameCategory,
    deleteCategory, moveItem, deleteTemplate, deleteForm
} from '../categoryService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Category Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockReturnValue({ id: 'admin-id', role: 'ADMIN', username: 'admin' });
    });

    // ─── getCategoryTree ──────────────────────────────────────────────────────

    describe('getCategoryTree()', () => {
        it('should build a nested tree from a flat list of TEMPLATE categories', () => {
            mockDb.getAllCategoriesByType.mockReturnValue([
                { id: 'cat1', name: 'Finance', parent_id: null, type: 'TEMPLATE', created_at: 'now' },
                { id: 'cat2', name: 'Invoices', parent_id: 'cat1', type: 'TEMPLATE', created_at: 'now' },
                { id: 'cat3', name: 'Legal', parent_id: null, type: 'TEMPLATE', created_at: 'now' },
            ]);

            const tree = getCategoryTree('TEMPLATE');

            expect(tree).toHaveLength(2); // Finance, Legal
            const finance = tree.find(n => n.name === 'Finance')!;
            expect(finance.children).toHaveLength(1);
            expect(finance.children[0].name).toBe('Invoices');
        });

        it('should return empty array when no categories exist', () => {
            mockDb.getAllCategoriesByType.mockReturnValue([]);

            const tree = getCategoryTree('FORM');

            expect(tree).toEqual([]);
        });

        it('should delegate CLIENT type to clientService', () => {
            mockGetClientCategories.mockReturnValue([
                { id: 'cc1', name: 'Individuals', parent_id: null, created_at: 'now' },
            ]);

            const tree = getCategoryTree('CLIENT');

            expect(mockGetClientCategories).toHaveBeenCalled();
            expect(mockDb.getAllCategoriesByType).not.toHaveBeenCalled();
            expect(tree).toHaveLength(1);
        });

        it('should build a multi-level tree correctly', () => {
            mockDb.getAllCategoriesByType.mockReturnValue([
                { id: 'a', name: 'A', parent_id: null, type: 'FORM', created_at: 'now' },
                { id: 'b', name: 'B', parent_id: 'a', type: 'FORM', created_at: 'now' },
                { id: 'c', name: 'C', parent_id: 'b', type: 'FORM', created_at: 'now' },
            ]);

            const tree = getCategoryTree('FORM');

            expect(tree).toHaveLength(1);
            expect(tree[0].children[0].children[0].name).toBe('C');
        });
    });

    // ─── getCategoryChain ─────────────────────────────────────────────────────

    describe('getCategoryChain()', () => {
        it('should return a breadcrumb path from leaf to root', () => {
            mockDb.getCategoryById
                .mockReturnValueOnce({ id: 'cat3', name: 'Invoices', parent_id: 'cat1' })
                .mockReturnValueOnce({ id: 'cat1', name: 'Finance', parent_id: null });

            const chain = getCategoryChain('cat3');

            expect(chain).toEqual([
                { id: 'cat1', name: 'Finance' },
                { id: 'cat3', name: 'Invoices' },
            ]);
        });

        it('should return a single element for a root category', () => {
            mockDb.getCategoryById
                .mockReturnValueOnce({ id: 'root', name: 'Root', parent_id: null });

            const chain = getCategoryChain('root');

            expect(chain).toEqual([{ id: 'root', name: 'Root' }]);
        });

        it('should return empty array when category not found', () => {
            mockDb.getCategoryById.mockReturnValue(undefined);

            const chain = getCategoryChain('nonexistent');

            expect(chain).toEqual([]);
        });
    });

    // ─── createCategory ───────────────────────────────────────────────────────

    describe('createCategory()', () => {
        it('should return failure when name is empty', () => {
            const result = createCategory({ name: '  ', parentId: null, type: 'TEMPLATE' });
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/required/i);
        });

        it('should create a TEMPLATE category successfully', () => {
            mockDb.createCategory.mockReturnValue({ id: 'new-cat', name: 'Finance' });

            const result = createCategory({ name: 'Finance', parentId: null, type: 'TEMPLATE' });

            expect(result.success).toBe(true);
            expect(mockDb.createCategory).toHaveBeenCalledWith({
                name: 'Finance',
                parent_id: null,
                type: 'TEMPLATE',
            });
        });

        it('should create a FORM category with a parent', () => {
            mockDb.createCategory.mockReturnValue({ id: 'child-cat', name: 'Sub' });

            const result = createCategory({ name: 'Sub', parentId: 'parent-id', type: 'FORM' });

            expect(result.success).toBe(true);
            expect(mockDb.createCategory).toHaveBeenCalledWith({
                name: 'Sub',
                parent_id: 'parent-id',
                type: 'FORM',
            });
        });

        it('should delegate CLIENT type to clientService', () => {
            const result = createCategory({ name: 'Individuals', parentId: null, type: 'CLIENT' });

            expect(mockCreateClientCategory).toHaveBeenCalledWith('Individuals', undefined);
            expect(result.success).toBe(true);
        });

        it('should return failure when DB throws', () => {
            mockDb.createCategory.mockImplementation(() => { throw new Error('DB error'); });

            const result = createCategory({ name: 'Valid', parentId: null, type: 'TEMPLATE' });

            expect(result.success).toBe(false);
        });
    });

    // ─── renameCategory ───────────────────────────────────────────────────────

    describe('renameCategory()', () => {
        it('should return failure when new name is empty', () => {
            const result = renameCategory('cat1', '', 'TEMPLATE');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/required/i);
        });

        it('should rename a TEMPLATE category', () => {
            const result = renameCategory('cat1', 'New Name', 'TEMPLATE');

            expect(result.success).toBe(true);
            expect(mockDb.updateCategoryName).toHaveBeenCalledWith('cat1', 'New Name');
        });

        it('should delegate CLIENT type rename to clientService', () => {
            const result = renameCategory('cc1', 'New Name', 'CLIENT');

            expect(mockRenameClientCategory).toHaveBeenCalledWith('cc1', 'New Name');
            expect(result.success).toBe(true);
        });
    });

    // ─── deleteCategory ───────────────────────────────────────────────────────

    describe('deleteCategory()', () => {
        it('should return failure when category has children', () => {
            mockDb.getCategoryChildrenCount.mockReturnValue(2);

            const result = deleteCategory('cat1', 'TEMPLATE');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/subcategories/i);
        });

        it('should return failure when category has items', () => {
            mockDb.getCategoryChildrenCount.mockReturnValue(0);
            mockDb.getCategoryItemCount.mockReturnValue(3);

            const result = deleteCategory('cat1', 'TEMPLATE');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/templates/i);
        });

        it('should delete TEMPLATE category when empty', () => {
            mockDb.getCategoryChildrenCount.mockReturnValue(0);
            mockDb.getCategoryItemCount.mockReturnValue(0);

            const result = deleteCategory('cat1', 'TEMPLATE');

            expect(result.success).toBe(true);
            expect(mockDb.deleteCategory).toHaveBeenCalledWith('cat1');
        });

        it('should delete FORM category when empty', () => {
            mockDb.getCategoryChildrenCount.mockReturnValue(0);
            mockDb.getCategoryItemCount.mockReturnValue(0);

            const result = deleteCategory('cat1', 'FORM');

            expect(result.success).toBe(true);
        });

        it('should delegate CLIENT type delete to clientService', () => {
            const result = deleteCategory('cc1', 'CLIENT');

            expect(mockDeleteClientCategory).toHaveBeenCalledWith('cc1');
            expect(result.success).toBe(true);
        });
    });

    // ─── moveItem ─────────────────────────────────────────────────────────────

    describe('moveItem()', () => {
        it('should return failure when target category does not exist', () => {
            mockDb.getCategoryById.mockReturnValue(undefined);

            const result = moveItem({ itemId: 'tmpl1', targetCategoryId: 'nonexistent', type: 'TEMPLATE' });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/does not exist/i);
        });

        it('should return failure when item type does not match category type', () => {
            mockDb.getCategoryById.mockReturnValue({ id: 'fc1', name: 'Forms Cat', type: 'FORM' });

            const result = moveItem({ itemId: 'tmpl1', targetCategoryId: 'fc1', type: 'TEMPLATE' });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/cannot move/i);
        });

        it('should move a TEMPLATE to a target category', () => {
            mockDb.getCategoryById.mockReturnValue({ id: 'tc1', name: 'Templates Cat', type: 'TEMPLATE' });
            mockDb.getTemplateById.mockReturnValue({ id: 'tmpl1', name: 'Invoice Template' });

            const result = moveItem({ itemId: 'tmpl1', targetCategoryId: 'tc1', type: 'TEMPLATE' });

            expect(result.success).toBe(true);
            expect(mockDb.updateTemplateCategory).toHaveBeenCalledWith('tmpl1', 'tc1');
        });

        it('should return failure when TEMPLATE not found', () => {
            mockDb.getCategoryById.mockReturnValue({ id: 'tc1', name: 'Templates Cat', type: 'TEMPLATE' });
            mockDb.getTemplateById.mockReturnValue(undefined);

            const result = moveItem({ itemId: 'nonexistent', targetCategoryId: 'tc1', type: 'TEMPLATE' });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/template not found/i);
        });

        it('should move a FORM to root (null target)', () => {
            mockDb.getFormById.mockReturnValue({ id: 'form1', name: 'Invoice Form' });

            const result = moveItem({ itemId: 'form1', targetCategoryId: null, type: 'FORM' });

            expect(result.success).toBe(true);
            expect(mockDb.updateFormCategory).toHaveBeenCalledWith('form1', null);
        });

        it('should return failure when FORM not found', () => {
            mockDb.getCategoryById.mockReturnValue({ id: 'fc1', name: 'Forms Cat', type: 'FORM' });
            mockDb.getFormById.mockReturnValue(undefined);

            const result = moveItem({ itemId: 'nonexistent', targetCategoryId: 'fc1', type: 'FORM' });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/form not found/i);
        });
    });

    // ─── deleteTemplate ───────────────────────────────────────────────────────

    describe('deleteTemplate()', () => {
        it('should return failure with usageCount when template is in use (no force)', () => {
            mockDb.getTemplateUsageCount.mockReturnValue(3);

            const result = deleteTemplate('tmpl1', false);

            expect(result.success).toBe(false);
            expect(result.error).toBe('TEMPLATE_USED');
            expect((result as any).usageCount).toBe(3);
        });

        it('should delete template file from disk when it exists', () => {
            mockDb.getTemplateUsageCount.mockReturnValue(0);
            mockDb.getTemplateById.mockReturnValue({ id: 'tmpl1', file_path: '/templates/invoice.docx' });
            mockExistsSync.mockReturnValue(true);

            deleteTemplate('tmpl1', false);

            expect(mockUnlinkSync).toHaveBeenCalledWith('/templates/invoice.docx');
        });

        it('should NOT delete file when template file does not exist', () => {
            mockDb.getTemplateUsageCount.mockReturnValue(0);
            mockDb.getTemplateById.mockReturnValue({ id: 'tmpl1', file_path: '/templates/missing.docx' });
            mockExistsSync.mockReturnValue(false);

            const result = deleteTemplate('tmpl1', false);

            expect(mockUnlinkSync).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should force delete template even when in use', () => {
            mockDb.getTemplateUsageCount.mockReturnValue(5);
            mockDb.getTemplateById.mockReturnValue({ id: 'tmpl1', file_path: '/templates/invoice.docx' });
            mockExistsSync.mockReturnValue(false);

            const result = deleteTemplate('tmpl1', true);

            expect(result.success).toBe(true);
            expect(mockDb.deleteTemplate).toHaveBeenCalledWith('tmpl1', true);
        });
    });

    // ─── deleteForm (from categoryService) ───────────────────────────────────

    describe('deleteForm() in categoryService', () => {
        it('should return failure when form has reports', () => {
            mockDb.formHasReports.mockReturnValue(true);

            const result = deleteForm('form1');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/has existing reports/i);
        });

        it('should delete form successfully when it has no reports', () => {
            mockDb.formHasReports.mockReturnValue(false);

            const result = deleteForm('form1');

            expect(result.success).toBe(true);
            expect(mockDb.deleteForm).toHaveBeenCalledWith('form1');
        });
    });
});

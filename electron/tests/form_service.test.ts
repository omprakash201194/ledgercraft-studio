/**
 * Form Service Unit Tests
 *
 * Validates:
 * - createForm() — ADMIN-only, empty name, empty fields, duplicate placeholder mappings
 * - createForm() — successful creation with field conversion
 * - deleteForm() — auth check, ADMIN-only, form not found, soft delete, hard delete with file cleanup
 * - updateForm() — ADMIN-only, duplicate mappings, successful update
 * - getForms() — delegates to database
 * - getFormById() — returns form or null
 * - getFormFields() — returns fields array
 * - generateFieldsFromTemplate() — heuristic type detection and label formatting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockDb, mockGetCurrentUser, mockLogAction, mockExistsSync, mockUnlinkSync, mockPrepareResult } = vi.hoisted(() => {
    const mockPrepareResult = { all: vi.fn(() => []), run: vi.fn() };
    return {
        mockDb: {
            createForm: vi.fn(),
            getFormById: vi.fn(),
            getFormFields: vi.fn(),
            getFormsWithDetails: vi.fn(),
            updateForm: vi.fn(),
            deleteForm: vi.fn(),
            getPlaceholdersByTemplateId: vi.fn(),
            getConnection: vi.fn(() => ({ prepare: vi.fn(() => mockPrepareResult) })),
        },
        mockGetCurrentUser: vi.fn(),
        mockLogAction: vi.fn(),
        mockExistsSync: vi.fn(() => false),
        mockUnlinkSync: vi.fn(),
        mockPrepareResult,
    };
});

vi.mock('../database', () => ({ database: mockDb }));
vi.mock('../auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('../auditService', () => ({ logAction: mockLogAction }));
vi.mock('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        unlinkSync: mockUnlinkSync,
    },
}));

import {
    createForm, deleteForm, updateForm, getForms, getFormById,
    getFormFields, generateFieldsFromTemplate
} from '../formService';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const adminUser = { id: 'admin-id', username: 'admin', role: 'ADMIN' };
const regularUser = { id: 'user-id', username: 'user1', role: 'USER' };

const sampleField = {
    label: 'Client Name',
    field_key: 'client_name',
    data_type: 'text',
    required: true,
    placeholder_mapping: 'CLIENT_NAME',
    options_json: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Form Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockReturnValue(adminUser);
    });

    // ─── createForm ───────────────────────────────────────────────────────────

    describe('createForm()', () => {
        it('should return failure when user is not logged in', () => {
            mockGetCurrentUser.mockReturnValue(null);

            const result = createForm({ name: 'Test', template_id: 'tmpl1', fields: [sampleField] });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('should return failure for non-ADMIN user', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);

            const result = createForm({ name: 'Test', template_id: 'tmpl1', fields: [sampleField] });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('should return failure when form name is empty', () => {
            const result = createForm({ name: '  ', template_id: 'tmpl1', fields: [sampleField] });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/form name is required/i);
        });

        it('should return failure when no fields provided', () => {
            const result = createForm({ name: 'Invoice Form', template_id: 'tmpl1', fields: [] });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/at least one field/i);
        });

        it('should return failure when placeholder mappings are duplicated', () => {
            const fields = [
                { ...sampleField, placeholder_mapping: 'SAME_KEY' },
                { ...sampleField, field_key: 'other', placeholder_mapping: 'SAME_KEY' },
            ];

            const result = createForm({ name: 'Invoice', template_id: 'tmpl1', fields });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/unique/i);
        });

        it('should create form successfully with valid input', () => {
            const mockForm = { id: 'form-1', name: 'Invoice Form', template_id: 'tmpl1', created_at: 'now' };
            mockDb.createForm.mockReturnValue(mockForm);

            const result = createForm({ name: 'Invoice Form', template_id: 'tmpl1', fields: [sampleField] });

            expect(result.success).toBe(true);
            expect(result.form).toEqual(mockForm);
            expect(mockDb.createForm).toHaveBeenCalledWith(
                { name: 'Invoice Form', template_id: 'tmpl1', category_id: undefined },
                expect.arrayContaining([
                    expect.objectContaining({ label: 'Client Name', required: 1 })
                ])
            );
        });

        it('should convert boolean required=false to 0', () => {
            const mockForm = { id: 'form-1', name: 'Invoice Form', template_id: 'tmpl1', created_at: 'now' };
            mockDb.createForm.mockReturnValue(mockForm);

            createForm({
                name: 'Invoice Form',
                template_id: 'tmpl1',
                fields: [{ ...sampleField, required: false }],
            });

            const dbFields = mockDb.createForm.mock.calls[0][1];
            expect(dbFields[0].required).toBe(0);
        });

        it('should log FORM_CREATE action after creation', () => {
            mockDb.createForm.mockReturnValue({ id: 'form-1', name: 'Invoice Form', template_id: 'tmpl1', created_at: 'now' });

            createForm({ name: 'Invoice Form', template_id: 'tmpl1', fields: [sampleField] });

            expect(mockLogAction).toHaveBeenCalledWith(expect.objectContaining({
                actionType: 'FORM_CREATE',
                entityType: 'FORM',
            }));
        });

        it('should allow null placeholder_mappings (no duplication constraint)', () => {
            const fields = [
                { ...sampleField, placeholder_mapping: null },
                { ...sampleField, field_key: 'other_key', placeholder_mapping: null },
            ];
            mockDb.createForm.mockReturnValue({ id: 'f1', name: 'Test', template_id: 't1', created_at: 'now' });

            const result = createForm({ name: 'Test', template_id: 't1', fields });

            expect(result.success).toBe(true);
        });
    });

    // ─── deleteForm ───────────────────────────────────────────────────────────

    describe('deleteForm()', () => {
        it('should return failure when user is not logged in', () => {
            mockGetCurrentUser.mockReturnValue(null);

            const result = deleteForm('form1');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/logged in/i);
        });

        it('should return failure for non-ADMIN user', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);

            const result = deleteForm('form1');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('should return failure when form not found', () => {
            mockDb.getFormById.mockReturnValue(undefined);

            const result = deleteForm('nonexistent');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/form not found/i);
        });

        it('should soft delete a form (default: deleteReports=false)', () => {
            mockDb.getFormById.mockReturnValue({ id: 'form1', name: 'Invoice Form' });

            const result = deleteForm('form1');

            expect(result.success).toBe(true);
            expect(mockDb.deleteForm).toHaveBeenCalledWith('form1', true); // true = soft delete
        });

        it('should hard delete with reports when deleteReports=true', () => {
            mockDb.getFormById.mockReturnValue({ id: 'form1', name: 'Invoice Form' });
            mockPrepareResult.all.mockReturnValue([
                { id: 'r1', file_path: '/reports/report1.docx' },
                { id: 'r2', file_path: '/reports/report2.docx' },
            ]);
            mockExistsSync.mockReturnValue(true);

            const result = deleteForm('form1', true);

            expect(result.success).toBe(true);
            expect(mockUnlinkSync).toHaveBeenCalledTimes(2);
            expect(mockDb.deleteForm).toHaveBeenCalledWith('form1', false); // false = hard delete
        });

        it('should log FORM_DELETE_SOFT action on soft delete', () => {
            mockDb.getFormById.mockReturnValue({ id: 'form1', name: 'Invoice Form' });

            deleteForm('form1', false);

            expect(mockLogAction).toHaveBeenCalledWith(expect.objectContaining({
                actionType: 'FORM_DELETE_SOFT',
            }));
        });

        it('should log FORM_DELETE_HARD action on hard delete', () => {
            mockDb.getFormById.mockReturnValue({ id: 'form1', name: 'Invoice Form' });
            mockPrepareResult.all.mockReturnValue([]);

            deleteForm('form1', true);

            expect(mockLogAction).toHaveBeenCalledWith(expect.objectContaining({
                actionType: 'FORM_DELETE_HARD',
            }));
        });
    });

    // ─── updateForm ───────────────────────────────────────────────────────────

    describe('updateForm()', () => {
        it('should return failure for non-ADMIN user', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);

            const result = updateForm({ id: 'form1', name: 'New Name' });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('should return failure for duplicate placeholder mappings in fields', () => {
            const result = updateForm({
                id: 'form1',
                fields: [
                    { ...sampleField, placeholder_mapping: 'DUP' },
                    { ...sampleField, field_key: 'other', placeholder_mapping: 'DUP' },
                ],
            });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/unique/i);
        });

        it('should update form name successfully', () => {
            const updatedForm = { id: 'form1', name: 'New Name', template_id: 't1', created_at: 'now' };
            mockDb.updateForm.mockReturnValue(updatedForm);

            const result = updateForm({ id: 'form1', name: 'New Name' });

            expect(result.success).toBe(true);
            expect(result.form).toEqual(updatedForm);
        });

        it('should pass undefined fields when not provided (no field update)', () => {
            mockDb.updateForm.mockReturnValue({ id: 'form1' });

            updateForm({ id: 'form1', name: 'Updated Name' });

            const call = mockDb.updateForm.mock.calls[0];
            expect(call[2]).toBeUndefined(); // dbFields is undefined
        });
    });

    // ─── getForms, getFormById, getFormFields ─────────────────────────────────

    describe('getForms()', () => {
        it('should return paginated form list', () => {
            const mockResult = { forms: [], total: 0 };
            mockDb.getFormsWithDetails.mockReturnValue(mockResult);

            const result = getForms(1, 50);

            expect(result).toBe(mockResult);
            expect(mockDb.getFormsWithDetails).toHaveBeenCalledWith(1, 50);
        });
    });

    describe('getFormById()', () => {
        it('should return form when found', () => {
            const mockForm = { id: 'form1', name: 'Invoice Form' };
            mockDb.getFormById.mockReturnValue(mockForm);

            const result = getFormById('form1');

            expect(result).toEqual(mockForm);
        });

        it('should return null when form not found', () => {
            mockDb.getFormById.mockReturnValue(undefined);

            const result = getFormById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getFormFields()', () => {
        it('should return fields for a form', () => {
            const mockFields = [{ id: 'f1', label: 'Name' }];
            mockDb.getFormFields.mockReturnValue(mockFields);

            const result = getFormFields('form1');

            expect(result).toEqual(mockFields);
        });
    });

    // ─── generateFieldsFromTemplate ───────────────────────────────────────────

    describe('generateFieldsFromTemplate()', () => {
        const mockPlaceholders = [
            { id: 'p1', placeholder_key: 'CLIENT_NAME' },
            { id: 'p2', placeholder_key: 'INVOICE_DATE' },
            { id: 'p3', placeholder_key: 'TOTAL_AMOUNT' },
            { id: 'p4', placeholder_key: 'FINANCIAL_YEAR' },
            { id: 'p5', placeholder_key: 'INVOICE_COUNT' },
        ];

        beforeEach(() => {
            mockDb.getPlaceholdersByTemplateId.mockReturnValue(mockPlaceholders);
        });

        it('should return one field per placeholder', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            expect(fields).toHaveLength(5);
        });

        it('should detect "date" type for DATE keys', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            const dateField = fields.find(f => f.placeholder_mapping === 'INVOICE_DATE');
            expect(dateField?.data_type).toBe('date');
        });

        it('should detect "currency" type for AMOUNT keys', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            const amountField = fields.find(f => f.placeholder_mapping === 'TOTAL_AMOUNT');
            expect(amountField?.data_type).toBe('currency');
        });

        it('should detect "number" type for YEAR and COUNT keys', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            const yearField = fields.find(f => f.placeholder_mapping === 'FINANCIAL_YEAR');
            const countField = fields.find(f => f.placeholder_mapping === 'INVOICE_COUNT');
            expect(yearField?.data_type).toBe('number');
            expect(countField?.data_type).toBe('number');
        });

        it('should default to "text" type for unrecognized keys', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            const nameField = fields.find(f => f.placeholder_mapping === 'CLIENT_NAME');
            expect(nameField?.data_type).toBe('text');
        });

        it('should format label from snake_case placeholder key', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            const nameField = fields.find(f => f.placeholder_mapping === 'CLIENT_NAME');
            expect(nameField?.label).toBe('Client Name');
        });

        it('should set required=true and map placeholder_mapping', () => {
            const fields = generateFieldsFromTemplate('tmpl1');
            for (const field of fields) {
                expect(field.required).toBe(true);
                expect(field.placeholder_mapping).toBeTruthy();
            }
        });
    });
});

/**
 * Report Service Unit Tests
 *
 * Validates:
 * - generateReport() — auth check, form not found, template not found, missing file,
 *   successful generation with placeholder replacement, client_id prefill
 * - deleteReport() — auth check, report not found, owner vs admin permission,
 *   file cleanup, DB deletion, audit log
 * - deleteReports() — delegates to deleteReport(), returns count, handles partial failures
 * - getReports() — auth check, ADMIN sees all, USER sees own with pagination
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module-level mock controls for Docxtemplater/PizZip ─────────────────────
// Class-based mocks must capture these via closure (same pattern as existing tests)

const mockDocRender = vi.fn();
const mockDocGenerate = vi.fn(() => Buffer.from('generated-docx'));

vi.mock('pizzip', () => ({
    default: class { constructor() {} },
}));

vi.mock('docxtemplater', () => ({
    default: class {
        render(data: any) { mockDocRender(data); }
        getZip() { return { generate: mockDocGenerate }; }
    },
}));

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const {
    mockDb, mockGetCurrentUser, mockLogAction, mockGetClientById,
    mockExistsSync, mockReadFileSync, mockWriteFileSync, mockMkdirSync, mockUnlinkSync,
    mockGetPath,
} = vi.hoisted(() => ({
    mockDb: {
        getFormById: vi.fn(),
        getFormFields: vi.fn(() => []),
        getTemplateById: vi.fn(),
        createReport: vi.fn(),
        getReportById: vi.fn(),
        deleteReport: vi.fn(),
        getReportsWithDetails: vi.fn(),
        getReportsByUser: vi.fn(),
    },
    mockGetCurrentUser: vi.fn(),
    mockLogAction: vi.fn(),
    mockGetClientById: vi.fn(),
    mockExistsSync: vi.fn(() => false),
    mockReadFileSync: vi.fn(() => Buffer.from('template')),
    mockWriteFileSync: vi.fn(),
    mockMkdirSync: vi.fn(),
    mockUnlinkSync: vi.fn(),
    mockGetPath: vi.fn(() => '/mock/userData'),
}));

vi.mock('../database', () => ({ database: mockDb }));
vi.mock('../auth', () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock('../auditService', () => ({ logAction: mockLogAction }));
vi.mock('../clientService', () => ({ getClientById: mockGetClientById }));
vi.mock('electron', () => ({ app: { getPath: mockGetPath } }));
vi.mock('fs', () => ({
    default: {
        existsSync: (...args: any[]) => mockExistsSync(...args),
        readFileSync: (...args: any[]) => mockReadFileSync(...args),
        writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
        mkdirSync: (...args: any[]) => mockMkdirSync(...args),
        unlinkSync: (...args: any[]) => mockUnlinkSync(...args),
    },
}));

import { generateReport, deleteReport, deleteReports, getReports } from '../reportService';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const adminUser = { id: 'admin-id', username: 'admin', role: 'ADMIN' };
const regularUser = { id: 'user-id', username: 'user1', role: 'USER' };

const mockForm = { id: 'form-1', name: 'Invoice Form', template_id: 'tmpl-1' };
const mockTemplate = { id: 'tmpl-1', name: 'Invoice Template', file_path: '/templates/invoice.docx' };
const mockReport = {
    id: 'report-1', form_id: 'form-1', generated_by: 'user-id',
    file_path: '/reports/invoice_form/invoice_form_2024.docx', generated_at: '2024-01-01'
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Report Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetCurrentUser.mockReturnValue(adminUser);
        mockGetPath.mockReturnValue('/mock/userData');
    });

    // ─── generateReport ───────────────────────────────────────────────────────

    describe('generateReport()', () => {
        it('should return failure when user is not logged in', () => {
            mockGetCurrentUser.mockReturnValue(null);

            const result = generateReport({ form_id: 'f1', values: {} });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/logged in/i);
        });

        it('should return failure when form not found', () => {
            mockDb.getFormById.mockReturnValue(undefined);

            const result = generateReport({ form_id: 'nonexistent', values: {} });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/form not found/i);
        });

        it('should return failure when template record not found', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([]);
            mockDb.getTemplateById.mockReturnValue(undefined);

            const result = generateReport({ form_id: 'form-1', values: {} });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/template file not found/i);
        });

        it('should return failure when template file is missing from disk', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockReturnValue(false);

            const result = generateReport({ form_id: 'form-1', values: {} });

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/template file missing/i);
        });

        it('should generate a report successfully', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockImplementation((p: string) => p.includes('templates'));
            mockDb.createReport.mockReturnValue(mockReport);

            const result = generateReport({ form_id: 'form-1', values: {} });

            expect(result.success).toBe(true);
            expect(result.report?.id).toBe('report-1');
            expect(mockDb.createReport).toHaveBeenCalled();
            expect(mockWriteFileSync).toHaveBeenCalled();
        });

        it('should build placeholder values from form fields', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([
                { field_key: 'client_name', placeholder_mapping: 'CLIENT_NAME', data_type: 'text', format_options: null },
                { field_key: 'invoice_date', placeholder_mapping: 'INVOICE_DATE', data_type: 'date', format_options: null },
            ]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockImplementation((p: string) => p.includes('templates'));
            mockDb.createReport.mockReturnValue(mockReport);

            generateReport({ form_id: 'form-1', values: { client_name: 'Acme Corp', invoice_date: '2024-01-15' } });

            const renderCall = mockDocRender.mock.calls[0][0];
            expect(renderCall['CLIENT_NAME']).toBe('Acme Corp');
            expect(renderCall['INVOICE_DATE']).toBe('2024-01-15');
        });

        it('should create reports directory when it does not exist', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockImplementation((p: string) => {
                if (p.includes('templates')) return true;
                return false; // reports dir doesn't exist
            });
            mockDb.createReport.mockReturnValue(mockReport);

            generateReport({ form_id: 'form-1', values: {} });

            expect(mockMkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('Invoice Form'),
                { recursive: true }
            );
        });

        it('should merge client values when client_id is provided', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([
                { field_key: 'client_name', placeholder_mapping: 'CLIENT_NAME', data_type: 'text', format_options: null },
            ]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockImplementation((p: string) => p.includes('templates'));
            mockGetClientById.mockReturnValue({
                id: 'client-1',
                name: 'Acme Corp',
                field_values: { client_name: 'Acme Corp' },
            });
            mockDb.createReport.mockReturnValue(mockReport);

            generateReport({
                form_id: 'form-1',
                values: { client_name: '' }, // empty, should be overridden by client
                client_id: 'client-1'
            });

            const renderCall = mockDocRender.mock.calls[0][0];
            expect(renderCall['CLIENT_NAME']).toBe('Acme Corp');
        });

        it('should log REPORT_GENERATE audit action', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockImplementation((p: string) => p.includes('templates'));
            mockDb.createReport.mockReturnValue(mockReport);

            generateReport({ form_id: 'form-1', values: {} });

            expect(mockLogAction).toHaveBeenCalledWith(expect.objectContaining({
                actionType: 'REPORT_GENERATE',
                entityType: 'REPORT',
            }));
        });

        it('should return failure when docxtemplater render throws', () => {
            mockDb.getFormById.mockReturnValue(mockForm);
            mockDb.getFormFields.mockReturnValue([]);
            mockDb.getTemplateById.mockReturnValue(mockTemplate);
            mockExistsSync.mockImplementation((p: string) => p.includes('templates'));
            mockDocRender.mockImplementationOnce(() => {
                throw new Error('Template syntax error');
            });

            const result = generateReport({ form_id: 'form-1', values: {} });

            expect(result.success).toBe(false);
            expect(result.error).toContain('Template syntax error');
        });
    });

    // ─── deleteReport ─────────────────────────────────────────────────────────

    describe('deleteReport()', () => {
        it('should return failure when user is not logged in', () => {
            mockGetCurrentUser.mockReturnValue(null);

            const result = deleteReport('report-1');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/logged in/i);
        });

        it('should return failure when report not found', () => {
            mockDb.getReportById.mockReturnValue(undefined);

            const result = deleteReport('nonexistent');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/report not found/i);
        });

        it('should return failure when USER tries to delete someone else\'s report', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);
            mockDb.getReportById.mockReturnValue({ ...mockReport, generated_by: 'admin-id' });

            const result = deleteReport('report-1');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/permission/i);
        });

        it('should allow USER to delete their own report', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);
            mockDb.getReportById.mockReturnValue({ ...mockReport, generated_by: 'user-id' });
            mockExistsSync.mockReturnValue(false);

            const result = deleteReport('report-1');

            expect(result.success).toBe(true);
            expect(mockDb.deleteReport).toHaveBeenCalledWith('report-1');
        });

        it('should allow ADMIN to delete any report', () => {
            mockDb.getReportById.mockReturnValue({ ...mockReport, generated_by: 'user-id' });
            mockExistsSync.mockReturnValue(false);

            const result = deleteReport('report-1');

            expect(result.success).toBe(true);
        });

        it('should delete the report file from disk when it exists', () => {
            mockDb.getReportById.mockReturnValue(mockReport);
            mockExistsSync.mockReturnValue(true);

            deleteReport('report-1');

            expect(mockUnlinkSync).toHaveBeenCalledWith(mockReport.file_path);
        });

        it('should not throw when report file does not exist on disk', () => {
            mockDb.getReportById.mockReturnValue(mockReport);
            mockExistsSync.mockReturnValue(false);

            const result = deleteReport('report-1');

            expect(mockUnlinkSync).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
        });

        it('should log REPORT_DELETE audit action', () => {
            mockDb.getReportById.mockReturnValue(mockReport);
            mockExistsSync.mockReturnValue(false);

            deleteReport('report-1');

            expect(mockLogAction).toHaveBeenCalledWith(expect.objectContaining({
                actionType: 'REPORT_DELETE',
            }));
        });
    });

    // ─── deleteReports ────────────────────────────────────────────────────────

    describe('deleteReports()', () => {
        it('should return failure when user is not logged in', () => {
            mockGetCurrentUser.mockReturnValue(null);

            const result = deleteReports(['r1', 'r2']);

            expect(result.success).toBe(false);
        });

        it('should delete multiple reports and return count', () => {
            mockDb.getReportById.mockReturnValue({ ...mockReport, generated_by: 'admin-id' });
            mockExistsSync.mockReturnValue(false);

            const result = deleteReports(['r1', 'r2', 'r3']);

            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(3);
        });

        it('should return failure when all deletions fail', () => {
            mockDb.getReportById.mockReturnValue(undefined); // all reports not found

            const result = deleteReports(['r1', 'r2']);

            expect(result.success).toBe(false);
        });

        it('should return success with partial deletedCount when some fail', () => {
            let callCount = 0;
            mockDb.getReportById.mockImplementation(() => {
                callCount++;
                // First call succeeds, second fails (not found)
                return callCount === 1 ? { ...mockReport, generated_by: 'admin-id' } : undefined;
            });
            mockExistsSync.mockReturnValue(false);

            const result = deleteReports(['r1', 'r2']);

            expect(result.success).toBe(true);
            expect(result.deletedCount).toBe(1);
        });
    });

    // ─── getReports ───────────────────────────────────────────────────────────

    describe('getReports()', () => {
        it('should return empty result when user is not logged in', () => {
            mockGetCurrentUser.mockReturnValue(null);

            const result = getReports();

            expect(result.reports).toEqual([]);
            expect(result.total).toBe(0);
        });

        it('should call getReportsWithDetails for ADMIN user', () => {
            const mockResult = { reports: [], total: 0 };
            mockDb.getReportsWithDetails.mockReturnValue(mockResult);

            getReports(1, 10, 'form-1', 'search', 'generated_at', 'DESC');

            expect(mockDb.getReportsWithDetails).toHaveBeenCalled();
            expect(mockDb.getReportsByUser).not.toHaveBeenCalled();
        });

        it('should call getReportsByUser for non-ADMIN user', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);
            mockDb.getReportsByUser.mockReturnValue([]);

            getReports(1, 10);

            expect(mockDb.getReportsByUser).toHaveBeenCalledWith('user-id', 'generated_at', 'DESC');
            expect(mockDb.getReportsWithDetails).not.toHaveBeenCalled();
        });

        it('should paginate user reports in memory', () => {
            mockGetCurrentUser.mockReturnValue(regularUser);
            const reports = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}` }));
            mockDb.getReportsByUser.mockReturnValue(reports);

            const result = getReports(2, 10);

            expect(result.reports).toHaveLength(10);
            expect(result.total).toBe(25);
        });
    });
});

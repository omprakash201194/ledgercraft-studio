
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// ─── Mocks ───────────────────────────────────────────────────

// Mock Database
const mockCreateReport = vi.fn((report) => ({ id: 'report-123', ...report, generated_at: new Date().toISOString() }));
const mockGetFormById = vi.fn();
const mockGetFormFields = vi.fn();
const mockGetTemplateById = vi.fn();

vi.mock('../database', () => ({
    database: {
        getFormById: (...args: any[]) => mockGetFormById(...args),
        getFormFields: (...args: any[]) => mockGetFormFields(...args),
        getTemplateById: (...args: any[]) => mockGetTemplateById(...args),
        createReport: (report: any) => mockCreateReport(report),
    }
}));

// Mock Auth
vi.mock('../auth', () => ({
    getCurrentUser: () => ({ id: 'user-1', username: 'admin', role: 'ADMIN' })
}));

// Mock Audit
vi.mock('../auditService', () => ({
    logAction: vi.fn()
}));

// Mock FS
const mockWriteFileSync = vi.fn();
const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockReadFileSync = vi.fn();

vi.mock('fs', () => ({
    default: {
        existsSync: (...args: any[]) => mockExistsSync(...args),
        readFileSync: (...args: any[]) => mockReadFileSync(...args),
        writeFileSync: (...args: any[]) => mockWriteFileSync(...args),
        mkdirSync: (...args: any[]) => mockMkdirSync(...args),
    }
}));

// Mock Client Service
const mockGetClientById = vi.fn();
vi.mock('../clientService', () => ({
    getClientById: (...args: any[]) => mockGetClientById(...args)
}));

// Mock PizZip & Docxtemplater to avoid real docx parsing
vi.mock('pizzip', () => {
    return {
        default: class {
            constructor() { }
        }
    };
});

const mockDocRender = vi.fn();
const mockDocGenerate = vi.fn(() => Buffer.from('fake-docx-content'));

vi.mock('docxtemplater', () => {
    return {
        default: class {
            constructor() { }
            render(data: any) { mockDocRender(data); }
            getZip() { return { generate: mockDocGenerate }; }
        }
    };
});

// Mock Electron App
vi.mock('electron', () => ({
    app: {
        getPath: () => 'C:/Fake/UserData'
    }
}));

// ─── Imports ─────────────────────────────────────────────────
import { generateReport } from '../reportService';

// ─── Tests ───────────────────────────────────────────────────

describe('Report Generation with Client Prefill', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Default Mock Returns
        mockGetFormById.mockReturnValue({ id: 'form-1', name: 'Test Form', template_id: 'temp-1' });

        // Fields with mapping
        mockGetFormFields.mockReturnValue([
            { id: 'f1', field_key: 'company_name', placeholder_mapping: 'COMPANY', data_type: 'text' },
            { id: 'f2', field_key: 'pan', placeholder_mapping: 'PAN_NUM', data_type: 'text' }
        ]);

        mockGetTemplateById.mockReturnValue({ id: 'temp-1', file_path: '/path/to/template.docx' });

        mockExistsSync.mockReturnValue(true); // Template exists
        mockReadFileSync.mockReturnValue(Buffer.from('dummy')); // Template content
    });

    it('should generate report WITHOUT client_id (standard behavior)', () => {
        const input = {
            form_id: 'form-1',
            values: {
                company_name: 'Manual Corp',
                pan: 'MANUALPAN'
            }
        };

        const result = generateReport(input);

        expect(result.success).toBe(true);
        expect(mockDocRender).toHaveBeenCalledWith({
            COMPANY: 'Manual Corp',
            PAN_NUM: 'MANUALPAN'
        });

        // Verify DB storage
        expect(mockCreateReport).toHaveBeenCalledWith(expect.objectContaining({
            form_id: 'form-1',
            client_id: undefined,
            // input_values should match input exactly
            input_values: JSON.stringify(input.values)
        }));
    });

    it('should prefill values from Client when client_id is provided', () => {
        // Mock Client Data
        mockGetClientById.mockReturnValue({
            id: 'client-1',
            name: 'Client A',
            field_values: {
                // Client has these values
                company_name: 'Client Corp',
                pan: 'CLIENTPAN'
            }
        });

        const input = {
            form_id: 'form-1',
            client_id: 'client-1',
            values: {
                // Empty form values -> should take from client
                company_name: '',
                pan: ''
            }
        };

        const result = generateReport(input);

        expect(result.success).toBe(true);

        // Verify Client Service called
        expect(mockGetClientById).toHaveBeenCalledWith('client-1');

        // Verify Render used Client values
        expect(mockDocRender).toHaveBeenCalledWith({
            COMPANY: 'Client Corp',
            PAN_NUM: 'CLIENTPAN'
        });

        // Verify DB stored merged values
        const storedValues = JSON.parse(mockCreateReport.mock.calls[0][0].input_values);
        expect(storedValues).toEqual({
            company_name: 'Client Corp',
            pan: 'CLIENTPAN'
        });
        expect(mockCreateReport.mock.calls[0][0].client_id).toBe('client-1');
    });

    it('should prioritize Manual Input over Client Prefill', () => {
        // Mock Client Data
        mockGetClientById.mockReturnValue({
            id: 'client-1',
            field_values: {
                company_name: 'Client Corp',
                pan: 'CLIENTPAN'
            }
        });

        const input = {
            form_id: 'form-1',
            client_id: 'client-1',
            values: {
                company_name: 'Override Corp', // Manual override
                pan: '' // Should use client
            }
        };

        const result = generateReport(input);

        expect(result.success).toBe(true);

        // Verify Render used Mixed values
        expect(mockDocRender).toHaveBeenCalledWith({
            COMPANY: 'Override Corp',
            PAN_NUM: 'CLIENTPAN'
        });

        // Verify DB stored merged values
        const storedValues = JSON.parse(mockCreateReport.mock.calls[0][0].input_values);
        expect(storedValues).toEqual({
            company_name: 'Override Corp',
            pan: 'CLIENTPAN'
        });
    });

    it('should handle missing client gracefully (fallback to form inputs)', () => {
        mockGetClientById.mockReturnValue(null); // Client not found

        const input = {
            form_id: 'form-1',
            client_id: 'bad-id',
            values: {
                company_name: 'Fallback Name',
                pan: ''
            }
        };

        const result = generateReport(input);

        expect(result.success).toBe(true);

        // Should use form inputs exactly (merged with nothing)
        expect(mockDocRender).toHaveBeenCalledWith({
            COMPANY: 'Fallback Name',
            PAN_NUM: ''
        });
    });
});

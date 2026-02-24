import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

const mocks = vi.hoisted(() => ({
    getCurrentUser: vi.fn(),
    logAction: vi.fn(),
    generateReport: vi.fn(),
    getClientById: vi.fn(),
    getFormById: vi.fn(),
    dbPrepare: vi.fn(),
    renameSync: vi.fn(),
    existsSync: vi.fn(),
    openPath: vi.fn()
}));

// Mock Modules
vi.mock('../auth', () => ({
    getCurrentUser: () => mocks.getCurrentUser()
}));

vi.mock('../auditService', () => ({
    logAction: (...args: any[]) => mocks.logAction(...args)
}));

vi.mock('../reportService', () => ({
    generateReport: (...args: any[]) => mocks.generateReport(...args)
}));

vi.mock('../clientService', () => ({
    getClientById: (...args: any[]) => mocks.getClientById(...args)
}));

vi.mock('../database', () => ({
    database: {
        getFormById: (...args: any[]) => mocks.getFormById(...args),
        getConnection: () => ({
            prepare: () => ({ run: mocks.dbPrepare })
        })
    }
}));

vi.mock('fs', () => ({
    default: {
        renameSync: (...args: any[]) => mocks.renameSync(...args),
        existsSync: (...args: any[]) => mocks.existsSync(...args),
        mkdirSync: vi.fn()
    }
}));

vi.mock('electron', () => ({
    app: { getPath: () => 'C:/Mock/UserData' },
    shell: { openPath: (...args: any[]) => mocks.openPath(...args) }
}));

import { generateBulkReports } from '../services/bulkReportService';

describe('BulkReportService', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mocks.getCurrentUser.mockReturnValue({ id: 'admin1', role: 'ADMIN' });
        // Return true for directory checks and old.docx (to allow rename), false for new .docx paths to break infinite loop
        mocks.existsSync.mockImplementation((p: string) => p.includes('old.docx') || !p.endsWith('.docx'));
    });

    it('should reject non-admin users', async () => {
        mocks.getCurrentUser.mockReturnValue({ id: 'user1', role: 'USER' });
        const res = await generateBulkReports({ clientIds: ['c1'], formIds: ['f1'] });
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/administrator/);
    });

    it('should reject empty client or form lists', async () => {
        const res1 = await generateBulkReports({ clientIds: [], formIds: ['f1'] });
        expect(res1.success).toBe(false);
        const res2 = await generateBulkReports({ clientIds: ['c1'], formIds: [] });
        expect(res2.success).toBe(false);
    });

    it('should process a matrix of clients and forms and rename files', async () => {
        mocks.getClientById.mockImplementation((id: string) => ({ name: `Client_${id}` }));
        mocks.getFormById.mockImplementation((id: string) => ({ name: `Form_${id}` }));

        mocks.generateReport.mockImplementation((input: any) => {
            return {
                success: true,
                report: { id: `rep_${input.client_id}`, file_path: `C:/Mock/UserData/reports/Form_${input.form_id}/old.docx` }
            };
        });

        const progressCb = vi.fn();

        const res = await generateBulkReports({
            clientIds: ['c1', 'c2'],
            formIds: ['f1'],
            financialYear: '2023-24'
        }, progressCb);

        expect(res.total).toBe(2);
        expect(res.successful).toBe(2);
        expect(res.failed).toBe(0);

        // Verify that reportService was called twice
        expect(mocks.generateReport).toHaveBeenCalledTimes(2);

        // Verify FS modifications
        expect(mocks.renameSync).toHaveBeenCalledTimes(2);

        // Verify DB updates
        expect(mocks.dbPrepare).toHaveBeenCalledTimes(2);

        // Verify audit log
        expect(mocks.logAction).toHaveBeenCalledWith(expect.objectContaining({
            actionType: 'BULK_REPORT_GENERATE'
        }));

        // Verify shell opened
        expect(mocks.openPath).toHaveBeenCalled();

        // Verify progress callbacks (2 items + 1 completion = 3)
        expect(progressCb).toHaveBeenCalledTimes(3);
    });

    it('should continue on individual item failures', async () => {
        mocks.getClientById.mockImplementation((id: string) => ({ name: `Client_${id}` }));
        mocks.getFormById.mockImplementation((id: string) => ({ name: `Form_${id}` }));

        mocks.generateReport.mockImplementation((input: any) => {
            if (input.client_id === 'fail_me') {
                return { success: false, error: 'Simulated failure' };
            }
            return {
                success: true,
                report: { id: `rep_${input.client_id}`, file_path: `old.docx` }
            };
        });

        const res = await generateBulkReports({
            clientIds: ['c1', 'fail_me', 'c3'],
            formIds: ['f1']
        });

        expect(res.total).toBe(3);
        expect(res.successful).toBe(2);
        expect(res.failed).toBe(1);
        expect(res.success).toBe(false); // Overall success is false if ANY fail

        expect(mocks.renameSync).toHaveBeenCalledTimes(2); // Only renamed successful ones
        expect(mocks.logAction).toHaveBeenCalled();
        expect(mocks.openPath).toHaveBeenCalled();
    });
});

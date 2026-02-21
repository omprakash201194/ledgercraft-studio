
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks holder
const mocks = {
    run: vi.fn(),
    get: vi.fn(),
    all: vi.fn(),
    transaction: vi.fn((fn) => fn),
    prepare: vi.fn(),
    addLocalFile: vi.fn(),
    writeZip: vi.fn(),
    existsSync: vi.fn(),
    unlinkSync: vi.fn()
};

describe('Safe Client Deletion', () => {
    let clients: any[] = [];
    let reports: any[] = [];
    let clientService: any;

    beforeEach(async () => {
        // Reset everything
        vi.resetModules();
        vi.clearAllMocks();
        clients = [];
        reports = [];

        // Seed data
        clients.push({ id: 'c1', name: 'Test Client', is_deleted: 0 });
        reports.push({ id: 'r1', client_id: 'c1', file_path: '/tmp/r1.docx', created_at: '2023-01-01' });
        reports.push({ id: 'r2', client_id: 'c1', file_path: '/tmp/r2.pdf', created_at: '2023-01-02' });

        // Define Database Mock Implementation
        // We define it here to access clients/reports closure, or we can use the mocks.prepare to delegate
        mocks.prepare.mockImplementation((sql: string) => {
            return {
                run: (...args: any[]) => {
                    mocks.run(sql, args);
                    if (sql.includes('UPDATE clients SET is_deleted = 1')) {
                        const [id] = args;
                        const client = clients.find(c => c.id === id);
                        if (client) {
                            client.is_deleted = 1;
                            return { changes: 1 };
                        }
                        return { changes: 0 };
                    }
                    if (sql.includes('UPDATE reports SET client_id = NULL')) {
                        const [cid] = args;
                        reports.forEach(r => {
                            if (r.client_id === cid) r.client_id = null;
                        });
                        return { changes: 1 };
                    }
                    if (sql.includes('DELETE FROM reports')) {
                        const [cid] = args;
                        const initialLen = reports.length;
                        reports = reports.filter(r => r.client_id !== cid);
                        return { changes: initialLen - reports.length };
                    }
                    return { changes: 0 };
                },
                get: (...args: any[]) => {
                    mocks.get(sql, args);
                    if (sql.includes('SELECT COUNT(*) as count FROM reports')) return { count: reports.filter(r => r.client_id === args[0]).length };
                    if (sql.includes('SELECT name FROM clients WHERE id = ?')) {
                        const client = clients.find(c => c.id === args[0]);
                        return client ? { name: client.name } : undefined;
                    }
                    return undefined;
                },
                all: (...args: any[]) => {
                    mocks.all(sql, args);
                    if (sql.includes('SELECT id, file_path, created_at FROM reports')) {
                        return reports.filter(r => r.client_id === args[0]).map(r => ({ id: r.id, file_path: r.file_path, created_at: r.created_at }));
                    }
                    if (sql.includes('SELECT id, file_path FROM reports')) {
                        return reports.filter(r => r.client_id === args[0]).map(r => ({ id: r.id, file_path: r.file_path }));
                    }
                    if (sql.includes('SELECT file_path FROM reports')) {
                        return reports.filter(r => r.client_id === args[0]).map(r => ({ file_path: r.file_path }));
                    }
                    return [];
                }
            };
        });

        // Setup doMocks
        vi.doMock('fs', () => ({
            default: {
                existsSync: mocks.existsSync,
                unlinkSync: mocks.unlinkSync
            },
            existsSync: mocks.existsSync,
            unlinkSync: mocks.unlinkSync
        }));

        vi.doMock('adm-zip', () => {
            const AdmZipMock = function () {
                return {
                    addLocalFile: mocks.addLocalFile,
                    writeZip: mocks.writeZip
                };
            };
            return {
                default: AdmZipMock,
                AdmZip: AdmZipMock
            };
        });

        vi.doMock('../database', () => ({
            database: {
                getConnection: () => ({
                    prepare: mocks.prepare,
                    transaction: mocks.transaction
                })
            }
        }));

        vi.doMock('../auth', () => ({
            getCurrentUser: () => ({ id: 'admin', username: 'admin', role: 'ADMIN' })
        }));

        // Default behaviors
        mocks.existsSync.mockReturnValue(true);

        // Import
        try {
            clientService = await import('../clientService');
        } catch (e) {
            console.error('FAILED TO IMPORT', e);
        }
    });

    it('should count reports', () => {
        expect(clientService.getReportCountByClient('c1')).toBe(2);
        expect(clientService.getReportCountByClient('nonexistent')).toBe(0);
    });

    it('should get reports', () => {
        const res = clientService.getReportsByClient('c1');
        expect(res).toHaveLength(2);
        expect(res[0].id).toBe('r1');
    });

    describe('deleteClientOnly', () => {
        it('should require ADMIN role', () => {
            expect(() => clientService.deleteClientOnly('c1', 'USER')).toThrow('Only administrators');
        });

        it('should soft delete client and nullify report client_ids', () => {
            clientService.deleteClientOnly('c1', 'ADMIN');

            const client = clients.find(c => c.id === 'c1');
            expect(client.is_deleted).toBe(1);

            const clientReports = reports.filter(r => r.client_id === 'c1');
            expect(clientReports).toHaveLength(0);

            const detachedReports = reports.filter(r => r.client_id === null);
            expect(detachedReports).toHaveLength(2);
        });
    });

    describe('deleteClientWithReports', () => {
        it('should require ADMIN role', () => {
            expect(() => clientService.deleteClientWithReports('c1', 'USER')).toThrow('Only administrators');
        });

        it('should delete reports from DB and disk', () => {
            clientService.deleteClientWithReports('c1', 'ADMIN');

            const client = clients.find(c => c.id === 'c1');
            expect(client.is_deleted).toBe(1);
            expect(reports).toHaveLength(0);

            expect(mocks.unlinkSync).toHaveBeenCalledTimes(2);
            expect(mocks.unlinkSync).toHaveBeenCalledWith('/tmp/r1.docx');
            expect(mocks.unlinkSync).toHaveBeenCalledWith('/tmp/r2.pdf');
        });
    });

    describe('exportClientReportsZip', () => {
        it('should require ADMIN role', () => {
            expect(() => clientService.exportClientReportsZip('c1', 'USER')).toThrow('Only administrators');
        });

        it('should create zip with correct files', () => {
            const zipPath = clientService.exportClientReportsZip('c1', 'ADMIN');

            expect(mocks.addLocalFile).toHaveBeenCalledTimes(2);
            expect(mocks.addLocalFile).toHaveBeenCalledWith('/tmp/r1.docx');
            expect(mocks.addLocalFile).toHaveBeenCalledWith('/tmp/r2.pdf');

            expect(mocks.writeZip).toHaveBeenCalledTimes(1);
            expect(zipPath).toContain('Test_Client_Reports_');
            expect(zipPath).toContain('.zip');
        });

        it('should throw if no reports found', () => {
            reports = [];
            expect(() => clientService.exportClientReportsZip('c1', 'ADMIN')).toThrow('No reports found');
        });
    });
});

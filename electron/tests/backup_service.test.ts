/**
 * Backup Service Unit Tests
 *
 * Validates:
 * - exportBackup() creates a zip with database + templates + reports
 * - exportBackup() returns failure when database file is missing
 * - exportBackup() handles zip write errors gracefully
 * - restoreBackup() extracts to userData directory
 * - restoreBackup() rejects backup without database.sqlite
 * - restoreBackup() cleans up templates/reports before extracting
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Module-level mock controls ───────────────────────────────────────────────
// Must be module-level so they're captured inside vi.mock class bodies

const mockAddLocalFile = vi.fn();
const mockAddLocalFolder = vi.fn();
const mockWriteZip = vi.fn();
const mockGetEntries = vi.fn(() => [] as { entryName: string }[]);
const mockExtractAllTo = vi.fn();

vi.mock('adm-zip', () => ({
    default: class {
        addLocalFile = mockAddLocalFile;
        addLocalFolder = mockAddLocalFolder;
        writeZip = mockWriteZip;
        getEntries = mockGetEntries;
        extractAllTo = mockExtractAllTo;
    },
}));

const mockExistsSync = vi.fn();
const mockRmSync = vi.fn();

vi.mock('fs', () => ({
    default: {
        existsSync: (...args: any[]) => mockExistsSync(...args),
        rmSync: (...args: any[]) => mockRmSync(...args),
    },
}));

const mockClose = vi.fn();
const mockGetPath = vi.fn(() => '/mock/userData');
const mockRelaunch = vi.fn();
const mockExit = vi.fn();

vi.mock('electron', () => ({
    app: {
        getPath: (...args: any[]) => mockGetPath(...args),
        relaunch: () => mockRelaunch(),
        exit: () => mockExit(),
    },
}));

vi.mock('../database', () => ({
    database: {
        close: () => mockClose(),
    },
}));

import { exportBackup, restoreBackup } from '../backupService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Backup Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPath.mockReturnValue('/mock/userData');
        mockGetEntries.mockReturnValue([]);
    });

    // ─── exportBackup ─────────────────────────────────────────────────────────

    describe('exportBackup()', () => {
        it('should return success and write zip when database exists', () => {
            mockExistsSync.mockReturnValue(true);

            const result = exportBackup('/output/backup.zip');

            expect(result.success).toBe(true);
            expect(mockAddLocalFile).toHaveBeenCalledWith(
                expect.stringContaining('database.sqlite')
            );
            expect(mockWriteZip).toHaveBeenCalledWith('/output/backup.zip');
        });

        it('should include templates folder in zip when it exists', () => {
            mockExistsSync.mockReturnValue(true);

            exportBackup('/output/backup.zip');

            expect(mockAddLocalFolder).toHaveBeenCalledWith(
                expect.stringContaining('templates'),
                'templates'
            );
        });

        it('should include reports folder in zip when it exists', () => {
            mockExistsSync.mockReturnValue(true);

            exportBackup('/output/backup.zip');

            expect(mockAddLocalFolder).toHaveBeenCalledWith(
                expect.stringContaining('reports'),
                'reports'
            );
        });

        it('should return failure when database.sqlite does not exist', () => {
            mockExistsSync.mockImplementation((p: string) => !p.includes('database.sqlite'));

            const result = exportBackup('/output/backup.zip');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/database file not found/i);
            expect(mockWriteZip).not.toHaveBeenCalled();
        });

        it('should skip templates folder when it does not exist', () => {
            mockExistsSync.mockImplementation((p: string) => {
                if (p.includes('templates')) return false;
                return true;
            });

            const result = exportBackup('/output/backup.zip');

            expect(result.success).toBe(true);
            expect(mockAddLocalFolder).not.toHaveBeenCalledWith(
                expect.stringContaining('templates'),
                'templates'
            );
        });

        it('should return failure when zip write throws', () => {
            mockExistsSync.mockReturnValue(true);
            mockWriteZip.mockImplementation(() => { throw new Error('Disk full'); });

            const result = exportBackup('/output/backup.zip');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Disk full');
        });
    });

    // ─── restoreBackup ────────────────────────────────────────────────────────

    describe('restoreBackup()', () => {
        it('should return failure when backup has no database.sqlite', () => {
            mockGetEntries.mockReturnValue([
                { entryName: 'templates/something.docx' },
                { entryName: 'reports/some.docx' },
            ]);

            const result = restoreBackup('/backup.zip');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/missing database\.sqlite/i);
            expect(mockExtractAllTo).not.toHaveBeenCalled();
        });

        it('should extract zip to userData directory when backup is valid', () => {
            mockGetEntries.mockReturnValue([
                { entryName: 'database.sqlite' },
                { entryName: 'templates/invoice.docx' },
            ]);
            mockExistsSync.mockReturnValue(false);

            restoreBackup('/backup.zip');

            expect(mockExtractAllTo).toHaveBeenCalledWith('/mock/userData', true);
        });

        it('should close the database before extracting', () => {
            mockGetEntries.mockReturnValue([{ entryName: 'database.sqlite' }]);
            mockExistsSync.mockReturnValue(false);

            restoreBackup('/backup.zip');

            expect(mockClose).toHaveBeenCalled();
        });

        it('should wipe templates directory before extracting when it exists', () => {
            mockGetEntries.mockReturnValue([{ entryName: 'database.sqlite' }]);
            mockExistsSync.mockImplementation((p: string) => p.includes('templates'));

            restoreBackup('/backup.zip');

            expect(mockRmSync).toHaveBeenCalledWith(
                expect.stringContaining('templates'),
                { recursive: true, force: true }
            );
        });

        it('should wipe reports directory before extracting when it exists', () => {
            mockGetEntries.mockReturnValue([{ entryName: 'database.sqlite' }]);
            mockExistsSync.mockImplementation((p: string) => p.includes('reports'));

            restoreBackup('/backup.zip');

            expect(mockRmSync).toHaveBeenCalledWith(
                expect.stringContaining('reports'),
                { recursive: true, force: true }
            );
        });

        it('should relaunch and exit the app after successful restore', () => {
            mockGetEntries.mockReturnValue([{ entryName: 'database.sqlite' }]);
            mockExistsSync.mockReturnValue(false);

            restoreBackup('/backup.zip');

            expect(mockRelaunch).toHaveBeenCalled();
            expect(mockExit).toHaveBeenCalled();
        });

        it('should return failure when zip extraction throws', () => {
            mockGetEntries.mockReturnValue([{ entryName: 'database.sqlite' }]);
            mockExistsSync.mockReturnValue(false);
            mockExtractAllTo.mockImplementation(() => { throw new Error('Extraction failed'); });

            const result = restoreBackup('/backup.zip');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Extraction failed');
        });
    });
});

/**
 * Storage Service Unit Tests
 *
 * Validates:
 * - initializeStorage() creates subdirectories when they don't exist
 * - initializeStorage() skips creation when directories already exist
 * - initializeStorage() returns the app data path
 * - getAppDataPath() returns the app data path without side-effects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import path from 'path';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockExistsSync, mockMkdirSync, mockGetPath } = vi.hoisted(() => ({
    mockExistsSync: vi.fn(),
    mockMkdirSync: vi.fn(),
    mockGetPath: vi.fn(() => '/mock/userData'),
}));

vi.mock('electron', () => ({
    app: {
        getPath: mockGetPath,
    },
}));

vi.mock('fs', () => ({
    default: {
        existsSync: mockExistsSync,
        mkdirSync: mockMkdirSync,
    },
}));

import { initializeStorage, getAppDataPath } from '../storage';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Storage Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetPath.mockReturnValue('/mock/userData');
    });

    // ─── initializeStorage ────────────────────────────────────────────────────

    describe('initializeStorage()', () => {
        it('should return the app data path', () => {
            mockExistsSync.mockReturnValue(true); // all dirs exist

            const result = initializeStorage();

            expect(result).toBe('/mock/userData');
        });

        it('should create missing subdirectories', () => {
            mockExistsSync.mockReturnValue(false); // none exist

            initializeStorage();

            // Should create templates, reports, logs
            expect(mockMkdirSync).toHaveBeenCalledTimes(3);
            expect(mockMkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('templates'),
                { recursive: true }
            );
            expect(mockMkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('reports'),
                { recursive: true }
            );
            expect(mockMkdirSync).toHaveBeenCalledWith(
                expect.stringContaining('logs'),
                { recursive: true }
            );
        });

        it('should NOT create directories that already exist', () => {
            mockExistsSync.mockReturnValue(true); // all exist

            initializeStorage();

            expect(mockMkdirSync).not.toHaveBeenCalled();
        });

        it('should create only the missing directories when some exist', () => {
            // templates exists, reports and logs do not
            mockExistsSync.mockImplementation((p: string) => {
                return p.includes('templates');
            });

            initializeStorage();

            expect(mockMkdirSync).toHaveBeenCalledTimes(2);
            expect(mockMkdirSync).not.toHaveBeenCalledWith(
                expect.stringContaining('templates'),
                expect.anything()
            );
        });

        it('should use the correct path separator', () => {
            mockExistsSync.mockReturnValue(false);

            initializeStorage();

            const calls = mockMkdirSync.mock.calls.map(c => c[0] as string);
            // Use path.join to build expected paths so the check is platform-independent
            const expectedPaths = ['templates', 'reports', 'logs'].map(dir =>
                path.join('/mock/userData', dir)
            );
            expect(calls).toEqual(expect.arrayContaining(expectedPaths));
        });
    });

    // ─── getAppDataPath ───────────────────────────────────────────────────────

    describe('getAppDataPath()', () => {
        it('should return the app data path', () => {
            const result = getAppDataPath();
            expect(result).toBe('/mock/userData');
        });

        it('should call app.getPath with userData', () => {
            getAppDataPath();
            expect(mockGetPath).toHaveBeenCalledWith('userData');
        });

        it('should not create any directories', () => {
            getAppDataPath();
            expect(mockMkdirSync).not.toHaveBeenCalled();
            expect(mockExistsSync).not.toHaveBeenCalled();
        });
    });
});

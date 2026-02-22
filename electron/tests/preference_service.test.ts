/**
 * Preference Service Unit Tests
 *
 * Validates:
 * - getUserPreferences returns defaults when no row exists
 * - getUserPreferences returns saved row when it exists
 * - updateUserPreferences inserts when no row exists
 * - updateUserPreferences updates when row already exists
 * - Default values are correct
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
    mockDb: {
        getConnection: vi.fn(),
    }
}));

vi.mock('../database', () => ({
    database: mockDb,
}));

import { getUserPreferences, updateUserPreferences, DEFAULT_PREFERENCES } from '../preferenceService';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Preference Service', () => {

    let mockStmt: { get: ReturnType<typeof vi.fn>; run: ReturnType<typeof vi.fn> };
    let mockConn: { prepare: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.clearAllMocks();
        mockStmt = { get: vi.fn(), run: vi.fn() };
        mockConn = { prepare: vi.fn(() => mockStmt) };
        mockDb.getConnection.mockReturnValue(mockConn);
    });

    // ─── Default Preferences ──────────────────────────────────────────────────

    describe('DEFAULT_PREFERENCES', () => {
        it('should have light theme as default', () => {
            expect(DEFAULT_PREFERENCES.theme).toBe('light');
        });

        it('should have DD-MM-YYYY as default date format', () => {
            expect(DEFAULT_PREFERENCES.date_format).toBe('DD-MM-YYYY');
        });

        it('should have empty client_columns array as default', () => {
            expect(DEFAULT_PREFERENCES.client_columns).toBe('[]');
        });
    });

    // ─── getUserPreferences ───────────────────────────────────────────────────

    describe('getUserPreferences()', () => {
        it('should return defaults with userId when no row exists', () => {
            mockStmt.get.mockReturnValue(undefined);

            const prefs = getUserPreferences('user-123');

            expect(prefs.user_id).toBe('user-123');
            expect(prefs.theme).toBe('light');
            expect(prefs.date_format).toBe('DD-MM-YYYY');
        });

        it('should return saved preferences when row exists', () => {
            mockStmt.get.mockReturnValue({
                user_id: 'user-123',
                theme: 'dark',
                date_format: 'MM-DD-YYYY',
                client_columns: '["name","pan"]',
                updated_at: '2024-01-01T00:00:00.000Z',
            });

            const prefs = getUserPreferences('user-123');

            expect(prefs.theme).toBe('dark');
            expect(prefs.date_format).toBe('MM-DD-YYYY');
            expect(prefs.client_columns).toBe('["name","pan"]');
        });

        it('should query with correct userId', () => {
            mockStmt.get.mockReturnValue(undefined);

            getUserPreferences('specific-user-id');

            expect(mockStmt.get).toHaveBeenCalledWith('specific-user-id');
        });
    });

    // ─── updateUserPreferences ────────────────────────────────────────────────

    describe('updateUserPreferences()', () => {
        it('should INSERT when no existing preferences row', () => {
            // First call: getUserPreferences → no row
            // Second call: exists check → no row
            mockStmt.get.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

            const result = updateUserPreferences('user-123', { theme: 'dark' });

            expect(result.theme).toBe('dark');
            expect(mockStmt.run).toHaveBeenCalled();
        });

        it('should UPDATE when preferences row already exists', () => {
            const existingRow = {
                user_id: 'user-123',
                theme: 'light',
                date_format: 'DD-MM-YYYY',
                client_columns: '[]',
                updated_at: '2024-01-01T00:00:00.000Z',
            };
            // First call: getUserPreferences → existing row
            // Second call: exists check → truthy
            mockStmt.get.mockReturnValueOnce(existingRow).mockReturnValueOnce({ 1: 1 });

            const result = updateUserPreferences('user-123', { theme: 'dark' });

            expect(result.theme).toBe('dark');
            expect(mockStmt.run).toHaveBeenCalled();
        });

        it('should merge partial preferences with existing ones', () => {
            const existingRow = {
                user_id: 'user-123',
                theme: 'light',
                date_format: 'DD-MM-YYYY',
                client_columns: '["name"]',
                updated_at: '2024-01-01T00:00:00.000Z',
            };
            mockStmt.get.mockReturnValueOnce(existingRow).mockReturnValueOnce({ 1: 1 });

            const result = updateUserPreferences('user-123', { date_format: 'YYYY-MM-DD' });

            // theme should remain from existing
            expect(result.theme).toBe('light');
            // date_format should be updated
            expect(result.date_format).toBe('YYYY-MM-DD');
        });

        it('should set updated_at to a new timestamp', () => {
            mockStmt.get.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

            const before = new Date().toISOString();
            const result = updateUserPreferences('user-123', { theme: 'dark' });
            const after = new Date().toISOString();

            expect(result.updated_at >= before).toBe(true);
            expect(result.updated_at <= after).toBe(true);
        });

        it('should default client_columns to [] when not provided', () => {
            mockStmt.get.mockReturnValueOnce(undefined).mockReturnValueOnce(undefined);

            const result = updateUserPreferences('user-123', { theme: 'dark' });

            expect(result.client_columns).toBe('[]');
        });
    });
});

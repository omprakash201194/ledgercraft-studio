/**
 * Auth Service — Extended tests for tryAutoLogin() coverage
 *
 * Covers:
 *  - Session file does not exist → { success: false }
 *  - Session file exists but expired (>24h) → { success: false, error: 'Session expired' }
 *  - Session file exists, valid, user not found in DB → { success: false, error: 'User not found' }
 *  - Session file exists, valid, user found → { success: true, user }
 *  - Session file exists but contains invalid JSON → { success: false, error: 'Failed to restore session' }
 *  - saveSession() error swallowed (no throw)
 *  - deleteSession() error swallowed (no throw)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
    mockDb: {
        findUserByUsername: vi.fn(),
        getUserById: vi.fn(),
        getUserCount: vi.fn(),
        createUser: vi.fn(),
        updateUserPassword: vi.fn(),
        getAllUsers: vi.fn(),
    },
}));

const mockFs = vi.hoisted(() => ({
    existsSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
}));

vi.mock('../database', () => ({ database: mockDb }));
vi.mock('../auditService', () => ({ logAction: vi.fn() }));
vi.mock('bcryptjs', () => ({
    default: {
        compareSync: vi.fn(() => true),
        genSaltSync: vi.fn(() => 'salt'),
        hashSync: vi.fn(() => 'hashed_password'),
    },
    compareSync: vi.fn(() => true),
    genSaltSync: vi.fn(() => 'salt'),
    hashSync: vi.fn(() => 'hashed_password'),
}));
vi.mock('electron', () => ({ app: { getPath: vi.fn(() => '/mock-userData') } }));
vi.mock('fs', () => ({ default: mockFs, ...mockFs }));

import { tryAutoLogin, logout } from '../auth';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Auth Service — tryAutoLogin()', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        logout();
    });

    it('returns failure when session file does not exist', () => {
        mockFs.existsSync.mockReturnValue(false);

        const result = tryAutoLogin();

        expect(result.success).toBe(false);
        expect(result.error).toBeUndefined();
    });

    it('returns failure and deletes session when session is expired (>24h)', () => {
        mockFs.existsSync.mockReturnValue(true);
        const expiredTime = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
        mockFs.readFileSync.mockReturnValue(
            JSON.stringify({ userId: 'u1', loginTime: expiredTime })
        );

        const result = tryAutoLogin();

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/session expired/i);
        // Should attempt to delete the stale session file
        expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('returns failure and deletes session when user is not found in DB', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
            JSON.stringify({ userId: 'ghost-user', loginTime: Date.now() - 1000 })
        );
        mockDb.getUserById.mockReturnValue(undefined);

        const result = tryAutoLogin();

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/user not found/i);
        expect(mockFs.unlinkSync).toHaveBeenCalled();
    });

    it('returns success with user when session is valid and user exists', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue(
            JSON.stringify({ userId: 'u1', loginTime: Date.now() - 60_000 }) // 1 min ago
        );
        mockDb.getUserById.mockReturnValue({
            id: 'u1',
            username: 'admin',
            password_hash: 'hash',
            role: 'ADMIN',
            created_at: '2024-01-01',
        });

        const result = tryAutoLogin();

        expect(result.success).toBe(true);
        expect(result.user).toBeDefined();
        expect(result.user?.username).toBe('admin');
        expect(result.user?.role).toBe('ADMIN');
        // Must not leak password_hash
        expect(result.user).not.toHaveProperty('password_hash');
    });

    it('returns failure when session file contains invalid JSON', () => {
        mockFs.existsSync.mockReturnValue(true);
        mockFs.readFileSync.mockReturnValue('not-valid-json{{{{');

        const result = tryAutoLogin();

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/failed to restore session/i);
    });

    it('swallows error in saveSession (no throw on writeFileSync failure)', async () => {
        // Login triggers saveSession
        mockFs.existsSync.mockReturnValue(false);
        mockFs.writeFileSync.mockImplementation(() => {
            throw new Error('disk full');
        });

        // Import login here to avoid affecting other tests via module-level state
        const { login } = await import('../auth');
        const mockUser = {
            id: 'u1', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: 'now',
        };
        mockDb.findUserByUsername.mockReturnValue(mockUser);

        const { default: bcrypt } = await import('bcryptjs');
        (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

        // Should not throw even if fs.writeFileSync fails
        expect(() => login('admin', 'admin123')).not.toThrow();
    });

    it('swallows error in deleteSession (no throw on unlinkSync failure)', () => {
        // existsSync returns true so unlinkSync is attempted
        mockFs.existsSync.mockReturnValue(true);
        mockFs.unlinkSync.mockImplementation(() => {
            throw new Error('permission denied');
        });

        // logout calls deleteSession; should not throw
        expect(() => logout()).not.toThrow();
    });
});

/**
 * Auth Service Unit Tests
 *
 * Validates:
 * - Login with correct and incorrect credentials
 * - Logout and session clearing
 * - getCurrentUser before and after login
 * - createUser (admin-only, role validation, duplicate check)
 * - resetUserPassword (admin-only)
 * - bootstrapAdmin creates default admin when no users exist
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
    }
}));

vi.mock('../database', () => ({
    database: mockDb,
}));

vi.mock('../auditService', () => ({
    logAction: vi.fn(),
}));

// Mock bcryptjs so tests run fast (no actual hashing)
vi.mock('bcryptjs', () => ({
    default: {
        compareSync: vi.fn(),
        genSaltSync: vi.fn(() => 'salt'),
        hashSync: vi.fn(() => 'hashed_password'),
    },
    compareSync: vi.fn(),
    genSaltSync: vi.fn(() => 'salt'),
    hashSync: vi.fn(() => 'hashed_password'),
}));

vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/mock-data-path'),
    },
}));

vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(() => false),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn(),
        unlinkSync: vi.fn(),
    },
    existsSync: vi.fn(() => false),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
}));

// Import auth after mocks are set up
import { login, logout, getCurrentUser, createUser, resetUserPassword, bootstrapAdmin } from '../auth';
import bcrypt from 'bcryptjs';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Auth Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        // Always start with no logged-in user
        logout();
    });

    // ─── Login ────────────────────────────────────────────────────────────────

    describe('login()', () => {
        it('should return failure when user not found', () => {
            mockDb.findUserByUsername.mockReturnValue(undefined);

            const result = login('nonexistent', 'password');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/invalid username or password/i);
        });

        it('should return failure when password is incorrect', () => {
            mockDb.findUserByUsername.mockReturnValue({
                id: 'u1', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: 'now'
            });
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(false);

            const result = login('admin', 'wrong_password');

            expect(result.success).toBe(false);
            expect(result.error).toMatch(/invalid username or password/i);
        });

        it('should return success and user data on correct credentials', () => {
            const mockUser = { id: 'u1', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

            const result = login('admin', 'admin123');

            expect(result.success).toBe(true);
            expect(result.user).toBeDefined();
            expect(result.user?.username).toBe('admin');
            expect(result.user?.role).toBe('ADMIN');
            // Password hash should NOT be in safe user
            expect(result.user).not.toHaveProperty('password_hash');
        });

        it('should set getCurrentUser after successful login', () => {
            const mockUser = { id: 'u1', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

            login('admin', 'admin123');

            const current = getCurrentUser();
            expect(current).not.toBeNull();
            expect(current?.username).toBe('admin');
        });
    });

    // ─── Logout ───────────────────────────────────────────────────────────────

    describe('logout()', () => {
        it('should clear the current user after logout', () => {
            const mockUser = { id: 'u1', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);

            login('admin', 'admin123');
            expect(getCurrentUser()).not.toBeNull();

            logout();
            expect(getCurrentUser()).toBeNull();
        });
    });

    // ─── getCurrentUser ───────────────────────────────────────────────────────

    describe('getCurrentUser()', () => {
        it('should return null when no user is logged in', () => {
            expect(getCurrentUser()).toBeNull();
        });
    });

    // ─── createUser ───────────────────────────────────────────────────────────

    describe('createUser()', () => {
        beforeEach(() => {
            // Log in as admin
            const mockUser = { id: 'admin-id', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
            login('admin', 'admin123');
        });

        it('should return failure when non-admin tries to create a user', () => {
            // Simulate a USER role
            logout();
            const mockUser = { id: 'u2', username: 'user1', password_hash: 'hash', role: 'USER', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
            login('user1', 'pass');

            const result = createUser('newuser', 'pass', 'USER');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('should return failure when username already exists', () => {
            mockDb.findUserByUsername.mockReturnValue({ id: 'existing', username: 'existing_user', password_hash: 'hash', role: 'USER', created_at: 'now' });

            const result = createUser('existing_user', 'pass', 'USER');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/already exists/i);
        });

        it('should return failure for invalid role', () => {
            mockDb.findUserByUsername.mockReturnValue(undefined);

            const result = createUser('newuser', 'pass', 'SUPERADMIN');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/invalid role/i);
        });

        it('should create a user successfully with valid input', () => {
            mockDb.findUserByUsername.mockReturnValue(undefined);
            mockDb.createUser.mockReturnValue({
                id: 'new-id', username: 'newuser', password_hash: 'hashed', role: 'USER', created_at: '2024-01-01'
            });

            const result = createUser('newuser', 'password123', 'USER');
            expect(result.success).toBe(true);
            expect(result.user?.username).toBe('newuser');
            expect(result.user?.role).toBe('USER');
        });

        it('should create a user with ADMIN role', () => {
            mockDb.findUserByUsername.mockReturnValue(undefined);
            mockDb.createUser.mockReturnValue({
                id: 'new-id', username: 'adminuser', password_hash: 'hashed', role: 'ADMIN', created_at: '2024-01-01'
            });

            const result = createUser('adminuser', 'password123', 'ADMIN');
            expect(result.success).toBe(true);
            expect(result.user?.role).toBe('ADMIN');
        });
    });

    // ─── resetUserPassword ────────────────────────────────────────────────────

    describe('resetUserPassword()', () => {
        beforeEach(() => {
            const mockUser = { id: 'admin-id', username: 'admin', password_hash: 'hash', role: 'ADMIN', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
            login('admin', 'admin123');
        });

        it('should return failure when non-admin tries to reset password', () => {
            logout();
            const mockUser = { id: 'u2', username: 'user1', password_hash: 'hash', role: 'USER', created_at: '2024-01-01' };
            mockDb.findUserByUsername.mockReturnValue(mockUser);
            (bcrypt.compareSync as ReturnType<typeof vi.fn>).mockReturnValue(true);
            login('user1', 'pass');

            const result = resetUserPassword('some-id', 'newpass');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/only administrators/i);
        });

        it('should return failure when target user not found', () => {
            mockDb.getUserById.mockReturnValue(undefined);

            const result = resetUserPassword('nonexistent-id', 'newpass');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/user not found/i);
        });

        it('should reset password successfully', () => {
            mockDb.getUserById.mockReturnValue({
                id: 'target-id', username: 'targetuser', password_hash: 'old_hash', role: 'USER', created_at: 'now'
            });
            mockDb.updateUserPassword.mockReturnValue(undefined);

            const result = resetUserPassword('target-id', 'new_secure_pass');
            expect(result.success).toBe(true);
            expect(mockDb.updateUserPassword).toHaveBeenCalledWith('target-id', 'hashed_password');
        });
    });

    // ─── bootstrapAdmin ───────────────────────────────────────────────────────

    describe('bootstrapAdmin()', () => {
        it('should create admin user when no users exist', () => {
            mockDb.getUserCount.mockReturnValue(0);
            mockDb.createUser.mockReturnValue({
                id: 'admin-id', username: 'admin', password_hash: 'hashed', role: 'ADMIN', created_at: 'now'
            });

            bootstrapAdmin();

            expect(mockDb.createUser).toHaveBeenCalledWith(expect.objectContaining({
                username: 'admin',
                role: 'ADMIN',
            }));
        });

        it('should NOT create admin user when users already exist', () => {
            mockDb.getUserCount.mockReturnValue(1);

            bootstrapAdmin();

            expect(mockDb.createUser).not.toHaveBeenCalled();
        });
    });
});

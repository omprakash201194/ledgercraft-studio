
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClientType } from '../clientTypeService';

// ─── Mocks ───────────────────────────────────────────────

// Mock getCurrentUser
const mockGetCurrentUser = vi.fn();
vi.mock('../auth', () => ({
    getCurrentUser: () => mockGetCurrentUser()
}));

// Mock Database
const mockRun = vi.fn();
const mockGet = vi.fn();

const mockPrepare = vi.fn((sql: string) => ({
    run: (...args: any[]) => mockRun(sql, args),
    get: (...args: any[]) => mockGet(sql, args)
}));

vi.mock('../database', () => ({
    database: {
        getConnection: () => ({
            prepare: mockPrepare
        })
    }
}));

describe('Client Type Security', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should allow ADMIN to create client type', () => {
        mockGetCurrentUser.mockReturnValue({ role: 'ADMIN', id: 'admin1' });
        // Simulating no duplicate
        mockGet.mockReturnValue(undefined);

        const result = createClientType('New Type');

        expect(result.name).toBe('New Type');
        expect(mockRun).toHaveBeenCalled();
    });

    it('should reject non-ADMIN user', () => {
        mockGetCurrentUser.mockReturnValue({ role: 'USER', id: 'user1' });

        expect(() => {
            createClientType('New Type');
        }).toThrow('Only administrators');

        expect(mockRun).not.toHaveBeenCalled();
    });

    it('should reject unauthenticated user', () => {
        mockGetCurrentUser.mockReturnValue(null);

        expect(() => {
            createClientType('New Type');
        }).toThrow('Only administrators');

        expect(mockRun).not.toHaveBeenCalled();
    });

    it('should reject duplicate name (case-insensitive)', () => {
        mockGetCurrentUser.mockReturnValue({ role: 'ADMIN', id: 'admin1' });
        // Simulate existing record found
        mockGet.mockReturnValue({ id: 'existing-id' });

        expect(() => {
            createClientType('new type'); // lowercase input
        }).toThrow('already exists');

        // Should verify that the SQL query used lower()
        expect(mockPrepare).toHaveBeenCalledWith(expect.stringContaining('lower(name) = lower(?)'));
    });
});

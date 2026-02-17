
import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Hoist the mocks so they are available inside vi.mock
const { mockExec, mockPrepare, mockPragma, mockTransaction } = vi.hoisted(() => {
    return {
        mockExec: vi.fn(),
        mockPrepare: vi.fn(),
        mockPragma: vi.fn(),
        mockTransaction: vi.fn((fn) => fn),
    };
});

// 2. Mock 'better-sqlite3' 
vi.mock('better-sqlite3', () => {
    // Return a class-like constructor
    return {
        default: vi.fn().mockImplementation(function () {
            return {
                pragma: mockPragma,
                exec: mockExec,
                prepare: mockPrepare,
                transaction: mockTransaction,
                close: vi.fn(),
            };
        })
    };
});

// 3. Import the singleton
import { database } from '../database';

describe('Client Master Book Schema (Schema Verification)', () => {

    beforeEach(() => {
        vi.clearAllMocks();

        // Return empty array for table_info checks (so safeAddColumn sees "missing" column and runs ALTER)
        mockPragma.mockReturnValue([]);

        // Re-initialize. In a real app we shouldn't do this often, but for testing schema gen it's okay.
        database.initialize(':memory:');
    });

    it('should execute CREATE TABLE statements for client schema', () => {
        expect(mockExec).toHaveBeenCalled();

        const calls = mockExec.mock.calls.map(c => c[0]);
        // Join all calls to search through all SQL executed
        const allSql = calls.join('\n');

        expect(allSql).toContain('CREATE TABLE IF NOT EXISTS client_categories');
        expect(allSql).toMatch(/id TEXT PRIMARY KEY/);

        expect(allSql).toContain('CREATE TABLE IF NOT EXISTS client_types');
        expect(allSql).toContain('CREATE TABLE IF NOT EXISTS clients');
        expect(allSql).toContain('client_type_id TEXT NOT NULL');

        expect(allSql).toContain('CREATE TABLE IF NOT EXISTS client_type_fields');
        // Check uniqueness constraint - handle potential whitespace variance with regex
        expect(allSql).toMatch(/UNIQUE\s*\(\s*client_type_id\s*,\s*field_key\s*\)/);

        expect(allSql).toContain('CREATE TABLE IF NOT EXISTS client_field_values');
    });

    it('should create index on clients(name)', () => {
        const calls = mockExec.mock.calls.map(c => c[0]);
        const allSql = calls.join('\n');
        expect(allSql).toContain('CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)');
    });

    it('should add client_id column to reports table', () => {
        // We verify that ALTER TABLE was called
        // Since safeAddColumn uses exec(), we search for it.
        const calls = mockExec.mock.calls.map(c => c[0]);
        // Filter for ALTER TABLE
        const alterCalls = calls.filter(sql => sql.includes('ALTER TABLE reports ADD COLUMN client_id'));

        expect(alterCalls.length).toBeGreaterThan(0);
        expect(alterCalls[0]).toContain('TEXT REFERENCES clients(id)');
    });
    it('should be idempotent (safe to run initialization twice)', () => {
        // First run happens in beforeEach

        // Second run
        expect(() => {
            database.initialize(':memory:');
        }).not.toThrow();

        // Check that exec was called more (indicating it tried to run schema again)
        expect(mockExec).toHaveBeenCalled();
    });
});

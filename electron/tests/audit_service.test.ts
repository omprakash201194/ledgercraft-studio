/**
 * Audit Service Unit Tests
 *
 * Validates:
 * - logAction() inserts a record via database.getConnection()
 * - logAction() does not throw when DB fails (fire-and-forget)
 * - getAuditLogs() returns paginated results
 * - getAuditLogs() applies userId and actionType filters
 * - getAnalytics() returns correct shape with counts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoist Mocks ──────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => ({
    mockDb: {
        getConnection: vi.fn(),
    },
}));

vi.mock('../database', () => ({
    database: mockDb,
}));

import { logAction, getAuditLogs, getAnalytics } from '../auditService';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeStmt(result: any) {
    return { run: vi.fn(), get: vi.fn(() => result), all: vi.fn(() => []) };
}

function makeConn(stmtFactory?: (sql: string) => any) {
    return {
        prepare: vi.fn((sql: string) => stmtFactory ? stmtFactory(sql) : makeStmt(undefined)),
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Audit Service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // ─── logAction ────────────────────────────────────────────────────────────

    describe('logAction()', () => {
        it('should insert an audit log record', () => {
            const mockRun = vi.fn();
            mockDb.getConnection.mockReturnValue({
                prepare: vi.fn(() => ({ run: mockRun })),
            });

            logAction({
                userId: 'u1',
                actionType: 'USER_LOGIN',
                entityType: 'USER',
                entityId: 'u1',
            });

            expect(mockRun).toHaveBeenCalledWith(
                expect.any(String), // uuid
                'u1',
                'USER_LOGIN',
                'USER',
                'u1',
                null, // no metadata
                expect.any(String) // ISO timestamp
            );
        });

        it('should serialize metadata to JSON', () => {
            const mockRun = vi.fn();
            mockDb.getConnection.mockReturnValue({
                prepare: vi.fn(() => ({ run: mockRun })),
            });

            logAction({
                userId: 'u1',
                actionType: 'TEMPLATE_UPLOAD',
                entityType: 'TEMPLATE',
                entityId: 'tmpl-1',
                metadata: { name: 'Invoice' },
            });

            const callArgs = mockRun.mock.calls[0];
            expect(callArgs[5]).toBe(JSON.stringify({ name: 'Invoice' }));
        });

        it('should store null entityId when not provided', () => {
            const mockRun = vi.fn();
            mockDb.getConnection.mockReturnValue({
                prepare: vi.fn(() => ({ run: mockRun })),
            });

            logAction({
                userId: 'u1',
                actionType: 'REPORT_GENERATE',
                entityType: 'REPORT',
            });

            const callArgs = mockRun.mock.calls[0];
            expect(callArgs[4]).toBeNull(); // entityId = null
        });

        it('should not throw when database fails (fire-and-forget)', () => {
            mockDb.getConnection.mockImplementation(() => {
                throw new Error('DB connection error');
            });

            // Should not throw — logAction swallows errors
            expect(() => {
                logAction({ userId: 'u1', actionType: 'TEST', entityType: 'USER' });
            }).not.toThrow();
        });
    });

    // ─── getAuditLogs ─────────────────────────────────────────────────────────

    describe('getAuditLogs()', () => {
        it('should return logs and total count with defaults', () => {
            const mockLogs = [
                { id: 'log1', user_id: 'u1', action_type: 'USER_LOGIN', entity_type: 'USER', created_at: '2024-01-01' },
            ];

            const stmtFactory = (sql: string) => {
                if (sql.includes('COUNT(*)')) {
                    return { get: vi.fn((...args: any[]) => ({ count: 1 })) };
                }
                return { all: vi.fn((...args: any[]) => mockLogs) };
            };

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            const result = getAuditLogs();

            expect(result.total).toBe(1);
            expect(result.logs).toEqual(mockLogs);
        });

        it('should apply userId filter to WHERE clause', () => {
            let capturedSql = '';
            let capturedParams: any[] = [];

            const stmtFactory = (sql: string) => ({
                get: vi.fn((...args: any[]) => { capturedSql = sql; capturedParams = args; return { count: 0 }; }),
                all: vi.fn((...args: any[]) => []),
            });

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            getAuditLogs(1, 50, { userId: 'specific-user' });

            expect(capturedSql).toContain('user_id = ?');
            expect(capturedParams).toContain('specific-user');
        });

        it('should apply actionType filter when provided', () => {
            let capturedParams: any[] = [];

            const stmtFactory = (sql: string) => ({
                get: vi.fn((...args: any[]) => { capturedParams = args; return { count: 0 }; }),
                all: vi.fn((...args: any[]) => []),
            });

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            getAuditLogs(1, 50, { actionType: 'REPORT_GENERATE' });

            expect(capturedParams).toContain('REPORT_GENERATE');
        });

        it('should apply both userId and actionType filters together', () => {
            let capturedSql = '';

            const stmtFactory = (sql: string) => ({
                get: vi.fn((...args: any[]) => { capturedSql = sql; return { count: 0 }; }),
                all: vi.fn((...args: any[]) => []),
            });

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            getAuditLogs(1, 50, { userId: 'u1', actionType: 'USER_LOGIN' });

            expect(capturedSql).toContain('user_id = ?');
            expect(capturedSql).toContain('action_type = ?');
        });

        it('should return empty logs array when no records', () => {
            const stmtFactory = (sql: string) => {
                if (sql.includes('COUNT(*)')) return { get: vi.fn(() => ({ count: 0 })) };
                return { all: vi.fn(() => []) };
            };

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            const result = getAuditLogs(2, 10);

            expect(result.total).toBe(0);
            expect(result.logs).toEqual([]);
        });
    });

    // ─── getAnalytics ─────────────────────────────────────────────────────────

    describe('getAnalytics()', () => {
        it('should return the correct analytics shape', () => {
            const stmtFactory = (sql: string) => {
                // COUNT queries
                if (sql.includes("action_type = 'REPORT_GENERATE'") && !sql.includes('GROUP') && !sql.includes('created_at >=')) {
                    return { get: vi.fn(() => ({ count: 42 })), all: vi.fn(() => []) };
                }
                if (sql.includes("action_type = 'REPORT_DELETE'")) {
                    return { get: vi.fn(() => ({ count: 5 })), all: vi.fn(() => []) };
                }
                if (sql.includes('created_at >=')) {
                    return { get: vi.fn(() => ({ count: 3 })), all: vi.fn(() => []) };
                }
                // GROUP BY queries
                if (sql.includes('GROUP BY')) {
                    return { get: vi.fn(() => undefined), all: vi.fn(() => []) };
                }
                return { get: vi.fn(() => ({ count: 0 })), all: vi.fn(() => []) };
            };

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            const analytics = getAnalytics();

            expect(analytics).toHaveProperty('totalReports');
            expect(analytics).toHaveProperty('deletedReports');
            expect(analytics).toHaveProperty('reportsThisMonth');
            expect(analytics).toHaveProperty('reportsByUser');
            expect(analytics).toHaveProperty('topForms');
            expect(analytics).toHaveProperty('monthlyTrend');
        });

        it('should return totalReports from REPORT_GENERATE count', () => {
            let callIdx = 0;
            const counts = [42, 5, 3];

            const stmtFactory = (sql: string) => {
                if (sql.includes('GROUP BY') || sql.includes('strftime')) {
                    return { get: vi.fn(() => undefined), all: vi.fn(() => []) };
                }
                const count = counts[callIdx++] ?? 0;
                return { get: vi.fn(() => ({ count })), all: vi.fn(() => []) };
            };

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            const analytics = getAnalytics();

            expect(analytics.totalReports).toBe(42);
            expect(analytics.deletedReports).toBe(5);
            expect(analytics.reportsThisMonth).toBe(3);
        });

        it('should return arrays for reportsByUser, topForms, monthlyTrend', () => {
            const reportsByUserData = [{ name: 'admin', value: 10 }, { name: 'user1', value: 3 }];

            let callIdx = 0;
            const stmtFactory = (sql: string) => {
                if (sql.includes('GROUP BY u.username')) {
                    return { get: vi.fn(() => undefined), all: vi.fn(() => reportsByUserData) };
                }
                if (sql.includes('GROUP BY')) {
                    return { get: vi.fn(() => undefined), all: vi.fn(() => []) };
                }
                const count = callIdx++ === 0 ? 10 : 0;
                return { get: vi.fn(() => ({ count })), all: vi.fn(() => []) };
            };

            mockDb.getConnection.mockReturnValue(makeConn(stmtFactory));

            const analytics = getAnalytics();

            expect(Array.isArray(analytics.reportsByUser)).toBe(true);
            expect(Array.isArray(analytics.topForms)).toBe(true);
            expect(Array.isArray(analytics.monthlyTrend)).toBe(true);
        });
    });
});

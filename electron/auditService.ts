import { v4 as uuidv4 } from 'uuid';
import { database } from './database';

// ─── Types ───────────────────────────────────────────────

export interface logActionInput {
    userId: string;
    actionType: string;
    entityType: string;
    entityId?: string;
    metadata?: any;
}

export interface AuditLog {
    id: string;
    user_id: string;
    username?: string; // Joined
    action_type: string;
    entity_type: string;
    entity_id?: string;
    metadata_json?: string;
    created_at: string;
}

export interface AnalyticsStats {
    totalReports: number;
    deletedReports: number;
    reportsThisMonth: number;
    reportsByUser: { name: string; value: number }[];
    topForms: { name: string; value: number }[];
    monthlyTrend: { name: string; value: number }[];
}

// ─── Service ─────────────────────────────────────────────

export function logAction(input: logActionInput) {
    try {
        const db = database.getConnection();
        const stmt = db.prepare(`
            INSERT INTO audit_logs (id, user_id, action_type, entity_type, entity_id, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            uuidv4(),
            input.userId,
            input.actionType,
            input.entityType,
            input.entityId || null,
            input.metadata ? JSON.stringify(input.metadata) : null,
            new Date().toISOString()
        );
    } catch (err) {
        console.error('[Audit] Failed to log action:', err);
        // Don't throw, we don't want to break the main flow
    }
}

export function getAuditLogs(page = 1, pageSize = 50, filters?: any): { logs: AuditLog[], total: number } {
    const db = database.getConnection();
    const offset = (page - 1) * pageSize;

    let whereClause = '1=1';
    const params: any[] = [];

    if (filters?.userId) {
        whereClause += ' AND a.user_id = ?';
        params.push(filters.userId);
    }
    if (filters?.actionType) {
        whereClause += ' AND a.action_type = ?';
        params.push(filters.actionType);
    }
    // Add date range filters if needed

    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM audit_logs a WHERE ${whereClause}`);
    const total = countStmt.get(...params) as { count: number };

    const query = `
        SELECT a.*, u.username
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
        WHERE ${whereClause}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    `;

    const stmt = db.prepare(query);
    const logs = stmt.all(...params, pageSize, offset) as AuditLog[];

    return { logs, total: total.count };
}

export function getAnalytics(): AnalyticsStats {
    const db = database.getConnection();

    // Total Reports (Active)
    const totalReports = (db.prepare('SELECT COUNT(*) as count FROM reports').get() as { count: number }).count;

    // Deleted Reports (from Audit Logs)
    const deletedReports = (db.prepare("SELECT COUNT(*) as count FROM audit_logs WHERE action_type = 'REPORT_DELETE'").get() as { count: number }).count;

    // Reports This Month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const reportsThisMonth = (db.prepare('SELECT COUNT(*) as count FROM reports WHERE generated_at >= ?').get(startOfMonth.toISOString()) as { count: number }).count;

    // Reports By User
    const reportsByUser = db.prepare(`
        SELECT u.username as name, COUNT(r.id) as value
        FROM reports r
        JOIN users u ON r.generated_by = u.id
        GROUP BY u.username
    `).all() as { name: string; value: number }[];

    // Top Forms
    const topForms = db.prepare(`
        SELECT f.name as name, COUNT(r.id) as value
        FROM reports r
        JOIN forms f ON r.form_id = f.id
        GROUP BY f.name
        ORDER BY value DESC
        LIMIT 5
    `).all() as { name: string; value: number }[];

    // Monthly Trend (Last 6 months)
    // SQLite doesn't have great date functions built-in for formatting, so we might need to process in JS or use strftime
    const monthlyTrend = db.prepare(`
        SELECT strftime('%Y-%m', generated_at) as name, COUNT(*) as value
        FROM reports
        GROUP BY name
        ORDER BY name DESC
        LIMIT 6
    `).all() as { name: string; value: number }[];

    return {
        totalReports,
        deletedReports,
        reportsThisMonth,
        reportsByUser,
        topForms,
        monthlyTrend: monthlyTrend.reverse()
    };
}

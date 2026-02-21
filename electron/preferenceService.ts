import { database } from './database';

export interface UserPreferences {
    user_id: string;
    theme: 'light' | 'dark';
    date_format: string;
    client_columns?: string;
    updated_at: string;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
    user_id: '',
    theme: 'light',
    date_format: 'DD-MM-YYYY',
    client_columns: '[]',
    updated_at: new Date().toISOString()
};

export function getUserPreferences(userId: string): UserPreferences {
    const db = database.getConnection();
    const row = db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);

    if (!row) {
        // Return default but don't save yet until user changes something? 
        // Or save immediately? Let's return default.
        return { ...DEFAULT_PREFERENCES, user_id: userId };
    }

    return row as UserPreferences;
}

export function updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): UserPreferences {
    const db = database.getConnection();

    // Check if exists
    const current = getUserPreferences(userId);
    const updated = { ...current, ...preferences, updated_at: new Date().toISOString() };

    const exists = db.prepare('SELECT 1 FROM user_preferences WHERE user_id = ?').get(userId);

    if (exists) {
        db.prepare(`
            UPDATE user_preferences 
            SET theme = ?, date_format = ?, client_columns = ?, updated_at = ?
            WHERE user_id = ?
        `).run(updated.theme, updated.date_format, updated.client_columns || '[]', updated.updated_at, userId);
    } else {
        db.prepare(`
            INSERT INTO user_preferences (user_id, theme, date_format, client_columns, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(userId, updated.theme, updated.date_format, updated.client_columns || '[]', updated.updated_at);
    }

    return updated;
}

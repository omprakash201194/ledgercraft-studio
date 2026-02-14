import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// ─── Types ───────────────────────────────────────────────

export interface User {
    id: string;
    username: string;
    password_hash: string;
    role: string;
    created_at: string;
}

export interface Template {
    id: string;
    name: string;
    file_path: string;
    created_at: string;
}

export interface TemplatePlaceholder {
    id: string;
    template_id: string;
    placeholder_key: string;
}

export interface Form {
    id: string;
    name: string;
    template_id: string;
    created_at: string;
}

export interface FormField {
    id: string;
    form_id: string;
    label: string;
    field_key: string;
    data_type: string;
    required: number;
    placeholder_mapping: string | null;
    options_json: string | null;
}

export interface Report {
    id: string;
    form_id: string;
    generated_by: string;
    file_path: string;
    generated_at: string;
}

// ─── Database Class ──────────────────────────────────────

class Database {
    private db: BetterSqlite3.Database | null = null;
    private dbPath: string = '';

    /**
     * Initialize the database connection and create schema.
     * Must be called after storage initialization.
     */
    initialize(appDataPath: string): void {
        this.dbPath = path.join(appDataPath, 'database.sqlite');
        this.db = new BetterSqlite3(this.dbPath);

        // Enable WAL mode for better concurrent read performance
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

        this.createSchema();
        console.log(`[Database] Initialized at: ${this.dbPath}`);
    }

    /**
     * Returns the raw better-sqlite3 connection.
     */
    getConnection(): BetterSqlite3.Database {
        if (!this.db) {
            throw new Error('Database not initialized. Call initialize() first.');
        }
        return this.db;
    }

    /**
     * Gracefully close the database connection.
     */
    close(): void {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('[Database] Connection closed.');
        }
    }

    // ─── Schema ──────────────────────────────────────────

    private createSchema(): void {
        const db = this.getConnection();

        db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_placeholders (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        placeholder_key TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES templates(id)
      );

      CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        template_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES templates(id)
      );

      CREATE TABLE IF NOT EXISTS form_fields (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL,
        label TEXT NOT NULL,
        field_key TEXT NOT NULL,
        data_type TEXT NOT NULL,
        required INTEGER NOT NULL,
        placeholder_mapping TEXT,
        options_json TEXT,
        FOREIGN KEY (form_id) REFERENCES forms(id)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL,
        generated_by TEXT NOT NULL,
        file_path TEXT NOT NULL,
        generated_at TEXT NOT NULL,
        FOREIGN KEY (form_id) REFERENCES forms(id),
        FOREIGN KEY (generated_by) REFERENCES users(id)
      );
    `);
    }

    // ─── Repository: Users ───────────────────────────────

    createUser(user: Omit<User, 'id' | 'created_at'>): User {
        const db = this.getConnection();
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
        stmt.run(id, user.username, user.password_hash, user.role, created_at);

        return { id, ...user, created_at };
    }

    findUserByUsername(username: string): User | undefined {
        const db = this.getConnection();
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        return stmt.get(username) as User | undefined;
    }

    // ─── Repository: Templates ───────────────────────────

    createTemplate(template: Omit<Template, 'id' | 'created_at'>): Template {
        const db = this.getConnection();
        const id = uuidv4();
        const created_at = new Date().toISOString();

        const stmt = db.prepare(`
      INSERT INTO templates (id, name, file_path, created_at)
      VALUES (?, ?, ?, ?)
    `);
        stmt.run(id, template.name, template.file_path, created_at);

        return { id, ...template, created_at };
    }

    getTemplates(): Template[] {
        const db = this.getConnection();
        const stmt = db.prepare('SELECT * FROM templates ORDER BY created_at DESC');
        return stmt.all() as Template[];
    }
}

// Export singleton instance
export const database = new Database();

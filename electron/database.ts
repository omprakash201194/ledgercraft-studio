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

  getUserCount(): number {
    const db = this.getConnection();
    const row = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    return row.count;
  }

  getAllUsers(): User[] {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
    return stmt.all() as User[];
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

  getTemplatesWithPlaceholderCount(): (Template & { placeholder_count: number })[] {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT t.*, COUNT(tp.id) as placeholder_count
      FROM templates t
      LEFT JOIN template_placeholders tp ON tp.template_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return stmt.all() as (Template & { placeholder_count: number })[];
  }

  // ─── Repository: Template Placeholders ─────────────────

  createPlaceholder(placeholder: Omit<TemplatePlaceholder, 'id'>): TemplatePlaceholder {
    const db = this.getConnection();
    const id = uuidv4();

    const stmt = db.prepare(`
      INSERT INTO template_placeholders (id, template_id, placeholder_key)
      VALUES (?, ?, ?)
    `);
    stmt.run(id, placeholder.template_id, placeholder.placeholder_key);

    return { id, ...placeholder };
  }

  getPlaceholdersByTemplateId(templateId: string): TemplatePlaceholder[] {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM template_placeholders WHERE template_id = ?');
    return stmt.all(templateId) as TemplatePlaceholder[];
  }

  // ─── Repository: Forms ─────────────────────────────────

  createForm(form: Omit<Form, 'id' | 'created_at'>, fields: Omit<FormField, 'id' | 'form_id'>[]): Form {
    const db = this.getConnection();
    const formId = uuidv4();
    const created_at = new Date().toISOString();

    const insertForm = db.prepare(`
      INSERT INTO forms (id, name, template_id, created_at)
      VALUES (?, ?, ?, ?)
    `);

    const insertField = db.prepare(`
      INSERT INTO form_fields (id, form_id, label, field_key, data_type, required, placeholder_mapping, options_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertForm.run(formId, form.name, form.template_id, created_at);

      for (const field of fields) {
        const fieldId = uuidv4();
        insertField.run(
          fieldId,
          formId,
          field.label,
          field.field_key,
          field.data_type,
          field.required,
          field.placeholder_mapping || null,
          field.options_json || null
        );
      }
    });

    transaction();
    return { id: formId, name: form.name, template_id: form.template_id, created_at };
  }

  getFormsWithDetails(): (Form & { template_name: string; field_count: number })[] {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT f.*, t.name as template_name, COUNT(ff.id) as field_count
      FROM forms f
      LEFT JOIN templates t ON t.id = f.template_id
      LEFT JOIN form_fields ff ON ff.form_id = f.id
      GROUP BY f.id
      ORDER BY f.created_at DESC
    `);
    return stmt.all() as (Form & { template_name: string; field_count: number })[];
  }

  getFormById(formId: string): (Form & { template_name: string }) | undefined {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT f.*, t.name as template_name
      FROM forms f
      LEFT JOIN templates t ON t.id = f.template_id
      WHERE f.id = ?
    `);
    return stmt.get(formId) as (Form & { template_name: string }) | undefined;
  }

  getFormFields(formId: string): FormField[] {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM form_fields WHERE form_id = ? ORDER BY rowid');
    return stmt.all(formId) as FormField[];
  }

  // ─── Repository: Reports ──────────────────────────────

  createReport(report: Omit<Report, 'id' | 'generated_at'>): Report {
    const db = this.getConnection();
    const id = uuidv4();
    const generated_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reports (id, form_id, generated_by, file_path, generated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, report.form_id, report.generated_by, report.file_path, generated_at);

    return { id, ...report, generated_at };
  }

  getReportsWithDetails(): (Report & { form_name: string; generated_by_username: string })[] {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT r.*, f.name as form_name, u.username as generated_by_username
      FROM reports r
      LEFT JOIN forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.generated_by
      ORDER BY r.generated_at DESC
    `);
    return stmt.all() as (Report & { form_name: string; generated_by_username: string })[];
  }

  getReportsByUser(userId: string): (Report & { form_name: string; generated_by_username: string })[] {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT r.*, f.name as form_name, u.username as generated_by_username
      FROM reports r
      LEFT JOIN forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.generated_by
      WHERE r.generated_by = ?
      ORDER BY r.generated_at DESC
    `);
    return stmt.all(userId) as (Report & { form_name: string; generated_by_username: string })[];
  }
}

// Export singleton instance
export const database = new Database();

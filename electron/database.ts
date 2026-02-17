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

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  type: 'TEMPLATE' | 'FORM';
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  file_path: string;
  category_id?: string | null;
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
  category_id?: string | null;
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
  format_options?: string | null;
}

export interface Report {
  id: string;
  form_id: string;
  generated_by: string;
  file_path: string;
  generated_at: string;
  input_values?: string; // JSON string
}

// ─── Database Class ──────────────────────────────────────

class Database {
  private db: BetterSqlite3.Database | null = null;
  private dbPath: string = '';
  private isCorrupted: boolean = false;
  private corruptionError: string | null = null;

  /**
   * Initialize the database connection and create schema.
   * Must be called after storage initialization.
   */
  initialize(appDataPath: string): void {
    this.dbPath = path.join(appDataPath, 'database.sqlite');

    try {
      this.db = new BetterSqlite3(this.dbPath);

      // Enable WAL mode for better concurrent read performance
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');

      this.createSchema();

    } catch (err) {
      console.error('[Database] CORRUPTION DETECTED:', err);
      this.isCorrupted = true;
      this.corruptionError = String(err);
      // Allow app to continue so we can show error screen
    }
  }

  /**
   * Returns the raw better-sqlite3 connection.
   */
  getConnection(): BetterSqlite3.Database {
    if (this.isCorrupted) {
      throw new Error(`Database is corrupted: ${this.corruptionError}`);
    }
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  getDbStatus() {
    return {
      isCorrupted: this.isCorrupted,
      error: this.corruptionError,
      path: this.dbPath
    };
  }

  /**
   * Gracefully close the database connection.
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;

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

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      );

      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at TEXT NOT NULL
        -- category_id added via migration below
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
        -- category_id added via migration below
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

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        action_type TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        theme TEXT NOT NULL DEFAULT 'light',
        date_format TEXT NOT NULL DEFAULT 'DD-MM-YYYY',
        updated_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      /* ─── Client Master Book ─── */
      
      CREATE TABLE IF NOT EXISTS client_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT NULL,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS client_type_fields (
        id TEXT PRIMARY KEY,
        client_type_id TEXT NOT NULL,
        label TEXT NOT NULL,
        field_key TEXT NOT NULL,
        data_type TEXT NOT NULL,
        is_required INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY(client_type_id) REFERENCES client_types(id),
        UNIQUE(client_type_id, field_key)
      );

      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_type_id TEXT NOT NULL,
        category_id TEXT NULL,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(client_type_id) REFERENCES client_types(id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);

      CREATE TABLE IF NOT EXISTS client_field_values (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        field_id TEXT NOT NULL,
        value TEXT,
        FOREIGN KEY(client_id) REFERENCES clients(id),
        FOREIGN KEY(field_id) REFERENCES client_type_fields(id)
      );
      
      /* 
         PAN Uniqueness Enforcement:
         Ideally, we want: UNIQUE(value) WHERE field.field_key='pan' AND client.is_deleted=0.
         
         SQLite Partial Indexes can only filter on columns in the indexed table.
         'client_field_values' does not contain 'field_key' or 'is_deleted'.
         
         Therefore, PAN uniqueness (per client_type, for non-deleted clients) 
         MUST be enforced in the application layer (ClientService).
         
         Attempting a complex trigger-based solution is risky and complex to maintain here.
         We defer this check to the insertion/update logic in the app.
      */
    `);

    // ─── Migrations ──────────────────────────────────────
    this.safeAddColumn('templates', 'category_id', 'TEXT');
    this.safeAddColumn('forms', 'category_id', 'TEXT');
    this.safeAddColumn('forms', 'is_deleted', 'INTEGER DEFAULT 0');
    this.safeAddColumn('reports', 'input_values', 'TEXT');
    this.safeAddColumn('form_fields', 'format_options', 'TEXT');

    // Client Master Book migrations
    this.safeAddColumn('reports', 'client_id', 'TEXT REFERENCES clients(id)');
  }

  private safeAddColumn(tableName: string, columnName: string, columnType: string): void {
    const db = this.getConnection();
    const tableInfo = db.pragma(`table_info(${tableName})`) as { name: string }[];
    const columnExists = tableInfo.some((col) => col.name === columnName);

    if (!columnExists) {
      db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
      console.error(`[Database] Added column ${columnName} to ${tableName}`);
    }
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

  getUserById(id: string): User | undefined {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
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

  updateUserPassword(id: string, password_hash: string): void {
    const db = this.getConnection();
    const stmt = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
    stmt.run(password_hash, id);
  }

  // ─── Repository: Templates ───────────────────────────

  createTemplate(template: Omit<Template, 'id' | 'created_at'>): Template {
    const db = this.getConnection();
    const id = uuidv4();
    const created_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO templates (id, name, file_path, category_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, template.name, template.file_path, template.category_id || null, created_at);

    return { id, ...template, created_at };
  }

  getTemplates(page: number = 1, limit: number = 10, categoryId?: string | null): { templates: (Template & { placeholder_count: number })[]; total: number } {
    const db = this.getConnection();
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) as count FROM templates';
    let dataQuery = `
        SELECT t.*, COUNT(tp.id) as placeholder_count
        FROM templates t
        LEFT JOIN template_placeholders tp ON tp.template_id = t.id
    `;
    const params: any[] = [];

    let whereClause = '';
    if (categoryId !== undefined) {
      if (categoryId === null) {
        whereClause = ' WHERE t.category_id IS NULL';
      } else {
        whereClause = ' WHERE t.category_id = ?';
        params.push(categoryId);
      }
    }

    const countResult = db.prepare(countQuery + whereClause.replace('t.', '')).get(...params) as { count: number };
    const total = countResult.count;

    dataQuery += whereClause;
    dataQuery += ' GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?';

    const templates = db.prepare(dataQuery).all(...params, limit, offset) as (Template & { placeholder_count: number })[];

    return { templates, total };
  }

  getTemplateById(id: string): Template | undefined {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM templates WHERE id = ?');
    return stmt.get(id) as Template | undefined;
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
      INSERT INTO forms (id, name, template_id, category_id, created_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, 0)
    `);

    const insertField = db.prepare(`
      INSERT INTO form_fields (id, form_id, label, field_key, data_type, required, placeholder_mapping, options_json, format_options)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertForm.run(formId, form.name, form.template_id, form.category_id || null, created_at);

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
          field.options_json || null,
          field.format_options || null
        );
      }
    });

    transaction();
    return { id: formId, name: form.name, template_id: form.template_id, created_at };
  }

  updateForm(id: string, updates: Partial<Omit<Form, 'id' | 'created_at'>>, fields?: Omit<FormField, 'id' | 'form_id'>[]): Form {
    const db = this.getConnection();

    // Get existing form
    const existing = db.prepare('SELECT * FROM forms WHERE id = ?').get(id) as Form;
    if (!existing) throw new Error(`Form with ID ${id} not found`);

    const transaction = db.transaction(() => {
      // 1. Update Form details
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.name !== undefined) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.category_id !== undefined) {
        updateFields.push('category_id = ?');
        updateValues.push(updates.category_id);
      }
      if (updates.template_id !== undefined) {
        updateFields.push('template_id = ?');
        updateValues.push(updates.template_id);
      }

      if (updateFields.length > 0) {
        updateValues.push(id);
        db.prepare(`UPDATE forms SET ${updateFields.join(', ')} WHERE id = ?`).run(...updateValues);
      }

      // 2. Update Fields (Delete all and re-insert if fields provided)
      if (fields) {
        db.prepare('DELETE FROM form_fields WHERE form_id = ?').run(id);

        const insertField = db.prepare(`
          INSERT INTO form_fields (id, form_id, label, field_key, data_type, required, placeholder_mapping, options_json, format_options)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const field of fields) {
          insertField.run(
            uuidv4(),
            id,
            field.label,
            field.field_key,
            field.data_type,
            field.required,
            field.placeholder_mapping || null,
            field.options_json || null,
            field.format_options || null
          );
        }
      }
    });

    transaction();

    return (this.getFormById(id) as any)!; // simpler cast for now
  }

  getFormsWithDetails(page: number, limit: number, categoryId?: string | null, includeArchived: boolean = false): { forms: (Form & { template_name: string; field_count: number })[]; total: number } {
    const db = this.getConnection();
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (!includeArchived) {
      whereClause += ' AND f.is_deleted = 0';
    }

    if (categoryId !== undefined) {
      if (categoryId === null) {
        whereClause += ' AND f.category_id IS NULL';
      } else {
        whereClause += ' AND f.category_id = ?';
        params.push(categoryId);
      }
    }

    // We can't rename count to 'total' inside the query easily without wrapper
    const countStmt = db.prepare(`SELECT COUNT(*) as count FROM forms f ${whereClause}`);
    const total = (countStmt.get(...params) as { count: number }).count;

    const stmt = db.prepare(`
      SELECT f.*, t.name as template_name, COUNT(ff.id) as field_count
      FROM forms f
      LEFT JOIN templates t ON t.id = f.template_id
      LEFT JOIN form_fields ff ON ff.form_id = f.id
      ${whereClause}
      GROUP BY f.id
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `);

    const forms = stmt.all(...params, limit, offset) as (Form & { template_name: string; field_count: number })[];
    return { forms, total };
  }

  getFormById(formId: string): (Form & { template_name: string }) | undefined {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT f.*, t.name as template_name
      FROM forms f
      LEFT JOIN templates t ON t.id = f.template_id
      WHERE f.id = ? AND f.is_deleted = 0
    `);
    return stmt.get(formId) as (Form & { template_name: string }) | undefined;
  }

  getFormFields(formId: string): FormField[] {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM form_fields WHERE form_id = ? ORDER BY rowid');
    return stmt.all(formId) as FormField[];
  }

  getFormsWithHierarchy(): { id: string; name: string; parent_id: string | null; type: 'CATEGORY' | 'FORM' }[] {
    const db = this.getConnection();
    // Get all categories of type FORM
    const categories = db.prepare(`SELECT id, name, parent_id, 'CATEGORY' as type FROM categories WHERE type = 'FORM'`).all();
    // Get all forms (non-deleted)
    const forms = db.prepare(`SELECT id, name, category_id as parent_id, 'FORM' as type FROM forms WHERE is_deleted = 0`).all();

    return [...categories, ...forms] as { id: string; name: string; parent_id: string | null; type: 'CATEGORY' | 'FORM' }[];
  }

  getRecentForms(limit: number): (Form & { usage_count: number })[] {
    const db = this.getConnection();
    const stmt = db.prepare(`
      SELECT f.*, COUNT(r.id) as usage_count, MAX(r.generated_at) as last_used
      FROM reports r
      JOIN forms f ON f.id = r.form_id
      WHERE f.is_deleted = 0
      GROUP BY f.id
      ORDER BY last_used DESC
      LIMIT ?
    `);
    const forms = stmt.all(limit) as (Form & { usage_count: number })[];

    // If we don't have enough recent forms, fill with newest forms
    if (forms.length < limit) {
      const existingIds = forms.map(f => f.id);
      const placeholders = existingIds.length > 0 ? existingIds.map(() => '?').join(',') : "''";

      const remaining = limit - forms.length;
      const extraForms = db.prepare(`
            SELECT *, 0 as usage_count FROM forms 
            WHERE id NOT IN (${placeholders}) AND is_deleted = 0
            ORDER BY created_at DESC
            LIMIT ?
        `).all(...existingIds, remaining) as (Form & { usage_count: number })[];

      return [...forms, ...extraForms];
    }

    return forms;
  }

  // ─── Repository: Reports ──────────────────────────────

  createReport(report: Omit<Report, 'id' | 'generated_at'>): Report {
    const db = this.getConnection();
    const id = uuidv4();
    const generated_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO reports (id, form_id, generated_by, file_path, generated_at, input_values)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, report.form_id, report.generated_by, report.file_path, generated_at, report.input_values || null);

    return { id, ...report, generated_at };
  }

  getReportById(id: string): Report | undefined {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM reports WHERE id = ?');
    return stmt.get(id) as Report | undefined;
  }

  getReportsWithDetails(page: number = 1, limit: number = 10, formId?: string, search?: string, sortBy: string = 'generated_at', sortOrder: 'ASC' | 'DESC' = 'DESC'): { reports: (Report & { form_name: string; generated_by_username: string })[]; total: number } {
    const db = this.getConnection();
    const offset = (page - 1) * limit;

    let countQuery = 'SELECT COUNT(*) as count FROM reports r LEFT JOIN forms f ON f.id = r.form_id';
    let dataQuery = `
      SELECT r.*, f.name as form_name, u.username as generated_by_username
      FROM reports r
      LEFT JOIN forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.generated_by
    `;

    const params: any[] = [];
    const countParams: any[] = [];
    const conditions: string[] = [];

    if (formId) {
      conditions.push('r.form_id = ?');
      params.push(formId);
      countParams.push(formId);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      conditions.push('(r.file_path LIKE ? OR f.name LIKE ? OR r.generated_at LIKE ?)');
      // Accessing params for data query: 3 placeholders
      params.push(searchPattern, searchPattern, searchPattern);
      // Accessing params for count query: 3 placeholders
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      countQuery += whereClause;
      dataQuery += whereClause;
    }

    // specific allow list for sort columns to prevent SQL injection
    const allowedSorts: Record<string, string> = {
      'generated_at': 'r.generated_at',
      'form_name': 'f.name',
      'file_path': 'r.file_path'
    };
    const sortColumn = allowedSorts[sortBy] || 'r.generated_at';
    const direction = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    dataQuery += ` ORDER BY ${sortColumn} ${direction} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const countStmt = db.prepare(countQuery);
    const total = (countStmt.get(...countParams) as { count: number }).count;

    const stmt = db.prepare(dataQuery);

    const reports = stmt.all(...params) as (Report & { form_name: string; generated_by_username: string })[];
    return { reports, total };
  }

  deleteReport(id: string): void {
    const db = this.getConnection();
    const stmt = db.prepare('DELETE FROM reports WHERE id = ?');
    stmt.run(id);
  }



  getReportsByUser(userId: string, sortBy: string = 'generated_at', sortOrder: 'ASC' | 'DESC' = 'DESC'): (Report & { form_name: string; generated_by_username: string })[] {
    const db = this.getConnection();

    const allowedSorts: Record<string, string> = {
      'generated_at': 'r.generated_at',
      'form_name': 'f.name',
      'file_path': 'r.file_path'
    };
    const sortColumn = allowedSorts[sortBy] || 'r.generated_at';
    const direction = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    const stmt = db.prepare(`
      SELECT r.*, f.name as form_name, u.username as generated_by_username
      FROM reports r
      LEFT JOIN forms f ON f.id = r.form_id
      LEFT JOIN users u ON u.id = r.generated_by
      WHERE r.generated_by = ?
      ORDER BY ${sortColumn} ${direction}
    `);
    return stmt.all(userId) as (Report & { form_name: string; generated_by_username: string })[];
  }

  // ─── Repository: Categories ───────────────────────────

  createCategory(category: Omit<Category, 'id' | 'created_at'>): Category {
    const db = this.getConnection();
    const id = uuidv4();
    const created_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO categories (id, name, parent_id, type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, category.name, category.parent_id, category.type, created_at);

    return { id, ...category, created_at };
  }

  getAllCategoriesByType(type: 'TEMPLATE' | 'FORM'): Category[] {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY name ASC');
    return stmt.all(type) as Category[];
  }

  getTemplateUsageCount(templateId: string): number {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM forms WHERE template_id = ?'); // Counts BOTH active and archived
    const result = stmt.get(templateId) as { count: number };
    return result.count;
  }

  getCategoryById(id: string): Category | undefined {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT * FROM categories WHERE id = ?');
    return stmt.get(id) as Category | undefined;
  }

  updateCategoryName(id: string, name: string): void {
    const db = this.getConnection();
    const stmt = db.prepare('UPDATE categories SET name = ? WHERE id = ?');
    stmt.run(name, id);
  }

  deleteCategory(id: string): void {
    const db = this.getConnection();
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    stmt.run(id);
  }

  // Check for dependencies before delete
  getCategoryChildrenCount(id: string): number {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?');
    const result = stmt.get(id) as { count: number };
    return result.count;
  }

  getCategoryItemCount(id: string, type: 'TEMPLATE' | 'FORM'): number {
    const db = this.getConnection();
    const table = type === 'TEMPLATE' ? 'templates' : 'forms';
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${table} WHERE category_id = ?`);
    const result = stmt.get(id) as { count: number };
    return result.count;
  }

  // ─── Repository: Item Management (Move/Delete) ───────

  updateTemplateCategory(templateId: string, categoryId: string | null): void {
    const db = this.getConnection();
    const stmt = db.prepare('UPDATE templates SET category_id = ? WHERE id = ?');
    stmt.run(categoryId, templateId);
  }

  updateFormCategory(formId: string, categoryId: string | null): void {
    const db = this.getConnection();
    const stmt = db.prepare('UPDATE forms SET category_id = ? WHERE id = ?');
    stmt.run(categoryId, formId);
  }

  // Check if template is used by any form
  isTemplateUsed(templateId: string): boolean {
    return this.getTemplateUsageCount(templateId) > 0;
  }

  deleteTemplate(id: string, force: boolean = false): void {
    const db = this.getConnection();

    const deletePlaceholders = db.prepare('DELETE FROM template_placeholders WHERE template_id = ?');
    const deleteTemplate = db.prepare('DELETE FROM templates WHERE id = ?');

    const deleteForms = db.prepare('DELETE FROM forms WHERE template_id = ?');
    // We also need to delete form fields and reports if we are force deleting forms
    // But for now let's assume 'forms' delete triggers need to be handled or we do it manually.
    // SQLite doesn't cascade by default unless configured. Let's do manual cleanup safely.

    // To properly delete forms, we should probably rely on a more robust method if we had one, 
    // but here we'll do:
    // 1. Get all form IDs
    // 2. Delete reports for those forms
    // 3. Delete form fields
    // 4. Delete forms

    const getFormIds = db.prepare('SELECT id FROM forms WHERE template_id = ?');

    db.transaction(() => {
      if (force) {
        const forms = getFormIds.all(id) as { id: string }[];
        for (const form of forms) {
          db.prepare('DELETE FROM reports WHERE form_id = ?').run(form.id);
          db.prepare('DELETE FROM form_fields WHERE form_id = ?').run(form.id);
        }
        deleteForms.run(id);
      }

      deletePlaceholders.run(id);
      deleteTemplate.run(id);
    })();
  }

  // Check if form has reports
  formHasReports(formId: string): boolean {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM reports WHERE form_id = ?');
    const result = stmt.get(formId) as { count: number };
    return result.count > 0;
  }

  deleteForm(id: string, softDelete: boolean = true): void {
    const db = this.getConnection();
    if (softDelete) {
      const stmt = db.prepare('UPDATE forms SET is_deleted = 1 WHERE id = ?');
      stmt.run(id);
    } else {
      const transaction = db.transaction(() => {
        db.prepare('DELETE FROM form_fields WHERE form_id = ?').run(id);
        db.prepare('DELETE FROM forms WHERE id = ?').run(id);
      });
      transaction();
    }
  }

  getReportCountByForm(formId: string): number {
    const db = this.getConnection();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM reports WHERE form_id = ?');
    const row = stmt.get(formId) as { count: number };
    return row.count;
  }
}

// Export singleton instance
export const database = new Database();

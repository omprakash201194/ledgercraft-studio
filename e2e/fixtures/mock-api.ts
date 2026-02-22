/**
 * Shared window.api mock factory for Playwright E2E tests.
 *
 * Usage in a spec file:
 *   import { buildMockApiScript, ADMIN_USER, REGULAR_USER } from './fixtures/mock-api';
 *   // in beforeEach / test body:
 *   await page.addInitScript({ content: buildMockApiScript({ currentUser: ADMIN_USER }) });
 *   await page.goto('/');
 *
 * The returned script is plain JavaScript that:
 *   - Creates window.__apiState with mutable in-memory data
 *   - Attaches window.api with the full interface expected by the React app
 */

export const ADMIN_USER = {
    id: 'admin-id',
    username: 'admin',
    role: 'ADMIN',
    created_at: '2024-01-01T00:00:00.000Z',
} as const;

export const REGULAR_USER = {
    id: 'user-id',
    username: 'user1',
    role: 'USER',
    created_at: '2024-01-01T00:00:00.000Z',
} as const;

export interface MockOptions {
    /** Pre-authenticated user; null = show login page */
    currentUser?: typeof ADMIN_USER | typeof REGULAR_USER | null;
    initialCategories?: Record<string, unknown>[];
    initialTemplates?: Record<string, unknown>[];
    initialClients?: Record<string, unknown>[];
    initialClientTypes?: Record<string, unknown>[];
    initialClientTypeFields?: Record<string, unknown>[];
    initialAuditLogs?: Record<string, unknown>[];
    initialForms?: Record<string, unknown>[];
    initialFormFields?: Record<string, unknown>[];
    initialReports?: Record<string, unknown>[];
}

/**
 * Build an init-script string that defines window.api and window.__apiState.
 * Inject it via `page.addInitScript({ content: buildMockApiScript(opts) })` BEFORE `page.goto()`.
 */
export function buildMockApiScript(opts: MockOptions = {}): string {
    const state = {
        currentUser: opts.currentUser ?? null,
        categories: opts.initialCategories ?? [],
        templates: opts.initialTemplates ?? [],
        clients: opts.initialClients ?? [],
        clientTypes: opts.initialClientTypes ?? [],
        clientTypeFields: opts.initialClientTypeFields ?? [],
        auditLogs: opts.initialAuditLogs ?? [],
        forms: opts.initialForms ?? [],
        formFields: opts.initialFormFields ?? [],
        reports: opts.initialReports ?? [],
    };

    return `(function () {
  var s = ${JSON.stringify(state)};
  window.__apiState = s;

  window.api = {
    ping: function () { return 'pong'; },
    getAppDataPath: function () { return Promise.resolve('/test/data'); },
    getAppVersion: function () { return Promise.resolve('1.0.0-test'); },
    getDbStatus: function () { return Promise.resolve({ connected: true }); },

    // ── Auth ─────────────────────────────────────────────
    login: function (username, password) {
      var adminUser = { id: 'admin-id', username: 'admin', role: 'ADMIN', created_at: '2024-01-01T00:00:00.000Z' };
      var regularUser = { id: 'user-id', username: 'user1', role: 'USER', created_at: '2024-01-01T00:00:00.000Z' };
      if (username === 'admin' && password === 'admin123') {
        s.currentUser = adminUser;
        return Promise.resolve({ success: true, user: adminUser });
      }
      if (username === 'user1' && password === 'pass123') {
        s.currentUser = regularUser;
        return Promise.resolve({ success: true, user: regularUser });
      }
      return Promise.resolve({ success: false, error: 'Invalid username or password' });
    },
    logout: function () {
      s.currentUser = null;
      return Promise.resolve({ success: true });
    },
    tryAutoLogin: function () {
      if (s.currentUser) return Promise.resolve({ success: true, user: s.currentUser });
      return Promise.resolve({ success: false });
    },
    getCurrentUser: function () { return Promise.resolve(s.currentUser); },
    createUser: function (username, password, role) {
      return Promise.resolve({ success: true, user: { id: 'new-u-' + Date.now(), username: username, role: role, created_at: new Date().toISOString() } });
    },
    getAllUsers: function () { return Promise.resolve([]); },
    resetUserPassword: function () { return Promise.resolve({ success: true }); },

    // ── Templates ────────────────────────────────────────
    pickTemplate: function () {
      return Promise.resolve({
        canceled: false,
        filePath: '/test/templates/invoice.docx',
        originalName: 'invoice.docx',
        placeholderCount: 3,
        placeholders: ['client_name', 'amount', 'date'],
      });
    },
    processTemplateUpload: function (filePath, autoCreateForm, categoryId) {
      var t = {
        id: 'tmpl-' + Date.now(),
        name: 'invoice.docx',
        file_path: filePath,
        created_at: new Date().toISOString(),
        placeholder_count: 3,
        category_id: categoryId || null,
      };
      s.templates.push(t);
      return Promise.resolve({ success: true, template: t });
    },
    getTemplates: function (page, limit, categoryId) {
      var filtered = categoryId
        ? s.templates.filter(function (t) { return t.category_id === categoryId; })
        : s.templates;
      return Promise.resolve({ templates: filtered, total: filtered.length });
    },
    getTemplatePlaceholders: function (templateId) {
      return Promise.resolve([
        { id: 'ph1', template_id: templateId, placeholder_key: 'client_name' },
        { id: 'ph2', template_id: templateId, placeholder_key: 'amount' },
        { id: 'ph3', template_id: templateId, placeholder_key: 'date' },
      ]);
    },
    deleteTemplate: function (id) {
      s.templates = s.templates.filter(function (t) { return t.id !== id; });
      return Promise.resolve({ success: true });
    },

    // ── Forms ─────────────────────────────────────────────
    createForm: function (formData) {
      var f = Object.assign({ id: 'form-' + Date.now() }, formData);
      s.forms.push(f);
      return Promise.resolve({ success: true, form: f });
    },
    updateForm: function () { return Promise.resolve({ success: true }); },
    getForms: function () { return Promise.resolve({ forms: s.forms, total: s.forms.length }); },
    getFormById: function (id) {
      return Promise.resolve(s.forms.find(function (f) { return f.id === id; }) || null);
    },
    getFormFields: function (formId) {
      return Promise.resolve(s.formFields.filter(function (f) { return f.form_id === formId; }));
    },
    generateFormFields: function () { return Promise.resolve([]); },
    getFormsWithHierarchy: function () {
      return Promise.resolve(s.forms.map(function (f) {
        return Object.assign({}, f, { type: 'FORM', parent_id: null });
      }));
    },
    getRecentForms: function (limit) { return Promise.resolve(s.forms.slice(0, limit || 5)); },
    deleteForm: function () { return Promise.resolve({ success: true }); },
    getFormReportCount: function () { return Promise.resolve(0); },

    // ── Reports ───────────────────────────────────────────
    generateReport: function (input) {
      var rep = {
        id: 'rep-' + Date.now(),
        form_id: input.form_id,
        file_path: '/reports/test.docx',
        generated_at: new Date().toISOString(),
        form_name: 'Test Form',
        generated_by: 'admin-id',
        generated_by_username: 'admin',
        input_values: JSON.stringify(input.values || {}),
      };
      s.reports.push(rep);
      return Promise.resolve({ success: true, report: rep });
    },
    getReports: function () { return Promise.resolve({ reports: s.reports, total: s.reports.length }); },
    getReportById: function (id) {
      return Promise.resolve(s.reports.find(function (r) { return r.id === id; }) || null);
    },
    deleteReport: function (id) {
      s.reports = s.reports.filter(function (r) { return r.id !== id; });
      return Promise.resolve({ success: true });
    },
    deleteReports: function () { return Promise.resolve({ success: true }); },
    downloadReport: function () { return Promise.resolve({ success: true }); },

    // ── Categories ────────────────────────────────────────
    getCategoryTree: function (type) {
      var cats = s.categories.filter(function (c) { return c.type === type; });
      function buildTree(items, pid) {
        return items
          .filter(function (n) { return n.parent_id === pid; })
          .map(function (n) { return Object.assign({}, n, { children: buildTree(items, n.id) }); });
      }
      return Promise.resolve(buildTree(cats, null));
    },
    getCategoryChain: function (id) {
      var chain = [];
      var cur = s.categories.find(function (c) { return c.id === id; });
      while (cur) {
        chain.unshift({ id: cur.id, name: cur.name });
        var pid = cur.parent_id;
        cur = pid ? s.categories.find(function (c) { return c.id === pid; }) : null;
      }
      return Promise.resolve(chain);
    },
    createCategory: function (input) {
      var cat = {
        id: 'cat-' + Date.now(),
        name: input.name,
        parent_id: input.parentId || null,
        type: input.type,
        created_at: new Date().toISOString(),
        children: [],
      };
      s.categories.push(cat);
      return Promise.resolve({ success: true, category: cat });
    },
    renameCategory: function (id, name) {
      var c = s.categories.find(function (c) { return c.id === id; });
      if (c) c.name = name;
      return Promise.resolve({ success: true });
    },
    deleteCategory: function (id) {
      s.categories = s.categories.filter(function (c) { return c.id !== id; });
      return Promise.resolve({ success: true });
    },
    moveItem: function () { return Promise.resolve({ success: true }); },

    // ── Shell ─────────────────────────────────────────────
    openFile: function () { return Promise.resolve({ success: true }); },

    // ── Audit & Analytics ─────────────────────────────────
    getAuditLogs: function () {
      return Promise.resolve({ logs: s.auditLogs, total: s.auditLogs.length });
    },
    getAnalytics: function () {
      return Promise.resolve({ totalReports: 5, totalForms: 3, topForms: [] });
    },
    getUserPreferences: function () {
      return Promise.resolve({ date_format: 'DD-MM-YYYY' });
    },
    updateUserPreferences: function () { return Promise.resolve({ success: true }); },

    // ── Clients ───────────────────────────────────────────
    searchClients: function () { return Promise.resolve(s.clients); },
    getTopClients: function () { return Promise.resolve([]); },
    getClientById: function (id) {
      return Promise.resolve(s.clients.find(function (c) { return c.id === id; }) || null);
    },
    createClient: function (input) {
      var c = {
        id: 'cl-' + Date.now(),
        name: input.name,
        client_type_id: input.client_type_id,
        category_id: input.category_id || null,
        created_at: new Date().toISOString(),
        field_values: {},
      };
      s.clients.push(c);
      return Promise.resolve({ success: true, client: c });
    },
    updateClient: function () { return Promise.resolve({ success: true }); },
    getClientReportCount: function () { return Promise.resolve(0); },
    deleteClientOnly: function (id) {
      s.clients = s.clients.filter(function (c) { return c.id !== id; });
      return Promise.resolve({ success: true });
    },
    deleteClientWithReports: function (id) {
      s.clients = s.clients.filter(function (c) { return c.id !== id; });
      return Promise.resolve({ success: true });
    },
    exportClientReportsZip: function () { return Promise.resolve({ success: true }); },

    // ── Client Types ──────────────────────────────────────
    getAllClientTypes: function () { return Promise.resolve(s.clientTypes); },
    getAllClientTypeFields: function () {
      return Promise.resolve(s.clientTypeFields.filter(function (f) { return !f.is_deleted; }));
    },
    getClientTypeFields: function (ctId) {
      return Promise.resolve(
        s.clientTypeFields.filter(function (f) { return f.client_type_id === ctId && !f.is_deleted; })
      );
    },
    createClientType: function (name) {
      var ct = {
        id: 'ct-' + Date.now(),
        name: name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      s.clientTypes.push(ct);
      return Promise.resolve({ success: true, clientType: ct });
    },
    addClientTypeField: function (ctId, input) {
      var f = {
        id: 'ctf-' + Date.now(),
        client_type_id: ctId,
        label: input.label,
        field_key: input.field_key || input.label.toLowerCase().replace(/\\s+/g, '_'),
        data_type: input.data_type || 'text',
        is_required: input.is_required ? 1 : 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
      };
      s.clientTypeFields.push(f);
      return Promise.resolve({ success: true, field: f });
    },
    softDeleteClientTypeField: function (fieldId) {
      var f = s.clientTypeFields.find(function (f) { return f.id === fieldId; });
      if (f) f.is_deleted = 1;
      return Promise.resolve({ success: true });
    },

    // ── Backup ────────────────────────────────────────────
    exportBackup: function () { return Promise.resolve({ success: true }); },
    restoreBackup: function () { return Promise.resolve({ success: true }); },
  };
})();`;
}

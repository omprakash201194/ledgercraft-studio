# Test Coverage Report

## Overview

LedgerCraft Studio has two complementary test tiers:

| Tier | Tool | Tests | Status |
|------|------|-------|--------|
| Unit / Integration | Vitest 4.0.18 | **512 passing** | ✅ |
| E2E (headless UI) | Playwright 1.58.2 | **43 passing** | ✅ |
| **Total** | | **555 tests** | ✅ |

*Last measured: 2026-02-23 — Node 22 / TypeScript 5.7.3*

---

## Unit / Integration Test Coverage

Coverage is measured on the **electron service layer** and **renderer utility
functions**. React UI components (pages, layouts, components) are covered by
the Playwright E2E suite instead.

> Note: `electron/database.ts` (DAL) is excluded from v8 coverage.

```
All files          |   91.17 |    85.76 |    93.45 |   92.38
 electron          |   89.85 |    83.36 |    92.47 |   91.19
 electron/utils    |   98.41 |    94.33 |   100.00 |  100.00
 renderer/src/utils|  100.00 |    98.11 |   100.00 |  100.00
```

### Per-file breakdown (electron service layer)

| File | Statements | Branches | Functions | Lines | Status |
|------|-----------|----------|-----------|-------|--------|
| `auditService.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full |
| `auth.ts` | **100%** | 97.1% | **100%** | **100%** | ✅ Full |
| `backupService.ts` | **100%** | 91.7% | **100%** | **100%** | ✅ Full |
| `storage.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full |
| `templateService.ts` | **100%** | 90.5% | **100%** | **100%** | ✅ Full |
| `templateUtils.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full |
| `preferenceService.ts` | **100%** | 75.0% | **100%** | **100%** | ✅ Full |
| `categoryService.ts` | 93.0% | 91.4% | **100%** | 93.7% | ✅ Good |
| `reportService.ts` | 90.2% | 82.8% | **100%** | 90.1% | ✅ Good |
| `formService.ts` | 86.9% | 78.5% | 94.1% | 87.3% | ✅ Good |
| `clientService.ts` | 79.8% | 76.6% | 81.5% | 81.8% | ✅ Good |
| `clientTypeService.ts` | 85.5% | 83.3% | 85.7% | 92.2% | ✅ Good |

### Per-file breakdown (utilities — fully tested)

| File | Statements | Branches | Functions | Lines | Status |
|------|-----------|----------|-----------|-------|--------|
| `electron/utils/applyFieldFormatting.ts` | 97.3% | 91.7% | 100% | 100% | ✅ Full |
| `electron/utils/dateUtils.ts` | 100% | 100% | 100% | 100% | ✅ Full |
| `electron/utils/mergeClientPrefill.ts` | 100% | 100% | 100% | 100% | ✅ Full |
| `renderer/src/utils/applyFieldFormatting.ts` | 100% | 97.2% | 100% | 100% | ✅ Full |
| `renderer/src/utils/dateUtils.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full (was 50%) |
| `renderer/src/utils/mergeClientPrefill.ts` | 100% | 100% | 100% | 100% | ✅ Full |

---

## Coverage Thresholds (vitest.config.ts)

| Metric | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| Statements | 68% | 91.17% | ✅ Pass |
| Branches | 70% | 85.76% | ✅ Pass |
| Functions | 62% | 93.45% | ✅ Pass |
| Lines | 68% | 92.38% | ✅ Pass |

---

## Unit / Integration Test Suites (32 files, 512 tests)

### `electron/utils/applyFieldFormatting.test.ts` — 36 tests ✅
Field formatting utility (electron main process).

### `electron/utils/dateUtils.test.ts` — 37 tests ✅
Date formatting utilities (electron main process).

### `renderer/src/utils/applyFieldFormatting.test.ts` — 58 tests ✅
Renderer-side field formatting utility.

### `renderer/src/utils/dateUtils.test.ts` — 12 tests ✅ *(new)*
- `formatDate()` — all 3 format variants, invalid date, empty string, Date object, zero-pad (7 tests)
- `formatDateTime()` — valid date+time, empty string, invalid date, all format variants (5 tests)

### `electron/reportService.test.ts` — 9 tests ✅
Report generation field formatting integration tests.

### `electron/tests/client_service.test.ts` — 10 tests ✅
Client CRUD operations, EAV field persistence, duplicate detection, soft delete.

### `electron/tests/client_service_extended.test.ts` — 18 tests ✅ *(new)*
- `searchClients()` — empty/whitespace query, JSON parsing, invalid JSON, empty JSON (6 tests)
- `getTopClients()` — default limit, custom limit (2 tests)
- `getClientById()` — not found → null, returns with field_values (2 tests)
- `updateClient()` — RBAC, not found, name update (3 tests)
- `softDeleteClient()` — RBAC, not found, happy path (3 tests) + 2 common flows

### `electron/tests/client_eav.test.ts` — 26 tests ✅
EAV attribute persistence, field value updates.

### `electron/tests/client_safe_deletion.test.ts` — 9 tests ✅
- `deleteClientOnly` — soft delete, report nullification, ADMIN gate
- `deleteClientWithReports` — hard delete with file cleanup, ADMIN gate
- `exportClientReportsZip` — ZIP creation, ADMIN gate, missing reports error

### `electron/tests/client_schema.test.ts` — 4 tests ✅
SQLite schema verification for client master book tables.

### `electron/tests/client_type_service.test.ts` — 8 tests ✅
Client type CRUD and field management.

### `electron/tests/client_type_service_extended.test.ts` — 9 tests ✅ *(new)*
- `getAllClientTypeFields()` — empty, unique active, excludes soft-deleted (3 tests)
- `updateClientTypeFieldLabel()` — not found, empty label, whitespace, success (4 tests)
- `softDeleteClientTypeField()` — not found, success (2 tests)

### `electron/tests/client_type_security.test.ts` — 4 tests ✅
RBAC enforcement on client type operations.

### `electron/tests/report_generation_client.test.ts` — 4 tests ✅
Report generation with client data integration.

### `electron/tests/template_upload.test.ts` — 3 tests ✅
Template upload, category mirroring, form creation.

### `electron/tests/template_service.test.ts` — 13 tests ✅ *(new)*
- `uploadTemplate()` — ADMIN gate (2), directory creation (2), happy path, write error, autoCreateForm (4), double name conflict, categoryId (10 tests)
- `getTemplates()` — delegation (1 test)
- `getTemplatePlaceholders()` — delegation (1 test) + 1 more

### `electron/tests/integration_sqlite.test.ts` — 41 tests ✅
SQLite schema validation — WAL mode, all 14 tables, 7 migrations, FK relationships.

### `electron/tests/ipc_bridge.test.ts` — 19 tests ✅
IPC bridge contract — all 68 API methods, channel consistency, no Node.js leakage.

### `electron/tests/auth_service.test.ts` — 16 tests ✅
Auth service — login, logout, createUser (RBAC), resetUserPassword, bootstrapAdmin.

### `electron/tests/auth_extended.test.ts` — 7 tests ✅ *(new)*
- `tryAutoLogin()` — no session file, expired session, user not found in DB, success (4 tests)
- Invalid JSON session, saveSession error swallowed, deleteSession error swallowed (3 tests)

### `electron/tests/preference_service.test.ts` — 11 tests ✅
User preferences — defaults, get, insert/update, partial merge.

### `electron/tests/audit_service.test.ts` — 12 tests ✅
- `logAction()` — record insertion, metadata serialization, null entityId, fire-and-forget (4 tests)
- `getAuditLogs()` — pagination, userId filter, actionType filter, combined, empty (5 tests)
- `getAnalytics()` — shape validation, count extraction, array results (3 tests)

### `electron/tests/category_service.test.ts` — 32 tests ✅
- `getCategoryTree()`, `getCategoryChain()`, `createCategory()`, `renameCategory()`, `deleteCategory()`, `moveItem()`, `deleteTemplate()`, `deleteForm()`

### `electron/tests/form_service.test.ts` — 31 tests ✅
- `createForm()`, `deleteForm()`, `updateForm()`, `getForms()`, `getFormById()`, `getFormFields()`, `generateFieldsFromTemplate()`

### `electron/tests/report_service.test.ts` — 26 tests ✅
- `generateReport()`, `deleteReport()`, `deleteReports()`, `getReports()`

### `electron/tests/backup_service.test.ts` — 13 tests ✅
- `exportBackup()`, `restoreBackup()`

### `electron/tests/storage_service.test.ts` — 8 tests ✅
- `initializeStorage()`, `getAppDataPath()`

### `electron/tests/template_utils.test.ts` — 8 tests ✅
- `extractPlaceholders()` — all edge cases

### `renderer/src/utils/mergeClientPrefill.test.ts` — 8 tests ✅
Client prefill merge utility.

### `renderer/src/tests/ClientTypesPage.test.tsx` — 3 tests ✅

---

## E2E Test Suites (Playwright — 11 files, 43 tests)

All E2E tests run **headlessly** against the Vite dev server.
`window.api` is injected as an in-memory mock via `page.addInitScript()`.

Run with: `npm run test:e2e`

### `e2e/login.spec.ts` — 6 tests ✅
Admin/User login, wrong credentials, unauthenticated redirect, RBAC guards.

### `e2e/root-category.spec.ts` — 3 tests ✅
Root category listing, "All Items" always present.

### `e2e/categories.spec.ts` — 2 tests ✅
Root category creation, hierarchical child creation.

### `e2e/templates.spec.ts` — 3 tests ✅
Upload dialog + placeholder parsing, confirm upload, details view.

### `e2e/clients.spec.ts` — 3 tests ✅
Create dialog, dynamic fields from type, save.

### `e2e/reports.spec.ts` — 4 tests ✅
Form tree, field load on selection, generate → success, report listed.

### `e2e/soft-delete.spec.ts` — 3 tests ✅
Manage Fields dialog, soft-delete removes field, absent in create form.

### `e2e/audit.spec.ts` — 4 tests ✅
Log table, action chips, USER RBAC, empty state.

### `e2e/dashboard.spec.ts` — 6 tests ✅ *(new)*
| Test | What is verified |
|------|-----------------|
| Quick-action cards visible | Manage Templates, Manage Forms, description text |
| Recent Reports heading visible | Section always rendered |
| Empty state message | "No reports generated yet" |
| Click Manage Templates | Navigates to `/templates` |
| Click Manage Forms | Navigates to `/forms` |
| Pre-seeded report filename shown | `r1.docx` rendered from `file_path` |

### `e2e/forms.spec.ts` — 3 tests ✅ *(new)*
| Test | What is verified |
|------|-----------------|
| Table column headers | Name column visible |
| Pre-seeded form in list | Invoice Form row rendered |
| Create Form button opens dialog | FormWizard dialog appears |

### `e2e/app-layout.spec.ts` — 6 tests ✅ *(new)*
| Test | What is verified |
|------|-----------------|
| ADMIN sees all nav items | Dashboard, Templates, Forms, Audit Logs visible |
| USER hidden ADMIN items | Templates, Audit Logs absent for USER role |
| Click Templates navigates | → `/templates` |
| Click Reports navigates | → `/reports` |
| Logout navigates to /login | `#logout-button` click → `/#/login` |
| Sidebar visible drawer | Dashboard button rendered |

---

## Remaining Coverage Gaps

### Service Layer (unit tests)

| File | Statements | Residual Uncovered Lines | Notes |
|------|-----------|--------------------------|-------|
| `electron/categoryService.ts` | 93% | 212, 231, 252, 277 | Edge cases in deleteCategory/moveItem error paths |
| `electron/formService.ts` | 87% | 188, 284, 303–304 | Some deleteForm and updateForm edge paths |
| `electron/reportService.ts` | 90% | 72–78, 188, 204–206 | Report generation retry/partial paths |
| `electron/clientService.ts` | 80% | 318–325, 538, 575 | updateClient field_values duplicate check, deleteClientWithReports edge |
| `electron/clientTypeService.ts` | 85% | 46, 80–81, 105 | createClientType auth/name checks already covered; minor branches |
| `electron/preferenceService.ts` | 100%/75% branch | 46–51 | Merge branches |
| `electron/auth.ts` | 100%/97% branch | 170 | Single uncovered branch in bootstrapAdmin |
| `electron/backupService.ts` | 100%/92% branch | 35 | One branch of skip-missing-folder |

### UI / E2E Pages (Playwright — not yet covered)

| Page | Route | Gap |
|------|-------|-----|
| `ReportsPage` | `/reports` | Report delete + bulk-delete dialog |
| `ClientDetailPage` | `/clients/:id` | Client detail + edit view |
| `UsersPage` | `/users` | Admin-only user management |
| `SettingsPage` | `/settings` | Date format preference + backup/restore |
| `AnalyticsPage` | `/analytics` | Charts + KPI display |
| `ClientTypesPage` | `/client-types` | Client type CRUD |
| `GenerateReportPage` | `/generate-report` | Already partially covered by `reports.spec.ts` |
| `CategoryTree` | component | Rename / delete via context menu |
| `FormWizard` | component | Multi-step form creation wizard |

---

## Quality Assessment

### What is well-covered ✅
- All **Electron service methods** that can be mocked: auth, audit, backup, category, client, clientType, form, preference, report, storage, template, templateUtils
- All **renderer utility functions**: formatDate, formatDateTime, mergeClientPrefill, applyFieldFormatting
- **IPC bridge** surface: all 68 API methods are contract-tested
- **SQLite schema**: 14 tables, 7 migrations, WAL mode, FK constraints
- **Critical regression flows** (all in E2E): login/RBAC, category tree, template upload, client creation, report generation, soft-delete, audit logs

### What would improve quality further 🔧
1. **E2E: Settings + backup flow** – The backup/restore UI is critical for data safety but untested at the UI level.
2. **E2E: Reports page delete/bulk-delete** – The report delete confirmation dialog is a critical user flow.
3. **E2E: UsersPage** – Admin-only user creation/password-reset UI.
4. **More branch coverage in formService/reportService** – Several error paths in the delete/generate flows are only 78–82% branch-covered.
5. **Component tests (React Testing Library)** – FormWizard, CategoryTree, and DeleteFormDialog have complex internal state that would benefit from RTL component tests in addition to E2E coverage.

---

## What Is Not Measured (Intentionally Excluded from v8 Coverage)

- `renderer/src/pages/` — 13 React page components (covered by Playwright E2E instead)
- `renderer/src/components/` — FormWizard, CategoryTree, etc. (Playwright E2E)
- `renderer/src/layouts/` — AppLayout (Playwright E2E)
- `electron/database.ts` — Data Access Layer (excluded from unit coverage)
- `electron/main.ts` — Electron main process entry (E2E)
- `electron/preload.ts` — Context bridge (IPC bridge contract tests cover API surface)
- `electron/ipc/handlers.ts` — IPC handler registration (E2E)

---

## Running Tests

```bash
# Unit + integration tests
npm test

# Unit tests with coverage report
npm run test:coverage

# E2E tests (headless Playwright)
npm run test:e2e

# Run a specific unit test file
npm test -- electron/tests/auth_extended.test.ts

# Watch mode
npm test -- --watch

# Vitest UI
npm run test:ui
```

---

## CI Integration

The CI workflow runs on every PR:
1. All 512 unit tests must pass
2. All 43 E2E tests must pass
3. Coverage must meet thresholds: 68% statements / 70% branches / 62% functions / 68% lines
4. Coverage HTML report uploaded as artifact

---

*Last Updated: 2026-02-23*  
*Unit/Integration: Vitest 4.0.18 — 512 passing (32 files)*  
*E2E: Playwright 1.58.2 — 43 passing (11 files)*  
*Total: 555 tests*  
*TypeScript: 5.7.3*

*Last measured: 2026-02-23 — Node 22 / TypeScript 5.7.3*



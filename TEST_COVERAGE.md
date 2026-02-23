# Test Coverage Report

## Overview

LedgerCraft Studio has two complementary test tiers:

| Tier | Tool | Tests | Status |
|------|------|-------|--------|
| Unit / Integration | Vitest 4.0.18 | **512 passing** | ✅ |
| E2E (headless UI) | Playwright 1.58.2 | **43 passing** | ✅ |
| **Total** | | **535 tests** | ✅ |

*Last measured: 2026-02-22 — Node 22 / TypeScript 5.7.3*

---

## Unit / Integration Test Coverage

Coverage is measured on the **electron service layer** and **renderer utility
functions**. React UI components (pages, layouts, components) are covered by
the Playwright E2E suite instead.

```
All files          |   71.39 |    74.84 |    65.40 |   71.84
 electron          |   68.08 |    70.72 |    62.06 |   68.65
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
| `database.ts` | 10.3% | 3.4% | 7.7% | 10.5% | ❌ Low (intentional — DAL, schema-verified by integration tests) |

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
| Statements | 68% | 71.39% | ✅ Pass |
| Branches | 70% | 74.84% | ✅ Pass |
| Functions | 62% | 65.40% | ✅ Pass |
| Lines | 68% | 71.84% | ✅ Pass |

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
| `electron/database.ts` | 10% | 113–126, 312–892 | DAL — intentional; real SQLite needed for direct tests |
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

*Last Updated: 2026-02-22*  
*Unit/Integration: Vitest 4.0.18 — 512 passing (32 files)*  
*E2E: Playwright 1.58.2 — 43 passing (11 files)*  
*Total: 535 tests*  
*TypeScript: 5.7.3*

*Last measured: 2026-02-22 — Node 22 / TypeScript 5.7.3*

---

## Unit / Integration Test Coverage

Coverage is measured on the **electron service layer** and **renderer utility
functions**. React UI components (pages, layouts, components) are covered by
the Playwright E2E suite instead.

```
All files          |   67.25 |    71.03 |   61.63 |   68.15
 electron          |   64.40 |    67.27 |   58.62 |   65.13
 electron/utils    |   98.41 |    94.33 |  100.00 |  100.00
 renderer/src/utils|   84.12 |    86.79 |   85.71 |   89.65
```

### Per-file breakdown (electron service layer)

| File | Statements | Branches | Functions | Lines | Status |
|------|-----------|----------|-----------|-------|--------|
| `auditService.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full |
| `backupService.ts` | **100%** | 91.7% | **100%** | **100%** | ✅ Full |
| `storage.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full |
| `templateUtils.ts` | **100%** | **100%** | **100%** | **100%** | ✅ Full |
| `preferenceService.ts` | **100%** | 75.0% | **100%** | **100%** | ✅ Full |
| `categoryService.ts` | 93.0% | 91.4% | **100%** | 93.7% | ✅ Good |
| `reportService.ts` | 90.2% | 82.8% | **100%** | 90.1% | ✅ Good |
| `formService.ts` | 86.9% | 78.5% | 94.1% | 87.3% | ✅ Good |
| `templateService.ts` | 78.0% | 61.9% | 50.0% | 78.0% | ⚠️ Partial |
| `auth.ts` | 71.8% | 76.5% | 90.0% | 72.9% | ⚠️ Partial |
| `clientService.ts` | 77.4% | 74.5% | 77.8% | 80.2% | ✅ Good |
| `clientTypeService.ts` | 76.4% | 75.0% | 71.4% | 82.4% | ✅ Good |
| `database.ts` | 10.3% | 3.4% | 7.7% | 10.5% | ❌ Low (intentional — DAL, schema-verified by integration tests) |

### Per-file breakdown (utilities — fully tested)

| File | Statements | Branches | Functions | Lines | Status |
|------|-----------|----------|-----------|-------|--------|
| `electron/utils/applyFieldFormatting.ts` | 97.3% | 91.7% | 100% | 100% | ✅ Full |
| `electron/utils/dateUtils.ts` | 100% | 100% | 100% | 100% | ✅ Full |
| `electron/utils/mergeClientPrefill.ts` | 100% | 100% | 100% | 100% | ✅ Full |
| `renderer/src/utils/applyFieldFormatting.ts` | 100% | 97.2% | 100% | 100% | ✅ Full |
| `renderer/src/utils/dateUtils.ts` | 50.0% | 50.0% | 50.0% | 62.5% | ⚠️ Partial |
| `renderer/src/utils/mergeClientPrefill.ts` | 100% | 100% | 100% | 100% | ✅ Full |

---

## Coverage Thresholds (vitest.config.ts)

| Metric | Threshold | Actual | Status |
|--------|-----------|--------|--------|
| Statements | 60% | 67.25% | ✅ Pass |
| Branches | 60% | 71.03% | ✅ Pass |
| Functions | 60% | 61.63% | ✅ Pass |
| Lines | 60% | 68.15% | ✅ Pass |

---

## Unit / Integration Test Suites (26 files)

### `electron/utils/applyFieldFormatting.test.ts` — 36 tests ✅
Field formatting utility (electron main process).

### `electron/utils/dateUtils.test.ts` — 37 tests ✅
Date formatting utilities (electron main process).

### `renderer/src/utils/applyFieldFormatting.test.ts` — 58 tests ✅
Renderer-side field formatting utility.

### `electron/reportService.test.ts` — 9 tests ✅
Report generation field formatting integration tests.

### `electron/tests/client_service.test.ts` — 10 tests ✅
Client CRUD operations, EAV field persistence, duplicate detection, soft delete.

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

### `electron/tests/client_type_security.test.ts` — 4 tests ✅
RBAC enforcement on client type operations.

### `electron/tests/report_generation_client.test.ts` — 4 tests ✅
Report generation with client data integration.

### `electron/tests/template_upload.test.ts` — 3 tests ✅
Template upload, category mirroring, form creation.

### `electron/tests/integration_sqlite.test.ts` — 41 tests ✅
SQLite schema validation — WAL mode, all 14 tables, 7 migrations, FK relationships.

### `electron/tests/ipc_bridge.test.ts` — 19 tests ✅
IPC bridge contract — all 68 API methods, channel consistency, no Node.js leakage.

### `electron/tests/auth_service.test.ts` — 16 tests ✅
Auth service — login, logout, createUser (RBAC), resetUserPassword, bootstrapAdmin.

### `electron/tests/preference_service.test.ts` — 11 tests ✅
User preferences — defaults, get, insert/update, partial merge.

### `electron/tests/audit_service.test.ts` — 12 tests ✅
- `logAction()` — record insertion, metadata serialization, null entityId, fire-and-forget error handling (4 tests)
- `getAuditLogs()` — pagination, userId filter, actionType filter, combined filters, empty results (5 tests)
- `getAnalytics()` — shape validation, count extraction, array results (3 tests)

### `electron/tests/category_service.test.ts` — 32 tests ✅
- `getCategoryTree()` — nested tree building, CLIENT delegation, multi-level tree (4 tests)
- `getCategoryChain()` — breadcrumb path, root category, missing category (3 tests)
- `createCategory()` — empty name, TEMPLATE/FORM creation, CLIENT delegation, DB error (5 tests)
- `renameCategory()` — empty name, TEMPLATE rename, CLIENT delegation (3 tests)
- `deleteCategory()` — children check, items check, empty TEMPLATE/FORM/CLIENT (5 tests)
- `moveItem()` — missing target, type mismatch, TEMPLATE move, missing template, FORM to root, missing form (6 tests)
- `deleteTemplate()` — in use (no force), file deletion, missing file, force delete (4 tests)
- `deleteForm()` — has reports, no reports (2 tests)

### `electron/tests/form_service.test.ts` — 31 tests ✅
- `createForm()` — auth check, empty name, empty fields, duplicate mappings, success, required conversion, audit log, null mappings (8 tests)
- `deleteForm()` — auth check, not found, soft delete, hard delete with file cleanup, audit logs (6 tests)
- `updateForm()` — auth check, duplicate mappings, success, no fields (4 tests)
- `getForms()` / `getFormById()` / `getFormFields()` — delegation tests (4 tests)
- `generateFieldsFromTemplate()` — count, date/currency/number/text type detection, label formatting, required mapping (7 tests)
- Additional form edge cases (2 tests)

### `electron/tests/report_service.test.ts` — 26 tests ✅
- `generateReport()` — auth check, form not found, template not found, missing file, success, placeholder building, directory creation, client prefill, audit log, render error (10 tests)
- `deleteReport()` — auth check, not found, owner permission, ADMIN permission, file deletion, no file, audit log (7 tests)
- `deleteReports()` — auth check, multiple deletions, all fail, partial success (4 tests)
- `getReports()` — auth check, ADMIN vs USER path, user pagination (3 tests)
- Additional report edge case (1 test) ... (2 tests omitted from earlier count)

### `electron/tests/backup_service.test.ts` — 13 tests ✅
- `exportBackup()` — success, templates included, reports included, missing DB, skip missing folder, write error (6 tests)
- `restoreBackup()` — missing database.sqlite, extraction, DB close, wipe templates, wipe reports, app relaunch, extraction error (7 tests)

### `electron/tests/storage_service.test.ts` — 8 tests ✅
- `initializeStorage()` — returns path, creates dirs, skips existing, partial creation, path prefix (5 tests)
- `getAppDataPath()` — returns path, correct arg, no side effects (3 tests)

### `electron/tests/template_utils.test.ts` — 8 tests ✅
- `extractPlaceholders()` — no placeholders, single, multiple, deduplication, whitespace trimming, empty text, throw handling, real-world invoice (8 tests)

### `renderer/src/utils/mergeClientPrefill.test.ts` — 8 tests ✅
Client prefill merge utility.

### `renderer/src/tests/ClientTypesPage.test.tsx` — 3 tests ✅

---

## E2E Test Suites (Playwright — 8 files, 28 tests)

All E2E tests run **headlessly** against the Vite dev server.
`window.api` is injected as an in-memory mock via `page.addInitScript()` —
no Electron binary or real SQLite instance is required.

Run with: `npm run test:e2e`

### `e2e/login.spec.ts` — 6 tests ✅
| Test | What is verified |
|------|-----------------|
| Admin login → dashboard | Correct credentials redirect to `/#/dashboard` |
| User login → dashboard | USER-role credentials redirect to `/#/dashboard` |
| Wrong credentials | Error alert rendered with message |
| Unauthenticated → /login | Direct visit to protected route redirects |
| RBAC: USER blocked from /audit | USER role redirected to dashboard |
| RBAC: ADMIN allowed on /audit | Audit Logs page heading visible |

### `e2e/root-category.spec.ts` — 3 tests ✅
| Test | What is verified |
|------|-----------------|
| TEMPLATE tree root nodes | Pre-seeded categories visible; CLIENT cats excluded |
| CLIENT tree root nodes | Corporate root category visible in CLIENT tree |
| Empty tree "All Items" | Root "All Items" node always present even with no categories |

### `e2e/categories.spec.ts` — 2 tests ✅
| Test | What is verified |
|------|-----------------|
| Create root TEMPLATE category | Dialog opens, name submitted, node appears in tree |
| Create child subcategory | Context menu opens, subcategory created under parent |

### `e2e/templates.spec.ts` — 3 tests ✅
| Test | What is verified |
|------|-----------------|
| Upload confirmation dialog | File name, placeholder count, and placeholder chip names rendered |
| Confirm upload → template in list | Template row appears in table after confirm |
| Details → placeholder list | Placeholder dialog shows `{{client_name}}`, `{{amount}}`, `{{date}}` |

### `e2e/clients.spec.ts` — 3 tests ✅
| Test | What is verified |
|------|-----------------|
| Create Client button opens dialog | Dialog renders with title "Create Client" |
| Type selection loads dynamic fields | Email + Phone fields appear after type selection |
| Fill + save → client in list | Success snackbar and new client row visible |

### `e2e/reports.spec.ts` — 4 tests ✅
| Test | What is verified |
|------|-----------------|
| Form tree visible on Generate Report | Tree item with form name is visible |
| Select form loads fields | Client Name + Amount fields appear in right pane |
| Generate → success snackbar | "Report generated successfully" message shown |
| Report listed on Reports page | Pre-seeded report shows form name in table |

### `e2e/soft-delete.spec.ts` — 3 tests ✅
| Test | What is verified |
|------|-----------------|
| Fields visible in Manage Fields dialog | GST Number + PAN shown |
| Soft-delete removes field from dialog | GST Number absent after delete; PAN remains |
| Soft-deleted field absent in client form | `is_deleted=1` field not rendered in create-client dialog |

### `e2e/audit.spec.ts` — 4 tests ✅
| Test | What is verified |
|------|-----------------|
| Admin sees log table | Heading visible, column headers, action chips rendered |
| Action chip + entity type | USER_LOGIN chip and TEMPLATE entity cell visible |
| USER redirected from /audit | USER role lands on dashboard instead |
| Empty state | Table column headers still present with no log data |

---

## Coverage Gaps (Remaining)

### Unit / Service Layer Gaps

| File | Statements | Uncovered Lines | Notes |
|------|-----------|-----------------|-------|
| `electron/database.ts` | 10% | 113–126, 312–892 | Data Access Layer — CRUD tested via service integration; direct tests require real SQLite |
| `electron/templateService.ts` | 78% | 112, 126, 142–166 | `uploadTemplate()` full flow, `getTemplateById()` |
| `electron/auth.ts` | 72% | 94, 101–134 | Multi-user list, session persistence edge cases |
| `renderer/src/utils/dateUtils.ts` | 50% | 24–31 | `formatDateTime()` function not yet tested |
| `electron/clientService.ts` | 77% | 336–346, 538, 575 | Some CRUD edge paths |
| `electron/clientTypeService.ts` | 76% | 159, 174, 181, 193 | Some field management paths |

### UI / E2E Gaps (pages not yet covered by Playwright)

| Page / Component | Route | Gap |
|-----------------|-------|-----|
| `DashboardPage` | `/dashboard` | No E2E test for KPI tiles / analytics display |
| `FormsPage` | `/forms` | Form CRUD wizard not yet covered |
| `ReportsPage` | `/reports` | Report delete + bulk-delete not yet covered |
| `ClientDetailPage` | `/clients/:id` | Client detail view not covered |
| `UsersPage` | `/users` | Admin-only user management not covered |
| `SettingsPage` | `/settings` | Date format preference + backup not covered |
| `AnalyticsPage` | `/analytics` | Charts page not covered |
| `AppLayout` | shell | Sidebar nav, logout flow not covered |
| `CategoryTree` | component | Category rename / delete (context menu) not covered |
| `FormWizard` | component | Multi-step form wizard not covered |

---

## What Is Not Measured (Intentionally Excluded from v8 Coverage)

- `renderer/src/pages/` — 13 React page components (covered by Playwright E2E instead)
- `renderer/src/components/` — FormWizard, CategoryTree, etc. (Playwright E2E)
- `renderer/src/layouts/` — AppLayout (Playwright E2E)
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
npm test -- electron/tests/audit_service.test.ts

# Watch mode
npm test -- --watch

# Vitest UI
npm run test:ui
```

---

## CI Integration

The CI workflow runs on every PR:
1. All 433 unit tests must pass (5 skipped excluded — 4 env/binary, 1 pre-existing)
2. All 28 E2E tests must pass
3. Coverage must meet thresholds: 60% statements / branches / lines / functions
4. Coverage HTML report uploaded as artifact

---

*Last Updated: 2026-02-22*  
*Unit/Integration: Vitest 4.0.18 — 433 passing, 5 skipped (26 files)*  
*E2E: Playwright 1.58.2 — 28 passing (8 files)*  
*Total: 461 tests*  
*TypeScript: 5.7.3*



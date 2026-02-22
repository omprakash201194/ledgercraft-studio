# Test Coverage Report

## Overview

The automated regression test suite for LedgerCraft Studio covers the electron
service layer, SQLite schema, IPC bridge contracts, and renderer utility functions.

**Total Tests: 433 passing | 1 skipped**  
**Test Files: 25 (24 passing, 1 skipped)**  
*Last measured: 2026-02-22 — Vitest 4.0.18*

---

## Coverage Summary

> Coverage is measured on the **electron service layer** and **renderer utility
> functions**. React UI components (pages, layouts, components) are intentionally
> excluded — they require Playwright E2E tests, not unit tests.

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

> **Note:** Thresholds have been raised from 35%/30%/30%/35% to 60%/60%/60%/60%
> to reflect the improved coverage from adding service-layer tests.
> The target from the regression test issue is 85%+ for the service layer.
> Thresholds should be incremented further as remaining gaps are closed.

---

## Test Suites

### 1. `electron/utils/applyFieldFormatting.test.ts` — 36 tests ✅
Field formatting utility (electron main process).

### 2. `electron/utils/dateUtils.test.ts` — 37 tests ✅
Date formatting utilities (electron main process).

### 3. `renderer/src/utils/applyFieldFormatting.test.ts` — 58 tests ✅
Renderer-side field formatting utility.

### 4. `electron/reportService.test.ts` — 9 tests ✅
Report generation field formatting integration tests.

### 5. `electron/tests/client_service.test.ts` — 10 tests ✅
Client CRUD operations, EAV field persistence, duplicate detection, soft delete.

### 6. `electron/tests/client_eav.test.ts` — 26 tests ✅
EAV attribute persistence, field value updates.

### 7. `electron/tests/client_safe_deletion.test.ts` — 9 tests ✅
- `deleteClientOnly` — soft delete, report nullification, ADMIN gate
- `deleteClientWithReports` — hard delete with file cleanup, ADMIN gate
- `exportClientReportsZip` — ZIP creation, ADMIN gate, missing reports error

### 8. `electron/tests/client_schema.test.ts` — 4 tests ✅
SQLite schema verification for client master book tables.

### 9. `electron/tests/client_type_service.test.ts` — 8 tests ✅
Client type CRUD and field management.

### 10. `electron/tests/client_type_security.test.ts` — 4 tests ✅
RBAC enforcement on client type operations.

### 11. `electron/tests/report_generation_client.test.ts` — 4 tests ✅
Report generation with client data integration.

### 12. `electron/tests/template_upload.test.ts` — 3 tests ✅
Template upload, category mirroring, form creation.

### 13. `electron/tests/integration_sqlite.test.ts` — 41 tests ✅
SQLite schema validation — WAL mode, all 14 tables, 7 migrations, FK relationships.

### 14. `electron/tests/ipc_bridge.test.ts` — 19 tests ✅
IPC bridge contract — all 68 API methods, channel consistency, no Node.js leakage.

### 15. `electron/tests/auth_service.test.ts` — 16 tests ✅
Auth service — login, logout, createUser (RBAC), resetUserPassword, bootstrapAdmin.

### 16. `electron/tests/preference_service.test.ts` — 11 tests ✅
User preferences — defaults, get, insert/update, partial merge.

### 17. `electron/tests/audit_service.test.ts` — 13 tests ✅ *(new)*
- `logAction()` — record insertion, metadata serialization, null entityId, fire-and-forget error handling (4 tests)
- `getAuditLogs()` — pagination, userId filter, actionType filter, combined filters, empty results (5 tests)
- `getAnalytics()` — shape validation, count extraction, array results (4 tests)

### 18. `electron/tests/category_service.test.ts` — 33 tests ✅ *(new)*
- `getCategoryTree()` — nested tree building, CLIENT delegation, multi-level tree (4 tests)
- `getCategoryChain()` — breadcrumb path, root category, missing category (3 tests)
- `createCategory()` — empty name, TEMPLATE/FORM creation, CLIENT delegation, DB error (5 tests)
- `renameCategory()` — empty name, TEMPLATE rename, CLIENT delegation (3 tests)
- `deleteCategory()` — children check, items check, empty TEMPLATE/FORM/CLIENT (5 tests)
- `moveItem()` — missing target, type mismatch, TEMPLATE move, missing template, FORM to root, missing form (6 tests)
- `deleteTemplate()` — in use (no force), file deletion, missing file, force delete (4 tests)
- `deleteForm()` — has reports, no reports (2 tests)

### 19. `electron/tests/form_service.test.ts` — 30 tests ✅ *(new)*
- `createForm()` — auth check, empty name, empty fields, duplicate mappings, success, required conversion, audit log, null mappings (8 tests)
- `deleteForm()` — auth check, not found, soft delete, hard delete with file cleanup, audit logs (6 tests)
- `updateForm()` — auth check, duplicate mappings, success, no fields (4 tests)
- `getForms()` / `getFormById()` / `getFormFields()` — delegation tests (4 tests)
- `generateFieldsFromTemplate()` — count, date/currency/number/text type detection, label formatting, required mapping (7 tests)

### 20. `electron/tests/report_service.test.ts` — 28 tests ✅ *(new)*
- `generateReport()` — auth check, form not found, template not found, missing file, success, placeholder building, directory creation, client prefill, audit log, render error (10 tests)
- `deleteReport()` — auth check, not found, owner permission, ADMIN permission, file deletion, no file, audit log (7 tests)
- `deleteReports()` — auth check, multiple deletions, all fail, partial success (4 tests)
- `getReports()` — auth check, ADMIN vs USER path, user pagination (4 tests)

### 21. `electron/tests/backup_service.test.ts` — 14 tests ✅ *(new)*
- `exportBackup()` — success, templates included, reports included, missing DB, skip missing folder, write error (6 tests)
- `restoreBackup()` — missing database.sqlite, extraction, DB close, wipe templates, wipe reports, app relaunch, extraction error (8 tests)

### 22. `electron/tests/storage_service.test.ts` — 8 tests ✅ *(new)*
- `initializeStorage()` — returns path, creates dirs, skips existing, partial creation, path prefix (5 tests)
- `getAppDataPath()` — returns path, correct arg, no side effects (3 tests)

### 23. `electron/tests/template_utils.test.ts` — 8 tests ✅ *(new)*
- `extractPlaceholders()` — no placeholders, single, multiple, deduplication, whitespace trimming, empty text, throw handling, real-world invoice (8 tests)

### 24. `renderer/src/utils/mergeClientPrefill.test.ts` — 8 tests ✅
Client prefill merge utility.

### 25. `renderer/src/tests/ClientTypesPage.test.tsx` — 1 test ⏭️ SKIPPED

---

## Coverage Gaps (Remaining)

| File | Coverage | Notes |
|------|----------|-------|
| `electron/database.ts` | 10% | Data Access Layer — CRUD methods are tested via service integration; direct tests require real SQLite |
| `electron/templateService.ts` | 78% | Missing: `uploadTemplate()` full flow, `getTemplateById()` |
| `electron/auth.ts` | 72% | Missing: multi-user list, session edge cases (lines 101–134) |
| `renderer/src/utils/dateUtils.ts` | 50% | Missing: `formatDateTime()` edge cases |

---

## What Is Not Measured (Intentionally Excluded)

- `renderer/src/pages/` — all 13 React page components (require Playwright E2E)
- `renderer/src/components/` — FormWizard, CategoryTree, etc. (require Playwright E2E)
- `renderer/src/layouts/` — AppLayout (require Playwright E2E)
- `electron/main.ts` — Electron main process entry (E2E)
- `electron/preload.ts` — Context bridge (IPC bridge contract tests cover API surface)
- `electron/ipc/handlers.ts` — IPC handler registration (E2E)

---

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Run a specific file
npm test -- electron/tests/audit_service.test.ts

# Watch mode
npm test -- --watch

# UI mode
npm run test:ui
```

---

## CI Integration

The CI workflow runs on every PR:
1. All 433 tests must pass (1 pre-existing skip excluded)
2. Coverage must meet thresholds: 60% statements/branches/lines, 55% functions
3. Coverage HTML report uploaded as artifact

---

*Last Updated: 2026-02-22*  
*Test Framework: Vitest 4.0.18*  
*Total Test Count: 433 passing, 1 skipped*  
*TypeScript: 5.7.3*



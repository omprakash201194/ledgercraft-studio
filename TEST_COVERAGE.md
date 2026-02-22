# Test Coverage Report

## Overview

The automated regression test suite for LedgerCraft Studio covers the electron
service layer, SQLite schema, IPC bridge contracts, and renderer utility functions.

**Total Tests: 303 passing | 1 skipped**  
**Test Files: 18 (17 passing, 1 skipped)**  
*Last measured: 2026-02-22 — Vitest 4.0.18*

---

## Coverage Summary

> Coverage is measured on the **electron service layer** and **renderer utility
> functions**. React UI components (pages, layouts, components) are intentionally
> excluded — they require Playwright E2E tests, not unit tests.

```
All files          |   44.81 |    50.00 |   42.76 |   45.43
 electron          |   39.28 |    42.18 |   37.93 |   39.84
 electron/utils    |   98.41 |    94.33 |  100.00 |  100.00
 renderer/src/utils|   84.12 |    86.79 |   85.71 |   89.65
```

### Per-file breakdown (electron service layer)

| File | Statements | Branches | Functions | Lines | Status |
|------|-----------|----------|-----------|-------|--------|
| `auth.ts` | 71.8% | 76.5% | 90.0% | 72.9% | ✅ Good |
| `clientService.ts` | 77.4% | 74.5% | 77.8% | 80.2% | ✅ Good |
| `clientTypeService.ts` | 76.4% | 75.0% | 71.4% | 82.4% | ✅ Good |
| `preferenceService.ts` | 100% | 75.0% | 100% | 100% | ✅ Full |
| `templateService.ts` | 78.0% | 61.9% | 50.0% | 78.0% | ✅ Good |
| `formService.ts` | 32.1% | 38.0% | 52.9% | 32.9% | ⚠️ Partial |
| `reportService.ts` | 40.2% | 27.6% | 25.0% | 40.7% | ⚠️ Partial |
| `categoryService.ts` | 19.3% | 10.3% | 15.4% | 19.8% | ❌ Low |
| `database.ts` | 10.3% | 3.4% | 7.7% | 10.5% | ❌ Low |
| `auditService.ts` | 0% | 0% | 0% | 0% | ❌ No tests |
| `backupService.ts` | 0% | 0% | 0% | 0% | ❌ No tests |
| `storage.ts` | 0% | 0% | 0% | 0% | ❌ No tests |
| `templateUtils.ts` | 0% | 0% | 0% | 0% | ❌ No tests |

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
| Statements | 35% | 44.81% | ✅ Pass |
| Branches | 30% | 50.00% | ✅ Pass |
| Functions | 30% | 42.76% | ✅ Pass |
| Lines | 35% | 45.43% | ✅ Pass |

> **Note:** Thresholds are set as a realistic floor for the current test suite.
> The target from the regression test issue is 85%+ for the service layer.
> Thresholds should be incremented as test coverage grows.

---

## Test Suites

### 1. `electron/utils/applyFieldFormatting.test.ts` — 36 tests ✅
Field formatting utility (electron main process).
- Null/undefined handling (4 tests)
- Date formatting — DD-MM-YYYY, MM-DD-YYYY, YYYY-MM-DD, invalid input (4 tests)
- Number formatting — currency symbol, decimals, combined, invalid (5 tests)
- Text transformation — uppercase, lowercase (3 tests)
- Prefix and suffix (5 tests)
- Combined formatting (3 tests)
- Edge cases — empty, zero, negative, large numbers, unknown types (7 tests)
- Real-world scenarios — invoice date, ₹ currency, company uppercase (5 tests)

### 2. `electron/utils/dateUtils.test.ts` — 37 tests ✅
Date formatting utilities (electron main process).
- `formatDate` — all formats, edge cases, boundaries, input types (26 tests)
- `formatDateTime` — all formats, edge cases, time formatting (8 tests)
- Type safety (2 tests)
- Real-world scenarios — invoice, GST, financial year (5 tests)

### 3. `renderer/src/utils/applyFieldFormatting.test.ts` — 58 tests ✅
Renderer-side field formatting utility (identical API to electron version).
- Full format option coverage including UI-specific scenarios

### 4. `electron/reportService.test.ts` — 9 tests ✅
Report generation field formatting integration (formatting pipeline simulation).

### 5. `electron/tests/client_service.test.ts` — 10 tests ✅
Client CRUD operations, EAV field persistence, duplicate detection, soft delete.

### 6. `electron/tests/client_eav.test.ts` — 26 tests ✅
EAV attribute persistence, field value updates.

### 7. `electron/tests/client_safe_deletion.test.ts` — 9 tests ✅
- `deleteClientOnly` — soft delete, report client_id nullification, ADMIN gate
- `deleteClientWithReports` — hard delete with file cleanup, ADMIN gate
- `exportClientReportsZip` — ZIP creation, ADMIN gate, missing reports error

### 8. `electron/tests/client_schema.test.ts` — 4 tests ✅
SQLite schema verification for client master book tables.

### 9. `electron/tests/client_type_service.test.ts` — 8 tests ✅
Client type CRUD and field management.

### 10. `electron/tests/client_type_security.test.ts` — 4 tests ✅
RBAC enforcement on client type operations (ADMIN-only, duplicate detection).

### 11. `electron/tests/report_generation_client.test.ts` — 4 tests ✅
Report generation with client data integration.

### 12. `electron/tests/template_upload.test.ts` — 3 tests ✅
- Template category mirroring (`mirrorCategoryHierarchy`)
- Auto-form creation on upload
- Form name conflict resolution (Auto suffix)

### 13. `electron/tests/integration_sqlite.test.ts` — 41 tests ✅ *(new)*
SQLite schema integration validation (mock-based).
- WAL mode pragma verification (3 tests)
- All 14 schema tables creation (15 tests)
- All 7 migrations (ALTER TABLE) (7 tests)
- Soft delete column patterns (3 tests)
- Foreign key relationships (5 tests)

### 14. `electron/tests/ipc_bridge.test.ts` — 19 tests ✅ *(new)*
IPC bridge contract validation.
- All 68 exposed API methods present (3 tests)
- Channel name consistency — preload ↔ handlers (3 tests)
- No Node.js/Electron internals exposed (3 tests)
- Per-domain API surface checks (10 tests)

### 15. `electron/tests/auth_service.test.ts` — 16 tests ✅ *(new)*
Auth service unit tests.
- `login()` — correct credentials, wrong password, missing user (4 tests)
- `logout()` — session clearing (1 test)
- `getCurrentUser()` — null before login (1 test)
- `createUser()` — ADMIN-only, duplicate, invalid role, success (5 tests)
- `resetUserPassword()` — ADMIN-only, missing user, success (3 tests)
- `bootstrapAdmin()` — creates when empty, skips when exists (2 tests)

### 16. `electron/tests/preference_service.test.ts` — 11 tests ✅ *(new)*
User preferences service unit tests.
- Default values (3 tests)
- `getUserPreferences()` — defaults on miss, saved data on hit (3 tests)
- `updateUserPreferences()` — INSERT vs UPDATE, merge, timestamp (4 tests)

### 17. `renderer/src/utils/mergeClientPrefill.test.ts` — 8 tests ✅
Client prefill merge utility (renderer).

### 18. `renderer/src/tests/ClientTypesPage.test.tsx` — 1 test ⏭️ SKIPPED
React component test (skipped — requires jsdom environment setup).

---

## Coverage Gaps (Priority Order)

The following files have **0% coverage** and are the highest-priority candidates for
new test suites:

| File | Lines | What to test |
|------|-------|-------------|
| `electron/auditService.ts` | 37–141 | `logAction()`, `getAuditLogs()`, `getAnalytics()` |
| `electron/database.ts` | 312–892 | All `Database` class CRUD methods (currently mocked) |
| `electron/backupService.ts` | 14–87 | `exportBackup()`, `restoreBackup()` |
| `electron/storage.ts` | 11–30 | `initializeStorage()` |
| `electron/templateUtils.ts` | 9–35 | `extractPlaceholders()` from .docx buffer |

Additional partial-coverage gaps:

| File | Priority | Missing areas |
|------|----------|--------------|
| `electron/categoryService.ts` | High (19%) | `getCategoryTree()`, `moveItem()`, `deleteTemplate()` |
| `electron/formService.ts` | Medium (32%) | `deleteForm()`, `updateForm()`, `getForms()` |
| `electron/reportService.ts` | High (40%) | Full `generateReport()` flow |
| `renderer/src/utils/dateUtils.ts` | Low (50%) | `formatDateTime()` edge cases |

---

## What Is Not Measured (Intentionally Excluded)

The following are excluded from unit-test coverage because they require
**Playwright E2E tests** or dedicated integration infrastructure:

- `renderer/src/pages/` — all 13 React page components
- `renderer/src/components/` — FormWizard, CategoryTree, etc.
- `renderer/src/layouts/` — AppLayout
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
npm test -- electron/tests/auth_service.test.ts

# Watch mode
npm test -- --watch

# UI mode
npm run test:ui
```

---

## CI Integration

The CI workflow (`.github/workflows/ci.yml`) runs on every PR:
1. `npx vitest run --reporter=verbose` — all tests must pass
2. `npm run test:coverage` — coverage must meet thresholds (35%/30%/30%/35%)
3. Coverage HTML report uploaded as artifact (14-day retention)

---

*Last Updated: 2026-02-22*  
*Test Framework: Vitest 4.0.18*  
*Total Test Count: 303 passing, 1 skipped*  
*TypeScript: 5.7.3*


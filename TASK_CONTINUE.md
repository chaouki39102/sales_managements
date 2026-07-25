# TASK_CONTINUE.md — UI Unification Continuation

> **Purpose**: If you switch devices or sessions, read this file first to know exactly where we left off and what remains.

---

## Date: 2026-07-24

## Mission
Unify all UI elements across the site: confirm dialogs, tables, cards, buttons, icons, page headers. Remove duplicates and dead code.

---

## COMPLETED (Session 1)

### 1. Confirm Dialogs — Unified ✅
- **Fixed broken renders**: `BankReconciliationPage.tsx`, `AdminApprovalsPage.tsx` — `useConfirm()` was called but `<ConfirmDialog>` was never rendered. Added the missing `<ConfirmDialog {...confirmDialogProps} />` in JSX.
- **Replaced 4 duplicate ConfirmDeleteModal**: `ExpensesPage.tsx`, `TreasuryAccountsPage.tsx`, `PaymentMethodsPage.tsx`, `NumberingSeriesPage.tsx` — deleted local definitions, imported shared `@/components/ui/ConfirmDeleteModal`.
- **Replaced 12 native `window.confirm()`**: All in `CommercialDocumentsPage.tsx` (9), `CommercialDocumentPage.tsx` (1), `CommercialDocumentModal/index.tsx` (1), `ProductModal.tsx` (1). All now use `useConfirm` + `<ConfirmDialog>`.
- **Zero `window.confirm()` calls remain** in the entire codebase.

### 2. Buttons — Unified ✅
- **Fixed `Button.tsx` variant mapping**: Added `outline` → `btn-outline`, `secondary` → `btn-secondary`, `success` → `btn-p` (green).
- **Added missing CSS classes** in `components.css`: `.btn-outline`, `.btn-secondary`, `.btn-icon`, `.btn-ghost`.
- **Removed duplicate `.btn` CSS** from `pos.css` (was defined 3× in components.css, theme.css, pos.css).

### 3. Admin Pages — Standardized ✅
- **4 pages converted** to use `<PageHeader>`: `AdminUsersPage.tsx`, `AdminSettingsPage.tsx`, `AdminApprovalsPage.tsx`, `AdminActivityPage.tsx`.

### 4. UsersPage Overlay — Replaced ✅
- **Deleted 187 lines** of local `Overlay`, `MHead`, `MBody`, `MFoot` components.
- **4 usages replaced** with shared `<Modal>` component from `@/components/ui/Modal`.

### 5. Dead Code Removed ✅
- `components/ui/Table.tsx` — deleted (188 lines, never imported by any page).
- `PageHeader` export from `Misc.tsx` — deleted (18 lines, dead duplicate).
- Barrel exports cleaned in `components/ui/index.ts` and `components/index.ts`.

### Build Status
- `npm run build` — 0 errors, 1107 modules
- `npm test` — 160/160 pass

---

## REMAINING (Session 2+)

### Priority 1: Table Unification (HIGH — ~40 tables across ~30 pages)

**Problem**: ~30 pages render raw `<table>` elements with no shared abstraction. Each manually renders `<thead>`, `<tbody>`, sorts, paginates. There is no consistent table styling — some use `className="table"`, some use `className="audit-tbl"`, most use bare `<table>` with inline styles.

**Solution**: Create a `SimpleTable` component in `components/ui/SimpleTable.tsx` that wraps the common pattern:

```tsx
// Proposed API
<SimpleTable
  columns={[{ key: 'name', label: 'الاسم', className: '...' }]}
  data={rows}
  onRowClick={handleClick}
  emptyText="لا توجد بيانات"
  isLoading={loading}
/>
```

**Files to migrate** (grouped by complexity):

**Group A — Simple tables (no sorting, no pagination) — ~20 files:**
These are the easiest. They just render data in a flat table.
- `SubsidizedProductsPage.tsx` (2 tables)
- `RegulatedProductsPage.tsx`
- `IFUDeclarationPage.tsx`
- `G50DeclarationPage.tsx`
- `EmployeesPage.tsx`
- `PaymentMethodsPage.tsx`
- `DocumentTypesPage.tsx`
- `NumberingSeriesPage.tsx`
- `TaxSettingsPage.tsx` (5 tables)
- `StockTab.tsx` (2 tables)
- All report pages (~20 files, each 1-3 tables): `SalesReportPage`, `PurchasesReportPage`, `CashFlowReportPage`, `ExpensesReportPage`, `CustomersReportPage`, `ReturnsReportPage`, `PaymentsReportPage`, `AgingReportPage`, `CreativeReportPage`, `DailyReportPage`, `InventoryReportPage`, `MarginReportPage`, `ProductMovementPage`, `ProductsReportPage`, `ProfitLossPage`, `StockMovementsReportPage`, `SuppliersReportPage`, `VelocityReportPage`, `SalesTrendReportPage`

**Group B — Tables with sorting + pagination — ~8 files:**
These need `onSort`, `sortKey`, `sortDir`, `page`, `onPageChange`, `totalPages`.
- `PartiesPage.tsx` (uses `className="table"`)
- `ClientsPage.tsx` (uses `className="table"`)
- `ProductsPage.tsx`
- `ExpensesPage.tsx`
- `FinancePage.tsx` (5 tables)
- `TreasuryAccountsPage.tsx`
- `FiscalYearsPage.tsx`
- `ChecksPage.tsx`

**Group C — Special tables (leave as-is):**
- `CommercialDocumentsPage.tsx` — uses full `DataTable` (different component, keep)
- `DebtsPage.tsx` — uses full `DataTable` (keep)
- `PosSessionsTable.tsx` — POS-specific with sparklines (keep)
- `PaymentTermsTable.tsx` — inline editable (keep)
- Print preview tables — document rendering (keep)
- `DocumentLinesSection.tsx` — document editor (keep)
- `ImportWizardModal.tsx` — import wizard (keep)

### Priority 2: Card Unification (MEDIUM — 5 files)

**Problem**: 5 pages use raw `<div className="card">` instead of the `<Card>` component.

**Files to fix:**
- `AuditLogPage.tsx` — 2 instances of `<div className="card">`
- `BankReconciliationPage.tsx` — 5 instances
- `AlertsPage.tsx` — 3 instances (including `alert-card` variant)
- `LookupPage.tsx` — 1 instance
- `ProductLotsTab.tsx` — 1 instance

**Solution**: Replace with `<Card>` from `@/components/ui/Card`. The Card component supports `title`, `subtitle`, `actions`, `noHeader`, `padding` props.

### Priority 3: Dead CSS Cleanup (LOW)

**Problem**: `components.css` has `.tbl-*` classes (lines 513-549) that were only used by the deleted `Table.tsx`. No raw tables use these classes.

**Solution**: Remove `.tbl-outer`, `.tbl`, `.tbl-head`, `.tbl-th`, `.tbl-row`, `.tbl-cell`, `.tbl-empty`, `.tbl-checkbox`, `.tbl-skel`, `.tbl-sort-inactive` from `components.css`.

### Priority 4: Remaining Inline Headers (LOW — ~6 pages)

Pages that still have ad-hoc `<h1 style={{fontSize:...}}` instead of `<PageHeader>`:
- `InventoryPage.tsx` — `<h1 style={{fontSize:20, fontWeight:700}}>`
- `LookupPage.tsx` — inline icon + title div
- `ProfilePage.tsx` — inline `<div style={{fontSize:22, fontWeight:900}}>`
- `BankReconciliationPage.tsx` (documents/) — inline `<h2 style={{fontSize:18}}>`

**Note**: Some pages like `POSPage`, `POSKioskPage`, `PrintSettingsPage`, `OnboardingPage`, `SetupWizard`, `SetupHub` are full-screen layouts and should NOT use PageHeader.

---

## Key Architecture Rules

### CSS Files
```
tokens.css      → CSS variables (short-form: --bg2, --t1, --em, --b1, etc.)
theme.css       → Dark theme overrides, global @keyframes
layout.css      → Sidebar, topbar, page shell
components.css  → All shared UI components
pages.css       → Page-specific styles
pos.css         → POS-specific components
pos-cart-v4.css → POS cart
```

### Import Order (in app.css)
```css
@import 'tailwindcss';
@import 'theme/tokens.css';
@import 'theme/theme.css';
@import 'theme/layout.css';
@import 'theme/components.css';
@import 'theme/pages.css';
@import 'theme/pos.css';
@import 'theme/pos-cart-v4.css';
@import 'theme/pos-sessions-v2.css';
@import 'theme/modern-utilities.css';
@import 'theme/utilities.css';
@import 'theme/notifications.css';
@import 'theme/print-settings.css';
```

### Component Locations
```
components/ui/          → Shared: Button, Modal, Card, PageHeader, ConfirmDialog, etc.
components/modals/      → Feature modals: ClientModal, CreateCompanyModal, etc.
components/layouts/     → DashboardLayout
components/admin/       → Admin shared components
pages/{feature}/        → One folder per feature
pos/components/         → POS-specific components
```

### Naming Conventions
- CSS classes: lowercase-kebab-case with page prefix (e.g., `audit-*`, `cdp-*`, `plt-*`)
- Variables: short-form from tokens.css (`--bg2`, `--t1`, `--em`, `--b1`)
- Components: PascalCase, default export from file
- Hooks: `use` prefix

### Confirm Dialog Pattern
```tsx
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

const { confirm, confirmDialogProps } = useConfirm();

// Usage:
const ok = await confirm('رسالة التأكيد', { variant: 'danger' });
if (!ok) return;

// JSX:
<ConfirmDialog {...confirmDialogProps} />
```

### Button Variants
```tsx
import Button from '@/components/ui/Button';
<Button variant="primary" size="sm" icon="ti-plus">إضافة</Button>
// Variants: default, primary, danger, warning, info, outline, secondary, success
// Sizes: xs, sm, md
```

### Modal Pattern
```tsx
import Modal from '@/components/ui/Modal';
<Modal open={open} onClose={close} title="العنوان" subtitle="الوصف" size="md"
  footer={<><Button onClick={close}>إلغاء</Button><Button variant="primary">حفظ</Button></>}>
  {children}
</Modal>
```

---

## Build Commands
```bash
npm run build     # Vite build — must be 0 errors
npm test          # Vitest — must be 160/160 pass
php -l            # PHP syntax check (if backend changes)
```

## Style Guide
Full style guide at: `STYLE_GUIDE.md`

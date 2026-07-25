# TASK_CONTINUE.md — UI Unification Continuation

> **Purpose**: If you switch devices or sessions, read this file first to know exactly where we left off and what remains.

---

## Date: 2026-07-25

## Mission
Unify all UI elements across the site: confirm dialogs, tables, cards, buttons, icons, page headers. Remove duplicates and dead code.

---

## COMPLETED (Session 1 — July 24)

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

### Build Status (Session 1)
- `npm run build` — 0 errors, 1107 modules
- `npm test` — 160/160 pass

---

## COMPLETED (Session 2 — July 25)

### 6. SimpleTable — Fixed align prop + empty state CSS ✅
- **Fixed `align` prop**: Was declared on `SimpleColumn` interface but never applied to `<th>` or `<td>` elements. Added `thStyle()` helper that merges `align` and `onHeaderClick` styles. Added `style={{ textAlign: c.align }}` to `<td>`.
- **Added `.tbl-empty` CSS**: SimpleTable's empty state used `.tbl-empty`, `.tbl-empty__inner`, `.tbl-empty__icon` classes that had zero CSS definitions anywhere. Added proper centering, flex layout, and opacity styling to `components.css`.
- **Impact**: Fixes alignment on all 50+ pages using SimpleTable's `align: 'end'` or `align: 'center'` columns.

### 7. Card Migration — BankReconciliationPage ✅
- **5 raw `<div className="card">`** replaced with `<Card>` component:
  - Tabs bar → `<Card noHeader padding={12}>`
  - 2 loading states → `<Card noHeader><Skeleton /></Card>`
  - 2 empty states → `<Card noHeader><EmptyState /></Card>`
- Added `Card` import from `@/components/ui/Card`.

### 8. Card Migration — ProductLotsTab ✅
- **1 raw `<div className="card" style={{ padding: 0, overflow: 'hidden' }}>`** replaced with `<Card noHeader padding={0} style={{ overflow: 'hidden' }}>`.
- Added `Card` import from `@/components/ui/Card`.

### 9. Header Migration — InventoryPage ✅
- **Replaced 17-line inline header** (icon square + `<h1>` + `<p>`) with `<PageHeader title="إدارة المخزون" description="..." tabs={...} />`.
- Tabs moved into PageHeader's `tabs` prop for consistent layout.
- Added `PageHeader` import, changed wrapper to `className="page on" id="p-inventory"`.

### 10. Dead CSS Cleanup — Verified ✅
- `.tbl-outer`, `.tbl-head`, `.tbl-th`, `.tbl-row`, `.tbl-cell`, `.tbl-checkbox`, `.tbl-skel`, `.tbl-sort-inactive` — **already absent** from `components.css`. No action needed.
- `.tbl` and `.tbl-sm` in `pos.css` — **actively used** by `SessionInvoicesModal.tsx`. Not dead.

### Build Status (Session 2)
- `npm run build` — 0 errors, 1109 modules
- `npm test` — 160/160 pass

---

## REMAINING (Session 3+)

### Priority 1: Complex Tables (DEFERRED — features beyond SimpleTable scope)

These tables have advanced features (expandable rows, column visibility, checkbox selection, inline editing) that SimpleTable does not support. They are already functional and well-structured. Migrating them would require SimpleTable enhancements that add complexity rather than reduce it.

| File | Why Deferred |
|------|-------------|
| `StockTab.tsx` | Expandable rows (`LotsSubRow`), `<tfoot>` totals, 11 columns |
| `ProductsPage.tsx` | Checkbox selection, column visibility toggle, server-side sort/pagination, inline Switch |
| `FinancePage.tsx` (2 tables) | Inline `<select>`/`<ComboBox>` editors for opening balances — interactive editing tables |

**If SimpleTable gains sort/pagination/expandable support in the future, these should be revisited.**

### Priority 2: Remaining Card/Headless Migrations (LOW)

| File | Issue | Complexity |
|------|-------|-----------|
| `LookupPage.tsx` | Inline icon+title header (generic component with props: `title`, `icon`, `color`) | Low — but header is per-section, not page-level |
| `ProfilePage.tsx` | Inline name/jobtitle in profile card layout — NOT a page header | Skip — intentional layout |
| `BankReconciliationPage.tsx` (documents/) | May have inline `<h2>` — already uses PageHeader on main page | Verify only |

### Priority 3: Table CSS Refinements (LOW)

- `SimpleTable` empty state has no loading spinner (just icon + text). Could add animated `spin` icon.
- `SimpleTable` has no sticky `<thead>` for tall tables. Browser `position: sticky` on `<thead th>` would help.
- Report pages use `rowClassName` returning `'tw-sr'` for summary rows — this pattern works but relies on the global `.tw-sr` class being defined.

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
components/ui/          → Shared: Button, Modal, Card, PageHeader, ConfirmDialog, SimpleTable
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

### SimpleTable Pattern
```tsx
import SimpleTable from '@/components/ui/SimpleTable';
<SimpleTable
  columns={[
    { key: 'name', label: 'الاسم' },
    { key: 'amount', label: 'المبلغ', align: 'end', render: (v) => fmt(v) },
    { key: '_actions', label: '', render: (_, row) => <Button ... /> },
  ]}
  data={items}
  rowKey="id"
  onRowClick={handleClick}
  isLoading={loading}
  emptyText="لا توجد بيانات"
/>
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

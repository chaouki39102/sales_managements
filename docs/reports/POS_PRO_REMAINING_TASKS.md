# POS PRO — Remaining Tasks & Resume Guide

> Session checkpoint: work in progress — the user paused mid-task and will resume later.
> **Last commit:** `56fec41` — pushed to `origin/main`. Working tree contains uncommitted changes from this session (below).

## Current State (this session's changes — uncommitted)

| Change | Files |
|--------|-------|
| Barcode field → live search dropdown (name / ref / barcode, image + TTC price), arrow-key nav, Enter adds; exact barcode match adds instantly (scanner flow); Enter with no match flashes red | `resources/js/pos-pro/components/POSProScanbar.tsx` (rewritten) |
| New **طباعة** button on the left of the scan bar — prints the current cart as a receipt without completing the sale | `POSProPage.tsx` (`handlePrintCart`), `pos-pro.css` (`.pos-pro-scan-row`, `.pp-print-btn`, `.pp-scanbar-dd*`) |
| Removed the نقداً / بطاقة quick-pay row | deleted `POSProQuickPay.tsx`, `cardMode` memo removed |
| Removed the "الأكثر مبيعاً" best-sellers bar | deleted `POSProRecentBar.tsx`, `.pp-recent*` CSS removed |

**Verified:** `npx tsc --noEmit` clean · `npm test` 174/174 pass · `npm run build` 0 errors (POSProPage chunk 43.23 kB).

## Remaining Tasks (POS PRO)

### 1. Manual QA (blocking for release)
- [ ] Browser test: scanbar dropdown opens on typing, keyboard nav, click-to-add, outside-click closes.
- [ ] Scanner flow: exact barcode Enter adds instantly; unknown code flashes red.
- [ ] Print button: prints current cart via browser print; confirm empty-cart guard toast; disabled state when no active session.
- [ ] Pre-sale thermal print: **blocked by design** — `handlePrintDirect` needs `docNumber` for the WebUSB thermal path, so the print-cart button only uses browser print. Decide: keep as-is (browser print) or generate a draft number.

### 2. Feature parity with classic POS (in priority order)
- [ ] **Held carts** — port `HeldCartsModal` (hold / retrieve / delete) into POS PRO; cart key `pos-pro-cart`.
- [ ] **Returns** — add return flow from a completed document (reuse `ReturnsModal` pattern).
- [ ] **Keyboard shortcuts map** — port `KeyboardHelpModal`; current shortcuts: `F2` open products, arrows in scanbar, `Enter` add, `Esc` close dropdown.
- [ ] **Split / multi-mode payment** — the payment modal supports it; confirm the POS PRO flow passes `payments[]` correctly for mixed cash+card.
- [ ] **Favorites / pinned products** — user removed the best-sellers bar; a *manual* pin list (persisted) is the likely replacement. Confirm with the user.

### 3. Session drawer polish
- [ ] Add "طباعة تقرير الجلسة" (print session closing report) button using `SessionStatsModal` template pattern.
- [ ] Warehouse switch inside the open session.

### 4. Scanbar / dropdown polish
- [ ] Show low-stock badge in dropdown rows (reuse `StockBadge` logic).
- [ ] Debounce the filter for very large catalogs (current filter runs per keystroke over `allVariants` — fine at typical sizes).

## Global non-blocking items (from AGENTS.md — unrelated to POS PRO)
- [ ] Sidebar: keyboard first-letter nav; group item-count badges when collapsed.
- [ ] POS product loading: cursor pagination + image CDN/WebP pipeline (deferred by design).
- [ ] Playwright e2e suite requires `npx playwright install chromium`; not wired into CI yet.

## How to resume
1. `git status` — confirm the uncommitted changes above are still present.
2. Run the verification trio after any further edit: `npx tsc --noEmit` → `npm test` → `npm run build`.
3. Complete tasks under "Remaining Tasks", then commit + push (repo style: concise imperative message, e.g. `feat: ...`).

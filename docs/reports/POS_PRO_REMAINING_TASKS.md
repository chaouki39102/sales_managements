# POS PRO — Remaining Tasks & Resume Guide

> Session checkpoint: feature-parity work completed (held carts, returns, keyboard help, session print/warehouse, scanbar polish). Pushed as `790d576` + follow-up commit.
> **Last commit:** `81774be` — pulled from `origin/main` (scanbar dropdown + print button + docs).

## Completed Tasks (POS PRO)

| Task | Implementation |
|------|----------------|
| Held carts | `usePosProCart.ts` — `heldCarts` state, `holdCart` / `restoreCart` / `deleteHeldCart` actions, persisted via `partialize` (key `pos-pro-cart`); `usePosPro.ts` exposes them; `HeldCartsModal` reused from `@/pos/components` |
| Returns | `ReturnsModal` reused from `@/pos/components`, lazy-loaded in `POSProPage.tsx` (`returnsOpen` state), button on rail |
| Keyboard help | New `POSProKeyboardHelp.tsx` (static shortcut map — F1/F2/arrows/Enter/Esc/hold/held/returns); lazy-loaded, opened via rail help button or `F1` |
| Split / multi-mode payment | Verified: `handleCompleteSale` maps `params.payments[]` → `DocumentPaymentInput[]` and passes `payments` to `documentsApi.create` (POSProPage ~line 435-498) |
| Session print report | `POSProSessionDrawer.tsx` — «طباعة تقرير الجلسة» footer button → `TemplatePrintModal` (RPT templates, `DocumentDataBuilder.fromSessionReport`, `mapCompany`) |
| Warehouse switch | `POSProSessionDrawer.tsx` — `<select>` entrepôt in body; `POSProPage` keeps `activeWarehouse` state synced with default warehouse + session warehouse; stock query + `documentsApi.create` + session increment all use `activeWarehouse` |
| Scanbar low-stock badge | `POSProScanbar.tsx` — `.pp-badge--low/--out/--ok` in dropdown rows («متوفر: N» / «نفد») |
| Scanbar debounce | 120 ms debounce (`debouncedQuery`) + `searching` state with «جارٍ البحث…» spinner |

**Shortcuts added:** `F1` = keyboard help, `F2` = products picker.

**Verified:** `npx tsc --noEmit` clean · `npm test` 174/174 pass · `npm run build` 0 errors.

## Remaining Tasks (POS PRO)

### 1. Manual QA (blocking for release)
- [ ] Browser test: scanbar dropdown opens on typing, keyboard nav, click-to-add, outside-click closes.
- [ ] Scanner flow: exact barcode Enter adds instantly; unknown code flashes red.
- [ ] Print button: prints current cart via browser print; confirm empty-cart guard toast; disabled state when no active session.
- [ ] Pre-sale thermal print: **blocked by design** — `handlePrintDirect` needs `docNumber` for the WebUSB thermal path, so the print-cart button only uses browser print. Decide: keep as-is (browser print) or generate a draft number.

### 2. Design decisions (need user confirmation)
- [ ] **Favorites / pinned products** — user removed the best-sellers bar; a *manual* pin list (persisted) is the likely replacement. Confirm with the user.

## Global non-blocking items (from AGENTS.md — unrelated to POS PRO)
- [ ] Sidebar: keyboard first-letter nav; group item-count badges when collapsed.
- [ ] POS product loading: cursor pagination + image CDN/WebP pipeline (deferred by design).
- [ ] Playwright e2e suite requires `npx playwright install chromium`; not wired into CI yet.

## How to resume
1. `git status` — confirm no stray changes before starting a new session.
2. Run the verification trio after any further edit: `npx tsc --noEmit` → `npm test` → `npm run build`.
3. Complete tasks under "Remaining Tasks", then commit + push (repo style: concise imperative message, e.g. `feat: ...`).

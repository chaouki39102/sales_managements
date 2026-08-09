# POS Pro — Classic POS Feature Gap List (TODO)

Classic POS features **not yet applied in POS Pro** (verified against `resources/js/pos-pro/` on 2026-08-09 — many previously-listed gaps are now shipped and marked `[x]`).

## Product browse

- [ ] **Quick items / favorites bar** — pinned ⭐ product strip with one-click add (classic `QuickItemsBar`)
- [ ] **Pin/unpin favorites** — star toggle on product cards
- [ ] **Best-sellers** — sales-ranked product section
- [x] **Sort dropdown** — name / price ↑↓ / stock; persisted via `writeLS('pos-pro-drawer-sort', …)` + `SortKey` switch (`POSProProductDrawer.tsx:485`, ~525)
- [ ] **Advanced filter panel** — in-stock only, low-stock only, price range (min/max), per-page (60/120/240/500), reset (classic `FilterPanel`). Family chips with counts ARE present (`POSProProductDrawer.tsx:691-712`)
- [x] **Grid/list view toggle + dense list view** — grid/list `view` persisted via `readLS('pos-pro-drawer-view')`; list rows (`PPRow`) show ref/unit/HT/TVA/TTC/stock pill, double-click adds qty 2 (`POSProProductDrawer.tsx:362-440`)
- [x] **Grid size options** — `gsize` XS/SM/MD/LG via `GRID_SIZE_OPTIONS` buttons, persisted via `readLS('pos-pro-drawer-grid')` (`POSProProductDrawer.tsx` drawer-tools)
- [x] **Search highlight** — `<mark>` around matched text via `highlightText()` (`POSProProductDrawer.tsx:281`, `395`)
- [x] **Result count** — footer «تم (N منتج)» + family chip counts (`POSProProductDrawer.tsx:646-657`, `691-712`). `{hl}/{count}` position badge during keyboard nav still missing

## Product cards

- [x] **In-cart qty steppers on cards** — `pp-card-qty` +/− and `pp-lrow-qty` +/− (`POSProProductDrawer.tsx:302-318`, `421-436`)
- [x] **Quantity-tier best badge** — `bestDiscount` → «-X%» or «-دج» chip (`POSProProductDrawer.tsx:266-274`)
- [x] **Variant count badge** — «N خيارات» (`POSProProductDrawer.tsx:277`)
- [x] **Long-press info popover** — 500ms `handlePointerDown` + «i» button → `POSProProductInfoModal` (`POSProProductDrawer.tsx:198-248`)
- [x] **Packaging select on card** — `pp-card-pkg` `<select>` on cards with packagings (`POSProProductDrawer.tsx:287-300`)

## Cart

- [ ] **QtySetModal** — Enter on selected row opens qty edit (POS Pro Enter = +1 instead)
- [ ] **Undo clear cart** — Ctrl+Z / F12 restores the last cleared snapshot (mobile swipe-delete has per-line `undoRemove`, not full-cart undo)

## Sessions / totals

- [ ] **Live session banner** — always-visible session stats chip (warehouse, duration, invoices, net sales) in the POS header. Session lives in a drawer/rail (`POSProSessionDrawer`)
- [ ] **Margin chip + weighted average margin** of the current cart (with show/hide toggle)
- [ ] **Session stats "products" tab / timeline** — POS Pro drawer has only summary + payment breakdown

## Settings / UI

- [x] **Add sound** (`playSoundOnAdd`) — wired in `handleAddItem` (Aug 2, Phase 48)
- [ ] **Kiosk mode** — touch-only POS kiosk (classic `POSKioskPage`)
- [x] **Mobile tabs** — superseded by the dedicated full-screen mobile page `/pos/pro/mobile` (`POSProMobilePage.tsx`, Phase 65)
- [ ] **Device name chip** in the header
- [x] **`hideOutOfStock` / `clearSearchOnAdd` toggles** — wired in the product drawer (Aug 2, Phase 48); also `keyboardNav` / `advanceOnAdd` / `priceDisplayMode` / `showStockOnCard` / `defaultGridSize` / `confirmOnClear` / `autoClosePayment`

## Keyboard

- [ ] **Alt+0 … Alt+9** — quick-select category tabs by position

## Already covered (no work needed)

Payments (numpad, quick amounts, quick cash, multiple methods, credit, change, auto-close), weight modal, item/invoice discounts (incl. % / amount / PIN gate / quantity tiers — per-item gate added Aug 2), held-cart tabs, returns, session open/close, customer balance (re-check on client change), thermal/browser printing, price levels, packaging-in-cart, fiscal stamp, invoice reopen/edit, camera barcode scan, `*N` qty-in-search, remappable keyboard shortcuts, cart virtualization, row-style toggle, all 9 settings-compliance toggles (Aug 2, Phase 48), product sort / view toggle / grid sizes / search highlight / in-cart steppers / tier+variant badges / long-press info / packaging select / result count (2026-08-09).

## Priority

1. **Product browse layer** — favorites bar + pin/unpin + best-sellers + advanced filter panel (biggest UX impact)
2. **QtySetModal** — Enter-on-selected-row parity
3. **Undo clear cart** — safety net
4. The rest as polish.

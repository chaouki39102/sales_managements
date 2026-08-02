# POS Pro — Classic POS Feature Gap List (TODO)

Classic POS features **not yet applied in POS Pro** (verified against `resources/js/pos-pro/` on 2026-08-01).

## Product browse (top gaps)

- [ ] **Quick items / favorites bar** — pinned ⭐ product strip with one-click add (classic `QuickItemsBar`)
- [ ] **Pin/unpin favorites** — star toggle on product cards
- [ ] **Best-sellers** — sales-ranked product section
- [ ] **Sort dropdown** — name / price ↑↓ / stock / family (POS Pro only sorts by Arabic name)
- [ ] **Advanced filter panel** — in-stock only, low-stock only, price range (min/max), per-page (60/120/240/500), reset (classic `FilterPanel`)
- [ ] **Grid/list view toggle + dense list view** — table rows with ref/unit/HT/TVA/TTC/stock pill/pin, double-click add
- [ ] **Grid size options** — XS / SM / MD / LG (only the cart row has a simple/full toggle)
- [ ] **Search highlight** — `<mark>` around the matched text in results
- [ ] **Result count + position badge** — "N نتيجة" / `{hl}/{count}` during keyboard nav

## Product cards

- [ ] **In-cart qty steppers on cards** (+/− while item is in cart)
- [ ] **Quantity-tier best badge** — "-X%" or "-دج" best-tier chip on card
- [ ] **Variant count badge** — "N خيارات"
- [ ] **Long-press info popover** — ref/barcode/family/discount/description after 500ms hold
- [ ] **Packaging select on card** — choose pack before adding

## Cart

- [ ] **QtySetModal** — Enter on selected row opens qty edit (POS Pro Enter = +1 instead)
- [ ] **Undo clear cart** — Ctrl+Z / F12 restores the last cleared snapshot

## Sessions / totals

- [ ] **Live session banner** — always-visible session stats chip (warehouse, duration, invoices, net sales) in the POS header
- [ ] **Margin chip + weighted average margin** of the current cart (with show/hide toggle)
- [ ] **Session stats "products" tab / timeline** — POS Pro drawer has only summary + payment breakdown

## Settings / UI

- [x] **Add sound** (`playSoundOnAdd`) — wired in `handleAddItem` (Aug 2, Phase 48)
- [ ] **Kiosk mode** — touch-only POS kiosk (`POSKioskPage`)
- [ ] **Mobile tabs** — Products/Cart bottom tabs with total + sell button
- [ ] **Device name chip** in the header
- [x] **`hideOutOfStock` / `clearSearchOnAdd` toggles** — wired in the product drawer (Aug 2, Phase 48); also `keyboardNav` / `advanceOnAdd` / `priceDisplayMode` / `showStockOnCard` / `defaultGridSize` / `confirmOnClear` / `autoClosePayment`

## Keyboard

- [ ] **Alt+0 … Alt+9** — quick-select category tabs by position

## Already covered (no work needed)

Payments (numpad, quick amounts, quick cash, multiple methods, credit, change, auto-close), weight modal, item/invoice discounts (incl. % / amount / PIN gate / quantity tiers — per-item gate added Aug 2), held-cart tabs, returns, session open/close, customer balance (re-check on client change), thermal/browser printing, price levels, packaging-in-cart, fiscal stamp, invoice reopen/edit, camera barcode scan, `*N` qty-in-search, remappable keyboard shortcuts, cart virtualization, row-style toggle, all 9 settings-compliance toggles (Aug 2, Phase 48).

## Priority

1. **Product browse layer** — sort / filter / view toggle / favorites (biggest UX impact)
2. **QtySetModal** — Enter-on-selected-row parity
3. **Undo clear cart** — safety net
4. The rest as polish.

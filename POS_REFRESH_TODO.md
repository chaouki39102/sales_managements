# POS Refresh — COMPLETE (Phase 73)

All tasks DONE, committed + pushed to `origin/main`:

- **T0** `c936fa9` — `posKeys` + `invalidatePosQueries` helper (`queryKeys.ts`)
- **T1** `5311f18` — refresh button in classic POS topbar (`POSTopBar.tsx` + `POSPage.tsx` + `.ti-spin` in `pos.css`)
- **T2** `28e3384` — refresh button in POS Pro scan row (`POSProPage.tsx` + `.pp-refresh-btn` in `pos-pro.css`)
- **T3** `2d7fbf7` — auto-invalidation in `useInventoryMutations` / `useProductMutations` / `useDocumentMutations`
- **T4** (this session) — verified `npx tsc --noEmit` clean · `npm test` 273/273 (18 files) · `npm run build` 0 errors, 224 precache · SW MATCH; docs marked COMPLETE.

## Context / Root Cause (why this is needed)
Admin stock/product changes don't reflect in the POS page. Root cause = POS uses separate query keys + long `staleTime`:
- Classic POS products: `[slug, 'products', 'pos', {cat, perPage}]`, `staleTime: 5 min` (`POSPage.tsx:428-438`)
- Classic POS stock: `[slug, 'pos-stock', whId, yearId, {family_id}]`, `staleTime: 10s` (`POSPage.tsx:522`)
- POS Pro products: `[slug, 'pos-pro', 'products', {perPage: 2000}]`, `staleTime: 5 min` (`POSProPage.tsx:232-240`)
- POS Pro stock: `[slug, 'pos-pro-stock', whId, yearId]`, `staleTime: 10s` (`POSProPage.tsx:250-263`)
- StockTab (admin): `[slug, 'inventory', 'stock-at', yearId, params]` (`StockTab.tsx:172-185`)
- ProductsPage mutations already invalidate `tenantKeys.products.all(slug)` = `[slug, 'products']` (prefix-matches the classic POS products key) — lines 229/244/368.
- Server-side `stock-at` cache: `Cache::remember('stock-at:...', 5, ...)` in `app/Services/InventoryStockService.php:101-102` (5s TTL, not a real blocker).

**Approved plan (user said YES)**: refresh button (classic POS + POS Pro) AND auto-invalidation wiring.

## Implementation summary (what shipped)
- `posKeys` family + `invalidatePosQueries(qc, slug)` in `queryKeys.ts` (prefix match, `exact: false`; `import type { QueryClient }` keeps the module dependency-free). Keys: products `[slug,'products']` (covers `...'pos'...`), stock `[slug,'pos-stock']`, proProducts `[slug,'pos-pro','products']`, proStock `[slug,'pos-pro-stock']`, balances `[slug,'party-balance']`.
- Classic POS: `POSTopBar` gained `refreshing`/`onRefresh` + «تحديث» button (`.ti-spin`); `POSPage` `handleRefresh` = invalidate all prefixes + refetch `[slug,'products','pos']` + `[slug,'pos-stock']`.
- POS Pro: `POSProPage` `handleRefresh` = invalidate all prefixes + refetch `[slug,'pos-pro','products']` + `[slug,'pos-pro-stock']`; `.pp-refresh-btn` in `.pos-pro-scan-row` beside `pp-print-btn`.
- Auto-invalidation added to `useInventoryMutations.invalidate`, `useProductMutations.invalidateAll`/`invalidateOne`, `useDocumentMutations.invalidateAll`/`invalidateOne`. POS's own sale-completion invalidations left as-is.

## Files inventory
- `resources/js/lib/api/core/queryKeys.ts` — posKeys + invalidatePosQueries (DONE, committed)
- `resources/js/pos/components/POSTopBar.tsx` — refresh button (task 1)
- `resources/js/pages/pos/POSPage.tsx` — handler + prop wiring (task 1)
- `resources/css/theme/pos.css` — `.ti-spin` + button styles (task 1)
- `resources/js/pos-pro/POSProPage.tsx` — handler + button (task 2)
- `resources/css/theme/pos-pro.css` — `.pp-refresh-btn` (task 2)
- `resources/js/lib/api/endpoints/inventory.ts` — auto-invalidation (task 3)
- `resources/js/lib/api/endpoints/products.ts` — auto-invalidation (task 3)
- `resources/js/lib/api/endpoints/documents.ts` — auto-invalidation (task 3)

## Baseline
Last green state before pause: pest 70 passed (466 assertions) · vitest 273/273 · tsc clean · build 0 errors, 222 precache · SW MATCH (Phase 72 verification).

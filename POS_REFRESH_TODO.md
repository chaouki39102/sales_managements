# POS Refresh — Remaining Tasks (Phase 73)

Resume point: the POS refresh button + auto-invalidation work was PAUSED mid-task. Work task-by-task, **commit + push after EACH task**.

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

## Already DONE (committed + pushed: `be730df` is the last commit on `main`)
- `resources/js/lib/api/core/queryKeys.ts` — added `posKeys` family + `invalidatePosQueries(qc, slug)` helper:
  - `posKeys.products(slug)` → `[slug, 'products']` (covers `[slug,'products','pos',...]`)
  - `posKeys.stock(slug)` → `[slug, 'pos-stock']`
  - `posKeys.proProducts(slug)` → `[slug, 'pos-pro', 'products']`
  - `posKeys.proStock(slug)` → `[slug, 'pos-pro-stock']`
  - `posKeys.balances(slug)` → `[slug, 'party-balance']`
  - `invalidatePosQueries` invalidates all five prefixes (prefix match, `exact: false`). Import: `import type { QueryClient } from '@tanstack/react-query';`
- `resources/js/pos/components/POSTopBar.tsx` — props edit REVERTED (it was mid-edit and would break the build); do it fresh in task 1.

## Task 1 — Refresh button in classic POS topbar
Files: `resources/js/pos/components/POSTopBar.tsx`, `resources/js/pages/pos/POSPage.tsx`, `resources/css/theme/pos.css`
- `POSTopBar.tsx` props interface (lines ~11-42): add `refreshing: boolean; onRefresh: () => void;`
- Destructure them in the component signature.
- Render a refresh button in the `.pos-actions-row` (e.g. after the `<span className="tb-sep" aria-hidden="true" />` at line 294 or near the settings button ~333): `<button className="btn btn-xs" onClick={onRefresh} disabled={refreshing} title="تحديث المنتجات والمخزون">` with `<i className={`ti ti-refresh${refreshing ? ' ti-spin' : ''}`} />` + optional `.tb-txt` « تحديث».
- Add `.ti-spin` animation in `pos.css` (e.g. `@keyframes` rotate + `.ti-spin { animation: ... 1s linear infinite; }`). Note Tabler icons don't ship a spin class — must add one.
- `POSPage.tsx`: `const qc = useQueryClient();` (check it's imported — `POSPage` already uses `useQueryClient` at line ~1289 area for sale invalidation) + `const [refreshing, setRefreshing] = useState(false);`
- Handler:
  ```ts
  const handleRefresh = async () => {
    if (!slug) return;
    setRefreshing(true);
    try {
      await invalidatePosQueries(qc, slug);
      await Promise.all([
        qc.refetchQueries({ queryKey: [slug, 'products', 'pos'] }),
        qc.refetchQueries({ queryKey: [slug, 'pos-stock'] }),
      ]);
    } finally { setRefreshing(false); }
  };
  ```
  (invalidate marks stale; refetch forces the network call so the button gives instant feedback even with `staleTime`.)
- Pass `refreshing={refreshing} onRefresh={handleRefresh}` to `<POSTopBar ... />`.
- Import `invalidatePosQueries` from `@/lib/api/core/queryKeys`.

## Task 2 — Refresh button in POS Pro
Files: `resources/js/pos-pro/POSProPage.tsx`, `resources/css/theme/pos-pro.css`
- Same handler pattern (reuse `invalidatePosQueries` + refetch `[slug,'pos-pro','products']` + `[slug,'pos-pro-stock']`).
- `POSProPage` already has `slug` via `useActiveSlug()` (line 100). Add `refreshing` state.
- Place the button in the `.pos-pro-scan-row` (line ~1316-1338) next to the existing `pp-print-btn`, styling `.pp-refresh-btn` (mirror `.pp-print-btn`), or in the POSProRail. Simplest: a small icon button beside print.
- Add `.pp-refresh-btn` + `.ti-spin` CSS in `pos-pro.css` if not already in `pos.css` (both bundles load; safest to define `.ti-spin` in `pos.css` once — POS Pro page imports both? Verify: check what CSS `POSProPage` imports).

## Task 3 — Wire auto-invalidation on stock-changing endpoints
File: `resources/js/lib/api/endpoints/inventory.ts` (`useInventoryMutations`, lines 234-274)
- The `invalidate` closure currently does `tenantKeys.inventory.all(slug)` + `tenantKeys.products.all(slug)`. Add `invalidatePosQueries(qc, slug)` so any stock movement/lot change refreshes POS stock immediately (covers `pos-stock`, `pos-pro-stock`, `pos-pro` products, balances).
- File: `resources/js/lib/api/endpoints/products.ts` (`useProductMutations`, `invalidateAll` at lines 310-312) — add `invalidatePosQueries(qc, slug)` inside `invalidateAll` AND `invalidateOne`, so a product price/active/stock-field edit reaches POS instantly (currently only `[slug,'products']` which misses POS Pro products + both stock keys).
- Consider `resources/js/lib/api/endpoints/documents.ts` `useDocumentMutations` (create/update/delete of purchase/return docs change stock) — add `invalidatePosQueries(qc, slug)` in `invalidateAll` (line 300-302). Verify this doesn't cause double-refetch during POS's own sale completion (POSPage sale flow uses its own direct invalidations at ~1289-1305 — leave those as-is).
- Verify no circular imports: queryKeys.ts must stay dependency-free (only `import type` from react-query).

## Task 4 — Verify + commit + push
- `npx tsc --noEmit` clean.
- `npm test` green (current baseline 273/273).
- `npm run build` 0 errors.
- SW MATCH: `(Get-FileHash public/sw.js) -eq (Get-FileHash public/build/sw.js)` must print True.
- Update `AGENTS.md` with the Phase 73 summary (remove the "Active" work-state note above if present).
- Conventional commit per task, push to `origin/main`.

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

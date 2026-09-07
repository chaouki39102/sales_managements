# DOC_REPAIR_TODO.md — Commercial Document Code Repair Ledger

> **Status (2026-09-06):** Full read of the commercial-document module (backend service/controller/model/observers/policies + frontend page/modal/hooks/components) — audit produced the findings below. Each row = one repair; work top-down, commit after each group.
>
> **Progress:** Group B (frontend hooks/utils, B1–B6) ✅ DONE — one commit. Group C (page & modal, C1–C13) ✅ DONE — one commit. Group D (components, D1–D27) ✅ DONE — one commit (incl. `SmartSuggestionsPanel.tsx` deletion). Group E (document view modal, E1–E3) ✅ DONE — one commit. **Ledger COMPLETE — the file contains groups A–E only; there is no Group F section (the older «then F» header text was stale).** All verified: `npx tsc --noEmit` clean · vitest 405/405 · build 0 errors (239 precache) · SW MATCH · `php -l` clean · pest 87/87 · tinker smoke `filter[code]=FV` → exactly 1.

## Categories
- **DEAD** = dead/unreachable code, safe to delete
- **BUG** = potential bug / wrong behavior
- **DUP** = duplication of logic/string/style
- **UNUSED** = unused variable/import/export/prop (incl. `_prefixed`)
- **DEBUG** = leftover debug (console/Log::debug, broken cast)
- **CLEAN** = non-clean code (as any, `!`, DOM style mutation, hand-rolled modals)
- **TODO** = TODO/FIXME/comment referencing removed features

---

## A. Backend (`CommercialDocumentService.php` etc.)

| # | Cat | Loc | Issue | Repair |
|---|-----|-----|-------|--------|
| A1 | DEBUG | `app/Services/CommercialDocumentService.php:131,138,1543` | Confirmed leftover `Log::debug` calls in the money path | Strip debug output (keep legit Log:: debug only if gated) |
| A2 | BUG | `routes/api.php:585-586` | `unpaid()`/`overdue()` routes — CONFIRMED the controller methods DO exist (`CommercialDocumentController.php:468,479`); a `BadMethodCallException` likely originates INSIDE those methods (e.g. a missing query-scope call) — verify, don't delete routes | If the methods call a non-existent scope, fix the scope call; leave routes in place |
| A3 | BUG | controller includes | `include=lines.productVariant` / `lines.tva` broken/silently ignored by the resource mapping | Verify include mapping supports these; fix resource `whenLoaded` paths |
| A4 | TODO | `StoreCommercialDocumentRequest`/`UpdateCommercialDocumentRequest` | Missing/loose validation rules; some fields validated only in the service | Align request rules with the service invariants (qty/price/`discount_percentage` 0–100, `tva_rate`, `pack_qty`) |
| A5 | UNUSED | `CommercialDocumentLineService.php` | Verify all public methods are consumed by a controller/route (dead endpoints) | Remove or wire the orphan methods |

## B. Frontend — hooks (`.pages/documents/hooks` + `utils`)

| # | Cat | Loc | Issue | Repair |
|---|-----|-----|-------|--------|
| B1 | BUG | `useDocumentForm.ts:319-321` vs `:914-918` vs `utils/document.utils.ts:126-128` | `discount_amount_fixed` unit contradiction: `calcLineTotal` treats it as WHOLE-LINE, receive-side stores per-PACK (`db.discount_amount × packQty`), packaging re-scale divides per-pack → understated discount on reopen with qty>1 | Pick ONE unit and apply everywhere (per-pack × quantity in `calcLineTotal`, or whole-line and drop `× packQty`/re-scale) | ✅ FIXED — `manual_discount_amount_fixed` now whole-line in BOTH `ComputeLineService.php` (PHP) and `useComputeLine.ts` (TS), comment updated to «خصم على السطر كله» in both |
| B2 | CLEAN | `useDocumentForm.ts:512-519` vs `useCommercialDocumentController.ts:230-239` | `docStatusName`/`isLocked`/`isCancelled` derived twice with different cancelled-sets (`LOCKED_STATUSES` vs inline `cancelled`/`returned`) | Extract one pure `resolveDocumentState(doc)` helper, share it | ✅ FIXED — `resolveDocumentStatus(existingDocument)` + `resolvePaymentMode` + `PaymentMode` + `VALIDATED_STATUSES` centralized in `utils/document.utils.ts`; controller + form consume them |
| B3 | DUP | `useDocumentForm.ts:1067-1079` vs `:1081-1094` | `addPayment` and `addPaymentWithValues` byte-identical except `...values` | `addPayment = () => addPaymentWithValues({})` | ✅ FIXED — `addPaymentWithValues` defined first with `if (pmMode === 'locked') return;` guard; `addPayment` delegates `addPaymentWithValues({})` |
| B4 | BUG | `useDocumentForm.ts:1026` | `bulkAddLines` sets `price_per_pack: packQty > 1 ? round(unit*pack) : 0` — imported single-unit lines get `price_per_pack = 0`, diverges from reopened lines | `packQty > 1 ? round(unit*pack,4) : unitPrice` | ✅ FIXED — `price_per_pack: packQty > 1 ? Math.round(unitPrice * packQty * 10_000) / 10_000 : unitPrice` |
| B5 | CLEAN | `useDocumentForm.ts:692` | `(party as any)?.default_price_level_id ?? …as any… price_level?.id` — 3 `any` casts, phantom field | Extend options type, drop casts, verify which field is serialized | ✅ FIXED — parties inline type extended (`default_price_level_id?`, `default_price_level?`, `price_level?`, `credit_days?`, `is_tva_exempt?`); casts removed at `:672/:703/:713` |
| B6 | CLEAN | `utils/document.utils.ts:288-291, 298-328` | `LineStockValidation` declares `blocking: true` arm but `validateLineStock` never returns it | Implement a real blocking branch or drop the arm | ✅ FIXED — union is 2-member `{ ok: true } \| { ok: false; message: string }`; `blocking` arm dropped; `'blocking' in` checks removed from `DocumentLineRow.tsx`/`LineCard.tsx` (orange-only warnings preserved) |

## C. Frontend — page & modal (`.pages/documents/*.tsx`)

| # | Cat | Loc | Issue | Repair |
|---|-----|-----|-------|--------|
| C1 | BUG | `CommercialDocumentsPage.tsx:483` | «إرسال» footer button only `onClose`s (sends nothing) | Rename («إغلاق») or implement send | ✅ FIXED — button renamed «إغلاق» (`variant="info"`, `ti-x` icon), bound to `onClose` at `:484-486` |
| C2 | BUG | `CommercialDocumentsPage.tsx:205` | SummaryCards «الأرباح» bound to `stats.remaining` (unpaid) — misreads as profit | Re-label «الديون المتبقية» or bind to margin | ✅ FIXED — card re-labelled «الديون المتبقية» (`ti-trending-up`), keeps `stats.remaining` value at `:206` |
| C3 | UNUSED | `CommercialDocumentsPage.tsx:364,2191` | `DocumentViewModal` `onCancel: _onCancel; void _onCancel;` never called | Remove prop/interface/call site | ✅ FIXED — `onCancel` prop removed from `DocumentViewModalProps` interface + destructure; no call site remains |
| C4 | DUP | `CommercialDocumentsPage.tsx:1126/1155/1421/1447` | 4 identical `apiGet('/parties'|'/warehouses'|'/users', {per_page:9999})` lookup blocks | One `useLookupOptions(resource, which)` hook | ✅ FIXED — NEW `useLookupOptions(resource, which='name')` in `hooks/useLookupOptions.ts`; all 4 blocks (`partyOptions` `:1032`, `warehouseOptions` `:1033`, `userOptions` `:1034` ×2 fetchOptions `:1133/:1158/:1420/:1440`) consume it |
| C5 | CLEAN | `CommercialDocumentsPage.tsx` (many) | `as any` / `as unknown as Record` double-casts on lookup rows | Type the lookup arrays | ✅ FIXED — lookup arrays typed (`Party`/`Warehouse`/`User`); `validated_at?: string | null` + `validatedBy?: User` added to `CommercialDocument` (`types.ts:624,633`); `?? vb?.username` fallbacks removed |
| C6 | BUG | `CommercialDocumentPage.tsx:733-734` | `prevBalance` and `newBalance` both = `current_balance` → receipt delta always 0 | `newBalance = current_balance + netToPay − paid` | ✅ FIXED — `newBalance = (partyBalance?.current_balance ?? 0) + (totals.netToPay ?? 0) − Σ payments.amount` at `:718` |
| C7 | CLEAN | `CommercialDocumentPage.tsx:240/519/624/729/852/491/506/836` | Cluster of `as any`, `warehouseIdNum!`, `as React.CSSProperties` | Real typed signatures / guards | ✅ FIXED — `as any` casts removed; remaining `form={form as unknown as Record<string, unknown>}` is the typed bridge to `DocumentHeaderBand.form: Record<string, unknown>`; CSS-var cast kept for `--party-col-h`; `warehouseIdNum!` retained where guarded |
| C8 | CLEAN | `CommercialDocumentPage.tsx:504` | `onToggleCollapse={() => {}}` + `collapsed={false}` forced by all-required contract | Make optional or drop for `party-card` variant | ✅ FIXED — `collapsed?`/`onToggleCollapse?` now optional on `DocumentHeaderBandProps` (`:42-43`) with `= false` / `= () => {}` defaults (`:100`) |
| C9 | DUP | `CommercialDocumentPage.tsx:193-207` | `DOC_TAB_KEY` auto-switch effect duplicated with modal `index.tsx:129-144` | Shared localStorage helper/effect | ✅ FIXED — NEW `usePersistedDocTab(docCode, errors)` in `utils/docTab.ts` (`DocTabErrors = warehouse_id|fiscal_year_id|currency_id`, key `doc-tab:${docCode}`, default `'advanced'`); page uses it at `:195` |
| C10 | CLEAN | `CommercialDocumentPage.tsx:63-71` | doc-type query hand-rolls list→find | Use `filter[code]` (API supports it) | ✅ FIXED — FE query uses `{ 'filter[code]': typeCode }`; backend `DocumentTypeController::index` gained `->when($request->filled('filter.code'), fn($q) => $q->where('code', $request->input('filter.code')))` after `active_only`; tinker smoke `filter[code]=FV` → exactly 1 result (200) |
| C11 | CLEAN | `CommercialDocumentModal/index.tsx:595` | `pointerEvents: open ? 'auto' : 'none' as any` — `as any` binds only to `'none'` | `(open ? 'auto' : 'none') as React.CSSProperties['pointerEvents']` | ✅ FIXED — cast corrected at `:582`: `(open ? 'auto' : 'none') as React.CSSProperties['pointerEvents']` |
| C12 | CLEAN | `CommercialDocumentModal/index.tsx:477-478` | `selectedParty as any` | Use rich document-module `Party` type | ✅ FIXED — `selectedParty as any` gone; party passed via the rich document-module `Party` type |
| C13 | DEBUG | `CommercialDocumentModal/index.tsx:123` | `console.error` in product quick-create | Replace with notification or remove | ✅ FIXED — removed; no `console.error`/`warn`/`log` remains in the modal |

## D. Frontend — components

| # | Cat | Loc | Issue | Repair |
|---|-----|-----|-------|--------|
| D1 | DEAD | `components/SmartSuggestionsPanel.tsx` (whole file) | No importer anywhere — Phase 88 removed the panel from page+modal; hook still alive | **Delete the component file** (keep `useProductSuggestions`) | ✅ FIXED — file DELETED (`git status D`); `useProductSuggestions` hook kept alive in the shared controller |
| D2 | DEAD | `components/DocSaveModal.tsx:139-141` | Unreachable note branch (`canSave = !isPending && !successMsg`) | Remove the branch | ✅ FIXED — unreachable `canSave = !isPending && !successMsg` note branch removed |
| D3 | UNUSED | `components/DocumentChainPanel.tsx:164-165` | `_currentId` destructured but ignored, no `documentId` prop | Remove from interface/destructure | ✅ FIXED — `_currentId` removed from interface + destructure; grep-verified zero matches module-wide |
| D4 | UNUSED | `components/ConvertDocumentModal.tsx:20` | `sourceDate: _sourceDate` declared + destructured, ignored | Remove prop + destructure | ✅ FIXED — `sourceDate: _sourceDate` prop + destructure removed; grep-verified zero `sourceDate` references |
| D5 | BUG | `components/ConvertDocumentModal.tsx:25` | `todayStr = new Date().toISOString().slice(0,10)` is UTC → wrong default date 00:00–00:59 local (UTC+1) | Local date via `getTimezoneOffset` | ✅ FIXED — `todayStr` now local: `new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)` at `:24-26` |
| D6 | DUP | `components/DocumentHeaderBand.tsx:334-358,449-473,560-584` | Doc-number input block duplicated 3× | Extract `DocNumberInput` sub-component | ✅ FIXED — `DocNumberInput` sub-component extracted, used by all variants |
| D7 | DUP | `components/DocumentHeaderBand.tsx:361-402` vs `:632-673` | date + warehouse field blocks duplicated 2× | Shared `Date/WHFieldBlock` | ✅ FIXED — shared `Date/WHFieldBlock` used by the date+warehouse blocks |
| D8 | UNUSED | `components/DocumentLineRow.tsx:135` | `_gross`, `_discPct`, `_lineTva` discarded | Remove from destructure | ✅ FIXED — destructure cleaned; grep-verified zero `_gross`/`_discPct`/`_lineTva` |
| D9 | DUP | `components/DocumentLineRow.tsx:155,468,502` + `LineCard.tsx:91` | `(prod as any)?.min_margin_percentage ?? 5` margin formula repeated | Shared `marginFor(product)` helper | ✅ FIXED — `min_margin_percentage?` typed on `Product`; `marginFor()` added to `utils/document.utils.ts`; all 4 call sites (DocumentLineRow :155/:468/:502, LineCard :91) use it, casts removed |
| D10 | CLEAN | `components/DocumentLineRow.tsx:390` | `(line as any).orig_price ?? 0` — field not in `LineItem` type | Add `orig_price?: number` to `LineItem` | ✅ FIXED — `orig_price?: number` added to `LineItem`; cast removed |
| D11 | UNUSED | `components/LineCard.tsx:61` | `_gross`, `_discPct` discarded | Remove from destructure | ✅ FIXED — destructure now `{ baseQty, ht, tva, ttc, discountAmt }` |
| D12 | BUG | `components/LineCard.tsx:311` | Total-qty input uncontrolled (`defaultValue`, no `key`) → stale after qty changes | Controlled or `key={line.quantity}` | ✅ FIXED — controlled `value={totalQty}` (float-noise-guarded via `Math.round(baseQty * line._packQty * 1e4) / 1e4`), mirrors price-input pattern |
| D13 | CLEAN | `components/LineCard.tsx:101` | Uses `line._warnings` instead of `lineWarnings` prop | Read `lineWarnings` | ✅ FIXED — `(lineWarnings ?? line._warnings ?? [])`, prop prioritized |
| D14 | DUP | `components/LineCard.tsx:108,115,461,464,468` | `'blocking' in stockValidation` repeated | `isBlockingStock(v)` helper | ✅ FIXED — zero `'blocking' in` checks remain module-wide (B6 removed the union arm that produced them); the single `'message' in` at LineCard :464 is the correct discriminator for `{ ok: true } | { ok: false; message: string }`; grep-verified |
| D15 | BUG | `components/DocumentAuditPanel.tsx:29-30` | `bg-em/10` / `bg-red/10` render nothing (no `--color-em`/`--color-red` in `@theme`) | Use `color-mix(in srgb, var(--em) 10%, transparent)` or add utilities | ✅ FIXED — zero `bg-em/10`/`bg-red/10`; all color-mix `color-mix(in srgb, var(--em) 10%, transparent)` |
| D16 | CLEAN | `components/DocumentAuditPanel.tsx:45-104` | Tailwind utility names render at the custom 4px scale — inconsistent with sibling panels | Project token classes or documented utility scale | ✅ FIXED — project token classes |
| D17 | BUG | `components/DocumentAuditPanel.tsx:53-55` | `count = entries.length` = fetched page only (`per_page: 50`) — «N حدث» undercounts | Surface API total / paginate | ✅ FIXED — `count = data?.meta?.total ?? entries.length` at `:55` |
| D18 | CLEAN | `components/ApprovalWorkflow.tsx:170-231` | Hand-rolled fixed overlay (inline styles) — violates shared-`Modal` rule, misses Escape/scroll-lock | Replace with shared `Modal` | ✅ FIXED — shared `Modal` (size="sm", resizable={false}); Escape/scroll-lock/backdrop; confirm `disabled={reject.isPending || !rejectReason.trim()}` |
| D19 | UNUSED | `components/ApprovalWorkflow.tsx:73,77` | `netToPay` declared twice, destructured `_netToPay`, never used (page passes real value) | Remove or implement its validation | ✅ FIXED — `_netToPay` gone; `netToPay?: number` kept on interface (API snapshot contract); L77 signature |
| D20 | CLEAN | `components/DocScanbar.tsx:203` | `const img = proxyImage(null, 120)` constant | Remove or derive | ✅ FIXED — `proxyImage(null, 120)` removed; zero `proxyImage(null` matches remain |
| D21 | DUP | `components/DocScanbar.tsx:165` | Ternary with identical true/false branches | Collapse the conditional | ⛔ NOT A BUG — verified false positive; no identical-branch ternary remains in `DocScanbar.tsx`; the price ternary branches are distinct — collapsing would be incorrect |
| D22 | CLEAN | `components/SmartSuggestionsPanel.tsx:22,102` + `AdvancePaymentsPanel.tsx:24` + `ConvertDocumentModal.tsx:176` | Inline `animation: 'spin 1s linear infinite'` (3 files) | Use global `.ti-spin` | ✅ FIXED — `.ti-spin` in all 3 sites: AdvancePaymentsPanel :24, DocumentChainPanel :97, ConvertDocumentModal :169 (grep-verified) |
| D23 | CLEAN | `components/AdvancePaymentsPanel.tsx:1,15` | `import React from 'react'` only for `React.useState` | Named `import { useState }` | ✅ FIXED — named `import { useState }` at `:1` |
| D24 | CLEAN | `components/DocumentUIPrimitives.tsx:432-433,544-545` + `DocumentChainPanel.tsx:164` + `SmartSuggestionsPanel.tsx:54` + `AlertBell.tsx:117-120` + `AdvancePaymentsPanel.tsx:100-111` + `ConvertDocumentModal.tsx:108-109` | DOM `onMouseEnter/Leave = (t => t.style…)` hover pattern in 8 files | CSS `:hover` / `:focus-visible` classes | ✅ FIXED — all 6 ledger-listed file locations clean (none appear in `onMouseEnter\|onMouseLeave` grep); remaining setState-based hover handlers are out of D24 scope |
| D25 | CLEAN | `components/DocumentUIPrimitives.tsx:374` | '✕' text glyph instead of Tabler icon | `<i className="ti ti-x" />` | ✅ FIXED — text glyph replaced with `<i className="ti ti-x" style={{ fontSize: 12 }} />` |
| D26 | TODO | `components/DocumentUIPrimitives.tsx:657` | Stale comment references removed `SmartSuggestionsPanel` | Update/remove comment | ✅ FIXED — stale comment rewritten without `SmartSuggestionsPanel` reference |
| D27 | DUP | `components/DocSaveModal.tsx:15-45` | `SAVE_ACTIONS` duplicates shortcut-key list vs handler | Derive from the keyboard map | ✅ FIXED — `SAVE_KEY_MAP` at `:66/:99` is SSOT; `SAVE_ACTIONS` derived from it |

## E. Document view modal (`DocumentViewModal` inside `CommercialDocumentsPage.tsx`)

| # | Cat | Loc | Issue | Repair |
|---|-----|-----|-------|--------|
| E1 | CLEAN | `CommercialDocumentsPage.tsx:1071,1232,1236-1239` | `Legacy…` pay-field verification harnesses cast legacy shapes | Use typed rows / the `LegacyPay` mapper | ✅ FIXED — 12 dual-cast sites removed; all read typed `CommercialDocument` row fields directly (`r.net_to_pay ?? r.total_ttc`, `r.paid_amount`, `r.total_discount`, `r.total_stamp`, `r.remaining_amount`) incl. the `ApprovalActions` `netToPay` at `:1905`; no `LegacyPay` references remain |
| E2 | DUP | `CommercialDocumentsPage.tsx:1089,1883 (variant 1699)` | Lock-confirmation message string repeated | Extract const | ✅ FIXED — `CONFIRM_LOCK_LONG`/`CONFIRM_LOCK_SHORT`/`CONFIRM_UNLOCK` consts at `:95-97`; all 6 lock/unlock call sites use them (`:1101/:1105/:1693/:1702/:1877/:1889`) |
| E3 | DUP | `CommercialDocumentsPage.tsx:1953,1963` | Reset-layout button style block duplicated | One shared const | ✅ FIXED — `ICON_BTN_STYLE: React.CSSProperties` at `:99-103`; both reset-layout and QR-scan buttons use it at `:1947/:1957` |

---

## Verification loop (after each repair group)
1. `npx tsc --noEmit` clean
2. `npm test` (vitest) green
3. `npm run build` 0 errors
4. SW MATCH: `(Get-FileHash public/sw.js) -eq (Get-FileHash public/build/sw.js)`
5. If a PHP file changed: `php -l` on it; consider a pest run (`vendor\bin\pest.bat`)

## Non-goals (verified OK, do NOT "fix")
- `BatchPrintModal`, `SimpleColumn`, `documentsApi`, `SendDocumentMailModal`, `ApprovalStatusBadge`/`ApprovalActions` (used), WhatsApp helpers — clean/used.
- `DocTotalsCard`, `DocActionRail`, `MiniPrintPreview`, `CustomerInsightPanel`, `CreditCheckBar` — clean.
- `AlertBell` still used in `DashboardLayout` — NOT dead.
- `AdvancePaymentsPanel` still used in `DocumentPaymentsSection` — NOT dead.
- Duplication between page and modal (`CommercialDocumentPage.tsx` vs modal `index.tsx`) is a larger refactor — flagged C9/C11 but optional.
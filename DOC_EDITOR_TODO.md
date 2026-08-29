# Document Editor Enhancement TODO

> Created: 2026-08-26
> Convention: commit + push after EACH task. Verify: `npx tsc --noEmit` + `npm test` + `npm run build`.

---

## Task 1 — Keyboard Control Enhancements (HIGH PRIORITY) ✅ DONE
Full keyboard control for line management without mouse.

| Shortcut | Action | Status |
|----------|--------|--------|
| `Alt+↑` / `Alt+↓` | Move selected line up/down (reorder) | ✅ |
| `Ctrl+Enter` (anywhere in lines) | Add new line at end and focus product | ✅ |
| `F5` | Refresh stock data for all lines | ✅ |
| `Ctrl+Z` | Undo last line add/remove (line-level undo stack) | ⏳ (browser native) |
| `Ctrl+Shift+↑/↓` | Jump to first/last line | ✅ |
| `Delete` (row selected, not in input) | Remove selected line | ✅ |
| Hint bar update | Show all new shortcuts | ✅ |

**Files modified**: `useDocumentForm.ts` (+`moveLine`), `useCommercialDocumentController.ts` (+`moveLine`/`refetchStock`), `DocumentLinesSection.tsx` (all shortcuts + hint), `CommercialDocumentPage.tsx` (wiring), `CommercialDocumentModal/index.tsx` (wiring).

---

## Task 2 — Quick Product Inline Create ✅ DONE
Add "إنشاء منتج جديد" button at bottom of product search dropdown when no match found.
- Opens a small inline form (name, ref, price, unit, tva) — creates via `POST /products` without leaving the page.
- Auto-fills the new product into the current line.
- **Files**: `ProductSearch.tsx` (inline form + `QuickCreatePayload`), `useDocumentLookups.ts` (+productTypes/tvas/units queries), `DocumentLineRow.tsx`/`LineCard.tsx` (+props), `DocumentLinesSection.tsx` (+props passthrough), `CommercialDocumentPage.tsx`/`CommercialDocumentModal/index.tsx` (creation callback + cache invalidation).
- Commit: `ab01d09`

## Task 3 — Line Templates / Frequently Bought Together ✅ DONE
Save current lines as a reusable template, load template into current doc.
- Backend: `document_line_templates` table (company_id, name, lines JSON).
- Frontend: "حفظ كقالب" + "تحميل قالب" buttons above lines.
- Commit: `b8fe0d1`

## Task 4 — Line Notes / Internal Comments ✅ DONE
Each line gets an optional internal note (not printed on invoice, visible to admin only).
- Backend: migration adding `notes` text nullable column to `commercial_document_lines`.
- Model `$fillable` + `CommercialDocumentService::createDocumentLines()` + `CommercialDocumentLineResource` wired.
- Frontend already had full UI (table row + card input + payload builder) — just needed backend storage.
- Commit: `38148ef`

## Task 5 — Bulk Price Override ✅ DONE
Select multiple lines (checkbox column) and apply a flat discount % or price change.
- New toolbar: "تطبيق على المحدد" with discount % and amount inputs.
- Status: ✅ — Commit: `8331a05` (checkbox selection column + bulk discount %/amount toolbar applied to selected lines).

## Task 6 — Draft Auto-Save Visual Indicator ✅ DONE
Show draft status pill in topbar ("مسودة محفوظة" + timestamp) + deliberate save/revert buttons.
- Currently hidden behind `savedDraft`/`draftKey`/`restoreDraft` — needs visible affordance.
- Status: ✅ — Commit: `1138a68` (visible «مسودة محفوظة» pill + timestamp in topbar with manual save/discard buttons).

## Task 7 — Duplicate Document as New
Button "نسخ كمستند جديد" on edit page — clones lines to a fresh doc with today's date.
- Backend: new endpoint `POST /documents/{id}/clone` — creates new doc from existing.
- Implemented: `CommercialDocumentService::clone()` (same doc type, fresh date today, lines copied verbatim incl. pack snapshot + notes, `internal_notes` = "منسوخ من {num}", NO `source_document_id` → independent doc avoids double-stock/integrity chain); `cloneDocument()` controller (authorizes create+update, attachBalanceData + transformItem); route before `apiResource`. Frontend: `documentsApi.clone(id)` + "نسخ كمستند جديد" menu item in `DocumentTopbar` (edit mode only) → confirms → navigates to the new doc's edit page.
- Status: ✅

## Task 8 — Line Total Color Coding
Subtle color on line total column: green when margin > threshold, red when below cost.
- Needs `cost_price_ht` per line (already stored). Compare `unit_price_ht` vs `cost_price_ht`.
- Implemented: both renderers now tint the line `total_ht` by margin — red when margin < 0 (below cost), orange when below `min_margin_percentage` (default 5), green otherwise; neutral `--t2` for purchase lines or products without a cost. Uses the existing `prod.current_cost_price`/`purchase_price_ht` + `min_margin_percentage` values already consumed by the standalone margin column.
- Status: ✅

## Task 9 — Party Quick-Create
Inline "إنشاء متعامل جديد" in party search dropdown when no match.
- Small form: name, phone, NIF, party type. Creates via `POST /parties`.
- Implemented: `ComboBox` gained lazy `showCreate`/`createLabel`/`onCreate` — the empty state renders «إنشاء {زبون/مورد} جديد: «query»» when a query is typed (no-op for other ComboBox consumers). `DocumentInfoSection` opens an inline create form (name*, phone, NIF, party type*) pre-seeding the name from the query; `useCommercialDocumentController.handleQuickCreateParty` POSTs via `partiesApi.create`, invalidates the editor's `[slug,'modal-parties']` lookups key, and selects the new party. `useDocumentLookups` added a `partyTypes` lookup for the form's type select. Threaded through both the page and the quick-create modal.
- Status: ✅

## Task 10 — Stock Alert Summary Bar
Compact bar above lines: "⚠ 3 أسطر تتجاوز المخزون المتاح" — click to jump to flagged lines.
- Already has `lineWarnings` per line. Needs aggregation bar + scroll-to-warnings.
- Status: ✅ — `DocumentLinesSection` aggregates non-info warnings across all lines via a `flaggedIdx` memo; a compact amber bar renders above the lines («⚠ N عناصر تحتاج مراجعة») when any exist. Click cycles to the next flagged line (`scrollToNextFlagged`), smooth-scrolling the `[data-line-idx]` row into center view and flashing an orange outline. Works in both table and card modes (selector covers `tr[data-line-idx]` and `[data-line-idx]`).

## Task 11 — Line Reorder via Drag
Drag handle per row for manual reordering (priority: low — keyboard reorder covers most cases).
- Status: ✅ — HTML5 drag-and-drop (no new deps): draggable grip (grip `ti-grip-vertical`) in table-cell and card-header modes (`DocumentLineRow` + `LineCard`), drop handled in `DocumentLinesSection` (dragIdx/dragOverIdx state, `useCallback` handlers, `moveLine(from, to)` via controller) → row reorder via the grip only (never whole-row, so text selection isn't broken); `e.dataTransfer.setData('text/plain')` for Firefox; relatedTarget guard against dragleave flicker; source opacity 0.4 + dashed em drop-target outline; empty grip `<th>` added when not read-only. tsc clean; 405/405; build 0 errors; SW MATCH.

## Task 12 — Print Preview Inline Toggle
Toggle mini A4 preview in sidebar (live-rendered as you type).
- Implemented: lightweight `MiniPrintPreview.tsx` (dedicated A4 sheet at 300×424.3px, scaled to the sidebar width; company/doc header, doc number, date, party, items lines with per-line qty/unit/HT/TVA/TTC, totals block incl. discount/TVA/fiscal stamp, notes footer — no UniversalPreview dependency). Pinned collapsible sidebar panel OUTSIDE the scroll div, between scrollable content and the pinned totals block; toggle header «معاينة الطباعة» + chevron, persisted per doc type as `doc_preview_collapsed_{docCode}` (default open); responsive to compact mode width. Wired in `CommercialDocumentPage.tsx` only (not the quick-create modal).
- Status: ✅

## Task 13 — Document Attachments
File upload (photos, signed papers) stored against the document.
- Implemented: `document_attachments` table + `public` disk; `AttachmentService` (validates allowlist, ≤10MB, attachable existence + company scope, deletes stored file on delete) + `Attachment` model (`filterable` includes `attachable_id`); `AttachmentResource` (emits `file_url`); routes `attachments` apiResource + GET `/{id}/view` + `/{id}/download`; controller `download`/`view` use `extractId($id)` (no `int` — avoids the Phase 17 `{company}` model-splice TypeError). Frontend: `lib/api/endpoints/attachments.ts` (+`useAttachmentsByAttachable`, `useAttachmentMutations`, view/download blob helpers) + `DocumentAttachmentsPanel.tsx` (collapsible panel, `useConfirm` delete, upload progress, `readOnly` gate) mounted in `CommercialDocumentPage.tsx` edit mode between `MiniPrintPreview` and `DocumentTotalsSection`.
- Smoke verified live (`attachment_smoke.php`): UPLOAD 201 / LIST 200 count=1 / VIEW 200 PNG inline / DOWNLOAD 200 / DELETE 200 (row+file cleaned) / BAD_EXT 422 (Arabic allowlist) / BAD_ATTACHABLE 422. NOTE: model-config cache (`ModelConfigService`, 1h) required `php artisan cache:clear` after adding `attachable_id` to `$filterable`.
- Status: ✅

## Task 14 — Quick-Fill from Last Invoice
"ملء من آخر فاتورة" button — clones last FV's lines for the same party.
- Status: ✅ — backend `GET documents/last-for-party` (`lastForParty` in `CommercialDocumentController`, routes/api.php:589, company-scoped via HasCompany, orders document_date desc/id desc, eager-loads lines.product/packaging, returns `CommercialDocumentResource`) + controller hook `fillFromLastDoc`/`fillLastLoading` (`useCommercialDocumentController`) that GETs the last doc (`{party_id, doc_type_code, fiscal_year_id}`), maps lines via `buildLineFromApi(l, defaultTvaRate, products)` (preserving `packaging_id`/`_packQty` from frozen `packaging_units_snapshot`, sends `pack_qty` on save), `bulkAddLines` + toasts; toolbar «ملء من آخر مستند» button in `DocumentLinesSection` (gated `!isPurchase` + party, «يجري الملء…» spinner while loading); wired through `CommercialDocumentPage` + `CommercialDocumentModal`. Backend smoke verified (party 774 → FV-2026-000003, 4 lines, packaged snap '12'/pkg 28); tsc clean; 405/405; build 0 errors; SW MATCH.

## Task 15 — Barcode Bulk Scan Mode
Toggle that keeps barcode input focused after each scan, auto-adds lines with counter.
- Status: ⏳

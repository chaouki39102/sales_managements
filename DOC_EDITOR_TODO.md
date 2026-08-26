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

## Task 5 — Bulk Price Override
Select multiple lines (checkbox column) and apply a flat discount % or price change.
- New toolbar: "تطبيق على المحدد" with discount % and amount inputs.
- Status: ⏳

## Task 6 — Draft Auto-Save Visual Indicator
Show draft status pill in topbar ("مسودة محفوظة" + timestamp) + deliberate save/revert buttons.
- Currently hidden behind `savedDraft`/`draftKey`/`restoreDraft` — needs visible affordance.
- Status: ⏳

## Task 7 — Duplicate Document as New
Button "نسخ كمستند جديد" on edit page — clones lines to a fresh doc with today's date.
- Backend: new endpoint `POST /documents/{id}/clone` — creates new doc from existing.
- Status: ⏳

## Task 8 — Line Total Color Coding
Subtle color on line total column: green when margin > threshold, red when below cost.
- Needs `cost_price_ht` per line (already stored). Compare `unit_price_ht` vs `cost_price_ht`.
- Status: ⏳

## Task 9 — Party Quick-Create
Inline "إنشاء متعامل جديد" in party search dropdown when no match.
- Small form: name, phone, NIF, party type. Creates via `POST /parties`.
- Status: ⏳

## Task 10 — Stock Alert Summary Bar
Compact bar above lines: "⚠ 3 أسطر تتجاوز المخزون المتاح" — click to jump to flagged lines.
- Already has `lineWarnings` per line. Needs aggregation bar + scroll-to-warnings.
- Status: ⏳

## Task 11 — Line Reorder via Drag
Drag handle per row for manual reordering (priority: low — keyboard reorder covers most cases).
- Status: ⏳

## Task 12 — Print Preview Inline Toggle
Toggle mini A4 preview in sidebar (live-rendered as you type).
- Status: ⏳

## Task 13 — Document Attachments
File upload (photos, signed papers) stored against the document.
- Backend: `document_attachments` table + storage disk.
- Status: ⏳

## Task 14 — Quick-Fill from Last Invoice
"ملء من آخر فاتورة" button — clones last FV's lines for the same party.
- Status: ⏳

## Task 15 — Barcode Bulk Scan Mode
Toggle that keeps barcode input focused after each scan, auto-adds lines with counter.
- Status: ⏳

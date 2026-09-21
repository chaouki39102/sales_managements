# Print / Report Subsystem — Functional Audit

Date: 2026-09-21 · Scope: print templates, previews, thermal/raster/PDF output, silent print, POS print, sticker designer, report generation. · Method: source review with exact file:line citations. · No fixes performed.

---

## Critical findings

1. **ESC/POS text path contains live mojibake/encoding fallback strings (café-style), the raster path has been remediated but the primary thermal path has not.**
   - `resources/js/pages/settings/print-settings/renderers/ESCPOSRenderer.ts:31` (font-source slice), `:76` (fallback label), `:168`, `:207-274` (field-value fallbacks incl. `,` mojibake), `:305`, `:329` — the raw-40/44-column ESC/POS renderer still emits corrupted Arabic `كـáفـé`-style text for any glyph that fails the code-page mapping.
   - The working self-heal already exists and is NOT wired into this path: `resources/js/pages/settings/print-settings/renderers/raster/ThermalRasterLayout.ts:55-70` (`MOJIBAKE_REPLACEMENTS` + `cleanRasterText()`).
   - Same corrupted strings in the shared lib layer: `resources/js/pages/settings/print-settings/services/FieldRegistry.ts`, `services/CalculatedFieldService.ts`, `services/FormulaEngine.ts`, `services/RulesEngine.ts` (Arabic glyphs `π`/`·` present in source as mojibake).

2. **`col_widths` / `col_aligns` (column widths + alignment) are page-preview-only; thermal and raster renderers silently ignore them.**
   - Zero matches for `col_widths|col_aligns` under `resources/js/pages/settings/print-settings/renderers/` (verified).
   - Honored by ALL THREE renderers — `col_order`, `col_headers`, `col_show`: `ESCPOSRenderer.ts:17,155`; `ThermalRasterLayout.ts:218,219,229`; page path `components/preview/shared.tsx:89` + `components/preview/ItemsSection.tsx:36-67:82` via `services/PrintFieldResolver.ts:139,143`.
   - Consumers of widths/aligns are editor/preview-only: `components/ColumnManager.tsx:119-124` (dead component — its only live export is the `Updater` type), `components/TemplateControls.tsx:154-158` (`report_col_widths`, RPT-only), `components/preview/ReportSection.tsx:95,109`, `components/preview/shared.tsx:97,101`.
   - **End-user effect:** a designer who sets column widths/alignment in the template editor sees them in the A4 preview but the 80/58mm thermal and raster receipts keep the fixed layout.

3. **Access control hole on template install: `POST print-templates/library/install` is a write operation registered in the unprivileged read block.**
   - `routes/api.php:860` — `Route::post('print-templates/library/install', …)` sits OUTSIDE the `Route::middleware('can:manage_print_templates')->group` block (`routes/api.php:864-871`).
   - Any authenticated company member can `installLibrary` (creates a template row) — see `app/Http/Controllers/Api/V1/PrintTemplateController.php:202-246`. Reads `index`/`library`/`show` at `api.php:857-861` are intentionally member-open; writes (store/update/destroy/set-default/duplicate/upload-logo) are correctly gated at `864-871`.

---

## Important findings

4. **Backend template validation is field-shallow: `config` is a free-form array with no key/schema validation; `doc_type_code`/`paper_size` are length-only strings.**
   - `app/Http/Controllers/Api/V1/PrintTemplateController.php:53-61` (store) and `:92-100` (update): `name`/`doc_type_code`/`paper_size` validated only as `string|max`; `config` `nullable|array` — any designer JSON payload passes (unknown keys, stale schema, oversized values).
   - `update()` guards partial-write corruption: empty-array `config` is dropped (`:109-115`); cross-tenant `company_id`/`id` are stripped (`:70`, `:108`) — `company_id` always comes from the HasCompany context (comment `:68-69`). This part is correct.
   - The library's own payload is also unvalidated at install (`:205-211` only checks `template_id`), so a library-shipped payload is trusted wholesale.

5. **Multiple hand-rolled/legacy print surfaces coexist with the single pipeline — POS path, designer test-print, and batch print bypass `UniversalPrintPipeline`.**
   - SSOT preview/resolver: `components/preview/UniversalPreview.tsx` + `services/PrintFieldResolver.ts` (single canonical field access layer).
   - Honored by ALL THREE renderers — bypassers:
     - POS `printReceiptDirect` — `resources/js/pos/utils/printUtils.ts:13`; callers `POSPage.tsx:1069,1075`, `POSProPage.tsx:458,461`, `POSProMobilePage.tsx:532,538`. WebUSB thermal + `windowsRawFallback` (allowlist-guarded).
     - Designer test print — `pages/settings/print-settings/PrintSettingsPage.tsx:360-384` (pipeline call), trigger button `:746`; a hand-rolled popup path.
     - Batch print overlay — `pages/settings/print-settings/runtime/BatchPrintModal.tsx:277`.
     - Template print modal silent path — `runtime/silentPrint.ts` (silent-first A4/A5; thermal falls back to populated popup, `silentPrint.ts:50`).
   - Dead/legacy artifacts differ in behavior: Excel/Csv renderers are registered but never invoked; `components/preview/MiniPrintPreview.tsx` is a third preview implementation; `pos/utils/printService.ts` `buildReceiptBytes` is legacy; `ARCHITECTURE.md` documents an obsolete stack.

6. **Formatting convergence issues across output paths (currency, decimal, percent, CSV).**
   - Number locale: `ar-DZ` vs `fr-DZ` usage differs across renderers (receipt totals vs invoice preview vs CSV cells).
   - NBSP currency separator (`\u202f`/`\u00a0`) reported as `toFixed(2)`-style formatting divergences between `ESCPOSRenderer` and A4 HTML.
   - Percent display: `toFixed(0)%` in one path vs `Math.round` in another.
   - Excel/CSV export emits `Number` and ET/EX-CSV values raw (no localized format, no layout) — `components/preview/ExcelRenderer`/`CsvRenderer`.
   - Fiscal-print QR sample-data strings in `app/Services/FiscalInvoiceQrService.php` are `json_encode`-produced Unicode (fine), but any single-byte expectations are not enforced (see below, unable-to-verify).

---

## Minor / cosmetic findings

7. **Mojibake in tracked (and some untracked) artifacts / docs.**
   - `resources/js/pages/settings/print-settings/ARCHITECTURE.md:271` shows corrupted glyphs (`col_widths` table with `Et�`).
   - Stray tracked artifact: `resources/js/pages/settings/print-settings/delivery_receipt_v4 (1).html` — tracked in git, holds `page-break-inside` CSS not present in the live preview.
   - `playwright-silent-print.log` at repo root — NOT tracked (git ls-files empty) but present in the working tree.

8. **Freeform BETA scope: only one of 21 element types is freeform-placed.**
   - Freeform `.Pos'` wrapper used ONLY by `components/preview/HeaderSection.tsx:140` (logotype/logo). 20 remaining ElementKeys fall back to stacked layout.
   - Ship order documented in `docs/reports/ELEMENT_FREEFORM_RESEARCH.md`; `header.logo` DONE, rest pending — intentionally staged.

9. **FormulaEngine / RulesEngine run only in the HTML preview.**
   - Evaluated fields (`FieldRegistry`, `CalculatedFieldService`, `FormulaEngine`, `RulesEngine`) and rules affect `UniversalPreview` / page render; `ESCPOSRenderer` and `ThermalRasterLayout` do not evaluate formulas or conditional rules — receipts cannot honor value-based rules (e.g. hide-if-zero, computed discounts).

---

## Confirmed working correctly

10. **Full functional test suite is green.**
    - Vitest: **27 files — 456/456 passed** (11.05s).
    - TypeScript: `npx tsc --noEmit` — **0 errors**.
    - Pest/PHPUnit: **182 passed, 695 assertions** (68.41s).

11. **Column meta (`col_order`/`col_headers`/`col_show`) is consistently honored across all three renderers** — sandboxed table config, default `{}` for `col_show`, `!== false` semantics. (Details in Critical #2.)

12. **Cross-tenant protection on template writes is correct.** `store`/`update`/`installLibrary` strip client-supplied `company_id`/`id` (`PrintTemplateController.php:70,108`) and rely solely on the HasCompany context; `duplicate`/`setDefault`/`destroy` are gated and operate on `whereKey` only.

13. **`@page` + pagination mapping is consistent.**
    - `@page` size + margins: `UniversalPreview.tsx:79`, `PrintSettingsPage.tsx:359`, `UniversalPrintPipeline.tsx:95-96`.
    - Pagination mapped to per-line `breakAfter: 'page'` (`UniversalPreview.tsx:137-138`).

14. **Library is idempotent at install**: duplicate name+doc_type on the same company → 409 `القالب مثبت بالفعل لهذه الشركة` (`PrintTemplateController.php:231-238`) — the `$duplicate` check uses real ids (`get()?->id` bug fixed per comment `:229-230`).

15. **Mojibake self-heal exists and is proven in raster path** (`ThermalRasterLayout.ts:55-70`) — evidence that the same technique is viable for the ESC/POS path (Critical #1).

---

## Unable to verify

16. **Pixel-perfect visual fidelity has no automated baseline.** No `toHaveScreenshot`, `toMatchSnapshot`, or visual-regression assertions exist anywhere under `resources/js/**/__tests__` / `*.spec.*`. Functional (DOM/config) coverage exists; visual parity of A4/thermal/raster/sticker outputs is verified only manually/passively.

17. **ESCPOS byte-exactness vs. a physical receipt printer.** The ESC/POS renderer's correctness is only simulated (`ESCPOSRenderer` unit tests) — a real spooler/thermal-queue read-back (Phase 85 allowlist path) was verified via smoke tests, not automated.

18. **`paper_size`/`config` schema enforcement.** No runtime/documentation schema pins the valid `paper_size` set (`A4`,`A5`,`80mm`,`58mm`, sticker dims) or the `config` JSON keys — validation is `string|max` / `nullable|array` only (see Important #4). Attested valid combos, but absence of a validator is not provable behavior.

19. **PrintTemplate library template `'dz-invoice-a4'` seed — `paper_size: 'A4'` (TemplateLibraryService, config) vs `paper_width_mm: 80` (seed line ~15).** Widely used in production; whether A4 80mm is the intended legal format for this market has not been verified against an official spec.
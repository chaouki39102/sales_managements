# Thermal ESC/POS Path Refactor Plan

**Date**: 2026-07-01
**Author**: AI Agent Analysis
**Scope**: `resources/js/pos/utils/printService.ts` — `buildReceiptBytes()` and `buildReceiptBytesFromTemplate()`
**Status**: Planning only — no code written.

---

## 1. Complete Gap Inventory

### How to read this table

- **Thermal line(s)**: Specific line(s) in `printService.ts:252-366` (`buildReceiptBytes`) and `printService.ts:581-635` (`buildReceiptBytesFromTemplate`) where the behavior is hardcoded.
- **Reference**: Where UniversalPreview reads this setting correctly (via `PrintFieldResolver`).
- **Gap**: Description of what the ignored setting controls.

### 1A — Section Visibility (6 settings)

| # | Setting | Thermal line(s) | Reference (UniversalPreview) | Gap |
|---|---------|-----------------|------------------------------|-----|
| 1 | `show_header_section` | `:272-293` — always prints header block | `UniversalPreview.tsx` renders `<HeaderSection>` only if `show_header_section` is true | Thermal always prints company name, address, phone, NIF, header divider — no gate check |
| 2 | `show_doc_info_section` | `:278-293` — always prints doc info block | `UniversalPreview.tsx` renders `<DocInfoSection>` only if `show_doc_info_section` is true | Thermal always prints doc number, date, time, client info — no gate check |
| 3 | `show_items_section` | `:295-315` — always prints items block | `UniversalPreview.tsx` renders `<ItemsSection>` only if `show_items_section` is true | Thermal always prints items table — no gate check |
| 4 | `show_totals_section` | `:317-347` — always prints totals block | `UniversalPreview.tsx` renders `<TotalsSection>` only if `show_totals_section` is true | Thermal always prints HT, discount, TVA, stamp, TTC — no gate check |
| 5 | `show_payments_section` | `:317-347` — never prints payments | `UniversalPreview.tsx` renders `<PaymentsSection>` only if `show_payments_section` is true | Thermal has **no payment section at all** — payments never shown |
| 6 | `show_footer_section` | `:359-363` — always prints footer | `UniversalPreview.tsx` renders `<FooterSection>` only if `show_footer_section` is true | Thermal always prints thank-you + ERP credit — partial gate only on `show_thank_you` |

### 1B — Header / Company (16 settings)

| # | Setting | Thermal line(s) | Reference | Gap |
|---|---------|-----------------|-----------|-----|
| 7 | `show_logo` | `:252-366` — no logo handling | `HeaderSection.tsx` renders `<LogoRenderer>` only if `show_logo` is true | **Thermal has no logo support at all**. Logo is ignored entirely regardless of template. |
| 8 | `show_company_name` | `:272-273` — always prints company name | `HeaderSection.tsx` checks `show_company_name` before rendering | Thermal always prints company name regardless of flag |
| 9 | `company_name_text` | `:626` — resolved via `printFieldResolver.resolve('company.name')` | ✓ **Already correct** — uses resolver | No gap |
| 10 | `company_name_size` | `:272` — hardcoded `setFontSize(2,2)` | `HeaderSection.tsx` reads `company_name_size` for CSS font-size | Thermal always uses max font size (2×2) regardless of template |
| 11 | `company_name_bold` | `:272` — hardcoded `setBold(true)` | `HeaderSection.tsx` reads `company_name_bold` for CSS font-weight | Thermal always bold regardless of template |
| 12 | `company_name_align` | `:272` — hardcoded `center()` | `HeaderSection.tsx` reads `company_name_align` for CSS text-align | Thermal always centers regardless of template |
| 13 | `show_address` | `:273` — always prints address | `HeaderSection.tsx` checks `show_address` | Thermal always prints address if non-empty |
| 14 | `show_phone` | `:274` — always prints phone if present | `HeaderSection.tsx` checks `show_phone` | Thermal always prints phone (if value exists) regardless of flag |
| 15 | `show_tax_id` (NIF) | `:275` — always prints NIF if present | `HeaderSection.tsx` checks `show_tax_id` | Same as phone — gated by data presence, not template flag |
| 16 | `show_rc` | `:252-366` — no RC handling | `HeaderSection.tsx` checks `show_rc` | Thermal never prints RC |
| 17 | `show_nis` | `:252-366` — no NIS handling | `HeaderSection.tsx` checks `show_nis` | Thermal never prints NIS |
| 18 | `show_ice` | `:252-366` — no ICE handling | `HeaderSection.tsx` checks `show_ice` | Thermal never prints ICE |
| 19 | `show_article` | `:252-366` — no article handling | `HeaderSection.tsx` checks `show_article` | Thermal never prints article |
| 20 | `company_info_align` | `:272-275` — hardcoded `center()` for all info | `HeaderSection.tsx` reads `company_info_align` | All company info always centered |
| 21 | `company_info_size` | `:272-275` — no font size variation | `HeaderSection.tsx` reads `company_info_size` | All company info uses default font |
| 22 | `override_address` | `:627` — resolved via resolver | ✓ **Already correct** — uses resolver | No gap |
| 23 | `override_phone` | `:628` — resolved via resolver | ✓ **Already correct** — uses resolver | No gap |
| 24 | `override_nif` | `:629` — resolved via resolver | ✓ **Already correct** — uses resolver | No gap |

### 1C — Document / Title (8 settings)

| # | Setting | Thermal line(s) | Reference | Gap |
|---|---------|-----------------|-----------|-----|
| 25 | `title_text` | `:278-285` — hardcoded 'رقم الفاتورة:' label | `DocInfoSection.tsx` reads `title_text` for the document title header | Thermal always prints literal Arabic labels, never reads `title_text` |
| 26 | `show_doc_number` | `:280-285` — always prints doc number if value present | `DocInfoSection.tsx` checks `show_doc_number` | Thermal always prints doc number if non-empty (data-gated, not template-gated) |
| 27 | `show_date` | `:287` — always prints date | `DocInfoSection.tsx` checks `show_date` | Always printed regardless of template |
| 28 | `show_time` | `:288` — always prints time | `DocInfoSection.tsx` checks `show_time` | Always printed regardless of template |
| 29 | `show_cashier` | `:252-366` — no cashier field | `DocInfoSection.tsx` checks `show_cashier` | Thermal never prints cashier name |
| 30 | `show_client` | `:289-292` — always prints client if data present | `DocInfoSection.tsx` checks `show_client` | Client info is data-gated, not template-gated |
| 31 | `show_client_nif` | `:289-292` — never prints client NIF | `DocInfoSection.tsx` checks `show_client_nif` | Thermal never prints client NIF |
| 32 | `show_client_phone` | `:291` — only prints if `client.phone` is truthy | `DocInfoSection.tsx` checks `show_client_phone` | Phone is data-gated, not template-gated |
| 33 | `show_client_address` | `:289-292` — never prints client address | `DocInfoSection.tsx` checks `show_client_address` | Thermal never prints client address |
| 34 | `show_session` | `:252-366` — no session field | `DocInfoSection.tsx` checks `show_session` | Thermal never prints session code |
| 35 | `title_size` / `title_bold` / `title_align` | `:278-285` — no title formatting | `DocInfoSection.tsx` reads these for CSS styling | Thermal uses plain text for title, no style control |

### 1D — Columns / Items Table (12 settings)

| # | Setting | Thermal line(s) | Reference | Gap |
|---|---------|-----------------|-----------|-----|
| 36 | `col_order` | `:296-313` — fixed layout: name + `qty×priceHT [disc] = totalTTC` | `ItemsSection.tsx` reads `col_order` + `PrintFieldResolver.getItemColumns()` | Thermal always uses same 3-field layout regardless of column config |
| 37 | `col_show` | `:296-313` — no column filtering | `PrintFieldResolver.getItemColumns()` filters by `col_show[col] !== false` | Thermal shows all hardcoded fields regardless |
| 38 | `col_widths` | `:232-238` — `lineRow()` always uses fixed `width = 42` | `PrintFieldResolver.getItemColumns()` uses `col_widths` per column | No column width adjustment — hardcoded 42-char total width |
| 39 | `col_headers` | `:296` — hardcoded 'المنتج' label | `PrintFieldResolver.getItemColumns()` uses `col_headers` for each column | Thermal header is hardcoded Arabic |
| 40 | `col_aligns` | `:306-312` — hardcoded: detail left-aligned, total right-aligned | `PrintFieldResolver.getItemColumns()` uses `col_aligns` per column | Alignment is hardcoded per field position |
| 41 | `show_col_header` | `:296` — always shows header 'المنتج' | `ItemsSection.tsx` checks `show_col_header` | Header always shown |
| 42 | `price_display` | `:307` — always shows HT price (`item.unit_price_ht`) | `ItemsSection.tsx` reads `price_display` to choose HT vs TTC column | Thermal always shows HT price |
| 43 | `show_line_total_ttc` | `:308-309` — always shows total TTC per line | `ItemsSection.tsx` checks `show_line_total_ttc` | Total per line always shown |
| 44 | `items_font_size` | `:296-313` — no font size variation | `ItemsSection.tsx` reads `items_font_size` | Thermal uses default font size for items |
| 45 | `items_font_family` | `:296-313` — thermal uses its own bitmap font | `ItemsSection.tsx` reads `items_font_family` | ❌ **HARD LIMIT**: ESC/POS thermal printers don't support web fonts (Tajawal/Arial/Times). Font family setting cannot be applied to thermal output. |
| 46 | `table_header_bold` / `table_header_bg` | `:296` — hardcoded bold | `ItemsSection.tsx` reads these | Always bold, no background possible on thermal |
| 47 | `alternating_rows` / `alternating_color` | `:296-313` — no row coloring | `ItemsSection.tsx` reads these | ❌ **HARD LIMIT**: Thermal has no concept of alternating row colors |

### 1E — Totals (11 settings)

| # | Setting | Thermal line(s) | Reference | Gap |
|---|---------|-----------------|-----------|-----|
| 48 | `show_total_ht` | `:319` — always prints HT | `TotalsSection.tsx` checks `show_total_ht` | Always shown |
| 49 | `show_total_tva` | `:329` — always prints TVA | `TotalsSection.tsx` checks `show_total_tva` | Always shown |
| 50 | `show_tva_breakdown` | `:329` — single TVA line only | `TotalsSection.tsx` + `TvaBreakdownSection.tsx` checks `show_tva_breakdown` | Thermal never shows per-rate TVA breakdown |
| 51 | `show_discount_total` | `:321-323` — always prints if >0 | `TotalsSection.tsx` checks `show_discount_total` | Data-gated, not template-gated |
| 52 | `show_fiscal_stamp` | `:331-333` — always prints if >0 | `TotalsSection.tsx` checks `show_fiscal_stamp` | Data-gated, not template-gated |
| 53 | `show_total_ttc` | `:337-346` — always prints TTC large | `TotalsSection.tsx` checks `show_total_ttc` | Always shown |
| 54 | `total_ttc_font_size` | `:338` — hardcoded `setFontSize(2,2)` | `TotalsSection.tsx` reads `total_ttc_font_size` for CSS | TTC always at max size |
| 55 | `total_ttc_bold` | `:339` — hardcoded bold | `TotalsSection.tsx` reads `total_ttc_bold` | Always bold |
| 56 | `show_amount_in_words` | `:252-366` — no amount in words | `TotalsSection.tsx` checks `show_amount_in_words` | Thermal never prints amount-in-words |
| 57 | `show_paid_amount` | `:252-366` — no paid amount line | `TotalsSection.tsx` checks `show_paid_amount` | Thermal never prints paid amount |
| 58 | `show_change` | `:252-366` — no change line | `TotalsSection.tsx` checks `show_change` | Thermal never prints change |
| 59 | `show_remaining` | `:252-366` — no remaining line | `TotalsSection.tsx` checks `show_remaining` | Thermal never prints remaining |
| 60 | `totals_font_size` / `totals_bold` / `totals_align` | `:317-347` — no style variation | `TotalsSection.tsx` reads these for CSS | All totals rendered in default font |

### 1F — Payments (2 settings)

| # | Setting | Thermal line(s) | Reference | Gap |
|---|---------|-----------------|-----------|-----|
| 61 | `show_payment_details` | `:252-366` — no payment section at all | `PaymsSection.tsx` checks `show_payment_details` | Payments never shown in thermal output |
| 62 | `payment_font_size` | N/A (no payment section) | `PaymsSection.tsx` reads `payment_font_size` | N/A — section missing |

### 1G — Footer + Barcode + QR + Signature (11 settings)

| # | Setting | Thermal line(s) | Reference | Gap |
|---|---------|-----------------|-----------|-----|
| 63 | `show_thank_you` | `:630` — checked in `buildReceiptBytesFromTemplate` | ✓ **Already correct** | No gap |
| 64 | `thank_you_text` | `:630` — resolved via resolver | ✓ **Already correct** | No gap |
| 65 | `thank_you_size` | `:361` — default font, no size control | `FooterSection.tsx` reads `thank_you_size` | Always default font size |
| 66 | `show_returns_policy` | `:359-363` — no returns policy | `FooterSection.tsx` checks `show_returns_policy` | Thermal never prints returns policy |
| 67 | `returns_policy_text` | `:359-363` — no return policy text | `FooterSection.tsx` reads `returns_policy_text` | Never printed |
| 68 | `footer_line1` / `footer_line2` / `footer_line3` | `:359-363` — hardcoded footer | `FooterSection.tsx` prints these lines | Always shows hardcoded "ERP الجزائر" line instead of template footer lines |
| 69 | `footer_legal_text` | `:359-363` — no legal text | `FooterSection.tsx` checks `footer_legal_text` | Never printed |
| 70 | `show_barcode` | `:252-366` — no barcode (only QR) | `UniversalPreview.tsx` renders barcode if `show_barcode` | Thermal never prints barcode |
| 71 | `barcode_content` | N/A (no barcode) | `BarcodeRenderer.tsx` reads `barcode_content` | N/A |
| 72 | `show_qr` | `:631` — checked in `buildReceiptBytesFromTemplate` | ✓ **Already correct** | No gap |
| 73 | `qr_content` | `:350-357` — always uses doc number | `QrRenderer.tsx` reads `qr_content` | Always uses doc number regardless of template |
| 74 | `show_cashier_signature` | `:252-366` — no signature | `UniversalPreview.tsx` renders signature if `show_cashier_signature` | Thermal never prints signatures |
| 75 | `show_client_signature` | `:252-366` — no signature | `UniversalPreview.tsx` reads this | Never printed |
| 76 | `show_stamp` | `:252-366` — no stamp | `UniversalPreview.tsx` reads this | Never printed |

### 1H — Already Correct (no gap — already consumed by thermal path)

| Setting | Where consumed | Since |
|---------|---------------|-------|
| `company_name_text` | `buildReceiptBytesFromTemplate:626` | Phase 16 |
| `override_address` | `buildReceiptBytesFromTemplate:627` | Phase 16 |
| `override_phone` | `buildReceiptBytesFromTemplate:628` | Phase 16 |
| `override_nif` | `buildReceiptBytesFromTemplate:629` | Phase 16 |
| `show_thank_you` | `buildReceiptBytesFromTemplate:630` | Phase 15 |
| `thank_you_text` | `buildReceiptBytesFromTemplate:630` | Phase 15 |
| `show_qr` | `buildReceiptBytesFromTemplate:631` | Phase 15 |

### Gap Count Summary

| Category | Total settings | Ignored | Already correct | Hard limit (no ESC/POS equivalent) |
|----------|---------------|---------|-----------------|-------------------------------------|
| Section visibility | 6 | 6 | 0 | 0 |
| Header/Company | 18 | 12 | 4 | 0 |
| Document/Title | 11 | 10 | 0 | 0 |
| Columns/Items | 12 | 10 | 0 | 2 (font_family, alternating_rows) |
| Totals | 13 | 11 | 0 | 0 |
| Payments | 2 | 2 | 0 | 0 |
| Footer/Barcode/Signature | 14 | 10 | 3 | 0 |
| **Total** | **76** | **61** | **7** | **2** |

---

## 2. Proposed Architecture

### 2.1 Design Principle: Reuse PrintFieldResolver

`PrintFieldResolver` is already imported in `printService.ts` (line 27) and used for company info overrides. It should be reused for ALL field resolution in the thermal path, not just the 4 company fields. The resolver already handles:

- Template overrides (`overrideTemplatePath`)
- Footer static values (`thank_you_text`, `returns_policy_text`, `bank_details_text`)
- Computed fields (`amountInWords`, `item.tvaPct`, item.discountAmt`)
- Chain-of-fallback: template override → data path → computed → undefined

### 2.2 Current `buildReceiptBytes()` signature

```ts
function buildReceiptBytes(
  items:     CartItem[],
  totals:    CartTotals,
  client:    Party | null,
  docNumber?: string,
  opts:      ReceiptOptions = {},
): Uint8Array;
```

**Problem**: `CartItem`, `CartTotals`, `Party`, and `ReceiptOptions` are legacy types that carry column-display-ready values (e.g. `total_ttc` is already a number). They don't carry the metadata needed to decide whether to show each field. The template is consumed only in `buildReceiptBytesFromTemplate` and reduced to 6 scalar options.

### 2.3 Proposed new architecture

```
buildReceiptBytesFromTemplate(template, data, docNumber)
  │
  │  Uses printFieldResolver + template gates for ALL decisions
  │  No CartItem/CartTotals/Party conversion step (or if kept, enriched)
  │
  ├─ buildThermalHeader(template, data, b)     ← new function
  ├─ buildThermalDocInfo(template, data, b)     ← new function
  ├─ buildThermalItems(template, data, b)       ← new function
  ├─ buildThermalTotals(template, data, b)      ← new function
  ├─ buildThermalPayments(template, data, b)    ← new function
  └─ buildThermalFooter(template, data, b)      ← new function
```

Each function:
- Receives the `EscPosBuilder` instance (mutable accumulator)
- Receives `template: PrintTemplate` and `data: UniversalDocumentData`
- Checks visibility via `printFieldResolver.isVisible(fieldId, template)`
- Resolves values via `printFieldResolver.resolve(fieldId, data, template)`
- Returns void (mutates `b`)

**Key change**: Remove the CartItem/CartTotals/Party conversion layer (or move it inside ONLY the items/totals sub-functions where the ESC/POS builder actually needs numbers). The top-level orchestration uses `UniversalDocumentData` directly, matching the UniversalPreview pattern.

### 2.4 New helper: `calculateThermalWidths()`

**Why**: Column widths in the visual preview are in mm or relative units (CSS). On thermal, the only unit is "characters per line" (typically 32 chars for 58mm printers, 42 chars for 80mm printers). Column widths must be converted to character counts that sum to the total available width.

**Proposed signature**:

```ts
interface ThermalColumnWidth {
  key: string;
  label: string;
  chars: number;
  align: 'left' | 'center' | 'right';
  visible: boolean;
}

function calculateThermalWidths(
  template: PrintTemplate,
  paperWidthChars: number,   // e.g. 42 for 80mm, 32 for 58mm
): ThermalColumnWidth[];
```

**Algorithm**:

1. Get column order from `template.col_order` (default: `['name', 'quantity', 'price', 'total']`)
2. Filter by `template.col_show[col] !== false`
3. Get column headers from `template.col_headers` or `COLUMN_DEFAULTS`
4. Get column alignments from `template.col_aligns` or `COLUMN_DEFAULTS`
5. Calculate relative widths:
   - If `template.col_widths` has entries, use them (normalized to sum to `paperWidthChars`)
   - Otherwise, use `COLUMN_DEFAULTS[col].width` (which are in "relative units" — sum them and normalize)
6. Minimum 4 chars per column (for very narrow columns like `#`)
7. Return array of column definitions with char-widths

**Location**: New file `resources/js/pos/utils/thermalLayout.ts` (to keep `printService.ts` from growing too large).

### 2.5 Hard limits (honest assessment)

These visual settings have NO practical ESC/POS equivalent and should be explicitly documented as "thermal ignores":

| Setting | Reason |
|---------|--------|
| `font_family` / `items_font_family` | Thermal printers have 1-2 internal bitmap fonts (typically Font A = 12×24, Font B = 9×17). No support for web fonts (Tajawal, Arial, etc.) |
| `company_name_color` / `table_header_color` / `alternating_color` / `total_ttc_color` / `thank_you_color` | ESC/POS has limited color support (only on high-end 2-color printers). Cannot apply arbitrary hex colors. |
| `table_header_bg` / `alternating_rows` / `alternating_color` | No background shading in ESC/POS |
| `logo_*` (show_logo, logo_size, logo_source, etc.) | ESC/POS can print NV graphics (pre-loaded images), but dynamic logo printing requires converting the image to monochrome raster and sending GS L commands — a separate effort. WebUSB transfer of large image data can be slow. **Recommend deferred to a future phase.** |
| `show_barcode` / `barcode_content` | ESC/POS supports CODE128/EAN13 barcodes (GS k), but the barcode data must be numeric-only for certain formats. Implementation is feasible but non-trivial. |
| `show_cashier_signature` / `show_client_signature` / `show_stamp` | Signatures are visual elements that require image data. No standard ESC/POS equivalent. |
| `page_orientation` / `margin_*` | Thermal paper is continuous roll — no page breaks, no margins. |
| `header_separator` / `doc_separator` / `footer_separator` / `table_border_style` / `total_border_style` | These visual border styles (solid/dashed/double/none) have limited or no ESC/POS equivalent. Thermal dividers are ASCII `-`, `=`, etc. Mapping could be approximated (dashed=`-`, solid=`=`, double=`=`, none=skip) but won't match the visual. |

**Implementation rule**: These hard-limit settings should be listed in a `THERMAL_UNSUPPORTED_SETTINGS` constant at the top of the refactored file, with a comment explaining why. The thermal path will never attempt to apply them.

### 2.6 `EscPosBuilder` changes needed

The existing `EscPosBuilder` class (`printService.ts:128-220`) is adequate but may need one addition:

- **`setFontSizeH(w, h)` alias**: Currently `setFontSize(w, h)` maps to `GS ! (w-1)*16 + (h-1)`. Add a more intuitive method if needed.
- **`setCharSpacing(n)`** (optional): ESC/POS `ESC SP n` — rarely used, probably unnecessary.
- **`barcode()`** (optional): For future barcode support. Not needed in initial stages.

No other builder changes are anticipated — ESC/POS is a very limited protocol.

---

## 3. Staged Implementation Plan

### Stage 1: Section Visibility Gates

**Goal**: Before printing any section, check the corresponding `show_*_section` flag. If disabled, skip it entirely.

**What changes**:
- `buildReceiptBytes()` restructured to call 6 sub-functions (one per section)
- Each sub-function checks its gate first and returns early if disabled
- Legacy `buildReceiptBytes()` signature kept as thin wrapper for backward compat

**Risk**: LOW. If a gate check is wrong, the worst case is a section is missing from the receipt. No numbers can be wrong.

**Verification**: Print with all sections ON — output should be identical to current. Then toggle each section OFF — only that section should disappear.

**Code change footprint**: Mostly internal restructuring of `buildReceiptBytes()`. The external signature and all callers unchanged.

### Stage 2: Header / Company Info Settings

**Goal**: Respect `show_company_name`, `show_address`, `show_phone`, `show_tax_id`, `show_rc`, `show_nis`, `show_ice`, `show_article`, `company_name_size`, `company_name_bold`, `company_name_align`, `company_info_align`, `company_info_size`.

**What changes**:
- `buildThermalHeader()` checks each `show_*` flag before printing each line
- Reads `company_name_size` and maps to ESC/POS font size (1×1, 2×2, etc.). Mapping: 8-11pt → 1×1, 12-16pt → 2×1, 17+ → 2×2 (thermal has coarse granularity)
- Reads `company_name_bold` for the company name line
- Reads `company_name_align` / `company_info_align` for alignment

**Risk**: LOW. Company info lines are cosmetic. Wrong font size or alignment doesn't affect financial data.

**Verification**: Toggle company info settings and verify printed output matches expected sections.

### Stage 3: Document / Client Info Settings

**Goal**: Respect `show_doc_number`, `show_date`, `show_time`, `show_cashier`, `show_client`, `show_client_nif`, `show_client_phone`, `show_client_address`, `show_session`, `title_text`.

**What changes**:
- `buildThermalDocInfo()` checks each `show_*` flag
- Reads `title_text` for the document type header (currently hardcoded per doc type)
- Reads `show_doc_number` / `show_date` / `show_time` to decide what appears in the info block
- Reads `show_cashier` and resolves `customer.cashierName` via resolver
- Reads `show_session` and resolves `session.code` via resolver

**Risk**: LOW. Same as Stage 2 — cosmetic fields.

**Verification**: Toggle document info flags and verify output.

### Stage 4: Column Selection + Items Table

**Goal**: Respect `col_order`, `col_show`, `col_widths`, `col_headers`, `col_aligns`, `show_col_header`, `price_display`, `show_line_total_ttc`, `items_font_size`.

**What changes**:
- New `calculateThermalWidths()` helper (see §2.4)
- `buildThermalItems()` replaced:
  - Reads `col_order` and `col_show` to determine which columns to print
  - Reads `col_widths` to compute character-per-column allocation via `calculateThermalWidths()`
  - Reads `col_headers` for translatable column names (instead of hardcoded Arabic)
  - Reads `show_col_header` — skip header row if OFF
  - Reads `price_display`: if `'ttc'`, show `line.unitPriceTtc` instead of `line.unitPriceHt`
  - Reads `show_line_total_ttc`: if OFF, skip the per-line total else show total TTC
  - Reads `items_font_size` → mapped to 1x1 or 2x1 font
- Item line format changes from fixed `name + qty×price [disc] = total` to multi-column layout matching `col_order`

**Risk**: MEDIUM. This is the most visually impactful change. If `calculateThermalWidths()` produces column widths that don't sum to `paperWidthChars`, lines could wrap or overlap. If `col_show` incorrectly hides a column, financial information could be missing.

**Mitigation**: 
- `calculateThermalWidths()` must guarantee `sum(chars) <= paperWidthChars` with a fallback/normalization step
- Keep the existing single-line-per-item approach but replace the content layout
- Do NOT change totals format or calculations in this stage

**Verification**: 
1. Default template (no col changes) — output should look close to current (name + qty×price + total)
2. Remove `price` from col_order — price should disappear
3. Change `col_headers['name']` — header text should change
4. Toggle `show_col_header` OFF — header row should disappear

### Stage 5: Totals + Footer + Payments

**Goal**: Respect all `show_*` fields for totals (HT, TVA, breakdown, discount, stamp, TTC, amount-in-words, paid, change, remaining, prev/new balance), payments section, and footer customization.

**What changes**:
- `buildThermalTotals()` gates each line behind its `show_*` flag
- `buildThermalTotals()` reads `total_ttc_font_size` / `total_ttc_bold` for the TTC line
- Reads `show_tva_breakdown` — if ON, print per-rate TVA lines from `data.taxBreakdown`
- Reads `show_amount_in_words` — if ON, resolve `totals.amountInWords` via resolver and print
- Reads `show_paid_amount` / `show_change` / `show_remaining` / `show_prev_balance` / `show_new_balance`
- NEW: `buildThermalPayments()` — iterates `data.payments` and prints each payment method + amount
- `buildThermalFooter()` — reads `footer_line1/2/3` and prints them (instead of hardcoded "ERP الجزائر")
- Reads `show_returns_policy` / `returns_policy_text`
- Reads `show_bank_details` / `bank_details_text`
- Reads `show_barcode` — if ON, print GS k barcode (deferred to optional sub-stage 5b)

**Risk**: MEDIUM-HIGH. Totals are financial data. Wrong visibility gating could hide a total line, leading to confusion. However, the totals *values* come from `data.totals` — only visibility is gated. Worst case: a total line is hidden (recoverable — re-print with different template).

**Mitigation**:
- Start by gating the NON-critical totals first (paid, change, remaining, balance)
- Then gate the standard totals (HT, TVA, discount, stamp, TTC) — these are normally always ON
- Add `show_tva_breakdown` last — it's the most complex (multi-line output)

**Verification**: 
1. Default template — all existing totals should still print (none hidden)
2. Toggle `show_total_ht` OFF — HT line disappears but TTC still prints
3. Toggle `show_total_ttc` OFF — TTC disappears (but then the receipt would lack a total — this is user error, not a bug)
4. Toggle `show_paid_amount` ON — paid amount appears
5. Verify footer text reads from `footer_line1/2/3`

---

## 4. Regression Risk Assessment

### 4.1 Worst-case failure modes by stage

| Stage | Worst-case failure | Likelihood | Severity | Recovery |
|-------|--------------------|------------|----------|----------|
| 1 — Section gates | A section is missing entirely | Low (easy to notice) | Medium (missing data) | Re-print with different template or switch to A4 print |
| 2 — Company header | Wrong company name/alignment/font | Medium (formatting bugs) | Low (cosmetic) | No financial data at risk |
| 3 — Document info | Cashier/session info missing | Low | Low (cosmetic) | Re-print |
| 4 — Columns/Items | Column overflow → wrapping → garbled line | Medium (layout bugs) | Medium (readability) | Printer produces garbled line — data is correct, just hard to read |
| 4 — Columns/Items | Wrong price display (HT vs TTC) | Low (if `price_display` read correctly) | High (price shown is wrong) | **This is the highest financial risk in Stage 4** — ensure unit tests verify price_display |
| 5 — Totals | A total line hidden that should be shown | Medium (toggle logic bug) | Medium (missing financial line) | Re-print with default template |
| 5 — Totals | Paid/change/remaining values mislabeled | Low | Low (cosmetic) | Re-print |
| 5 — Payments | Payments section not printing | Low (if gate is wrong) | Medium (missing payment info) | Re-print |

**Worst overall**: **Printable but incorrect price display** (Stage 4). If `price_display` is misread and TTC prices are shown when HT was intended (or vice versa), the receipt would show incorrect prices. This is the only scenario where financial misrepresentation can occur.

**Mitigation**: Unit test `buildReceiptBytesFromTemplate` with known inputs and verify the output buffer contains expected strings. See §4.3 for test strategy.

### 4.2 Real printer vs simulator

**Should this be tested against a real printer?**

- **Stage 1-3**: Can be tested with a unit test snapshots (verify `Uint8Array` output contains expected Arabic text). No real printer needed.
- **Stage 4**: Column layout bugs are hard to catch without visual inspection. A real printer or a ESC/POS emulator (e.g., `escpos-printer-simulator` npm package, or printing to PDF via a virtual printer driver) is recommended before production deployment.
- **Stage 5**: Same as Stage 4 — visual inspection recommended for totals layout.

**Recommendation**:
1. **Unit tests** (Vitest, no printer): Verify `buildReceiptBytes` output contains expected labels/values after each change. Mock `EscPosBuilder.escposBytes()` to capture the buffer.
2. **Integration test** (real printer or print-to-file): One-time full regression test after all 5 stages are complete.
3. **Staged roll-out**: Deploy each stage separately behind a feature flag if possible, or schedule deployment during low-traffic hours.

### 4.3 Existing test coverage

**Current state**: ZERO tests for `buildReceiptBytes`, `buildReceiptBytesFromTemplate`, `printThermalViaWebUSBFromTemplate`, or the `EscPosBuilder` class.

**Files**: 5 test files exist in `resources/js/pages/settings/print-settings/__tests__/` (registry, serializer, visibility, lifecycle) — none test the thermal print path. The POS directory has no `__tests__` folder.

**Recommendation**: Write unit tests BEFORE Stage 1 refactoring. The tests should:

1. **EscPosBuilder test**: Verify initialization produces `ESC @ ESC t 16`, verify `text()` produces expected Win-1256 bytes, verify `qrCode()` produces expected ESC/POS sequence
2. **buildReceiptBytes test (legacy baseline)**: Call `buildReceiptBytes()` with known CartItem/CartTotals/Party input and snapshot the byte output. This creates a regression baseline.
3. **buildReceiptBytesFromTemplate test**: Call with known template + data, verify the byte output contains expected text fragments (e.g., company name, doc number, totals)

After each stage, update the snapshot and verify it changes only in the expected parts.

### 4.4 Can this break an existing working receipt?

If the refactoring preserves the same output for the default template values, then existing receipts will be unchanged. The risk comes from:

- **Default value mismatches**: If Stage 1 section gates default to `false` instead of `true`, sections disappear. **Critical check**: `show_header_section` default is `true` — if the gate reads this correctly, no change.
- **Column width miscalculation**: If `calculateThermalWidths()` produces different widths than the current hardcoded 42-char layout, lines could wrap differently. **Mitigation**: For the default `col_order = ['name', 'quantity', 'price', 'total']` with default `col_widths = {}`, the function should produce widths that sum to 42 and match the approximate current layout.
- **Font size mapping**: The current code uses `setFontSize(2,2)` for company name. If the new code reads `company_name_size = 10` (default) and maps it to 1×1, the company name would appear smaller. **Mitigation**: Ensure `company_name_size` default of 15 maps to 2×2 (same as current).

---

## 5. Scope Boundary

### 5.1 What IS in scope

| File | Change |
|------|--------|
| `resources/js/pos/utils/printService.ts` | Refactor `buildReceiptBytes()` into sub-functions; make all 61 settings template-aware |
| `resources/js/pos/utils/thermalLayout.ts` | NEW — `calculateThermalWidths()` helper |
| Any new test files | Unit tests (Vitest) for `buildReceiptBytes` and `buildReceiptBytesFromTemplate` |

### 5.2 What is NOT in scope (unaffected)

| File | Why |
|------|-----|
| `resources/js/pos/utils/printUtils.ts` | `printReceiptDirect()` only handles browser print (HTML popup). The HTML is already rendered via `renderPreviewToHtml` → `UniversalPreview` which respects ALL template settings. **No change needed.** |
| `resources/js/pages/pos/POSPage.tsx` | Only calls `printThermalViaWebUSBFromTemplate()` which delegates to `buildReceiptBytesFromTemplate()` → `buildReceiptBytes()`. The orchestration in POSPage is unchanged. |
| `resources/js/pages/pos/POSKioskPage.tsx` | Same as POSPage — no orchestration change needed. |
| `resources/js/pages/settings/print-settings/runtime/UniversalPrintPipeline.tsx` | This is the non-thermal HTML pipeline — already correct. No change. |
| `resources/js/pages/settings/print-settings/components/preview/*.tsx` | All visual preview sections — already correct. No change. |
| `resources/js/pages/settings/print-settings/services/PrintFieldResolver.ts` | Already correct. The thermal path will REUSE this, not modify it. |
| `resources/js/pages/settings/print-settings/services/PrintFieldRegistry.ts` | Already correct. No change. |
| `resources/js/pages/settings/print-settings/services/SettingsRegistry.ts` | Already correct. No change. |
| `resources/js/pages/settings/print-settings/types/*.ts` | No type changes needed. The `PrintTemplate` type already covers all settings. |

### 5.3 Verification checklist (post-implementation)

- [ ] `npm run build` passes with 0 errors
- [ ] `npm test` passes (all 133 existing tests + new thermal tests)
- [ ] Default template produces output byte-identical (or visually identical) to current code
- [ ] Toggling `show_header_section` OFF removes the header from thermal output
- [ ] Toggling any `show_*` flag OFF removes the corresponding field
- [ ] Setting `price_display = 'ttc'` shows TTC prices instead of HT
- [ ] Changing `col_order` reorders columns in thermal output
- [ ] `calculateThermalWidths()` with default config produces widths summing to 42 (80mm) or 32 (58mm)
- [ ] Footer text reads from `footer_line1/2/3` instead of hardcoded text
- [ ] Payments section appears when `show_payment_details` is ON

### 5.4 Non-thermal fallback: explicit confirmation

The browser-print fallback path:

```
POSPage:740 → printReceiptDirect(html) → printUtils.ts:18 → openPrintWindow(html)
```

The `html` variable is built at `POSPage:719`:

```ts
const html = renderPreviewToHtml({
  template,
  company: companyData,
  source: { type: 'pos-snapshot', snapshot: snap },
});
```

`renderPreviewToHtml()` renders `UniversalPrintPipeline` → `UniversalPreview` via `ReactDOMServer.renderToStaticMarkup()`. This is the SAME rendering path used by the Print Settings designer preview. It is already fully template-aware. **No changes needed or affected.**

The non-thermal fallback is used when:
- `settings.printMode !== 'thermal'`, OR
- `template.paper_size` is A4/A5, OR
- The thermal print attempt fails (error branch at `POSPage:733-738`)

All three cases produce correctly template-respecting output. Only the primary thermal path (`POSPage:726-728`) is affected by this refactor.

---

## Appendix A: Key files and line references

| File | Key lines | Content |
|------|-----------|---------|
| `printService.ts` | 128-220 | `EscPosBuilder` class — adequate, may need small additions |
| `printService.ts` | 232-238 | `lineRow()` helper — hardcoded 42-char width |
| `printService.ts` | 252-366 | `buildReceiptBytes()` — THE function to refactor |
| `printService.ts` | 581-635 | `buildReceiptBytesFromTemplate()` — currently reduces template to 6 options; needs to pass full template to sub-functions |
| `printService.ts` | 642-693 | `printThermalViaWebUSBFromTemplate()` + `sendBytesToReceiptPrinter()` — no change needed |
| `PrintFieldResolver.ts` | 42-80 | `resolve()` — reuse for all field values |
| `PrintFieldResolver.ts` | 113-123 | `isVisible()` — reuse for visibility gating |
| `PrintFieldResolver.ts` | 125-158 | `getItemColumns()` — reuse for column metadata (but must convert to char-widths) |
| `PrintFieldRegistry.ts` | 36-137 | `PRINT_FIELDS` — all 60+ field definitions with settingKey links |
| `domain.ts` | 29-194 | `PrintTemplate` interface — all 150+ settings |
| `SettingsRegistry.ts` | 48-224 | `SETTINGS_REGISTRY` — all settings with defaults and field links |
| `printUtils.ts` | 13-25 | `printReceiptDirect()` — browser print fallback, NOT in scope |
| `POSPage.tsx` | 719-745 | Print routing — decides thermal vs browser path, NOT in scope |

## Appendix B: Default template values (from domain.ts + SettingsRegistry)

For verifying that the refactored thermal path produces identical output with default settings:

| Setting | Default | Current thermal behavior | Must match after refactor? |
|---------|---------|--------------------------|----------------------------|
| `show_header_section` | `true` | Always shown ✅ | Yes |
| `show_doc_info_section` | `true` | Always shown ✅ | Yes |
| `show_items_section` | `true` | Always shown ✅ | Yes |
| `show_totals_section` | `true` | Always shown ✅ | Yes |
| `show_payments_section` | `true` | Never shown ❌ | **This will CHANGE** — payments will now appear by default |
| `show_footer_section` | `true` | Always shown ✅ | Yes |
| `show_company_name` | `true` | Always shown ✅ | Yes |
| `show_address` | `true` | Always shown ✅ | Yes |
| `show_phone` | `true` | Always shown ✅ | Yes |
| `show_tax_id` | `true` | Always shown ✅ | Yes |
| `show_client` | `true` | Data-gated ✅ | Yes |
| `show_total_ht` | `true` | Always shown ✅ | Yes |
| `show_total_tva` | `true` | Always shown ✅ | Yes |
| `show_discount_total` | `true` | Data-gated ✅ | Yes |
| `show_fiscal_stamp` | `true` | Data-gated ✅ | Yes |
| `show_total_ttc` | `true` | Always shown ✅ | Yes |
| `show_paid_amount` | `true` | Never shown ❌ | **This will CHANGE** — paid amount will now appear |
| `show_change` | `true` | Never shown ❌ | **This will CHANGE** — change will now appear |
| `show_payment_details` | `true` | Never shown ❌ | **This will CHANGE** — payments will now appear |
| `show_thank_you` | `true` | Already correct ✅ | Yes |

**Note**: After the refactor, receipts for the default template may show MORE information than before (payments, paid amount, change). This is the CORRECT behavior — the template says to show these, but the old code ignored them. Communicate this to users so they don't consider it a regression.

# Print Settings — Regression Test Report

**Date:** 2026-06-29  
**Module:** `resources/js/pages/settings/print-settings/`  
**Version:** Post Phase-10 Consolidation (1028 modules, 0 errors)  
**Purpose:** Manual regression verification for every key setting in the Print Settings editor.  

Each test case follows this matrix:

| Setting | Default | Modify | Preview | Save | Reload | Result |
|---------|---------|--------|---------|------|--------|--------|

Run tests in order. Check **Default** column first (set to known state), then **Modify** (change via UI), then **Preview** (verify live preview updates), then **Save/Load** (click save → reload page → verify persistence). Mark each column PASS/FAIL with a brief note.

---

## Test Environment Setup

1. Open Print Settings page (`/settings/print-settings`).
2. Select document type **FV** (فاتورة المبيعات).
3. Select paper size **80mm** (thermal).
4. If no template exists, create a new one from the template library or click "جديد".
5. Ensure the preview section shows a live preview with real data (toggle "بيانات حقيقية" if needed).

---

## 📋 Test Matrix Summary

Results table — fill in as you test:

| # | Setting | Default | Modify | Preview | Save | Reload | Result |
|---|---------|---------|--------|---------|------|--------|--------|
| 1 | `show_logo` | | | | | | |
| 2 | `show_company_name` | | | | | | |
| 3 | `company_name_text` | | | | | | |
| 4 | `company_name_color` | | | | | | |
| 5 | `title_text` | | | | | | |
| 6 | `paper_size` | | | | | | |
| 7 | `paper_width_mm` | | | | | | |
| 8 | `page_orientation` | | | | | | |
| 9 | `col_order` | | | | | | |
| 10 | `col_show` | | | | | | |
| 11 | `col_aligns` | | | | | | |
| 12 | `col_widths` | | | | | | |
| 13 | `show_total_ttc` | | | | | | |
| 14 | `total_ttc_color` | | | | | | |
| 15 | `show_payment_details` | | | | | | |
| 16 | `show_barcode` | | | | | | |
| 17 | `barcode_content` | | | | | | |
| 18 | `show_qr` | | | | | | |
| 19 | `margin_top` | | | | | | |
| 20 | `font_family` | | | | | | |
| 21 | `show_header_section` | | | | | | |
| 22 | `show_footer_section` | | | | | | |
| 23 | `is_default` | | | | | | |
| 24 | `show_doc_number` | | | | | | |
| 25 | `show_client` | | | | | | |
| 26 | `show_bank_details` | | | | | | |
| 27 | `show_fiscal_stamp` | | | | | | |
| 28 | `alternating_rows` | | | | | | |
| 29 | `alternating_color` | | | | | | |
| 30 | `table_header_color` | | | | | | |
| 31 | `thank_you_text` | | | | | | |
| 32 | `show_cashier_signature` | | | | | | |
| 33 | `show_col_header` | | | | | | |
| 34 | `price_display` | | | | | | |
| 35 | `show_charts` | | | | | | |
| 36 | `show_report_header` | | | | | | |
| 37 | `logo_source` | | | | | | |
| 38 | `table_header_bg` | | | | | | |
| 39 | `totals_align` | | | | | | |
| 40 | `show_amount_in_words` | | | | | | |
| 41 | `show_thank_you` | | | | | | |
| 42 | `show_returns_policy` | | | | | | |
| 43 | `doc_separator` | | | | | | |
| 44 | `header_separator` | | | | | | |
| 45 | `show_prev_balance` | | | | | | |
| 46 | `show_stamp` | | | | | | |
| 47 | `rules` | | | | | | |
| 48 | `chart_type` | | | | | | |
| 49 | `line_spacing` | | | | | | |
| 50 | `is_active` | | | | | | |

---

## Test Cases by Category

---

### 🌐 Global

#### 1. Template Name (`name`)
- **Default**: "القالب الافتراضي"
- **Modify**: Click name → edit to "My Template Test"
- **Preview**: Name displayed in template selector chip and editor title bar changes
- **Save/Load**: Save, then reload page → verify name still reads "My Template Test"
- **Expected Result**: Name persists in the template selector list and displays correctly in the title area

#### 2. Default Template (`is_default`)
- **Default**: `true` for first template
- **Modify**: Click star icon (TinyBtn) on a non-default template
- **Preview**: Star icon moves to new default; "افتراضي" pill appears on the new default chip
- **Save/Load**: Save, reload → verify the correct template is marked default
- **Expected Result**: Star badge correctly indicates which template is default; only one template should have the star

#### 3. Active/Inactive (`is_active`)
- **Default**: `true`
- **Modify**: Click eye icon (TinyBtn) on the template chip — toggles to `false`
- **Preview**: Icon changes to `ti-eye-off`; template selector still shows it
- **Save/Load**: Save, reload → icon persists as eye-off
- **Expected Result**: Toggle to inactive does not crash; re-toggle to active restores eye icon

---

### 📄 Paper

#### 4. Paper Size (`paper_size`)
- **Default**: `80mm`
- **Modify**: Click `A4` pill in the paper size row (below name field)
- **Preview**: Preview container changes from narrow thermal (80mm) to wide A4 (210mm); UI controls re-render for page mode; `paper_width_mm` control disappears; `page_orientation` appears
- **Save/Load**: Save, reload → paper size persists as A4
- **Expected Result**: All 4 paper sizes (`80mm`, `58mm`, `A4`, `A5`) correctly change the preview dimensions and toggle paper-specific controls

#### 5. Paper Width Thermal (`paper_width_mm`)
- **Default**: `80` (for 80mm paper)
- **Prerequisite**: Paper size = `80mm` or `58mm`
- **Modify**: Switch between `80mm` and `58mm` paper size pills
- **Preview**: Preview width narrows/widens; paper label updates (e.g., "80mm × تلقائي")
- **Save/Load**: Save, reload → correct width persists per template
- **Expected Result**: 58mm produces a narrower preview than 80mm; `paper_width_mm` pills only visible for thermal sizes

#### 6. Page Orientation (`page_orientation`)
- **Default**: `portrait`
- **Prerequisite**: Paper size = `A4` or `A5`
- **Modify**: Select "أفقي" (landscape) pill
- **Preview**: Preview container swaps width/height for A4→landscape (wider, shorter). _Note: landscape layout logic is currently scaffolding — visual change may be limited._
- **Save/Load**: Save, reload → orientation pill persists
- **Expected Result**: UI pill toggles correctly; landscape orientation stored in state. Known limitation: actual layout swap (w×h) is not fully implemented.

---

### 🎨 Formatting

#### 7. Margin Top (`margin_top`)
- **Default**: `3` mm
- **Modify**: Drag slider to `8` mm
- **Preview**: Content shifts downward; top padding increases in the preview
- **Save/Load**: Save, reload → slider restores to `8`
- **Expected Result**: All 4 margins (`margin_top`, `margin_bottom`, `margin_sides`, `base_font_size`) visibly affect preview spacing

#### 8. Font Family (`font_family`)
- **Default**: `tajawal`
- **Modify**: Select "Courier — أحادي" (monospace) in the Select dropdown
- **Preview**: All document text changes to monospace font in preview
- **Save/Load**: Save, reload → font persists
- **Expected Result**: Switching between `tajawal`, `monospace`, `arial`, `times` changes the font rendering in the live preview

#### 9. Line Spacing (`line_spacing`)
- **Default**: `1.3` ×
- **Modify**: Drag slider to `2.0`
- **Preview**: Line spacing increases (more vertical gap between lines) in preview
- **Save/Load**: Save, reload → line spacing persists
- **Expected Result**: Visible change in spacing between text rows

---

### 🖼️ Header

#### 10. Show Logo (`show_logo`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: Logo image disappears from the top of the preview
- **Save/Load**: Save, reload → logo remains hidden; toggle back ON restores it
- **Expected Result**: Toggling show_logo instantly hides/shows the logo area in all paper sizes; dependent controls (`logo_source`, `logo_size`, `logo_align`, etc.) also show/hide

#### 11. Logo Source (`logo_source`)
- **Default**: `company`
- **Prerequisite**: `show_logo = true`
- **Modify**: Click "افتراضي" (default) → "شعار الشركة" (company) → "شعار مخصص" (custom)
- **Preview**: Preview logo updates based on source (default shows initial letter, company shows company logo from context, custom shows uploaded image)
- **Save/Load**: Save, reload → source selection persists
- **Expected Result**: Each source choice correctly changes the logo rendered in preview

---

### 🏢 Company

#### 12. Show Company Name (`show_company_name`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: Company name text disappears from the header portion of the preview
- **Save/Load**: Save, reload → name still hidden; toggle ON restores it
- **Expected Result**: Toggle controls company name visibility; dependent controls (`company_name_size`, `company_name_bold`, etc.) also show/hide

#### 13. Company Name Color (`company_name_color`)
- **Default**: `#111111` (near-black)
- **Prerequisite**: `show_company_name = true`
- **Modify**: Use color picker to change to `#E53935` (red)
- **Preview**: Company name text color changes to red in preview
- **Save/Load**: Save, reload → color persists as red
- **Expected Result**: All 6 color pickers (company_name_color, title_color, table_header_color, total_ttc_color, thank_you_color, alternating_color) correctly apply their color to the respective element in preview

#### 14. Company Override Fields (`override_address`, `override_phone`, `override_nif`, etc.)
- **Default**: `""` (empty — uses live company data)
- **Modify**: Enter "123 شارع الاستقلال, الجزائر" in override_address field
- **Preview**: Preview shows the override address instead of the company's API address
- **Save/Load**: Save, reload → override text persists
- **Expected Result**: Non-empty override replaces API data; empty field falls back to API company data

---

### 📋 Document

#### 15. Title Text (`title_text`)
- **Default**: `"فاتورة بيع"` (for FV doc type; `"إيصال بيع"` for POS)
- **Modify**: Change to `"فاتورة المبيعات — رسمية"`
- **Preview**: Preview title changes from "فاتورة بيع" to the new text; font size, bold, align, and color also apply
- **Save/Load**: Save, reload → new title persists
- **Expected Result**: title_text updates instantly in the preview header; title_size, title_bold, title_align, title_color all affect the title element

#### 16. Show Document Number (`show_doc_number`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: The document number line disappears from the document info section in preview
- **Save/Load**: Save, reload → doc number remains hidden; toggle ON restores it
- **Expected Result**: All 12 document info toggles (`show_doc_number`, `show_date`, `show_time`, `show_due_date`, `show_cashier`, `show_client`, `show_client_nif`, `show_client_phone`, `show_client_address`, `show_delivery_address`, `show_session`, `show_payment_term`) independently control their field visibility

#### 17. Show Client (`show_client`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: Client name row disappears from the document info section
- **Save/Load**: Save, reload → client remains hidden
- **Expected Result**: When show_client is ON, the client detail toggles (`show_client_nif`, `show_client_phone`, `show_client_address`, `show_delivery_address`) become visible in the editor; when OFF, they are hidden

#### 18. Show Bank Details (`show_bank_details`)
- **Default**: `false`
- **Prerequisite**: Paper size = A4 (bank_details only available for Page + Commercial doc types)
- **Modify**: Toggle ON; enter bank text "CCP: 001 234 567 — BNA"
- **Preview**: Bank details section appears in the document info area of the preview
- **Save/Load**: Save, reload → bank details persist
- **Expected Result**: Only visible for page (A4/A5) paper sizes; hidden for thermal (80mm/58mm); dependent `bank_details_text` textarea shows when ON

---

### 📊 Columns

#### 19. Column Show/Hide (`col_show[name]`)
- **Default**: `name: true`, `quantity: true`, `price: true`, `total: true`; others hidden
- **Modify**: Toggle OFF "الكمية" (quantity) toggle in the column manager
- **Preview**: The quantity column disappears from the items table in preview
- **Save/Load**: Save, reload → quantity column remains hidden; toggle ON restores it
- **Expected Result**: Each of the 10 columns can be independently shown/hidden; hiding a column removes it from the table and the order list

#### 20. Column Drag & Drop Order (`col_order`)
- **Default**: `['name', 'quantity', 'price', 'total']`
- **Modify**: Drag "السعر" (price) above "الكمية" (quantity) using the grab handle (`⠿`)
- **Preview**: Column order in the table preview changes to: name → price → quantity → total
- **Save/Load**: Save, reload → column order persists
- **Expected Result**: DnD reordering works in both the section editor and preview; arrow up/down buttons also work for keyboard reordering

#### 21. Column Alignment (`col_aligns`)
- **Default**: `name: right`, `quantity: center`, `price: center`, `total: center`
- **Modify**: Change name alignment from "يمين" to "وسط"
- **Preview**: Item name text in the table aligns to center instead of right
- **Save/Load**: Save, reload → alignment persists
- **Expected Result**: Alignment buttons (يمين/وسط/يسار) per visible column change text alignment in the preview table

#### 22. Column Widths (`col_widths`)
- **Default**: `name: 40`, `quantity: 15`, `price: 22`, `total: 23`
- **Modify**: Drag the width slider for "البيان" (name) from 40 to 30
- **Preview**: Name column narrows; other columns expand proportionally in A4/A5; thermal respects proportional widths
- **Save/Load**: Save, reload → width persists
- **Expected Result**: Width sliders range from 5% to 60%; changing width is reflected in both thermal and page previews

#### 23. Column Headers (`col_headers`)
- **Default**: `name: 'البيان'`, `quantity: 'الكمية'`, `price: 'السعر'`, `total: 'الإجمالي'`
- **Prerequisite**: `show_col_header = true`
- **Modify**: Change "البيان" header to "وصف المنتج"
- **Preview**: Column header in the table changes to "وصف المنتج"
- **Save/Load**: Save, reload → custom header persists
- **Expected Result**: When show_col_header is ON, each visible column has an editable header input; changes appear in both thermal and page previews

---

### 📝 Items

#### 24. Show Column Headers (`show_col_header`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: The entire header row of the items table disappears (no column labels)
- **Save/Load**: Save, reload → headers remain hidden
- **Expected Result**: Toggle OFF hides the `<th>` row; hides dependent controls (`table_header_bold`, `table_header_bg`, `table_header_color`, col_headers inputs); toggle ON restores everything

#### 25. Table Header Background (`table_header_bg`)
- **Default**: `false`
- **Prerequisite**: `show_col_header = true`
- **Modify**: Toggle ON
- **Preview**: Column header row gains a background color in both thermal and page previews
- **Save/Load**: Save, reload → header background persists
- **Expected Result**: ON adds background (typically dark); OFF removes background; `table_header_color` controls the text/label color

#### 26. Table Header Color (`table_header_color`)
- **Default**: `#333333` (dark gray)
- **Prerequisite**: `show_col_header = true`
- **Modify**: Change to `#1565C0` (blue)
- **Preview**: Header text color changes to blue in thermal and page previews
- **Save/Load**: Save, reload → color persists
- **Expected Result**: Color applies to `<th>` text; previously hardcoded as `#fff` in A4/A5 — verify it now reads the template value

#### 27. Alternating Rows (`alternating_rows`)
- **Default**: `false`
- **Modify**: Toggle ON
- **Preview**: Every even row in the items table gets `alternating_color` background
- **Save/Load**: Save, reload → alternating rows persist
- **Expected Result**: ON applies zebra striping; OFF removes it; `alternating_color` color picker appears when ON

#### 28. Alternating Color (`alternating_color`)
- **Default**: `#f5f5f5` (light gray)
- **Prerequisite**: `alternating_rows = true`
- **Modify**: Change to `#E3F2FD` (light blue)
- **Preview**: Even rows show light blue background instead of gray
- **Save/Load**: Save, reload → color persists
- **Expected Result**: Color applies to even-numbered row backgrounds; previously hardcoded as `#fafafa` in A4/A5 — verify it now reads the template value

#### 29. Price Display Mode (`price_display`)
- **Default**: `ht` (HT — sans tax)
- **Modify**: Click "TTC (بالضريبة)"
- **Preview**: Item prices and column headers switch from "HT" to "TTC"; total line labels may change; the unit prices display including tax
- **Save/Load**: Save, reload → price mode persists
- **Expected Result**: Switching between HT and TTC changes all price display formatting in the items table and totals section

#### 30. Item Font Size (`items_font_size`)
- **Default**: `10` px
- **Modify**: Drag to `13` px
- **Preview**: All item table text (rows and headers) increases in size
- **Save/Load**: Save, reload → font size persists
- **Expected Result**: Items font size changes independently of base_font_size

#### 31. Items Font Family (`items_font_family`)
- **Default**: `tajawal`
- **Modify**: Select "Courier"
- **Preview**: Items table text renders in monospace font while header/footer text stays in Tajawal
- **Save/Load**: Save, reload → font family persists
- **Expected Result**: items font family is independent of the global `font_family`

---

### 💰 Totals

#### 32. Show Total TTC (`show_total_ttc`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: The TTC total line disappears from the totals section
- **Save/Load**: Save, reload → TTC remains hidden
- **Expected Result**: Hides the entire TTC row including related controls (`total_ttc_font_size`, `total_ttc_bold`, `total_ttc_color`, `total_border_style`) in the editor

#### 33. Total TTC Color (`total_ttc_color`)
- **Default**: `#111111`
- **Prerequisite**: `show_total_ttc = true`
- **Modify**: Change to `#C62828` (dark red)
- **Preview**: TTC label and amount text render in dark red (both thermal and page previews)
- **Save/Load**: Save, reload → color persists
- **Expected Result**: Color applies to both the "المجموع TTC" label cell and the amount cell in page and thermal modes; previously missing in A4/A5

#### 34. Show Fiscal Stamp (`show_fiscal_stamp`)
- **Default**: `true`
- **Prerequisite**: Only visible for Commercial document types (FV, BL, DEV, BCC, AA, FA, BR, AV)
- **Modify**: Toggle OFF
- **Preview**: Fiscal stamp line vanishes from the totals section
- **Save/Load**: Save, reload → stamp remains hidden
- **Expected Result**: Only visible in Commercial doc types; hidden for POS and RPT

#### 35. Totals Alignment (`totals_align`)
- **Default**: `right`
- **Modify**: Click "يسار" (left)
- **Preview**: The entire totals block shifts to the left side of the preview
- **Save/Load**: Save, reload → alignment persists
- **Expected Result**: All 3 alignments work in both thermal and page previews; previously hardcoded as always `right`

#### 36. Show Amount In Words (`show_amount_in_words`)
- **Default**: `false`
- **Modify**: Toggle ON
- **Preview**: An Arabic text representation of the total amount appears below the totals (e.g., "مائة وعشرون ألف دينار")
- **Save/Load**: Save, reload → amount in words persists
- **Expected Result**: ON shows the written amount; OFF hides it

#### 37. Show Previous/New Balance (`show_prev_balance`, `show_new_balance`)
- **Default**: `true` for both
- **Modify**: Toggle OFF show_prev_balance
- **Preview**: "الرصيد السابق" line disappears from the totals section
- **Save/Load**: Save, reload → balance visibility persists
- **Expected Result**: Each balance toggle is independent; they appear below the paid/change/remaining section

---

### 💳 Payments

#### 38. Show Payment Details (`show_payment_details`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: The payment methods breakdown section disappears
- **Save/Load**: Save, reload → payment details remain hidden
- **Expected Result**: Controls the entire payment section; when ON, each payment mode and amount is shown; when OFF, the section is hidden; `payment_font_size` slider appears when ON

---

### 🔻 Footer

#### 39. Show Thank You (`show_thank_you`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: "شكراً لزيارتكم!" message disappears from the footer
- **Save/Load**: Save, reload → thank you remains hidden
- **Expected Result**: Hides the thank-you message and dependent controls (`thank_you_text`, `thank_you_size`, `thank_you_color`)

#### 40. Thank You Text (`thank_you_text`)
- **Default**: `"شكراً لزيارتكم!"`
- **Prerequisite**: `show_thank_you = true`
- **Modify**: Change to `"نشكركم على ثقتكم"`
- **Preview**: Footer message changes to the new text
- **Save/Load**: Save, reload → new text persists
- **Expected Result**: Text updates instantly in preview

#### 41. Show Returns Policy (`show_returns_policy`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: "كل الاحتجاجات لا تتعدى 48 ساعة" line disappears from footer
- **Save/Load**: Save, reload → policy remains hidden
- **Expected Result**: Controls the returns policy section; dependent `returns_policy_text` input shows/hides

#### 42. Header Separator (`header_separator`)
- **Default**: `dashed`
- **Modify**: Select "خط متصل" (solid)
- **Preview**: The separator line below the company info changes from dashed to solid line
- **Save/Load**: Save, reload → separator style persists
- **Expected Result**: `solid`, `dashed`, `double`, `none` all produce correct visual styles; `doc_separator` and `footer_separator` work similarly

---

### 📶 Barcode

#### 43. Show Barcode (`show_barcode`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: Barcode image disappears from the preview (usually near the footer)
- **Save/Load**: Save, reload → barcode remains hidden
- **Expected Result**: Toggle instantly shows/hides the barcode SVG/barcode area

#### 44. Barcode Content (`barcode_content`)
- **Default**: `doc-number`
- **Prerequisite**: `show_barcode = true`
- **Modify**: Select "المبلغ الإجمالي" (total)
- **Preview**: Barcode content changes from document number to total amount
- **Save/Load**: Save, reload → content mode persists
- **Expected Result**: Switching between "doc-number", "total", "custom" changes the encoded data; "custom" reveals a text input

---

### 📱 QR

#### 45. Show QR (`show_qr`)
- **Default**: `false`
- **Modify**: Toggle ON
- **Preview**: QR code appears in the preview (typically near the barcode section)
- **Save/Load**: Save, reload → QR remains visible
- **Expected Result**: Toggle controls QR visibility; `qr_content` select appears when ON

---

### ✍️ Signature

#### 46. Show Cashier Signature (`show_cashier_signature`)
- **Default**: `false`
- **Modify**: Toggle ON
- **Preview**: A signature line/label for الكاشير appears near the footer
- **Save/Load**: Save, reload → signature remains visible
- **Expected Result**: Each of the 3 signature/stamp toggles independently controls its visibility; `show_client_signature` and `show_stamp` work identically

---

### 👁️ Section Visibility

#### 47. Show Header Section (`show_header_section`)
- **Default**: `true`
- **Modify**: Toggle OFF in the "إظهار / إخفاء الأقسام" row
- **Preview**: The header section (logo, company name, company info) completely disappears from the preview
- **Save/Load**: Save, reload → header section remains hidden
- **Expected Result**: All 6 section toggles independently hide their entire section block in the preview: header, doc-info, items, totals, payments, footer. The related editor accordion also hides.

#### 48. Show Footer Section (`show_footer_section`)
- **Default**: `true`
- **Modify**: Toggle OFF
- **Preview**: The footer section (custom lines, thank you, returns, barcode, QR, signatures) all disappear
- **Save/Load**: Save, reload → footer remains hidden
- **Expected Result**: Confirms the footer section toggle works independently from other sections

---

### ⚙️ Rules

#### 49. Rules Engine (`rules`)
- **Default**: `[]` (empty)
- **Modify**: Add a rule: condition `show_client == true`, action `hide`, target `show_thank_you`
- **Preview**: When show_client is toggled ON, the thank-you text should hide in preview (conditional rule fires)
- **Save/Load**: Save, reload → rules persist and still apply in preview
- **Expected Result**: Rules are evaluated by `RulesEngine.evaluate()`; rules with `action: 'hide'` remove targeted elements from preview; `highlight` actions apply inline styles

---

### 📈 Charts & 📑 Report

#### 50. Show Charts (`show_charts`)
- **Default**: `true`
- **Prerequisite**: Doc type = `RPT` (report)
- **Modify**: Toggle OFF
- **Preview**: Chart area (bar/pie) disappears from the report preview
- **Save/Load**: Save, reload → chart remains hidden
- **Expected Result**: Only visible for RPT doc type; hidden for all other doc types; `chart_type` and `chart_title` controls show/hide dependent on this toggle

#### 51. Show Report Header (`show_report_header`)
- **Default**: `true`
- **Prerequisite**: Doc type = `RPT`
- **Modify**: Toggle OFF
- **Preview**: The report header text (e.g., "تقرير الجلسة") disappears from top of preview
- **Save/Load**: Save, reload → report header remains hidden
- **Expected Result**: Toggle OFF hides the report header; `report_header_text` input is dependent on this toggle

#### 52. Chart Type (`chart_type`)
- **Default**: `bar` (مخطط أعمدة)
- **Prerequisite**: Doc type = `RPT`, `show_charts = true`
- **Modify**: Switch to "مخطط دائري" (pie)
- **Preview**: Chart switches from bar chart to pie chart in the preview
- **Save/Load**: Save, reload → chart type persists
- **Expected Result**: Bar and pie both render correctly; chart_title appears as heading above the chart

---

## Edge Case Tests

#### E1. New Template Creation
- Click "جديد" — TemplateLibraryModal opens → select a template → install
- Verify: template loads in editor with correct name, paper size, and default settings; preview renders immediately

#### E2. Template Duplicate
- Click copy icon on an existing template
- Verify: new template appears in list with name "نسخة من ..."; all settings match the original

#### E3. Template Delete
- Click trash icon → confirm in DeleteConfirmModal
- Verify: template removed from list; if it was the last template, a blank editor state appears

#### E4. Template Import/Export
- Click export → saves JSON file; click import → select same file
- Verify: all 144 settings are preserved exactly; no runtime errors; preview matches original

#### E5. Undo/Redo
- Modify 3 different settings (e.g., `margin_top`, `font_family`, `show_logo`)
- Press Ctrl+Z three times → settings revert one by one
- Press Ctrl+Y → settings reapply in order
- Verify: history stack depth is 60; undo/redo buttons disabled at boundaries

#### E6. Keyboard Shortcut (Ctrl+S)
- Modify a setting (e.g., `title_text`)
- Press Ctrl+S
- Verify: Save triggers, button shows "جارٍ الحفظ..." then "محفوظ" status with green indicator

#### E7. Paper Size Transition (80mm → A4 → 58mm → A5)
- Cycle through all 4 paper sizes
- Verify: each transition is smooth; preview dimensions change; paper-specific controls appear/disappear correctly (paper_width_mm only for thermal, page_orientation only for page)

#### E8. Empty State
- Navigate to a doc type with no templates (e.g., "تحويل المخزون" BT)
- Verify: "لا توجد قوالب — أنشئ أول قالب بالزر أعلاه" message appears; template selector is empty

#### E9. Real Data vs Mock Data Toggle
- Toggle between "بيانات حقيقية" and "بيانات تجريبية"
- Verify: real data loads the latest document; mock data shows placeholder content; no console errors

#### E10. Test Print
- Click "طباعة تجريبية"
- Verify: new window opens with rendered preview; print dialog appears; window closes after print/cancel

---

## Known Regressions from Previous Fixes (Verify Specifically)

The following issues were fixed in the previous audit and MUST be re-verified:

| # | Issue | How to Verify |
|---|-------|---------------|
| R1 | **colWidth runtime crash** | Switch to A4 paper; ensure items table renders without blank rows or NaN widths |
| R2 | **table_header_color in A4/A5** | Set table_header_color to `#E53935` (red) with bg ON; header should be red in all paper sizes |
| R3 | **alternating_color in A4/A5** | Set alternating_rows ON, alternating_color to `#FFF3E0` (orange); verify even rows show orange in A4 |
| R4 | **total_ttc_color in A4/A5** | Set total_ttc_color to `#2E7D32` (green); verify TTC text is green in thermal and page |
| R5 | **totals_align** | Set to "وسط" (center); verify totals block is center-aligned in 80mm, 58mm, A4, A5 |
| R6 | **Column DnD** | Drag "السعر" column between "البيان" and "الكمية"; verify preview order updates instantly |
| R7 | **Preview lag removed** | Rapidly toggle `show_logo` on/off 5 times; verify each toggle produces an instant preview update (no 200ms delay from useDeferredValue) |
| R8 | **paper_size double history push** | Switch paper_size from 80mm → A4 → A5 → 80mm; press Ctrl+Z 4 times; verify it doesn't skip steps |

---

## Quick Reference — Default Values

| Key | Default | Key | Default |
|-----|---------|-----|---------|
| `margin_top` | 3 | `show_logo` | true |
| `margin_bottom` | 3 | `logo_source` | company |
| `margin_sides` | 3 | `show_company_name` | true |
| `line_spacing` | 1.3 | `company_name_color` | #111111 |
| `base_font_size` | 10 | `title_text` | فاتورة بيع |
| `font_family` | tajawal | `title_color` | #111111 |
| `paper_width_mm` | 80 | `show_doc_number` | true |
| `page_orientation` | portrait | `show_client` | true |
| `price_display` | ht | `table_header_color` | #333333 |
| `show_total_ttc` | true | `alternating_color` | #f5f5f5 |
| `total_ttc_color` | #111111 | `show_barcode` | true |
| `show_bank_details` | false | `show_qr` | false |
| `show_fiscal_stamp` | true | `show_cashier_signature` | false |
| `show_amount_in_words` | false | `show_header_section` | true |
| `show_payment_details` | true | `show_charts` | true |
| `show_thank_you` | true | `chart_type` | bar |
| `thank_you_text` | شكراً لزيارتكم! | `show_report_header` | true |
| `show_returns_policy` | true | `totals_align` | right |
| `returns_policy_text` | كل الاحتجاجات لا تتعدى 48 ساعة | `col_order` | [name,qty,price,total] |
| `items_font_size` | 10 | `col_widths[name]` | 40 |

---

## Pass / Fail Criteria

Each test passes if:
1. **Modify**: UI control responds (click/toggle/drag/slider works without error)
2. **Preview**: The live preview updates correctly within 100ms of the modification
3. **Save**: Save button activates (isDirty=true → isDirty=false); success toast appears
4. **Reload**: Page refresh restores all settings to their saved values
5. **No errors**: Console has no TypeScript/React errors related to the setting

A test **fails** if:
- UI control throws a runtime error
- Preview does not update or shows wrong result
- Save gives error toast or fails silently
- Settings differ after reload
- Undo/redo misbehaves for the setting

---

## Results Log

| Date | Tester | Tests Run | Pass | Fail | Blocked | Notes |
|------|--------|-----------|------|------|---------|-------|
| — | — | — | — | — | — | Fill in during test execution |

---

*End of regression report. 52 test cases across 18 categories + 10 edge cases + 8 regression re-verification checks.*

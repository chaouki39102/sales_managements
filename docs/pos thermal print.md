Thorough Analysis of ESC/POS Thermal Printer Implementation
1. buildReceiptBytesFromTemplate() -- Full Content (lines 474-497)
File: C:\xampp\htdocs\sales_managements\resources\js\pos\utils\printService.ts
474: export function buildReceiptBytesFromTemplate(
475:   template:  PrintTemplate,
476:   data:      UniversalDocumentData,
477:   docNumber?: string,
478: ): Uint8Array {
479:   const b = new EscPosBuilder().init();
480: 
481:   buildThermalHeader(b, data, template);
482:   buildThermalDocInfo(b, docNumber, data, template);
483:   buildThermalItems(b, data, template);
484:   buildThermalTotals(b, data, template);
485:   buildThermalBalance(b, data, template);
486: 
487:   if (template.show_qr && docNumber) {
488:     b.lineFeed();
489:     b.qrCode(docNumber, 4);
490:     b.center(docNumber);
491:   }
492: 
493:   buildThermalFooter(b, data, template);
494: 
495:   b.feedAndCut();
496:   return b.escposBytes();
497: }
The function constructs a receipt byte-by-byte using the EscPosBuilder class (lines 112-204), building each section in sequence:
Section	Function	Lines	Gate
Header	buildThermalHeader()	295-344	show_header_section
Document Info	buildThermalDocInfo()	346-369	show_doc_info_section
Items	buildThermalItems()	371-391	show_items_section
Totals	buildThermalTotals()	393-435	show_totals_section
Balance	buildThermalBalance()	437-454	show_prev_balance / show_new_balance
QR Code	inlined	487-491	show_qr
Footer	buildThermalFooter()	456-467	show_footer_section
2. Thermal Settings from SettingsRegistry (supportedPapers includes '80mm' or '58mm')
The file C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\services\SettingsRegistry.ts defines THERMAL: PaperSize[] = ['80mm', '58mm'] (line 31). Here is a complete list of settings that support thermal paper:
Paper / Formatting (THERMAL-only)
Key	Default	Category	Notes
paper_width_mm	80	paper	select: 58mm or 80mm
Section Visibility (all support THERMAL)
Key	Default	Category
show_header_section	true	section-visibility
show_doc_info_section	true	section-visibility
show_items_section	true	section-visibility
show_totals_section	true	section-visibility
show_payments_section	true	section-visibility
show_footer_section	true	section-visibility
Formatting (the following support ALL_PAPERS, so THERMAL too)
Key	Default	Category
margin_top	3	formatting
margin_bottom	3	formatting
margin_sides	3	formatting
line_spacing	1.3	formatting
base_font_size	10	formatting
font_family	'tajawal'	formatting
Header / Logo
Key	Default	DependsOn
show_logo	true	-
logo_source	'company'	show_logo
logo_size	56	show_logo
logo_align	'center'	show_logo
logo_border_radius	50	show_logo
custom_logo_url	null	show_logo
header_custom_text	''	-
header_separator	'dashed'	-
Company
Key	Default	DependsOn
show_company_name	true	-
company_name_text	''	show_company_name
company_name_size	15	show_company_name
company_name_bold	true	show_company_name
company_name_align	'center'	show_company_name
company_name_color	'#111111'	show_company_name
show_address	true	-
show_phone	true	-
show_tax_id	true	-
show_rc	true	-
show_nis	false	-
show_article	true	-
show_capital	false	-
show_mobile	false	-
show_commercial_name	false	-
show_email	false	-
show_fax	false	-
show_bank_name	false	-
show_rib	false	-
show_activity	false	-
company_info_align	'center'	-
company_info_size	9	-
company_info_bold	false	-
company_info_italic	false	-
company_info_font_family	'tajawal'	-
All label_* settings	various	respective show_*
All override_* settings	''	-
Document
Key	Default	Notes
title_text	'فاتورة بيع'	 
title_size	13	 
title_bold	true	 
title_align	'center'	 
title_color	'#111111'	 
show_doc_number	true	 
show_date	true	 
show_time	true	 
show_due_date	false	 
show_cashier	true	 
show_client	true	 
show_client_nif	false	 
show_client_phone	false	 
show_client_address	false	 
show_delivery_address	false	COMMERCIAL_DOCS only
show_session	false	POS_DOCS only
show_payment_term	false	COMMERCIAL_DOCS only
show_bank_details	false	PAGE only (NOT thermal)
bank_details_text	''	PAGE only
NOTE: show_bank_details and bank_details_text are PAGE only -- they do NOT support thermal papers.
Items / Columns (all support THERMAL)
Key	Default	Category
col_order	['name', 'quantity', 'price', 'total']	columns
col_show	{}	columns
col_widths	{}	columns
col_headers	{}	columns
col_aligns	{}	columns
items_font_size	10	items
items_font_family	'tajawal'	items
show_col_header	true	items
table_header_bold	true	items
table_header_bg	'#f5f5f5'	items
table_header_color	'#333333'	items
table_header_radius	6	items
table_cell_padding	6	items
table_border_style	'dashed'	items
alternating_rows	false	items
alternating_color	'#f5f5f5'	items
price_display	'ht'	items
show_line_total_ttc	false	items
Totals (all support THERMAL)
Key	Default
totals_font_size	10
totals_bold	true
totals_align	'right'
show_total_ht	true
show_total_tva	true
show_tva_breakdown	false
show_discount_total	true
show_fiscal_stamp	true (COMMERCIAL_DOCS only)
show_total_ttc	true
total_ttc_font_size	14
total_ttc_bold	true
total_ttc_color	'#111111'
total_border_style	'double'
show_amount_in_words	false
show_paid_amount	true
show_change	true
show_remaining	false
show_prev_balance	true
show_new_balance	true
Payments (all support THERMAL)
Key	Default
show_payment_details	true
payment_font_size	9
payments_align	'right'
payments_font_family	'tajawal'
Footer (all support THERMAL)
Key	Default
footer_line1	''
footer_line2	''
footer_line3	''
footer_separator	'solid'
footer_align	'center'
footer_text_color	'#111111'
show_thank_you	true
thank_you_text	'شكراً لزيارتكم!'
thank_you_size	11
thank_you_color	'#111111'
show_returns_policy	true
returns_policy_text	'كل الاحتجاجات لا تتعدى 48 ساعة'
footer_legal_text	''
Barcode / QR (all support THERMAL)
Key	Default	DependsOn
show_barcode	true	-
barcode_content	'doc-number'	show_barcode
barcode_custom_text	''	barcode_content (pills, not toggle)
show_qr	false	-
qr_content	'doc-number'	show_qr
Signatures (all support THERMAL)
Key	Default
show_cashier_signature	false
show_client_signature	false
show_stamp	false
3. Current ESC/POS Byte Protocol
ESC Commands Used (EscPosBuilder class, lines 112-204)
Command	ESC/POS Hex	Purpose
ESC @	1B 40	Printer initialization
ESC t 16	1B 74 10	Select codepage Windows-1256 (Arabic)
LF	0A	Line feed
ESC E n	1B 45 n	Bold on/off (n=1/n=0)
ESC a n	1B 61 n	Alignment: 0=left, 1=center, 2=right
GS ! n	1D 21 n	Character size (w,h encoded in nibbles)
GS V NUL	1D 56 00	Full cut
GS ( k	1D 28 6B	QR Code (Model 2, size, EC, store, print)
ESC p	1B 70	Cash drawer kick (pin 2)
Character Encoding (Windows-1256)
The code implements a custom Arabic Windows-1256 encoder (encodeArabic() function, lines 95-108) because Algerian thermal printers commonly use codepage 1256. The mapping table (lines 25-89) converts:
- Basic Arabic letters (ء through ي): Unicode range 0x0621-0x064A mapped to 0xC1-0xED
- Arabic diacritics (064B-0652): mapped to 0xF2-0xF9
- Arabic-Indic digits (0660-0669): mapped to 0xB0-0xB9
- Arabic punctuation (060C-061F): 0xAC, 0xBB, 0xBF
- Lam-Alef ligatures (FEFB-FEFC): mapped to 0xE2
- ASCII characters (codepoint < 0x80): passed through directly
- Unknown characters: replaced with ? (0x3F)
Font Size Mapping (lines 224-237)
Points Range	ESC/POS (w × h) multiplier
≤ 10 pt	1×1
11-15 pt	2×2
16-22 pt	3×3
> 22 pt	4×4
For company info fields (smaller text), a different mapping is used:
Points Range	ESC/POS (w × h)
≤ 10 pt	1×1
11-13 pt	2×1
> 13 pt	2×2
The GS ! n byte encodes width and height: (h-1) * 16 + (w-1).
QR Code (lines 176-201)
Uses the native ESC/POS GS ( k command sequence:
1. Select Model 2: GS ( k 04 00 31 41 32 00
2. Set size: GS ( k 03 00 31 43 <size> (1-8, default 4)
3. Set error correction M: GS ( k 03 00 31 45 32
4. Store data: GS ( k pL pH 31 50 30 <bytes> (UTF-8 encoded)
5. Print: GS ( k 03 00 31 51 30
Thermal Sections vs Visual Preview Sections -- Key Gaps
The current buildThermalItems() (lines 371-391) does NOT use any column configuration from the template -- it hardcodes a simple left-aligned product name + right-aligned total format:
المنتج
  qty x unit_price (-disc%)          total دج
This is a significant gap: the thermal path does not read col_order, col_show, col_widths, col_aligns, or show_col_header, unlike renderThermalItems() in the visual preview (ItemsSection.tsx).
Similarly, buildThermalHeader() does NOT read title_text/title_size/title_bold/title_align (the document title). buildThermalDocInfo hardcodes labels (e.g., 'رقم الفاتورة: ', 'التاريخ: ', 'الزبون: ') instead of using template label overrides.
The payments section (buildThermalPayments) does not exist -- payments are not rendered in thermal output at all.
4. Column Configuration and Rendering in the Items Section
Renderer Architecture (ItemsSection.tsx)
The file C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\components\preview\ItemsSection.tsx provides two render paths selected by renderItems(tpl, data, isThermal) (line 185):
1. renderThermalItems() (lines 56-113) -- used when isThermal === true
2. renderPageItems() (lines 115-183) -- used for A4/A5 page paper
Both use the same column configuration system:
Column Configuration Flow
From shared.tsx (lines 74-88):
- getVisibleCols(tpl) filters tpl.col_order by tpl.col_show[col] !== false
- colWidth(tpl, col, defaults) returns tpl.col_widths[col] ?? defaults[col] ?? COLUMN_DEFAULTS[col].width ?? 20
- colAlign(tpl, col) returns tpl.col_aligns[col] ?? COLUMN_DEFAULTS[col].align ?? 'right'
- colDefaultHeader(col) returns COLUMN_DEFAULTS[col].header ?? col
Column Defaults (COLUMN_DEFAULTS from SettingsRegistry.ts, lines 340-351)
Column Key	Header (Arabic)	Width %	Align
rowNumber	#	8	center
barcode	باركود	14	right
ref	مرجع	12	right
name	البيان	30	right
unit	وحدة	10	center
quantity	الكمية	12	center
price	السعر	14	right
discount	خصم	12	center
tva	TVA	10	center
total	المجموع	16	right
Column Value Resolution (ItemsSection.tsx lines 11-54)
Each column maps to a printFieldResolver.resolveItemField() call via the FIELD_MAP:
Column	Field ID	Data Source
rowNumber	item.index	lineIndex + 1 (computed)
name	item.name	line.name
ref	item.code	line.ref
barcode	item.barcode	line.barcode
unit	item.unit	line.unit
quantity	item.quantity	line.quantity
price	item.price	line.unitPriceHt or line.unitPriceTtc (by price_display)
discount	item.discount	line.discountPct (formatted as N%)
tva	item.tva	line.tvaPct (formatted as N% or معفى)
total	item.total	line.totalHt or line.totalTtc (by show_line_total_ttc)
Thermal Items in Visual Preview vs ESC/POS
The visual renderThermalItems() (ItemsSection.tsx:56-113) renders proper column-based layout with flexbox:
- Uses getVisibleCols(tpl) for column ordering and visibility
- Uses colWidth(tpl, col, COL_WIDTH_DEFAULTS) for proportional widths
- Uses colAlign(tpl, col) for per-column alignment
- Shows column headers when show_col_header is true
- Supports alternating row colors via alternating_rows / alternating_color
- Applies table_border_style for borders
However, buildThermalItems() in printService.ts (lines 371-391) completely bypasses all of this -- it hardcodes a simple 2-field line (product name + qty x price | total). There is no column configuration, no column headers, no per-column alignment, no alternating rows.
5. Existing ESC/POS Related Files and Utilities
Core ESC/POS Files
File	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pos\utils\printService.ts	Main ESC/POS implementation -- EscPosBuilder class, buildReceiptBytesFromTemplate(), printThermalViaWebUSBFromTemplate(), sendBytesToReceiptPrinter(), openCashDrawerViaWebUSB(), auto-print preference helpers
C:\xampp\htdocs\sales_managements\resources\js\pos\utils\__tests__\thermal-print.baseline.spec.ts	408-line baseline test suite -- structural tests, section visibility gates, company info formatting, all passing
Print Runtime / Template Loading
File	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pos\store\printStore.ts	Device layer for printer selection (localStorage) and document print config
C:\xampp\htdocs\sales_managements\resources\js\pos\utils\printUtils.ts	Browser-based printReceiptDirect() -- opens a popup window for non-thermal printing
C:\xampp\htdocs\sales_managements\resources\js\pos\hooks\usePrintSettings.ts	React Query hooks for print settings (printer lists, doc-specific printer selection)
C:\xampp\htdocs\sales_managements\resources\js\pos\hooks\usePOSSettings.ts	POS settings including printMode: 'thermal' | 'browser'
Settings / Registry
File	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\services\SettingsRegistry.ts	144+ settings with supportedPapers gating for thermal vs page
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\services\PrintFieldRegistry.ts	60+ canonical field IDs with metadata, bidirectional lookup with settings
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\services\PrintFieldResolver.ts	The ONLY access layer for resolving field IDs to values; handles overrides, computed fields, repeating items
Data Pipeline (POS Snapshot to Thermal Bytes)
File	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\types\data\UniversalDocumentData.ts	Single data contract consumed by all renderers (thermal, A4, A5, future PDF)
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\types\data\DocumentDataBuilder.ts	Builds UniversalDocumentData from API response (fromApiDocument), POS snapshot (fromPOSSnapshot), or session report
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\runtime\UniversalPrintPipeline.tsx	Orchestrator that routes PipelineSource to the correct DocumentDataBuilder method and renders via UniversalPreview
POS Page Integration
File	Lines	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pages\pos\POSPage.tsx	930-988	handlePrintDirect() -- builds POSSaleSnapshot, checks paper_size for thermal, calls printThermalViaWebUSBFromTemplate() or falls back to printReceiptDirect()
C:\xampp\htdocs\sales_managements\resources\js\pos\components\ProfessionalReceipt.tsx	17-57	Receipt preview modal that renders UniversalPrintPipeline
C:\xampp\htdocs\sales_managements\resources\js\pos\components\POSSettingsModal.tsx	413	Print mode selector: 'thermal' option labeled "حرارية ESC/POS" with WebUSB detection
Renderer Interface (ESCPOSRenderer placeholder)
File	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\renderers\IRenderer.ts	Defines IRenderer<TOutput> interface with outputType, render(), supports(). Comments mention ESCPOSRenderer as a future implementation (line 9: // ← ESCPOSRenderer), but no ESCPOSRenderer class exists yet in the codebase.
Other Related Files
File	Purpose
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\components\preview\ItemsSection.tsx	Dual-path items renderer (thermal visual + page visual)
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\components\preview\shared.tsx	Shared helpers: getVisibleCols(), colWidth(), colAlign(), renderLayoutRows(), data extraction
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\template-library\registry.ts	Template library with 80mm thermal POS receipt template definition
C:\xampp\htdocs\sales_managements\resources\js\pages\settings\print-settings\template-library\categories.ts	'thermal' category defined for template library
Key Architectural Observations
1. The IRenderer interface exists but ESCPOSRenderer has not been implemented. The comment in IRenderer.ts:9 explicitly says // ← ESCPOSRenderer indicating intent, but no class exists. The current buildReceiptBytesFromTemplate() functions outside this interface.
2. Thermal visual preview and ESC/POS byte output are out of sync. The visual renderThermalItems() (ItemsSection.tsx) respects column configuration (col_order, col_widths, col_show, col_aligns, show_col_header, border styles, alternating rows), while buildThermalItems() (printService.ts) hardcodes a completely different layout. This means "what you see in preview" != "what prints on thermal."
3. Payments section is missing from the thermal byte path. While the visual preview renders payments via renderLayoutRows, the ESC/POS buildThermalBytesFromTemplate() never calls a buildThermalPayments() function.
4. The document title (title_text, title_size, etc.) is not rendered in thermal output -- buildThermalDocInfo jumps directly to doc number/date/party.
5. Label overrides are not used in thermal output. buildThermalDocInfo hardcodes Arabic labels for doc number, date, time, and client name rather than respecting label_client, custom label overrides, etc.
6. WebUSB is the only delivery mechanism for ESC/POS. The sendBytesToReceiptPrinter() function sends bytes via navigator.usb.getDevices() -> device.transferOut(). There is no Bluetooth, serial port, or print-to-file fallback.
▣  Explore · Big Pickle · 1m 41s

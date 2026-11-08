# Enterprise Printing System Audit

**Generated**: 2026-06-27  
**Scope**: Full audit of the existing printing system — POS (POSPage, POSKioskPage), A4/A5, thermal 58/80mm, template designer, commercial document print, and all backend/frontend infrastructure.  
**Goal**: Identify every gap, hardcoded value, unused code, missing feature, and architectural issue before building the Report Designer.

---

## 1. Template Property Audit

**Source**: `PrintTemplate` interface in `resources/js/pages/settings/print-settings/types.ts` (177 properties)

| Property | Status | Where Used | Notes |
|----------|--------|------------|-------|
| `id` | ✅ | API, PrintSettingsPage, POS | Backend PK |
| `name` | ✅ | PrintSettingsPage list, export | Editable inline |
| `doc_type_code` | ✅ | PrintSettingsPage, POS, API | Links to document type |
| `paper_size` | ✅ | PreviewSelector, POSPage, CSS | 80mm/58mm/A4/A5/none |
| `is_default` | ✅ | PrintSettingsPage, API | Single default per doc type |
| `is_active` | ✅ | API | Soft-enable/disable |
| `created_at` / `updated_at` | ✅ | API | Timestamps |

**Paper / Layout**
| `paper_width_mm` | ✅ | ReceiptPreview, CSS | Synced from `paper_size` |
| `page_orientation` | ⚠ | PrintSettingsPage (control exists) | **NOT USED** in any preview — A4/A5 always portrait |
| `margin_top` | ✅ | ReceiptPreview | Applied as `paddingTop` in mm |
| `margin_bottom` | ✅ | ReceiptPreview | Applied as `paddingBottom` in mm |
| `margin_sides` | ✅ | ReceiptPreview | Applied as left/right padding in mm |
| `line_spacing` | ✅ | ReceiptPreview, A4Preview, A5Preview | `lineHeight` in preview and print |
| `base_font_size` | ✅ | All preview components | Root font size |
| `font_family` | ⚠ | ReceiptPreview uses it, A4Preview/A5Preview ignore | A4Preview hardcodes `'Tajawal', sans-serif` |

**Logo**
| `show_logo` | ✅ | All 3 previews | Conditional render |
| `logo_size` | ✅ | All 3 previews | `width`/`height` on img/fallback |
| `logo_align` | ✅ | ReceiptPreview flex justifyContent | A4Preview/A5Preview ignore alignment |
| `logo_border_radius` | ⚠ | ReceiptPreview uses it | A4Preview hardcodes `4`, A5Preview hardcodes `4` |

**Company Name**
| `show_company_name` | ✅ | All previews |
| `company_name_text` | ✅ | All previews — fallback chain |
| `company_name_size` | ✅ | All previews |
| `company_name_bold` | ✅ | All previews |
| `company_name_align` | ⚠ | ReceiptPreview uses it | A4Preview/A5Preview ignore alignment |
| `company_name_color` | ✅ | ReceiptPreview | A4Preview/A5Preview hardcode `#111` |

**Company Info**
| `show_address` | ✅ | All previews |
| `show_phone` | ✅ | All previews |
| `show_tax_id` (NIF) | ✅ | All previews |
| `show_rc` | ✅ | All previews |
| `show_nis` | ✅ | ReceiptPreview + A4Preview | A5Preview missing NIS |
| `show_ice` | ⚠ | Only in ReceiptPreview | Missing from A4Preview and A5Preview |
| `show_article` | ⚠ | Only in ReceiptPreview | Missing from A4Preview and A5Preview |
| `company_info_align` | ✅ | ReceiptPreview | A4Preview/A5Preview ignore |
| `company_info_size` | ✅ | All previews |

**Override fields**
| `override_address` | ✅ | All previews fallback chain |
| `override_phone` | ✅ | All previews |
| `override_nif` | ✅ | All previews |
| `override_rc` | ✅ | All previews |
| `override_nis` | ✅ | All previews |
| `override_ice` | ✅ | All previews (fallback chain) |
| `override_article` | ✅ | All previews |

**Header extras**
| `header_custom_text` | ⚠ | ReceiptPreview renders it | A4Preview/A5Preview ignore |
| `header_separator` | ⚠ | ReceiptPreview uses it | A4Preview hardcodes `2px solid #111`, A5Preview hardcodes `1.5px solid #111` |

**Document Title**
| `title_text` | ✅ | All previews |
| `title_size` | ✅ | All previews |
| `title_bold` | ✅ | All previews |
| `title_align` | ⚠ | ReceiptPreview uses it | A4Preview title left-aligned (hardcoded), A5Preview title left-aligned (hardcoded) |
| `title_color` | ✅ | ReceiptPreview | A4Preview/A5Preview hardcode `#111` |

**Document Info toggles**
| `show_doc_number` | ✅ | All previews |
| `show_date` | ✅ | All previews |
| `show_time` | ✅ | ReceiptPreview + A4Preview | A5Preview wraps time into date row |
| `show_due_date` | ⚠ | A4Preview ✓, ReceiptPreview ❌, A5Preview ❌ | Only A4Preview renders it |
| `show_cashier` | ✅ | All previews |
| `show_client` | ✅ | All previews |
| `show_client_nif` | ✅ | All previews |
| `show_client_phone` | ✅ | All previews |
| `show_client_address` | ✅ | All previews |
| `show_delivery_address` | ⚠ | A4Preview ✓, ReceiptPreview ❌, A5Preview ❌ | Only in A4Preview |
| `show_session` | ⚠ | Only in A4Preview | Missing from ReceiptPreview & A5Preview |
| `show_payment_term` | ⚠ | Only in A4Preview | Missing from ReceiptPreview & A5Preview |
| `show_bank_details` | ⚠ | Only in A4Preview | Missing from ReceiptPreview & A5Preview |
| `bank_details_text` | ⚠ | Only in A4Preview | Missing from ReceiptPreview & A5Preview |
| `doc_separator` | ⚠ | ReceiptPreview uses it | A4Preview hardcodes `2px solid #111`, A5Preview hardcodes `1.5px solid #111` |

**Columns**
| `col_order` | ✅ | All previews |
| `col_show` | ✅ | All previews |
| `col_widths` | ✅ | ReceiptPreview + PrintSettingsPage | A4Preview/A5Preview ignore column widths |
| `col_headers` | ✅ | All previews (custom headers) |
| `col_aligns` | ✅ | ReceiptPreview | A4Preview hardcodes L/R per column type |

**Items table**
| `items_font_size` | ✅ | All previews |
| `items_font_family` | ⚠ | ReceiptPreview uses it | A4Preview/A5Preview hardcode `'Tajawal', sans-serif` |
| `show_col_header` | ✅ | All previews |
| `table_header_bold` | ✅ | All previews |
| `table_header_bg` | ✅ | All previews |
| `table_header_color` | ⚠ | ReceiptPreview uses it | A4Preview/A5Preview hardcode `#111` (or white when bg is on) |
| `table_border_style` | ✅ | All previews |
| `alternating_rows` | ✅ | All previews |
| `alternating_color` | ⚠ | ReceiptPreview uses it | A4Preview hardcodes `#fafafa`, A5Preview hardcodes `#fafafa` |
| `price_display` | ⚠ | ReceiptPreview (HT/TTC) | A4Preview/A5Preview always show HT |
| `show_line_total_ttc` | ⚠ | ReceiptPreview | A4Preview/A5Preview ignore |

**Totals**
| `totals_font_size` | ✅ | All previews |
| `totals_bold` | ✅ | All previews |
| `totals_align` | ⚠ | ReceiptPreview uses it | A4Preview/A5Preview always render totals aligned right |
| `show_total_ht` | ✅ | All previews |
| `show_total_tva` | ✅ | All previews |
| `show_tva_breakdown` | ✅ | All previews |
| `show_discount_total` | ✅ | All previews |
| `show_fiscal_stamp` | ✅ | All previews |
| `show_total_ttc` | ✅ | All previews |
| `total_ttc_font_size` | ✅ | All previews |
| `total_ttc_bold` | ✅ | All previews |
| `total_ttc_color` | ⚠ | ReceiptPreview uses it | A4Preview/A5Preview hardcode `#111` |
| `total_border_style` | ✅ | All previews |
| `show_amount_in_words` | ⚠ | ReceiptPreview ✓ (hardcoded text) | A4Preview/A5Preview ❌ |
| `show_paid_amount` | ✅ | All previews |
| `show_change` | ✅ | All previews |
| `show_remaining` | ✅ | All previews |
| `show_prev_balance` | ⚠ | ReceiptPreview + A4Preview | A5Preview ❌ |
| `show_new_balance` | ⚠ | ReceiptPreview + A4Preview | A5Preview ❌ |

**Payment details**
| `show_payment_details` | ✅ | All previews |
| `payment_font_size` | ✅ | All previews |

**Footer**
| `footer_line1` | ✅ | All previews |
| `footer_line2` | ✅ | All previews |
| `footer_line3` | ✅ | All previews |
| `footer_separator` | ⚠ | ReceiptPreview uses it | A4Preview hardcodes `2px solid #111`, A5Preview hardcodes `1.5px solid #111` |
| `show_thank_you` | ✅ | All previews |
| `thank_you_text` | ✅ | All previews |
| `thank_you_size` | ✅ | All previews |
| `thank_you_color` | ⚠ | ReceiptPreview + A5Preview | A4Preview ignores `color` (no color prop) |
| `show_returns_policy` | ✅ | All previews |
| `returns_policy_text` | ✅ | All previews |
| `footer_legal_text` | ✅ | All previews |

**Barcode / QR**
| `show_barcode` | ⚠ | ReceiptPreview ✓ (mock barcode) | A4Preview/A5Preview ❌ |
| `barcode_content` | ⚠ | ReceiptPreview (doc-number/total/custom) | Not used in A4/A5 |
| `barcode_custom_text` | ⚠ | ReceiptPreview | Not used in A4/A5 |
| `show_qr` | ⚠ | ReceiptPreview ✓ (mock QR as SVG) | A4Preview/A5Preview ❌ |
| `qr_content` | ⚠ | ReceiptPreview (UI control exists) | Not used in A4/A5 — QR is mock |

**Signatures & Stamp**
| `show_cashier_signature` | ✅ | All previews |
| `show_client_signature` | ✅ | All previews |
| `show_stamp` | ⚠ | ReceiptPreview ✓, A4Preview ✓, A5Preview ❌ | Missing from A5Preview |

**Totals:**

| Measure | Count |
|---------|-------|
| Total properties | 177 |
| ✅ Fully implemented | ~100 |
| ⚠ Partially implemented | ~77 |
| ❌ Not implemented | 0 |

---

## 2. ReceiptLiveData Audit

**Source**: `TemplateLiveData` in `types.ts` + proxy alias `ReceiptLiveData`

| Field | Source | Built In POSPage | Built In KioskPage | Consumed By Preview | Consumed By Thermal | Missing |
|-------|--------|-----------------|-------------------|---------------------|---------------------|---------|
| `docNumber` | documentsApi response | ✅ | ✅ | All previews | printService | — |
| `docDate` | `new Date().toISOString()` | ✅ | ✅ | All previews | — | — |
| `dueDate` | `snapshot.dueDate` from sale params | ✅ (recently added) | ❌ | A4Preview, ReceiptPreview ❌, A5Preview ❌ | — | ReceiptPreview & A5Preview don't render dueDate |
| `cashierName` | `user?.name` | ✅ | ❌ | All previews | — | Kiosk has no cashier |
| `client.name` | `snapshot.client?.name` | ✅ | ❌ | All previews | printService (receiptOptions) | Kiosk has no client |
| `client.nif` | `(snapshot.client as any).nif` | ✅ | ❌ | All previews | — | Kiosk |
| `client.phone` | `(snapshot.client as any).phone` | ✅ | ❌ | All previews | — | Kiosk |
| `client.address` | `(snapshot.client as any).address` | ✅ | ❌ | All previews | — | Kiosk |
| `items[].name` | CartItem.product_name | ✅ | ✅ | All previews | buildReceiptBytes | — |
| `items[].ref` | CartItem.ref | ✅ | ✅ | All previews | — | — |
| `items[].qty` | CartItem.quantity | ✅ | ✅ | All previews | buildReceiptBytes | — |
| `items[].unit_price_ht` | CartItem.unit_price_ht | ✅ | ✅ | All previews | buildReceiptBytes | — |
| `items[].unit` | CartItem.unit_symbol | ✅ | ✅ | All previews | — | — |
| `items[].tva_rate` | CartItem.tva_rate / 100 | ✅ | ✅ | All previews | — | — |
| `items[].discount_percentage` | CartItem.discount_percentage | ✅ | ✅ | All previews | — | — |
| `items[].total_ht` | CartItem.total_ht | ✅ | ✅ | All previews | — | — |
| `totals.total_ht` | CartTotals.total_ht | ✅ | ✅ | All previews | buildReceiptBytes | — |
| `totals.total_tva` | CartTotals.total_tva | ✅ | ✅ | All previews | buildReceiptBytes | — |
| `totals.total_ttc` | CartTotals.total_ttc | ✅ | ✅ | All previews | buildReceiptBytes | — |
| `totals.fiscal_stamp` | CartTotals.fiscal_stamp | ✅ | ✅ | All previews | — | — |
| `totals.total_discount` | CartTotals.total_discount | ✅ | ✅ | All previews | — | — |
| `totals.paid` | Computed from params.amountPaid + totalTtc | ✅ | (totalTtc) | All previews | — | Kiosk always paid=totalTtc |
| `totals.change` | Computed max(0, paid - totalTtc) | ✅ | 0 | All previews | — | Kiosk always 0 |
| `totals.remaining` | Computed max(0, totalTtc - paid) | ✅ | 0 | All previews | — | Kiosk always 0 |
| `payments[].mode` | paymentModes lookup | ✅ | [] | All previews | — | Kiosk has no payments |
| `payments[].amount` | From snapshot | ✅ | [] | All previews | — | Kiosk has no payments |
| `prevBalance` | partyBalancesApi.getOne() | ✅ (in handleCompleteSale + handlePrintDirect) | ❌ | ReceiptPreview, A4Preview | — | Not in Kiosk, not in A5Preview |
| `newBalance` | Computed prevBalance + remaining | ✅ (calc) | ❌ | ReceiptPreview, A4Preview | — | Not in Kiosk, not in A5Preview |

**Key observation**: `deliveryAddress`, `session`, `paymentTerm` are ALWAYS empty in `ReceiptLiveData` — they have no source in `ReceiptLiveData` interface nor in the POS data. Only `dueDate` was recently added.

---

## 3. Database Field Coverage

### Company (`companies` table)
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `name` | ✅ | Yes — all previews | — |
| `address` | ✅ | Yes — all previews | — |
| `phone` | ✅ | Yes — all previews | — |
| `nif` | ✅ | Yes — all previews | — |
| `rc` | ✅ | Yes — all previews | — |
| `nis` | ✅ | Yes — only ReceiptPreview + A4Preview | A5Preview missing |
| `ice` | ❌ (no `ice` column in backend) | Yes — template override only | Not in `Company` model |
| `article` | ⚠ | ReceiptPreview uses `(activeCompany as any).ai` | Not a proper field — buried in settings_json |
| `avatar` (logo) | ✅ | Yes — all previews | — |
| `email` / `website` | ❌ | Not printed anywhere | Could be useful |
| `logo_border_radius` / `logo_size` | ❌ | Template properties only | Not in DB Company |

### Customer / Supplier (parties table)
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `name` | ✅ | Yes — client block | — |
| `nif` | ✅ | Yes — client block | — |
| `phone` | ✅ | Yes — client block | — |
| `address` | ✅ | Yes — client block | — |
| `email` | ❌ | Not printed | Could be useful for A4 |
| `code` | ❌ | Not printed | Customer code |
| `credit_limit` | ❌ | Not printed | — |
| `category` | ❌ | Not printed | — |
| `balance` | ⚠ | Fetched via partyBalancesApi | Not a DB column — computed |

### Commercial Document (`commercial_documents` table)
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `document_number` | ✅ | Yes — docNumber in liveData | — |
| `total_ht` | ✅ | Yes | — |
| `total_tva` | ✅ | Yes | — |
| `total_ttc` | ✅ | Yes | — |
| `net_to_pay` | ✅ | Yes | Same as total_ttc usually |
| `paid_amount` | ✅ | Yes | — |
| `remaining_amount` | ✅ | Yes | — |
| `legal_mentions` | ✅ | Yes — A4Preview footer_legal_text | — |
| `qr_code_data` | ❌ | Not consumed by any preview | Could feed real QR |
| `due_date` | ⚠ | Now in liveData (recently added) | Only A4Preview renders it |
| `delivery_address` | ❌ | Always empty in previews | Not in liveData |
| `notes` / `note` | ❌ | Not printed | Internal notes |
| `currency_id` | ❌ | Not printed | Currency symbol |
| `warehouse_id` | ❌ | Not printed | — |

### Invoice Details (commercial_document_lines table)
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `product_name` | ✅ | Yes — item.name | — |
| `quantity` | ✅ | Yes | — |
| `unit_price_ht` | ✅ | Yes | — |
| `total_ht` | ✅ | Yes | — |
| `tva_rate` | ✅ | Yes | — |
| `discount_percentage` | ✅ | Yes | — |
| `ref` | ✅ | Yes | — |
| `unit_symbol` | ✅ | Yes | — |
| `product_description` | ❌ | Not printed | Long description |
| `line_number` | ❌ | Not printed | — |
| `batch_number` / `lot` | ❌ | Not printed | — |
| `expiry_date` | ❌ | Not printed | — |

### Payments (`payments` table)
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `amount` | ✅ | Yes — payment details | — |
| `payment_mode_id` | ⚠ | Resolved via lookup table | — |
| `payment_date` | ❌ | Not printed per-payment | — |
| `reference` | ❌ | Not printed | Cheque number, etc. |

### Products
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `name` | ✅ | Yes | — |
| `ref` | ✅ | Yes | — |
| `barcode` | ❌ | Not printed (mock barcode is fake) | Real barcode image |
| `unit_symbol` | ✅ | Yes | — |
| `description` | ❌ | Not printed | — |
| `category` | ❌ | Not printed | — |
| `brand` | ❌ | Not printed | — |

### Document Types
| Field | Printable | Currently Used | Missing |
|-------|-----------|---------------|---------|
| `code` | ✅ | Used in template designer | — |
| `name` | ✅ | doc_type_code in template list | — |
| `name_latin` | ❌ | Not used | — |
| `is_printable` | ❌ | Not used anywhere in frontend | **Unused** — set in DB but never read |
| `print_template` | ❌ | Not used anywhere in frontend | **Unused** — set in DB but never read |

### Settings (`settings` table) — Print-related keys
| Key | Type | Currently Used | Notes |
|-----|------|---------------|-------|
| `print:templates` | JSON object | Yes — POS path | Maps doc+size → template config |
| `print:doc_configs` | Array | Yes — POS path | Per-doc config (enabled, autoPrint, etc.) |
| `print_printers` | Array | Yes — localStorage + DB | Printer list |
| `print_doc_configs` | JSON | Yes | Legacy duplicate |
| `print_tpl_*` (dynamic) | JSON | Redundant | Legacy, not read by POS |
| `invoice_design` | string | Old SettingsPage only | Legacy — "classic" / "modern" |
| `invoice_header_color` | string | Old SettingsPage only | Legacy |
| `invoice_paper_size` | string | Old SettingsPage only | Legacy |
| `invoice_show_logo` | boolean | Old SettingsPage only | Legacy |
| `invoice_show_stamp` | boolean | Old SettingsPage only | Legacy |
| `invoice_show_sign` | boolean | Old SettingsPage only | Legacy |
| `invoice_show_watermark` | boolean | Old SettingsPage only | Legacy |
| `invoice_footer_text` | string | Old SettingsPage only | Legacy |
| `invoice_legal_text` | string | Old SettingsPage only | Legacy |
| `invoice_format` | string | Old SettingsPage only | Legacy |
| `invoice_number_prefix` | string | Old SettingsPage only | Legacy |

---

## 4. Calculated Fields Audit

| Field | Formula | Source | Used In | Verified | Missing |
|-------|---------|--------|---------|----------|---------|
| **total_ht** | Sum of line total_ht | Backend / CartTotals | All previews + thermal | ✅ | — |
| **total_tva** | Sum of line tva | Backend / CartTotals | All previews + thermal | ✅ | — |
| **total_ttc** | total_ht + total_tva + fiscal_stamp | Backend / CartTotals | All previews + thermal | ✅ | — |
| **fiscal_stamp** | Based on threshold rules | CartTotals | All previews | ✅ | — |
| **total_discount** | Sum of line discounts | CartTotals | All previews | ✅ | — |
| **paid** | amountPaid from payment modal | CartTotals (computed) | All previews | ✅ | — |
| **change** | max(0, paid - totalTtc) | POSPage receiptLiveData | All previews | ✅ | — |
| **remaining** | max(0, totalTtc - paid) | POSPage receiptLiveData | All previews | ✅ | — |
| **prevBalance** | max(0, currentBalance - totalTtc + paid) | partyBalancesApi.getOne() | POSPage (both flows) | ✅ | Kiosk not supported |
| **newBalance** | prevBalance + remaining | POSPage computed | ReceiptPreview + A4Preview | ✅ | A5Preview not supported |
| **VAT (TVA)** | base × rate | buildTvaByRate helper | All previews | ⚠ | A4/A5 use tva_rate*100 rounding — may cause precision issues |
| **Amount in words** | Hardcoded Arabic text `'فقط: ستمائة...'` | ReceiptPreview | ReceiptPreview only | ❌ | Always shows same text (655 DZD). **Not computed from actual total.** |
| **P/L / Profit** | No formula | Not implemented | ❌ | ❌ | Critical for report designer |
| **Margin %** | No formula | Not implemented | ❌ | ❌ | Critical for report designer |
| **Invoice age** | today - due_date | Not implemented | ❌ | ❌ | Useful for balance reports |
| **Discount % vs Amount** | discount_percentage used as-is | CartItem | All previews | ⚠ | Shows % but not absolute amount |

---

## 5. Feature Matrix

| Feature | Thermal 58/80mm | A4 Preview | A5 Preview | Commercial Doc Modal | POS Kiosk |
|---------|----------------|------------|------------|---------------------|-----------|
| Company logo | ✅ | ✅ | ✅ | ❌ | ✅ |
| Company name | ✅ | ✅ | ✅ | ❌ | ✅ |
| Company address | ✅ | ✅ | ✅ | ❌ | ✅ |
| Company phone | ✅ | ✅ | ✅ | ❌ | ✅ |
| Company NIF | ✅ | ✅ | ✅ | ❌ | ✅ |
| Company RC | ✅ | ✅ | ✅ | ❌ | ✅ |
| Company NIS | ✅ | ✅ | ❌ | ❌ | ✅ |
| Company ICE | ✅ | ❌ | ❌ | ❌ | ❌ |
| Company Article | ✅ | ❌ | ❌ | ❌ | ❌ |
| Document number | ✅ | ✅ | ✅ | ❌ | ✅ |
| Date | ✅ | ✅ | ✅ | ❌ | ✅ |
| Time | ✅ | ✅ | ✅ (inline) | ❌ | ❌ |
| Due date | ❌ | ✅ | ❌ | ❌ | ❌ |
| Cashier name | ✅ | ✅ | ✅ | ❌ | ❌ |
| Client info | ✅ | ✅ | ✅ | ❌ | ❌ |
| Client NIF | ✅ | ✅ | ✅ | ❌ | ❌ |
| Client phone | ✅ | ✅ | ✅ | ❌ | ❌ |
| Client address | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delivery address | ❌ | ✅ | ❌ | ❌ | ❌ |
| Session | ❌ | ✅ | ❌ | ❌ | ❌ |
| Payment term | ❌ | ✅ | ❌ | ❌ | ❌ |
| Bank details | ❌ | ✅ | ❌ | ❌ | ❌ |
| Custom columns | ✅ | ✅ | ✅ | ❌ | ✅ |
| Column widths | ✅ | ❌ (fixed) | ❌ (fixed) | ❌ | ❌ |
| Header separators | ✅ | ❌ (hardcoded) | ❌ (hardcoded) | ❌ | ❌ |
| Alternating rows | ✅ | ✅ | ✅ | ❌ | ❌ |
| Price HT/TTC toggle | ✅ | ❌ (always HT) | ❌ (always HT) | ❌ | ❌ |
| Line total TTC | ✅ | ❌ | ❌ | ❌ | ❌ |
| Total HT | ✅ | ✅ | ✅ | ❌ | ✅ |
| Total TVA | ✅ | ✅ | ✅ | ❌ | ✅ |
| TVA breakdown | ✅ | ✅ | ✅ | ❌ | ❌ |
| Discount total | ✅ | ✅ | ✅ | ❌ | ❌ |
| Fiscal stamp | ✅ | ✅ | ✅ | ❌ | ✅ |
| Total TTC | ✅ | ✅ | ✅ | ❌ | ✅ |
| Amount in words | ✅ (hardcoded) | ❌ | ❌ | ❌ | ❌ |
| Paid amount | ✅ | ✅ | ✅ | ❌ | ✅ (always total) |
| Change | ✅ | ✅ | ✅ | ❌ | ❌ |
| Remaining | ✅ | ✅ | ✅ | ❌ | ❌ |
| Prev balance | ✅ | ✅ | ❌ | ❌ | ❌ |
| New balance | ✅ | ✅ | ❌ | ❌ | ❌ |
| Payment details | ✅ | ✅ | ✅ | ❌ | ❌ |
| Footer lines (3) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Thank you | ✅ | ✅ | ✅ | ❌ | ❌ |
| Returns policy | ✅ | ✅ | ❌ | ❌ | ❌ |
| Footer legal text | ✅ | ✅ | ✅ | ❌ | ❌ |
| Barcode | ✅ (mock) | ❌ | ❌ | ❌ | ❌ |
| QR code | ✅ (mock) | ❌ | ❌ | ❌ | ❌ |
| Cashier signature | ✅ | ✅ | ✅ | ❌ | ❌ |
| Client signature | ✅ | ✅ | ✅ | ❌ | ❌ |
| Stamp | ✅ | ✅ | ❌ | ❌ | ❌ |
| WebUSB thermal | ✅ | ❌ | ❌ | ❌ | ✅ |
| Browser print | ✅ (fallback) | ✅ | ✅ | ✅ | ✅ |
| Multi-copy | ✅ | ✅ (via printUtils) | ✅ (via printUtils) | ❌ | ❌ |
| Auto-print | ✅ (POSPage) | ✅ (POSPage) | ✅ (POSPage) | ❌ | ✅ (kiosk auto) |
| Real-time preview | ✅ | ✅ | ✅ | ❌ | ✅ |
| Undo/redo | ✅ (designer) | N/A | N/A | ❌ | ❌ |
| Import/export JSON | ✅ | N/A | N/A | ❌ | ❌ |
| Template per doc type | ✅ | ✅ | ✅ | ❌ | ✅ |
| Margins control | ✅ | ✅ | ✅ | ❌ | ✅ |
| Font family selection | ✅ | ❌ (hardcoded) | ❌ (hardcoded) | ❌ | ❌ |
| Print all / Export PDF | ❌ | ❌ | ❌ | ⚠ (window.print) | ❌ |

---

## 6. UI Coverage

For every configurable template property, where is it edited, stored, and rendered?

### PrintSettingsPage (full template designer)
| Property Group | Editable In | Stored In | Rendered In | Ignored By |
|---------------|-------------|-----------|-------------|------------|
| Paper size | PrintSettingsPage top bar | DB + localStorage | All previews | — |
| Template name | PrintSettingsPage (inline) | DB | — | — |
| Logo properties | Section "رأس الفاتورة" | DB | ReceiptPreview | A4Preview (hardcodes 1.5× + radius 4), A5Preview (hardcodes radius 4) |
| Company name | Section "رأس الفاتورة" | DB | ReceiptPreview | A4Preview/A5Preview ignore color + align |
| Company info toggles | Section "رأس الفاتورة" | DB | All previews | A5Preview missing NIS, ICE, Article |
| Override fields | Section "رأس الفاتورة" | DB | All previews | — |
| Header custom text | Section "رأس الفاتورة" | DB | ReceiptPreview | A4Preview, A5Preview |
| Header separator | Section "رأس الفاتورة" | DB | ReceiptPreview | A4Preview, A5Preview (hardcoded) |
| Title properties | Section "معلومات المستند" | DB | All previews | A4Preview hardcodes title color, left-align |
| Doc info toggles | Section "معلومات المستند" | DB | All previews | ReceiptPreview missing: dueDate, deliveryAddress, session, paymentTerm, bankDetails |
| Due date | Section "معلومات المستند" | DB | A4Preview only | ReceiptPreview, A5Preview |
| Delivery address | Section "معلومات المستند" | DB | A4Preview only | ReceiptPreview, A5Preview (also no data source) |
| Session | Section "معلومات المستند" | DB | A4Preview only | ReceiptPreview, A5Preview (also no data source) |
| Payment term | Section "معلومات المستند" | DB | A4Preview only | ReceiptPreview, A5Preview (also no data source) |
| Bank details | Section "معلومات المستند" | DB | A4Preview only | ReceiptPreview, A5Preview |
| Doc separator | Section "معلومات المستند" | DB | ReceiptPreview | A4Preview, A5Preview (hardcoded) |
| Columns (order/width/visibility) | Section "جدول المنتجات" | DB | All previews | A4Preview ignores widths |
| Items font size | Section "جدول المنتجات" | DB | All previews | — |
| Items font family | Section "جدول المنتجات" | DB | ReceiptPreview | A4Preview, A5Preview (hardcoded) |
| Table header props | Section "جدول المنتجات" | DB | All previews | — |
| Border style | Section "جدول المنتجات" | DB | All previews | — |
| Alternating rows | Section "جدول المنتجات" | DB | All previews | A4/A5 ignore alternation_color (hardcoded `#fafafa`) |
| Price display | Section "جدول المنتجات" | DB | ReceiptPreview | A4Preview, A5Preview (always HT) |
| Line total TTC | Section "جدول المنتجات" | DB | ReceiptPreview | A4Preview, A5Preview (always HT) |
| Totals font/bold/align | Section "الإجماليات" | DB | All previews | A4/A5 hardcode align right |
| Total toggles (HT/TVA/TTC) | Section "الإجماليات" | DB | All previews | — |
| TTC style (size/bold/color/border) | Section "الإجماليات" | DB | All previews | A4/A5 ignore TTC color |
| Amount in words | Section "الإجماليات" | DB | ReceiptPreview (hardcoded) | A4Preview, A5Preview |
| Paid/change/remaining/balances | Section "الإجماليات" | DB | All previews | A5 missing prev/new balance |
| Payment details | Section "الإجماليات" | DB | All previews | — |
| Footer lines | Section "التذييل" | DB | All previews | — |
| Thank you | Section "التذييل" | DB | All previews | A4Preview ignores thank_you_color |
| Returns policy | Section "التذييل" | DB | ReceiptPreview, A4Preview | A5Preview |
| Footer legal text | Section "التذييل" | DB | All previews | — |
| Barcode / QR | Section "التذييل" | DB | ReceiptPreview (mock) | A4Preview, A5Preview |
| Signatures & Stamp | Section "التذييل" | DB | All previews | A5 missing stamp |
| Margins | Section "تنسيق الطباعة" | DB | ReceiptPreview (as padding) | A4/A5 ignore margins (hardcoded padding) |
| Line spacing | Section "تنسيق الطباعة" | DB | All previews | — |
| Base font size | Section "تنسيق الطباعة" | DB | All previews | — |
| Base font family | Section "تنسيق الطباعة" | DB | ReceiptPreview | A4/A5 (hardcoded Tajawal) |
| Page orientation | Section "تنسيق الطباعة" | DB | **NONE** | Settings UI does not update orientation in any preview |

### Old SettingsPage.tsx (legacy — lines 2384–2491)
| Property | Editable | Stored In | Currently Used | 
|----------|----------|-----------|----------------|
| `showLogo` | Toggle | settings `invoice_show_logo` | Not used by new system |
| `showStamp` | Toggle | settings `invoice_show_stamp` | Not used by new system |
| `showSign` | Toggle | settings `invoice_show_sign` | Not used by new system |
| `showWatermark` | Toggle | settings `invoice_show_watermark` | Not used by new system |
| `paperSize` | Select (A4/A5/thermal) | settings `invoice_paper_size` | Not used by new system |
| `fontSize` | Select | settings `invoice_font_size` | Not used by new system |
| `headerColor` | Color picker | settings `invoice_header_color` | Not used by new system |
| `footerText` | Text input | settings `invoice_footer_text` | Not used by new system |
| `legalText` | Textarea | settings `invoice_legal_text` | Not used by new system |

---

## 7. CSS Audit

### Hardcoded Styles That Should Be Configurable

| Location | Property | Value | Should Be Configurable? |
|----------|----------|-------|------------------------|
| `ReceiptPreview.tsx` | `background` | `'#fff'` | Medium — paper background color |
| `ReceiptPreview.tsx` | `color` | `'#111'` | Medium — text color |
| `ReceiptPreview.tsx` logo fallback | `background` | `'#111'` | Low |
| `ReceiptPreview.tsx` logo fallback | `color` | `'#fff'` | Low |
| `ReceiptPreview.tsx` .company_info | `color` | `'#444'` | Low |
| `ReceiptPreview.tsx` header_custom_text | `color` | `'#555'` | Low |
| `ReceiptPreview.tsx` footer .returns_policy | `color` | `'#666'` | Low |
| `ReceiptPreview.tsx` footer .legal_text | `color` | `'#999'` | Low |
| `ReceiptPreview.tsx` footer_separator | `borderTop: '1px dashed #999'` | Low |
| `ReceiptPreview.tsx` barcode bars | `background: '#111'`, bar widths (1-2px), heights (22-28px) | Low |
| `ReceiptPreview.tsx` barcode text | `letterSpacing: 2` | Low |
| `ReceiptPreview.tsx` QR | `width: 48, height: 48` | Low — mock only |
| `ReceiptPreview.tsx` Thank you | `fontFamily: "'Tajawal', sans-serif"` | Low |
| `ReceiptPreview.tsx` TTC border | default color `#111` | Low |
| `ReceiptPreview.tsx` Totals | `fontFamily: "'Tajawal', sans-serif"` | Low |
| `A4Preview.tsx` paper | `width: 794`, `minHeight: 1123` | **High** — A4 paper size in pixels |
| `A4Preview.tsx` padding | `'40px 50px'` | **High** — ignores margin_top/bottom/sides |
| `A4Preview.tsx` fontFamily | `'Tajawal', sans-serif` | **High** — ignores font_family |
| `A4Preview.tsx` color | `'#111'` | Low |
| `A4Preview.tsx` header border | `'2px solid #111'` | Medium — should use doc/header separator |
| `A4Preview.tsx` logo size | `tpl.logo_size * 1.5` | Medium — hardcoded multiplier |
| `A4Preview.tsx` company name | `tpl.company_name_size + 4` | Low — deviates from template |
| `A4Preview.tsx` A4InfoRow | `color: '#555'` colors | Low |
| `A4Preview.tsx` AddressBlock | `background: '#f9fafb'`, `border: '1px solid #e2e8f0'` | Low |
| `A4Preview.tsx` items table | `borderBottom: '2px solid #111'` | Medium — hardcoded header border |
| `A4Preview.tsx` A4ItemsTable cell padding | `'8px 10px'` / `'10px'` | Low |
| `A4Preview.tsx` alternating_rows | `background: '#fafafa'` | Medium — ignores alternating_color |
| `A4Preview.tsx` total row | `'3px double #111'` | Medium — hardcoded weight/color |
| `A4Preview.tsx` footer | `'2px solid #111'` | Medium — ignores footer_separator |
| `A4Preview.tsx` signature line | `width: 150, borderTop: '1px solid #111'` | Low |
| `A4Preview.tsx` stamp | `60x60`, `'2px solid #111'`, `borderRadius: '50%'` | Low |
| `A5Preview.tsx` paper | `width: 559`, `minHeight: 794` | **High** — A5 hardcoded |
| `A5Preview.tsx` padding | `'20px 24px'` | **High** — ignores margins |
| `A5Preview.tsx` header border | `'1.5px solid #111'` | Medium |
| `A5Preview.tsx` logo | `borderRadius: 4` | Low |
| `A5Preview.tsx` items borderBottom | `'1.5px solid #111'` | Medium |
| `A5Preview.tsx` total TTC border | `'2px double #111'` | Medium |
| `A5Preview.tsx` footer border | `'1.5px solid #111'` | Medium |
| `A5Preview.tsx` signature line | `width: 80` | Low |

### CSS Values in print-settings.css
| Selector | Hardcoded | Notes |
|----------|-----------|-------|
| `.ps-preview-ruler` | `width: 302px` | For 80mm thermal only |
| `.ps-tpl-cols` | `grid-template-columns: 380px 1fr` | Two-column layout |
| `.ps-preview-paper--a4` | `max-height: 800px` | Scrollable preview |
| `@media print .ps-preview-paper` | `width: 302px !important` | 80mm only |
| `@media print .ps-preview-paper--a4` | `width: 100% !important` | Full width |

---

## 8. Hardcoded Values

### Paper Dimensions
| Value | Location | Purpose |
|-------|----------|---------|
| `302px` (`80mm × 3.78`) | ReceiptPreview, print-settings.css | 80mm paper width in preview |
| `794px` | A4Preview | A4 width (210mm) |
| `1123px` | A4Preview | A4 height (297mm) — minHeight |
| `559px` | A5Preview | A5 width (148mm) |
| `794px` | A5Preview | A5 height (210mm) — minHeight |
| `40px 50px` | A4Preview padding | Ignores margin_top/bottom/sides |
| `20px 24px` | A5Preview padding | Ignores margin_top/bottom/sides |
| `3.78` | ReceiptPreview, PrintSettingsPage CSS | mm-to-px conversion factor |
| `1.5` | A4Preview logo | Logo size multiplier (ignores tpl.logo_size directly) |

### Colors
| Value | Location | Should Be Config? |
|-------|----------|-------------------|
| `#fff` | All previews — background | Medium |
| `#111` | All previews — text color, borders | Medium |
| `#444`, `#555`, `#666`, `#888`, `#999`, `#94a3b8`, `#64748b`, `#475569` | Various text colors | Low |
| `#c00` (red) | All previews — negative amounts | Low |
| `#f0f0f0`, `#f5f5f5`, `#f8fafc`, `#f9fafb`, `#fafafa` | Background colors | Low |
| `#e2e8f0`, `#f1f5f9`, `#eee`, `#ddd` | Border colors | Low |
| `#0a8a5c` | pos.css .rt-grand-row | Hardcoded primary |
| `#1e293b` | pos.css .rh-docnum | Hardcoded dark |
| `#2563eb` (blue), `#7c3aed` (purple) | print-settings.css pill colors | Low |

### Fonts
| Value | Location | Notes |
|-------|----------|-------|
| `'Tajawal', sans-serif` | A4Preview, A5Preview, ReceiptPreview (fallback) | Hardcoded, ignores font_family |
| `'Courier New', monospace` | ReceiptPreview (monospace option) | — |
| `'IBM Plex Mono', monospace` | print-settings.css | Used for counters |
| `'Times New Roman', serif`, `Arial, sans-serif` | ReceiptPreview | Other options |

### Layout Constants
| Value | Location | Purpose |
|-------|----------|---------|
| `60` | PrintSettingsPage history | Max undo stack size |
| `48` | ReceiptPreview barcode | Number of bars |
| `44` | ReceiptPreview stamp | Stamp circle size (thermal) |
| `60` | A4Preview stamp | Stamp circle size (A4) |
| `150`, `80`, `70` | Various | Signature line widths |
| `2px`, `1.5px`, `1px` | Various | Border thicknesses |
| `8px 10px`, `10px`, `5px 6px`, etc. | Various | Cell padding |
| `320`, `260`, `220`, `200` | Totals table widths | In pixels |

---

## 9. Component Audit

### Dependency Graph

```
PrintSettingsPage (1307 lines)
├── PreviewSelector ← barrel index.ts
│   ├── ReceiptPreview (components/ReceiptPreview.tsx, 519 lines)
│   │   └── types (PrintTemplate, CompanyData, TemplateLiveData)
│   ├── A4Preview (A4Preview.tsx, 539 lines)
│   │   └── types (PrintTemplate, CompanyData, ReceiptLiveData)
│   └── A5Preview (A5Preview.tsx, 316 lines)
│       └── types (PrintTemplate, CompanyData, ReceiptLiveData)
├── dbSaveTemplate ← printStore.ts
├── usePrintTemplates, usePrintTemplateMutations ← api/printTemplatesApi.ts
├── useActiveCompany ← appStore
└── TemplateControls (inline, ~250 lines)
    ├── Accordion (inline)
    ├── ColumnManager (inline)
    ├── Toggle (inline) ← DUPLICATE of ToggleSwitch.tsx (never created)
    ├── Slider (inline) ← DUPLICATE of SliderField
    ├── Input, Textarea, Select (inline)
    ├── Pills (inline)
    ├── ColorField (inline)
    └── Field (inline)

POSPage.tsx
├── usePrintSettings ← pos/hooks/usePrintSettings
│   ├── dbFetchTemplates, dbSaveTemplate, etc. ← pos/store/printStore
│   └── usePrintTemplate ← pos/store/printStore
├── useReceiptRenderer ← pos/hooks/useReceiptRenderer
│   └── PreviewSelector ← barrel index.ts
├── printReceiptDirect ← pos/utils/printUtils
├── printThermalViaWebUSB ← pos/utils/printService
│   └── printService.ts (601 lines)
└── ProfessionalReceipt ← pos/components/ProfessionalReceipt
    └── PreviewSelector ← barrel index.ts

POSKioskPage.tsx
├── usePrintSettings ← pos/hooks/usePrintSettings
├── printThermal ← pos/utils/printService
└── ProfessionalReceipt ← pos/components/ProfessionalReceipt

CommercialDocumentModal (1031 lines)
└── DocumentFooter
    └── window.print() — no template integration

Old SettingsPage.tsx (5393 lines)
└── Legacy print section (lines 2384-2491) — separate from new system
```

### Shared Components
- **PreviewSelector** — shared by PrintSettingsPage, ProfessionalReceipt, useReceiptRenderer
- **ProfessionalReceipt** — shared by POSPage and POSKioskPage
- **usePrintSettings** — shared by POSPage and POSKioskPage

### Duplicated Logic
1. **`printThermalViaWebUSB` vs `printThermal`**: Both in printService.ts. `printThermalViaWebUSB` is the detailed path; `printThermal` delegates to `autoPrint()` which tries WebUSB → Blob. These cover similar ground differently.
2. **`buildTvaByRate`**: Exactly the same function exists in both `A4Preview.tsx` (line 79) and `A5Preview.tsx` (line 54). Should be extracted to a shared utility.
3. **`getCompany`**: Almost identical function exists in `A4Preview.tsx` (line 131), `A5Preview.tsx` (line 94), and inline in `ReceiptPreview.tsx` (line 59).
4. **`colLabel`/`colDefaultHeader`/`colValue`**: Similar functions exist across all 3 previews with slightly different implementations.
5. **Balance calculation formula**: `max(0, currentBalance - totalTtc + paid)` duplicated in `handleCompleteSale` and `handlePrintDirect` in POSPage.tsx.
6. **Total row rendering**: `TRow` in ReceiptPreview, `A4TotalRow` in A4Preview, `A5TotalRow` in A5Preview — three implementations of same concept.

### Unused Components
- **The `sections/` directory** referenced in AGENTS.md was **never actually created** — all section controls are inlined in PrintSettingsPage.tsx.

---

## 10. Legacy Audit

### Dead Code
| File | Lines | Reason |
|------|-------|--------|
| `SettingsPage.tsx` print section (~100 lines) | 2384–2491 | Superseded by new PrintSettingsPage — still functional but ignored by new system |
| `settings` keys `invoice_design`, `invoice_header_color`, etc. | ~15 keys | Legacy invoice settings — not read by any component in the new system |

### Deprecated Files
| File | Reason |
|------|--------|
| `app/Http/Controllers/Api/V1/PrintTemplateController.php` | Legacy CRUD for `print_templates` table — POS reads from `settings` table instead |
| `resources/js/pages/settings/print-settings/api/printTemplatesApi.ts` | Legacy API client for above controller — PrintSettingsPage still writes to both |

### Old APIs Still Active
| Route | Purpose | Status |
|-------|---------|--------|
| `/{company}/print-templates` (7 routes) | CRUD for `print_templates` table | Active — PrintSettingsPage writes here |
| `/settings/group/{group}` for `print` | Missing `print` group handling | **Broken** — SettingService guessGroup() has no `print_` prefix |

### Duplicate Storage
| What | Stored In (1) | Stored In (2) | Issue |
|------|---------------|---------------|-------|
| Template config | `print_templates` table (via PrintTemplateController) | `settings` table key `print:templates` (via SettingController) | Both write on save, only settings is read by POS |
| Document config | `print_doc_configs` (settings table) | N/A | Not duplicated but exists alongside `print:doc_configs` (same content) |

### Unused Models
| Model | Fields | Why Unused |
|-------|--------|------------|
| `DocumentType.is_printable` (boolean) | `is_printable` | DB has it, API exposes it, but no frontend code reads it for filtering |
| `DocumentType.print_template` (string) | `print_template` | DB has it, API exposes it, but no frontend code uses it |

### Unused Migrations
All migrations appear active — no orphaned migrations found.

### Unused Routes
All routes appear to be in use (either by frontend or mobile app). No orphaned routes found.

### Unused CSS
| Selector | Reason |
|----------|--------|
| `.receipt-*` classes in pos.css (lines 1791–1836) | **Legacy** — no component uses these class names. The new system uses inline styles in React components. |
| `.rt-grand-row` background `#0a8a5c` | Hardcoded primary color — no component generates this class |

### Dependencies
| Reference | Status |
|-----------|--------|
| `DocumentMailService.php` references `DocumentPrintService::class` | **Missing** — class does not exist in the project (line 53 of DocumentMailService.php) |
| `useSettingsByGroup('print')` in PrintSettingsPage | **Called but result unused** — placeholder for future migration |

---

## 11. Missing Features

### Critical
| # | Feature | Why | Affects |
|---|---------|-----|---------|
| 1 | **Real barcode rendering** | Current barcode is a mock SVG — no real barcode library | All documents |
| 2 | **Real QR code rendering** | Current QR is a mock 10×10 SVG pattern | All documents |
| 3 | **Real amount-in-words** | Currently hardcoded Arabic text always showing "655 DZD" | Thermal receipt |
| 4 | **Page orientation support** | `page_orientation` property exists but never used | A4/A5 landscape |
| 5 | **Margins in A4/A5** | A4Preview and A5Preview ignore `margin_top/bottom/sides` | A4, A5 |
| 6 | **Font family in A4/A5** | A4Preview and A5Preview hardcode Tajawal | A4, A5 |
| 7 | **Company ICE/Article in A4/A5** | Missing NIS, ICE, Article in A4/A5 previews | A4, A5 |
| 8 | **A5 stamp, returns policy, balances** | Missing several toggles | A5 |
| 9 | **ReceiptPreview due date** | Due date toggle exists but thermal preview doesn't render it | 58/80mm |
| 10 | **Commercial document print integration** | CommercialDocumentModal uses plain `window.print()` with no template | All invoices |

### High
| # | Feature | Why |
|---|---------|-----|
| 11 | **Delivery address data source** | A4Preview renders block but always empty (no data in ReceiptLiveData) |
| 12 | **Session / payment term data source** | Same — always empty |
| 13 | **Kiosk balance support** | POSKioskPage has no balance, dueDate, or client support |
| 14 | **Kiosk payment breakdown** | Kiosk always shows `paid = totalTtc`, no partial payments |
| 15 | **Multi-copy in kiosk** | Kiosk auto-print has no copy count |
| 16 | **Print directly to thermal from A4/A5** | Thermal guard exists but no real WebUSB support for A4/A5 (correctly excluded — but UX is confusing) |
| 17 | **Template print button in CommercialDocumentModal** | No way to print invoices with ReceiptTemplate80mm |
| 18 | **SettingService `print` group** | `guessGroup()` doesn't recognize `print_*` prefix → settings fall to 'general' group |
| 19 | **Cache invalidation for print settings** | No `'print'` group in `clearAllCacheForCompany()` |
| 20 | **`is_printable` + `print_template` from DocumentType** | Fields exist but never used to filter/select templates |

### Medium
| # | Feature |
|---|---------|
| 21 | `price_display` (HT/TTC) support in A4/A5 |
| 22 | `show_line_total_ttc` in A4/A5 |
| 23 | `show_session` in ReceiptPreview |
| 24 | `show_payment_term` in ReceiptPreview |
| 25 | `show_bank_details` in ReceiptPreview |
| 26 | `header_custom_text` in A4/A5 |
| 27 | `show_delivery_address` in ReceiptPreview |
| 28 | `logo_align` in A4/A5 |
| 29 | `company_name_align` / `color` in A4/A5 |
| 30 | `company_info_align` in A4/A5 |
| 31 | `table_header_color` in A4/A5 |
| 32 | `alternating_color` (custom) in A4/A5 |
| 33 | `totals_align` in A4/A5 |
| 34 | `total_ttc_color` in A4/A5 |
| 35 | `thank_you_color` in A4Preview |
| 36 | `show_stamp` in A5Preview |
| 37 | `barcode` / `qrcode` in A4/A5 |
| 38 | TVA rate rounding in buildTvaByRate (currently `tva_rate * 100`, may lose precision) |
| 39 | `watermark` (background text) — exists in old SettingsPage but not in new system |
| 40 | Old SettingsPage print section should redirect or be removed |

### Low
| # | Feature |
|---|---------|
| 41 | Email preview / PDF attachment |
| 42 | Batch print (print multiple documents at once) |
| 43 | Print history log |
| 44 | Printer status monitoring |
| 45 | Network printer discovery (only WebUSB + manual) |
| 46 | Per-user print config |
| 47 | Export to PDF (native, not via window.print) |
| 48 | Responsive preview for mobile |
| 49 | Choose paper size per document type in SettingsPage doc config tabs |

---

## 12. Technical Debt

### 1. THREE different print paths with no shared rendering core
**Why**: POSPage uses `useReceiptRenderer` (ReactDOMServer) → thermal or window, Kiosk uses `printThermal()` → ESC/POS or browser print, CommercialDocumentModal uses `window.print()` → browser print.  
**Impact**: Code duplication, inconsistent output, bugs in one path don't get fixed in others.  
**Recommendation**: Unify all print paths through a single `renderDocument()` → `printDocument()` pipeline.

### 2. DUPLICATED fallback chain in every preview component
**Why**: Every preview (ReceiptPreview, A4Preview, A5Preview) has its own `MOCK_COMPANY` + `MOCK` data and fallback logic.  
**Impact**: When mock data changes, it must be updated in 3+ places.  
**Recommendation**: Extract mocks to a shared file, extract `getCompany()`, `buildData()`, `buildTvaByRate()` to shared utilities.

### 3. DUPLICATED balance fetch in POSPage
**Why**: Both `handleCompleteSale` and `handlePrintDirect` call `partyBalancesApi.getOne()` with the same formula.  
**Impact**: Unnecessary API call — already computed in handleCompleteSale but not passed through.  
**Recommendation**: Pass prevBalance via lastPaymentRef or receiptSnapshot instead of re-fetching.

### 4. TWO storage backends for templates
**Why**: PrintSettingsPage writes to both `print_templates` table (legacy) and `settings` table (current). POS reads only from `settings`.  
**Impact**: If `dbSaveTemplate` fails, templates are out of sync. Two sources of truth.  
**Recommendation**: Deprecate `print_templates` table. Read and write only through `settings`.

### 5. ALL template controls are inlined in PrintSettingsPage.tsx
**Why**: 1307-line component with no section components — all controls defined inline.  
**Impact**: Impossible to test, hard to maintain, no reuse.  
**Recommendation**: Extract section components to `sections/` directory as originally planned.

### 6. Hardcoded styles in THREE places per preview
**Why**: Every preview component hardcodes paper dimensions, colors, borders, padding — ignoring many template properties.  
**Impact**: Template designer settings are silently ignored for A4/A5.  
**Recommendation**: Create a shared style resolver that converts `PrintTemplate` → CSS object, used by all previews.

### 7. Dependency on ReactDOMServer for print
**Why**: `useReceiptRenderer` uses `React.createElement` + `ReactDOMServer.renderToStaticMarkup` to build print HTML.  
**Impact**: Only works in browser — can't generate server-side PDFs.  
**Recommendation**: For PDF export, use a proper PDF library (jsPDF, Puppeteer, or Laravel DomPDF).

### 8. Missing `print` group in SettingService
**Why**: `guessGroup()` doesn't recognize `print_*` or `print:*` prefixes.  
**Impact**: All print settings fall into 'general' group — cache is never invalidated independently.  
**Recommendation**: Add `'print'` group mapping to `guessGroup()` and `clearAllCacheForCompany()`.

### 9. Template designer UI is NOT reusable
**Why**: All Accordion, Toggle, Slider, Input, Select, Pills, ColorField are inlined in PrintSettingsPage.tsx.  
**Impact**: No reuse possible for future A4/A5 template variations.  
**Recommendation**: Extract to a shared UI kit.

### 10. Mock barcode and QR code
**Why**: Barcode renders 48 hardcoded bars. QR renders a 10×10 hardcoded SVG pattern.  
**Impact**: Not real data — customers scanning these will get garbage.  
**Recommendation**: Integrate a barcode/QR library (e.g., `bwip-js`, `qrcode.js`).

---

## 13. Reusability Audit

### Reusable Components (existing)
| Component | Location | Current Reuse | Notes |
|-----------|----------|---------------|-------|
| `PreviewSelector` | `print-settings/components/PreviewSelector.tsx` | PrintSettingsPage, ProfessionalReceipt, useReceiptRenderer | ✅ Already shared |
| `ProfessionalReceipt` | `pos/components/ProfessionalReceipt.tsx` | POSPage, POSKioskPage | ✅ Already shared |
| `ReceiptPreview` | `print-settings/components/ReceiptPreview.tsx` | Via PreviewSelector | ✅ Already shared |
| `A4Preview` | `print-settings/A4Preview.tsx` | Via PreviewSelector | ✅ Already shared |
| `A5Preview` | `print-settings/A5Preview.tsx` | Via PreviewSelector | ✅ Already shared |

### Reusable Hooks (existing)
| Hook | Location | Current Reuse | Notes |
|------|----------|---------------|-------|
| `usePrintSettings` | `pos/hooks/usePrintSettings.ts` | POSPage, POSKioskPage | ✅ Already shared |
| `useReceiptRenderer` | `pos/hooks/useReceiptRenderer.ts` | POSPage only | Could be used by CommercialDocumentModal |
| `usePrintTemplates` `usePrintTemplateMutations` | `print-settings/api/printTemplatesApi.ts` | PrintSettingsPage only | Not used by POS |

### Reusable Services/Utils (existing)
| Utility | Location | Notes |
|---------|----------|-------|
| `printStore.ts` functions | `pos/store/printStore.ts` | Could be shared with CommercialDocumentModal |
| `printReceiptDirect` | `pos/utils/printUtils.ts` | Functional but limited |
| `printThermalViaWebUSB` | `pos/utils/printService.ts` | Thermal-only, not for A4/A5 |
| `buildReceiptBytes` | `pos/utils/printService.ts` | ESC/POS — not reusable for A4/A5 |

### Should Be Extracted
| Code | Where | Why |
|------|-------|-----|
| `buildTvaByRate()` | A4Preview + A5Preview | Duplicated |
| `getCompany()` | A4Preview + A5Preview + ReceiptPreview | Triplicated |
| `buildData()` | A4Preview + A5Preview | Very similar, could be unified |
| `MOCK_COMPANY` | A4Preview + A5Preview + ReceiptPreview | 3 copies of same data |
| `MOCK` data | A4Preview + A5Preview + ReceiptPreview | 3 copies |
| `colLabel()` / `colValue()` | All 3 previews | Similar but not identical |
| Row components (`TRow`, `A4TotalRow`, `A5TotalRow`) | All 3 previews | Duplicated |
| `borderMap` | All 3 previews | Triplicated |
| `align()` helper | All 3 previews | Triplicated |
| `PAPER_WIDTH_MAP` | usePrintSettings + PrintSettingsPage | Duplicated |

### Type Reuse
| Type | Exported From | Imports Count |
|------|---------------|--------------|
| `PrintTemplate` | `types.ts` | 10+ imports across files |
| `ReceiptLiveData` / `TemplateLiveData` | `types.ts` | 6+ imports |
| `CompanyData` / `CompanyPreviewData` | `types.ts` | 6+ imports |
| `DetectedPrinter` | `types.ts` | 3 imports |
| `DocumentPrintConfig` | `types.ts` | 3 imports |

---

## 14. Completeness Report

### Template Properties
| Category | Total | Used Everywhere | Partial | Unused |
|----------|-------|----------------|---------|--------|
| Paper/Layout | 7 | 5 | 2 (`page_orientation`, `font_family` in A4/A5) | 0 |
| Logo | 4 | 2 | 2 (`logo_align` in A4/A5, `border_radius` in A4/A5) | 0 |
| Company Name | 5 | 2 | 3 (align, color in A4/A5) | 0 |
| Company Info | 18 | 10 | 6 (ICE/Article in A4/A5, NIS in A5) | 0 |
| Override fields | 7 | 7 | 0 | 0 |
| Header extras | 2 | 0 | 2 | 0 |
| Document Title | 5 | 2 | 3 (color, align in A4/A5) | 0 |
| Doc Info toggles | 18 | 6 | 10 (dueDate, session, paymentTerm, bankDetails, deliveryAddress) | 0 |
| Columns | 5 | 2 | 3 (widths in A4/A5, aligns in A4/A5, headers in A4/A5) | 0 |
| Items table | 13 | 7 | 6 (font_family, border color/weight, header color, alternating color, price_display, line_total_ttc) | 0 |
| Totals | 20 | 12 | 6 (align in A4/A5, ttc_color, amount_in_words in A4/A5, prev/new balance in A5) | 0 |
| Payment details | 2 | 2 | 0 | 0 |
| Footer | 10 | 6 | 4 (separator in A4/A5, barcode in A4/A5, QR in A4/A5, stamp in A5) | 0 |
| Signatures | 3 | 2 | 1 (stamp in A5) | 0 |
| **Total** | **119 (+58 meta)** | **~65** | **~54** | **0** |

### ReceiptLiveData
| Field | Source | POS | Kiosk | Thermal | A4 | A5 |
|-------|--------|-----|-------|---------|----|----|
| docNumber | API response | ✅ | ✅ | ✅ | ✅ | ✅ |
| docDate | `new Date()` | ✅ | ✅ | ✅ | ✅ | ✅ |
| dueDate | Sale params | ✅ | ❌ | ❌ | ✅ | ❌ |
| cashierName | User store | ✅ | ❌ | ✅ | ✅ | ✅ |
| client.* | Party | ✅ | ❌ | ✅ | ✅ | ✅ |
| items[].* | Cart | ✅ | ✅ | ✅ | ✅ | ✅ |
| totals.* | CartTotals | ✅ | ✅ | ✅ | ✅ | ✅ |
| payments[] | Payment modal | ✅ | ❌ | ✅ | ✅ | ✅ |
| prevBalance | partyBalancesApi | ✅ | ❌ | ✅ | ✅ | ❌ |
| newBalance | Computed | ✅ | ❌ | ✅ | ✅ | ❌ |

### Database Coverage
| Table | Fields | Printable | Currently Used | Missing |
|-------|--------|-----------|---------------|--------|
| companies | ~15 | ~7 | 7 | 8 (email, website, ice, etc.) |
| parties (clients) | ~12 | ~4 | 4 | 8 (email, code, credit_limit, etc.) |
| commercial_documents | ~25 | ~10 | 9 | 15 (currency, warehouse, notes, etc.) |
| commercial_document_lines | ~14 | ~8 | 8 | 6 (line_number, batch, expiry, etc.) |
| payments | ~8 | ~2 | 2 | 6 (payment_date, reference, etc.) |
| products | ~20 | ~4 | 4 | 16 (barcode image, description, etc.) |
| document_types | ~10 | ~2 | 0 | 0 — both unused |
| settings (print keys) | ~25 | ~20 | ~5 | 15 legacy keys unused |

### Calculated Fields
| Field | Status | Notes |
|-------|--------|-------|
| total_ht | ✅ | — |
| total_tva | ✅ | — |
| total_ttc | ✅ | — |
| fiscal_stamp | ✅ | — |
| total_discount | ✅ | — |
| paid | ✅ | — |
| change | ✅ | — |
| remaining | ✅ | — |
| prevBalance | ✅ | Double-fetched |
| newBalance | ✅ | — |
| TVA breakdown | ⚠ | Precision issue with tva_rate*100 |
| Amount in words | ❌ | Hardcoded mock |
| Profit / Margin | ❌ | Not implemented |

### CSS Hardcoded Values
| Category | Count | Critical | Should Be Configurable |
|----------|-------|----------|----------------------|
| Paper dimensions | 7 | 2 (A4/A5 padding) | 3 |
| Colors | ~30 | 0 | ~5 |
| Fonts | ~5 | 1 (font_family) | 1 |
| Layout constants | ~40 | 0 | ~3 |
| Border widths | ~15 | 0 | ~5 |
| Spacing/padding | ~30 | 2 (A4/A5 margins) | 3 |

---

## 15. Final Recommendations

### Architecture Roadmap

#### Phase 1 — Foundation (Critical fixes, no breaking changes)
1. **Unify fallback data**: Extract `MOCK_COMPANY` + mock data to a shared file
2. **Extract shared functions**: `buildTvaByRate`, `getCompany`, `borderMap`, `align` to a shared utility
3. **Fix A4/A5 margins**: Use template `margin_top/bottom/sides` instead of hardcoded padding
4. **Fix A4/A5 font_family**: Use `tpl.font_family` instead of hardcoded Tajawal
5. **Add missing toggles to A4/A5**: ICE, Article, NIS for A5, stamp for A5, etc.
6. **Extract PreviewSelector's buildData**: Create a unified `dataFromTemplate(tpl, liveData)` function
7. **Pass prevBalance through lastPaymentRef**: Remove duplicate API call in handlePrintDirect

#### Phase 2 — Template Designer Extension (Medium, backward-compatible)
8. **Extract inline controls to `sections/` directory**: HeaderSection, DocumentSection, ItemsSection, TotalsSection, FooterSection, FormattingSection
9. **Extract UI primitives**: Toggle, Slider, Input, Select, Pills, ColorField, Accordion to shared kit
10. **Add real barcode** via `bwip-js` or similar
11. **Add real QR code** via `qrcode.js`
12. **Add real amount-in-words** — convert number to Arabic text
13. **Support `page_orientation`** in A4Preview/A5Preview (add landscape layout)

#### Phase 3 — Data Completeness (High value)
14. **Extend `ReceiptLiveData`**: Add `deliveryAddress`, `session`, `paymentTerm` (with API/source support)
15. **Integrate `CommercialDocumentModal`** with the print template system
16. **Support `is_printable` + `print_template`** from DocumentType for template auto-selection
17. **Add print button** to commercial document detail/view pages

#### Phase 4 — Cleanup & Hardening (Architecture)
18. **Deprecate `print_templates` table**: Read/write only through `settings` table
19. **Remove legacy `printTemplatesApi.ts`** if `print_templates` table is fully deprecated
20. **Remove old SettingsPage.tsx print section**: Redirect to `/settings/print`
21. **Add `'print'` group** to SettingService guessGroup() and cache clearing
22. **Remove unused CSS**: `.receipt-*` classes, `.rt-grand-row`, etc.
23. **Remove unused DB columns**: `DocumentType.is_printable`, `DocumentType.print_template` (or keep for future use)

#### Phase 5 — Report Designer (The goal)
24. **Design a unified `ReportDefinition` type** that extends the PrintTemplate concept with:
    - Nested sections (header, detail, summary, footer)
    - Conditional display rules
    - Grouping/sorting
    - Aggregation (sum, count, avg, min, max)
    - Charts/mini-graphs
    - Dynamic text with field interpolation
    - Sub-reports
25. **Create a shared render engine** that converts `ReportDefinition` + data → HTML
26. **Support multiple output formats**: HTML, PDF, ESC/POS, CSV
27. **Build a visual report designer** UI with drag-and-drop sections
28. **Support pagination**: Page header/footer, page numbers, running totals
29. **Extend `ReportDefinition`** to support calculated fields with formulas
30. **Support multi-company, multi-language, multi-currency** reports

### Reuse Strategy
| Current System | Reuse in Report Designer | Approach |
|---------------|-------------------------|----------|
| `PreviewSelector` | ✅ Component chooser | Wrap as report renderer |
| `ReceiptPreview` | ✅ Thermal template | Use as-is with ReportDefinition adapter |
| `A4Preview` | ✅ A4 template | Refactor to use ReportDefinition |
| `A5Preview` | ✅ A5 template | Refactor to use ReportDefinition |
| `PrintTemplate` type | ⚠ Base type | Extend for ReportDefinition |
| `usePrintSettings` | ✅ Config hook | Reuse for template selection |
| `printStore.ts` | ✅ Storage | Reuse for settings persistence |
| `printUtils.ts` | ✅ Print window | Reuse for browser print |
| `printService.ts` | ✅ Thermal print | Reuse for ESC/POS output |
| Column configuration system | ✅ Reuse | Already works for all previews |
| Toggle/Slider/Accordion UI | ⚠ Extract first | Make shared UI kit |

---

*This audit was performed on 2026-06-27. File paths and line numbers refer to the codebase at that time.*

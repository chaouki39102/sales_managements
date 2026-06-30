# Print Settings — Paper × Document Compatibility Matrix

Generated from `SettingsRegistry.ts` — every setting declares `supportedPapers` and `supportedDocs` arrays that gate its visibility in the UI.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Compatible / visible |
| ❌ | Hidden / incompatible |

### Paper Sizes

| Code | Description |
|------|-------------|
| `58mm` | Thermal roll 58 mm |
| `80mm` | Thermal roll 80 mm |
| `A4` | A4 sheet (210 × 297 mm) |
| `A5` | A5 sheet (148 × 210 mm) |

### Document Types

| Code | Name | Category |
|------|------|----------|
| `FV` | فاتورة المبيعات (Sales Invoice) | Sales |
| `BL` | وصل التسليم (Delivery Note) | Sales |
| `DEV` | عرض السعر (Quote) | Sales |
| `BCC` | طلب العميل (Customer Order) | Sales |
| `AA` | مرتجع المبيعات (Sales Return) | Sales |
| `FA` | فاتورة الشراء (Purchase Invoice) | Purchase |
| `BR` | وصل الاستلام (Receiving Note) | Purchase |
| `AV` | أمر الشراء (Purchase Order) | Purchase |
| `DDP` | إذن التسليم (Delivery Order) | Warehouse |
| `BT` | تحويل المخزون (Stock Transfer) | Warehouse |
| `POS` | إيصال POS (POS Receipt) | POS |
| `RPT` | تقرير الجلسة (Session Report) | POS |

---

## 1. Paper Compatibility Matrix

### ▸ Global

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `id` | ✅ | ✅ | ✅ | ✅ |
| `name` | ✅ | ✅ | ✅ | ✅ |
| `doc_type_code` | ✅ | ✅ | ✅ | ✅ |
| `is_default` | ✅ | ✅ | ✅ | ✅ |
| `is_active` | ✅ | ✅ | ✅ | ✅ |

### ▸ Paper

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `paper_size` | ✅ | ✅ | ✅ | ✅ |
| `paper_width_mm` | ✅ | ✅ | ❌ | ❌ |
| `page_orientation` | ❌ | ❌ | ✅ | ✅ |

### ▸ Header / Logo

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_logo` | ✅ | ✅ | ✅ | ✅ |
| `logo_source` | ✅ | ✅ | ✅ | ✅ |
| `logo_size` | ✅ | ✅ | ✅ | ✅ |
| `logo_align` | ✅ | ✅ | ✅ | ✅ |
| `logo_border_radius` | ✅ | ✅ | ✅ | ✅ |
| `custom_logo_url` | ✅ | ✅ | ✅ | ✅ |
| `header_custom_text` | ✅ | ✅ | ✅ | ✅ |
| `header_separator` | ✅ | ✅ | ✅ | ✅ |

### ▸ Company Info

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_company_name` | ✅ | ✅ | ✅ | ✅ |
| `company_name_text` | ✅ | ✅ | ✅ | ✅ |
| `company_name_size` | ✅ | ✅ | ✅ | ✅ |
| `company_name_bold` | ✅ | ✅ | ✅ | ✅ |
| `company_name_align` | ✅ | ✅ | ✅ | ✅ |
| `company_name_color` | ✅ | ✅ | ✅ | ✅ |
| `show_address` | ✅ | ✅ | ✅ | ✅ |
| `show_phone` | ✅ | ✅ | ✅ | ✅ |
| `show_tax_id` | ✅ | ✅ | ✅ | ✅ |
| `show_rc` | ✅ | ✅ | ✅ | ✅ |
| `show_nis` | ✅ | ✅ | ✅ | ✅ |
| `show_ice` | ✅ | ✅ | ✅ | ✅ |
| `show_article` | ✅ | ✅ | ✅ | ✅ |
| `company_info_align` | ✅ | ✅ | ✅ | ✅ |
| `company_info_size` | ✅ | ✅ | ✅ | ✅ |
| `override_address` | ✅ | ✅ | ✅ | ✅ |
| `override_phone` | ✅ | ✅ | ✅ | ✅ |
| `override_nif` | ✅ | ✅ | ✅ | ✅ |
| `override_rc` | ✅ | ✅ | ✅ | ✅ |
| `override_nis` | ✅ | ✅ | ✅ | ✅ |
| `override_ice` | ✅ | ✅ | ✅ | ✅ |
| `override_article` | ✅ | ✅ | ✅ | ✅ |

### ▸ Document

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `title_text` | ✅ | ✅ | ✅ | ✅ |
| `title_size` | ✅ | ✅ | ✅ | ✅ |
| `title_bold` | ✅ | ✅ | ✅ | ✅ |
| `title_align` | ✅ | ✅ | ✅ | ✅ |
| `title_color` | ✅ | ✅ | ✅ | ✅ |
| `show_doc_number` | ✅ | ✅ | ✅ | ✅ |
| `show_date` | ✅ | ✅ | ✅ | ✅ |
| `show_time` | ✅ | ✅ | ✅ | ✅ |
| `show_due_date` | ✅ | ✅ | ✅ | ✅ |
| `show_cashier` | ✅ | ✅ | ✅ | ✅ |
| `show_client` | ✅ | ✅ | ✅ | ✅ |
| `show_client_nif` | ✅ | ✅ | ✅ | ✅ |
| `show_client_phone` | ✅ | ✅ | ✅ | ✅ |
| `show_client_address` | ✅ | ✅ | ✅ | ✅ |
| `show_delivery_address` | ✅ | ✅ | ✅ | ✅ |
| `show_session` | ✅ | ✅ | ✅ | ✅ |
| `show_payment_term` | ✅ | ✅ | ✅ | ✅ |
| `show_bank_details` | ❌ | ❌ | ✅ | ✅ |
| `bank_details_text` | ❌ | ❌ | ✅ | ✅ |
| `doc_separator` | ✅ | ✅ | ✅ | ✅ |

### ▸ Columns

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `col_order` | ✅ | ✅ | ✅ | ✅ |
| `col_show` | ✅ | ✅ | ✅ | ✅ |
| `col_widths` | ✅ | ✅ | ✅ | ✅ |
| `col_headers` | ✅ | ✅ | ✅ | ✅ |
| `col_aligns` | ✅ | ✅ | ✅ | ✅ |

### ▸ Items / Table

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `items_font_size` | ✅ | ✅ | ✅ | ✅ |
| `items_font_family` | ✅ | ✅ | ✅ | ✅ |
| `show_col_header` | ✅ | ✅ | ✅ | ✅ |
| `table_header_bold` | ✅ | ✅ | ✅ | ✅ |
| `table_header_bg` | ✅ | ✅ | ✅ | ✅ |
| `table_header_color` | ✅ | ✅ | ✅ | ✅ |
| `table_border_style` | ✅ | ✅ | ✅ | ✅ |
| `alternating_rows` | ✅ | ✅ | ✅ | ✅ |
| `alternating_color` | ✅ | ✅ | ✅ | ✅ |
| `price_display` | ✅ | ✅ | ✅ | ✅ |
| `show_line_total_ttc` | ✅ | ✅ | ✅ | ✅ |

### ▸ Totals

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `totals_font_size` | ✅ | ✅ | ✅ | ✅ |
| `totals_bold` | ✅ | ✅ | ✅ | ✅ |
| `totals_align` | ✅ | ✅ | ✅ | ✅ |
| `show_total_ht` | ✅ | ✅ | ✅ | ✅ |
| `show_total_tva` | ✅ | ✅ | ✅ | ✅ |
| `show_tva_breakdown` | ✅ | ✅ | ✅ | ✅ |
| `show_discount_total` | ✅ | ✅ | ✅ | ✅ |
| `show_fiscal_stamp` | ✅ | ✅ | ✅ | ✅ |
| `show_total_ttc` | ✅ | ✅ | ✅ | ✅ |
| `total_ttc_font_size` | ✅ | ✅ | ✅ | ✅ |
| `total_ttc_bold` | ✅ | ✅ | ✅ | ✅ |
| `total_ttc_color` | ✅ | ✅ | ✅ | ✅ |
| `total_border_style` | ✅ | ✅ | ✅ | ✅ |
| `show_amount_in_words` | ✅ | ✅ | ✅ | ✅ |
| `show_paid_amount` | ✅ | ✅ | ✅ | ✅ |
| `show_change` | ✅ | ✅ | ✅ | ✅ |
| `show_remaining` | ✅ | ✅ | ✅ | ✅ |
| `show_prev_balance` | ✅ | ✅ | ✅ | ✅ |
| `show_new_balance` | ✅ | ✅ | ✅ | ✅ |

### ▸ Payments

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_payment_details` | ✅ | ✅ | ✅ | ✅ |
| `payment_font_size` | ✅ | ✅ | ✅ | ✅ |

### ▸ Footer

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `footer_line1` | ✅ | ✅ | ✅ | ✅ |
| `footer_line2` | ✅ | ✅ | ✅ | ✅ |
| `footer_line3` | ✅ | ✅ | ✅ | ✅ |
| `footer_separator` | ✅ | ✅ | ✅ | ✅ |
| `show_thank_you` | ✅ | ✅ | ✅ | ✅ |
| `thank_you_text` | ✅ | ✅ | ✅ | ✅ |
| `thank_you_size` | ✅ | ✅ | ✅ | ✅ |
| `thank_you_color` | ✅ | ✅ | ✅ | ✅ |
| `show_returns_policy` | ✅ | ✅ | ✅ | ✅ |
| `returns_policy_text` | ✅ | ✅ | ✅ | ✅ |
| `footer_legal_text` | ✅ | ✅ | ✅ | ✅ |

### ▸ Barcode / QR

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_barcode` | ✅ | ✅ | ✅ | ✅ |
| `barcode_content` | ✅ | ✅ | ✅ | ✅ |
| `barcode_custom_text` | ✅ | ✅ | ✅ | ✅ |
| `show_qr` | ✅ | ✅ | ✅ | ✅ |
| `qr_content` | ✅ | ✅ | ✅ | ✅ |

### ▸ Signatures

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_cashier_signature` | ✅ | ✅ | ✅ | ✅ |
| `show_client_signature` | ✅ | ✅ | ✅ | ✅ |
| `show_stamp` | ✅ | ✅ | ✅ | ✅ |

### ▸ Section Visibility

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_header_section` | ✅ | ✅ | ✅ | ✅ |
| `show_doc_info_section` | ✅ | ✅ | ✅ | ✅ |
| `show_items_section` | ✅ | ✅ | ✅ | ✅ |
| `show_totals_section` | ✅ | ✅ | ✅ | ✅ |
| `show_payments_section` | ✅ | ✅ | ✅ | ✅ |
| `show_footer_section` | ✅ | ✅ | ✅ | ✅ |

### ▸ Rules

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `rules` | ✅ | ✅ | ✅ | ✅ |

### ▸ Formatting

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `margin_top` | ✅ | ✅ | ✅ | ✅ |
| `margin_bottom` | ✅ | ✅ | ✅ | ✅ |
| `margin_sides` | ✅ | ✅ | ✅ | ✅ |
| `line_spacing` | ✅ | ✅ | ✅ | ✅ |
| `base_font_size` | ✅ | ✅ | ✅ | ✅ |
| `font_family` | ✅ | ✅ | ✅ | ✅ |

### ▸ Report

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_report_header` | ✅ | ✅ | ✅ | ✅ |
| `report_header_text` | ✅ | ✅ | ✅ | ✅ |
| `show_report_footer` | ✅ | ✅ | ✅ | ✅ |
| `report_footer_text` | ✅ | ✅ | ✅ | ✅ |
| `group_by` | ✅ | ✅ | ✅ | ✅ |
| `sort_by` | ✅ | ✅ | ✅ | ✅ |
| `sort_direction` | ✅ | ✅ | ✅ | ✅ |
| `show_report_period` | ✅ | ✅ | ✅ | ✅ |
| `show_report_cashier` | ✅ | ✅ | ✅ | ✅ |
| `show_report_summary_cards` | ✅ | ✅ | ✅ | ✅ |
| `show_report_payment_breakdown` | ✅ | ✅ | ✅ | ✅ |
| `show_report_top_products` | ✅ | ✅ | ✅ | ✅ |
| `report_col_widths` | ✅ | ✅ | ✅ | ✅ |
| `report_col_headers` | ✅ | ✅ | ✅ | ✅ |

### ▸ Charts

| Setting | 58mm | 80mm | A4 | A5 |
|---------|:----:|:----:|:--:|:--:|
| `show_charts` | ✅ | ✅ | ✅ | ✅ |
| `chart_type` | ✅ | ✅ | ✅ | ✅ |
| `chart_title` | ✅ | ✅ | ✅ | ✅ |

---

## 2. Document Type Compatibility Matrix

### ▸ Global

| Setting | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT |
|---------|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|
| `id` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `name` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `doc_type_code` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `is_default` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `is_active` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### ▸ Paper

| Setting | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT |
|---------|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|
| `paper_size` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `paper_width_mm` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `page_orientation` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### ▸ Header / Company

All 24 header/company settings cover all 12 doc types — every cell is ✅.

(The following settings appear in registry as `ALL_DOCS`: `show_logo`, `logo_source`, `logo_size`, `logo_align`, `logo_border_radius`, `custom_logo_url`, `header_custom_text`, `header_separator`, `show_company_name`, `company_name_text`, `company_name_size`, `company_name_bold`, `company_name_align`, `company_name_color`, `show_address`, `show_phone`, `show_tax_id`, `show_rc`, `show_nis`, `show_ice`, `show_article`, `company_info_align`, `company_info_size`, `override_address`, `override_phone`, `override_nif`, `override_rc`, `override_nis`, `override_ice`, `override_article`)

### ▸ Document

| Setting | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT |
|---------|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|
| `title_text` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `title_size` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `title_bold` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `title_align` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `title_color` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_doc_number` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_date` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_time` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_due_date` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_cashier` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_client` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_client_nif` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_client_phone` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_client_address` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_delivery_address` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `show_session` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `show_payment_term` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `show_bank_details` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `bank_details_text` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `doc_separator` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### ▸ Columns

All 5 column settings use `ALL_DOCS` — every cell is ✅.

### ▸ Items / Table

All 11 items settings use `ALL_DOCS` — every cell is ✅.

### ▸ Totals

| Setting | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT |
|---------|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|
| `totals_font_size` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `totals_bold` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `totals_align` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_total_ht` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_total_tva` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_tva_breakdown` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_discount_total` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_fiscal_stamp` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `show_total_ttc` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `total_ttc_font_size` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `total_ttc_bold` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `total_ttc_color` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `total_border_style` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_amount_in_words` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_paid_amount` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_change` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_remaining` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_prev_balance` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `show_new_balance` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### ▸ Payments

Both payment settings use `ALL_DOCS` — every cell is ✅.

### ▸ Footer

All 11 footer settings use `ALL_DOCS` — every cell is ✅.

### ▸ Barcode / QR / Signatures

All 8 settings (3 barcode, 2 QR, 3 signature) use `ALL_DOCS` — every cell is ✅.

### ▸ Section Visibility

All 6 section-visibility settings use `ALL_DOCS` — every cell is ✅.

### ▸ Rules

`rules` uses `ALL_DOCS` — every cell is ✅.

### ▸ Formatting

All 6 formatting settings use `ALL_DOCS` — every cell is ✅.

### ▸ Report

| Setting | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT |
|---------|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|
| `show_report_header` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `report_header_text` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `show_report_footer` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `report_footer_text` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `group_by` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `sort_by` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `sort_direction` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `show_report_period` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `show_report_cashier` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `show_report_summary_cards` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `show_report_payment_breakdown` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `show_report_top_products` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `report_col_widths` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `report_col_headers` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### ▸ Charts

| Setting | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT |
|---------|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|
| `show_charts` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `chart_type` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `chart_title` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 3. Category Summary

### Paper Coverage

| Category | Settings | 58mm | 80mm | A4 | A5 | Restriction |
|----------|:--------:|:----:|:----:|:--:|:--:|-------------|
| global | 5 | 5 | 5 | 5 | 5 | none |
| paper | 3 | 2 | 2 | 2 | 2 | `paper_width_mm` ❌ on A4/A5; `page_orientation` ❌ on 58mm/80mm |
| header | 8 | 8 | 8 | 8 | 8 | none |
| company | 22 | 22 | 22 | 22 | 22 | none |
| document | 20 | 18 | 18 | 20 | 20 | `show_bank_details`, `bank_details_text` ❌ on 58mm/80mm |
| columns | 5 | 5 | 5 | 5 | 5 | none |
| items | 11 | 11 | 11 | 11 | 11 | none |
| totals | 19 | 19 | 19 | 19 | 19 | none |
| payments | 2 | 2 | 2 | 2 | 2 | none |
| footer | 11 | 11 | 11 | 11 | 11 | none |
| barcode | 3 | 3 | 3 | 3 | 3 | none |
| qr | 2 | 2 | 2 | 2 | 2 | none |
| signature | 3 | 3 | 3 | 3 | 3 | none |
| section-visibility | 6 | 6 | 6 | 6 | 6 | none |
| rules | 1 | 1 | 1 | 1 | 1 | none |
| formatting | 6 | 6 | 6 | 6 | 6 | none |
| report | 14 | 14 | 14 | 14 | 14 | gated by doc type, not paper |
| charts | 3 | 3 | 3 | 3 | 3 | gated by doc type, not paper |
| **Total** | **144** | **141** | **141** | **143** | **143** | |

**Paper findings:**
- **A4 / A5** have the most settings (143) — they only lose `paper_width_mm`.
- **58mm / 80mm** have the least (141) — they lose `show_bank_details`, `bank_details_text`, and `page_orientation`.

### Document Type Coverage

| Category | Settings | FV | BL | DEV | BCC | AA | FA | BR | AV | DDP | BT | POS | RPT | Most | Least |
|----------|:--------:|:--:|:--:|:---:|:---:|:--:|:--:|:--:|:--:|:---:|:--:|:---:|:---:|:----:|:-----:|
| global | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | — | — |
| paper | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | — | — |
| header | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | — | — |
| company | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | 22 | — | — |
| document | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 20 | 17 | 17 | 18 | 18 | FV–AV (20) | DDP,BT (17) |
| columns | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | 5 | — | — |
| items | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | — | — |
| totals | 19 | 19 | 19 | 19 | 19 | 19 | 19 | 19 | 19 | 18 | 18 | 18 | 18 | FV–AV (19) | DDP,BT,POS,RPT (18) |
| payments | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | — | — |
| footer | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | 11 | — | — |
| barcode | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | — | — |
| qr | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | — | — |
| signature | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | 3 | — | — |
| section-visibility | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | — | — |
| rules | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | — | — |
| formatting | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | — | — |
| report | 14 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 14 | RPT (14) | all others (0) |
| charts | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | RPT (3) | all others (0) |
| **Total** | **144** | **127** | **127** | **127** | **127** | **127** | **127** | **127** | **127** | **124** | **124** | **125** | **143** | | |

**Doc-type findings:**
- **RPT** (Session Report) has the **most** settings (143) — it alone unlocks the entire Report + Charts categories.
- **FV / BL / DEV / BCC / AA / FA / BR / AV** (commercial docs) have 127 settings each — they lose the report/chart category but gain commercial-specific fields (`show_delivery_address`, `show_payment_term`, `show_bank_details`, `show_fiscal_stamp`).
- **POS** (POS Receipt) has 125 settings — loses commercial fields but gains `show_session`.
- **DDP / BT** (warehouse) have the **least** (124) — they lose commercial fields and `show_session`.

---

## 4. Restriction Summary

### Paper-only restrictions (3 settings)

| Setting | Reason | Visible on | Hidden on |
|---------|--------|------------|-----------|
| `paper_width_mm` | Only meaningful for thermal roll width selection | 58mm, 80mm | A4, A5 |
| `page_orientation` | Only sheets have portrait/landscape orientation | A4, A5 | 58mm, 80mm |
| `show_bank_details` / `bank_details_text` | Bank details are too wide for thermal paper | A4, A5 | 58mm, 80mm |

### Doc-type-only restrictions (6 settings)

| Setting | Visible on | Hidden on |
|---------|------------|-----------|
| `show_delivery_address` | FV, BL, DEV, BCC, AA, FA, BR, AV | DDP, BT, POS, RPT |
| `show_session` | POS, RPT | all others |
| `show_payment_term` | FV, BL, DEV, BCC, AA, FA, BR, AV | DDP, BT, POS, RPT |
| `show_bank_details` / `bank_details_text` | FV, BL, DEV, BCC, AA, FA, BR, AV | DDP, BT, POS, RPT |
| `show_fiscal_stamp` | FV, BL, DEV, BCC, AA, FA, BR, AV | DDP, BT, POS, RPT |
| All Report + Charts settings (17) | RPT | all others |

---

## 5. Visibility Rule Hierarchy

The visibility of any setting in the UI is determined by:

```
visible = doc_type ∈ supportedDocs  AND  paper_size ∈ supportedPapers
```

This is implemented in `isSettingVisible()` (`SettingsRegistry.ts:247-251`) and consumed by every section control via the `sec(k)` helper pattern:

```tsx
const sec = (k: string) => isSettingVisible(k, tpl.doc_type_code, tpl.paper_size);
{sec('show_logo') && <Toggle ... />}
```

There are **two restriction dimensions** (paper, doc type) plus a **dependency chain** (`dependsOn`) that further toggles child fields — but dependencies are UI-only, not handled by `supportedPapers`/`supportedDocs`.

### Dependency chain overview (21 settings)

Child settings hidden until their parent toggle is enabled:

| Parent | Children |
|--------|----------|
| `show_logo` | `logo_source`, `logo_size`, `logo_align`, `logo_border_radius`, `custom_logo_url` |
| `show_company_name` | `company_name_text`, `company_name_size`, `company_name_bold`, `company_name_align`, `company_name_color` |
| `show_col_header` | `table_header_bold`, `table_header_bg`, `table_header_color` |
| `alternating_rows` | `alternating_color` |
| `show_thank_you` | `thank_you_text`, `thank_you_size`, `thank_you_color` |
| `show_returns_policy` | `returns_policy_text` |
| `show_bank_details` | `bank_details_text` |
| `show_barcode` | `barcode_content` |
| `barcode_content` | `barcode_custom_text` |
| `show_qr` | `qr_content` |
| `show_report_header` | `report_header_text` |
| `show_report_footer` | `report_footer_text` |
| `show_charts` | `chart_type`, `chart_title` |

---

## 6. Hotspots — Settings with the Narrowest Compatibility

Settings visible in **≤ 4 doc types** or **≤ 2 paper sizes**:

| Setting | Papers | Docs | Coverage % |
|---------|--------|------|:----------:|
| `page_orientation` | 2/4 (A4, A5) | 12/12 | **50% paper, 100% doc** |
| `paper_width_mm` | 2/4 (58mm, 80mm) | 12/12 | **50% paper, 100% doc** |
| `show_bank_details` | 2/4 (A4, A5) | 8/12 | **50% paper, 67% doc** |
| `bank_details_text` | 2/4 (A4, A5) | 8/12 | **50% paper, 67% doc** |
| `show_session` | 4/4 | 2/12 (POS, RPT) | **100% paper, 17% doc** |
| `show_fiscal_stamp` | 4/4 | 8/12 | **100% paper, 67% doc** |
| Report / Charts (17 settings) | 4/4 | 1/12 (RPT) | **100% paper, 8% doc** |

---

*Generated from `SettingsRegistry.ts` — 144 registered settings across 18 categories.*

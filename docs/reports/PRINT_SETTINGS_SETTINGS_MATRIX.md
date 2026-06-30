# Print Settings — Settings Registry Matrix

> **Source**: `resources/js/pages/settings/print-settings/services/SettingsRegistry.ts`  
> **Generated**: 2026-06-29  
> **Total Settings**: **144**

---

## Summary

### Settings per Category

| Category | Count |
|---|---|
| `company` | 22 |
| `document` | 20 |
| `totals` | 19 |
| `report` | 14 |
| `items` | 11 |
| `footer` | 11 |
| `header` | 8 |
| `formatting` | 6 |
| `section-visibility` | 6 |
| `global` | 5 |
| `columns` | 5 |
| `paper` | 3 |
| `barcode` | 3 |
| `signature` | 3 |
| `charts` | 3 |
| `payments` | 2 |
| `qr` | 2 |
| `rules` | 1 |

### Settings per Component Type

| Component | Count |
|---|---|
| `toggle` | 67 |
| `input` | 27 |
| `pills` | 18 |
| `slider` | 15 |
| `color` | 6 |
| `column-manager` | 5 |
| `select` | 4 |
| `textarea` | 1 |
| `rules-editor` | 1 |
| `logo-upload` | 0 |

### Paper Size Coverage

| Paper Scope | Count |
|---|---|
| All papers (80mm, 58mm, A4, A5) | 140 |
| Thermal only (80mm, 58mm) | 1 |
| Page only (A4, A5) | 3 |

### Doc Type Coverage

| Doc Scope | Count |
|---|---|
| All docs (12 types) | 118 |
| Commercial docs only (FV, BL, DEV, BCC, AA, FA, BR, AV) | 5 |
| POS docs only (POS, RPT) | 1 |
| Report docs only (RPT) | 17 |
| Warehouse docs only (DDP, BT) | 0 |

### Dependencies

- **Settings with `dependsOn`**: 25
- **Unique parent keys**: 10 (`show_logo`, `show_company_name`, `show_bank_details`, `show_col_header`, `alternating_rows`, `show_barcode`, `barcode_content`, `show_qr`, `show_thank_you`, `show_returns_policy`, `show_report_header`, `show_report_footer`, `show_charts`)

---

## Matrix

### Legend

| Column | Description |
|---|---|
| **Key** | Property name on `PrintTemplate` |
| **Label (Ar)** | Arabic label shown in the UI |
| **Category** | Functional grouping |
| **Component** | UI control type |
| **Default** | Factory default value |
| **Supported Papers** | Paper sizes the setting applies to |
| **Supported Docs** | Document types the setting applies to |
| **Depends On** | Parent toggle key (null = always visible) |

### Conventions

| Shortcut | Meaning |
|---|---|
| All (4) | 80mm, 58mm, A4, A5 |
| Thermal (2) | 80mm, 58mm |
| Page (2) | A4, A5 |
| All (12) | FV, BL, DEV, BCC, AA, FA, BR, AV, DDP, BT, POS, RPT |
| Commercial (8) | FV, BL, DEV, BCC, AA, FA, BR, AV |
| POS (2) | POS, RPT |
| Report (1) | RPT |

---

### 🌐 global

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `id` | المعرف | input | `null` | All (4) | All (12) | — |
| `name` | الاسم | input | `قالب جديد` | All (4) | All (12) | — |
| `doc_type_code` | نوع المستند | select | `FV` | All (4) | All (12) | — |
| `is_default` | افتراضي | toggle | `false` | All (4) | All (12) | — |
| `is_active` | مفعل | toggle | `true` | All (4) | All (12) | — |

---

### 📄 paper

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `paper_size` | حجم الورق | pills | `80mm` | All (4) | All (12) | — |
| `paper_width_mm` | عرض الورق (ملم) | select | `80` | Thermal (2) | All (12) | — |
| `page_orientation` | اتجاه الصفحة | pills | `portrait` | Page (2) | All (12) | — |

---

### 🎨 formatting

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `margin_top` | الهامش العلوي (ملم) | slider | `3` | All (4) | All (12) | — |
| `margin_bottom` | الهامش السفلي (ملم) | slider | `3` | All (4) | All (12) | — |
| `margin_sides` | الهامش الجانبي (ملم) | slider | `3` | All (4) | All (12) | — |
| `line_spacing` | تباعد الأسطر | slider | `1.3` | All (4) | All (12) | — |
| `base_font_size` | حجم الخط الأساسي | slider | `10` | All (4) | All (12) | — |
| `font_family` | نوع الخط | select | `tajawal` | All (4) | All (12) | — |

---

### 🖼️ header

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_logo` | إظهار الشعار | toggle | `true` | All (4) | All (12) | — |
| `logo_source` | مصدر الشعار | pills | `company` | All (4) | All (12) | `show_logo` |
| `logo_size` | حجم الشعار (بكسل) | slider | `56` | All (4) | All (12) | `show_logo` |
| `logo_align` | محاذاة الشعار | pills | `center` | All (4) | All (12) | `show_logo` |
| `logo_border_radius` | تدوير زوايا الشعار | slider | `50` | All (4) | All (12) | `show_logo` |
| `custom_logo_url` | رابط الشعار المخصص | input | `null` | All (4) | All (12) | `show_logo` |
| `header_custom_text` | نص مخصص للرأس | input | `''` | All (4) | All (12) | — |
| `header_separator` | فاصل الرأس | pills | `dashed` | All (4) | All (12) | — |

---

### 🏢 company

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_company_name` | إظهار اسم الشركة | toggle | `true` | All (4) | All (12) | — |
| `company_name_text` | نص اسم الشركة | input | `''` | All (4) | All (12) | `show_company_name` |
| `company_name_size` | حجم اسم الشركة | slider | `15` | All (4) | All (12) | `show_company_name` |
| `company_name_bold` | تسميك اسم الشركة | toggle | `true` | All (4) | All (12) | `show_company_name` |
| `company_name_align` | محاذاة اسم الشركة | pills | `center` | All (4) | All (12) | `show_company_name` |
| `company_name_color` | لون اسم الشركة | color | `#111111` | All (4) | All (12) | `show_company_name` |
| `show_address` | إظهار العنوان | toggle | `true` | All (4) | All (12) | — |
| `show_phone` | إظهار الهاتف | toggle | `true` | All (4) | All (12) | — |
| `show_tax_id` | إظهار رقم الضريبة | toggle | `true` | All (4) | All (12) | — |
| `show_rc` | إظهار السجل التجاري | toggle | `true` | All (4) | All (12) | — |
| `show_nis` | إظهار رقم NIS | toggle | `false` | All (4) | All (12) | — |
| `show_ice` | إظهار رقم ICE | toggle | `false` | All (4) | All (12) | — |
| `show_article` | إظهار المادة | toggle | `false` | All (4) | All (12) | — |
| `company_info_align` | محاذاة المعلومات | pills | `center` | All (4) | All (12) | — |
| `company_info_size` | حجم خط المعلومات | slider | `9` | All (4) | All (12) | — |
| `override_address` | تجاوز العنوان | input | `''` | All (4) | All (12) | — |
| `override_phone` | تجاوز الهاتف | input | `''` | All (4) | All (12) | — |
| `override_nif` | تجاوز رقم الضريبة | input | `''` | All (4) | All (12) | — |
| `override_rc` | تجاوز السجل التجاري | input | `''` | All (4) | All (12) | — |
| `override_nis` | تجاوز NIS | input | `''` | All (4) | All (12) | — |
| `override_ice` | تجاوز ICE | input | `''` | All (4) | All (12) | — |
| `override_article` | تجاوز المادة | input | `''` | All (4) | All (12) | — |

---

### 📋 document

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `title_text` | نص العنوان | input | `فاتورة بيع` | All (4) | All (12) | — |
| `title_size` | حجم العنوان | slider | `13` | All (4) | All (12) | — |
| `title_bold` | تسميك العنوان | toggle | `true` | All (4) | All (12) | — |
| `title_align` | محاذاة العنوان | pills | `center` | All (4) | All (12) | — |
| `title_color` | لون العنوان | color | `#111111` | All (4) | All (12) | — |
| `show_doc_number` | إظهار رقم المستند | toggle | `true` | All (4) | All (12) | — |
| `show_date` | إظهار التاريخ | toggle | `true` | All (4) | All (12) | — |
| `show_time` | إظهار الوقت | toggle | `true` | All (4) | All (12) | — |
| `show_due_date` | إظهار تاريخ الاستحقاق | toggle | `false` | All (4) | All (12) | — |
| `show_cashier` | إظهار الكاشير | toggle | `true` | All (4) | All (12) | — |
| `show_client` | إظهار العميل | toggle | `true` | All (4) | All (12) | — |
| `show_client_nif` | إظهار رقم ضريبة العميل | toggle | `false` | All (4) | All (12) | — |
| `show_client_phone` | إظهار هاتف العميل | toggle | `false` | All (4) | All (12) | — |
| `show_client_address` | إظهار عنوان العميل | toggle | `false` | All (4) | All (12) | — |
| `show_delivery_address` | إظهار عنوان التسليم | toggle | `false` | All (4) | Commercial (8) | — |
| `show_session` | إظهار الجلسة | toggle | `false` | All (4) | POS (2) | — |
| `show_payment_term` | إظهار شرط الدفع | toggle | `false` | All (4) | Commercial (8) | — |
| `show_bank_details` | إظهار تفاصيل البنك | toggle | `false` | Page (2) | Commercial (8) | — |
| `bank_details_text` | نص تفاصيل البنك | textarea | `''` | Page (2) | Commercial (8) | `show_bank_details` |
| `doc_separator` | فاصل المستند | pills | `dashed` | All (4) | All (12) | — |

---

### 📊 columns

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `col_order` | ترتيب الأعمدة | column-manager | `['name','quantity','price','total']` | All (4) | All (12) | — |
| `col_show` | إظهار الأعمدة | column-manager | `{}` | All (4) | All (12) | — |
| `col_widths` | عرض الأعمدة | column-manager | `{}` | All (4) | All (12) | — |
| `col_headers` | عناوين الأعمدة | column-manager | `{}` | All (4) | All (12) | — |
| `col_aligns` | محاذاة الأعمدة | column-manager | `{}` | All (4) | All (12) | — |

---

### 📝 items

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `items_font_size` | حجم خط الجدول | slider | `10` | All (4) | All (12) | — |
| `items_font_family` | نوع خط الجدول | select | `tajawal` | All (4) | All (12) | — |
| `show_col_header` | إظهار رؤوس الأعمدة | toggle | `true` | All (4) | All (12) | — |
| `table_header_bold` | تسميك رأس الجدول | toggle | `true` | All (4) | All (12) | `show_col_header` |
| `table_header_bg` | خلفية رأس الجدول | toggle | `false` | All (4) | All (12) | `show_col_header` |
| `table_header_color` | لون رأس الجدول | color | `#333333` | All (4) | All (12) | `show_col_header` |
| `table_border_style` | نمط حدود الجدول | pills | `dashed` | All (4) | All (12) | — |
| `alternating_rows` | تلوين الصفوف بالتناوب | toggle | `false` | All (4) | All (12) | — |
| `alternating_color` | لون التناوب | color | `#f5f5f5` | All (4) | All (12) | `alternating_rows` |
| `price_display` | طريقة عرض السعر | pills | `ht` | All (4) | All (12) | — |
| `show_line_total_ttc` | إظهار المجموع لكل سطر | toggle | `false` | All (4) | All (12) | — |

---

### 💰 totals

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `totals_font_size` | حجم خط الإجماليات | slider | `10` | All (4) | All (12) | — |
| `totals_bold` | تسميك الإجماليات | toggle | `true` | All (4) | All (12) | — |
| `totals_align` | محاذاة الإجماليات | pills | `right` | All (4) | All (12) | — |
| `show_total_ht` | إظهار المجموع HT | toggle | `true` | All (4) | All (12) | — |
| `show_total_tva` | إظهار مجموع الضريبة | toggle | `true` | All (4) | All (12) | — |
| `show_tva_breakdown` | تفصيل الضريبة حسب النسبة | toggle | `false` | All (4) | All (12) | — |
| `show_discount_total` | إظهار مجموع الخصم | toggle | `true` | All (4) | All (12) | — |
| `show_fiscal_stamp` | إظهار الطابع الضريبي | toggle | `true` | All (4) | Commercial (8) | — |
| `show_total_ttc` | إظهار المجموع TTC | toggle | `true` | All (4) | All (12) | — |
| `total_ttc_font_size` | حجم خط TTC | slider | `14` | All (4) | All (12) | — |
| `total_ttc_bold` | تسميك TTC | toggle | `true` | All (4) | All (12) | — |
| `total_ttc_color` | لون TTC | color | `#111111` | All (4) | All (12) | — |
| `total_border_style` | نمط حدود الإجماليات | pills | `double` | All (4) | All (12) | — |
| `show_amount_in_words` | إظهار المبلغ كتابةً | toggle | `false` | All (4) | All (12) | — |
| `show_paid_amount` | إظهار المبلغ المدفوع | toggle | `true` | All (4) | All (12) | — |
| `show_change` | إظهار الباقي | toggle | `true` | All (4) | All (12) | — |
| `show_remaining` | إظهار المتبقي | toggle | `false` | All (4) | All (12) | — |
| `show_prev_balance` | إظهار الرصيد السابق | toggle | `true` | All (4) | All (12) | — |
| `show_new_balance` | إظهار الرصيد الجديد | toggle | `true` | All (4) | All (12) | — |

---

### 💳 payments

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_payment_details` | إظهار تفاصيل الدفع | toggle | `true` | All (4) | All (12) | — |
| `payment_font_size` | حجم خط الدفع | slider | `9` | All (4) | All (12) | — |

---

### 🔻 footer

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `footer_line1` | سطر التذييل 1 | input | `''` | All (4) | All (12) | — |
| `footer_line2` | سطر التذييل 2 | input | `''` | All (4) | All (12) | — |
| `footer_line3` | سطر التذييل 3 | input | `''` | All (4) | All (12) | — |
| `footer_separator` | فاصل التذييل | pills | `solid` | All (4) | All (12) | — |
| `show_thank_you` | إظهار الشكر | toggle | `true` | All (4) | All (12) | — |
| `thank_you_text` | نص الشكر | input | `شكراً لزيارتكم!` | All (4) | All (12) | `show_thank_you` |
| `thank_you_size` | حجم خط الشكر | slider | `11` | All (4) | All (12) | `show_thank_you` |
| `thank_you_color` | لون الشكر | color | `#111111` | All (4) | All (12) | `show_thank_you` |
| `show_returns_policy` | إظهار سياسة الإرجاع | toggle | `true` | All (4) | All (12) | — |
| `returns_policy_text` | نص سياسة الإرجاع | input | `كل الاحتجاجات لا تتعدى 48 ساعة` | All (4) | All (12) | `show_returns_policy` |
| `footer_legal_text` | نص قانوني | input | `''` | All (4) | All (12) | — |

---

### 📶 barcode

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_barcode` | إظهار الباركود | toggle | `true` | All (4) | All (12) | — |
| `barcode_content` | محتوى الباركود | pills | `doc-number` | All (4) | All (12) | `show_barcode` |
| `barcode_custom_text` | نص الباركود المخصص | input | `''` | All (4) | All (12) | `barcode_content` |

---

### 📱 qr

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_qr` | إظهار رمز QR | toggle | `false` | All (4) | All (12) | — |
| `qr_content` | محتوى QR | pills | `doc-number` | All (4) | All (12) | `show_qr` |

---

### ✍️ signature

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_cashier_signature` | توقيع الكاشير | toggle | `false` | All (4) | All (12) | — |
| `show_client_signature` | توقيع العميل | toggle | `false` | All (4) | All (12) | — |
| `show_stamp` | إظهار الختم | toggle | `false` | All (4) | All (12) | — |

---

### 👁️ section-visibility

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_header_section` | قسم الرأس | toggle | `true` | All (4) | All (12) | — |
| `show_doc_info_section` | قسم المستند | toggle | `true` | All (4) | All (12) | — |
| `show_items_section` | قسم الجدول | toggle | `true` | All (4) | All (12) | — |
| `show_totals_section` | قسم الإجماليات | toggle | `true` | All (4) | All (12) | — |
| `show_payments_section` | قسم الدفع | toggle | `true` | All (4) | All (12) | — |
| `show_footer_section` | قسم التذييل | toggle | `true` | All (4) | All (12) | — |

---

### ⚙️ rules

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `rules` | القواعد | rules-editor | `[]` | All (4) | All (12) | — |

---

### 📈 charts

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_charts` | إظهار الرسوم البيانية | toggle | `true` | All (4) | Report (1) | — |
| `chart_type` | نوع الرسم البياني | pills | `bar` | All (4) | Report (1) | `show_charts` |
| `chart_title` | عنوان الرسم البياني | input | `''` | All (4) | Report (1) | `show_charts` |

---

### 📑 report

| Key | Label (Ar) | Component | Default | Supported Papers | Supported Docs | Depends On |
|---|---|---|---|---|---|---|
| `show_report_header` | إظهار رأس التقرير | toggle | `true` | All (4) | Report (1) | — |
| `report_header_text` | نص رأس التقرير | input | `''` | All (4) | Report (1) | `show_report_header` |
| `show_report_footer` | إظهار تذييل التقرير | toggle | `true` | All (4) | Report (1) | — |
| `report_footer_text` | نص تذييل التقرير | input | `''` | All (4) | Report (1) | `show_report_footer` |
| `group_by` | تجميع حسب | input | `''` | All (4) | Report (1) | — |
| `sort_by` | ترتيب حسب | input | `''` | All (4) | Report (1) | — |
| `sort_direction` | اتجاه الترتيب | pills | `asc` | All (4) | Report (1) | — |
| `show_report_period` | إظهار فترة التقرير | toggle | `true` | All (4) | Report (1) | — |
| `show_report_cashier` | إظهار الكاشير | toggle | `true` | All (4) | Report (1) | — |
| `show_report_summary_cards` | إظهار بطاقات الملخص | toggle | `true` | All (4) | Report (1) | — |
| `show_report_payment_breakdown` | إظهار توزيع الدفع | toggle | `true` | All (4) | Report (1) | — |
| `show_report_top_products` | إظهار أفضل المنتجات | toggle | `true` | All (4) | Report (1) | — |
| `report_col_widths` | عرض أعمدة التقرير | input | `{}` | All (4) | Report (1) | — |
| `report_col_headers` | عناوين أعمدة التقرير | input | `{}` | All (4) | Report (1) | — |

---

## Quick Reference

### Top 5 categories by setting count

1. **company** — 22 settings (15.3%)
2. **document** — 20 settings (13.9%)
3. **totals** — 19 settings (13.2%)
4. **report** — 14 settings (9.7%)
5. **items** / **footer** — 11 settings each (7.6%)

### Most common component types

1. **toggle** — 67 settings (46.5%) — overwhelmingly the dominant pattern
2. **input** — 27 settings (18.8%)
3. **pills** — 18 settings (12.5%)
4. **slider** — 15 settings (10.4%)
5. **color** — 6 settings (4.2%)

### Doc-type-restricted settings

| Key | Restriction |
|---|---|
| `show_delivery_address` | Commercial docs only |
| `show_session` | POS docs only |
| `show_payment_term` | Commercial docs only |
| `show_bank_details` | Page + Commercial |
| `bank_details_text` | Page + Commercial |
| `show_fiscal_stamp` | Commercial docs only |
| 17× report settings | Report (RPT) only |

### Paper-restricted settings

| Key | Restriction |
|---|---|
| `paper_width_mm` | Thermal (80mm, 58mm) |
| `page_orientation` | Page (A4, A5) |
| `show_bank_details` | Page (A4, A5) |
| `bank_details_text` | Page (A4, A5) |

---

*End of report. 144 settings across 18 categories.*

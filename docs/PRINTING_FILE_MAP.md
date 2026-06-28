# 🖨️ Printing System — Comprehensive File Map

**تاريخ الإنشاء**: 2026-06-28  
**النسخة**: Phase 6.5 (Section Integration + Legacy Wiring)  
**الغرض**: خريطة كاملة لهيكلة نظام الطباعة وقوالب الطباعة — للـ AI agents (مثل Claude) للعمل دون إعادة هيكلة

---

## 1. النظرة العامة — العمارة

### طبقات النظام

```
Laravel Backend (PHP)
├── app/Models/              ← PrintTemplate, Setting, CommercialDocument
├── app/Http/Controllers/    ← PrintTemplateController, SettingController
├── app/Services/            ← TemplateLibraryService
├── routes/api.php           ← جميع endpoints الـ API
└── database/migrations/     ← print_templates table

React Frontend (TypeScript)
├── resources/js/reporting/  ← Framework (قابل لإعادة الاستخدام)
│   ├── core/domain/         ← PrintTemplate type (canonical)
│   ├── core/engines/        ← FormulaEngine, RulesEngine, LayoutEngine
│   ├── data/                ← UniversalDocumentData, FieldRegistry
│   ├── components/preview/  ← UniversalPreview, shared.tsx
│   ├── components/shared/   ← FormulaEditor, TemplatePrintModal, RulesSection, ChartSection
│   ├── renderers/           ← CsvRenderer, ExcelRenderer, PrintJobQueue
│   ├── templates/library/   ← Template Library (registry, config layers, modal)
│   └── index.ts             ← Public API (التصدير الوحيد للـ consumer code)
│
├── resources/js/pages/settings/  ← صفحات الإعدادات
│   ├── PrintSettingsPage.tsx     ← الصفحة الرئيسية للطباعة
│   └── print-settings/           ← مكونات الصفحة
│       ├── types.ts              ← PrintTemplate type (local copy)
│       ├── api/printTemplatesApi.ts  ← API hooks
│       ├── components/PreviewSelector.tsx  ← مفتاح المعاينة
│       ├── sections/             ← 7 section components
│       └── future/               ← ملفات قديمة — لا تُلمس
│
└── resources/js/pages/pos/   ← صفحات نقاط البيع
    └── utils/printService.ts ← WebUSB + thermal printing
```

### تدفق البيانات — من المستند إلى الطباعة

```
POSPage / CommercialDocument
    │
    ▼
UniversalDocumentData (data contract الموحد)
    │
    ├── DocumentDataBuilder     ← يحوّل API response إلى هذا الشكل
    └── fromLegacyLiveData()    ← يحوّل البيانات القديمة
    │
    ▼
UniversalPreview / A4Preview / A5Preview / ReceiptPreview
    │
    ├── Reads PrintTemplate      ← كل خصائص التنسيق
    ├── Applies RulesEngine      ← عرض/إخفاء/تلوين حسب القواعد
    └── Renders HTML             ← inline styles (بدون CSS خارجي)
    │
    ▼
TemplatePrintModal / window.print() / WebUSB thermal
```

---

## 2. Laravel Backend (PHP)

### 2.1 Models

| الملف | الجدول | الدور |
|-------|--------|-------|
| `app/Models/PrintTemplate.php` | `print_templates` | قالب الطباعة (config كـ JSON) — `HasCompany`, `boot()` إدارة الافتراضي |
| `app/Models/Setting.php` | `settings` | key-value store — `HasCompany`, `casts: value => array` |
| `app/Models/CommercialDocument.php` | `commercial_documents` | المستندات التجارية (فواتير، وصل تسليم...) |
| `app/Models/CommercialDocumentLine.php` | `commercial_document_lines` | بنود المستند |
| `app/Models/DocumentType.php` | `document_types` | أنواع المستندات (FV, BL, DEV...) — فيه `is_printable` |

### 2.2 Controllers

| الملف | الدور |
|-------|-------|
| `app/Http/Controllers/Api/V1/PrintTemplateController.php` | CRUD كامل + `setDefault()`, `duplicate()`, `library()`, `installLibrary()` |
| `app/Http/Controllers/Api/V1/SettingController.php` | CRUD للإعدادات — يستخدم لـ print settings القديمة |

### 2.3 Services

| الملف | الدور |
|-------|-------|
| `app/Services/TemplateLibraryService.php` | مصدر الحقيقة للقوالب الجاهزة — يحتوي 3 قوالب مدمجة (`dz-invoice-a4`, `dz-delivery-a4`, `dz-delivery-a5`) |

### 2.4 API Routes (routes/api.php)

```
POST   /api/v1/auth/login
POST   /api/v1/auth/register
...
GET    /api/v1/{company}/print-templates
GET    /api/v1/{company}/print-templates/{id}
POST   /api/v1/{company}/print-templates
PUT    /api/v1/{company}/print-templates/{id}
DELETE /api/v1/{company}/print-templates/{id}
POST   /api/v1/{company}/print-templates/{id}/set-default
POST   /api/v1/{company}/print-templates/{id}/duplicate
GET    /api/v1/{company}/print-templates/library
POST   /api/v1/{company}/print-templates/library/install
```

### 2.5 Database — جدول `print_templates`

```sql
id              BIGINT PK AUTO_INCREMENT
company_id      BIGINT FK → companies.id (CASCADE DELETE)
name            VARCHAR(255)
doc_type_code   VARCHAR(10)       -- FV, BL, DEV, BCC, AA, FA...
paper_size      VARCHAR(10)       -- A4, A5, 80mm, 58mm
is_default      TINYINT(1)        -- boolean
is_active       TINYINT(1)        -- boolean
config          LONGTEXT (JSON)   -- 157+ خاصية تنسيق
created_at      TIMESTAMP
updated_at      TIMESTAMP

INDEX: (company_id, doc_type_code)
```

### 2.6 Install Flow (Backend)

```
POST /{company}/print-templates/library/install
  → { template_id: "dz-invoice-a4" }
  → PrintTemplateController@installLibrary
    → TemplateLibraryService::exists($templateId)   ← تحقق من الوجود
    → TemplateLibraryService::getFlatPayload($id)    ← يرجع ['name', 'doc_type_code', 'paper_size', 'config']
    → PrintTemplate::create($payload)                ← ينشئ سجل في DB
    → successResponse($template)
```

---

## 3. Frontend Framework — `resources/js/reporting/`

### 3.1 Core Domain

| الملف | الدور |
|-------|-------|
| `core/domain/PrintTemplate.ts` | نوع `PrintTemplate` الـ canonical (177 خاصية) + `DocTypeCode`, `PaperSize`, `createDefaultTemplate()` |
| `core/engines/FormulaEngine.ts` | مُفسِّر تعابير مخصص (بدون eval) — tokenizer → parser → AST → executor |
| `core/engines/RulesEngine.ts` | مُقيِّم قواعد — show/hide/highlight/disable حسب الشروط |
| `core/engines/LayoutEngine.ts` | حساب التخطيط — flow/flex/absolute + pagination |
| `core/theme/ThemeSystem.ts` | 3 سمات (default-light, minimal, compact) + CSS vars |

### 3.2 Data Layer

| الملف | الدور |
|-------|-------|
| `data/UniversalDocumentData.ts` | عقد البيانات الموحد — DocumentInfo, CompanyInfo, PartyInfo, DocumentLine, DocumentTotals... |
| `data/DocumentDataBuilder.ts` | يبني UniversalDocumentData من API / POS / مصادر قديمة |
| `data/FieldRegistry.ts` | 79 حقل مفهرس مع تسميات عربية |
| `data/CalculatedFieldService.ts` | 8 حقول محسوبة (movement, amountInWords, profit...) |

### 3.3 Preview Components

| الملف | الأسطر | الدور |
|-------|--------|-------|
| `components/preview/UniversalPreview.tsx` | ~1177 | المعاينة الموحدة — thermal flexbox لـ 58/80mm، HTML tables لـ A4/A5. يتعامل مع كل أحجام الورق بمحرك عرض واحد. |
| `components/preview/shared.tsx` | ~150 | مساعدات عرض: `CompanyData`, `DocRow`, `TotalRow`, `InfoRow`, `Separator` + دوال تحويل الوحدات |

### 3.4 Shared UI Components

| الملف | الأسطر | الدور |
|-------|--------|-------|
| `components/shared/FormulaEditor.tsx` | ~400 | محرر تعابير مع منتقي الحقول والتحقق من الصحة ووظائف مدمجة |
| `components/shared/TemplatePrintModal.tsx` | ~300 | مودال الطباعة (بدلاً من `window.print()`) |
| `components/shared/RulesSection.tsx` | ~300 | باني القواعد — قائمة، visibility toggles، محرر أنماط التمييز |
| `components/shared/ChartSection.tsx` | ~200 | BarChart/PieChart باستخدام recharts لتقارير الملخص |
| `components/shared/PrintQueuePanel.tsx` | ~150 | لوحة حالة قائمة انتظار الطباعة |

### 3.5 Renderers

| الملف | الدور |
|-------|-------|
| `renderers/IRenderer.ts` | واجهة الـ renderer + `RendererRegistry` |
| `renderers/CsvRenderer.ts` | تصدير CSV مع BOM |
| `renderers/ExcelRenderer.ts` | تصدير Excel (SpreadsheetML، بدون مكتبات) |
| `renderers/PrintJobQueue.ts` | سينجلتون لقائمة انتظار الطباعة مع أحداث |
| `renderers/useExportDocument.ts` | Hook + أدوات تصدير مستقلة |

### 3.6 Template Library

| الملف | الأسطر | الدور |
|-------|--------|-------|
| `templates/library/registry.ts` | 382 | `TemplateRegistryClass` سينجلتون + `registerBuiltinTemplates()` — يسجل 3 قوالب مدمجة |
| `templates/library/TemplateLibraryModal.tsx` | 525 | مودال المكتبة — بحث، فلاتر، Recently Used، Favorites، Preview، Install |
| `templates/library/categories.ts` | 40 | 9 تصنيفات + `categoryFromDocType()` |
| `templates/library/types.ts` | 93 | `LibraryTemplateMeta`, `LibraryTemplateEntry`, `LibraryApiResponse`, `LibraryFilterState`... |
| `templates/library/constants.ts` | 76 | ثوابت Named (أحجام، ألوان، margins) — لا أرقام سحرية |
| `templates/library/mockData.ts` | 124 | بيانات اختبار للعرض المسبق (مخبأة في ref) |
| `templates/library/config/index.ts` | — | يجمع كل configs |
| `templates/library/config/PaperConfig.ts` | — | margins + orientation + paper width |
| `templates/library/config/TypographyConfig.ts` | — | font sizes + families |
| `templates/library/config/HeaderConfig.ts` | — | logo + company info |
| `templates/library/config/TableConfig.ts` | — | column definitions (3 variants: INVOICE, DELIVERY, DELIVERY_A5) |
| `templates/library/config/TotalsConfig.ts` | — | totals visibility (3 variants) |
| `templates/library/config/FooterConfig.ts` | — | footer text + barcode + QR (3 variants) |

### 3.7 Public API (`index.ts`)

```
import {
  // Data
  UniversalDocumentData, fromLegacyLiveData, emptyDocumentData, DocumentDataBuilder,
  // Domain
  PrintTemplate, DocTypeCode, PaperSize, createDefaultTemplate,
  // Engines
  FormulaEngine, RulesEngine, LayoutEngine, ThemeSystem,
  // Fields
  fieldRegistry, calculatedFieldService,
  // Renderers
  CsvRenderer, ExcelRenderer, useExportDocument,
  // Components
  UniversalPreview, FormulaEditor, TemplatePrintModal, RulesSection, ChartSection, PrintQueuePanel,
  // Print Queue
  printJobQueue, usePrintJobQueue,
  // Template Library
  TemplateLibraryModal, templateRegistry, buildTemplate, TEMPLATE_CATEGORIES, ALL_TAGS,
  // Advanced
  registerAdvancedFunctions,
} from '@/reporting';
```

---

## 4. صفحات الإعدادات — `resources/js/pages/settings/`

### 4.1 `PrintSettingsPage.tsx` (1430 سطر)

الصفحة الرئيسية لنظام الطباعة. تحتوي على:

- **Header:** اسم القالب editable inline، قائمة منسدلة لنوع المستند، حجم الورق، زر حفظ، undo/redo (Ctrl+Z/Y)
- **المعاينة:** `useDeferredValue` لمنع تعليق الـ slider، `PreviewSelector` مع toggle كلاسيكي/حديث
- **قائمة الجلسات:** 7 اكورديونات (رأس، مستند، بنود، مجاميع، تذييل، تنسيق، قواعد)
- **زر "جديد":** يفتح `TemplateLibraryModal`
- **شريط QuickNav:** IntersectionObserver يظلل القسم المرئي

```
PrintSettingsPage
├── Header (name, docType, paperSize, save/undo/redo/import/export)
├── Main (flex row)
│   ├── Left: Controls
│   │   ├── Accordion: HeaderSectionControls
│   │   ├── Accordion: DocumentSectionControls
│   │   ├── Accordion: ItemsSectionControls
│   │   ├── Accordion: TotalsSectionControls
│   │   ├── Accordion: FooterSectionControls
│   │   ├── Accordion: FormattingSectionControls
│   │   └── Accordion: RulesSection
│   └── Right: Preview
│       ├── Toolbar (zoom, classic/modern toggle, test data toggle)
│       └── ErrorBoundary
│           └── PreviewSelector
│               └── UniversalPreview / A4Preview / A5Preview / ReceiptPreview
└── TemplateLibraryModal (عند الضغط على "جديد")
```

### 4.2 `print-settings/sections/` — 7 مكونات

| الملف | المحتوى |
|-------|---------|
| `ToggleSwitch.tsx` | `Section` (اكورديون أساسي)، `Toggle` (مفتاح تشغيل/إيقاف)، `Slider` (منزلق) |
| `HeaderSection.tsx` | `show_logo`, `logo_size/align`, `show_company_name`, `company_name_text/size/bold/align/color`, `show_address/phone/tax_id/rc/nis/ice/article`, `company_info_align/size`, `override_*` fields |
| `DocumentSection.tsx` | `title_text/size/bold/align/color`, `show_doc_number/date/time/due_date/cashier/client/...`, `show_bank_details`, `bank_details_text`, `doc_separator` |
| `ItemsSection.tsx` | Column manager: `col_order`, `col_show`, `col_widths`, `col_headers`, `col_aligns`. Table formatting: `items_font_size/family`, `show_col_header`, `table_header_bold/bg/color`, `table_border_style`, `alternating_rows/color`, `price_display` |
| `TotalsSection.tsx` | `show_total_ht/tva/tva_breakdown/discount_total/fiscal_stamp/total_ttc`, `total_ttc_font_size/bold/color`, `total_border_style`, `show_amount_in_words/paid_amount/change/remaining` |
| `FooterSection.tsx` | `footer_line1/2/3`, `footer_separator`, `show_thank_you`, `thank_you_text/size/color`, `show_returns_policy`, `returns_policy_text`, `show_barcode`, `barcode_content`, `show_qr`, `qr_content`, `show_cashier_signature/client_signature/stamp` |
| `FormattingSection.tsx` | `paper_width_mm`, `page_orientation`, `margin_top/bottom/sides`, `base_font_size`, `font_family`, `line_spacing` |

### 4.3 `print-settings/api/printTemplatesApi.ts`

```
printTemplatesApi.list(docType?)        → GET /print-templates
printTemplatesApi.show(id)              → GET /print-templates/{id}
printTemplatesApi.create(tpl)           → POST /print-templates
printTemplatesApi.update(id, data)      → PUT /print-templates/{id}
printTemplatesApi.delete(id)            → DELETE /print-templates/{id}
printTemplatesApi.setDefault(id)        → POST /print-templates/{id}/set-default
printTemplatesApi.duplicate(id, name)   → POST /print-templates/{id}/duplicate
printTemplatesApi.library()             → GET /print-templates/library
printTemplatesApi.installLibrary(id)    → POST /print-templates/library/install

Hooks:
  usePrintTemplates(docTypeCode?)      ← useQuery
  usePrintTemplate(id)                 ← useQuery
  usePrintTemplateMutations()          ← useMutation (create, update, remove, setDefault, duplicate, installLibrary)
```

### 4.4 `print-settings/types.ts` — PrintTemplate (local copy)

يحتوي على نسخة محلية من نوع `PrintTemplate` تطابق النسخة canonical في `reporting/core/domain/PrintTemplate.ts` لكن مع أي تعديلات خاصة بالصفحة. يجب تعديل **كلا الملفين** عند إضافة خصائص جديدة.

### 4.5 `print-settings/components/PreviewSelector.tsx`

```
PreviewSelector
  Props: tpl, data, company?, useLegacy?, onTestPrint?
  
  if useLegacy && tpl.paper_size === 'A4' → A4Preview
  if useLegacy && tpl.paper_size === 'A5' → A5Preview
  if useLegacy && isThermal               → ReceiptPreview
  else → UniversalPreview
```

---

## 5. الـ PrintTemplate Type (شرح الخصائص)

### مجموعة خصائص الرأس (Header)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `show_logo` | boolean | عرض الشعار |
| `logo_size` | number | حجم الشعار بـ px |
| `logo_align` | 'right' | 'center' | 'left' | محاذاة الشعار |
| `logo_border_radius` | number | استدارة الشعار |
| `show_company_name` | boolean | عرض اسم الشركة |
| `company_name_text` | string | نص اسم الشركة (فارغ = استخدام الاسم الحقيقي) |
| `company_name_size` | number | حجم الخط |
| `company_name_bold` | boolean | عريض |
| `company_name_align` | AlignOption | محاذاة |
| `company_name_color` | string | لون الخط (#hex) |
| `show_address` / `show_phone` / `show_tax_id` / `show_rc` / `show_nis` / `show_ice` / `show_article` | boolean | إظهار معلومات الشركة |
| `company_info_align` | AlignOption | محاذاة معلومات الشركة |
| `company_info_size` | number | حجم خط معلومات الشركة |
| `override_address` / `override_phone` / ... | string | تجاوز معلومات الشركة |

### مجموعة خصائص المستند (Document)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `title_text` | string | نص العنوان (مثلاً "فاتورة بيع") |
| `title_size` / `title_bold` / `title_align` / `title_color` | — | تنسيق العنوان |
| `show_doc_number` / `show_date` / `show_time` / `show_due_date` | boolean | حقول المستند |
| `show_cashier` / `show_client` / `show_client_nif` / `show_client_phone` / `show_client_address` | boolean | معلومات الكاشير والعميل |
| `show_delivery_address` / `show_session` / `show_payment_term` | boolean | حقول إضافية |
| `show_bank_details` / `bank_details_text` | boolean + string | معلومات بنكية |
| `doc_separator` | BorderStyle | الفاصل بعد معلومات المستند |

### مجموعة الأعمدة (Columns)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `col_order` | ColumnKey[] | ترتيب الأعمدة (مثلاً `['ref','name','quantity','price','tva','total']`) |
| `col_show` | Record<ColumnKey, boolean> | إظهار/إخفاء كل عمود |
| `col_widths` | Record<ColumnKey, number> | عرض كل عمود بـ % |
| `col_headers` | Record<ColumnKey, string> | عنوان كل عمود |
| `col_aligns` | Record<ColumnKey, AlignOption> | محاذاة كل عمود |

### مجموعة الجدول (Table)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `items_font_size` | number | حجم خط الجدول |
| `items_font_family` | FontFamily | نوع الخط |
| `show_col_header` | boolean | عرض رؤوس الأعمدة |
| `table_header_bold` / `table_header_bg` / `table_header_color` | — | تنسيق رأس الجدول |
| `table_border_style` | BorderStyle | نمط الحدود |
| `alternating_rows` / `alternating_color` | boolean + string | تلوين الصفوف بالتناوب |
| `price_display` | PriceMode | عرض السعر (ht / ttc) |

### مجموعة المجاميع (Totals)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `show_total_ht` / `show_total_tva` / `show_tva_breakdown` | boolean | المجموع قبل الضريبة / TVA |
| `show_discount_total` / `show_fiscal_stamp` / `show_total_ttc` | boolean | الخصم / الطابع / المجموع النهائي |
| `total_ttc_font_size` / `total_ttc_bold` / `total_ttc_color` | — | تنسيق المجموع النهائي |
| `total_border_style` | BorderStyle | حد المجموع النهائي |
| `show_amount_in_words` | boolean | المبلغ كتابة |
| `show_paid_amount` / `show_change` / `show_remaining` | boolean | المبلغ المدفوع / الباقي |
| `show_prev_balance` / `show_new_balance` | boolean | الرصيد السابق / الجديد |

### مجموعة التذييل (Footer)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `footer_line1` / `footer_line2` / `footer_line3` | string | أسطر التذييل |
| `show_thank_you` / `thank_you_text` / `thank_you_size` / `thank_you_color` | — | رسالة شكر |
| `show_returns_policy` / `returns_policy_text` | boolean + string | سياسة الإرجاع |
| `show_barcode` / `barcode_content` | boolean + string | باركود |
| `show_qr` / `qr_content` | boolean + string | رمز QR (doc-number / both) |
| `show_cashier_signature` / `show_client_signature` / `show_stamp` | boolean | تواقيع |

### خصائص القواعد (Rules)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `rules` | ReportRule[] | مصفوفة قواعد: target, condition, action, priority |
| `show_header_section` / `show_doc_info_section` / `show_items_section` / `show_totals_section` / `show_payments_section` / `show_footer_section` | boolean | إظهار/إخفاء الأقسام |

### خصائص التقارير (Report)
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `show_report_header` / `report_header_text` | boolean + string | رأس التقرير |
| `show_report_footer` / `report_footer_text` | boolean + string | تذييل التقرير |
| `show_charts` / `chart_type` / `chart_title` | boolean + string | الرسوم البيانية |
| `group_by` / `sort_by` / `sort_direction` | string | التجميع والترتيب |
| `show_report_period` / `show_report_cashier` | boolean | الفترة والكاشير |
| `show_report_summary_cards` / `show_report_payment_breakdown` / `show_report_top_products` | boolean | بطاقات الملخص |

### خصائص إضافية
| الخاصية | النوع | الوصف |
|---------|-------|-------|
| `paper_width_mm` | number | عرض الورق بـ mm |
| `page_orientation` | PageOrientation | اتجاه الصفحة (portrait / landscape) |
| `margin_top` / `margin_bottom` / `margin_sides` | number | الهوامش بـ mm |
| `base_font_size` | number | حجم الخط الأساسي |
| `font_family` | FontFamily | نوع الخط (tajawal / cairo / ...) |
| `line_spacing` | number | تباعد الأسطر |

---

## 6. مواقع الملفات — دليل كامل

### 6.1 Framework (`resources/js/reporting/`)

| المسار | النوع | الدور |
|--------|-------|-------|
| `index.ts` | public API | كل الـ exports |
| `core/domain/PrintTemplate.ts` | type | نوع PrintTemplate canonical |
| `core/engines/FormulaEngine.ts` | engine | مُفسِّر تعابير |
| `core/engines/RulesEngine.ts` | engine | مُقيِّم قواعد |
| `core/engines/LayoutEngine.ts` | engine | حساب التخطيط |
| `core/theme/ThemeSystem.ts` | theme | سمات الألوان |
| `data/UniversalDocumentData.ts` | type | عقد البيانات |
| `data/DocumentDataBuilder.ts` | builder | بناء البيانات |
| `data/FieldRegistry.ts` | registry | 79 حقل |
| `data/CalculatedFieldService.ts` | service | 8 حقول محسوبة |
| `components/preview/UniversalPreview.tsx` | component | المعاينة الموحدة |
| `components/preview/shared.tsx` | helpers | دوال مساعدة |
| `components/shared/FormulaEditor.tsx` | component | محرر تعابير |
| `components/shared/TemplatePrintModal.tsx` | component | مودال الطباعة |
| `components/shared/RulesSection.tsx` | component | باني القواعد |
| `components/shared/ChartSection.tsx` | component | رسوم بيانية |
| `components/shared/PrintQueuePanel.tsx` | component | قائمة انتظار الطباعة |
| `renderers/IRenderer.ts` | interface | واجهة renderer |
| `renderers/CsvRenderer.ts` | renderer | تصدير CSV |
| `renderers/ExcelRenderer.ts` | renderer | تصدير Excel |
| `renderers/PrintJobQueue.ts` | service | قائمة انتظار الطباعة |
| `renderers/useExportDocument.ts` | hook | تصدير المستندات |
| `templates/library/registry.ts` | service | سجل القوالب |
| `templates/library/TemplateLibraryModal.tsx` | component | مودال المكتبة |
| `templates/library/categories.ts` | data | التصنيفات |
| `templates/library/types.ts` | type | أنواع المكتبة |
| `templates/library/constants.ts` | data | الثوابت |
| `templates/library/mockData.ts` | data | بيانات اختبار |
| `templates/library/config/PaperConfig.ts` | config | إعدادات الورق |
| `templates/library/config/TypographyConfig.ts` | config | إعدادات الخطوط |
| `templates/library/config/HeaderConfig.ts` | config | إعدادات الرأس |
| `templates/library/config/TableConfig.ts` | config | إعدادات الجدول |
| `templates/library/config/TotalsConfig.ts` | config | إعدادات المجاميع |
| `templates/library/config/FooterConfig.ts` | config | إعدادات التذييل |

### 6.2 الصفحات (`resources/js/pages/settings/`)

| المسار | النوع | الدور |
|--------|-------|-------|
| `PrintSettingsPage.tsx` | page | الصفحة الرئيسية (1430 سطر) |
| `print-settings/types.ts` | type | PrintTemplate (local copy) |
| `print-settings/api/printTemplatesApi.ts` | api hooks | API calls + React Query hooks |
| `print-settings/components/PreviewSelector.tsx` | component | مفتاح المعاينة |
| `print-settings/sections/ToggleSwitch.tsx` | components | Section, Toggle, Slider |
| `print-settings/sections/HeaderSection.tsx` | component | تحكمات الرأس |
| `print-settings/sections/DocumentSection.tsx` | component | تحكمات المستند |
| `print-settings/sections/ItemsSection.tsx` | component | تحكمات الجدول |
| `print-settings/sections/TotalsSection.tsx` | component | تحكمات المجاميع |
| `print-settings/sections/FooterSection.tsx` | component | تحكمات التذييل |
| `print-settings/sections/FormattingSection.tsx` | component | تحكمات التنسيق |
| `report-designer/ReportDesignerPage.tsx` | page | 28 سطر — placeholder فقط |

### 6.3 الـ POS و الطباعة الحرارية

| المسار | النوع | الدور |
|--------|-------|-------|
| `pages/pos/POSPage.tsx` | page | ~1400 سطر — الصفحة الرئيسية لنقاط البيع |
| `pages/pos/POSKioskPage.tsx` | page | ~800 سطر — kiosk (بدون عميل/توازن) |
| `pos/hooks/usePrintSettings.ts` | hook | يجلب إعدادات الطباعة |
| `pos/utils/printService.ts` | service | 601 سطر — WebUSB + window.print() + ترميز Win-1256 |
| `pos/utils/useReceiptRenderer.ts` | hook | يعرض الإيصال إلى HTML |
| `pos/components/ProfessionalReceipt.tsx` | component | مودال الإيصال بعد البيع |

### 6.4 الـ Laravel Backend

| المسار | النوع | الدور |
|--------|-------|-------|
| `app/Models/PrintTemplate.php` | model | مودل قالب الطباعة |
| `app/Models/Setting.php` | model | مودل الإعدادات |
| `app/Models/DocumentType.php` | model | أنواع المستندات |
| `app/Models/CommercialDocument.php` | model | المستندات التجارية |
| `app/Http/Controllers/Api/V1/PrintTemplateController.php` | controller | CRUD + library |
| `app/Services/TemplateLibraryService.php` | service | 3 قوالب مدمجة |
| `routes/api.php` | routes | جميع endpoints الـ API |

---

## 7. قواعد صارمة — ما يجب فعله وما يجب تجنبه

### ✅ مسموح — أضف ملفات هنا

| الغرض | المسار |
|-------|--------|
| مكون React جديد | `resources/js/reporting/components/` |
| Engine جديد | `resources/js/reporting/core/engines/` |
| نوع جديد | `resources/js/reporting/core/domain/` أو `templates/library/types.ts` |
| Config layer جديد | `resources/js/reporting/templates/library/config/` |
| Renderer جديد | `resources/js/reporting/renderers/` |
| Section تحكم جديد | `resources/js/pages/settings/print-settings/sections/` |
| API hooks جدد | `resources/js/pages/settings/print-settings/api/` |
| Service جديد (PHP) | `app/Services/` |
| Controller جديد (PHP) | `app/Http/Controllers/Api/V1/` |
| Migration جديد | `database/migrations/` |

### ❌ ممنوع — لا تلمس هذه الملفات

| المسار | السبب |
|--------|-------|
| `routes/web.php` | catch-all واحد `Route::get('/{any}', ...)` |
| `resources/js/App.tsx` | Root provider chain — لا يلمس إلا لإضافة Provider |
| `resources/js/routes/index.tsx` | مسارات SPA — لا يلمس إلا لإضافة Route |
| `resources/js/components/layouts/DashboardLayout.tsx` | 806 سطر — لا يلمس إلا لإضافة رابط NAV |
| `resources/js/lib/api/core/client.ts` | البنية التحتية للـ API |
| `resources/js/lib/api/core/types.ts` | 711 سطر — أنواع API العامة |
| `resources/js/lib/store/appStore.ts` | Zustand store |
| `resources/js/pages/settings/print-settings/future/` | ملفات قديمة — مرجع تاريخي فقط |
| أي ملف `.css` | كل الأنماط inline — لا نضيف CSS خارجي |

### ⚠️ احذر — يلمس بحذر

| المسار | الشرط |
|--------|-------|
| `resources/js/reporting/core/domain/PrintTemplate.ts` | فقط عند إضافة خصائص جديدة للـ template — يجب تعديل الملفين (هذا + `print-settings/types.ts`) |
| `resources/js/reporting/data/UniversalDocumentData.ts` | فقط عند إضافة حقول جديدة للمستند |
| `resources/js/reporting/index.ts` | أضف exports للمكونات الجديدة فقط — لا تحذف موجودًا |
| `app/Models/PrintTemplate.php` | فقط عند إضافة حقل جديد للجدول أو تغيير الـ casts |
| `routes/api.php` | فقط عند إضافة endpoint جديد |
| `resources/js/pages/settings/print-settings/types.ts` | حافظ على تطابقه مع `core/domain/PrintTemplate.ts` |

---

## 8. كيفية إضافة قالب جديد للمكتبة

### الخطوات (4 ملفات)

#### 1. Backend — `app/Services/TemplateLibraryService.php`
- أضف config array جديد إلى `$templates` (مع كل الخصائص)
- أضف metadata array إلى `getMetadata()`

#### 2. Frontend — `resources/js/reporting/templates/library/registry.ts`
- أضف `templateRegistry.register()` جديد مع `createMeta()` و `buildTemplate()`
- إذا كان نوع المستند جديدًا، استخدم `buildTemplate()` مع `overrides` المناسبة

#### 3. (اختياري) Config layer — `resources/js/reporting/templates/library/config/`
- أضف `TableConfig` / `TotalsConfig` / `FooterConfig` جديدة إذا اختلفت
- صدرها في `config/index.ts`

#### 4. (اختياري) تصنيف جديد — `categories.ts`
- أضف `categoryFromDocType()` mapping جديد إذا كان نوع المستند جديدًا

### التحقق من العمل

```bash
npm run build     # يجب أن يمر بـ 0 أخطاء
npm run lint      # يجب أن يمر
# لا تستخدم @ts-ignore أو @ts-expect-error
# لا تستخدم eval()
# كل الأنماط inline
```

---

## 9. ملخص عدّ الملفات

### 9.1 Framework (`reporting/`)

| القسم | العدد |
|-------|-------|
| Core | 5 ملفات |
| Data | 4 ملفات |
| Components | 8 ملفات |
| Renderers | 5 ملفات |
| Template Library | 12 ملف |
| **المجموع** | **34 ملف** |

### 9.2 الصفحات (`pages/settings/`)

| القسم | العدد |
|-------|-------|
| صفحات | 2 |
| Sections | 7 |
| Components | 1 |
| API | 1 |
| Types | 1 |
| **المجموع** | **12 ملف** |

### 9.3 الـ POS

| القسم | العدد |
|-------|-------|
| Pages | 2 |
| Hooks | 2 |
| Components | 1 |
| **المجموع** | **5 ملفات** |

### 9.4 Backend (PHP)

| القسم | العدد |
|-------|-------|
| Models | 5 |
| Controllers | 2 |
| Services | 1 |
| Routes | 1 |
| **المجموع** | **9 ملفات** |

### 9.5 المجموع الكلي

| القسم | العدد |
|-------|-------|
| **كل الملفات** | **~60 ملف** |

---

## 10. مخاطر معروفة

### 10.1 نسختان من PrintTemplate
- **المشكلة:** يوجد ملفان يعرّفان `PrintTemplate`: `core/domain/PrintTemplate.ts` (canonical) و `print-settings/types.ts` (local copy)
- **الخطر:** إضافة خاصية في ملف دون الآخر يؤدي إلى أخطاء TypeScript
- **الحل:** عند إضافة خاصية جديدة — عدّل **كلا الملفين** في نفس الـ commit

### 10.2 Template Library — Frontend/Backend انفصال
- **المشكلة:** القوالب المدمجة موجودة في مكانين: `registry.ts` (TypeScript) و `TemplateLibraryService.php` (PHP)
- **الخطر:** إضافة قالب جديد في أحدهما دون الآخر يؤدي إلى عدم تطابق
- **الحل:** عند إضافة قالب — عدّل **كلا الملفين** في نفس الـ commit

### 10.3 Dual Save (قديم)
- **المشكلة:** `PrintSettingsPage` يحفظ القالب في مكانين: `print_templates` table (API) و `settings` table (printStore)
- **الوضع الحالي:** هذا الخطر موجود في الكود القديم — النظام الجديد يستخدم API فقط
- **ملاحظة:** `printStore.ts` لا يزال يُستخدم من POS

### 10.4 الملفات القديمة في `future/`
- **المشكلة:** مجلد `future/` يحتوي 7 مجلدات قديمة ليست قيد الاستخدام
- **الخطر:** قد يحاول AI استيرادها أو تعديلها
- **الحل:** لا تلمس `future/` — محذوفة من الإنتاج

---

## 11. مراجع

| المرجع | المسار |
|--------|--------|
| وثيقة العمارة الكاملة (HTML) | `docs/erp_report_designer_adr.html` |
| وثيقة template library | `resources/js/reporting/docs/TEMPLATE_LIBRARY_ARCHITECTURE.md` |
| AGENTS.md (سياق الجلسات) | `AGENTS.md` |

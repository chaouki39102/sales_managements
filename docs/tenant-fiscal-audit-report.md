# تقرير تدقيق العزل بين الشركات والسنة المالية
# Tenant & Fiscal-Year Isolation Audit Report

**التاريخ / Date:** 2026-08-05
**النطاق / Scope:** جميع خدمات `app/Services` — فحص SQL الخام، الروابط بين الجداول، إغلاق السنة المالية، وتوافق قواعد البيانات (SQLite / MySQL)

---

## 1) الملخص التنفيذي / Executive Summary

تمت مراجعة كاملة لجميع استعلامات `DB::table(...)` الخام وروابط `join` في طبقة الخدمات، وتم إصلاح كل الفجوات المؤكدة التي كانت قد تسرّب بيانات بين الشركات، أو تكسر إغلاق السنة المالية، أو تعتمد على أعمدة/جداول غير موجودة فعلياً في قاعدة البيانات.

**النتائج / Results:**
- ✅ **52 اختبار Pest** (340 assertion) — نجحت كلها
- ✅ **222 اختبار Vitest** — نجحت كلها
- ✅ `npx tsc --noEmit` — نظيف
- ✅ `npm run build` — 0 أخطاء، 209 precache entries، **SW MATCH**
- ✅ `php -l` — نظيف على كل الملفات المعدّلة
- ✅ سموك إغلاق السنة المالية الكامل (في transaction مـُعاد تراجعه — صفر تلوث)

---

## 2) إصلاح إغلاق السنة المالية / Fiscal-Year Closure Fixes

**الملف / File:** `app/Services/Accounting/FiscalYearClosureService.php`

| الوظيفة / Method | المشكلة القديمة / Old Bug | الإصلاح / Fix |
|---|---|---|
| `validateBeforeClosure()` | استدعاء علاقة `journalEntries()` غير موجودة + فحص `status = 'draft'` على عمود غير موجود | حارس `Schema::hasTable('journal_entries')` + فحص الحالة عبر `whereHas('documentStatus', name='draft')` (جدول `document_statuses`) |
| `createNextFiscalYear()` | لم يكن يضبط `company_id`؛ إدراج سنة تالية موجودة مسبقاً يكسر القيد UNIQUE `(company_id, name)` | ضبط `company_id` + إعادة استخدام السنة التالية الموجودة (حدث فشل UNIQUE constraint حقيقي في سموك أول وتم إصلاحه) |
| `transferAccountBalances()` | الاعتماد على جدول `journal_entries` غير الموجود | حارس `Schema::hasTable` — لا يعمل (no-op) حتى تُثبَّت وحدة المحاسبة |
| `transferPartyBalances()` | فحص `status != cancelled` على عمود غير موجود؛ بدون `deleted_at` | join على `document_statuses ds` بـ `ds.name != 'cancelled'` + `company_id` + `whereNull('cd.deleted_at')` |
| `transferStockBalances()` | استعلام فرعي عابر للشركات: `stock_movement_type_id IN (SELECT id FROM stock_movement_types WHERE direction=1)` | join مُقيّد بالشركة: `on('smt.company_id','=','sm.company_id')` + `whereNull('sm.deleted_at')` |
| `transferTvaBalances()` | `dt.base_operation` + `cd.tva_amount` (أعمدة غير موجودة) | join عبر `document_base_operations dbo` بـ `dbo.name IN ('sale','purchase')` + `SUM(cd.total_tva)` |
| `transferForexDifferences()` | كان يشير إلى `exchange_rates.currency_id` غير الموجود و `$rateRecord->rate` | تحويله إلى no-op آمن مع `Log::info` (السقالة لا تنطبق على المخطط الحالي) |
| `transferTimbreFiscal()` | `timbre_fiscal_amount` (عمود غير موجود) | حارس `Schema::hasColumn('total_stamp')` + join `dbo` (sale) + `SUM(cd.total_stamp)` |
| **NEW** `transferTreasuryBalances()` | كان مفقوداً (مضاف الآن إلى `closeYear()`) | حساب رصيد الخزينة المبدئي للسنة الجديدة: الافتتاحي + الدفعات الواردة − الصادرة (confirmed only، `deleted_at` null)، upsert على `(company_id, fiscal_year_id, treasury_account_id)` |

**الملف المكرر / Dead Duplicate:** حُذف `app/Services/FiscalYearClosureService.php` القديم (نُسختنا المحفوظة في `storage/psr4-backup-20260613_122908/` فقط) — لا أي كود حي يشير إليه.

---

## 3) إصلاحات عزل الشركة في SQL الخام / Tenant-Isolation Fixes

**القاعدة / Rule:** جدول `stock_movement_types` خاص بكل شركة (`company_id`). أي `join` إليه من جدول حركات المخزون يجب أن يُقيّد بالشركتين معاً، وأن يتجاهل `deleted_at` (لأن `DB::table` لا يطبّق SoftDeletes تلقائياً).

| الملف / File | الموقع / Lines | الإصلاح / Fix |
|---|---|---|
| `ComputeLineService.php` | 171–197 | join مزدوج `on('smt.id',...)` + `on('smt.company_id','=','sm.company_id')` + `where('sm.company_id',...)` |
| `InventoryStockService.php` | 72–75 | نفس الـ join المزدوج المقيد بالشركة |
| `InventoryReportService.php` | 33، 80 | join مقيد بالشركة (`use $companyId`) |
| `ReportService.php` | 693، 1028، 2177، 2197 | join/leftJoin مزدوج مقيد بالشركة |
| `InventoryValuationService.php` | 38 | join مزدوج + `where('stock_movements.company_id', $product->company_id)` (PMP لم يعد يحسب حركات شركة أخرى بنفس product_id) |
| `Fiscal/IFUDeclarationService.php` | 258 | join مزدوج مقيد بالشركة |

**تم التحقق من سلامتها / Verified clean:**
- `CommercialDocumentService.php` (522، 1085، 1130) — كلها مُقيّدة بـ `company_id` (+ `fiscal_year_id` حيث يلزم)
- `PartyBalanceService.php` (كل 14 استعلام خام) — `company_id` + `fiscal_year_id` + `deleted_at` في كل مكان
- `CreditCheckService.php`، `TreasuryBalanceService.php`، `G50DeclarationService.php`، `CompanyService.php`، `OpeningBalanceStockService.php`، `BankReconciliationService.php`، `AlertEngine.php` — سليمة
- الاستعلامات النموذجية (Eloquent) محمية بآلية `CompanyScope` العامة عبر `HasCompany` trait (مؤكّد على `Party`، `CommercialDocument`، `Payment`، `CommercialDocumentLine`)

---

## 4) توافق قواعد البيانات / Cross-Driver (SQLite / MySQL) Portability

| الملف / File | المشكلة / Bug | الإصلاح / Fix |
|---|---|---|
| `CustomerInsightService.php` (`getAveragePaymentDays`) | `JULIANDAY()` خاص بـ SQLite فقط | فرع حسب المحرك: SQLite → `JULIANDAY`، MySQL → `DATEDIFF` |
| `G50DeclarationService.php` (`monthCondition`) | كان سليماً بالفعل (معياري) | — تحقّق فقط |

---

## 5) حقائق المخطط المؤكدة / Confirmed Schema Truths

التحقق تم بـ استعلامات معلومات مباشرة على قاعدة البيانات (`schema_probe*.php` في `Temp\opencode`):

- `commercial_documents`: لا يوجد `status`، `tva_amount`، `timbre_fiscal_amount` — يوجد `document_status_id`، `total_tva`، `total_stamp`، `remaining_amount`، `is_locked`، `deleted_at`
- `journal_entries` / `journal_entry_lines` / `opening_balances_accounts`: **غير موجودة** (وحدة المحاسبة ليست مثبتة)
- `fiscal_year_carry_forward`: موجودة بأعمدة `category`، `amount`، `amount_dzd`، `source_fiscal_year_id`
- `stock_movement_types`: خاص بالشركة (`company_id`، `direction`)
- `payments`: لا يوجد `payment_type`؛ يوجد `direction`، `status`، `treasury_account_id`
- `fiscal_years`: لا يوجد `deleted_at`؛ قيد UNIQUE `(company_id, name)`
- `exchange_rates`: `from_currency_id` / `to_currency_id` / `rate_date` (لا يوجد `currency_id`)
- `opening_balances_stock/parties/treasury`: كلها تحمل `company_id` + `fiscal_year_id`
- قاعدة البيانات: 1 شركة، سنتان ماليتان (2026 حالي، 2027 موجودة)

---

## 6) منهجية التحقق / Verification Methodology

1. **فحص سموك مدمج (تلوث صفري):** `closure_smoke.php` (كل طرق النقل السبعة + `validateBeforeClosure`) ثم `closure_full_smoke.php` — كلاهما داخل `DB::beginTransaction()` ثم `rollBack()`.
   - `FULL closeYear OK -> new year 2027 (id 2) company 1 is_current=true / old is_closed=true`
2. **Pest:** `vendor\bin\pest.bat` — 52 passed (340 assertions)
3. **TypeScript:** `npx tsc --noEmit` — clean
4. **Vitest:** `npm test` — 222/222
5. **Build + PWA:** `npm run build` — 0 errors، 209 precache entries، `root sw == build sw` (**SW MATCH**)
6. **PHP syntax:** `php -l` — نظيف على كل الملفات المعدّلة

---

## 7) أعمال معلّقة (غير مانعة) / Remaining (Non-blocking)

- `transferForexDifferences()` و `transferAccountBalances()` معطّلتان مؤقتاً (no-op) بانتظار تثبيت وحدة المحاسبة/سجل الصرف — التصميم محفوظ في الملف مع التعليقات.
- `transferAdvanceBalances()` تبقى no-op لأن جدول `payments` لا يحتوي `payment_type` — قابلة للتفعيل عند إضافة هذا العمود.
- جدول `ExchangeRate` في `fiscal_year_carry_forward` يحمل أعمدة جاهزة (`from/to`) — يمكن تفعيل ترحيل فرق الصرف لاحقاً عبر `amount_dzd`.

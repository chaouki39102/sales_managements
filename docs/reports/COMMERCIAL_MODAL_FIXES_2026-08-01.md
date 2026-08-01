# تقرير إصلاح نافذة المستندات التجارية / Commercial Document Modal Fixes Report

> **التاريخ / Date:** 2026-08-01
> **النطاق / Scope:** نافذة المستندات التجارية (الواجهة + الخلفية) / Commercial document modal (frontend + backend)
> **الحالة / Status:** ✅ مكتمل وتم التحقق منه / Completed & verified

---

## الملخص التنفيذي / Executive Summary

تم اكتشاف وإصلاح مجموعة من الأخطاء المتعلقة بـ **رصيد الطرف (Solde)** و **الطابع الجبائي (Fiscal Stamp)** داخل نافذة إنشاء/تعديل المستندات التجارية، بالإضافة إلى إزالة إعداد مكرّر.

Several bugs were found and fixed in the commercial document modal concerning the **party balance (Solde)** and the **fiscal stamp**, along with the removal of a duplicated setting.

| البند / Item | المشكلة / Problem | الإصلاح / Fix |
|---|---|---|
| رصيد الطرف / Party balance | الدفعات تُخصم مرّتين في مستندات الشراء / Payments subtracted twice on purchase docs | الدفعات موقّعة حسب الاتجاه / Payments signed by direction |
| الطابع الجبائي / Fiscal stamp | المعاينة لا تُظهره بينما التقرير يضيفه / Preview vs saved doc mismatch | إعداد عالمي واحد + محاذاة المعاينة / Single global setting + aligned preview |
| إعداد مكرّر / Duplicate setting | مفتاحان لنفس الخيار / Two toggles for the same option | إزالة `default_apply_stamp` بالكامل / Fully removed |

---

## الجزء الأول: رصيد الطرف (Solde) / Part 1: Party Balance

### المشكلة / The Problem

في مستندات الشراء (Purchases)، كان رصيد الطرف يظهر **مخصوماً مرّتين**:
- مرة واحدة من قيمة المستند (الوثيقة نفسها تُقلّل الرصيد لأنها دين علينا).
- ومرة ثانية من قيمة الدفعة المدفوعة للمورّد (لأن جميع الدفعات كانت تُخصم بلا تمييز).

> In purchase documents, the party balance appeared **subtracted twice**: once by the document itself, and a second time by the outgoing payment (because all payments were unconditionally subtracted).

### السبب الجذري / Root Cause

`PartyBalanceService::getBalanceAt()` كان يخصم **مجموع** جميع الدفعات دائماً:

```php
// قبل / Before — خطأ
$paymentsAdjustment = $paymentsTotal; // يُخصم دائماً / always subtracted ❌
```

لكن مستند الشراء (`net_to_pay`) يُضاف للإجمالي بإشارة سالبة أصلاً، فدفعة الشراء الخارجة (`out`) يجب أن **تُضاف** إلى الرصيد (تُقلّل ديننا للمورّد).

> The service always subtracted the **total** of all payments. But a purchase document already contributes a negative `net_to_pay` to the balance, so an outgoing (`out`) purchase payment must **add back** to the balance.

### الإصلاح / The Fix

في `app/Services/PartyBalanceService.php` — أصبحت الدفعات موقّعة حسب الاتجاه:

```php
// بعد / After — صحيح
"COALESCE(SUM(CASE WHEN direction = 'out' THEN amount ELSE -amount END), 0) as adjustment"
// in  (دفعة مستلمة) → تُخصم من الرصيد
// out (دفعة مدفوعة) → تُضاف إلى الرصيد
// null (قديمة)     → تُعامَل كـ in للمحافظة على السلوك السابق
```

طُبّق الإصلاح في **موضعين** للحفاظ على التطابق:
- `getBalanceAt()` (مفرد / single).
- `getAllBalancesAt()` (دفعة / batch).

The fix was applied in **two places** to keep them consistent:
- `getBalanceAt()` (single party).
- `getAllBalancesAt()` (batch).

### صيغ التوازن الصحيحة / Correct Balance Formulas

| الحالة / Case | قبل الإصلاح / Before | بعد الإصلاح / After |
|---|---|---|
| بيع (`in` payment) / Sale | `+doc − payments` | `+doc − payment` |
| شراء (`out` payment) / Purchase | `−doc − payment` ❌ | `−doc + payment` ✅ |
| شراء قديم (`null` direction) / Legacy purchase | `−doc − payment` ❌ | `−doc − payment` (محفوظ) |

---

## الجزء الثاني: الطابع الجبائي / Part 2: Fiscal Stamp

### المشكلة / The Problem

قال المستخدم: **"في التقرير أجد الكلفة + 1%، لكن في إجماليات النافذة لا يظهر"** — أي أن المعاينة في النافذة لا تُظهر الطابع الجبائي بينما المستند المحفوظ/التقرير يضيف 1%.

> The user reported: **"in the report I find the cost + 1%, but it doesn't show in the modal totals"** — the modal preview omitted the stamp while the saved document/report added 1%.

### السبب الجذري / Root Cause

كان `apply_stamp` **معاينة فقط** (Preview-only):

1. الصندوق الموجود في `DocumentTotalsSection` كان يُغيّر فقط حساب المعاينة المحلية.
2. `buildPayload()` لم يرسل `apply_stamp` أبداً — ولا يوجد عمود في قاعدة البيانات له.
3. مسارات إعادة الحساب الثلاثة في الخلفية (`recalculateTotals`، مراقب `saving`، `recalculateParentDocument`) كلها تستخدم الإعداد العالمي `fiscal_stamp_enabled` فقط.

النتيجة: عندما يكون إعداد "تفعيل الطابع الجبائي تلقائياً" (`default_apply_stamp`) **مغلقاً**، تُخفي المعاينة الطابع، لكن المستند المحفوظ **يضيفه دائماً** (لأن الإعداد العالمي مفعّل).

> `apply_stamp` was **preview-only**:
> 1. The modal checkbox only affected the local preview calculation.
> 2. `buildPayload()` never sent `apply_stamp` — no DB column existed.
> 3. All three backend recalc paths use only the global `fiscal_stamp_enabled`.
>
> Result: when the "apply stamp automatically" (`default_apply_stamp`) toggle was **off**, the preview hid the stamp, but the saved doc always added it.

### القرار / The Decision

بعد سؤال المستخدم — **إعداد عالمي واحد فقط**:
> One global setting only (user's decision).

- الإبقاء على `fiscal_stamp_enabled` في إعدادات الضرائب / Settings → Fiscal tab.
- **حذف** التبديل اليدوي لكل مستند + حذف إعداد `default_apply_stamp`.

### التغييرات / The Changes

**الواجهة / Frontend:**
- `DocumentTotalsSection.tsx` — حذف صندوق "الطابع الجبائي" وprop الـ `stampEnabled`.
- `useDocumentForm.ts` — إزالة `apply_stamp` من `buildDefaultForm`، `buildPayload`، تأثيرات (effects)، و`set()`؛ المعاينة تستخدم الآن علامة `stampEnabled` (وهي `fiscal_stamp_enabled` العالمي).
- `types/document.types.ts` — حذف `apply_stamp` من `DocumentFormState`.
- `index.tsx` / `CommercialDocumentPage.tsx` — تمرير `stampEnabled` الجديد من الإعداد العالمي.
- `SettingsPage.tsx` — حذف مفتاح "تفعيل الطابع الجبائي تلقائياً" من تبويب المستندات + كل حالاته.

**الخلفية / Backend:**
- `SettingController.php` — إزالة `default_apply_stamp` من قائمة المفاتيح المسموحة.
- `SettingsSeeder.php` — إزالة بند `default_apply_stamp`.
- Migration جديد `2026_08_01_164020_remove_default_apply_stamp_setting.php` — حذف أي صفوف متبقية من جدول `settings`.

**محاذاة المعاينة / Preview alignment:**
- `DocumentComputeController::computeTotals` — عندما لا يرسل العميل `apply_stamp`، يُستخدم `fiscal_stamp_enabled` للشركة تلقائياً (بدل `false`)، فلا تختلف المعاينة عن `total_stamp` المحفوظ أبداً.

> **Backend:** removed `default_apply_stamp` from the allowed-keys whitelist, from the seeder, and a migration deletes leftover rows. The compute-preview endpoint now defaults `apply_stamp` to the company's `fiscal_stamp_enabled` so the preview always matches the saved `total_stamp`.

---

## الجزء الثالث: تدقيق إضافي / Part 3: Additional Audit

تم فحص سلاسل الحسابات التالية للتحقق من تطابق الإشارات بعد الإصلاح — ولم تظهر أخطاء إضافية:

The following calculation chains were audited for sign consistency after the fix — no further bugs found:

| الفحص / Check | النتيجة / Result |
|---|---|
| اتجاه الدفعات / `ResolvesPaymentDirection` (شراء→`out`, بيع→`in`) | ✅ متسق / Consistent |
| لقطات الرصيد / `persistBalanceSnapshots` (write-once) | ✅ متسق مع `attachBalanceData` |
| رصيد المستقبل / `futureBalance` في `DocumentTotalsSection` | ✅ بيع/شراء متطابقان / Sale/purchase symmetric |
| سجل المعاملات / `getHistory` | ✅ الإشارة صحيحة / Sign correct |
| الرصيد الدفعي / `getAllBalancesAt` merge loop | ✅ يستخدم `adjustment` |
| `paid_amount` / `remaining_amount` عبر `PaymentSynchronizer` | ✅ لا يتجاوزان صفراً / Never negative |

---

## الملفات المعدّلة / Files Modified

**الخلفية / Backend**
- `app/Services/PartyBalanceService.php`
- `app/Http/Controllers/Api/V1/SettingController.php`
- `app/Http/Controllers/Api/V1/DocumentComputeController.php`
- `database/seeders/SettingsSeeder.php`
- `database/migrations/2026_08_01_164020_remove_default_apply_stamp_setting.php` (جديد / new)

**الواجهة / Frontend**
- `resources/js/pages/documents/hooks/useDocumentForm.ts`
- `resources/js/pages/documents/hooks/useCommercialDocumentController.ts`
- `resources/js/pages/documents/types/document.types.ts`
- `resources/js/pages/documents/CommercialDocumentModal/DocumentTotalsSection.tsx`
- `resources/js/pages/documents/CommercialDocumentModal/index.tsx`
- `resources/js/pages/documents/CommercialDocumentPage.tsx`
- `resources/js/pages/settings/SettingsPage.tsx`

---

## التحقق / Verification

| الفحص / Check | النتيجة / Result |
|---|---|
| `npx tsc --noEmit` | ✅ نظيف / Clean |
| `npm test` | ✅ 174/174 |
| `npm run build` | ✅ 0 أخطاء / 0 errors |
| `php artisan test` | ✅ 3 passed (35 assertions) |
| `php -l` (كل ملفات PHP) / (all PHP files) | ✅ نظيف / Clean |
| `php artisan migrate` | ✅ نُفّذ / Applied |
| Service Worker | ✅ SW MATCH |

---

## مفتاح القواعد المعمارية / Key Architectural Rules

1. **الرصيد SSOT:** أي رصيد معروض يجب أن يأتي من `PartyBalanceService` — لا تُشتق الإشارات في مكانين.
   > Any displayed balance must come from `PartyBalanceService` — never derive signs in two places.

2. **الدفعات موقّعة:** `in` تُخصم، `out` تُضاف، `null` (قديم) تُعامَل كـ `in`.
   > Payments are signed: `in` subtracts, `out` adds, legacy `null` treated as `in`.

3. **إعداد عالمي واحد:** الطابع الجبائي يخضع فقط لـ `fiscal_stamp_enabled` — لا توجد مفاتيح مكررة.
   > One global setting: the stamp is gated only by `fiscal_stamp_enabled` — no duplicated keys.

4. **المعاينة = الحفظ:** أي نقطة حساب معاينة يجب أن تحاكي منطق الحفظ بدقة.
   > Preview = save: any preview calculation must mirror the save logic exactly.

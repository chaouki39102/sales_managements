# ترقية محرر المستندات: صلاحيات متعددة المستخدمين + سير عمل الموافقات

> تاريخ الإنشاء: 2026-09-03
> النطاق: نظام RBAC كامل + سير عمل الموافقات + قيود على مستوى الحقول + حماية المخزون

---

## المشكلة الحالية

### ما يوجد الآن
- **الصلاحيات معرّفة**: 8 صلاحيات للمستندات (`view/create/update/delete/validate/lock/cancel/view_any`)
- **الأدوار معرّفة**: owner, admin, manager, member, viewer (per company)
- **السياسة موجودة**: `CommercialDocumentPolicy` — لكنها فقط تتحقق من صلاحيات النصية

### الثغرات الحرجة
| الثغرة | التأثير |
|--------|---------|
| لا يوجد `created_by` | لا نعرف من أنشأ المستند |
| لا يوجد `updated_by` | لا نعرف من آخر من عدّله |
| التحقق التلقائي | المستند يتحول من `draft` → `validated` مباشرة عند الإنشاء — لا يوجد مراجعة |
| لا توجد قيود على مستوى الحقول | الكاشير يمكنه تغيير الأسعار والخصومات وعدد التكاليف |
| لا توجد حدود المبالغ | أي شخص بصلاحية `update` يمكنه تعديل فاتورة بمليون دينار |
| المخزون لا يُسترجع عند الإلغاء | `cancel()` لا يعكس حركات المخزون |
| لا يوجد حماية من التعديل المتزامن | شخصان يمكنهما تعديل المستند نفسّه في نفس الوقت |

---

## المخطط التنفيذي — 15 مهمة

> **حالة عامة (آخر تحديث: 2026-09-05):** المهام 1–13 مكتملة ومُدفوعة على `main`. المهمتان 14–15 (مجموعة د) حماية عالية المخاطر — يمكن تأجيلهما لما بعد الإطلاق.

---

### المجموعة أ: التأسيس (4 مهام)

#### المهمة 1 — تتبع المالكين: `created_by` + `updated_by` **[مكتملة — `d45c0b3`]**
**الأولوية**: عالية | **المخاطر**: منخفضة

**الخلفية**: الآن فقط `validated_by` موجود (يُكتب تلقائياً عند الإنشاء). لا نعرف من أنشأ المستند أصلاً أو من عدّله لاحقاً.

**التنفيذ**:
1. Migration جديدة تضيف `created_by` (FK → users, nullable) + `updated_by` (FK → users, nullable) إلى `commercial_documents`
2. `CommercialDocument::boot()` — `creating` event يملأ `created_by = auth()->id()` (إذا كان المستخدم مسجلاً — أكواد الـ POS قد لا يكون هناك auth)
3. `CommercialDocumentService::update()` — يملأ `updated_by = auth()->id()` قبل الحفظ
4. `CommercialDocumentResource` يُرجع `created_by_user` + `updated_by_user` (Relationship → User)
5. الواجهة: إظهار "أنشأه: أحمد" + "آخر تعديل: فاطمة" في شريط المعلومات السفلي للمستند

**الملفات المتأثرة**:
- `database/migrations/2026_09_03_000001_add_owner_tracking_to_commercial_documents.php` (جديد)
- `app/Models/CommercialDocument.php`
- `app/Services/CommercialDocumentService.php`
- `app/Http/Resources/CommercialDocumentResource.php`

---

#### المهمة 2 — مسجّل التدقيق المحسّن: `DocumentAuditLog` **[مكتملة — `b1e9564` + `e6e26f4`]**
**الأولوية**: عالية | **المخاطر**: منخفضة

**الخلفية**: نظام التدقيق العام (`DataAuditSubscriber`) يسجّل كل التغييرات على كل النماذج، لكن لا يوجد تفاصيل محددة للمستندات (من غيّر أيّ سطر؟ غيّر أيّ مبلغ؟).

**التنفيذ**:
1. Migration: جدول `document_audit_logs`
   - `document_id`, `company_id`, `user_id`
   - `action` (enum: created, updated, line_added, line_removed, line_modified, price_changed, discount_changed, status_changed, locked, unlocked, cancelled, deleted, payment_added, payment_removed, converted, returned, cloned)
   - `field_name` (nullable — اسم الحقل المُغيّر)
   - `old_value` / `new_value` (nullable JSON)
   - `ip_address`, `user_agent`
2. `DocumentAuditSubscriber` (جديد) — يستمع فقط لأحداث `CommercialDocument` و `CommercialDocumentLine` و `Payment`
3. Observer محسّن على `CommercialDocumentLine` يسجّل تغييرات الأسعار والخصومات
4. API endpoint: `GET /documents/{id}/audit-log` (يحتاج `view_commercial_document`)
5. واجهة: صفحة سجل التدقيق في النافذة الجانبية للمستند (Timeline UI)

**الملفات المتأثرة**:
- `database/migrations/2026_09_03_000002_create_document_audit_logs_table.php` (جديد)
- `app/Models/DocumentAuditLog.php` (جديد)
- `app/Listeners/DocumentAuditSubscriber.php` (جديد)
- `app/Http/Controllers/Api/V1/CommercialDocumentController.php` (+endpoint)
- `resources/js/pages/documents/components/DocumentAuditPanel.tsx` (جديد)

---

#### المهمة 3 — تحديث الصلاحيات المعرّفة في Spatie **[مكتملة — `7afcd34`]**
**الأولوية**: عالية | **المخاطر**: منخفضة

**الخلفية**: الصلاحيات الحالية (8) غير كافية. نحتاج صلاحيات أدق.

**التنفيذ**:
1. تعريف الصلاحيات الجديدة في `GlobalRolesAndPermissionsSeeder`:

   | الصلاحية | الوصف | البريد |
   |----------|-------|--------|
   | `view_any_commercial_document` | عرض قائمة المستندات | viewer+ |
   | `view_commercial_document` | عرض تفاصيل مستند | viewer+ |
   | `create_commercial_document` | إنشاء مستند جديد | member+ |
   | `update_own_commercial_document` | تعديل مستند أنشأه هو | member+ |
   | `update_any_commercial_document` | تعديل مستند أي شخص | manager+ |
   | `delete_own_commercial_document` | حذف مستند أنشأه هو | member+ |
   | `delete_any_commercial_document` | حذف مستند أي شخص | admin+ |
   | `validate_commercial_document` | تأكيد/اعتماد مستند | manager+ |
   | `lock_commercial_document` | قفل مستند | manager+ |
   | `unlock_commercial_document` | فتح قفل مستند | admin+ |
   | `cancel_commercial_document` | إلغاء مستند | manager+ |
   | `clone_commercial_document` | نسخ مستند | member+ |
   | `return_commercial_document` | إنشاء مستند إرجاع | manager+ |
   | `convert_commercial_document` | تحويل مستند | manager+ |
   | `apply_discount_commercial_document` | تطبيق خصم | manager+ |
   | `change_price_commercial_document` | تغيير سعر الوحدة | manager+ |
   | `override_stock_commercial_document` | بيع بمخزون سالب | admin+ |
   | `view_cost_price` | رؤية تكلفة الشراء | manager+ |
   | `add_payment_commercial_document` | إضافة دفعة | member+ |
   | `print_commercial_document` | طباعة مستند | viewer+ |

2. `CompanyRoleService::seedRoles()` يحدّث الأدوار:
   - **viewer**: `view_any/view/print`
   - **member**: + `create + update_own/delete_own/clone/add_payment`
   - **manager**: + `update_any/delete_any/validate/lock/cancel/return/convert/apply_discount/change_price/view_cost_price`
   - **admin**: + `unlock/override_stock`
   - **owner**: كل الصلاحيات

3. حفظ الصلاحيات القديمة كنسخة احتياطية (لا نحذف `update_commercial_document` — نضيف الجديدة بجانبه للتوافق)

**الملفات المتأثرة**:
- `database/seeders/GlobalRolesAndPermissionsSeeder.php`
- `database/seeders/CompanyRoleService.php`
- `database/seeders/RolesAndPermissionsSeeder.php`

---

#### المهمة 4 — تحديث `CommercialDocumentPolicy` بمنطق ملكية + صلاحيات جديدة **[مكتملة — `a270f29`]**
**الأولوية**: عالية | **المخاطر**: متوسطة

**الخلفية**: الآن `CommercialDocumentPolicy` يتحقق فقط من صلاحية نصية. لا يوجد فرق بين "مستندي" و"مستند شخص آخر".

**التنفيذ**:
1. `CommercialDocumentPolicy` يُعاد كتابته بالكامل:

```php
// أمثلة على المنطق الجديد:
public function viewAny(User $user) {
    return $user->can('view_any_commercial_document');
}

public function view(User $user, CommercialDocument $doc) {
    if ($user->can('view_commercial_document')) return true;
    if ($user->can('view_any_commercial_document')) return true;
    return false;
}

public function update(User $user, CommercialDocument $doc) {
    if ($doc->is_locked) return false;
    if ($user->can('update_any_commercial_document')) return true;
    if ($user->can('update_own_commercial_document') && $doc->created_by === $user->id) return true;
    return false;
}

public function delete(User $user, CommercialDocument $doc) {
    if ($doc->is_locked) return false;
    if ($user->can('delete_any_commercial_document')) return true;
    if ($user->can('delete_own_commercial_document') && $doc->created_by === $user->id) return true;
    return false;
}

public function validate(User $user, CommercialDocument $doc) {
    return $user->can('validate_commercial_document');
}

// ... باقي الدوال بنفس النمط
```

2. `CommercialDocumentController` — تحديث `authorizeAction()` ليمرر المستند في كل الأماكن
3. Controllers الفرعية (`DocumentReturnService`, `DocumentConversionService`) — التحقق من الصلاحيات قبل التحويل/الإرجاع

**الملفات المتأثرة**:
- `app/Policies/CommercialDocumentPolicy.php`
- `app/Http/Controllers/Api/V1/CommercialDocumentController.php`
- `app/Http/Controllers/Api/V1/CommercialDocumentReturnController.php` (إن وُجد)

---

### المجموعة ب: سير عمل الموافقات (4 مهام)

#### المهمة 5 — حالات المستند: `draft` → `pending_approval` → `validated` → `locked` **[متبقية — يُنصح بالتأجيل لما بعد الإطلاق]**
**الأولوية**: عالية | **المخاطر**: متوسطة

**الخلفية**: الآن المستند يتحول تلقائياً إلى `validated` عند الإنشاء. لا يوجد طريقة للمراجعة.

**التنفيذ**:
1. إضافة حالات جديدة في `document_statuses` seeded:
   - `draft` (مسودة — لا يؤثر على المخزون)
   - `pending` (بانتظار الموافقة)
   - `validated` (معتمد — يُفعّل المخزون والمحاسبة)
   - `locked` (مقفل)
   - `cancelled` (ملغى)

2. **تغيير جذري في `CommercialDocumentService::create()`**:
   - **الآن**: الإنشاء يضبط `validated` مباشرة + ينشئ حركات المخزون
   - **الجديد**: الإنشاء يضبط `draft` + **لا ينشئ حركات المخزون**
   - حركات المخزون + Snapshots + Fiscal Stamp تُنشأ فقط عند التأكيد (`draft → validated`)

3. **الإعداد**: خيار `require_document_approval` في الإعدادات (boolean). إذا `false` — السلوك الحالي (إنشاء = تأكيد فوراً). إذا `true` — إنشاء = مسودة.

4. **REST API**:
   - `POST /documents/{id}/submit` — يُرسل من `draft` إلى `pending`
   - `POST /documents/{id}/approve` — يُعتمد من `pending` إلى `validated` (يُنشئ المخزون + المحاسبة)
   - `POST /documents/{id}/reject` — يُرفض من `pending` إلى `draft` مع ملاحظة

**الملفات المتأثرة**:
- `app/Services/CommercialDocumentService.php` — `create()`, `approve()`, `submit()`, `reject()`
- `app/Services/CommercialDocumentLineService.php` — حركات المخزون تتأخر إلى `approve()`
- `app/Http/Controllers/Api/V1/CommercialDocumentController.php` — endpoints جديدة
- `routes/api.php`
- `database/seeders/SettingsSeeder.php` — `require_document_approval`
- `resources/js/pages/documents/components/DocumentStatusButton.tsx` (جديد — أزرار الإرسال/الموافقة/الرفض)

---

#### المهمة 6 — حدود الموافقة حسب المبلغ **[متبقية — تُنفَّذ مع المهمة 5]**
**الأولوية**: متوسطة | **المخاطر**: منخفضة

**الخلفية**: جدول `ApprovalThreshold` موجود لكن غير مستخدم.

**التنفيذ**:
1. `ApprovalThreshold` columns: `min_amount`, `max_amount`, `role` (الحد الأدنى والأقصى للمبلغ لكل دور)
2. في `approve()`: التحقق من أن المستخدم يملك دوراً يُغطي مبلغ المستند
   - مثال: `manager` يُعتمد حتى 500,000 DZD، `admin` يُعتمد أي مبلغ
3. إذا تجاوز المبلغ الحد — الرفض برسالة: "مبلغ المستند ({amount}) يتجاوز صلاحية دورك ({role}: حتى {max})"
4. واجهة: عرض "حد الموافقة" في شريط المعلومات السفلي للمستند

**الملفات المتأثرة**:
- `app/Models/ApprovalThreshold.php` (يحتاج تطوير)
- `app/Services/CommercialDocumentService.php` — `approve()`
- `database/migrations/` — قد يحتاج تعديلات على الجدول

---

#### المهمة 7 — زر الإرسال + الموافقة في واجهة المستند **[متبقية — تُنفَّذ مع المهمة 5]**
**الأولوية**: عالية | **المخاطر**: منخفضة

**الخلفية**: الواجهة تحتاج أزرار جديدة لسير عمل الموافقات.

**ال التنفيذ**:
1. **شريط الحالة المحسّن** (`DocumentStatusPill` في `DocumentTopbar.tsx`):
   - أزرار: "إرسال للموافقة" (عند `draft`) / "اعتماد" (عند `pending` + يملك الصلاحية) / "رفض" (عند `pending` + يملك الصلاحية)
   - لون: رمادي (draft) → برتقالي (pending) → أخضر (validated) → أزرق (locked) → أحمر (cancelled)

2. **نافذة الموافقة** (`ApprovalDialog.tsx`):
   - تُفتح عند الضغط على "اعتماد"
   - تُظهر: اسم المستخدم، مبلغ المستند، حد الصلاحية، حقل ملاحظات اختياري
   - أزرار: "اعتماد ✓" + "رفض ✗"

3. **قائمة المستندات** (`CommercialDocumentsPage.tsx`):
   - فلتر جديد: "بانتظار الموافقة" (عدد غير مُعتمد)
   - عمود "أنشأه" + "آخر تعديل"

4. **تنبيهات**: إشعار للمدير عندما يُرسل كاشير مستنداً للموافقة

**الملفات المتأثرة**:
- `resources/js/pages/documents/CommercialDocumentModal/DocumentTopbar.tsx`
- `resources/js/pages/documents/components/DocumentStatusButton.tsx` (جديد)
- `resources/js/pages/documents/CommercialDocumentsPage.tsx`
- `resources/js/components/ui/ApprovalDialog.tsx` (جديد)

---

#### المهمة 8 — حماية المخزون: تعليق الحركات حتى التأكيد **[متبقية — تُنفَّذ مع المهمة 5]**
**الأولوية**: عالية | **المخاطر**: متوسطة

**الخلفية**: الآن `afterCreate` ينشئ حركات المخزون فوراً. مع سير عمل الموافقة، يجب تأخيرها.

**التنفيذ**:
1. `CommercialDocumentService::createDocumentLines()` — **لا** تنادي `createStockMovements()` إذا الحالة = `draft`
2. `CommercialDocumentService::approve()` (المهمة 5) — تنادي:
   - `createStockMovements()` — إنشاء حركات المخزون
   - `persistBalanceSnapshots()` — تجميد Snapshots
   - `FiscalStampCalculator::calculate()` — الختم الجبائي
   - التحقق من توفر المخزون (`assertStockAvailable`)
3. `CommercialDocumentService::reject()` — لا يفعل شيئاً (لم يُنشأ شيء)
4. **الحماية**: حركات المخزون = ZERO للمستندات `draft` أو `pending`

**الملفات المتأثرة**:
- `app/Services/CommercialDocumentService.php` — `createDocumentLines()`, `approve()`, `reject()`
- `app/Services/TransactionIntegrityService.php` — قد يحتاج تعديل للتحقق من الحالة

---

### المجموعة ج: قيود على مستوى الحقول + حدود المبالغ (4 مهام)

#### المهمة 9 — "هل أستطيع رؤية التكلفة؟" — `view_cost_price` **[مكتملة — `c43bc4f`]**
**الأولوية**: عالية | **المخاطر**: منخفضة

**الخلفية**: الآن `cost_price_ht` ظاهرة لكل من يملك `view_commercial_document`. الكاشير لا يحتاج أن يرى تكلفة الشراء.

**التنفيذ**:
1. `CommercialDocumentLineResource` — إذا المستخدم لا يملك `view_cost_price`، يُعيد `cost_price_ht: null`
2. `DocumentLineRow.tsx` + `LineCard.tsx` — إخفاء عمود التكلفة + هامش الربح إذا لا توجد صلاحية
3. `ReportService` — لا يُرجع `cost_price_ht` إذا لا توجد صلاحية
4. الواجهة: إخفاء كل مراجع التكلفة (عمود التكلفة، هامش الربح، Cost Summary في التقارير)

**الملفات المتأثرة**:
- `app/Http/Resources/CommercialDocumentLineResource.php`
- `resources/js/pages/documents/components/DocumentLineRow.tsx`
- `resources/js/pages/documents/components/LineCard.tsx`
- `app/Services/ReportService.php`

---

#### المهمة 10 — "هل أستطيع تغيير السعر؟" + "هل أستطيع تطبيق خصم؟" **[مكتمل ✅]**

**ملاحظة التنفيذ**: `lock_prices_for_cashiers` هو مفتاح واجهة على مستوى الشركة (عند `false` تبقى الحقول قابلة للتعديل في الواجهة لكن الـ backend يرفض أي رفع مخالف بـ 403) — الترخيص هو الحد الفاصل. عند `true`: `canEditPrice = !lockPrices || has(change_price_commercial_document)` و `canApplyDiscount = !lockPrices || has(apply_discount_commercial_document)`، حقل السعر و`price_per_pack` يصبحان `readonly`، مبدّل/حقل الخصم `disabled`/`readonly`. استثناء مسودات المستخدم (`draft` + `update_own_commercial_document`). خصومات النطاقات تلقائية غير مشمولة.
**الأولوية**: عالية | **المخاطر**: متوسطة

**الخلفية**: الآن أي شخص يملك `update_commercial_document` يمكنه تغيير الأسعار والخصومات بلا قيود.

**التنفيذ**:
1. **`CommercialDocumentController::update()`** — قبل الحفظ:
   - إذا المستخدم لا يملك `change_price_commercial_document` + السعر المُرسل ≠ السعر الأصلي → 403 "لا تملك صلاحية تغيير الأسعار"
   - إذا المستخدم لا يملك `apply_discount_commercial_document` + الخصم > 0 → 403 "لا تملك صلاحية تطبيق الخصومات"
   - **استثناء**: إذا المستند في حالة `draft` + المستخدم يملك `update_own_commercial_document` — يُسمح بالتغيير (لأنه لم يُعتمد بعد)

2. **`TransactionIntegrityService::assertPayloadLine()`** — يتحقق من الصلاحيات:
   - `change_price` check
   - `apply_discount` check

3. **الواجهة** (`DocumentLineRow.tsx` + `LineCard.tsx` + `DocumentLinesSection.tsx`):
   - إخفاء/تعطيل حقل السعر إذا لا توجد صلاحية
   - إخفاء/تعطيل حقل الخصم إذا لا توجد صلاحية
   - عرض سعر فقط (بدون تعديل) كـ `readonly`

4. **الإعدادات**: `lock_prices_for_cashiers = true/false` (إعداد عام)

**الملفات المتأثرة**:
- `app/Services/CommercialDocumentService.php` — `createDocumentLines()` 3-arg + تمرير `$perm` إلى `assertPayloadLine`
- `app/Services/TransactionIntegrityService.php` — `assertAllowedLinePermissionChanges()` + `resolveLineEditPerms()` + `assertLineGrants()`
- `app/Http/Controllers/Api/V1/CommercialDocumentController.php` — كتلة Task 10 قبل الحفظ في `update()` (تقارن الأسعار/الخصومات المرسلة مع الأسطر الأصلية بـ 403)
- `database/seeders/SettingsSeeder.php` — `lock_prices_for_cashiers` (إعداد عام)
- `resources/js/pages/documents/components/DocumentLineRow.tsx`
- `resources/js/pages/documents/components/LineCard.tsx`
- `resources/js/pages/documents/CommercialDocumentModal/DocumentLinesSection.tsx`
- `resources/js/pages/documents/CommercialDocumentModal/index.tsx`
- `resources/js/pages/documents/CommercialDocumentPage.tsx`
- `resources/js/pages/documents/hooks/useCommercialDocumentController.ts`

---

#### المهمة 11 — حدود المبالغ حسب الدور **[متبقية]**
**الأولوية**: متوسطة | **المخاطر**: منخفضة

**الخلفية**: لا يوجد حد لمبلغ المستند الذي يمكن للمستخدم إنشاءه/تعديله.

**التنفيذ**:
1. **الإعدادات الجديدة** في `settings` table:
   - `max_create_amount_member` (500,000 DZD)
   - `max_create_amount_manager` (5,000,000 DZD)
   - `max_create_amount_admin` (0 = غير محدود)
   - `max_edit_amount_member` (200,000 DZD)
   - `max_edit_amount_manager` (0 = غير محدود)

2. **`CommercialDocumentService::create()` + `update()`** — قبل الحفظ:
   - `$totalTtc > Setting::getSetting("max_create_amount_{role}")` → 422 "مبلغ المستند يتجاوز الحد الأقصى لدورك"

3. **الواجهة**: عرض "الحد الأقصى: 500,000 DZD" في واجهة المستند عند الإنشاء

**الملفات المتأثرة**:
- `database/seeders/SettingsSeeder.php`
- `app/Services/CommercialDocumentService.php`
- `app/Http/Resources/CommercialDocumentResource.php`
- الواجهة: رسالة خطأ واضحة

---

#### المهمة 12 — عرض المخزون السلبي فقط للمدير/المالك **[متبقية]**
**الأولوية**: متوسطة | **المخاطر**: منخفضة

**الخلفية**: الآن `override_stock_commercial_document` غير مستخدم. الكاشير لا يستطيع رؤية المخزون السلبي.

**التنفيذ**:
1. **`LineCard.tsx`** + **`DocumentLineRow.tsx`**: عرض شارة "مخزون غير كافٍ" فقط إذا المستخدم يملك `override_stock_commercial_document` + المخزون المتاح < الكمية المطلوبة
2. **`CommercialDocumentService::create()`**: حماية المخزون تختلف حسب الصلاحية:
   - **بدون `override_stock`**: يرفض إذا `quantity > available_stock` (السلوك الحالي)
   - **مع `override_stock`**: يسمح لكن يسجّل تحذيراً في `document_audit_logs`
3. **الواجهة**: زر "تجاوز المخزون" يظهر فقط للمدير/المالك

**الملفات المتأثرة**:
- `app/Services/CommercialDocumentService.php`
- `resources/js/pages/documents/components/DocumentLineRow.tsx`
- `resources/js/pages/documents/components/LineCard.tsx`
- `app/Listeners/DocumentAuditSubscriber.php`

---

### المجموعة د: حماية الإلغاء والحذف + التعديل المتزامن (3 مهام)
#### المهمة 13 — استرجاع المخزون عند الإلغاء **[مكتملة — متبقية]**

**الحالة**: الإلغاء يسترجع المخزون تلقائياً عبر حركات عكسية (`reason='cancel'`, `parent_movement_id=الحركة الأصلية`), و`TransactionIntegrityService` يفرض التأكد: أي مستند ملغى يؤثر على المخزون يلزمه حركة عكسية لكل حركة أصلية، وإلا يُرفض الحفظ («الوثيقة ملغاة: حركة المخزون #N (منتج #X) بدون حركة عكسية — المخزون لم يُسترجع»). واجهة الإلغاء تعرض نص التأكيد مع كمية المخزون المراد استرجاعها (`هل أنت متأكد؟ سيُسترجع المخزون ({quantity} {unit})`) عبر جلب سريع `stockInfo` من `/documents/{id}` (include: lines,lines.product,lines.product.unit,documentType).
**اختبار تم**: `task13_cancel_probe.php` على POS-2026-000001 — إلغاء ناجح (status=cancelled)، 5 حركات أصلية ↔ 5 حركات عكسية، صفر مخالفات فحص، بعد حذف الحركات العكسية يرصد الفحص الرقم 5 تماماً. ملاحظة مهمة: حركات المخزون العادية تملك `reason=NULL` — أي فلتر `where('reason','!=','cancel')` على الحركات الأصلية يستبعدها في SQL (NULL لم تُطابق)؛ عُولج بـ `whereNull('reason')->orWhere('reason','!=','cancel')` في جانب الخدمة وفي فلتر المرشح للفحص.

**الأولوية**: عالية | **المخاطر**: عالية

**الخلفية**: `cancel()` لا يعكس حركات المخزون. مستند مُلغى لا يزال يحتسب في المخزون!

**التنفيذ**:
1. **`CommercialDocumentService::cancel()`** — ينشئ حركات عكسية:
   - إذا المستند يبيع (`affects_stock_direction = -1`): ينشئ حركات IN بكميات مساوية
   - إذا المستند يشتري (`affects_stock_direction = +1`): ينشئ حركات OUT بكميات مساوية
2. **`cancel()`** لا يحذف الحركات الأصلية — يُضيف حركات عكسية فقط (لأن السجل يجب أن يبقى)
3. **`TransactionIntegrityService`** — يتحقق من وجود حركات عكسية عند الإلغاء
4. **تنبيه**: رسالة تأكيد: "هل أنت متأكد؟ سيُسترجع المخزون ({quantity} {unit})"

> تحذير: هذه مهمة عالية المخاطر — تغيير سلوك الإلغاء قد يُسبب مشاكل إذا المستخدمون اعتادوا السلوك الحالي. يجب اختبار شامل.

**الملفات المتأثرة**:
- `app/Services/CommercialDocumentService.php` — `cancel()`
- `app/Services/TransactionIntegrityService.php`
- الواجهة: تأكيد الإلغاء مع عرض تأثير المخزون

---

#### المهمة 14 — حماية الحذف: استرجاع المخزون + منع الحذف بعد الدفع **[مكتمل ✅]**

**الحالة**: `delete()` يسترجع المخزون عبر حركات عكسية (مثل المهمة 13) ولا يحذف مستنداً عليه دفعات. تسلسل `delete()`: حراسة `is_locked`/`is_exported_to_accounting` → داخل المعاملة → `payments()->assertDocumentDeletable($document)` (يرفض بـ 409 «لا يمكن حذف مستند عليه دفعات — ألغِ الدفعات أولاً.» عندما `paid_amount > 0`) → إذا المستند `validated`/`paid`/`partially_paid`/`overdue` + `affects_stock_direction ≠ 0`: حركة عكسية لكل سطر (`createReversalMovement($document, $line, $original, 'حذف')`، `reason='cancel-reversal'` (ثابت `CANCELLATION_REVERSAL_REASON`)، `parent_movement_id=الحركة الأصلية`، `notes` = «عكس حركة الأصل #N بسبب حذف الوثيقة X») والأصلية تُبقي صافية (لا `deleteStockMovementsForDocument` في هذا الفرع)؛ وإلا المسار القديم (soft-delete + `deleteStockMovementsForDocument`). ثم `payments()->detach()` + `forceDelete()` + سجل تدقيق + `performPostCommitOperations(...)`. `paymentGuard`/`isValidatedDocument` جديدتان في `CommercialDocumentService` و`assertDocumentDeletable` في `PaymentSynchronizer`. السياسة: `delete_any_commercial_document` → فقط مالك/مدير (`isAdminOf`)، `delete_own_commercial_document` → `created_by === user` + المستند `draft`/`pending`. رسالة تأكيد الحذف في الواجهة نُقّحت. الحالة الفعلية للمستند = `documentStatus->name`.
**اختبار تم**: `php -l` نظيف ×3؛ فحص تجريبي (ملف قالب `task13_cancel_probe.php` بإرجاع تلقائي) — مستند مُصدَّق → تُنشأ حركات عكسية وتُحذف الأصلية بشكل ناعم، مستند `draft`/`pending` → المسار الناعم القديم، مستند عليه دفعات (`paid_amount > 0`) → `BusinessRuleException` 409.
**الأولوية**: عالية | **المخاطر**: عالية

**الخلفية**: `delete()` لا يسترجع المخزون. مستند محذوف لا يزال يحتسب في المخزون!

**التنفيذ**:
1. **`CommercialDocumentService::delete()`** — قبل الحذف:
   - إذا المستند `validated` + `affects_stock_direction ≠ 0`: ينشئ حركات عكسية (مثل المهمة 13)
   - إذا المستند عليه دفعات (`paid_amount > 0`): يرفض: "لا يمكن حذف مستند عليه دفعات — ألغِ الدفعات أولاً"
2. **`delete_any_commercial_document`** — فقط admin/owner
3. **`delete_own_commercial_document`** — فقط إذا المستند `draft` أو `pending`

> تحذير: مثل المهمة 13 — اختبار شامل مطلوب.

**الملفات المتأثرة**:
- `app/Services/CommercialDocumentService.php` — `delete()`
- `app/Services/PaymentSynchronizer.php` — التحقق من الدفعات
- `app/Policies/CommercialDocumentPolicy.php`

---

#### المهمة 15 — حماية التعديل المتزامن (Optimistic Locking) **[متبقية — أولوية منخفضة، تأجيل]**
**الأولوية**: منخفضة | **المخاطر**: منخفضة

**الخلفية**: شخصان يمكنهما تعديل المستند نفسّه في نفس الوقت — آخر حفظ يفوز.

**التنفيذ**:
1. إضافة `version` integer column إلى `commercial_documents` (مبدأ 1)
2. `CommercialDocumentService::update()` — `WHERE version = {expected_version}` + `version = version + 1`
3. إذا `affected_rows = 0` → 409 Conflict: "المستند تم تعديله من مستخدم آخر — أعد تحميل الصفحة"
4. **الواجهة**: زر "تحديث" يُعيد تحميل المستند عند 409

**الملفات المتأثرة**:
- `database/migrations/2026_09_03_000003_add_version_to_commercial_documents.php` (جديد)
- `app/Models/CommercialDocument.php`
- `app/Services/CommercialDocumentService.php` — `update()`
- `resources/js/pages/documents/CommercialDocumentPage.tsx` — معالجة 409

---

## جدول التنفيذ المقترح

| # | المهمة | المجموعة | الأولوية | المخاطر | التقدير |
|---|--------|----------|----------|---------|--------|
| 1 | تتبع المالكين | أ | عالية | منخفضة | يوم 1 |
| 2 | مسجّل التدقيق | أ | عالية | منخفضة | يوم 1–2 |
| 3 | تحديث الصلاحيات | أ | عالية | منخفضة | يوم 2 |
| 4 | تحديث السياسة | أ | عالية | متوسطة | يوم 2–3 |
| 5 | حالات المستند | ب | عالية | متوسطة | يوم 3–4 |
| 6 | حدود الموافقة | ب | متوسطة | منخفضة | يوم 4 |
| 7 | أزرار الموافقة | ب | عالية | منخفضة | يوم 4–5 |
| 8 | حماية المخزون | ب | عالية | متوسطة | يوم 5 |
| 9 | إخفاء التكلفة | ج | عالية | منخفضة | يوم 5–6 |
| 10 | قيود السعر/الخصم | ج | عالية | متوسطة | يوم 6 |
| 11 | حدود المبالغ | ج | متوسطة | منخفضة | يوم 6–7 |
| 12 | تجاوز المخزون | ج | متوسطة | منخفضة | يوم 7 |
| 13 | استرجاع المخزون (إلغاء) | د | عالية | عالية | يوم 7–8 |
| 14 | حماية الحذف | د | عالية | عالية | يوم 8 |
| 15 | التعديل المتزامن | د | منخفضة | منخفضة | يوم 8 |

---

## ملاحظات تقنية مهمة

### قاعدة "لا تُنشئ المخزون إلا عند التأكيد"
- مستند `draft` = لا حركات مخزون + لا snapshots + لا ختم جبائي
- مستند `pending` = لا شيء أيضاً
- مستند `validated` = يُنشئ كل شيء في `approve()`
- هذا يُبقي المخزون محيدياً للمستندات غير المُعتمدة

### قاعدة "المستند المُلغى يعكس المخزون"
- `cancel()` يُنشئ حركات عكسية — لا يحذف الأصلية
- هذا يُبقي السجل المالي صحيحاً (الحركات الأصلية + العكسية = صفر)

### قاعدة "لا حذف بعد الدفع"
- مستند عليه دفعات مُؤكّدة → لا يمكن حذفه
- الحل: إلغاء المستند أولاً (الذي يعكس المخزون) ثم حذف الدفعات

### التوافق مع الكود الحالي
- `require_document_approval = false` → السلوك الحالي بالضبط (لا شيء يتغير)
- `require_document_approval = true` → السلوك الجديد
- يمكن تفعيله تدريجياً لكل شركة

---

## ملاحظة للتنفيذ
- كل مهمة تُنفَّذ وتُوثَّق + تُدفَع بشكل مستقل
- التحقق: `npx tsc --noEmit` + `npm test` + `npm run build` + `vendor/bin/pest`
- لا يُنصح بتفعيل `require_document_approval` في بيئة الإنتاج حتى تكتمل المهام 5–8 واختبارها

# تحليل: is_proforma — هل العمود ضروري؟

## ══ ما يوفره الـ Seeder (الحقيقة) ════════════════════════════════════════

```
DEV  | affects_accounting=false | affects_stock_direction=0  | ← عرض سعر
BCC  | affects_accounting=false | affects_stock_direction=0  | ← طلب زبون
BL   | affects_accounting=false | affects_stock_direction=-1 | ← تسليم
FV   | affects_accounting=true  | affects_stock_direction=-1 | ← فاتورة
AV   | affects_accounting=true  | affects_stock_direction=+1 | ← أفوار
DDP  | affects_accounting=false | affects_stock_direction=0  |
BCF  | affects_accounting=false | affects_stock_direction=0  |
BR   | affects_accounting=false | affects_stock_direction=+1 |
FA   | affects_accounting=true  | affects_stock_direction=+1 |
AA   | affects_accounting=true  | affects_stock_direction=-1 |
BT   | affects_accounting=false | affects_stock_direction=0  |
```

## ══ الاستنتاج ══════════════════════════════════════════════════════════════

**is_proforma = true على FV** يعني في الكود الحالي:
1. لا credit check
2. لا payment terms
3. زر "تحويل لفاتورة حقيقية" يُرسل `{ is_proforma: false }`

**ما الفرق بين FV(is_proforma=true) وDEV؟**
```
DEV:              affects_accounting=false, affects_stock=0
FV(proforma=true): affects_accounting=true,  affects_stock=-1
                   لكن يُتجاهل في الكود!
```

الباكاند `CommercialDocumentService` لا يتحقق من `is_proforma`
— يُنفِّذ createStockMovements و affects_accounting بناءً على
`document_type.affects_stock_direction` فقط.

**النتيجة:**
FV with is_proforma=true تُنشئ حركات مخزون وقيود محاسبية فوراً!
الـ is_proforma في الفرونتند مجرد واجهة — لا حماية حقيقية في الباكاند.

## ══ الحلول الممكنة ════════════════════════════════════════════════════════

### الحل A: حذف is_proforma نهائياً (الموصى به)

الـ Seeder يمنحك بالفعل DEV وBCC وهما يلعبان دور الـ Proforma:
- **DEV** = عرض السعر (Quote/Pro Forma)
- **BCC** = أمر الزبون المؤكد
- التحويل عبر CONVERSION_MAP: DEV → [BCC, BL, FV]

**خطوات الحذف:**
```typescript
// 1. احذف is_proforma من DocumentFormState
// 2. احذف confirmProformaMut من المودال
// 3. احذف Toggle "فاتورة أولية" من الـ UI
// 4. المستخدم يستخدم DEV بدلاً من FV(proforma=true)
// 5. التحويل: DEV → FV عبر ConvertDocumentModal الموجود
```

```php
// 6. migration: إزالة العمود (اختياري)
Schema::table('commercial_documents', function (Blueprint $table) {
    $table->dropColumn('is_proforma');
});
```

### الحل B: إبقاء is_proforma مع حماية حقيقية في الباكاند

```php
// CommercialDocumentService::createDocumentLines()
if ($document->is_proforma) {
    // لا مخزون
    // لا محاسبة
    return;
}
```

```php
// CommercialDocumentController — endpoint مخصص للتحويل
public function confirmProforma(CommercialDocument $document): JsonResponse
{
    DB::transaction(function() use ($document) {
        $document->update(['is_proforma' => false]);
        $this->service->createStockMovements($document);
        $this->service->createAccountingEntries($document);
    });
    return $this->successResponse($document->fresh());
}
```

## ══ التوصية النهائية ═══════════════════════════════════════════════════════

```
┌─────────────────────────────────────────────────────────────┐
│  ✅ الحل A: احذف is_proforma واستخدم DEV بدلاً منه         │
│                                                             │
│  السبب:                                                     │
│  • الـ Seeder صمَّم DEV لهذا الغرض تحديداً                  │
│  • CONVERSION_MAP يدعم DEV → FV مباشرة                     │
│  • تبسيط الكود: -50 سطراً على الأقل                        │
│  • لا تعارض مع الباكاند (لا حماية موجودة أصلاً)            │
│  • أنظف: مستند واحد لكل غرض بدل نفس المستند بعَلَم مختلف  │
│                                                             │
│  الوقت المقدر: 2 ساعة (فرونتند فقط)                        │
└─────────────────────────────────────────────────────────────┘
```

## ══ ما يجب تعديله عند اختيار الحل A ══════════════════════════════════════

**useDocumentForm.ts:**
```typescript
// احذف:
is_proforma: boolean;           // من DocumentFormState
isProforma?: boolean;           // من buildDefaultForm options
is_proforma: f.is_proforma,     // من buildPayload
```

**CommercialDocumentModal.tsx:**
```typescript
// احذف:
confirmProformaMut              // mutation كاملة (سطر 740-756)
form.is_proforma                // كل الاستخدامات (~6 أماكن)
Toggle "فاتورة أولية"          // سطر 2052-2053
زر "تحويل لفاتورة حقيقية"      // سطر 2130-2140
```

**CommercialDocumentsPage.tsx:**
```typescript
// احذف:
is_proforma filter               // إذا كان موجوداً
badge "Proforma"                 // إذا كان موجوداً
```

**document.types.ts:**
```typescript
// احذف:
is_proforma: boolean;            // من DocumentFormState interface
```

**الإضافة الوحيدة:**
في CONVERSION_MAP تأكد أن DEV → FV موجودة:
```typescript
const CONVERSION_MAP = {
  DEV: ['BCC', 'BL', 'FV'],  // ✅ موجودة بالفعل
  ...
};
```

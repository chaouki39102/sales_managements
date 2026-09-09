<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * AuditLabelService — ينتج أسماء/تسميات عربية واضحة لسجل سجل التدقيق.
 *
 * المسؤوليات:
 *  - displayLabel(): استخراج اسم عرض عام من أي نموذج (name/label/… → #id كاحتياط أخير).
 *  - typeLabel():   خريطة class basename → نوع عربي (Product → منتج …).
 *  - humanizedDiff():   تحويل old/new values إلى مصفوفة صفوف {key,label,old,new}
 *                       مع ترجمة القيم (booleans → نعم/لا، null → —، معرّفات FK → أسماء).
 *
 * القاعدة الأساسية: لا يظهر معرّف خام لأي مستخدم/وحدة/طرف/كيان قابل للقراءة أبداً.
 */
class AuditLabelService
{
    /**
     * خريطة class basename → تسمية عربية.
     */
    public const TYPE_LABELS = [
        'Product'            => 'منتج',
        'Party'              => 'طرف',
        'CommercialDocument' => 'مستند',
        'Unit'               => 'وحدة',
        'User'               => 'مستخدم',
        'Warehouse'          => 'مستودع',
        'Brand'              => 'علامة',
        'Family'             => 'فئة',
        'Payment'            => 'دفعة',
        'Expense'            => 'مصروف',
        'Check'             => 'شيك',
        'Company'            => 'شركة',
        'Role'               => 'دور',
        'Permission'         => 'صلاحية',
        'Currency'           => 'عملة',
        'DocumentType'       => 'نوع مستند',
        'DocumentStatus'     => 'حالة مستند',
        'PriceLevel'         => 'مستوى سعر',
        'ProductType'        => 'نوع منتج',
        'ExpenseCategory'    => 'فئة مصروف',
        'FiscalYear'         => 'سنة مالية',
        'PaymentMode'        => 'طريقة دفع',
        'PortalOrder'        => 'طلب بوابة',
        'PortalUser'         => 'مستخدم بوابة',
        'PrintTemplate'      => 'قالب طباعة',
        'Commune'            => 'بلدية',
        'Wilaya'             => 'ولاية',
        'TreasuryAccount'    => 'خزينة',
        'ApprovalThreshold'  => 'عتبة موافقة',
        'Employee'           => 'موظف',
        'StockMovement'      => 'حركة مخزون',
        'Attachment'         => 'مرفق',
        'Setting'            => 'إعداد',
        'DocumentLineTemplate' => 'قالب سطر مستند',
        'InventoryValuationMethod' => 'طريقة تقييم المخزون',
        'LegalForm'          => 'الشكل القانوني',
        'Gender'             => 'الجنس',
        'Plan'              => 'الخطة',
        'PartyType'          => 'نوع الطرف',
        'Commune'            => 'بلدية',
        'Wilaya'            => 'ولاية',
    ];

    /**
     * خريطة أسماء الحقول → تسمية عربية.
     */
    public const FIELD_LABELS = [
        'name'                => 'الاسم',
        'label'               => 'التسمية',
        'code'                => 'الرمز',
        'ref'                 => 'المرجع',
        'reference'           => 'المرجع',
        'barcode'             => 'الباركود',
        'document_number'     => 'رقم المستند',
        'quantity'            => 'الكمية',
        'qty'                 => 'الكمية',
        'unit_price_ht'       => 'سعر الوحدة HT',
        'price'               => 'السعر',
        'price_ht'            => 'السعر HT',
        'purchase_price_ht'   => 'سعر الشراء HT',
        'selling_price_ht'    => 'سعر البيع HT',
        'total_ht'            => 'المجموع HT',
        'total_tva'           => 'مجموع TVA',
        'total_ttc'           => 'المجموع TTC',
        'tva_rate'            => 'نسبة TVA',
        'discount_percentage' => 'نسبة الخصم',
        'discount_amount'     => 'مبلغ الخصم',
        'description'         => 'الوصف',
        'active'              => 'نشط',
        'status'              => 'الحالة',
        'user_id'             => 'المستخدم',
        'created_by'          => 'أُنشئ بواسطة',
        'updated_by'          => 'حُدّث بواسطة',
        'deleted_by'          => 'حُذف بواسطة',
        'party_id'            => 'الطرف',
        'unit_id'             => 'الوحدة',
        'warehouse_id'        => 'المستودع',
        'brand_id'            => 'العلامة',
        'family_id'           => 'الفئة',
        'product_type_id'     => 'نوع المنتج',
        'price_level_id'      => 'مستوى السعر',
        'currency_id'         => 'العملة',
        'payment_mode_id'     => 'طريقة الدفع',
        'expense_category_id' => 'فئة المصروف',
        'fiscal_year_id'      => 'السنة المالية',
        'document_type_id'    => 'نوع المستند',
        'company_id'          => 'الشركة',
        'role_id'             => 'الدور',
        'email'               => 'البريد الإلكتروني',
        'phone'               => 'الهاتف',
        'mobile'              => 'الجوال',
        'address'             => 'العنوان',
        'slug'                => 'المعرّف النصي',
        'notes'               => 'ملاحظات',
        'date'                => 'التاريخ',
        'document_date'       => 'تاريخ المستند',
        'stock'               => 'المخزون',
        'avatar'              => 'الصورة الرمزية',
        'username'            => 'اسم المستخدم',
        'display_name'        => 'الاسم المعروض',
        'commercial_name'     => 'الاسم التجاري',
        'symbol'              => 'الرمز',
        'packaging_units_snapshot' => 'عدد الوحدات في العبوة',
        'expense_number'      => 'رقم المصروف',
        'payment_number'      => 'رقم الدفعة',
    ];

    /**
     * مخبأ ثابت لكل طلب: class → [id => label|null] للـ resolves المجمع.
     */
    private static array $fkCache = [];

    /**
     * اسم عرض عام من أي نموذج — #id فقط كاحتياط أخير.
     */
    public function displayLabel(?Model $model): string
    {
        if (!$model) {
            return '—';
        }

        $firstName = $model->first_name ?? null;
        $lastName  = $model->last_name ?? null;
        if (($firstName !== null && $firstName !== '') || ($lastName !== null && $lastName !== '')) {
            return trim(($firstName ?? '') . ' ' . ($lastName ?? ''));
        }

        foreach (['name', 'label', 'title', 'document_number', 'reference', 'ref', 'code', 'username', 'display_name', 'commercial_name'] as $field) {
            $value = $model->{$field} ?? null;
            if ($value !== null && $value !== '') {
                return (string) $value;
            }
        }

        return '#' . $model->getKey();
    }

    /**
     * تسمية عربية لنوع الكيان بناءً على الـ class أو قيمة auditable_type.
     */
    public function typeLabel(?Model $model, ?string $auditableType = null): string
    {
        $class = $auditableType ?: ($model ? get_class($model) : null);
        if (!$class) {
            return '—';
        }
        $base = class_basename($class);
        return self::TYPE_LABELS[$base] ?? $base;
    }

    /**
     * تسمية عربية لحقل (مفتاح) — تحويل snake_case إلى مقروء إن لم تكن في الخريطة.
     */
    public function fieldLabel(string $key): string
    {
        if (isset(self::FIELD_LABELS[$key])) {
            return self::FIELD_LABELS[$key];
        }
        return Str::title(str_replace('_', ' ', $key));
    }

    /**
     * تحويل old/new values إلى مصفوفة صفوف مقروءة.
     */
    public function humanizedDiff(?array $old, ?array $new, ?Model $auditable = null): array
    {
        $old = $old ?? [];
        $new = $new ?? [];

        $rows = [];
        foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $key) {
            $o = array_key_exists($key, $old) ? $old[$key] : null;
            $n = array_key_exists($key, $new) ? $new[$key] : null;

            // تجاهل الحقول غير المتغيرة إلا عند الحذف/الإنشاء (لا جديد = حذف، لا قديم = إنشاء).
            if ($o === $n && !empty($old) && !empty($new)) {
                continue;
            }

            $rows[] = [
                'key'   => $key,
                'label' => $this->fieldLabel($key),
                'old'   => $this->humanizeValue($key, $o, $auditable),
                'new'   => $this->humanizeValue($key, $n, $auditable),
            ];
        }

        return $rows;
    }

    /**
     * ترجمة قيمة واحدة إلى شكل مقروء (لا معرّفات خام).
     */
    public function humanizeValue(string $key, $value, ?Model $auditable = null)
    {
        if ($value === null || $value === '') {
            return '—';
        }
        if (is_bool($value)) {
            return $value ? 'نعم' : 'لا';
        }
        if (is_int($value) || is_float($value)) {
            // الأرقام تبقى كما هي (مبالغ/كميات) — لا تُحوَّل إلى معرّف.
            return (string) $value;
        }
        if (is_string($value) && (str_ends_with($key, '_id') || in_array($key, ['created_by', 'updated_by', 'deleted_by'], true)) && is_numeric($value)) {
            $label = $this->resolveFkLabel($key, $value, $auditable);
            if ($label) {
                return $label;
            }
        }
        return (string) $value;
    }

    /**
     * استخراج اسم لكيان علاقة FK بقدر محدود من الاستعلامات (مخبأ لكل طلب).
     */
    protected function resolveFkLabel(string $key, $value, ?Model $auditable = null): ?string
    {
        $relatedClass = $this->relatedClassForFk($key, $auditable);
        if ($relatedClass === null) {
            return null;
        }

        if (!isset(self::$fkCache[$relatedClass])) {
            self::$fkCache[$relatedClass] = [];
        }

        $id = (int) $value;
        if (array_key_exists($id, self::$fkCache[$relatedClass])) {
            return self::$fkCache[$relatedClass][$id];
        }

        try {
            $row = $relatedClass::query()->whereKey($id)->first();
            self::$fkCache[$relatedClass][$id] = $row ? $this->displayLabel($row) : null;
        } catch (\Throwable $e) {
            self::$fkCache[$relatedClass][$id] = null;
        }

        return self::$fkCache[$relatedClass][$id];
    }

    /**
     * تحديد class النموذج المرتبط بحقل FK — عبر علاقة النموذج المستهدف إن أمكن.
     */
    protected function relatedClassForFk(string $key, ?Model $auditable = null): ?string
    {
        if ($auditable !== null) {
            $relName = Str::camel(str_ends_with($key, '_id') ? substr($key, 0, -3) : $key);
            try {
                if (method_exists($auditable, $relName)) {
                    return get_class($auditable->{$relName}()->getRelated());
                }
            } catch (\Throwable $e) {
                // تابع إلى الاحتياطيات
            }
        }

        // حقول المستخدم الشائعة → User
        if (in_array($key, ['user_id', 'created_by', 'updated_by', 'deleted_by'], true)) {
            return \App\Models\User::class;
        }

        // خريطة ثابتة لعلاقات شائعة قد لا يكون النموذج قد عرّفها بهذا الاسم
        $static = [
            'party_id'         => \App\Models\Party::class,
            'unit_id'          => \App\Models\Unit::class,
            'warehouse_id'     => \App\Models\Warehouse::class,
            'brand_id'         => \App\Models\Brand::class,
            'family_id'        => \App\Models\Family::class,
            'product_type_id'  => \App\Models\ProductType::class,
            'price_level_id'   => \App\Models\PriceLevel::class,
            'currency_id'      => \App\Models\Currency::class,
            'payment_mode_id'  => \App\Models\PaymentMode::class,
            'expense_category_id' => \App\Models\ExpenseCategory::class,
            'fiscal_year_id'   => \App\Models\FiscalYear::class,
            'document_type_id' => \App\Models\DocumentType::class,
            'role_id'          => \App\Models\Role::class,
        ];

        return $static[$key] ?? null;
    }

    /**
     * تصفير مخبأ الـ FK (للاستخدام في الاختبارات).
     */
    public static function flushFkCache(): void
    {
        self::$fkCache = [];
    }
}

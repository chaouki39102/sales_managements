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
        'unit_price'          => 'سعر الوحدة HT',
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
        // أعمدة CommercialDocumentLine
        'line_order'           => 'ترتيب السطر',
        'product_id'           => 'المنتج',
        'packaging_id'         => 'العبوة',
        'packaging_quantity'   => 'عدد الوحدات في العبوة',
        'quantity_discount_id' => 'خصم الكمية',
        'discount_amount_per_unit' => 'الخصم لكل وحدة',
        'total_discount_amount' => 'مجموع الخصم',
        'line_attributes'      => 'خصائص السطر',
        'commercial_document_id' => 'المستند',
        'stock_lot_id'         => 'رقم الدفعة',
        'cost_price_ht'        => 'تكلفة الوحدة HT',
        'total_stamp'          => 'الطابع',
        'net_to_pay'           => 'الصافي للدفع',
        'paid_amount'          => 'المبلغ المدفوع',
        'remaining_amount'     => 'المبلغ المتبقي',
        // حقول عامة إضافية
        'id'                   => 'المعرف',
        'created_at'           => 'تاريخ الإنشاء',
        'updated_at'           => 'تاريخ التحديث',
        'deleted_at'           => 'تاريخ الحذف',
        'company'              => 'الشركة',
        'is_active'            => 'نشط',
        'is_default'           => 'افتراضي',
        'is_tva_exempt'        => 'معفى من TVA',
        'is_readonly'          => 'للقراءة فقط',
        'sort_order'           => 'ترتيب العرض',
        'display_order'        => 'ترتيب العرض',
    ];

    /**
     * مخبأ ثابت لكل طلب: class → [id => label|null] للـ resolves المجمع.
     */
    private static array $fkCache = [];

    /**
     * اسم عرض عام من أي نموذج — #id فقط كاحتياط أخير.
     *
     * عمق الأعمال:
     *  - بالنسبة للمستند (CommercialDocument): «اسم نوع المستند + رقم المستند»
     *    مثل «فاتورة بيع INV-02» — الهوية التجارية الحقيقية وليست #id.
     *  - بالنسبة لسطر مستند (CommercialDocumentLine): «منتج «الاسم» في رقم المستند»
     *    مثل «منتج «حليب» في فاتورة بيع INV-02» — السطر وحده بلا هوية للمستخدم.
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

        // المستند: اسم نوع المستند + رقم المستند («فاتورة بيع INV-02»).
        if ($model instanceof \App\Models\CommercialDocument) {
            return $this->documentDisplayLabel($model);
        }

        // سطر مستند: اربط بهوية السطر (المنتج) داخل المستند الأب.
        if ($model instanceof \App\Models\CommercialDocumentLine) {
            return $this->documentLineDisplayLabel($model);
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
     * اسم عرض للمستند: «نوع المستند + رقم المستند» (فاتورة بيع INV-02).
     */
    protected function documentDisplayLabel(\App\Models\CommercialDocument $doc): string
    {
        $num = (string) ($doc->document_number ?? '');
        $typeName = '';
        try {
            $typeName = (string) ($doc->documentType?->name ?? '');
        } catch (\Throwable $e) {
            $typeName = '';
        }
        $label = trim(($typeName !== '' ? $typeName . ' ' : '') . $num);
        if ($label !== '') {
            return $label;
        }
        return '#' . $doc->getKey();
    }

    /**
     * اسم عرض لسطر مستند: «منتج «الاسم»» داخل المستند الأب إن توفر.
     */
    protected function documentLineDisplayLabel(\App\Models\CommercialDocumentLine $line): string
    {
        $productName = '';
        try {
            $productName = (string) (($line->product?->name) ?? '');
        } catch (\Throwable $e) {
            $productName = '';
        }

        $docLabel = '';
        try {
            if ($line->commercialDocument) {
                $docLabel = $this->documentDisplayLabel($line->commercialDocument);
            }
        } catch (\Throwable $e) {
            $docLabel = '';
        }

        if ($productName !== '') {
            $base = 'منتج «' . $productName . '»';
            if ($docLabel !== '') {
                $base .= ' في ' . $docLabel;
            }
            return $base;
        }
        if ($docLabel !== '') {
            return $docLabel;
        }
        return '#' . $line->getKey();
    }

    /**
     * جملة عربية تصف العملية كاملة: «أنشأ أحمد فاتورة بيع INV-02».
     *
     * بالنسبة للمستندات وأسطرها يرد اسم النوع داخل displayLabel نفسه
     * («فاتورة بيع INV-02»، «منتج «حليب» في فاتورة بيع INV-02»)، لذا لا نكرّر
     * typeLabel العام («مستند» / «سطر مستند») لتجنّب «أنشأ مستند فاتورة بيع …».
     */
    public function actionSummary(?string $event, ?Model $auditable, ?Model $user): string
    {
        $action = match ($event) {
            'created' => 'أنشأ',
            'deleted' => 'حذف',
            default   => 'عدّل',
        };

        $who = $user ? $this->displayLabel($user) : 'مستخدم';

        if (!$auditable) {
            return "{$who} {$action}";
        }

        if ($auditable instanceof \App\Models\CommercialDocument
            || $auditable instanceof \App\Models\CommercialDocumentLine) {
            return "{$who} {$action} " . $this->displayLabel($auditable);
        }

        return "{$who} {$action} {$this->typeLabel($auditable)} " . $this->displayLabel($auditable);
    }

    /**
     * تسمية عربية مختصرة لأفعال تدقيق المستند (للشارات/الفلاتر الملونة).
     */
    public const DOCUMENT_ACTION_LABELS = [
        'created'          => 'إنشاء',
        'updated'          => 'تعديل',
        'line_added'       => 'إضافة سطر',
        'line_removed'     => 'إزالة سطر',
        'line_modified'    => 'تعديل سطر',
        'price_changed'    => 'تغيير السعر',
        'discount_changed' => 'تغيير الخصم',
        'status_changed'   => 'تغيير الحالة',
        'locked'           => 'قفل',
        'unlocked'         => 'فتح',
        'cancelled'        => 'إلغاء',
        'deleted'          => 'حذف',
        'payment_added'    => 'إضافة دفعة',
        'payment_removed'  => 'إزالة دفعة',
        'converted'        => 'تحويل',
        'returned'         => 'إرجاع',
        'cloned'           => 'استنساخ',
        'stock_override'   => 'تصحيح المخزون',
    ];

    /**
     * تسمية عربية مختصرة لفعل تدقيق المستند (للشارة الملونة).
     */
    public function documentAuditActionLabel(string $action): string
    {
        return self::DOCUMENT_ACTION_LABELS[$action] ?? Str::title(str_replace('_', ' ', $action));
    }

    /**
     * صفوف مقروءة لقيمة مركّبة (حمولة سطر/كائن): {key,label,value} مع حلّ معرّفات FK.
     */
    public function documentAuditValueRows(?array $value): array
    {
        $value = $value ?? [];
        $rows = [];
        foreach ($value as $key => $v) {
            // لا تُعرض مفاتيح الضجيج الداخلي أبداً (المعرّف + الخطوط الزمنية).
            if (in_array($key, self::NOISE_KEYS, true)) {
                continue;
            }
            $rows[] = [
                'key'   => (string) $key,
                'label' => $this->fieldLabel((string) $key),
                'value' => $this->humanizeValue((string) $key, $v),
            ];
        }
        return $rows;
    }

    /**
     * شكل مقروء لقيمة حدث تدقيق مستند: null → «—»، مصفوفة → صفوف، قيمة بسيطة → نص/رقم.
     */
    public function documentAuditHumanized($value): array|string
    {
        if ($value === null || $value === '') {
            return '—';
        }
        if (is_array($value)) {
            return $this->documentAuditValueRows($value);
        }
        if (is_bool($value)) {
            return $value ? 'نعم' : 'لا';
        }
        return (string) $value;
    }

    /**
     * جملة عربية كاملة لحدث تدقيق مستند، مثال:
     * «شوقي عبد الصادق أضاف سطر «حليب» إلى مبيعات POS POS-2026-000076».
     */
    public function documentAuditSummary(\App\Models\DocumentAuditLog $log): string
    {
        $doc = null;
        try {
            $doc = $log->document;
        } catch (\Throwable $e) {
            $doc = null;
        }
        $docLabel = $doc ? $this->displayLabel($doc) : ('#' . $log->document_id);

        $who = 'مستخدم';
        if ($log->user_id) {
            try {
                $userLabel = $this->displayLabel($log->user);
                if ($userLabel !== '—' && $userLabel !== '') {
                    $who = $userLabel;
                }
            } catch (\Throwable $e) {
                // أبقِ «مستخدم»
            }
        }

        $payload = is_array($log->new_value) ? $log->new_value : (is_array($log->old_value) ? $log->old_value : null);
        $product = null;
        if ($payload !== null) {
            $productId = $payload['product_id'] ?? null;
            if ($productId !== null) {
                try {
                    $productLabel = $this->humanizeValue('product_id', $productId);
                    if ($productLabel !== '—') {
                        $product = $productLabel;
                    }
                } catch (\Throwable $e) {
                    $product = null;
                }
            }
        }

        $lineProduct = $product !== null ? 'سطر «' . $product . '»' : 'سطر';
        $priceTarget = $product !== null ? '«' . $product . '»' : null;

        return match ($log->action) {
            'created'          => "{$who} أنشأ {$docLabel}",
            'updated'          => "{$who} عدّل {$docLabel}",
            'line_added'       => "{$who} أضاف {$lineProduct} إلى {$docLabel}",
            'line_removed'     => "{$who} أزال {$lineProduct} من {$docLabel}",
            'line_modified'    => "{$who} عدّل {$lineProduct} في {$docLabel}",
            'price_changed'    => $priceTarget !== null ? "{$who} غيّر سعر {$priceTarget}" : "{$who} غيّر سعر {$docLabel}",
            'discount_changed' => $priceTarget !== null ? "{$who} غيّر خصم {$priceTarget}" : "{$who} غيّر خصم {$docLabel}",
            'status_changed'   => "{$who} غيّر حالة {$docLabel}",
            'locked'           => "{$who} قفل {$docLabel}",
            'unlocked'         => "{$who} فتح {$docLabel}",
            'cancelled'        => "{$who} ألغى {$docLabel}",
            'deleted'          => "{$who} حذف {$docLabel}",
            'payment_added'    => "{$who} أضاف دفعة إلى {$docLabel}",
            'payment_removed'  => "{$who} أزال دفعة من {$docLabel}",
            'converted'        => "{$who} حوّل {$docLabel}",
            'returned'         => "{$who} أرجع {$docLabel}",
            'cloned'           => "{$who} استنسخ {$docLabel}",
            'stock_override'   => "{$who} صحّح مخزون {$docLabel}",
            default            => "{$who} {$this->documentAuditActionLabel($log->action)} {$docLabel}",
        };
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
     * مفاتيح يُتجاهل عرضها كلوحة ضجيج داخلي (معرّف وخطوط زمنية — بلا قيمة للمستخدم).
     */
    public const NOISE_KEYS = [
        'id',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    /**
     * تحويل old/new values إلى مصفوفة صفوف مقروءة.
     */
    public function humanizedDiff(?array $old, ?array $new, ?Model $auditable = null): array
    {
        $old = $old ?? [];
        $new = $new ?? [];
        $isCreate = empty($old) && !empty($new);
        $isDelete = empty($new) && !empty($old);

        $rows = [];
        foreach (array_unique(array_merge(array_keys($old), array_keys($new))) as $key) {
            $o = array_key_exists($key, $old) ? $old[$key] : null;
            $n = array_key_exists($key, $new) ? $new[$key] : null;

            // مفاتيح الضجيج لا تُعرض أبداً (المعرّف + الخطوط الزمنية).
            if (in_array($key, self::NOISE_KEYS, true)) {
                continue;
            }

            // تجاهل الحقول غير المتغيرة إلا عند الحذف/الإنشاء.
            if ($o === $n && !$isCreate && !$isDelete) {
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
        // العمود العلاقة (FK/مستخدم) يُحلَّ إلى اسم مقروء أولاً — لا يُعرض معرّف خام أبداً.
        // يجب أن يسبق أي تمرير رقمي حتى لا تتسرب المعرّفات كأرقام (مثل product_id: 12).
        if (is_numeric($value) && (str_ends_with($key, '_id') || in_array($key, ['created_by', 'updated_by', 'deleted_by'], true))) {
            $label = $this->resolveFkLabel($key, $value, $auditable);
            if ($label !== null) {
                return $label;
            }
        }
        if (is_int($value) || is_float($value)) {
            // الأرقام غير المرتبطة بعلاقة تبقى كما هي (مبالغ/كميات).
            return (string) $value;
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
            // أعمدة CommercialDocumentLine / سطور المستندات
            'commercial_document_id' => \App\Models\CommercialDocument::class,
            'product_id'       => \App\Models\Product::class,
            'packaging_id'     => \App\Models\ProductPackaging::class,
            'quantity_discount_id' => \App\Models\QuantityDiscount::class,
            'stock_lot_id'     => \App\Models\ProductLot::class,
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

# Module Export: CommercialDocument
Generated at: 2026-05-21 20:28:38

## Models

### 📁 C:\xampp\htdocs\sales_managements\app\Models\CommercialDocument.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;

#[Cacheable]
class CommercialDocument extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable,
        BelongsToFiscalYear
        ,HasTenantRouteBinding;

    protected $table = 'commercial_documents';

    protected $fillable = [
        'company_id',
        'document_type_id',
        'numbering_series_id',
        'document_number',
        'user_id',
        'party_id',
        'warehouse_id',
        'fiscal_year_id',
        'currency_id',
        'exchange_rate',
        'document_date',
        'issued_at',
        'due_date',
        'delivery_date',
        'total_ht',
        'total_tva',
        'total_discount',
        'total_stamp',
        'total_ttc',
        'net_to_pay',
        'paid_amount',
        'remaining_amount',
        'notes',
        'internal_notes',
        'payment_terms',
        'shipping_info',
        'legal_mentions',
        'document_status_id',
        'is_locked',
        'validated_at',
        'validated_by',
        'is_proforma',
        'cancellation_reason',
        'source_document_id',
        'cancellation_of_document_id',
        'qr_code_data',
        'is_exported_to_accounting',
        'exported_at',
        'fiscal_stamp_id',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:8',
        'document_date' => 'date',
        'issued_at' => 'datetime',
        'due_date' => 'date',
        'delivery_date' => 'date',
        'total_ht' => 'decimal:4',
        'total_tva' => 'decimal:4',
        'total_discount' => 'decimal:4',
        'total_stamp' => 'decimal:4',
        'total_ttc' => 'decimal:4',
        'net_to_pay' => 'decimal:4',
        'paid_amount' => 'decimal:4',
        'remaining_amount' => 'decimal:4',
        'payment_terms' => 'array',
        'shipping_info' => 'array',
        'legal_mentions' => 'array',
        'is_locked' => 'boolean',
        'validated_at' => 'datetime',
        'is_proforma' => 'boolean',
        'is_exported_to_accounting' => 'boolean',
        'exported_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['document_number', 'notes', 'internal_notes'];
    public static array $filterable = [
        'document_type_id', 'party_id', 'warehouse_id', 'fiscal_year_id',
        'currency_id', 'document_status_id', 'is_locked', 'is_proforma', 'is_exported_to_accounting'
    ];
    public static array $sortable = ['id', 'document_number', 'document_date', 'total_ttc', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'documentType', 'numberingSeries', 'user', 'party', 'warehouse', 'fiscalYear',
        'currency', 'documentStatus', 'validatedBy', 'sourceDocument', 'cancellationOfDocument',
        'lines', 'payments', 'stockMovements', 'createdBy', 'updatedBy', 'deletedBy'
    ];
    public static string $defaultSort = 'document_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['commercial_documents'];
    public static array $cacheInvalidateRelations = ['lines', 'payments', 'stockMovements'];
    public static array $scopes = [];

    public function documentType(): BelongsTo { return $this->belongsTo(DocumentType::class); }
    public function numberingSeries(): BelongsTo { return $this->belongsTo(NumberingSeries::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function party(): BelongsTo { return $this->belongsTo(Party::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function fiscalYear(): BelongsTo { return $this->belongsTo(FiscalYear::class); }
    public function currency(): BelongsTo { return $this->belongsTo(Currency::class); }
    public function documentStatus(): BelongsTo { return $this->belongsTo(DocumentStatus::class); }
    public function validatedBy(): BelongsTo { return $this->belongsTo(User::class, 'validated_by'); }
    public function sourceDocument(): BelongsTo { return $this->belongsTo(CommercialDocument::class, 'source_document_id'); }
    public function cancellationOfDocument(): BelongsTo { return $this->belongsTo(CommercialDocument::class, 'cancellation_of_document_id'); }
    public function lines(): HasMany { return $this->hasMany(CommercialDocumentLine::class); }
    public function payments(): BelongsToMany
    {
        return $this->belongsToMany(Payment::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }
    public function stockMovements(): HasManyThrough
    {
        return $this->hasManyThrough(StockMovement::class, CommercialDocumentLine::class, 'commercial_document_id', 'commercial_document_line_id');
    }

    public function scopeLocked(Builder $query): Builder { return $query->where('is_locked', true); }
    public function scopeUnlocked(Builder $query): Builder { return $query->where('is_locked', false); }
    public function scopeValidated(Builder $query): Builder { return $query->whereNotNull('validated_at'); }
    public function scopeUnpaid(Builder $query): Builder { return $query->where('remaining_amount', '>', 0); }
    public function scopeOverdue(Builder $query): Builder { return $query->where('due_date', '<', now())->where('remaining_amount', '>', 0); }

    public function isFullyPaid(): bool { return $this->remaining_amount <= 0; }
    public function isOverdue(): bool { return $this->due_date && $this->due_date->isPast() && !$this->isFullyPaid(); }
    public function canBeModified(): bool { return !$this->is_locked && !$this->validated_at; }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Models\CommercialDocumentLine.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class CommercialDocumentLine extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'commercial_document_lines';

    protected $fillable = [
        'company_id',
        'commercial_document_id',
        'product_id',
        'line_order',
        'description',
        'quantity',
        'delivered_quantity',
        'returned_quantity',
        'unit_price_ht',
        'discount_percentage',
        'discount_amount',
        'additional_costs',
        'total_additional_cost',
        'total_discount_amount',
        'tva_rate',
        'total_ht',
        'total_tva',
        'total_ttc',
        'stock_lot_id',
        'is_auto_split',
        'parent_line_id',
        'line_attributes',
        'packaging_id',

    ];

    protected $casts = [
        'additional_costs' => 'array',
        'line_attributes' => 'array',
        'total_additional_cost' => 'decimal:4',
        'total_discount_amount' => 'decimal:4',
        'line_order' => 'integer',
        'quantity' => 'decimal:3',
        'delivered_quantity' => 'decimal:3',
        'returned_quantity' => 'decimal:3',
        'unit_price_ht' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:4',
        'tva_rate' => 'decimal:2',
        'total_ht' => 'decimal:4',
        'total_tva' => 'decimal:4',
        'total_ttc' => 'decimal:4',
        'is_auto_split' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['description'];
    public static array $filterable = ['commercial_document_id', 'product_id', 'stock_lot_id', 'is_auto_split'];
    public static array $sortable = ['id', 'line_order', 'quantity', 'total_ttc', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commercialDocument', 'product', 'stockLot', 'parentLine', 'childLines', 'stockMovements'];
    public static string $defaultSort = 'line_order';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 50;
    public static int $perPageLimit = 200;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['commercial_document_lines'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function commercialDocument(): BelongsTo { return $this->belongsTo(CommercialDocument::class); }
    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function stockLot(): BelongsTo { return $this->belongsTo(ProductLot::class, 'stock_lot_id'); }
    public function parentLine(): BelongsTo { return $this->belongsTo(CommercialDocumentLine::class, 'parent_line_id'); }
    public function childLines(): HasMany { return $this->hasMany(CommercialDocumentLine::class, 'parent_line_id'); }
    public function stockMovements(): HasMany { return $this->hasMany(StockMovement::class, 'commercial_document_line_id'); }

    public function scopeParentLines(Builder $query): Builder { return $query->whereNull('parent_line_id'); }
    public function scopeChildLines(Builder $query): Builder { return $query->whereNotNull('parent_line_id'); }

    public function getRemainingQuantity(): float { return $this->quantity - $this->delivered_quantity - $this->returned_quantity; }
    public function isFullyDelivered(): bool { return $this->getRemainingQuantity() <= 0; }
    public function hasDiscount(): bool { return $this->discount_percentage > 0 || $this->discount_amount > 0; }
}

```

## Controllers

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\CommercialDocumentController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCommercialDocumentRequest;
use App\Http\Requests\UpdateCommercialDocumentRequest;
use App\Http\Resources\CommercialDocumentResource;
use App\Services\QRCodeService;
use App\Services\CommercialDocumentService;
use App\Models\CommercialDocument;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Commercial Document Controller
 *
 * إدارة الوثائق التجارية (فواتير، عروض أسعار، أوامر شراء)
 *
 * @package App\Http\Controllers\Api\V1
 */
class CommercialDocumentController extends BaseApiController
{
    protected string $resourceName = 'commercial_document';
    protected ?string $resourceClass = CommercialDocumentResource::class;

    public function __construct(
        private CommercialDocumentService $commercialDocumentService,
        private QRCodeService $qrCodeService
    )
    {
        parent::__construct();
    }

    /**
     * Get unpaid documents
     */
    public function unpaid(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $documents = $this->commercialDocumentService->getUnpaid();

            return $this->successResponse(
                CommercialDocumentResource::collection($documents),
                'تم جلب قائمة الوثائق غير المدفوعة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unpaid');
        }
    }

    /**
     * Get overdue documents
     */
    public function overdue(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $documents = $this->commercialDocumentService->getOverdue();

            return $this->successResponse(
                CommercialDocumentResource::collection($documents),
                'تم جلب قائمة الوثائق المتأخرة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'overdue');
        }
    }

    /**
     * Validate document
     */
    public function validateDocument(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);

            $this->commercialDocumentService->validateDocument($document, $request);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم التحقق من الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'validate');
        }
    }

    /**
     * Lock document
     */
    public function lock(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);

            $this->commercialDocumentService->lockDocument($document);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lock');
        }
    }

    /**
     * Unlock document
     */
    public function unlock(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('update', $document);

            $this->commercialDocumentService->unlockDocument($document);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم فتح قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unlock');
        }
    }

    /**
     * Cancel document
     */
    public function cancel(Request $request, $id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('delete', $document);

            $request->validate(['cancellation_reason' => 'required|string|max:500']);

            $this->commercialDocumentService->cancelDocument($document, $request->cancellation_reason);

            return $this->successResponse(
                new CommercialDocumentResource($document->fresh()),
                'تم إلغاء الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cancel');
        }
    }

    protected function getService(): CommercialDocumentService
    {
        return $this->commercialDocumentService;
    }

    protected function getModelClass(): string
    {
        return CommercialDocument::class;
    }

    public function generateQRCode($id): JsonResponse
    {
        try {
            $document = $this->commercialDocumentService->findById($id);
            $this->authorizeAction('view', $document);

            $qrCode = $this->qrCodeService->generateForDocument($document);
            $qrDataString = $this->qrCodeService->getQRDataString($document);

            return $this->successResponse([
                'qr_code_base64' => $qrCode,
                'qr_data_string' => $qrDataString,
            ], 'تم توليد QR Code بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'generateQRCode');
        }
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Controllers\Api\V1\CommercialDocumentLineController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CommercialDocumentLineResource;
use App\Services\CommercialDocumentLineService;
use App\Models\CommercialDocumentLine;

class CommercialDocumentLineController extends BaseApiController
{
    protected string $resourceName = 'commercial_document_line';
    protected ?string $resourceClass = CommercialDocumentLineResource::class;

    public function __construct(private CommercialDocumentLineService $service)
    {
        parent::__construct();
    }

    protected function getService(): CommercialDocumentLineService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return CommercialDocumentLine::class;
    }
}
```

## Services

### 📁 C:\xampp\htdocs\sales_managements\app\Services\CommercialDocumentLineService.php
```php
<?php

namespace App\Services;

use App\Models\CommercialDocumentLine;

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected function getResourceName(): string { return $this->resourceName; }

}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Services\CommercialDocumentService.php
```php
<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use App\Models\FiscalYear;
use App\Models\NumberingSeries;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType',
        'party',
        'warehouse',
        'currency',
        'documentStatus',
        'lines.product',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════
    // Hooks — الترتيب الصحيح مع parent::beforeCreate()
    // ═══════════════════════════════════════════════════════════════

    /**
     * ⚠️ ملاحظة معمارية مهمة:
     *
     * BaseService::beforeCreate() يحذف company_id من $data تطبيقاً
     * لحماية Mass Assignment (الطبقة 4). لذا يجب أن:
     *   1. نعيّن company_id محلياً للاستخدام في هذا الدالة
     *   2. نستدعي parent::beforeCreate() الذي يحذفه من $data
     *   3. نُعيده بعد parent::beforeCreate() ليصل إلى Model::create()
     *
     * HasCompany trait يضيف company_id تلقائياً عبر creating() Observer،
     * لكننا نحتاجه هنا لـ: توليد رقم الوثيقة، validateTenantRelations،
     * resolveNumberingSeries — قبل أن يُنشأ الـ Model.
     */
    protected function beforeCreate(array $data, $request): array
    {
        // ══ الخطوة 1: تحديد company_id للاستخدام الداخلي ══════════
        // نجلبه من السياق أو من $data (قبل أن يحذفه parent)
        $companyId = (int) ($data['company_id'] ?? app(CompanyContextService::class)->get());

        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        // ══ الخطوة 2: استدعاء parent (يفلتر الأعمدة، يحذف company_id) ══
        $data = parent::beforeCreate($data, $request);

        // ══ الخطوة 3: إعادة company_id — ضروري لإنشاء الوثيقة ══════
        // HasCompany trait يمكنه تعيينه أيضاً، لكننا نضمن القيمة هنا
        $data['company_id'] = $companyId;

        // ══ الخطوة 4: user_id من المستخدم المسجّل ══════════════════
        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        // ══ الخطوة 5: إعداد بيانات الوثيقة (issued_at، exchange_rate) ══
        $data = $this->prepareDocumentData($data);

        // ══ الخطوة 6: التحقق من نوع الوثيقة ════════════════════════
        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        // ══ الخطوة 7: التحقق من party_id حسب نوع الوثيقة ══════════
        // بعض الأنواع (مثل Bon de transfert) لا تتطلب طرفاً
        if ($documentType->requires_party && empty($data['party_id'])) {
            throw new BusinessRuleException('يجب تحديد العميل/المورد لهذا النوع من الوثائق.', 422);
        }

        // ══ الخطوة 8: سلسلة الترقيم ══════════════════════════════
        if (empty($data['numbering_series_id'])) {
            $series = $this->resolveNumberingSeries($documentType->id, $companyId);
            $data['numbering_series_id'] = $series->id;
        }

        // ══ الخطوة 9: توليد رقم الوثيقة (داخل transaction مستقلة) ══
        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($documentType, $companyId);
        }

        // ══ الخطوة 10: السنة المالية ═══════════════════════════════
        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId);
            if (!$data['fiscal_year_id']) {
                throw new BusinessRuleException('لا توجد سنة مالية مفتوحة. يرجى إنشاء سنة مالية أولاً.', 422);
            }
        }

        // ══ الخطوة 11: الحالة الافتراضية (draft) ═══════════════════
        if (empty($data['document_status_id'])) {
            $data['document_status_id'] = $this->getDefaultStatusId($companyId);
        }

        // ══ الخطوة 12: أمان Cross-Tenant ════════════════════════════
        // نتحقق فقط من الحقول الموجودة والغير فارغة
        $this->validateTenantRelations($data, $companyId, [
            'party_id'       => 'parties',
            'warehouse_id'   => 'warehouses',
            'fiscal_year_id' => 'fiscal_years',
            'currency_id'    => 'currencies',
        ]);

        return $data;
    }

    /**
     * بعد إنشاء الوثيقة: إنشاء الأسطر وحساب الإجماليات
     *
     * ✅ LineObserver يحسب إجماليات كل سطر في saving()
     * ✅ calculateTotals() يستخدم updateQuietly() لتجنب إعادة تشغيل Observer
     */
    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['lines'])) {
            $this->createDocumentLines($item, $data['lines']);
        }

        // حساب إجماليات الوثيقة من الأسطر المحسوبة
        $this->calculateTotals($item);
    }

    /**
     * بعد commit الكامل: إنشاء حركات المخزون
     *
     * ✅ بعد commit لضمان عدم rollback جزئي في حالة فشل حركة المخزون
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // نُعيد تحميل documentType لأن $item قد يكون محملاً قبل commit
        $item->load('documentType', 'lines.product');

        // حركات المخزون فقط للوثائق التي تؤثر على المخزون
        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }
    }

    /**
     * ✅ تحقق من null قبل استدعاء cannot()
     * ✅ نستخدم $request?->user() بدل auth() للسماح بـ programmatic calls
     */
    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        // استدعاء parent أولاً (يمنع تغيير company_id)
        parent::beforeUpdate($item, $data, $request);

        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        if ($item->validated_at && $request?->user()?->cannot('force_edit_document')) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة معتمدة. تواصل مع المدير لتجاوز هذا القيد.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مقفلة.', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة تم تصديرها للمحاسبة.', 409);
        }

        // تحقق من وجود مدفوعات مرتبطة
        if ($item->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مرتبطة بمدفوعات.', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════

    private function prepareDocumentData(array $data): array
    {
        // إذا لم يُرسَل exchange_rate، نجلبه تلقائياً
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate((int) $data['currency_id']);
        }

        // issued_at = document_date إذا لم يُرسَل
        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        // document_date الافتراضي = اليوم
        if (empty($data['document_date'])) {
            $data['document_date'] = now()->toDateString();
        }

        return $data;
    }

    /**
     * جلب سلسلة ترقيم نشطة أو إنشاء واحدة تلقائياً.
     */
    private function resolveNumberingSeries(int $documentTypeId, int $companyId): NumberingSeries
    {
        $series = NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first();

        if ($series) {
            return $series;
        }

        // fallback: إنشاء سلسلة افتراضية
        $prefix = $this->getPrefixForDocumentType($documentTypeId);

        return NumberingSeries::create([
            'company_id'       => $companyId,
            'document_type_id' => $documentTypeId,
            'name'             => $prefix . '-' . date('Y'),
            'prefix'           => $prefix,
            'current_number'   => 0,
            'is_locked'        => false,
        ]);
    }

    /**
     * ✅ استخدام الـ code من DocumentType بدل hardcoded match
     * — يتوافق مع DocumentTypeSeeder الذي يُعرّف: DEV, BCC, BL, FV, AV, DDP, BCF, BR, FA, AA, BT
     */
    private function getPrefixForDocumentType(int $documentTypeId): string
    {
        $code = DocumentType::where('id', $documentTypeId)->value('code');
        return $code ?? 'DOC';
    }

    /**
     * توليد رقم وثيقة فريد scoped بالشركة.
     *
     * ✅ يلفّ بـ DB::transaction() لضمان عمل lockForUpdate حتى لو
     *    استُدعيت خارج transaction خارجية (savepoints في MySQL/PostgreSQL).
     * ✅ يستخدم code من DocumentType مباشرة (لا hardcoded IDs).
     */
    private function generateDocumentNumber(DocumentType $documentType, int $companyId): string
    {
        return DB::transaction(function () use ($documentType, $companyId) {
            $prefix = $documentType->code;
            $year   = date('Y');
            $key    = $prefix . '-' . $year . '-%';

            // lockForUpdate يمنع race condition في الإنشاء المتزامن
            $last = CommercialDocument::where('company_id', $companyId)
                ->where('document_number', 'like', $key)
                ->orderByDesc('id') // أسرع من orderByDesc('document_number')
                ->lockForUpdate()
                ->first();

            if ($last) {
                $parts = explode('-', $last->document_number);
                $seq   = (int) end($parts) + 1;
            } else {
                $seq = 1;
            }

            return sprintf('%s-%s-%06d', $prefix, $year, $seq);
        });
    }

    /**
     * جلب السنة المالية الحالية scoped بالشركة.
     */
    private function getCurrentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    /**
     * جلب الحالة الافتراضية (draft) scoped بالشركة.
     */
    private function getDefaultStatusId(int $companyId): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', 'draft')
            ->value('id');
    }

    /**
     * جلب حالة "ملغي" scoped بالشركة.
     */
    private function getCancelledStatusId(int $companyId): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', 'cancelled')
            ->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        // العملة الأساسية (DZD افتراضياً id=1) — لا حاجة لاستعلام
        if ($currencyId === 1) {
            return 1.0;
        }

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->value('rate');

        return $rate ?? 1.0;
    }

    /**
     * إنشاء أسطر الوثيقة.
     *
     * ✅ لا نستدعي calculateLineTotals() هنا —
     *    CommercialDocumentLineObserver::saving() يحسبها تلقائياً.
     * ✅ نحذف packaging_id إذا لم يكن في migration بعد (أو نتركه إن كان موجوداً).
     */
    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        // التحقق من أن جميع products تنتمي لنفس الشركة (Cross-Tenant)
        $productIds = array_filter(array_column($lines, 'product_id'));
        if (!empty($productIds)) {
            $this->validateTenantRelationsMany(
                array_map('intval', $productIds),
                'products',
                $document->company_id
            );
        }

        $lineOrder = 1;

        foreach ($lines as $lineData) {
            // الحقول الإلزامية للسطر
            $lineData['commercial_document_id'] = $document->id;
            $lineData['company_id']             = $document->company_id;
            $lineData['line_order']             = $lineOrder++;

            // ✅ لا نحسب الإجماليات هنا — LineObserver يتولى ذلك في saving()
            // ✅ LineObserver يعمل فقط إذا تغيرت القيم الأساسية (isDirty check)

            $document->lines()->create($lineData);
        }
    }

    /**
     * حساب إجماليات الوثيقة من الأسطر.
     *
     * ✅ يستخدم updateQuietly() لتجنب إعادة تشغيل CommercialDocumentObserver::saving()
     *    الذي يحتاج lines محملة — مما يؤدي إلى حلقة إذا استُخدم update() العادي.
     * ✅ نحمّل الأسطر من قاعدة البيانات بعد إنشائها (قيم Observer المحسوبة).
     */
    private function calculateTotals(CommercialDocument $document): void
    {
        // تحميل الأسطر المحسوبة من DB (بعد تشغيل LineObserver)
        $document->load('lines');

        $lines         = $document->lines;
        $totalHt       = $lines->sum('total_ht');
        $totalTva      = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        // حساب الطابع الجبائي
        $totalStamp = app(FiscalStampCalculator::class)->calculate($document);

        // حساب TAP إن وجدت
        $totalTap = 0.0;
        if (class_exists(\App\Services\Tax\TAPCalculator::class)) {
            $totalTap = app(\App\Services\Tax\TAPCalculator::class)->calculate($document);
        }

        $netToPay = $totalTtc + $totalStamp + $totalTap;

        // ✅ updateQuietly() — لا يشغّل Observers ولا Events
        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,      4),
            'total_discount'   => round($totalDiscount, 4),
            'total_stamp'      => round($totalStamp,    4),
            'total_tap'        => round($totalTap,      4),
            'total_ttc'        => round($totalTtc,      4),
            'net_to_pay'       => round($netToPay,      4),
            'remaining_amount' => round($netToPay,      4), // paid_amount = 0 عند الإنشاء
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Actions
    // ═══════════════════════════════════════════════════════════════

    /**
     * اعتماد الوثيقة وإنشاء حركات المخزون.
     *
     * ✅ idempotent: إذا كانت validated_at موجودة نتجاهل الطلب
     */
    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return; // بالفعل معتمدة
        }

        // ✅ updateQuietly لتجنب تشغيل Observer::saving() مع lines غير محملة
        $document->updateQuietly([
            'validated_at' => now(),
            'validated_by' => $request?->user()?->id ?? auth()->id(),
        ]);

        // تحديث الحالة إلى "validated"
        $validatedStatusId = DocumentStatus::where('company_id', $document->company_id)
            ->where('name', 'validated')
            ->value('id');

        if ($validatedStatusId && $document->document_status_id !== $validatedStatusId) {
            $document->updateQuietly(['document_status_id' => $validatedStatusId]);
        }

        // إنشاء حركات المخزون إذا كان النوع يؤثر على المخزون
        $document->load('documentType', 'lines.product');
        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($document);
        }
    }

    public function lockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => true]);
    }

    public function unlockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => false]);
    }

    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مقفلة.', 409);
        }

        if ($document->payments()->exists()) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مرتبطة بمدفوعات.', 409);
        }

        $cancelledStatusId = $this->getCancelledStatusId($document->company_id);

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $cancelledStatusId,
        ]);
    }

    public function getUnpaid()
    {
        return CommercialDocument::unpaid()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    public function getOverdue()
    {
        return CommercialDocument::overdue()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════════
    // Stock Movements
    // ═══════════════════════════════════════════════════════════════

    /**
     * إنشاء حركات المخزون من أسطر الوثيقة.
     *
     * ✅ يتحقق من أن الـ documentType موجود ويؤثر على المخزون
     * ✅ يتحقق من أن المنتج موجود في كل سطر
     * ✅ direction مستخرج من DocumentType (وليس hardcoded)
     */
    private function createStockMovements(CommercialDocument $document): void
    {
        $documentType = $document->documentType;
        if (!$documentType) {
            return;
        }

        $direction = $documentType->affects_stock_direction;
        if ($direction === 0) {
            return; // الوثيقة لا تؤثر على المخزون (DEV، BCC، DDP، BCF)
        }

        if (!$document->warehouse_id) {
            Log::warning("CommercialDocumentService: لا يوجد مستودع للوثيقة #{$document->id} — لن تُنشأ حركات مخزون.");
            return;
        }

        $valuationService    = app(InventoryValuationService::class);
        $stockMovementTypeId = $this->getStockMovementTypeId($direction);

        foreach ($document->lines as $line) {
            if (!$line->product) {
                continue;
            }

            // حساب سعر التكلفة حسب اتجاه الحركة
            if ($direction < 0) {
                // خروج (مبيعات): نستخدم سعر التكلفة الحالي من المخزون
                $costPrice = $valuationService->getCostPriceForSale(
                    $line->product,
                    $document->warehouse_id,
                    $line->quantity
                );
            } else {
                // دخول (مشتريات): سعر التكلفة = سعر الشراء
                $costPrice = (float) $line->unit_price_ht;
            }

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $stockMovementTypeId,
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => $line->quantity,
                'unit_price'                  => $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => round($line->quantity * $costPrice, 4),
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'is_validated'                => true,
            ]);
        }
    }

    private function getStockMovementTypeId(int $direction): int
    {
        // direction > 0 = إدخال (شراء/إرجاع بيع)
        // direction < 0 = إخراج (بيع/إرجاع شراء)
        return match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };
    }
}

```

## Requests

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\StoreCommercialDocumentRequest.php
```php
<?php

namespace App\Http\Requests;

use App\Models\DocumentType;
use Illuminate\Foundation\Http\FormRequest;

/**
 * StoreCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ party_id: required/nullable يُحدَّد ديناميكياً حسب نوع الوثيقة.
 *    - Bon de transfert (BT): requires_party = false → nullable
 *    - باقي الأنواع: requires_party = true → required
 *
 * ✅ lines.*.packaging_id: nullable لأن migration أضافها لاحقاً
 *    ويجب أن يكون الـ Service هو من يتجاهلها لا الـ Request.
 *
 * ✅ fiscal_year_id: nullable — يعيّنه الـ Service تلقائياً
 *    من السنة المالية الحالية للشركة.
 *
 * ✅ currency_id: nullable — يُستخدم DZD (id=1) افتراضياً.
 * ══════════════════════════════════════════════════════════════════
 */
class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // التحقق من الصلاحيات يتم في Controller عبر authorizeAction()
    }

    public function rules(): array
    {
        // تحديد إذا كان نوع الوثيقة يتطلب طرفاً (عميل/مورد)
        $partyRequired = $this->resolvePartyRequired();

        return [
            // ── بيانات الوثيقة الأساسية ──────────────────────────────
            'document_type_id'    => 'required|integer|exists:document_types,id',

            // ✅ party_id: required أو nullable حسب نوع الوثيقة
            'party_id'            => $partyRequired
                                        ? 'required|integer|exists:parties,id'
                                        : 'nullable|integer|exists:parties,id',

            'warehouse_id'        => 'nullable|integer|exists:warehouses,id',
            'currency_id'         => 'nullable|integer|exists:currencies,id',
            'fiscal_year_id'      => 'nullable|integer|exists:fiscal_years,id',
            'numbering_series_id' => 'nullable|integer|exists:numbering_series,id',
            'document_number'     => 'nullable|string|max:50',

            // ── التواريخ ──────────────────────────────────────────────
            'document_date'  => 'nullable|date',
            'issued_at'      => 'nullable|date',
            'due_date'       => 'nullable|date|after_or_equal:document_date',
            'delivery_date'  => 'nullable|date',

            // ── الملاحظات والبيانات الإضافية ─────────────────────────
            'notes'          => 'nullable|string|max:2000',
            'internal_notes' => 'nullable|string|max:2000',
            'payment_terms'  => 'nullable|array',
            'shipping_info'  => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'is_proforma'    => 'nullable|boolean',
            'exchange_rate'  => 'nullable|numeric|min:0.0001',

            // ── الأسطر ───────────────────────────────────────────────
            'lines'                            => 'required|array|min:1',
            'lines.*.product_id'               => 'required|integer|exists:products,id',
            'lines.*.quantity'                 => 'required|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.line_attributes'          => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'document_type_id.required'   => 'يجب تحديد نوع الوثيقة.',
            'party_id.required'           => 'يجب تحديد العميل أو المورد لهذا النوع من الوثائق.',
            'lines.required'              => 'يجب إضافة سطر واحد على الأقل.',
            'lines.min'                   => 'يجب إضافة سطر واحد على الأقل.',
            'lines.*.product_id.required' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.quantity.min'        => 'يجب أن تكون الكمية أكبر من الصفر.',
            'lines.*.unit_price_ht.required' => 'يجب تحديد السعر لكل سطر.',
            'lines.*.unit_price_ht.min'   => 'يجب أن يكون السعر غير سلبي.',
            'due_date.after_or_equal'     => 'يجب أن يكون تاريخ الاستحقاق بعد أو مساوياً لتاريخ الوثيقة.',
        ];
    }

    /**
     * تحديد إذا كان party_id إلزامياً حسب نوع الوثيقة.
     *
     * ✅ نجلب DocumentType مرة واحدة ونخزّنها في الـ instance
     * ✅ إذا لم نتمكن من تحديد النوع، نعتبره إلزامياً (الأكثر أماناً)
     */
    private function resolvePartyRequired(): bool
    {
        $documentTypeId = $this->input('document_type_id');

        if (!$documentTypeId) {
            return true; // إلزامي افتراضياً — validation ستفشل على document_type_id
        }

        $documentType = DocumentType::find($documentTypeId);

        // إذا لم يُعثر على النوع، requires_party = true افتراضياً
        return $documentType?->requires_party ?? true;
    }
}

```

### 📁 C:\xampp\htdocs\sales_managements\app\Http/Requests\UpdateCommercialDocumentRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * UpdateCommercialDocumentRequest
 * ══════════════════════════════════════════════════════════════════
 *
 * ✅ كل الحقول sometimes/nullable — التحديث جزئي (PATCH-style)
 * ✅ lines.*.product_id و quantity و unit_price_ht كلها required
 *    فقط إذا أُرسلت lines (الـ Service يتولى الباقي)
 * ✅ document_number لا يُسمح بتغييره بعد الإنشاء
 *    (يتحقق منه beforeUpdate في الـ Service)
 * ══════════════════════════════════════════════════════════════════
 */
class UpdateCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // التحقق من الصلاحيات يتم في Controller عبر authorizeAction()
    }

    public function rules(): array
    {
        return [
            // ── بيانات الوثيقة ────────────────────────────────────────
            'document_type_id'    => 'sometimes|integer|exists:document_types,id',
            'party_id'            => 'sometimes|nullable|integer|exists:parties,id',
            'warehouse_id'        => 'sometimes|nullable|integer|exists:warehouses,id',
            'currency_id'         => 'sometimes|nullable|integer|exists:currencies,id',
            'fiscal_year_id'      => 'sometimes|nullable|integer|exists:fiscal_years,id',
            'numbering_series_id' => 'sometimes|nullable|integer|exists:numbering_series,id',
            'exchange_rate'       => 'sometimes|nullable|numeric|min:0.0001',

            // ── التواريخ ──────────────────────────────────────────────
            'document_date'  => 'sometimes|nullable|date',
            'issued_at'      => 'sometimes|nullable|date',
            'due_date'       => 'sometimes|nullable|date',
            'delivery_date'  => 'sometimes|nullable|date',

            // ── الملاحظات والبيانات الإضافية ─────────────────────────
            'notes'           => 'sometimes|nullable|string|max:2000',
            'internal_notes'  => 'sometimes|nullable|string|max:2000',
            'payment_terms'   => 'sometimes|nullable|array',
            'shipping_info'   => 'sometimes|nullable|array',
            'legal_mentions'  => 'sometimes|nullable|array',
            'is_proforma'     => 'sometimes|nullable|boolean',

            // ── الأسطر (اختياري في التحديث) ──────────────────────────
            'lines'                            => 'sometimes|array|min:1',

            // ✅ required_with:lines — الحقول إلزامية فقط إذا أُرسلت lines
            'lines.*.product_id'               => 'required_with:lines|integer|exists:products,id',
            'lines.*.quantity'                 => 'required_with:lines|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required_with:lines|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.line_attributes'          => 'nullable|array',
        ];
    }

    public function messages(): array
    {
        return [
            'lines.min'                        => 'إذا أُرسلت الأسطر، يجب أن يكون هناك سطر واحد على الأقل.',
            'lines.*.product_id.required_with' => 'يجب تحديد المنتج لكل سطر.',
            'lines.*.quantity.required_with'   => 'يجب تحديد الكمية لكل سطر.',
            'lines.*.unit_price_ht.required_with' => 'يجب تحديد السعر لكل سطر.',
        ];
    }
}

```

## Policies

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\CommercialDocumentLinePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommercialDocumentLinePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commercial_document_line');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commercial_document_line');
    }

    public function create(User $user): bool
    {
        return $user->can('create_commercial_document_line');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commercial_document_line');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commercial_document_line');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commercial_document_line');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commercial_document_line');
    }
}
```

### 📁 C:\xampp\htdocs\sales_managements\app\Policies\CommercialDocumentPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class CommercialDocumentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_commercial_document');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_commercial_document');
    }

    public function create(User $user): bool
    {
        return $user->can('create_commercial_document');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_commercial_document');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_commercial_document');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_commercial_document');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_commercial_document');
    }
}
```


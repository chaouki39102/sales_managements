# Module Export: CommercialDocument
Generated at: 2026-05-21 12:05:28

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\CommercialDocument.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Models\CommercialDocumentLine.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\CommercialDocumentController.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\CommercialDocumentLineController.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Services\CommercialDocumentLineService.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Services\CommercialDocumentService.php
```php
<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\NumberingSeries;
use App\Core\Exceptions\BusinessRuleException;
use App\Services\Tax\FiscalStampCalculator;
use App\Core\Services\TAPCalculator;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CommercialDocumentService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocument::class;
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
    // Hooks
    // ═══════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        // 1. تعيين company_id من السياق إذا لم يُرسَل
        if (empty($data['company_id'])) {
            $data['company_id'] = app(CompanyContextService::class)->get();
        }

        // 2. تعيين user_id من المستخدم المسجّل
        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        // 3. تعيين issued_at و exchange_rate
        $data = $this->prepareDocumentData($data);

        // 4. تعيين numbering_series_id تلقائياً
        if (empty($data['numbering_series_id'])) {
            $series = $this->resolveNumberingSeries(
                $data['document_type_id'] ?? null,
                $data['company_id']
            );
            $data['numbering_series_id'] = $series->id;
        }

        // 5. توليد رقم الوثيقة
        if (empty($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber(
                $data['document_type_id'] ?? null,
                $data['company_id']         // ✅ مرّر company_id
            );
        }

        // 6. تعيين السنة المالية إذا لم تُرسَل
        if (empty($data['fiscal_year_id'])) {
            $data['fiscal_year_id'] = $this->getCurrentFiscalYearId();
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, $request): void
    {
        if (!empty($data['lines'])) {
            $this->createDocumentLines($item, $data['lines']);
        }

        $this->calculateTotals($item);

        if ($item->documentStatus?->is_default) {
            $this->validateDocument($item, $request);
        }
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        if ($item->documentStatus?->triggers_stock_movement) {
            $this->createStockMovements($item);
        }
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('Cannot modify locked document', 409);
        }

        if ($item->validated_at && !$request->user()->can('force_edit_document')) {
            throw new BusinessRuleException('Validated documents cannot be modified', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('Exported documents cannot be modified', 409);
        }
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->is_locked) {
            throw new BusinessRuleException('Cannot delete locked document', 409);
        }

        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('Cannot delete exported document', 409);
        }

        if ($item->payments()->exists()) {
            throw new BusinessRuleException('Cannot delete document with payments', 409);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Private Helpers
    // ═══════════════════════════════════════════════════════════════

    private function prepareDocumentData(array $data): array
    {
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate($data['currency_id']);
        }

        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        return $data;
    }

    /**
     * جلب سلسلة ترقيم نشطة أو إنشاء واحدة تلقائياً
     */
    private function resolveNumberingSeries(?int $documentTypeId, int $companyId): NumberingSeries
    {
        $series = NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first();

        if ($series) {
            return $series;
        }

        // إنشاء سلسلة افتراضية إن لم توجد (fallback آمن)
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

    private function getPrefixForDocumentType(?int $documentTypeId): string
    {
        return match ($documentTypeId) {
            1  => 'INV',
            2  => 'QT',
            3  => 'ORD',
            4  => 'DN',
            5  => 'CN',
            default => 'DOC',
        };
    }

    /**
     * توليد رقم وثيقة فريد scoped بالشركة
     */
 private function generateDocumentNumber(?int $documentTypeId, int $companyId): string
{
    $prefix = $this->getPrefixForDocumentType($documentTypeId);
    $year   = date('Y');
    $key    = $prefix . '-' . $year;

    $last = CommercialDocument::where('company_id', $companyId)
        ->where('document_number', 'like', $key . '%')
        ->orderByDesc('document_number')
        ->lockForUpdate()
        ->first();

    if ($last) {
        $parts = explode('-', $last->document_number);
        $seq = (int) end($parts) + 1;
    } else {
        $seq = 1;
    }

    return sprintf('%s-%s-%06d', $prefix, $year, $seq);
}

    private function getCurrentFiscalYearId(): ?int
    {
        return \App\Models\FiscalYear::where('is_current', true)->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) return 1.0;

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->first();

        return $rate?->rate ?? 1.0;
    }

    /**
     * إنشاء أسطر الوثيقة مع تعيين company_id وتنظيف packaging_id
     */
    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $lineOrder = 1;

        foreach ($lines as $lineData) {
            // الحقول الإلزامية للسطر
            $lineData['commercial_document_id'] = $document->id;
            $lineData['company_id']             = $document->company_id;
            $lineData['line_order']             = $lineOrder++;

            // packaging_id غير موجود في migration الأسطر — أزِله
            unset($lineData['packaging_id']);

            // احسب الإجماليات
            $this->calculateLineTotals($lineData);

            $document->lines()->create($lineData);
        }
    }

    private function calculateLineTotals(array &$lineData): void
    {
        $quantity  = (float) ($lineData['quantity']      ?? 1);
        $unitPrice = (float) ($lineData['unit_price_ht'] ?? 0);
        $discount  = (float) ($lineData['discount_percentage'] ?? 0);
        $tvaRate   = (float) ($lineData['tva_rate']      ?? 0);

        $totalHt        = $quantity * $unitPrice;
        $discountAmount = $totalHt * ($discount / 100);
        $afterDiscount  = $totalHt - $discountAmount;
        $totalTva       = $afterDiscount * ($tvaRate / 100);
        $totalTtc       = $afterDiscount + $totalTva;

        $lineData['total_ht']       = round($totalHt,        4);
        $lineData['discount_amount'] = round($discountAmount, 4);
        $lineData['total_tva']      = round($totalTva,       4);
        $lineData['total_ttc']      = round($totalTtc,       4);
    }

    private function calculateTotals(CommercialDocument $document): void
    {
        $document->load('lines');

        $lines        = $document->lines;
        $totalHt      = $lines->sum('total_ht');
        $totalTva     = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc     = $totalHt + $totalTva;
        $totalStamp   = (new FiscalStampCalculator())->calculate($document);
        $netToPay     = $totalTtc + $totalStamp;

        $document->update([
            'total_ht'         => $totalHt,
            'total_tva'        => $totalTva,
            'total_discount'   => $totalDiscount,
            'total_stamp'      => $totalStamp,
            'total_ttc'        => $totalTtc,
            'net_to_pay'       => $netToPay,
            'remaining_amount' => $netToPay,
        ]);
    }

    // ═══════════════════════════════════════════════════════════════
    // Public Actions
    // ═══════════════════════════════════════════════════════════════

    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) return;

        $document->update([
            'validated_at' => now(),
            'validated_by' => $request?->user()?->id,
        ]);

        $this->createStockMovements($document);
    }

    public function lockDocument(CommercialDocument $document): void
    {
        $document->update(['is_locked' => true]);
    }

    public function unlockDocument(CommercialDocument $document): void
    {
        $document->update(['is_locked' => false]);
    }

    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->payments()->exists()) {
            throw new BusinessRuleException('Cannot cancel document with payments', 409);
        }

        $document->update([
            'cancellation_reason' => $reason,
            'document_status_id'  => $this->getCancelledStatusId(),
        ]);
    }

    public function getUnpaid()
    {
        return $this->model::unpaid()->with(['party', 'documentType'])->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->with(['party', 'documentType'])->get();
    }

    private function getCancelledStatusId(): int
    {
        return \App\Models\DocumentStatus::where('is_cancelled', true)->value('id') ?? 6;
    }

    private function createStockMovements(CommercialDocument $document): void
    {
        if (!$document->documentType) return;

        $direction = $document->documentType->affects_stock_direction;
        if ($direction === 0) return;

        $valuationService = app(InventoryValuationService::class);

        foreach ($document->lines as $line) {
            if (!$line->product) continue;

            $costPrice = $direction < 0
                ? $valuationService->getCostPriceForSale(
                    $line->product,
                    $document->warehouse_id,
                    $line->quantity
                )
                : (float) $line->unit_price_ht;

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $this->getStockMovementTypeId($direction),
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => $line->quantity,
                'unit_price'                  => $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => $line->quantity * $costPrice,
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'is_validated'                => true,
            ]);
        }
    }

    private function getStockMovementTypeId(int $direction): int
    {
        return match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\CommercialDocumentRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'document_type_id' => 'required|integer|exists:document_types,id',
            'party_id' => 'required|integer|exists:parties,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'document_date' => 'nullable|date',
            'issued_at' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:document_date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'payment_terms' => 'nullable|array',
            'shipping_info' => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'is_proforma' => 'nullable|boolean',
            'lines' => 'required|array|min:1',
            'lines.*.product_id' => 'required|integer|exists:products,id',
            'lines.*.quantity' => 'required|numeric|min:0.001',
            'lines.*.unit_price_ht' => 'required|numeric|min:0',
            'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate' => 'nullable|numeric|min:0|max:100',
            'lines.*.description' => 'nullable|string',
        ];
    }
}

class UpdateCommercialDocumentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $documentId = $this->route('commercial_document');

        return [
            'document_type_id' => 'sometimes|integer|exists:document_types,id',
            'party_id' => 'sometimes|integer|exists:parties,id',
            'warehouse_id' => 'nullable|integer|exists:warehouses,id',
            'currency_id' => 'nullable|integer|exists:currencies,id',
            'document_date' => 'nullable|date',
            'issued_at' => 'nullable|date',
            'due_date' => 'nullable|date',
            'delivery_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'internal_notes' => 'nullable|string',
            'payment_terms' => 'nullable|array',
            'shipping_info' => 'nullable|array',
            'legal_mentions' => 'nullable|array',
            'lines' => 'sometimes|array|min:1',
            'lines.*.product_id' => 'integer|exists:products,id',
            'lines.*.quantity' => 'numeric|min:0.001',
            'lines.*.unit_price_ht' => 'numeric|min:0',
            'lines.*.discount_percentage' => 'nullable|numeric|min:0|max:100',
            'lines.*.tva_rate' => 'nullable|numeric|min:0|max:100',
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\CommercialDocumentLinePolicy.php
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

### 📁 D:\xampp\htdocs\sales-management\app\Policies\CommercialDocumentPolicy.php
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


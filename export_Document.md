# Module Export: Document
Generated at: 2026-05-19 10:59:45

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

#[Cacheable]
class CommercialDocument extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable,
        BelongsToFiscalYear;

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

### 📁 D:\xampp\htdocs\sales-management\app\Models\DocumentBaseOperation.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class DocumentBaseOperation extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'document_base_operations';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['documentTypes'];
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['document_base_operations', 'api'];

    public function documentTypes(): HasMany
    {
        return $this->hasMany(DocumentType::class);
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Models\DocumentPayment.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class DocumentPayment extends Pivot
{
    protected $table = 'document_payment';

    protected $fillable = [
        'company_id',
        'commercial_document_id',
        'payment_id',
        'amount_applied',
        'notes',
    ];

    protected $casts = [
        'amount_applied' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Models\DocumentStatus.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class DocumentStatus extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'document_statuses';

    protected $fillable = [
        'company_id',
        'name',
        'label',
        'color',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['name'];
    public static array $sortable = ['id', 'name', 'label'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commercialDocuments'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_statuses', 'lookups'];

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Models\DocumentType.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class DocumentType extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'document_types';

    protected $fillable = [
        'company_id',
        'name',
        'name_latin',
        'code',
        'description',
        'document_base_operation_id',
        'affects_stock_direction',
        'requires_party',
        'affects_accounting',
        'is_printable',
        'print_template',
        'active',
        'display_order',
    ];

    protected $casts = [
        'affects_stock_direction' => 'integer',
        'requires_party' => 'boolean',
        'affects_accounting' => 'boolean',
        'is_printable' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'name_latin', 'code', 'description'];
    public static array $filterable = ['document_base_operation_id', 'active', 'requires_party'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentBaseOperation', 'numberingSeries', 'commercialDocuments'];
    public static string $defaultSort = 'display_order';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_types', 'lookups'];

    public function documentBaseOperation(): BelongsTo
    {
        return $this->belongsTo(DocumentBaseOperation::class);
    }

    public function numberingSeries(): HasMany
    {
        return $this->hasMany(NumberingSeries::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function affectsStockIn(): bool
    {
        return $this->affects_stock_direction === 1;
    }

    public function affectsStockOut(): bool
    {
        return $this->affects_stock_direction === -1;
    }
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\DocumentBaseOperationController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentBaseOperationResource;
use App\Services\DocumentBaseOperationService;
use App\Models\DocumentBaseOperation;

class DocumentBaseOperationController extends BaseApiController
{
    protected string $resourceName = 'document_base_operation';
    protected ?string $resourceClass = DocumentBaseOperationResource::class;

    public function __construct(private DocumentBaseOperationService $documentBaseOperationService)
    {
        parent::__construct();
    }

    protected function getService(): DocumentBaseOperationService
    {
        return $this->documentBaseOperationService;
    }

    protected function getModelClass(): string
    {
        return DocumentBaseOperation::class;
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\DocumentStatusController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentStatusResource;
use App\Services\DocumentStatusService;
use App\Models\DocumentStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DocumentStatusController extends BaseApiController
{
    protected string $resourceName = 'document_status';
    protected ?string $resourceClass = DocumentStatusResource::class;

    public function __construct(private DocumentStatusService $documentStatusService)
    {
        parent::__construct();
    }

    protected function getService(): DocumentStatusService
    {
        return $this->documentStatusService;
    }

    protected function getModelClass(): string
    {
        return DocumentStatus::class;
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\DocumentTypeController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentTypeResource;
use App\Services\DocumentTypeService as Service;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentTypeController extends BaseApiController
{
    protected string $resourceName = 'document_type';
    protected ?string $resourceClass = DocumentTypeResource::class;

    public function __construct(private Service $service)
    {
        parent::__construct();
    }

    protected function getService(): Service
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return DocumentType::class;
    }

    /**
     * GET /api/v1/document-types
     * يُعيد قائمة أنواع المستندات مرتبةً — مضمون أن يُعيد data دائماً
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $items = DocumentType::query()
                ->when($request->boolean('active_only'), fn($q) => $q->where('active', true))
                ->orderBy('display_order')
                ->orderBy('name')
                ->get();

            return response()->json([
                'data' => DocumentTypeResource::collection($items),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'data'    => [],
                'message' => 'فشل تحميل أنواع المستندات: ' . $e->getMessage(),
            ], 500);
        }
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
use App\Core\Exceptions\BusinessRuleException;
use App\Services\Tax\FiscalStampCalculator;
use App\Core\Services\TAPCalculator;
use App\Models\StockMovement;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Commercial Document Service
 *
 * إدارة الوثائق التجارية (فواتير، عروض أسعار، أوامر شراء، إلخ)
 * - حساب الضرائب (TVA, Timbre, TAP)
 * - إدارة المخزون
 * - التحقق من صحة البيانات
 *
 * @package App\Services
 */
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


    protected function beforeCreate(array $data, $request): array
    {
        $data = $this->prepareDocumentData($data);

        if (!isset($data['document_number'])) {
            $data['document_number'] = $this->generateDocumentNumber($data['document_type_id'] ?? null);
        }

        if (!isset($data['fiscal_year_id'])) {
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

        if ($item->documentStatus?->sends_notification) {
            // Send notification
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

    private function generateDocumentNumber(?int $documentTypeId): string
    {
        $prefix = match ($documentTypeId) {
            1 => 'INV',
            2 => 'QT',
            3 => 'ORD',
            4 => 'DN',
            5 => 'CN',
            default => 'DOC',
        };

        $year = date('Y');
        $sequence = $this->getNextSequence($prefix . $year);

        return sprintf('%s-%s-%06d', $prefix, $year, $sequence);
    }

    private function getNextSequence(string $prefix): int
    {
        $last = CommercialDocument::where('document_number', 'like', $prefix . '%')
            ->orderByDesc('document_number')
            ->first();

        if (!$last) {
            return 1;
        }

        $parts = explode('-', $last->document_number);
        return (int) end($parts) + 1;
    }

    private function getCurrentFiscalYearId(): ?int
    {
        $fiscalYear = \App\Models\FiscalYear::where('is_current', true)->first();
        return $fiscalYear?->id;
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) {
            return 1.0;
        }

        $rate = \App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->first();

        return $rate?->rate ?? 1.0;
    }

    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $lineOrder = 1;

        foreach ($lines as $lineData) {
            $lineData['commercial_document_id'] = $document->id;
            $lineData['line_order'] = $lineOrder++;

            $this->calculateLineTotals($lineData);

            $document->lines()->create($lineData);
        }
    }

    private function calculateLineTotals(array &$lineData): void
    {
        $quantity = $lineData['quantity'] ?? 1;
        $unitPrice = $lineData['unit_price_ht'] ?? 0;

        $lineData['total_ht'] = $quantity * $unitPrice;

        if (!empty($lineData['discount_percentage'])) {
            $lineData['discount_amount'] = $lineData['total_ht'] * ($lineData['discount_percentage'] / 100);
        }

        $afterDiscount = $lineData['total_ht'] - ($lineData['discount_amount'] ?? 0);

        $tvaRate = $lineData['tva_rate'] ?? 0;
        $lineData['total_tva'] = $afterDiscount * ($tvaRate / 100);
        $lineData['total_ttc'] = $afterDiscount + $lineData['total_tva'];
    }

    private function calculateTotals(CommercialDocument $document): void
    {
        $lines = $document->lines;

        $totalHt = $lines->sum('total_ht');
        $totalTva = $lines->sum('total_tva');
        $totalDiscount = $lines->sum('discount_amount');
        $totalTtc = $totalHt + $totalTva;

        $totalStamp = (new FiscalStampCalculator())->calculate($document);
        $netToPay = $totalTtc + $totalStamp;

        $document->update([
            'total_ht' => $totalHt,
            'total_tva' => $totalTva,
            'total_discount' => $totalDiscount,
            'total_stamp' => $totalStamp,
            'total_ttc' => $totalTtc,
            'net_to_pay' => $netToPay,
            'remaining_amount' => $netToPay,
        ]);
    }






    public function validateDocument(CommercialDocument $document, $request): void
    {
        if ($document->validated_at) {
            return;
        }

        $document->update([
            'validated_at' => now(),
            'validated_by' => $request->user()->id ?? null,
        ]);
        
        // إنشاء حركات المخزون بعد الاعتماد
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
            'document_status_id' => $this->getCancelledStatusId(),
        ]);
    }

    private function getCancelledStatusId(): int
    {
        return \App\Models\DocumentStatus::where('is_cancelled', true)->value('id') ?? 6;
    }

    public function getUnpaid()
    {
        return $this->model::unpaid()->with(['party', 'documentType'])->get();
    }

    public function getOverdue()
    {
        return $this->model::overdue()->with(['party', 'documentType'])->get();
    }


    private function createStockMovements(CommercialDocument $document): void
    {
        if (!$document->documentType) return;

        $direction = $document->documentType->affects_stock_direction;
        if ($direction === 0) return; // لا يؤثر على المخزون

        $valuationService = app(InventoryValuationService::class);

        foreach ($document->lines as $line) {
            if (!$line->product) continue;

            $costPrice = $direction < 0
                ? $valuationService->getCostPriceForSale($line->product, $document->warehouse_id, $line->quantity)
                : $line->unit_price_ht; // مشتريات

            StockMovement::create([
                'warehouse_id' => $document->warehouse_id,
                'product_id' => $line->product_id,
                'stock_movement_type_id' => $this->getStockMovementTypeId($direction),
                'commercial_document_id' => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity' => $line->quantity,
                'unit_price' => $line->unit_price_ht,
                'cost_price' => $costPrice,
                'total_price' => $line->quantity * $costPrice,
                'movement_date' => $document->document_date,
                'packaging_id' => $line->packaging_id ?? null,
                'price_source' => $direction < 0 ? 'sale' : 'purchase',
                'is_validated' => true,
            ]);
        }
    }

    private function getStockMovementTypeId(int $direction): int
    {
        // يجب أن يكون لديك أنواع حركات للمخزون معرفة مسبقاً (in/out/adjustment)
        return match (true) {
            $direction > 0 => 1,  // وارد
            $direction < 0 => 2,  // صادر
            default => 3,          // تسوية
        };
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\DocumentBaseOperationService.php
```php
<?php

namespace App\Services;

use App\Models\DocumentBaseOperation;

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected function getResourceName(): string { return $this->resourceName; }

}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\DocumentServices.php
```php
<?php

namespace App\Services;

use App\Models\DocumentType;
use App\Models\CommercialDocumentLine;
use App\Models\Expense;
use App\Models\ProductLot;
use App\Models\FiscalYear;
use App\Models\Payment;
use App\Models\StockMovement;
use App\Models\Gender;
use App\Models\InventoryValuationMethod;
use App\Models\TreasuryAccountType;
use App\Models\FiscalStamp;
use App\Models\DocumentBaseOperation;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';
    protected array $defaultWith = ['documentBaseOperation', 'numberingSeries'];
    protected function getResourceName(): string { return $this->resourceName; }

}

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';
    protected array $defaultWith = ['commercialDocument', 'product', 'stockLot']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }
}

// تم حذف ProductVariantService بالكامل (لأن ProductVariant لم يعد موجوداً)

class ExpenseService extends \App\Core\Services\BaseService
{
    protected string $model = Expense::class;
    protected string $resourceName = 'expense';
    protected array $defaultWith = ['expenseCategory', 'paymentMode', 'treasuryAccount'];

    public function getPaid() { return $this->model::paid()->get(); }
    public function getUnpaid() { return $this->model::unpaid()->get(); }
    protected function getResourceName(): string { return $this->resourceName; }

}

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected array $defaultWith = ['product', 'warehouse']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }

    public function getAvailable() { return $this->model::available()->get(); }
    public function getExpiringSoon(int $days = 30) { return $this->model::expiringSoon($days)->get(); }
}

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';
    protected array $defaultWith = ['closedBy'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getCurrent() { return $this->model::current()->first(); }
    public function getOpen() { return $this->model::open()->get(); }
    public function close(\Illuminate\Database\Eloquent\Model $item, int $userId, ?string $notes = null) { $item->close($userId, $notes); return $item->fresh(); }
}

class PaymentService extends \App\Core\Services\BaseService
{
    protected string $model = Payment::class;
    protected string $resourceName = 'payment';
    protected array $defaultWith = ['currency', 'paymentMode', 'treasuryAccount', 'party'];
    protected function getResourceName(): string { return $this->resourceName; }

    public function getConfirmed() { return $this->model::confirmed()->get(); }
    public function getPending() { return $this->model::pending()->get(); }
}

class StockMovementService extends \App\Core\Services\BaseService
{
    protected string $model = StockMovement::class;
    protected string $resourceName = 'stock_movement';
    protected array $defaultWith = ['product', 'warehouse', 'stockMovementType']; // ✅ تم التعديل
    protected function getResourceName(): string { return $this->resourceName; }
    public function getIncoming() { return $this->model::incoming()->get(); }
    public function getOutgoing() { return $this->model::outgoing()->get(); }
}

class GenderService extends \App\Core\Services\BaseService
{
    protected string $model = Gender::class;
    protected string $resourceName = 'gender';
    protected function getResourceName(): string { return $this->resourceName; }

}

class InventoryValuationMethodService extends \App\Core\Services\BaseService
{
    protected string $model = InventoryValuationMethod::class;
    protected string $resourceName = 'inventory_valuation_method';
    protected array $defaultWith = ['products']; // ✅ تم التعديل (كان productVariants)
    protected function getResourceName(): string { return $this->resourceName; }
}

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
    protected array $defaultWith = ['treasuryAccounts'];
    protected function getResourceName(): string { return $this->resourceName; }
}

class FiscalStampService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalStamp::class;
    protected string $resourceName = 'fiscal_stamp';
    protected function getResourceName(): string { return $this->resourceName; }
}

class DocumentBaseOperationService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentBaseOperation::class;
    protected string $resourceName = 'document_base_operation';
    protected array $defaultWith = ['documentTypes'];
    protected function getResourceName(): string { return $this->resourceName; }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\DocumentStatusService.php
```php
<?php

namespace App\Services;

use App\Models\DocumentStatus;
use Illuminate\Http\Request;

class DocumentStatusService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentStatus::class;
    protected string $resourceName = 'document_status';
    protected function getResourceName(): string { return $this->resourceName; }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\DocumentTypeService.php
```php
<?php

namespace App\Services;

use App\Models\DocumentType;
use Illuminate\Database\Eloquent\Collection;

class DocumentTypeService extends \App\Core\Services\BaseService
{
    protected string $model = DocumentType::class;
    protected string $resourceName = 'document_type';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    /**
     * إعادة جميع أنواع المستندات مرتبةً حسب display_order
     */
    public function getAllOrdered(array $filters = []): Collection
    {
        return DocumentType::query()
            ->when(isset($filters['active']), fn($q) => $q->where('active', $filters['active']))
            ->orderBy('display_order')
            ->orderBy('name')
            ->get();
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\DocumentStatusRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:50|unique:document_statuses,name',
            'label' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:20',
        ];
    }
}

class UpdateDocumentStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'sometimes|string|max:50|unique:document_statuses,name,' . $this->route('document_status'),
            'label' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:20',
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

### 📁 D:\xampp\htdocs\sales-management\app\Policies\DocumentBaseOperationPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentBaseOperationPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_base_operation');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_base_operation');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_base_operation');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_base_operation');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_base_operation');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_base_operation');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_base_operation');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\DocumentPaymentPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentPaymentPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_payment');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_payment');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_payment');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_payment');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_payment');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_payment');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_payment');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\DocumentStatusPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentStatusPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_status');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_status');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_status');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_status');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_status');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_status');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_status');
    }
}
```

### 📁 D:\xampp\htdocs\sales-management\app\Policies\DocumentTypePolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentTypePolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_document_type');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_document_type');
    }

    public function create(User $user): bool
    {
        return $user->can('create_document_type');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_document_type');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_document_type');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_document_type');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_document_type');
    }
}
```

## Routes

### 📁 D:\xampp\htdocs\sales-management\routes/api.php
```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\CompanyController;
use App\Http\Controllers\Api\V1\UserController;

// Tenant Resource Controllers
use App\Http\Controllers\Api\V1\PartyController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\CommercialDocumentController;
use App\Http\Controllers\Api\V1\CommercialDocumentLineController;
use App\Http\Controllers\Api\V1\WarehouseController;
use App\Http\Controllers\Api\V1\NumberingSeriesController;
use App\Http\Controllers\Api\V1\OpeningBalanceStockController;
use App\Http\Controllers\Api\V1\OpeningBalancePartyController;
use App\Http\Controllers\Api\V1\CheckController;
use App\Http\Controllers\Api\V1\TreasuryAccountController;
use App\Http\Controllers\Api\V1\QuantityDiscountController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\ProductLotController;
use App\Http\Controllers\Api\V1\FiscalYearController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\StockMovementController;
use App\Http\Controllers\Api\V1\AuditController;
use App\Http\Controllers\Api\V1\AttachmentController;
use App\Http\Controllers\Api\V1\EmployeeController;
use App\Http\Controllers\Api\V1\EmploymentContractController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\SettingController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\BarcodeController;
use App\Http\Controllers\Api\V1\CompanySeedController;
use App\Http\Controllers\Api\V1\ProductVariantController;

// Tenant Lookup Controllers
use App\Http\Controllers\Api\V1\FamilyController;
use App\Http\Controllers\Api\V1\BrandController;
use App\Http\Controllers\Api\V1\UnitController;
use App\Http\Controllers\Api\V1\PriceLevelController;
use App\Http\Controllers\Api\V1\PaymentModeController;
use App\Http\Controllers\Api\V1\ExpenseCategoryController;
use App\Http\Controllers\Api\V1\ExchangeRateController;

// Global Lookup Controllers
use App\Http\Controllers\Api\V1\WilayaController;
use App\Http\Controllers\Api\V1\CommuneController;
use App\Http\Controllers\Api\V1\CurrencyController;
use App\Http\Controllers\Api\V1\DocumentBaseOperationController;
use App\Http\Controllers\Api\V1\DocumentStatusController;
use App\Http\Controllers\Api\V1\DocumentTypeController;
use App\Http\Controllers\Api\V1\FiscalStampController;
use App\Http\Controllers\Api\V1\GenderController;
use App\Http\Controllers\Api\V1\InventoryValuationMethodController;
use App\Http\Controllers\Api\V1\LegalFormController;
use App\Http\Controllers\Api\V1\PartyTypeController;
use App\Http\Controllers\Api\V1\PermissionController;
use App\Http\Controllers\Api\V1\ProductTypeController;
use App\Http\Controllers\Api\V1\RoleController;
use App\Http\Controllers\Api\V1\StockMovementTypeController;
use App\Http\Controllers\Api\V1\TreasuryAccountTypeController;
use App\Http\Controllers\Api\V1\TvaController;

use App\Models\Company;
use Illuminate\Http\Request;

/*
| API Routes (Laravel 11) — Multi-Tenancy Professional Structure
|--------------------------------------------------------------------------
| ① /api/v1/auth/*
| ② /api/v1/companies/*
| ③ /api/v1/admin/*               ← in api_admin.php
| ④ /api/v1/lookups/*             ← wilayas, communes only
| ⑤ /api/v1/{company}/{resource}  ← tenant data
*/

require base_path('routes/api_admin.php');

Route::prefix('v1')->group(function () {

    // ═══════════════════════════════════════════
    // ① AUTH
    // ═══════════════════════════════════════════
    Route::prefix('auth')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login',    [AuthController::class, 'login']);

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me',               [AuthController::class, 'me']);
            Route::put('/update',           [AuthController::class, 'update']);
            Route::post('/change-password', [AuthController::class, 'changePassword']);
            Route::post('/logout',          [AuthController::class, 'logout']);

            Route::prefix('profile')->group(function () {
                Route::get('/',                   [UserController::class, 'profile']);
                Route::put('/',                   [UserController::class, 'updateProfile']);
                Route::post('/avatar',            [UserController::class, 'updateAvatar']);
                Route::post('/change-password',   [AuthController::class, 'changePassword']);
            });
        });
    });

    // ═══════════════════════════════════════════
    // ② USER COMPANIES
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->prefix('companies')->group(function () {
        Route::get('/current', [CompanyController::class, 'current']);
        Route::post('/switch', [CompanyController::class, 'switch']);

        Route::get('/',  [CompanyController::class, 'index']);
        Route::post('/', [CompanyController::class, 'store']);

        Route::get('/{company}',    [CompanyController::class, 'show']);
        Route::put('/{company}',    [CompanyController::class, 'update']);
        Route::patch('/{company}',  [CompanyController::class, 'update']);
        Route::delete('/{company}', [CompanyController::class, 'destroy']);

        Route::post('/{company}/suspend',   [CompanyController::class, 'suspend']);
        Route::post('/{company}/unsuspend', [CompanyController::class, 'unsuspend']);
        Route::post('/{company}/verify',    [CompanyController::class, 'verify']);
        Route::post('/{company}/unverify',  [CompanyController::class, 'unverify']);
        Route::patch('/{company}/plan',     [CompanyController::class, 'upgradePlan']);

        Route::get(
            '/{company}/members',
            fn(Company $company) => app(CompanyController::class)->members($company)
        );
        Route::post(
            '/{company}/members',
            fn(Request $request, Company $company) => app(CompanyController::class)->addMember($request, $company)
        );
        Route::delete(
            '/{company}/members/{userId}',
            fn(Company $company, int $userId) => app(CompanyController::class)->removeMember($company, $userId)
        );
        Route::patch(
            '/{company}/members/{userId}/role',
            fn(Request $request, Company $company, int $userId) => app(CompanyController::class)->changeMemberRole($request, $company, $userId)
        );
        Route::patch(
            '/{company}/members/{userId}/deactivate',
            fn(Company $company, int $userId) => app(CompanyController::class)->deactivateMember($company, $userId)
        );
        Route::patch(
            '/{company}/members/{userId}/activate',
            fn(Company $company, int $userId) => app(CompanyController::class)->activateMember($company, $userId)
        );
        Route::post(
            '/{company}/transfer-ownership',
            fn(Request $request, Company $company) => app(CompanyController::class)->transferOwnership($request, $company)
        );
    });

    // ═══════════════════════════════════════════
    // ③ SUPER ADMIN (api_admin.php)
    // ═══════════════════════════════════════════

    // ═══════════════════════════════════════════
    // ④ GLOBAL LOOKUPS (only wilayas, communes)
    // ═══════════════════════════════════════════
    Route::middleware('auth:sanctum')->group(function () {
        Route::apiResource('wilayas',  WilayaController::class)->only(['index', 'show']);
        Route::apiResource('communes', CommuneController::class)->only(['index', 'show']);
        Route::get('communes/by-wilaya/{wilaya}', [CommuneController::class, 'byWilaya']);
    });

    // ═══════════════════════════════════════════
    // ⑤ TENANT RESOURCES
    // ═══════════════════════════════════════════
    Route::middleware(['auth:sanctum', 'company'])
        ->prefix('{company}')
        ->group(function () {

            Route::post('seeds/{seeder}', [CompanySeedController::class, 'run']);

            // ── ⑤-أ: لكل أعضاء الشركة (قراءة) ──────────
            Route::get('dashboard',                     [DashboardController::class, 'index']);
            Route::get('dashboard/sales-chart',         [DashboardController::class, 'salesChart']);
            Route::get('dashboard/top-products',        [DashboardController::class, 'topProducts']);
            Route::get('dashboard/top-customers',       [DashboardController::class, 'topCustomers']);
            Route::get('dashboard/recent-transactions', [DashboardController::class, 'recentTransactions']);
            Route::get('dashboard/inventory',           [DashboardController::class, 'inventory']);

            Route::prefix('reports')->group(function () {
                Route::get('sales',     [ReportController::class, 'sales']);
                Route::get('purchases', [ReportController::class, 'purchases']);
                Route::get('customers', [ReportController::class, 'customers']);
                Route::get('suppliers', [ReportController::class, 'suppliers']);
                Route::get('products',  [ReportController::class, 'products']);
                Route::get('inventory', [ReportController::class, 'inventory']);
                Route::get('payments',  [ReportController::class, 'payments']);
                Route::get('taxes',     [ReportController::class, 'taxes']);
            });

            // جداول مرجعية (قراءة)
            Route::apiResource('families',       FamilyController::class)->only(['index', 'show']);
            Route::apiResource('brands',         BrandController::class)->only(['index', 'show']);
            Route::apiResource('units',          UnitController::class)->only(['index', 'show']);
            Route::apiResource('price-levels',   PriceLevelController::class)->only(['index', 'show']);
            Route::apiResource('payment-modes',  PaymentModeController::class)->only(['index', 'show']);
            Route::get('payment-modes/active',   [PaymentModeController::class, 'active']);
            Route::apiResource('exchange-rates', ExchangeRateController::class)->only(['index', 'show']);
            Route::get('exchange-rates/latest',  [ExchangeRateController::class, 'latest']);
            Route::apiResource('expense-categories', ExpenseCategoryController::class)->only(['index', 'show']);
            Route::get('expense-categories/roots',   [ExpenseCategoryController::class, 'roots']);

            Route::apiResource('tvas', TvaController::class)->only(['index', 'show']);
            Route::get('tvas/default', [TvaController::class, 'default']);

            Route::apiResource('document-types',           DocumentTypeController::class)->only(['index', 'show']);
            Route::apiResource('document-statuses',        DocumentStatusController::class)->only(['index', 'show']);
            Route::apiResource('document-base-operations', DocumentBaseOperationController::class)->only(['index', 'show']);
            Route::apiResource('fiscal-stamps',            FiscalStampController::class)->only(['index', 'show']);

            Route::apiResource('genders',     GenderController::class)->only(['index', 'show']);
            Route::apiResource('legal-forms', LegalFormController::class)->only(['index', 'show']);
            Route::apiResource('currencies',  CurrencyController::class)->only(['index', 'show']);

            Route::apiResource('party-types',               PartyTypeController::class)->only(['index', 'show']);
            Route::apiResource('product-types',             ProductTypeController::class)->only(['index', 'show']);
            Route::apiResource('treasury-account-types',    TreasuryAccountTypeController::class)->only(['index', 'show']);
            Route::apiResource('stock-movement-types',      StockMovementTypeController::class)->only(['index', 'show']);
            Route::apiResource('inventory-valuation-methods', InventoryValuationMethodController::class)->only(['index', 'show']);

            // منتجات وأطراف ومستودعات (قراءة)
            Route::get('products',                    [ProductController::class, 'index']);
            Route::get('products/{product}',          [ProductController::class, 'show']);
            Route::get('products/active',             [ProductController::class, 'active']);
            Route::get('products/by-family/{family}', [ProductController::class, 'byFamily']);
            Route::get('products/by-brand/{brand}',   [ProductController::class, 'byBrand']);

            Route::get('product-variants',              [ProductVariantController::class, 'index']);
            Route::get('product-variants/{variant}',    [ProductVariantController::class, 'show']);
            Route::get('products/{product}/variants',   [ProductVariantController::class, 'indexByProduct']);

            Route::get('barcodes',                    [BarcodeController::class, 'index']);
            Route::get('barcodes/{barcode}',          [BarcodeController::class, 'show']);
            Route::get('products/{product}/barcodes', [BarcodeController::class, 'indexByProduct']);

            Route::get('warehouses',           [WarehouseController::class, 'index']);
            Route::get('warehouses/{warehouse}', [WarehouseController::class, 'show']);

            Route::get('parties',         [PartyController::class, 'index']);
            Route::get('parties/{party}', [PartyController::class, 'show']);
            Route::get('customers',       [PartyController::class, 'customers']);
            Route::get('suppliers',       [PartyController::class, 'suppliers']);

            Route::get('product-lots',           [ProductLotController::class, 'index']);
            Route::get('product-lots/{lot}',     [ProductLotController::class, 'show']);
            Route::get('product-lots/available', [ProductLotController::class, 'available']);
            Route::get('product-lots/expiring',  [ProductLotController::class, 'expiring']);

            Route::get('employees',            [EmployeeController::class, 'index']);
            Route::get('employees/{employee}', [EmployeeController::class, 'show']);
            Route::get('employees/active',     [EmployeeController::class, 'active']);

            Route::get('employment-contracts',                            [EmploymentContractController::class, 'index']);
            Route::get('employment-contracts/{contract}',                 [EmploymentContractController::class, 'show']);
            Route::get('employment-contracts/employee/{employee}/active', [EmploymentContractController::class, 'active']);

            Route::get('stock-movements',            [StockMovementController::class, 'index']);
            Route::get('stock-movements/{movement}', [StockMovementController::class, 'show']);
            Route::get('stock-movements/incoming',   [StockMovementController::class, 'incoming']);
            Route::get('stock-movements/outgoing',   [StockMovementController::class, 'outgoing']);

            Route::get('fiscal-years',         [FiscalYearController::class, 'index']);
            Route::get('fiscal-years/{year}',  [FiscalYearController::class, 'show']);
            Route::get('fiscal-years/current', [FiscalYearController::class, 'current']);
            Route::get('fiscal-years/open',    [FiscalYearController::class, 'open']);

            Route::get('roles',                   [RoleController::class, 'index']);
            Route::get('roles/{role}',            [RoleController::class, 'show']);
            Route::get('permissions',             [PermissionController::class, 'index']);
            Route::get('permissions/by-group',    [PermissionController::class, 'byGroup']);
            Route::get('permissions/{permission}',[PermissionController::class, 'show']);

            Route::get('notifications',                              [NotificationController::class, 'index']);
            Route::get('notifications/{notification}',               [NotificationController::class, 'show']);
            Route::get('notifications/unread',                       [NotificationController::class, 'unread']);
            Route::post('notifications/{notification}/mark-read',    [NotificationController::class, 'markAsRead']);
            Route::post('notifications/mark-all-read',               [NotificationController::class, 'markAllAsRead']);

            Route::get('audits',               [AuditController::class, 'index']);
            Route::get('audits/{audit}',       [AuditController::class, 'show']);
            Route::get('audits/user/{user}',   [AuditController::class, 'byUser']);
            Route::get('audits/event/{event}', [AuditController::class, 'byEvent']);

            Route::prefix('me')->group(function () {
                Route::get('/',                 [UserController::class, 'profile']);
                Route::put('/',                 [UserController::class, 'updateProfile']);
                Route::post('/avatar',          [UserController::class, 'updateAvatar']);
                Route::post('/change-password', [AuthController::class, 'changePassword']);
            });

            // ── ⑤-ب: للمالك/المدير (كتابة) ──────────────────
            Route::middleware('can:update_company')->group(function () {

                // جداول مرجعية - كتابة
                Route::apiResource('units',                  UnitController::class,                  ['except' => ['index', 'show']]);
                Route::apiResource('families',               FamilyController::class,                ['except' => ['index', 'show']]);
                Route::apiResource('brands',                 BrandController::class,                 ['except' => ['index', 'show']]);
                Route::apiResource('price-levels',           PriceLevelController::class,            ['except' => ['index', 'show']]);
                Route::apiResource('payment-modes',          PaymentModeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('exchange-rates',         ExchangeRateController::class,          ['except' => ['index', 'show']]);
                Route::apiResource('expense-categories',     ExpenseCategoryController::class,       ['except' => ['index', 'show']]);
                Route::apiResource('tvas',                   TvaController::class,                   ['except' => ['index', 'show']]);
                Route::apiResource('document-types',         DocumentTypeController::class,          ['except' => ['index', 'show']]);
                Route::apiResource('document-statuses',      DocumentStatusController::class,        ['except' => ['index', 'show']]);
                Route::apiResource('document-base-operations', DocumentBaseOperationController::class, ['except' => ['index', 'show']]);
                Route::apiResource('fiscal-stamps',          FiscalStampController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('genders',                GenderController::class,                ['except' => ['index', 'show']]);
                Route::apiResource('legal-forms',            LegalFormController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('currencies',             CurrencyController::class,              ['except' => ['index', 'show']]);
                Route::apiResource('party-types',            PartyTypeController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('product-types',          ProductTypeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('treasury-account-types', TreasuryAccountTypeController::class,  ['except' => ['index', 'show']]);
                Route::apiResource('stock-movement-types',   StockMovementTypeController::class,     ['except' => ['index', 'show']]);
                Route::apiResource('inventory-valuation-methods', InventoryValuationMethodController::class, ['except' => ['index', 'show']]);

                // منتجات وأطراف ومستودعات - كتابة
                Route::apiResource('products',          ProductController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('barcodes',          BarcodeController::class,             ['except' => ['index', 'show']]);
                Route::apiResource('product-variants',  ProductVariantController::class,      ['except' => ['index', 'show']]);
                Route::apiResource('warehouses',        WarehouseController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('parties',           PartyController::class,               ['except' => ['index', 'show']]);

                // مستخدمون (بصلاحيات كاملة)
                Route::apiResource('users', UserController::class);
                Route::get('users/trashed',                [UserController::class, 'trashed']);
                Route::get('users-by-role',                [UserController::class, 'byRole']);
                Route::get('users/active',                 [UserController::class, 'active']);
                Route::get('users/inactive',               [UserController::class, 'inactive']);
                Route::post('users/{user}/restore',        [UserController::class, 'restore']);
                Route::delete('users/{user}/force-delete', [UserController::class, 'forceDelete']);
                Route::post('users/{user}/change-password', [UserController::class, 'changePassword']);
                Route::post('users/{user}/toggle-active',  [UserController::class, 'toggleActive']);
                Route::post('users/{user}/assign-role',    [UserController::class, 'assignRole']);

                // أدوار وصلاحيات
                Route::apiResource('roles',               RoleController::class,               ['except' => ['index', 'show']]);
                Route::apiResource('permissions',         PermissionController::class,         ['except' => ['index', 'show']]);

                // موظفون وعقود
                Route::apiResource('employees',             EmployeeController::class,           ['except' => ['index', 'show']]);
                Route::apiResource('employment-contracts',  EmploymentContractController::class, ['except' => ['index', 'show']]);

                // أرصدة افتتاحية
                Route::apiResource('opening-balance-stocks',  OpeningBalanceStockController::class);
                Route::apiResource('opening-balance-parties', OpeningBalancePartyController::class);

                // سلاسل الترقيم
                Route::apiResource('numbering-series', NumberingSeriesController::class);
                Route::post('numbering-series/{series}/lock',        [NumberingSeriesController::class, 'lock']);
                Route::post('numbering-series/{series}/unlock',      [NumberingSeriesController::class, 'unlock']);
                Route::get('numbering-series/{series}/next-number',  [NumberingSeriesController::class, 'getNextNumber']);
                Route::get('numbering-series/{series}/preview-next', [NumberingSeriesController::class, 'previewNextNumber']);
                Route::post('numbering-series/{series}/sync',        [NumberingSeriesController::class, 'syncNumber']);

                // تخفيضات الكميات
                Route::apiResource('quantity-discounts', QuantityDiscountController::class);
            });

            // ── ⑤-ب-٢: السنوات المالية (manage_fiscal_year) ─────
            Route::middleware('can:manage_fiscal_year')->group(function () {
                Route::post('fiscal-years',              [FiscalYearController::class, 'store']);
                Route::put('fiscal-years/{year}',        [FiscalYearController::class, 'update']);
                Route::patch('fiscal-years/{year}',      [FiscalYearController::class, 'update']);
                Route::delete('fiscal-years/{year}',     [FiscalYearController::class, 'destroy']);
                Route::post('fiscal-years/{year}/close', [FiscalYearController::class, 'close']);
            });

            // ── ⑤-ج: للمالك والمدير والمحاسب ──────────────────
            Route::middleware('can:create_sales_document')->group(function () {
                Route::apiResource('documents', CommercialDocumentController::class);
                Route::get('documents/unpaid',                    [CommercialDocumentController::class, 'unpaid']);
                Route::get('documents/overdue',                   [CommercialDocumentController::class, 'overdue']);
                Route::post('documents/{document}/validate',      [CommercialDocumentController::class, 'validateDocument']);
                Route::post('documents/{document}/lock',          [CommercialDocumentController::class, 'lock']);
                Route::post('documents/{document}/unlock',        [CommercialDocumentController::class, 'unlock']);
                Route::post('documents/{document}/cancel',        [CommercialDocumentController::class, 'cancel']);
                Route::get('documents/{document}/qrcode',         [CommercialDocumentController::class, 'generateQRCode']);

                Route::apiResource('commercial-document-lines', CommercialDocumentLineController::class);

                Route::apiResource('payments', PaymentController::class);
                Route::get('payments/confirmed', [PaymentController::class, 'confirmed']);
                Route::get('payments/pending',   [PaymentController::class, 'pending']);

                Route::apiResource('checks', CheckController::class);
                Route::get('checks/pending',               [CheckController::class, 'pending']);
                Route::get('checks/overdue',               [CheckController::class, 'overdue']);
                Route::post('checks/{check}/mark-cleared', [CheckController::class, 'markAsCleared']);
                Route::post('checks/{check}/mark-bounced', [CheckController::class, 'markAsBounced']);

                Route::get('treasury-accounts/bank-accounts', [TreasuryAccountController::class, 'bankAccounts']);
                Route::get('treasury-accounts/cash-accounts', [TreasuryAccountController::class, 'cashAccounts']);
                Route::get('treasury-accounts/default',       [TreasuryAccountController::class, 'default']);
                Route::apiResource('treasury-accounts', TreasuryAccountController::class);

                Route::apiResource('expenses', ExpenseController::class);
                Route::get('expenses/paid',   [ExpenseController::class, 'paid']);
                Route::get('expenses/unpaid', [ExpenseController::class, 'unpaid']);

                Route::post('product-lots',                [ProductLotController::class, 'store']);
                Route::put('product-lots/{lot}',           [ProductLotController::class, 'update']);
                Route::delete('product-lots/{lot}',        [ProductLotController::class, 'destroy']);

                Route::post('stock-movements',             [StockMovementController::class, 'store']);
                Route::delete('stock-movements/{movement}', [StockMovementController::class, 'destroy']);
            });

            // ── ⑤-د: فردية (المستخدم نفسه) ─────────────────────
            Route::apiResource('attachments', AttachmentController::class);
            Route::get('attachments/{attachment}/download', [AttachmentController::class, 'download']);

            Route::apiResource('settings', SettingController::class);
            Route::get('settings/group/{group}',    [SettingController::class, 'byGroup']);
            Route::get('settings/key/{key}/value',  [SettingController::class, 'getValue']);
        });
});

```

## Migrations

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_093204_create_document_base_operations_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_base_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->text('description')->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_base_operations');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_093421_create_document_types_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 100);
            $table->string('name_latin', 100);
            $table->string('code', 20);
            $table->text('description')->nullable();
            $table->foreignId('document_base_operation_id')->constrained('document_base_operations')->restrictOnDelete()->cascadeOnUpdate();
            $table->smallInteger('affects_stock_direction')->default(0)->comment('-1 for stock out, 0 for no effect, 1 for stock in');
            $table->boolean('requires_party')->default(true)->comment('Requires customer/supplier');
            $table->boolean('affects_accounting')->default(true);
            $table->boolean('is_printable')->default(true);
            $table->string('print_template', 100)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->unsignedSmallInteger('display_order')->default(0);
            $table->timestamps();

            $table->unique(['company_id', 'name']);
            $table->unique(['company_id', 'name_latin']);
            $table->unique(['company_id', 'code']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_types');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_093431_create_document_statuses_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_statuses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('name', 50);
            $table->string('label', 100);
            $table->string('color', 20)->nullable();
            $table->boolean('active')->default(true)->index();
            $table->timestamps();
            $table->unique(['company_id', 'name']);
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_statuses');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_093432_create_commercial_documents_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commercial_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('document_type_id')->constrained('document_types')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_document_type_id');
            $table->foreignId('numbering_series_id')->constrained('numbering_series')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_numbering_series_id');
            $table->string('document_number', 50);
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_user_id');
            $table->foreignId('party_id')->nullable()->constrained('parties')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_party_id');
            $table->foreignId('warehouse_id')->constrained('warehouses')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_warehouse_id');
            $table->foreignId('fiscal_year_id')->constrained('fiscal_years')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_fiscal_year_id');
            $table->foreignId('currency_id')->constrained('currencies')->restrictOnDelete()->cascadeOnUpdate()->name('fk_docs_currency_id');
            $table->decimal('exchange_rate', 15, 8)->default(1.00);
            $table->date('document_date');
            $table->timestampTz('issued_at')->nullable()->comment('Datetime with timezone for legal issuance time');
            $table->date('due_date')->nullable();
            $table->date('delivery_date')->nullable();
            $table->decimal('total_ht', 15, 4)->default(0.00)->comment('Total excluding tax');
            $table->decimal('total_tva', 15, 4)->default(0.00)->comment('Total VAT');
            $table->decimal('total_discount', 15, 4)->default(0.00)->comment('Total discount');
            $table->decimal('total_stamp', 15, 4)->default(0.00)->comment('Stamp tax');
            $table->decimal('total_ttc', 15, 4)->default(0.00)->comment('Total including tax');
            $table->decimal('net_to_pay', 15, 4)->default(0.00)->comment('Final amount to pay');
            $table->decimal('paid_amount', 15, 4)->default(0.00)->comment('Amount already paid');
            $table->decimal('remaining_amount', 15, 4)->default(0.00)->comment('Amount remaining');
            $table->text('notes')->nullable();
            $table->text('internal_notes')->nullable()->comment('Internal notes not printed');
            $table->json('payment_terms')->nullable();
            $table->json('shipping_info')->nullable();
            $table->json('legal_mentions')->nullable()->comment('Mandatory legal text for invoices');
            $table->foreignId('document_status_id')->nullable()->constrained('document_statuses')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_status_id');
            $table->foreignId('fiscal_stamp_id')->nullable()->constrained('fiscal_stamps')->nullOnDelete();
            $table->boolean('is_locked')->default(false)->index();
            $table->timestamp('validated_at')->nullable();
            $table->foreignId('validated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_validated_by');
            $table->boolean('is_proforma')->default(false)->comment('Is this a proforma invoice?');
            $table->text('cancellation_reason')->nullable();
            $table->foreignId('source_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_source_document_id');
            $table->foreignId('cancellation_of_document_id')->nullable()->constrained('commercial_documents')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_cancellation_of_id');
            $table->string('qr_code_data', 500)->nullable();
            $table->boolean('is_exported_to_accounting')->default(false)->index()->comment('Exported to accounting system?');
            $table->timestamp('exported_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_created_by');
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_updated_by');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate()->name('fk_docs_deleted_by');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'document_number']);
            $table->index(['company_id', 'party_id', 'document_type_id', 'document_date', 'document_status_id'], 'idx_docs_by_party_type_date_status');
            $table->index(['company_id', 'document_status_id', 'due_date', 'remaining_amount'], 'idx_docs_due_by_status_date_amount');
            $table->index(['company_id', 'document_status_id', 'document_date', 'party_id'], 'idx_status_date_party');
            $table->index(['company_id', 'warehouse_id', 'document_date', 'document_status_id'], 'idx_warehouse_date_status');
        });

        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_payment_amounts CHECK (paid_amount <= total_ttc)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_remaining_amount CHECK (remaining_amount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_dates CHECK (due_date IS NULL OR due_date >= document_date)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_discount CHECK (total_discount >= 0)');
            DB::statement('ALTER TABLE commercial_documents ADD CONSTRAINT chk_totals CHECK (total_ttc >= 0)');
            DB::statement("ALTER TABLE commercial_documents COMMENT 'الجدول الرئيسي للمستندات التجارية (فواتير، إلخ) - نظام مبسط (TVA وطابع جبائي فقط)'");
        }
    }
    public function down(): void {
        Schema::dropIfExists('commercial_documents');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_093437_create_commercial_document_lines_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('commercial_document_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('product_id')->constrained('products')->restrictOnDelete()->cascadeOnUpdate();
            $table->unsignedSmallInteger('line_order')->default(0)->comment('ترتيب العرض');
            $table->text('description')->nullable()->comment('وصف إضافي للسطر');
            $table->decimal('quantity', 15, 3);
            $table->decimal('delivered_quantity', 15, 3)->default(0)->comment('الكمية المستلمة/المسلمة');
            $table->decimal('returned_quantity', 15, 3)->default(0)->comment('الكمية المرتجعة');
            $table->decimal('unit_price_ht', 15, 4)->comment('سعر الوحدة قبل الضريبة');
            $table->decimal('discount_percentage', 8, 2)->default(0.00);
            $table->decimal('discount_amount', 15, 4)->default(0.00);
            $table->decimal('tva_rate', 8, 2)->comment('نسبة القيمة المضافة');
            $table->decimal('total_ht', 15, 4)->comment('المجموع الصافي قبل الضريبة');
            $table->decimal('total_tva', 15, 4)->default(0.00);
            $table->decimal('total_ttc', 15, 4)->comment('المجموع النهائي شامل الضريبة');
            $table->json('additional_costs')->nullable()->comment('تكاليف إضافية مرتبطة بالسطر');
            $table->decimal('total_additional_cost', 15, 4)->default(0)->comment('مجموع التكاليف');
            $table->decimal('total_discount_amount', 15, 4)->default(0)->comment('مجموع الخصومات');
            $table->unsignedBigInteger('stock_lot_id')->nullable();
            $table->boolean('is_auto_split')->default(false)->index();
            $table->unsignedBigInteger('parent_line_id')->nullable();
            $table->foreign('parent_line_id')->references('id')->on('commercial_document_lines')->restrictOnDelete();
            $table->json('line_attributes')->nullable()->comment('خصائص إضافية للسطر');
            $table->timestamps();

            $table->index(['company_id', 'commercial_document_id', 'line_order'], 'idx_cdl_doc_order');
            $table->index(['company_id', 'product_id'], 'idx_cdl_product');
            $table->index('stock_lot_id', 'idx_cdl_lot');
        });
    }
    public function down(): void {
        Schema::dropIfExists('commercial_document_lines');
    }
};

```

### 📁 D:\xampp\htdocs\sales-management\database\migrations/2025_10_15_094120_create_document_payment_table.php
```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('document_payment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('companies')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('commercial_document_id')->constrained('commercial_documents')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('payment_id')->constrained('payments')->cascadeOnDelete()->cascadeOnUpdate();
            $table->decimal('amount_applied', 15, 4)->comment('Amount of payment applied to this document');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['company_id', 'commercial_document_id', 'payment_id']);
            $table->index('payment_id');
        });
    }
    public function down(): void {
        Schema::dropIfExists('document_payment');
    }
};

```


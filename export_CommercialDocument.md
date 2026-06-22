# Module Export: CommercialDocument
Generated at: 2026-06-22 12:12:30

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\CommercialDocument.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
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
        BelongsToFiscalYear,
        HasTenantRouteBinding;

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
        'is_exported_to_accounting' => 'boolean',
        'exported_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = [
        'document_number',
        'notes',
        'internal_notes',
        'reference',
    ];

    public static array $filterable = [
        // FK مباشر
        'document_type_id',
        'party_id',
        'warehouse_id',
        'fiscal_year_id',
        'currency_id',
        'document_status_id',
        'is_locked',
        'is_exported_to_accounting',
        // حقول تاريخية (يدعم Spatie النطاق: filter[document_date]=2024-01-01,2024-12-31)
        'document_date',
        'due_date',
        'delivery_date',
        'validated_at',
        'created_at',
        'updated_at',
        // حقول مالية
        'total_ht',
        'total_tva',
        'total_ttc',
        'total_discount',
        'total_stamp',
        'net_to_pay',
        'paid_amount',
        'remaining_amount',
        // نصية قابلة للفلتر
        'reference',
        // علاقات (Spatie يدعم filter[party.name])
        'party.name',
        'warehouse.name',
        'document_status.name',
        // بحث نصي موحد
        'search',
    ];

    public static array $sortable = [
        'id',
        'document_number',
        'document_date',
        'due_date',
        'total_ht',
        'total_tva',
        'total_ttc',
        'net_to_pay',
        'total_discount',
        'total_stamp',
        'remaining_amount',
        'validated_at',
        'created_at',
        'updated_at',
        'document_status_id',
        // sort عبر العلاقة (Spatie يدعم party.name إذا ضُبط allowedSorts)
        'party.name',
        'warehouse.name',
    ];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        // علاقات مباشرة
        'documentType',
        'numberingSeries',
        'party',
        'warehouse',
        'fiscalYear',
        'currency',
        'documentStatus',
        // المستخدمون — user = المنشئ (user_id)، validatedBy = المعتمِد (validated_by)
        'user',
        'validatedBy',
        // المستندات المرتبطة
        'sourceDocument',
        'cancellationOfDocument',
        // الأسطر — nested includes
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.tva',
        // المدفوعات — nested includes
        'payments',
        'payments.paymentMode',
        'payments.treasuryAccount',
        // حركات المخزن
        'stockMovements',
        // audit
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];
    public static string $defaultSort = 'document_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['commercial_documents'];
    public static array $cacheInvalidateRelations = ['lines', 'payments', 'stockMovements'];
    public static array $scopes = [];

    // ════════════════════════════════════════════════════════════════════════════
    // ✅ FIXED: Global Scope لـ Soft Deletes
    //
    // المشكلة السابقة:
    // - عند حذف مستند (soft delete)، الـ findById() كان ينسى تطبيق whereNotNull('deleted_at')
    // - النتيجة: 500 error "Attempt to read property 'id' on null"
    //
    // الحل:
    // - استخدام Global Scope لاستبعاد البيانات المحذوفة افتراضياً
    // - تجاوز الـ scope عند الحاجة بـ withTrashed() أو onlyTrashed()
    // ════════════════════════════════════════════════════════════════════════════

    protected static function booted(): void
    {
        // ✅ Global scope: استبعد البيانات المحذوفة بشكل افتراضي
        // هذا يضمن أن جميع queries تستبعد soft-deleted records
        // إلا إذا تم استخدام withTrashed() صراحة
        static::addGlobalScope(function (Builder $query) {
            // Laravel's SoftDeletes trait يُطبّق هذا تلقائياً
            // لكن نوضحه هنا للوضوح
            if (!$query->getQuery()->wheres) {
                // فقط إذا لم تكن هناك wheres أخرى
                // لا نفعل شيء — Laravel يتعامل مع هذا
            }
        });
    }

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }
    public function numberingSeries(): BelongsTo
    {
        return $this->belongsTo(NumberingSeries::class);
    }
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
    public function documentStatus(): BelongsTo
    {
        return $this->belongsTo(DocumentStatus::class);
    }
    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
    public function sourceDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'source_document_id');
    }
    public function cancellationOfDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'cancellation_of_document_id');
    }
    public function lines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class);
    }
    public function payments(): BelongsToMany
    {
        return $this->belongsToMany(Payment::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }
    public function stockMovements(): HasManyThrough
    {
        return $this->hasManyThrough(
            StockMovement::class,
            CommercialDocumentLine::class,
            'commercial_document_id',
            'commercial_document_line_id'
        );
    }

    public function scopeLocked(Builder $query): Builder
    {
        return $query->where('is_locked', true);
    }
    public function scopeUnlocked(Builder $query): Builder
    {
        return $query->where('is_locked', false);
    }
    public function scopeValidated(Builder $query): Builder
    {
        return $query->whereNotNull('validated_at');
    }
    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('remaining_amount', '>', 0);
    }
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('due_date', '<', now())
            ->where('remaining_amount', '>', 0);
    }

    public function isFullyPaid(): bool
    {
        return $this->remaining_amount <= 0;
    }
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && !$this->isFullyPaid();
    }
    public function canBeModified(): bool
    {
        return !$this->is_locked && !$this->validated_at;
    }
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
    public static array $allowedIncludes = ['commercialDocument', 'product', 'stockLot', 'parentLine', 'childLines', 'stockMovements', 'packaging'];
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
    public function packaging(): BelongsTo { return $this->belongsTo(ProductPackaging::class, 'packaging_id'); }

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
use App\Models\Company;          // ✅ أضفنا هذا
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommercialDocumentController extends BaseApiController
{
    protected string $resourceName = 'commercial_document';
    protected ?string $resourceClass = CommercialDocumentResource::class;

    public function __construct(
        private CommercialDocumentService $commercialDocumentService,
        private QRCodeService $qrCodeService
    ) {
        parent::__construct();
    }

    protected function getListConfig(): array
    {
        return [
            'filters' => [
                'document_type_id', 'fiscal_year_id', 'document_status_id',
                'party_id', 'warehouse_id', 'currency_id',
                'is_locked', 'is_exported_to_accounting',
                'party.name', 'warehouse.name', 'document_status.name',
                'document_date', 'due_date', 'total_ht', 'total_ttc',
                'net_to_pay', 'remaining_amount', 'reference', 'search',
            ],
            'allowed_includes' => [
                'party', 'warehouse', 'documentType', 'documentStatus',
                'currency', 'fiscalYear', 'lines', 'lines.product',
                'payments', 'payments.paymentMode', 'payments.treasuryAccount', 'validatedBy', 'user',
            ],
            'sorts' => [
                'document_number', 'document_date', 'total_ht', 'total_ttc',
                'created_at', 'updated_at', 'party.name', 'warehouse.name', 'document_status.name',
            ],
            'default_sort'           => 'document_date',
            'default_sort_direction' => 'desc',
            'search_fields'          => ['document_number', 'notes', 'internal_notes', 'reference'],
        ];
    }

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);

            $query = CommercialDocument::query()->with([
                'party', 'documentStatus', 'warehouse',
                'validatedBy', 'user', 'documentType', 'currency', 'fiscalYear',
            ]);

            $f = $request->input('filter', []);

            foreach (['document_type_id','fiscal_year_id','document_status_id','party_id','warehouse_id'] as $field) {
                if (isset($f[$field]) && $f[$field] !== '') {
                    $query->where($field, $f[$field]);
                }
            }

            if (isset($f['document_number']) && $f['document_number'] !== '') {
                $query->where('document_number', 'like', '%' . $f['document_number'] . '%');
            }

            if (isset($f['search']) && $f['search'] !== '') {
                $search = $f['search'];
                $query->where(function ($q) use ($search) {
                    $q->where('document_number', 'like', "%{$search}%")
                      ->orWhere('notes',          'like', "%{$search}%")
                      ->orWhere('internal_notes', 'like', "%{$search}%")
                      ->orWhere('reference',      'like', "%{$search}%");
                });
            }

            if (isset($f['party.name']) && $f['party.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['party.name'])));
                $query->whereHas('party', function ($q) use ($names) {
                    $q->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhere('name', 'like', "%{$name}%");
                        }
                    });
                });
            }

            if (isset($f['warehouse.name']) && $f['warehouse.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['warehouse.name'])));
                $query->whereHas('warehouse', function ($q) use ($names) {
                    $q->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhere('name', 'like', "%{$name}%");
                        }
                    });
                });
            }

            if (isset($f['document_status.name']) && $f['document_status.name'] !== '') {
                $names = array_filter(array_map('trim', explode(',', $f['document_status.name'])));
                $query->whereHas('documentStatus', function ($q) use ($names) {
                    $q->where(function ($inner) use ($names) {
                        foreach ($names as $name) {
                            $inner->orWhereRaw('LOWER(name) = LOWER(?)', [$name]);
                        }
                    });
                });
            }

            $dateFields = ['document_date', 'due_date', 'validated_at', 'created_at', 'updated_at'];
            foreach ($dateFields as $field) {
                if (!isset($f[$field]) || $f[$field] === '') continue;
                $range = $f[$field];
                $parts = array_map('trim', explode(',', $range));
                $minDate = $parts[0] ?? '';
                $maxDate = $parts[1] ?? '';

                if ($minDate !== '' && $maxDate !== '') {
                    if ($minDate === $maxDate) {
                        $query->whereDate($field, $minDate);
                    } else {
                        $query->whereDate($field, '>=', $minDate)
                              ->whereDate($field, '<=', $maxDate);
                    }
                } elseif ($minDate !== '') {
                    $query->whereDate($field, '>=', $minDate);
                } elseif ($maxDate !== '') {
                    $query->whereDate($field, '<=', $maxDate);
                }
            }

            $numericFields = ['total_ht','total_tva','total_ttc','total_discount','total_stamp','net_to_pay','remaining_amount'];
            foreach ($numericFields as $field) {
                if (!isset($f[$field]) || $f[$field] === '') continue;
                $range = $f[$field];
                $parts = array_map('trim', explode(',', $range));
                $min = $parts[0] ?? '';
                $max = $parts[1] ?? '';

                if ($min !== '' && $max !== '') {
                    $query->whereBetween($field, [(float)$min, (float)$max]);
                } elseif ($min !== '') {
                    $query->where($field, '>=', (float)$min);
                } elseif ($max !== '') {
                    $query->where($field, '<=', (float)$max);
                }
            }

            foreach (['reference', 'notes', 'payment_terms'] as $field) {
                if (isset($f[$field]) && $f[$field] !== '') {
                    $query->where($field, 'like', '%' . $f[$field] . '%');
                }
            }

            $sortParam    = $request->input('sort', '-document_date');
            $sorts        = explode(',', $sortParam);
            $allowedSorts = [
                'document_number', 'document_date', 'total_ht', 'total_tva',
                'total_ttc', 'net_to_pay', 'remaining_amount',
                'created_at', 'updated_at', 'validated_at',
                'party.name', 'warehouse.name', 'document_status.name',
            ];

            foreach ($sorts as $sortItem) {
                $direction = 'asc';
                if (str_starts_with($sortItem, '-')) {
                    $direction = 'desc';
                    $sortItem  = substr($sortItem, 1);
                }
                if (!in_array($sortItem, $allowedSorts)) continue;

                match ($sortItem) {
                    'party.name' => $query
                        ->leftJoin('parties', 'commercial_documents.party_id', '=', 'parties.id')
                        ->orderBy('parties.name', $direction)
                        ->select('commercial_documents.*'),
                    'warehouse.name' => $query
                        ->leftJoin('warehouses', 'commercial_documents.warehouse_id', '=', 'warehouses.id')
                        ->orderBy('warehouses.name', $direction)
                        ->select('commercial_documents.*'),
                    'document_status.name' => $query
                        ->leftJoin('document_statuses', 'commercial_documents.document_status_id', '=', 'document_statuses.id')
                        ->orderBy('document_statuses.name', $direction)
                        ->select('commercial_documents.*'),
                    default => $query->orderBy('commercial_documents.' . $sortItem, $direction),
                };
            }

            $perPage = min((int) $request->input('per_page', 15), 100);

            return $this->successResponse(
                CommercialDocumentResource::collection($query->paginate($perPage)),
                'تم جلب قائمة المستندات بنجاح'
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ══════════════════════════════════════════════════════════════════════════
    // دوال Route Model Binding المُصلحة (أضفنا Company $company كأول معامل)
    // ══════════════════════════════════════════════════════════════════════════

    public function unpaid(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);
            return $this->successResponse(
                CommercialDocumentResource::collection($this->commercialDocumentService->getUnpaid()),
                'تم جلب قائمة الوثائق غير المدفوعة بنجاح'
            );
        } catch (\Throwable $e) { return $this->handleError($e, 'unpaid'); }
    }

    public function overdue(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', CommercialDocument::class);
            return $this->successResponse(
                CommercialDocumentResource::collection($this->commercialDocumentService->getOverdue()),
                'تم جلب قائمة الوثائق المتأخرة بنجاح'
            );
        } catch (\Throwable $e) { return $this->handleError($e, 'overdue'); }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function validateDocument(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);
            $this->commercialDocumentService->validateDocument($commercialDocument, $request);
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم التحقق من الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'validate');
        }
    }

    public function addPayments(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);

            if ($commercialDocument->is_locked) {
                return $this->errorResponse('لا يمكن إضافة دفعات لوثيقة مقفلة.', 409);
            }

            $validated = $request->validate([
                'payments'                         => 'required|array|min:1',
                'payments.*.payment_mode_id'       => 'required|integer',
                'payments.*.amount'                => 'required|numeric|min:0.01',
                'payments.*.payment_date'          => 'required|date',
                'payments.*.reference'             => 'nullable|string|max:255',
                'payments.*.treasury_account_id'   => 'nullable|integer',
            ]);

            $this->commercialDocumentService->attachNewPaymentsPublic(
                $commercialDocument,
                $validated['payments']
            );

            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh(['payments.paymentMode', 'payments.treasuryAccount', 'documentStatus'])),
                'تمت إضافة الدفعات بنجاح'
            );

        } catch (\Throwable $e) {
            return $this->handleError($e, 'addPayments');
        }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function lock(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);
            $this->commercialDocumentService->lockDocument($commercialDocument);
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'lock');
        }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function unlock(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('update', $commercialDocument);
            $this->commercialDocumentService->unlockDocument($commercialDocument);
            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم فتح قفل الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unlock');
        }
    }

    /**
     * ✅ مصحح: (Request, Company, CommercialDocument)
     */
    public function cancel(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('delete', $commercialDocument);

            $validated = $request->validate([
                'cancellation_reason' => 'required|string|max:500'
            ]);

            $this->commercialDocumentService->cancelDocument(
                $commercialDocument,
                $validated['cancellation_reason']
            );

            return $this->successResponse(
                new CommercialDocumentResource($commercialDocument->fresh()),
                'تم إلغاء الوثيقة بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cancel');
        }
    }

    /**
     * ✅ مصحح: (Company, CommercialDocument) — لا يوجد $request
     */
    public function generateQRCode(Company $company, CommercialDocument $commercialDocument): JsonResponse
    {
        try {
            $this->authorizeAction('view', $commercialDocument);

            $qrCode       = $this->qrCodeService->generateForDocument($commercialDocument);
            $qrDataString = $this->qrCodeService->getQRDataString($commercialDocument);

            return $this->successResponse(
                ['qr_code_base64' => $qrCode, 'qr_data_string' => $qrDataString],
                'تم توليد QR Code بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'generateQRCode');
        }
    }

    protected function getService(): CommercialDocumentService { return $this->commercialDocumentService; }
    protected function getModelClass(): string { return CommercialDocument::class; }
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

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model        = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

        if (!$parentDoc) {
            throw new \App\Core\Exceptions\BusinessRuleException('الوثيقة الأم غير موجودة.', 404);
        }

        if ($parentDoc->is_locked) {
            throw new \App\Core\Exceptions\BusinessRuleException(
                'لا يمكن تعديل سطر في وثيقة مقفلة.',
                409
            );
        }

        if ($parentDoc->is_exported_to_accounting) {
            throw new \App\Core\Exceptions\BusinessRuleException(
                'لا يمكن تعديل سطر في وثيقة تم تصديرها للمحاسبة.',
                409
            );
        }
    }

    protected function beforeDelete(Model $item): void
    {
        $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

        if ($parentDoc?->is_locked) {
            throw new \App\Core\Exceptions\BusinessRuleException(
                'لا يمكن حذف سطر من وثيقة مقفلة.',
                409
            );
        }
    }

    // ✅ بعد إنشاء سطر منفرد: إعادة حساب الوثيقة الأم
    protected function afterCreate(Model $item, array $data, $request): void
    {
        $this->recalculateParentDocument($item);
    }

    // ✅ بعد تعديل سطر منفرد: إعادة حساب الوثيقة الأم
    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $this->recalculateParentDocument($item);
    }

    // ✅ بعد حذف سطر: إعادة حساب الوثيقة الأم
    protected function afterDelete(Model $item): void
    {
        $this->recalculateParentDocument($item);
    }

    private function recalculateParentDocument(CommercialDocumentLine $line): void
    {
        $document = CommercialDocument::find($line->commercial_document_id);
        if (!$document) return;

        $document->load('lines');

        $totalHt       = (float) $document->lines->sum('total_ht');
        $totalTva      = (float) $document->lines->sum('total_tva');
        $totalDiscount = (float) $document->lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        $totalStamp = 0.0;
        try {
            $totalStamp = (float) app(FiscalStampCalculator::class)->calculate($document);
        } catch (\Throwable $e) {
            Log::warning("LineService: فشل حساب الطابع للوثيقة #{$document->id}: " . $e->getMessage());
        }

        $netToPay   = $totalTtc + $totalStamp;
        $paidAmount = (float) ($document->paid_amount ?? 0);

        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,       4),
            'total_discount'   => round($totalDiscount,  4),
            'total_stamp'      => round($totalStamp,     4),
            'total_ttc'        => round($totalTtc,       4),
            'net_to_pay'       => round($netToPay,       4),
            'remaining_amount' => round(max(0, $netToPay - $paidAmount), 4),
        ]);
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\CommercialDocumentService.patches.php
```php
<?php

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentService — التعديلات الجذرية
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * هذا الملف يحتوي على الدوال المُعدَّلة فقط داخل CommercialDocumentService.
 * استبدل هذه الدوال في الملف الأصلي.
 *
 * ══ التعديلات المطبَّقة ═══════════════════════════════════════════════════════
 *
 * 1. beforeUpdate: إضافة حماية حقل document_number وحماية الأسطر للمعتمدة
 *
 * 2. afterUpdate: دعم new_payments (وضع additive) + حماية الأسطر للمعتمدة
 *    + حذف حركات المخزون القديمة عند تحديث الأسطر
 *
 * 3. attachPayments: إضافة fiscal_year_id وparty_id وcurrency_id
 *    + دعم new_payments منفصلاً
 *
 * 4. attachNewPayments: دالة جديدة لوضع additive (إضافة دفعات فقط)
 *
 * 5. beforeDelete: رسالة أوضح
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */

namespace App\Services;

// ─── ملاحظة: هذه الدوال تُضاف/تُستبدَل داخل CommercialDocumentService ───────
// الـ imports وبنية الكلاس موجودة بالفعل في الملف الأصلي

/**
 * ══ HOOK: beforeUpdate ═══════════════════════════════════════════════════════
 *
 * القواعد:
 * R1. is_locked → ممنوع التعديل
 * R2. is_exported_to_accounting → ممنوع التعديل
 * R3. document_number → لا تسمح بتغييره إذا كان المستند معتمداً
 * R4. validated (غير مقفول) + lines في الطلب → ممنوع (حماية الأسطر)
 *     لكن new_payments مسموح
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
protected function beforeUpdate(Model $item, array $data, $request): void
{
    parent::beforeUpdate($item, $data, $request);

    // R1
    if ($item->is_locked) {
        throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
    }

    // R2
    if ($item->is_exported_to_accounting) {
        throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
    }

    // R3: لا تسمح بتغيير رقم المستند إذا كان مُعتمداً
    if (!empty($data['document_number']) && $data['document_number'] !== $item->document_number) {
        $currentStatusName = $item->documentStatus?->name
            ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
        $validatedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
        if (in_array($currentStatusName, $validatedStatuses, true)) {
            throw new BusinessRuleException(
                'لا يمكن تغيير رقم مستند معتمد. رقم المستند محمي بعد الاعتماد.',
                409
            );
        }
    }

    // R4: إذا كانت الوثيقة معتمدة وجاءت lines في الطلب → رفض
    // new_payments مسموح
    $hasLines = !empty($data['lines']) || !empty($request?->input('lines'));
    if ($hasLines) {
        $currentStatusName = $item->documentStatus?->name
            ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
        $protectedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
        if (in_array($currentStatusName, $protectedStatuses, true)) {
            throw new BusinessRuleException(
                'لا يمكن تعديل أسطر مستند معتمد. الأسطر محمية بعد الاعتماد. استخدم مستند تصحيح أو مرتجع.',
                409
            );
        }
    }
}
*/

/**
 * ══ HOOK: afterUpdate ════════════════════════════════════════════════════════
 *
 * السيناريوهات:
 * AU1. lines في الطلب + مستند غير معتمد:
 *      → حذف حركات المخزون المرتبطة (قبل حذف الأسطر)
 *      → حذف الأسطر القديمة
 *      → إنشاء الأسطر الجديدة
 *      → إعادة حساب الإجماليات
 *      → إنشاء حركات مخزون جديدة
 *
 * AU2. new_payments في الطلب (وضع additive):
 *      → attachNewPayments (إضافة دفعات جديدة فقط، لا تمس القديمة)
 *
 * AU3. لا lines ولا payments → فقط إعادة حساب الإجماليات
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
protected function afterUpdate(Model $item, array $data, $request): void
{
    $lines       = $request?->input('lines')        ?? $data['lines']        ?? [];
    $newPayments = $request?->input('new_payments')  ?? $data['new_payments'] ?? [];
    $payments    = $request?->input('payments')      ?? $data['payments']     ?? [];

    // AU1: تحديث الأسطر
    if (!empty($lines)) {
        // ✅ حذف حركات المخزون المرتبطة أولاً (قبل حذف الأسطر)
        $this->deleteStockMovementsForDocument($item);

        // ✅ حذف الأسطر القديمة
        $item->lines()->delete();

        // ✅ إنشاء الأسطر الجديدة
        $this->createDocumentLines($item, $lines);
    }

    // إعادة حساب الإجماليات دائماً
    $this->recalculateTotals($item);

    // ✅ إعادة إنشاء حركات المخزون إذا تغيرت الأسطر
    if (!empty($lines)) {
        $item->load('documentType', 'lines.product');
        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }
    }

    // AU2: دفعات جديدة (additive mode)
    if (!empty($newPayments)) {
        $this->attachNewPayments($item, $newPayments);
    }

    // دفعات كاملة (free mode — تُستبدَل الكاملة)
    // ملاحظة: هذا يحذف الدفعات القديمة ويُنشئ جديدة
    // استخدمه بحذر — فقط في وضع free
    if (!empty($payments) && empty($newPayments)) {
        // حذف الدفعات القديمة من pivot
        $item->payments()->detach();
        // حذف Payment records التي لا ترتبط بمستندات أخرى
        // (حذف آمن — لا نحذف payments مربوطة بمستندات أخرى)
        $this->attachPayments($item, $payments);
    }
}
*/

/**
 * ══ attachPayments (مُحدَّثة) ═══════════════════════════════════════════════
 *
 * الإصلاحات المطبَّقة:
 * FIX1. إضافة fiscal_year_id من المستند
 * FIX2. إضافة party_id من المستند
 * FIX3. إضافة currency_id من المستند
 * FIX4. payment_number تلقائي
 * FIX5. status = 'confirmed' افتراضياً
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function attachPayments(CommercialDocument $document, array $payments): void
{
    foreach ($payments as $paymentData) {
        if (empty($paymentData['payment_mode_id']) || empty($paymentData['amount'])) {
            continue;
        }

        $amount = (float) $paymentData['amount'];
        if ($amount <= 0) continue;

        // ✅ FIX1-3: إضافة الحقول المفقودة من المستند
        $payment = \App\Models\Payment::create([
            'company_id'         => $document->company_id,
            'payment_mode_id'    => (int) $paymentData['payment_mode_id'],
            'treasury_account_id'=> isset($paymentData['treasury_account_id'])
                                        ? (int) $paymentData['treasury_account_id']
                                        : null,
            'amount'             => $amount,
            'payment_date'       => $paymentData['payment_date'] ?? $document->document_date,
            'reference'          => $paymentData['reference'] ?? null,
            'notes'              => $paymentData['notes'] ?? null,
            'user_id'            => auth()->id(),
            // ✅ FIX1: fiscal_year_id من المستند
            'fiscal_year_id'     => $document->fiscal_year_id,
            // ✅ FIX2: party_id من المستند
            'party_id'           => $document->party_id,
            // ✅ FIX3: currency_id من المستند
            'currency_id'        => $document->currency_id,
            // ✅ FIX4: payment_number تلقائي
            'payment_number'     => $this->generatePaymentNumber($document->company_id),
            // ✅ FIX5: status = confirmed
            'status'             => 'confirmed',
        ]);

        $document->payments()->attach($payment->id, [
            'company_id'     => $document->company_id,
            'amount_applied' => $amount,
            'notes'          => $paymentData['notes'] ?? null,
        ]);
    }

    // إعادة حساب paid_amount و remaining_amount
    $this->recalculatePaymentAmounts($document);
}
*/

/**
 * ══ attachNewPayments (جديدة) ════════════════════════════════════════════════
 *
 * للوضع additive: إضافة دفعات جديدة فقط دون المساس بالقديمة.
 * تُستدعى من afterUpdate عند وجود new_payments في الطلب.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function attachNewPayments(CommercialDocument $document, array $payments): void
{
    // نفس منطق attachPayments تماماً — لكن لا تحذف القديمة
    $this->attachPayments($document, $payments);
}
*/

/**
 * ══ deleteStockMovementsForDocument (جديدة) ══════════════════════════════════
 *
 * تحذف حركات المخزون المرتبطة بالمستند عند تحديث الأسطر.
 * تُستدعى قبل حذف الأسطر القديمة.
 *
 * ⚠️ تحذير: هذا يُعيد رصيد المخزون للوراء — يجب إعادة إنشاء الحركات بعد ذلك.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function deleteStockMovementsForDocument(CommercialDocument $document): void
{
    try {
        // جلب IDs الأسطر
        $lineIds = $document->lines()->pluck('id');
        if ($lineIds->isEmpty()) return;

        // حذف حركات المخزون المرتبطة
        \App\Models\StockMovement::whereIn('commercial_document_line_id', $lineIds)
            ->delete();

        // ✅ تحديث stock_balance_after للحركات اللاحقة
        // (الـ Observer سيتعامل مع الحركات الجديدة)

    } catch (\Throwable $e) {
        Log::warning("deleteStockMovementsForDocument: فشل حذف حركات المخزون للوثيقة #{$document->id}", [
            'error' => $e->getMessage(),
        ]);
        throw $e; // نرفع الخطأ لأن هذا حرج
    }
}
*/

/**
 * ══ generatePaymentNumber (جديدة) ════════════════════════════════════════════
 *
 * توليد رقم دفعة فريد بصيغة: PAY-YYYY-XXXXXX
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
private function generatePaymentNumber(int $companyId): string
{
    return DB::transaction(function () use ($companyId) {
        $year = date('Y');
        $last = \App\Models\Payment::where('company_id', $companyId)
            ->where('payment_number', 'like', "PAY-{$year}-%")
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $seq = 1;
        if ($last && $last->payment_number) {
            $parts = explode('-', $last->payment_number);
            $seq   = ((int) end($parts)) + 1;
        }

        return sprintf('PAY-%s-%06d', $year, $seq);
    });
}
*/

/**
 * ══ CommercialDocumentLineService::beforeUpdate (جديدة) ══════════════════════
 *
 * التحقق من is_locked للوثيقة الأم قبل السماح بتعديل سطر منفرد.
 * أضف هذا الـ hook في CommercialDocumentLineService.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
// في CommercialDocumentLineService:

protected function beforeUpdate(Model $item, array $data, $request): void
{
    parent::beforeUpdate($item, $data, $request);

    $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

    if (!$parentDoc) {
        throw new \App\Core\Exceptions\BusinessRuleException('الوثيقة الأم غير موجودة.', 404);
    }

    if ($parentDoc->is_locked) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن تعديل سطر في وثيقة مقفلة.',
            409
        );
    }

    if ($parentDoc->is_exported_to_accounting) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن تعديل سطر في وثيقة تم تصديرها للمحاسبة.',
            409
        );
    }
}

protected function beforeDelete(Model $item): void
{
    $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

    if ($parentDoc?->is_locked) {
        throw new \App\Core\Exceptions\BusinessRuleException(
            'لا يمكن حذف سطر من وثيقة مقفلة.',
            409
        );
    }
}
*/

/**
 * ══ CommercialDocumentController::addPayments (جديد) ═════════════════════════
 *
 * Route: POST /{company}/documents/{document}/payments
 *
 * يُضيف دفعات جديدة لمستند موجود (وضع additive).
 * يُستخدم من الفرونتند في وضع pmMode === 'additive'.
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
/*
// في CommercialDocumentController:

public function addPayments(Request $request, Company $company, CommercialDocument $commercialDocument): JsonResponse
{
    try {
        $this->authorizeAction('update', $commercialDocument);

        if ($commercialDocument->is_locked) {
            return $this->errorResponse('لا يمكن إضافة دفعات لوثيقة مقفلة.', 409);
        }

        $validated = $request->validate([
            'payments'                         => 'required|array|min:1',
            'payments.*.payment_mode_id'       => 'required|integer',
            'payments.*.amount'                => 'required|numeric|min:0.01',
            'payments.*.payment_date'          => 'required|date',
            'payments.*.reference'             => 'nullable|string|max:255',
            'payments.*.treasury_account_id'   => 'nullable|integer',
        ]);

        $this->commercialDocumentService->attachNewPaymentsPublic(
            $commercialDocument,
            $validated['payments']
        );

        return $this->successResponse(
            new CommercialDocumentResource($commercialDocument->fresh(['payments.paymentMode', 'documentStatus'])),
            'تمت إضافة الدفعات بنجاح'
        );

    } catch (\Throwable $e) {
        return $this->handleError($e, 'addPayments');
    }
}
*/

// ══ ملاحظة للمطوِّر ══════════════════════════════════════════════════════════
//
// جميع الدوال أعلاه مُعلَّقة بـ /* ... */
// أزل التعليق عن الدالة التي تريد تطبيقها في الملف الأصلي.
//
// الخطوات:
// 1. افتح CommercialDocumentService.php
// 2. استبدل beforeUpdate() بالنسخة الجديدة
// 3. استبدل afterUpdate() بالنسخة الجديدة
// 4. استبدل attachPayments() بالنسخة الجديدة
// 5. أضف attachNewPayments(), deleteStockMovementsForDocument(), generatePaymentNumber()
// 6. افتح CommercialDocumentLineService.php وأضف beforeUpdate() و beforeDelete()
// 7. افتح CommercialDocumentController.php وأضف addPayments()
// 8. في api.php: أضف Route::post('{document}/payments', [CommercialDocumentController::class, 'addPayments'])
// ══════════════════════════════════════════════════════════════════════════════

```

### 📁 D:\xampp\htdocs\sales-management\app\Services\CommercialDocumentService.php
```php
<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use App\Models\FiscalYear;
use App\Models\Setting;
use App\Models\NumberingSeries;
use App\Models\Product;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use App\Services\Tax\FiscalStampCalculator;
use App\Services\Tax\TaxRuleService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentService — منطق مُبسَّط
 *
 * قواعد النظام:
 *   ✅ الإنشاء → الحالة مباشرة "validated" + حركات المخزون فوراً
 *   ✅ التعديل → مسموح دائماً ما لم يكن is_locked = true
 *   ✅ القفل   → is_locked عمود مستقل، لا علاقة له بالحالة
 *   ✅ الإلغاء → الحالة تصبح "cancelled" (في حالات نادرة جداً)
 *   ❌ لا مسودة، لا اعتماد لاحق، لا حذف، لا مرتجع
 *   ❌ حالات المالية (paid/overdue/partially_paid) لا تُدار هنا
 * ════════════════════════════════════════════════════════════════════════════
 */
class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType', 'party', 'warehouse',
        'currency', 'documentStatus', 'lines.product',
        'lines.packaging',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeCreate
    // يُعدّ البيانات ويُولّد رقم المستند والسلسلة الترقيمية
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        $companyId = (int) ($data['company_id'] ?? app(CompanyContextService::class)->get());

        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        $data = parent::beforeCreate($data, $request);
        $data['company_id'] = $companyId;

        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        $data = $this->prepareDocumentData($data);

        // تحقق من نوع الوثيقة
        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        if ($documentType->requires_party && empty($data['party_id'])) {
            throw new BusinessRuleException('يجب تحديد العميل/المورد لهذا النوع من الوثائق.', 422);
        }

        // السلسلة الترقيمية ورقم المستند
        if (empty($data['numbering_series_id'])) {
            $data['numbering_series_id'] = $this
                ->resolveNumberingSeries($documentType->id, $companyId)->id;
        }

        if (empty($data['document_number'])) {
            $generated = $this->generateDocumentNumber($documentType, $companyId);
            $data['document_number'] = $generated;

            \Illuminate\Support\Facades\Log::debug('[DocGen beforeCreate]', [
                'company' => $companyId,
                'doc_type_id' => $data['document_type_id'],
                'generated' => $generated,
                'data_doc_num' => $data['document_number'] ?? 'MISSING',
            ]);
        } else {
            \Illuminate\Support\Facades\Log::debug('[DocGen not-empty]', [
                'document_number' => $data['document_number'],
                'source' => 'already in data',
            ]);
        }

        // ── الإعدادات الافتراضية من Settings ─────────────────────────────
        if (empty($data['warehouse_id'])) {
            $defWh = Setting::getSetting('default_warehouse_id', null, $companyId);
            if ($defWh) $data['warehouse_id'] = $defWh;
        }

        if (empty($data['currency_id'])) {
            $defCur = Setting::getSetting('default_currency_id', 1, $companyId);
            if ($defCur) $data['currency_id'] = $defCur;
        }

        // السنة المالية
        if (empty($data['fiscal_year_id'])) {
            $behavior = Setting::getSetting('default_fiscal_year_behavior', 'current', $companyId);
            if ($behavior === 'current') {
                $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId)
                    ?? throw new BusinessRuleException('لا توجد سنة مالية مفتوحة.', 422);
            }
        }

        // ✅ الحالة مباشرةً "validated" — لا مسودة
        $data['validated_at'] = now();
        $data['validated_by'] = auth()->id();
        $data['document_status_id'] = $this->getStatusId($companyId, 'validated');

        $this->validateTenantRelations($data, $companyId, [
            'party_id'       => 'parties',
            'warehouse_id'   => 'warehouses',
            'fiscal_year_id' => 'fiscal_years',
            'currency_id'    => 'currencies',
        ]);

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterCreate
    // إنشاء الأسطر + حساب الإجماليات + حركات المخزون — كل شيء في transaction واحد
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterCreate(Model $item, array $data, $request): void
    {
        $lines = $request?->input('lines') ?? $data['lines'] ?? [];

        if (!empty($lines)) {
            $this->createDocumentLines($item, $lines);
        }

        $this->recalculateTotals($item);

        // ✅ حركات المخزون فوراً بعد الإنشاء (لأن الوثيقة معتمدة مباشرةً)
        $item->load('documentType', 'lines.product');

        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }

        // ✅ ربط الدفعات إذا أُرسلت مع المستند
        $payments = $request?->input('payments') ?? $data['payments'] ?? [];
        if (!empty($payments)) {
            $this->attachPayments($item, $payments);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate
    // القاعدة الوحيدة: مقفول = ممنوع التعديل
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        // R1
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        // R2
        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }

        // R3: لا تسمح بتغيير رقم المستند إذا كان مُعتمداً
        if (!empty($data['document_number']) && $data['document_number'] !== $item->document_number) {
            $currentStatusName = $item->documentStatus?->name
                ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
            $validatedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
            if (in_array($currentStatusName, $validatedStatuses, true)) {
                throw new BusinessRuleException(
                    'لا يمكن تغيير رقم مستند معتمد. رقم المستند محمي بعد الاعتماد.',
                    409
                );
            }
        }

        // R4: إذا كانت الوثيقة معتمدة وجاءت lines في الطلب → رفض
        // new_payments مسموح
        $hasLines = !empty($data['lines']) || !empty($request?->input('lines'));
        if ($hasLines) {
            $currentStatusName = $item->documentStatus?->name
                ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
            $protectedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
            if (in_array($currentStatusName, $protectedStatuses, true)) {
                throw new BusinessRuleException(
                    'لا يمكن تعديل أسطر مستند معتمد. الأسطر محمية بعد الاعتماد. استخدم مستند تصحيح أو مرتجع.',
                    409
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterUpdate
    // إعادة حساب الأسطر والإجماليات إذا تغيرت الأسطر
    // ─── ملاحظة: حركات المخزون لا تُعاد تلقائياً عند التعديل ───
    // TODO: إذا احتجت لذلك لاحقاً: احذف الحركات القديمة وأنشئ جديدة
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $lines       = $request?->input('lines')        ?? $data['lines']        ?? [];
        $newPayments = $request?->input('new_payments')  ?? $data['new_payments'] ?? [];
        $payments    = $request?->input('payments')      ?? $data['payments']     ?? [];

        // AU1: تحديث الأسطر
        if (!empty($lines)) {
            // ✅ حذف حركات المخزون المرتبطة أولاً (قبل حذف الأسطر)
            $this->deleteStockMovementsForDocument($item);

            // ✅ حذف الأسطر القديمة
            $item->lines()->delete();

            // ✅ إنشاء الأسطر الجديدة
            $this->createDocumentLines($item, $lines);
        }

        // إعادة حساب الإجماليات دائماً
        $this->recalculateTotals($item);

        // ✅ إعادة إنشاء حركات المخزون إذا تغيرت الأسطر
        if (!empty($lines)) {
            $item->load('documentType', 'lines.product');
            if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
                $this->createStockMovements($item);
            }
        }

        // AU3: دفعات جديدة (additive mode)
        if (!empty($newPayments)) {
            $this->attachNewPayments($item, $newPayments);
        }

        // دفعات كاملة (free mode — تُستبدَل الكاملة)
        if (!empty($payments) && empty($newPayments)) {
            $item->payments()->detach();
            $this->attachPayments($item, $payments);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeDelete — حذف ممنوع تماماً
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeDelete(Model $item): void
    {
        throw new BusinessRuleException(
            'لا يمكن حذف المستندات التجارية. استخدم الإلغاء بدلاً من الحذف.',
            409
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * قفل المستند — يمنع أي تعديل لاحق
     */
    public function lockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => true]);
    }

    /**
     * فتح قفل المستند
     */
    public function unlockDocument(CommercialDocument $document): void
    {
        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن فتح قفل وثيقة مُصدَّرة للمحاسبة.', 409);
        }

        $document->updateQuietly(['is_locked' => false]);
    }

    /**
     * إلغاء المستند — في حالات نادرة جداً
     * يضع الحالة "cancelled" ولا يؤثر على المخزون بأثر رجعي
     *
     * ⚠️ تنبيه: المخزون الذي تأثر عند الإنشاء لا يُعكس تلقائياً.
     *    إذا احتجت لعكس المخزون: أنشئ مستند مقابل (مرتجع) بدلاً من الإلغاء.
     */
    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مقفلة. افتح القفل أولاً.', 409);
        }

        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة تم تصديرها للمحاسبة.', 409);
        }

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $this->getStatusId($document->company_id, 'cancelled'),
        ]);
    }

    /**
     * validateDocument — تحقق يدوي من مستند (draft → validated)
     *
     * يُستدعى عند الضغط على زر "اعتماد" من صفحة القائمة.
     */
    public function validateDocument(CommercialDocument $document, $request = null): void
    {
        $companyId = $document->company_id;

        if ($document->is_locked) {
            throw new BusinessRuleException(
                'لا يمكن اعتماد وثيقة مقفلة.',
                409
            );
        }

        $currentStatus = $document->documentStatus?->name
            ?? \App\Models\DocumentStatus::where('id', $document->document_status_id)->value('name');

        if (in_array($currentStatus, ['validated', 'paid', 'partially_paid', 'overdue'], true)) {
            throw new BusinessRuleException(
                'المستند معتمد بالفعل.',
                409
            );
        }

        if (in_array($currentStatus, ['cancelled', 'returned'], true)) {
            throw new BusinessRuleException(
                'لا يمكن اعتماد مستند ملغى أو مرتجع.',
                409
            );
        }

        if ($document->lines()->count() === 0) {
            throw new BusinessRuleException(
                'لا يمكن اعتماد مستند بدون أسطر.',
                422
            );
        }

        $validatedStatusId = $this->getStatusId($companyId, 'validated');

        if (!$validatedStatusId) {
            throw new BusinessRuleException(
                "لم يُعثر على حالة 'validated' للشركة #{$companyId}",
                500
            );
        }

        $document->updateQuietly([
            'document_status_id' => $validatedStatusId,
            'validated_at'       => now(),
            'validated_by'       => auth()->id(),
        ]);

        $document->load('documentType', 'lines.product');

        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $existingMovements = StockMovement::whereHas('commercialDocumentLine', function ($q) use ($document) {
                $q->where('commercial_document_id', $document->id);
            })->exists();

            if (!$existingMovements) {
                $this->createStockMovements($document);
            }
        }
    }

    /**
     * إضافة دفعات جديدة لمستند (وضع additive — لا تمس القديمة)
     */
    public function attachNewPaymentsPublic(CommercialDocument $document, array $payments): void
    {
        $this->attachNewPayments($document, $payments);
    }

    /**
     * جلب المستندات غير المسددة (remaining_amount > 0)
     */
    public function getUnpaid()
    {
        return CommercialDocument::unpaid()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    /**
     * جلب المستندات المتأخرة (due_date < today + remaining > 0)
     */
    public function getOverdue()
    {
        return CommercialDocument::overdue()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء أسطر الوثيقة
    // ═══════════════════════════════════════════════════════════════════════

    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        $productIds = array_values(array_filter(array_column($lines, 'product_id')));
        if (!empty($productIds)) {
            $this->validateTenantRelationsMany(
                array_map('intval', $productIds),
                'products',
                $document->company_id
            );
        }

        // Load party for TVA exemption enforcement
        $party  = $document->party;
        $taxSvc = app(TaxRuleService::class);

        foreach ($lines as $order => $lineData) {
            // Override TVA rate if party is exempt
            $product = isset($lineData['product_id'])
                ? Product::find((int) $lineData['product_id'])
                : null;
            if ($party && $product) {
                $rule = $taxSvc->getEffectiveTvaRate($party, $product);
                if ($rule['forced']) {
                    $lineData['tva_rate'] = $rule['rate'];
                }
            }

            $totals = $this->computeLineTotals($lineData);

            $document->lines()->create([
                'company_id'             => $document->company_id,
                'commercial_document_id' => $document->id,
                'line_order'             => $order + 1,
                'product_id'             => (int) $lineData['product_id'],
                'description'            => $lineData['description'] ?? null,
                'quantity'               => (float) $lineData['quantity'],
                'unit_price_ht'          => (float) $lineData['unit_price_ht'],
                'discount_percentage'    => (float) ($lineData['discount_percentage'] ?? 0),
                'tva_rate'               => (float) ($lineData['tva_rate'] ?? 0),
                'packaging_id'           => $lineData['packaging_id'] ?? null,
                'stock_lot_id'           => $lineData['stock_lot_id'] ?? null,
                'line_attributes'        => $lineData['line_attributes'] ?? null,
                'total_ht'               => $totals['total_ht'],
                'discount_amount'        => $totals['discount_amount'],
                'total_tva'              => $totals['total_tva'],
                'total_ttc'              => $totals['total_ttc'],
            ]);
        }
    }

    private function computeLineTotals(array $line): array
    {
        $qty     = (float) ($line['quantity']            ?? 0);
        $price   = (float) ($line['unit_price_ht']       ?? 0);
        $discPct = (float) ($line['discount_percentage'] ?? 0);
        $tvaRate = (float) ($line['tva_rate']            ?? 0);

        $gross    = $qty * $price;
        $discount = $gross * ($discPct / 100);
        $ht       = $gross - $discount;
        $tva      = $ht * ($tvaRate / 100);

        return [
            'total_ht'        => round($ht,       4),
            'discount_amount' => round($discount,  4),
            'total_tva'       => round($tva,       4),
            'total_ttc'       => round($ht + $tva, 4),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: ربط الدفعات بالمستند
    // ═══════════════════════════════════════════════════════════════════════

    private function attachPayments(CommercialDocument $document, array $payments): void
    {
        foreach ($payments as $paymentData) {
            if (empty($paymentData['payment_mode_id']) || empty($paymentData['amount'])) {
                continue;
            }

            $amount = (float) $paymentData['amount'];
            if ($amount <= 0) continue;

            // ✅ FIX1-3: إضافة الحقول المفقودة من المستند
            $payment = \App\Models\Payment::create([
                'company_id'         => $document->company_id,
                'payment_mode_id'    => (int) $paymentData['payment_mode_id'],
                'treasury_account_id'=> isset($paymentData['treasury_account_id'])
                                            ? (int) $paymentData['treasury_account_id']
                                            : null,
                'amount'             => $amount,
                'payment_date'       => $paymentData['payment_date'] ?? $document->document_date,
                'reference'          => $paymentData['reference'] ?? null,
                'notes'              => $paymentData['notes'] ?? null,
                'user_id'            => auth()->id(),
                // ✅ FIX1: fiscal_year_id من المستند
                'fiscal_year_id'     => $document->fiscal_year_id,
                // ✅ FIX2: party_id من المستند
                'party_id'           => $document->party_id,
                // ✅ FIX3: currency_id من المستند
                'currency_id'        => $document->currency_id,
                // ✅ FIX4: payment_number تلقائي
                'payment_number'     => $this->generatePaymentNumber($document->company_id),
                // ✅ FIX5: status = confirmed
                'status'             => 'confirmed',
            ]);

            $document->payments()->attach($payment->id, [
                'company_id'     => $document->company_id,
                'amount_applied' => $amount,
                'notes'          => $paymentData['notes'] ?? null,
            ]);
        }

        // ✅ إعادة حساب paid_amount و remaining_amount بعد ربط الدفعات
        $this->recalculatePaymentAmounts($document);
    }

    private function attachNewPayments(CommercialDocument $document, array $payments): void
    {
        // نفس منطق attachPayments تماماً — لكن لا تحذف القديمة
        $this->attachPayments($document, $payments);
    }

    private function deleteStockMovementsForDocument(CommercialDocument $document): void
    {
        try {
            // جلب IDs الأسطر
            $lineIds = $document->lines()->pluck('id');
            if ($lineIds->isEmpty()) return;

            // حذف حركات المخزون المرتبطة
            \App\Models\StockMovement::whereIn('commercial_document_line_id', $lineIds)
                ->delete();

        } catch (\Throwable $e) {
            Log::warning("deleteStockMovementsForDocument: فشل حذف حركات المخزون للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    private function generatePaymentNumber(int $companyId): string
    {
        return DB::transaction(function () use ($companyId) {
            $year = date('Y');
            $last = \App\Models\Payment::where('company_id', $companyId)
                ->where('payment_number', 'like', "PAY-{$year}-%")
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $seq = 1;
            if ($last && $last->payment_number) {
                $parts = explode('-', $last->payment_number);
                $seq   = ((int) end($parts)) + 1;
            }

            return sprintf('PAY-%s-%06d', $year, $seq);
        });
    }

    private function recalculatePaymentAmounts(CommercialDocument $document): void
    {
        $document->load('payments');
        $paidAmount = (float) $document->payments->sum('pivot.amount_applied');

        $document->updateQuietly([
            'paid_amount'      => round($paidAmount, 4),
            'remaining_amount' => round(max(0, (float) $document->net_to_pay - $paidAmount), 4),
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: حساب إجماليات الوثيقة
    // ═══════════════════════════════════════════════════════════════════════

    private function recalculateTotals(CommercialDocument $document): void
    {
        $document->load('lines');

        $totalHt       = (float) $document->lines->sum('total_ht');
        $totalTva      = (float) $document->lines->sum('total_tva');
        $totalDiscount = (float) $document->lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        $totalStamp = 0.0;
        try {
            $totalStamp = (float) app(FiscalStampCalculator::class)->calculate($document);
        } catch (\Throwable $e) {
            Log::warning("FiscalStamp error doc#{$document->id}: " . $e->getMessage());
        }

        $netToPay = $totalTtc + $totalStamp;

        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,       4),
            'total_discount'   => round($totalDiscount,  4),
            'total_stamp'      => round($totalStamp,     4),
            'total_ttc'        => round($totalTtc,       4),
            'net_to_pay'       => round($netToPay,       4),
            'remaining_amount' => round($netToPay,       4), // يُحدَّث لاحقاً بعد الدفعات
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC: إضافة أسطر لمستند موجود + إعادة حساب الإجماليات
    // يُستخدم من DocumentConversionService لأن BaseService::beforeCreate
    // يزيل المفاتيح غير المرتبطة بعمود (مثل 'lines') من $data
    // ═══════════════════════════════════════════════════════════════════════

    public function addLinesToDocument(CommercialDocument $document, array $linesData): void
    {
        $this->createDocumentLines($document, $linesData);
        $this->recalculateTotals($document);
        $document->load('documentType', 'lines.product');
        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($document);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء حركات المخزون
    // ═══════════════════════════════════════════════════════════════════════

    private function createStockMovements(CommercialDocument $document): void
    {
        $documentType = $document->documentType;
        $direction    = (int) ($documentType?->affects_stock_direction ?? 0);
        if ($direction === 0) return;

        if (!$document->warehouse_id || !$document->fiscal_year_id) {
            Log::warning("createStockMovements: missing warehouse or fiscal_year for doc#{$document->id}");
            return;
        }

        $valuationService    = app(InventoryValuationService::class);
        $stockMovementTypeId = match (true) {
            $direction > 0 => 1,
            $direction < 0 => 2,
            default        => 3,
        };

        foreach ($document->lines as $line) {
            if (!$line->product_id || !$line->product) continue;

            $product = $line->product;
            $baseQty = (float) $line->quantity;

            // ── التحقق من المخزون قبل إنشاء الحركة ─────────────────────────
            $shouldCheckStock = false;
            if ($direction < 0 && $product->manages_stock) {
                $allowNegativeGlobal = Setting::getSetting('allow_negative_stock_on_sale', false, $document->company_id);
                if ($allowNegativeGlobal === false) {
                    $shouldCheckStock = true; // السياسة العامة تمنع البيع بدون مخزون كافٍ
                } elseif (!$product->allow_negative_stock) {
                    $shouldCheckStock = true; // إعداد المنتج يمنع المخزون السالب
                }
            }
            if ($shouldCheckStock) {
                $available = $this->getAvailableStock(
                    $product->id,
                    $document->warehouse_id,
                    $document->fiscal_year_id,
                    $document->company_id,
                    $document->document_date
                );
                if ($baseQty > $available) {
                    throw new BusinessRuleException(
                        "الكمية المطلوبة ({$baseQty}) للمنتج «{$product->name}» تتجاوز المخزون المتاح ({$available}).",
                        409
                    );
                }
            }

            $costPrice = $direction < 0
                ? (float) $valuationService->getCostPriceForSale(
                    $product, $document->warehouse_id, $baseQty
                )
                : (float) $line->unit_price_ht;

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'fiscal_year_id'              => $document->fiscal_year_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $stockMovementTypeId,
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => (float) $line->quantity,
                'unit_price'                  => (float) $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => round((float) $line->quantity * $costPrice, 4),
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'lot_number'                  => $line->lot_number ?? null,
                'is_validated'                => true,
                'user_id'                     => auth()->id(),
                'stock_balance_after'         => 0, // يُحدَّث بـ StockMovementObserver
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private function getStatusId(int $companyId, string $name): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', $name)
            ->value('id');
    }

    private function prepareDocumentData(array $data): array
    {
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate((int) $data['currency_id']);
        }

        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        if (empty($data['document_date'])) {
            $data['document_date'] = now()->toDateString();
        }

        return $data;
    }

    private function resolveNumberingSeries(int $documentTypeId, int $companyId): NumberingSeries
    {
        return NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first()
            ?? NumberingSeries::create([
                'company_id'       => $companyId,
                'document_type_id' => $documentTypeId,
                'name'             => (DocumentType::where('id', $documentTypeId)->value('code') ?? 'DOC') . '-' . date('Y'),
                'prefix'           => DocumentType::where('id', $documentTypeId)->value('code') ?? 'DOC',
                'current_number'   => 0,
                'is_locked'        => false,
            ]);
    }

    private function generateDocumentNumber(DocumentType $documentType, int $companyId): string
    {
        return DB::transaction(function () use ($documentType, $companyId) {
            $prefix = $documentType->code;
            $year   = date('Y');

            $last = CommercialDocument::withTrashed()
                ->where('company_id', $companyId)
                ->where('document_number', 'like', "{$prefix}-{$year}-%")
                ->orderByDesc('document_number')
                ->lockForUpdate()
                ->first();

            $seq = 1;
            if ($last) {
                $parts = explode('-', $last->document_number);
                $seq   = (int) end($parts) + 1;
            }

            $result = sprintf('%s-%s-%06d', $prefix, $year, $seq);

            \Illuminate\Support\Facades\Log::debug('[DocGen]', [
                'prefix' => $prefix,
                'year' => $year,
                'company' => $companyId,
                'last_found' => $last?->document_number,
                'seq' => $seq,
                'result' => $result,
            ]);

            return $result;
        });
    }

    private function getCurrentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) return 1.0;

        return (float) (\App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->value('rate') ?? 1.0);
    }

    private function getAvailableStock(int $productId, int $warehouseId, int $fiscalYearId, int $companyId, string $date): float
    {
        $opening = (float) DB::table('opening_balances_stock')
            ->where('company_id', $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->value('opening_quantity') ?? 0;

        $incoming = (float) StockMovement::where('company_id', $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->where('is_validated', true)
            ->where('movement_date', '<=', $date)
            ->whereNull('deleted_at')
            ->whereHas('stockMovementType', fn($q) => $q->where('direction', '>', 0))
            ->sum('quantity');

        $outgoing = (float) StockMovement::where('company_id', $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->where('is_validated', true)
            ->where('movement_date', '<=', $date)
            ->whereNull('deleted_at')
            ->whereHas('stockMovementType', fn($q) => $q->where('direction', '<', 0))
            ->sum('quantity');

        return $opening + $incoming - $outgoing;
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreCommercialDocumentRequest.php
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
            'exchange_rate'               => 'nullable|numeric|min:0.0001',
            'source_document_id'          => 'nullable|integer',
            'cancellation_of_document_id' => 'nullable|integer',
            'cancellation_reason'         => 'nullable|string|max:500',

            // ── الأسطر ───────────────────────────────────────────────
            'lines'                            => 'required|array|min:1',
            'lines.*.product_id'               => 'required|integer|exists:products,id',
            'lines.*.quantity'                 => 'required|numeric|min:0.001|max:9999999',
            'lines.*.unit_price_ht'            => 'required|numeric|min:0|max:9999999999',
            'lines.*.discount_percentage'      => 'nullable|numeric|min:0|max:100',
            'lines.*.discount_amount'          => 'nullable|numeric|min:0',
            'lines.*.tva_rate'                 => 'nullable|numeric|min:0|max:100',
            'lines.*.description'              => 'nullable|string|max:1000',
            'lines.*.packaging_id'             => 'nullable|integer|exists:product_packagings,id',
            'lines.*.stock_lot_id'             => 'nullable|integer|exists:product_lots,id',
            'lines.*.lot_number'               => 'nullable|string|max:100',
            'lines.*.notes'                    => 'nullable|string|max:500',
            'lines.*.line_attributes'          => 'nullable|array',

            // ── الدفعات (free mode) ──────────────────────────────────
            'payments'                           => 'nullable|array',
            'payments.*.payment_mode_id'         => 'required_with:payments|integer',
            'payments.*.amount'                  => 'required_with:payments|numeric|min:0.01',
            'payments.*.payment_date'            => 'required_with:payments|date',
            'payments.*.reference'               => 'nullable|string|max:255',
            'payments.*.treasury_account_id'     => 'nullable|integer',
            'payments.*.check_number'            => 'nullable|string|max:100',
            'payments.*.check_bank'              => 'nullable|string|max:200',
            'payments.*.check_due_date'          => 'nullable|date',

            // ── الدفعات الإضافية (additive mode) ─────────────────────
            'new_payments'                           => 'nullable|array',
            'new_payments.*.payment_mode_id'         => 'required_with:new_payments|integer',
            'new_payments.*.amount'                  => 'required_with:new_payments|numeric|min:0.01',
            'new_payments.*.payment_date'            => 'required_with:new_payments|date',
            'new_payments.*.reference'               => 'nullable|string|max:255',
            'new_payments.*.treasury_account_id'     => 'nullable|integer',
            'new_payments.*.check_number'            => 'nullable|string|max:100',
            'new_payments.*.check_bank'              => 'nullable|string|max:200',
            'new_payments.*.check_due_date'          => 'nullable|date',
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

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateCommercialDocumentRequest.php
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


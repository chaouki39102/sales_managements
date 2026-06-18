# Module Export: CommercialDocumentLine
Generated at: 2026-06-18 12:06:37

## Models

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


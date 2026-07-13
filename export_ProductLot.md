# Module Export: ProductLot
Generated at: 2026-07-13 10:36:36

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductLot.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class ProductLot extends Model
{
    use HasStandardizedConfiguration, HasCompany, SoftDeletes;

    protected $table = 'product_lots';

    protected $fillable = [
        'company_id',
        'lot_number',
        'product_id',
        'warehouse_id',
        'manufacturing_date',
        'expiration_date',
        'purchase_date',
        'purchase_price',
        'legal_selling_price',
        'margin_percentage',
        'original_quantity',
        'remaining_quantity',
        'stock_movement_id',
        'supplier_lot_number',
        'active',
    ];

    protected $casts = [
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:4',
        'legal_selling_price' => 'decimal:4',
        'margin_percentage' => 'decimal:4',
        'original_quantity' => 'decimal:3',
        'remaining_quantity' => 'decimal:3',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    protected $appends = ['is_depleted', 'is_expired'];

    public static array $searchableFields = ['lot_number', 'supplier_lot_number'];
    public static array $filterable = ['product_id', 'warehouse_id', 'active'];
    public static array $sortable = ['id', 'lot_number', 'purchase_date', 'expiration_date', 'remaining_quantity', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['product', 'warehouse', 'stockMovement', 'commercialDocumentLines', 'stockMovements'];
    public static string $defaultSort = 'purchase_date';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 20;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_lots'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
    public function warehouse(): BelongsTo { return $this->belongsTo(Warehouse::class); }
    public function stockMovement(): BelongsTo { return $this->belongsTo(StockMovement::class); }
    public function commercialDocumentLines() { return $this->hasMany(CommercialDocumentLine::class, 'stock_lot_id'); }
    public function stockMovements() { return $this->hasMany(StockMovement::class, 'stock_lot_id'); }

    public function scopeAvailable(Builder $query): Builder { return $query->where('remaining_quantity', '>', 0)->where('active', true); }
    public function scopeDepleted(Builder $query): Builder { return $query->where('remaining_quantity', '<=', 0); }
    public function scopeExpired(Builder $query): Builder { return $query->whereNotNull('expiration_date')->where('expiration_date', '<', now()); }
    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->whereNotNull('expiration_date')->whereBetween('expiration_date', [now(), now()->addDays($days)]);
    }
    public function scopeFifoOrder(Builder $query): Builder { return $query->orderBy('purchase_date')->orderBy('id'); }

    public function getIsDepletedAttribute(): bool { return $this->remaining_quantity <= 0; }
    public function getIsExpiredAttribute(): bool { return $this->expiration_date && $this->expiration_date->isPast(); }
    public function getTotalCostAttribute(): float { return $this->original_quantity * $this->purchase_price; }
    public function getRemainingValueAttribute(): float { return $this->remaining_quantity * $this->purchase_price; }

    public function decreaseQuantity(float $quantity): bool
    {
        if ($this->remaining_quantity < $quantity) return false;
        return $this->decrement('remaining_quantity', $quantity);
    }
    public function increaseQuantity(float $quantity): bool { return $this->increment('remaining_quantity', $quantity); }
    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expiration_date && $this->expiration_date->isFuture() && $this->expiration_date->diffInDays(now()) <= $days;
    }
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\ProductLotController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\ProductLotResource;
use App\Services\ProductLotService;
use App\Models\ProductLot;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ProductLotController extends BaseApiController
{
    protected string $resourceName = 'product_lot';
    protected ?string $resourceClass = ProductLotResource::class;

    public function __construct(private ProductLotService $service)
    {
        parent::__construct();
    }

    public function available(Request $request): JsonResponse
    {
        try {
            $lots = $this->service->getAvailable();
            return $this->successResponse(ProductLotResource::collection($lots), 'تم جلب الدفعات المتاحة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'available');
        }
    }

    public function expiring(Request $request): JsonResponse
    {
        try {
            $days = $request->get('days', 30);
            $lots = $this->service->getExpiringSoon($days);
            return $this->successResponse(ProductLotResource::collection($lots), 'تم جلب الدفعات قريبة الانتهاء بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'expiring');
        }
    }

    protected function getService(): ProductLotService
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return ProductLot::class;
    }
}
```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\ProductLotService.php
```php
<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductLot;
use App\Services\CompanyContextService;
use Illuminate\Http\Request;

class ProductLotService extends \App\Core\Services\BaseService
{
    protected string $model = ProductLot::class;
    protected string $resourceName = 'product_lot';
    protected function getResourceName(): string { return $this->resourceName; }

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data = parent::beforeCreate($data, $request);

        if (empty($data['lot_number'])) {
            $data['lot_number'] = $this->generateLotNumber((int) ($data['product_id'] ?? 0));
        }

        return $data;
    }

    private function generateLotNumber(int $productId): string
    {
        $companyId = app(CompanyContextService::class)->get();
        $product   = $productId ? Product::find($productId) : null;
        $code      = $product?->ref ?: ($productId ?: 'GEN');
        $datePart  = now()->format('Ymd');

        $seq       = 1;
        $candidate = "LOT-{$code}-{$datePart}-{$seq}";

        while (
            ProductLot::withTrashed()
                ->where('company_id', $companyId)
                ->where('lot_number', $candidate)
                ->exists()
        ) {
            $seq++;
            $candidate = "LOT-{$code}-{$datePart}-{$seq}";
        }

        return $candidate;
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\Productlotrequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['required', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->where('product_id',   $this->input('product_id'))
                                           ->where('company_id',   $companyId)],
            'product_id'          => 'required|integer|exists:products,id',
            'warehouse_id'        => 'required|integer|exists:warehouses,id',

            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date|after_or_equal:manufacturing_date',
            'purchase_date'       => 'required|date',

            'purchase_price'      => 'required|numeric|min:0',
            'legal_selling_price' => 'required|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',

            'original_quantity'   => 'required|numeric|min:0.0001',
            // remaining_quantity = original_quantity عند الإنشاء — يحسبها الـ Service
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.required'          => 'رقم الدفعة مطلوب',
            'lot_number.unique'            => 'رقم الدفعة مستخدم بالفعل لهذا المنتج في شركتك',
            'product_id.required'          => 'المنتج مطلوب',
            'warehouse_id.required'        => 'المستودع مطلوب',
            'purchase_date.required'       => 'تاريخ الشراء مطلوب',
            'purchase_price.required'      => 'سعر الشراء مطلوب',
            'legal_selling_price.required' => 'سعر البيع القانوني مطلوب',
            'original_quantity.required'   => 'الكمية الأصلية مطلوبة',
            'original_quantity.min'        => 'الكمية يجب أن تكون أكبر من الصفر',
            'expiration_date.after_or_equal' => 'تاريخ الانتهاء يجب أن يكون بعد أو مساوياً لتاريخ الإنتاج',
        ];
    }
}


class UpdateProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('product_lot');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['sometimes', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->ignore($id)
                                           ->where('product_id', $this->input('product_id'))
                                           ->where('company_id', $companyId)],
            // product_id و warehouse_id لا تتغير بعد الإنشاء
            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date',
            'purchase_date'       => 'sometimes|date',
            'purchase_price'      => 'sometimes|numeric|min:0',
            'legal_selling_price' => 'sometimes|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',
            // remaining_quantity تتغير فقط عبر حركات المخزون — لا تُعدَّل مباشرة
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.unique'       => 'رقم الدفعة مستخدم بالفعل لهذا المنتج',
            'purchase_price.min'      => 'سعر الشراء يجب أن يكون صفراً أو أكثر',
            'legal_selling_price.min' => 'سعر البيع القانوني يجب أن يكون صفراً أو أكثر',
        ];
    }
}

```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\StoreProductLotRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class StoreProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['nullable', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->where('product_id',   $this->input('product_id'))
                                           ->where('company_id',   $companyId)],
            'product_id'          => 'required|integer|exists:products,id',
            'warehouse_id'        => 'required|integer|exists:warehouses,id',

            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date|after_or_equal:manufacturing_date',
            'purchase_date'       => 'required|date',

            'purchase_price'      => 'required|numeric|min:0',
            'legal_selling_price' => 'required|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',

            'original_quantity'   => 'required|numeric|min:0.0001',
            // remaining_quantity = original_quantity عند الإنشاء — يحسبها الـ Service
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.required'          => 'رقم الدفعة مطلوب',
            'lot_number.unique'            => 'رقم الدفعة مستخدم بالفعل لهذا المنتج في شركتك',
            'product_id.required'          => 'المنتج مطلوب',
            'warehouse_id.required'        => 'المستودع مطلوب',
            'purchase_date.required'       => 'تاريخ الشراء مطلوب',
            'purchase_price.required'      => 'سعر الشراء مطلوب',
            'legal_selling_price.required' => 'سعر البيع القانوني مطلوب',
            'original_quantity.required'   => 'الكمية الأصلية مطلوبة',
            'original_quantity.min'        => 'الكمية يجب أن تكون أكبر من الصفر',
            'expiration_date.after_or_equal' => 'تاريخ الانتهاء يجب أن يكون بعد أو مساوياً لتاريخ الإنتاج',
        ];
    }
}



```

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\UpdateProductLotRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;


class UpdateProductLotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id        = $this->route('product_lot');
        $companyId = $this->user()?->company_id
            ?? app(\App\Services\CompanyContextService::class)->get();

        return [
            'lot_number'          => ['sometimes', 'string', 'max:50',
                                       Rule::unique('product_lots', 'lot_number')
                                           ->ignore($id)
                                           ->where('product_id', $this->input('product_id'))
                                           ->where('company_id', $companyId)],
            // product_id و warehouse_id لا تتغير بعد الإنشاء
            'manufacturing_date'  => 'nullable|date',
            'expiration_date'     => 'nullable|date',
            'purchase_date'       => 'sometimes|date',
            'purchase_price'      => 'sometimes|numeric|min:0',
            'legal_selling_price' => 'sometimes|numeric|min:0',
            'margin_percentage'   => 'nullable|numeric|min:0|max:100',
            // remaining_quantity تتغير فقط عبر حركات المخزون — لا تُعدَّل مباشرة
        ];
    }

    public function messages(): array
    {
        return [
            'lot_number.unique'       => 'رقم الدفعة مستخدم بالفعل لهذا المنتج',
            'purchase_price.min'      => 'سعر الشراء يجب أن يكون صفراً أو أكثر',
            'legal_selling_price.min' => 'سعر البيع القانوني يجب أن يكون صفراً أو أكثر',
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\ProductLotPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class ProductLotPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_product_lot');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_product_lot');
    }

    public function create(User $user): bool
    {
        return $user->can('create_product_lot');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_product_lot');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_product_lot');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_product_lot');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_product_lot');
    }
}
```


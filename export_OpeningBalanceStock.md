# Module Export: OpeningBalanceStock
Generated at: 2026-06-01 12:18:57

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\OpeningBalanceStock.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class OpeningBalanceStock extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'opening_balances_stock';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'product_id',
        'warehouse_id',
        'opening_quantity',
        'opening_value',
        'lot_number',
        'manufacturing_date',
        'expiration_date',
    ];

    protected $casts = [
        'opening_quantity' => 'decimal:3',
        'opening_value' => 'decimal:4',
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'product_id', 'warehouse_id'];
    public static array $sortable = ['id', 'opening_quantity', 'opening_value'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'product', 'warehouse'];
    public static string $defaultSort = 'product_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_stock'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getAverageCostPrice(): float
    {
        if ($this->opening_quantity <= 0) {
            return 0;
        }
        return $this->opening_value / $this->opening_quantity;
    }
}
```

## Controllers

### 📁 D:\xampp\htdocs\sales-management\app\Http/Controllers\Api\V1\OpeningBalanceStockController.php
```php
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\OpeningBalanceStockResource;
use App\Services\OpeningBalanceStockService;
use App\Models\OpeningBalanceStock;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OpeningBalanceStockController extends BaseApiController
{
    protected string $resourceName = 'opening_balance_stock';
    protected ?string $resourceClass = OpeningBalanceStockResource::class;

    public function __construct(private OpeningBalanceStockService $openingBalanceStockService)
    {
        parent::__construct();
    }

    protected function getService(): OpeningBalanceStockService
    {
        return $this->openingBalanceStockService;
    }

    protected function getModelClass(): string
    {
        return OpeningBalanceStock::class;
    }
}
```

## Services

### 📁 D:\xampp\htdocs\sales-management\app\Services\OpeningBalanceStockService.php
```php
<?php

namespace App\Services;

use App\Models\OpeningBalanceStock;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\FiscalYear;
use App\Models\StockMovement;
use App\Models\StockMovementType;
use Illuminate\Support\Facades\DB;

class OpeningBalanceStockService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceStock::class;
    protected string $resourceName = 'opening_balance_stock';
    protected array $defaultWith = ['fiscalYear', 'product', 'warehouse'];
    protected function getResourceName(): string { return $this->resourceName; }

      /**
     * إنشاء رصيد افتتاحي لمنتج (بدون دفعة)
     */
    public function createOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        float $quantity,
        float $unitPrice
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $quantity, $unitPrice) {
            // حفظ الرصيد الافتتاحي
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => null,
                'manufacturing_date' => null,
                'expiration_date' => null,
            ]);

            // إنشاء حركة مخزون افتتاحية
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }

    /**
     * إنشاء رصيد افتتاحي لدفعة محددة
     */
    public function createLotOpeningBalance(
        Product $product,
        Warehouse $warehouse,
        FiscalYear $fiscalYear,
        array $lotData
    ): OpeningBalanceStock {
        return DB::transaction(function () use ($product, $warehouse, $fiscalYear, $lotData) {
            $quantity = $lotData['quantity'];
            $unitPrice = $lotData['unit_price'];

            // حفظ الرصيد الافتتاحي للدفعة
            $opening = OpeningBalanceStock::create([
                'fiscal_year_id' => $fiscalYear->id,
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'opening_quantity' => $quantity,
                'opening_value' => $quantity * $unitPrice,
                'lot_number' => $lotData['lot_number'],
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
            ]);

            // إنشاء دفعة جديدة
            $lot = $product->lots()->create([
                'lot_number' => $lotData['lot_number'],
                'warehouse_id' => $warehouse->id,
                'manufacturing_date' => $lotData['manufacturing_date'] ?? null,
                'expiration_date' => $lotData['expiration_date'] ?? null,
                'purchase_date' => $fiscalYear->start_date,
                'purchase_price' => $unitPrice,
                'legal_selling_price' => $lotData['selling_price'] ?? 0,
                'original_quantity' => $quantity,
                'remaining_quantity' => $quantity,
                'active' => true,
            ]);

            // إنشاء حركة مخزون افتتاحية للدفعة
            $movementType = StockMovementType::where('name', 'opening_balance')->first();

            StockMovement::create([
                'product_id' => $product->id,
                'warehouse_id' => $warehouse->id,
                'fiscal_year_id' => $fiscalYear->id,
                'stock_movement_type_id' => $movementType->id,
                'movement_date' => $fiscalYear->start_date,
                'quantity' => $quantity,
                'unit_price' => $unitPrice,
                'cost_price' => $unitPrice,
                'total_price' => $quantity * $unitPrice,
                'stock_balance_after' => $quantity,
                'lot_number' => $lotData['lot_number'],
                'stock_lot_id' => $lot->id,
                'is_validated' => true,
                'price_source' => 'adjustment',
            ]);

            return $opening;
        });
    }
}

```

## Requests

### 📁 D:\xampp\htdocs\sales-management\app\Http/Requests\OpeningBalanceStockRequest.php
```php
<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOpeningBalanceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'required|exists:fiscal_years,id',
            'product_id' => 'required|exists:products,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'opening_quantity' => 'required|numeric|min:0',
            'opening_value' => 'required|numeric|min:0',
        ];
    }
}

class UpdateOpeningBalanceStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'fiscal_year_id' => 'sometimes|exists:fiscal_years,id',
            'product_id' => 'sometimes|exists:products,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'opening_quantity' => 'sometimes|numeric|min:0',
            'opening_value' => 'sometimes|numeric|min:0',
        ];
    }
}

```

## Policies

### 📁 D:\xampp\htdocs\sales-management\app\Policies\OpeningBalanceStockPolicy.php
```php
<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class OpeningBalanceStockPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->can('view_any_opening_balance_stock');
    }

    public function view(User $user, $model): bool
    {
        return $user->can('view_opening_balance_stock');
    }

    public function create(User $user): bool
    {
        return $user->can('create_opening_balance_stock');
    }

    public function update(User $user, $model): bool
    {
        return $user->can('update_opening_balance_stock');
    }

    public function delete(User $user, $model): bool
    {
        return $user->can('delete_opening_balance_stock');
    }

    public function restore(User $user, $model): bool
    {
        return $user->can('restore_opening_balance_stock');
    }

    public function forceDelete(User $user, $model): bool
    {
        return $user->can('force_delete_opening_balance_stock');
    }
}
```


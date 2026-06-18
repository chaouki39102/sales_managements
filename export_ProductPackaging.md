# Module Export: ProductPackaging
Generated at: 2026-06-18 12:08:17

## Models

### 📁 D:\xampp\htdocs\sales-management\app\Models\ProductPackaging.php
```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

class ProductPackaging extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'product_packagings';

    protected $fillable = [
        'company_id',
        'product_id',
        'code',
        'label',
        'quantity',
        'barcode',
        'is_default',
        'active',
        'display_order',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'is_default' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['code', 'label', 'barcode'];
    public static array $filterable = ['product_id', 'active', 'is_default'];
    public static array $sortable = ['id', 'display_order', 'quantity'];
    public static array $allowedIncludes = ['product'];
    public static string $defaultSort = 'display_order';
    public static array $cacheTags = ['product_packagings', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceForLevel(int $priceLevelId): float
    {
        $unitPrice = $this->product->computedPrice($priceLevelId);
        return round($unitPrice * (float) $this->quantity, 4);
    }
}
```


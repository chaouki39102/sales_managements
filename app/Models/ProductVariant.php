<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Traits\HasCompany;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * @property int $id
 * @property int $company_id
 * @property int $product_id
 * @property string|null $sku
 * @property string|null $barcode
 * @property string|null $price_type
 * @property float|null $price_value
 * @property float|null $stock
 * @property bool|null $track_stock
 * @property array|null $attributes
 * @property string|null $image
 * @property float|null $weight
 * @property float|null $volume
 * @property bool|null $active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Company $company
 * @property-read \App\Models\Product $product
 * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\Barcode[] $barcodes
 */
class ProductVariant extends Model
{
    use HasFactory, SoftDeletes, HasCompany, HasStandardizedConfiguration;

    protected $table = 'product_variants';

    protected $fillable = [
        'company_id',
        'product_id',
        'sku',
        'barcode',
        'price_type',
        'price_value',
        'stock',
        'track_stock',
        'attributes',
        'image',
        'weight',
        'volume',
        'active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'price_value' => 'decimal:4',
        'stock' => 'decimal:4',
        'track_stock' => 'boolean',
        'attributes' => 'array',
        'weight' => 'decimal:2',
        'volume' => 'decimal:2',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration for HasStandardizedConfiguration --------------------
    public static array $searchableFields = ['sku', 'barcode', 'attributes'];
    public static array $filterable = ['product_id', 'price_type', 'active', 'track_stock'];
    public static array $sortable = ['id', 'sku', 'price_value', 'stock', 'created_at'];
    public static array $defaultWith = ['product:id,name,ref'];
    public static array $allowedIncludes = ['product', 'company', 'barcodes'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_variants'];

    // -------------------- Relations --------------------
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function barcodes()
    {
        return $this->hasMany(Barcode::class);
    }

    // -------------------- Accessors --------------------
    public function getFinalPriceAttribute(): ?float
    {
        if (!$this->product || !$this->price_type) {
            return $this->product?->price_ht ?? null;
        }

        $basePrice = $this->product->price_ht ?? 0;

        if ($this->price_type === 'fixed') {
            return $basePrice + ($this->price_value ?? 0);
        }

        if ($this->price_type === 'percentage') {
            return $basePrice * (1 + ($this->price_value / 100));
        }

        return $basePrice;
    }

    public function getIsInStockAttribute(): bool
    {
        if ($this->track_stock === false) {
            return true;
        }
        return ($this->stock ?? 0) > 0;
    }

    // -------------------- Boot --------------------
    protected static function booted(): void
    {
        static::creating(function ($variant) {
            if (empty($variant->active)) {
                $variant->active = true;
            }
            if ($variant->track_stock === null) {
                $variant->track_stock = true;
            }
        });
    }
}

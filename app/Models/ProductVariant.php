<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

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

    public static array $searchableFields = ['sku', 'barcode', 'attributes'];
    public static array $filterable = ['product_id', 'price_type', 'active', 'track_stock'];
    public static array $sortable = ['id', 'sku', 'price_value', 'stock', 'created_at'];
    public static array $defaultWith = ['product:id,name,ref'];
    public static array $allowedIncludes = ['product', 'company', 'barcodes'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_variants'];

    public function company() { return $this->belongsTo(Company::class); }
    public function product() { return $this->belongsTo(Product::class); }
    public function barcodes() {
        $variantId = $this->id;
        $productId = $this->product_id;

        return $this->hasMany(Barcode::class)->where(function ($query) use ($variantId, $productId) {
            $query->where('variant_id', $variantId)
                  ->orWhere(function ($q) use ($productId) {
                      $q->whereNull('variant_id')
                        ->where('product_id', $productId);
                  });
        });
    }

    public function getFinalPriceAttribute(): ?float
    {
        if (!$this->product || !$this->price_type) {
            return $this->product?->purchase_price_ht ?? null;
        }
        $basePrice = $this->product->purchase_price_ht ?? 0;
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
        if ($this->track_stock === false) return true;
        return ($this->stock ?? 0) > 0;
    }

    protected static function booted(): void
    {
        static::creating(function ($variant) {
            if (empty($variant->active)) $variant->active = true;
            if ($variant->track_stock === null) $variant->track_stock = true;
        });
    }
}
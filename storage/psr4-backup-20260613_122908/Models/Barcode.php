<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

class Barcode extends Model
{
    use HasFactory, HasCompany, HasStandardizedConfiguration;

    protected $table = 'barcodes';

    protected $fillable = [
        'company_id',
        'product_id',
        'variant_id',
        'barcode',
        'type',
        'is_primary',
        'unit',
        'created_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['barcode', 'type', 'unit'];
    public static array $filterable = ['product_id', 'variant_id', 'is_primary', 'type', 'unit'];
    public static array $sortable = ['id', 'barcode', 'created_at'];
    public static array $defaultWith = ['product:id,name'];
    public static array $allowedIncludes = ['product', 'variant', 'creator', 'company'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['barcodes'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    protected static function booted(): void
    {
        static::creating(function (self $barcode) {
            if ($barcode->is_primary) {
                static::where('product_id', $barcode->product_id)
                    ->where('company_id', $barcode->company_id)
                    ->update(['is_primary' => false]);
            }
        });

        static::updating(function (self $barcode) {
            if ($barcode->isDirty('is_primary') && $barcode->is_primary) {
                static::where('product_id', $barcode->product_id)
                    ->where('company_id', $barcode->company_id)
                    ->where('id', '!=', $barcode->id)
                    ->update(['is_primary' => false]);
            }
        });
    }
}
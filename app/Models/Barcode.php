<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * @property int $id
 * @property int $company_id
 * @property int $product_id
 * @property string $barcode
 * @property string|null $type
 * @property bool $is_primary
 * @property string|null $unit
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Company $company
 * @property-read \App\Models\Product $product
 * @property-read \App\Models\User|null $creator
 */
class Barcode extends Model
{
    use HasFactory, HasCompany, HasStandardizedConfiguration;

    protected $table = 'barcodes';

    protected $fillable = [
        'company_id',
        'product_id',
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

    // -------------------- Configuration for HasStandardizedConfiguration --------------------
    public static array $searchableFields = ['barcode', 'type', 'unit'];
    public static array $filterable = ['product_id', 'is_primary', 'type', 'unit'];
    public static array $sortable = ['id', 'barcode', 'created_at'];
    public static array $defaultWith = ['product:id,name'];
    public static array $allowedIncludes = ['product', 'creator', 'company'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['barcodes'];

    // -------------------- Relations --------------------
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------- Boot --------------------
    protected static function booted(): void
    {
        static::creating(function (self $barcode) {
            // إذا كان الباركود جديداً وهو primary، نزيل الـ primary عن باقي باركودات المنتج
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

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class PaymentMode extends Model
{
    use HasStandardizedConfiguration, HasCompany;

    protected $table = 'payment_modes';

    protected $fillable = [
        'company_id',
        'name',
        'code',
        'description',
        'treasury_account_id',
        'requires_reference',
        'is_cash',
        'active',
        'display_order',
    ];

    protected $casts = [
        'requires_reference' => 'boolean',
        'is_cash' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['treasury_account_id', 'is_cash', 'requires_reference', 'active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['treasuryAccount', 'payments', 'expenses'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['payment_modes', 'lookups'];

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    protected static function boot(): void
{
    parent::boot();

    static::creating(function (self $model): void {
        $model->slug = static::uniqueSlug($model->name, $model->company_id);
    });

    static::updating(function (self $model): void {
        if ($model->isDirty('name')) {
            $model->slug = static::uniqueSlug($model->name, $model->company_id, $model->id);
        }
    });
}

public static function uniqueSlug(string $name, int $companyId, ?int $ignoreId = null): string
{
    $slug = \Illuminate\Support\Str::slug($name) ?: preg_replace('/\s+/u', '-', trim(mb_strtolower($name)));
    $originalSlug = $slug;
    $count = 1;

    while (\Illuminate\Support\Facades\DB::table('payment_methods')
        ->where('slug', $slug)
        ->when($ignoreId, function ($query) use ($ignoreId) {
            return $query->where('id', '!=', $ignoreId);
        })
        ->exists()
    ) {
        $slug = $originalSlug . '-' . $count++;
    }

    return $slug;
}
}

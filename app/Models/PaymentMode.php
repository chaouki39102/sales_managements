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

    
}

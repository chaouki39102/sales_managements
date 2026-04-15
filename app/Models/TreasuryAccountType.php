<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class TreasuryAccountType extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['treasuryAccounts'];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['treasury_account_types', 'api'];

    // --- العلاقات ---
    public function treasuryAccounts(): HasMany
    {
        return $this->hasMany(TreasuryAccount::class);
    }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;
use Illuminate\Support\Str;


#[Cacheable]
class Party extends Model
{
    use HasStandardizedConfiguration, SoftDeletes, HasCompany, Auditable;

    protected $table = 'parties';

    protected $fillable = [
        'company_id',
        'party_type_id',
        'code',
        'name',
        'commercial_name',
        'slug',
        'activity',
        'rc',
        'nif',
        'nis',
        'ai',
        'legal_form_id',
        'capital_amount',
        'rc_date',
        'address',
        'commune_id',
        'wilaya_id',
        'phone',
        'mobile',
        'fax',
        'email',
        'avatar',
        'bank_name',
        'rib',
        'initial_balance',
        'credit_limit',
        'default_price_level_id',
        'credit_days',
        'is_tva_exempt',
        'is_taxable',
        'tax_option',
        'cnas_number',
        'tax_regime',
        'is_final_consumer',
        'is_vat_registered',
        'vat_registration_date',
        'additional_data',
        'active',
    ];

    protected $casts = [
        'capital_amount' => 'decimal:4',
        'rc_date' => 'date',
        'initial_balance' => 'decimal:4',
        'credit_limit' => 'decimal:4',
        'credit_days' => 'integer',
        'is_tva_exempt' => 'boolean',
        'is_taxable' => 'boolean',
        'is_final_consumer' => 'boolean',
        'is_vat_registered' => 'boolean',
        'vat_registration_date' => 'date',
        'additional_data' => 'array',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'commercial_name', 'code', 'nif', 'rc', 'email', 'phone', 'mobile', 'address'];
    public static array $filterable = [
        'party_type_id', 'legal_form_id', 'commune_id', 'wilaya_id', 'default_price_level_id',
        'is_tva_exempt', 'is_taxable', 'is_final_consumer', 'is_vat_registered', 'active'
    ];
    public static array $sortable = ['id', 'code', 'name', 'commercial_name', 'created_at', 'updated_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        'partyType', 'legalForm', 'commune', 'wilaya', 'defaultPriceLevel',
        'commercialDocuments', 'payments', 'openingBalances', 'createdBy', 'updatedBy', 'deletedBy'
    ];
    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['parties'];
    public static array $cacheInvalidateRelations = ['commercialDocuments', 'payments'];
    public static array $scopes = [];

    public function partyType(): BelongsTo { return $this->belongsTo(PartyType::class); }
    public function legalForm(): BelongsTo { return $this->belongsTo(LegalForm::class); }
    public function commune(): BelongsTo { return $this->belongsTo(Commune::class); }
    public function wilaya(): BelongsTo { return $this->belongsTo(Wilaya::class); }
    public function defaultPriceLevel(): BelongsTo { return $this->belongsTo(PriceLevel::class, 'default_price_level_id'); }
    public function commercialDocuments(): HasMany { return $this->hasMany(CommercialDocument::class); }
    public function payments(): HasMany { return $this->hasMany(Payment::class); }
    public function openingBalances(): HasMany { return $this->hasMany(OpeningBalanceParty::class); }
    public function checks(): HasMany { return $this->hasMany(Check::class); }

    public function scopeCustomers(Builder $query): Builder
    {
        return $query->whereHas('partyType', fn($q) => $q->whereIn('name', ['client', 'both']));
    }

    public function scopeSuppliers(Builder $query): Builder
    {
        return $query->whereHas('partyType', fn($q) => $q->whereIn('name', ['supplier', 'both']));
    }

    public function scopeVatRegistered(Builder $query): Builder
    {
        return $query->where('is_vat_registered', true);
    }

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([$this->address, $this->commune?->name, $this->wilaya?->name]);
        return implode(', ', $parts);
    }

    public function getCurrentBalanceAttribute(): float
    {
        return 0.00; // سيتم تنفيذه لاحقاً
    }

    public function isCustomer(): bool
    {
        return in_array($this->partyType?->name, ['client', 'both']);
    }

    public function isSupplier(): bool
    {
        return in_array($this->partyType?->name, ['supplier', 'both']);
    }

    protected static function booted()
{
    static::saving(function ($party) {
        if (empty($party->slug) && !empty($party->name)) {
            $party->slug = Str::slug($party->name);
            $original = $party->slug;
            $counter = 1;
            while (static::where('slug', $party->slug)->where('id', '!=', $party->id)->exists()) {
                $party->slug = $original . '-' . $counter++;
            }
        }
    });
}
}

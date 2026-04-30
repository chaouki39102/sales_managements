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

/**
 * Party Model
 *
 * Table: parties
 * Manages customers, suppliers, and business partners
 */
#[Cacheable]
class Party extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable;

    protected $table = 'parties';

    // -------------------- Fillable --------------------
    protected $fillable = [
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

    // -------------------- Casts --------------------
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

    // -------------------- Hidden --------------------
    protected $hidden = [];

    // -------------------- Appends --------------------
    protected $appends = [];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'commercial_name',
        'code',
        'nif',
        'rc',
        'email',
        'phone',
        'mobile',
        'address',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'party_type_id',
        'legal_form_id',
        'commune_id',
        'wilaya_id',
        'default_price_level_id',
        'is_tva_exempt',
        'is_taxable',
        'is_final_consumer',
        'is_vat_registered',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'code',
        'name',
        'commercial_name',
        'created_at',
        'updated_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'partyType',
        'legalForm',
        'commune',
        'wilaya',
        'defaultPriceLevel',
        'commercialDocuments',
        'payments',
        'openingBalances',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['parties'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [
        'commercialDocuments',
        'payments',
    ];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    /**
     * Get the party type
     */
    public function partyType(): BelongsTo
    {
        return $this->belongsTo(PartyType::class);
    }

    /**
     * Get the legal form
     */
    public function legalForm(): BelongsTo
    {
        return $this->belongsTo(LegalForm::class);
    }

    /**
     * Get the commune
     */
    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    /**
     * Get the wilaya
     */
    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    /**
     * Get the default price level
     */
    public function defaultPriceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class, 'default_price_level_id');
    }

    /**
     * Get commercial documents for this party
     */
    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    /**
     * Get payments for this party
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get opening balances
     */
    public function openingBalances(): HasMany
    {
        return $this->hasMany(OpeningBalanceParty::class);
    }

    /**
     * Get checks issued by this party
     */
    public function checks(): HasMany
    {
        return $this->hasMany(Check::class);
    }

    // -------------------- Scopes --------------------

    /**
     * Scope for customers only
     */
    public function scopeCustomers(Builder $query): Builder
    {
        return $query->whereHas('partyType', function ($q) {
            $q->whereIn('name', ['client', 'both']);
        });
    }

    /**
     * Scope for suppliers only
     */
    public function scopeSuppliers(Builder $query): Builder
    {
        return $query->whereHas('partyType', function ($q) {
            $q->whereIn('name', ['supplier', 'both']);
        });
    }

    /**
     * Scope for VAT registered parties
     */
    public function scopeVatRegistered(Builder $query): Builder
    {
        return $query->where('is_vat_registered', true);
    }

    // -------------------- Accessors --------------------

    /**
     * Get full address
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Get current balance (to be calculated from transactions)
     */
    public function getCurrentBalanceAttribute(): float
    {
        // يمكن حساب الرصيد الحالي من المستندات والمدفوعات
        return 0.00; // TODO: Implement balance calculation
    }

    // -------------------- Helpers --------------------

    /**
     * Check if party is a customer
     */
    public function isCustomer(): bool
    {
        return in_array($this->partyType?->name, ['client', 'both']);
    }

    /**
     * Check if party is a supplier
     */
    public function isSupplier(): bool
    {
        return in_array($this->partyType?->name, ['supplier', 'both']);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TaxConfiguration extends Model
{
    use HasCompany;

    protected $table = 'tax_configurations';

    protected $fillable = [
        'company_id',
        'regime',
        'timbre_fiscal_electronic_exempt',
        'g50_deadline_day',
        'ifu_rate_goods',
        'ifu_rate_services',
        'ifu_rate_auto',
        'ifu_minimum',
        'ifu_ca_threshold',
        'g12_previsionnel_deadline',
        'g12_definitif_deadline',
        'g12_tranche1_pct',
        'g12_tranche2_pct',
        'g12_tranche3_pct',
        'g12_tranche2_deadline',
        'g12_tranche3_deadline',
        'ifu_require_locked',
        'ifu_period_type',
        'ifu_rate_subsidized',
        'ifu_minimum_auto',
        'version',
        'change_notes',
        'updated_by',
        'is_active',
    ];

    protected $casts = [
        'timbre_fiscal_electronic_exempt' => 'boolean',
        'is_active'                       => 'boolean',
        'g50_deadline_day'                => 'integer',
        'g12_tranche1_pct'                => 'integer',
        'g12_tranche2_pct'                => 'integer',
        'g12_tranche3_pct'                => 'integer',
        'ifu_rate_goods'                  => 'decimal:4',
        'ifu_rate_services'               => 'decimal:4',
        'ifu_rate_auto'                   => 'decimal:4',
        'ifu_minimum'                     => 'decimal:2',
        'ifu_ca_threshold'                => 'decimal:2',
        'ifu_require_locked'              => 'boolean',
        'ifu_rate_subsidized'             => 'decimal:4',
        'ifu_minimum_auto'                => 'decimal:2',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function tvaRates(): HasMany
    {
        return $this->hasMany(TvaRate::class);
    }

    public function timbreBareme(): HasMany
    {
        return $this->hasMany(TimbreBareme::class);
    }

    public function ifuDocumentSources(): HasMany
    {
        return $this->hasMany(IfuDocumentSource::class);
    }
}

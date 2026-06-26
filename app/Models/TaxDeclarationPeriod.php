<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TaxDeclarationPeriod extends Model
{
    use HasCompany;

    protected $table = 'tax_declaration_periods';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'regime',
        'form_type',
        'month',
        'tva_collectee',
        'tva_deductible',
        'tva_carry_fwd',
        'tva_net',
        'tva_due',
        'timbre_fiscal',
        'ifu_subsidized',
        'ifu_other',
        'ifu_total',
        'ifu_minimum',
        'amount_due',
        'amount_paid',
        'status',
        'submitted_at',
        'paid_at',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'tva_collectee'  => 'decimal:4',
        'tva_deductible' => 'decimal:4',
        'tva_carry_fwd'  => 'decimal:4',
        'tva_net'        => 'decimal:4',
        'tva_due'        => 'decimal:4',
        'timbre_fiscal'  => 'decimal:4',
        'ifu_subsidized' => 'decimal:4',
        'ifu_other'      => 'decimal:4',
        'ifu_total'      => 'decimal:4',
        'ifu_minimum'    => 'decimal:4',
        'amount_due'     => 'decimal:4',
        'amount_paid'    => 'decimal:4',
        'submitted_at'   => 'date',
        'paid_at'        => 'date',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}

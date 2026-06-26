<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FiscalYearCarryForward extends Model
{
    use HasCompany;

    protected $table = 'fiscal_year_carry_forward';

    protected $fillable = [
        'company_id',
        'fiscal_year_id',
        'source_fiscal_year_id',
        'category',
        'amount',
        'currency_id',
        'exchange_rate',
        'amount_dzd',
        'notes',
    ];

    protected $casts = [
        'amount'        => 'decimal:4',
        'exchange_rate' => 'decimal:6',
        'amount_dzd'    => 'decimal:4',
    ];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function sourceFiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class, 'source_fiscal_year_id');
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
}

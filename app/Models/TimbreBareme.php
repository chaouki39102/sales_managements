<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimbreBareme extends Model
{
    protected $table = 'tax_timbre_bareme';

    protected $fillable = [
        'tax_configuration_id',
        'from_amount',
        'to_amount',
        'rate',
        'type',
        'amount',
    ];

    protected $casts = [
        'from_amount' => 'decimal:4',
        'to_amount'   => 'decimal:4',
        'rate'        => 'decimal:4',
        'amount'      => 'decimal:4',
    ];

    public function taxConfiguration(): BelongsTo
    {
        return $this->belongsTo(TaxConfiguration::class);
    }
}

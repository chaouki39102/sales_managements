<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TvaRate extends Model
{
    protected $table = 'tax_tva_rates';

    protected $fillable = [
        'tax_configuration_id',
        'rate',
        'label',
    ];

    protected $casts = [
        'rate' => 'decimal:4',
    ];

    public function taxConfiguration(): BelongsTo
    {
        return $this->belongsTo(TaxConfiguration::class);
    }
}

<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RegulatedProductConfig extends Model
{
    use HasCompany;

    protected $table = 'regulated_products_config';

    protected $fillable = [
        'company_id',
        'product_key',
        'label',
        'unit_label',
        'category',
        'regulated_max_price',
        'regulated_margin',
        'regulation_type',
        'legal_reference',
        'effective_date',
        'active',
        'notes',
        'updated_by',
    ];

    protected $casts = [
        'regulated_max_price' => 'decimal:4',
        'regulated_margin'    => 'decimal:4',
        'effective_date'      => 'date',
        'active'              => 'boolean',
    ];

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}

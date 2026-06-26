<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class IfuDocumentSource extends Model
{
    protected $table = 'tax_ifu_document_sources';

    protected $fillable = [
        'tax_configuration_id',
        'category',
        'base',
        'require_locked',
    ];

    protected $casts = [
        'require_locked' => 'boolean',
    ];

    protected $appends = ['document_codes'];

    public function taxConfiguration(): BelongsTo
    {
        return $this->belongsTo(TaxConfiguration::class);
    }

    public function codes(): HasMany
    {
        return $this->hasMany(IfuDocumentSourceCode::class, 'tax_ifu_document_source_id');
    }

    public function getDocumentCodesAttribute(): array
    {
        return $this->codes->pluck('document_code')->toArray();
    }
}

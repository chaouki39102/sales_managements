<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IfuDocumentSourceCode extends Model
{
    protected $table = 'tax_ifu_document_source_codes';

    protected $fillable = [
        'tax_ifu_document_source_id',
        'document_code',
    ];

    public function documentSource(): BelongsTo
    {
        return $this->belongsTo(IfuDocumentSource::class, 'tax_ifu_document_source_id');
    }
}

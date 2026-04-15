<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * DocumentPayment Pivot Model
 *
 * Table: document_payment
 * Many-to-many relationship between documents and payments
 */
class DocumentPayment extends Pivot
{
    protected $table = 'document_payment';

    protected $fillable = [
        'commercial_document_id',
        'payment_id',
        'amount_applied',
        'notes',
    ];

    protected $casts = [
        'amount_applied' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}

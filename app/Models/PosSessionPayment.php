<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSessionPayment extends Model
{
    protected $fillable = ['pos_session_id', 'payment_mode_id', 'amount', 'count'];
    protected $casts    = ['amount' => 'decimal:2'];

    public function paymentMode(): BelongsTo { return $this->belongsTo(PaymentMode::class); }
}

<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PosSessionProduct extends Model
{
    protected $fillable = ['pos_session_id', 'product_id', 'product_name', 'quantity_sold', 'total_ht', 'total_ttc'];
    protected $casts    = ['quantity_sold' => 'decimal:3', 'total_ht' => 'decimal:2', 'total_ttc' => 'decimal:2'];

    public function product(): BelongsTo { return $this->belongsTo(Product::class); }
}

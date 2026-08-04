<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * PortalOrderStatusHistory — سجلّ تتبع حالة طلب بوابة الزبائن.
 * كل تغيير حالة يضيف صفاً (changed_by = customer | admin).
 */
class PortalOrderStatusHistory extends Model
{
    protected $table = 'portal_order_status_histories';

    protected $fillable = [
        'portal_order_id',
        'status',
        'changed_by',
        'changed_by_name',
        'note',
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(PortalOrder::class, 'portal_order_id');
    }

    public function getStatusLabelAttribute(): string
    {
        return PortalOrder::statusLabelFor($this->status);
    }
}

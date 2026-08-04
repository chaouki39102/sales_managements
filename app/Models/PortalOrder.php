<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Models\Traits\HasCompany;

/**
 * PortalOrder — طلب من بوابة الزبائن (غلاف حالة/مرجع حول مستند تجاري).
 *
 * الأسعار والأسطر تعيش في commercial_documents / commercial_document_lines
 * المرتبط عبر commercial_document_id. هذا النموذج يحمل فقط المرجع + حالة دورة
 * الطلب + لقطات الإجماليات لعرض سريع في القوائم.
 */
class PortalOrder extends Model
{
    use HasCompany;
    use SoftDeletes;

    protected $table = 'portal_orders';

    protected $fillable = [
        'company_id',
        'party_id',
        'user_id',
        'commercial_document_id',
        'reference',
        'status',
        'notes',
        'total_ht',
        'total_tva',
        'total_ttc',
        'requested_at',
    ];

    protected $casts = [
        'total_ht'  => 'float',
        'total_tva' => 'float',
        'total_ttc' => 'float',
        'requested_at' => 'datetime',
    ];

    public const STATUS_PENDING    = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED  = 'completed';
    public const STATUS_CANCELLED  = 'cancelled';

    public const STATUSES = [
        self::STATUS_PENDING,
        self::STATUS_PROCESSING,
        self::STATUS_COMPLETED,
        self::STATUS_CANCELLED,
    ];

    public const STATUS_LABELS = [
        self::STATUS_PENDING    => 'قيد الانتظار',
        self::STATUS_PROCESSING => 'قيد التجهيز',
        self::STATUS_COMPLETED  => 'مكتمل',
        self::STATUS_CANCELLED  => 'ملغى',
    ];

    public const CHANGED_BY_CUSTOMER = 'customer';
    public const CHANGED_BY_ADMIN    = 'admin';

    public static function statusLabelFor(string $status): string
    {
        return self::STATUS_LABELS[$status] ?? $status;
    }

    public function getStatusLabelAttribute(): string
    {
        return self::statusLabelFor($this->status);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'commercial_document_id');
    }

    public function histories(): HasMany
    {
        return $this->hasMany(PortalOrderStatusHistory::class, 'portal_order_id');
    }
}

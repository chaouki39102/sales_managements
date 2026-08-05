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
        'sale_document_id',
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

    // حالات خاصة بطلبات الزبائن فقط (دورة طلب السلعة):
    //   قيد الاعداد → مؤكد → تم المعالجة → الشحن → تم التسليم → مرتجع
    // + «ملغى» كحالة استثنائية (إلغاء الطلب من الزبون أو من الإدارة).
    public const STATUS_PREPARING = 'preparing';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_PROCESSED = 'processed';
    public const STATUS_SHIPPED   = 'shipped';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_RETURNED  = 'returned';
    public const STATUS_CANCELLED = 'cancelled';

    // الحالات النهائية التي لا خروج منها: مرتجع + ملغى.
    // تم التسليم يسمح بالانتقال إلى مرتجع (إرجاع بعد التسليم).
    public const TERMINAL_STATUSES = [
        self::STATUS_RETURNED,
        self::STATUS_CANCELLED,
    ];

    public const STATUSES = [
        self::STATUS_PREPARING,
        self::STATUS_CONFIRMED,
        self::STATUS_PROCESSED,
        self::STATUS_SHIPPED,
        self::STATUS_DELIVERED,
        self::STATUS_RETURNED,
        self::STATUS_CANCELLED,
    ];

    // المسار الرئيسي لخط الأنابيب (الطريقة الاحترافية):
    //   قيد الاعداد → مؤكد → تم المعالجة → الشحن → تم التسليم
    // «مرتجع»/«ملغى» حالات جانبية خارج المسار — تُعرض كفرع للخط.
    public const PIPELINE = [
        self::STATUS_PREPARING,
        self::STATUS_CONFIRMED,
        self::STATUS_PROCESSED,
        self::STATUS_SHIPPED,
        self::STATUS_DELIVERED,
    ];

    /**
     * موضع الحالة ضمن خط الأنابيب الرئيسي (-1 = خارج المسار، مثل مرتجع/ملغى).
     */
    public static function pipelineIndex(string $status): int
    {
        return array_search($status, self::PIPELINE, true) === false
            ? -1
            : array_search($status, self::PIPELINE, true);
    }

    // 'pending' = حالة قديمة من نسخة سابقة من التطبيق (كانت هي الحالة الابتدائية
    // قبل إدخال «قيد الاعداد»). لا تُستخدم للطلبات الجديدة إطلاقاً، لكن بقيت صفوف
    // قديمة في قاعدة البيانات — نمنحها نفس التسمية لتُعرض بالعربية في السجل.
    public const LEGACY_PENDING = 'pending';

    public const STATUS_LABELS = [
        self::LEGACY_PENDING  => 'قيد الاعداد',
        self::STATUS_PREPARING => 'قيد الاعداد',
        self::STATUS_CONFIRMED => 'مؤكد',
        self::STATUS_PROCESSED => 'تم المعالجة',
        self::STATUS_SHIPPED   => 'الشحن',
        self::STATUS_DELIVERED => 'تم التسليم',
        self::STATUS_RETURNED  => 'مرتجع',
        self::STATUS_CANCELLED => 'ملغى',
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

    /**
     * المستند التجاري الناتج عن التحويل (FV/POS) — يُكتب مرة واحدة فقط
     * داخل معاملة التحويل. وجوده يعني أن الطلب حوّل بالفعل ولا يقبل تحويلاً ثانياً.
     */
    public function saleDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'sale_document_id');
    }

    public function getIsConvertedAttribute(): bool
    {
        return (bool) $this->sale_document_id;
    }

    public function histories(): HasMany
    {
        return $this->hasMany(PortalOrderStatusHistory::class, 'portal_order_id');
    }
}

<?php

namespace App\Models;

use App\Models\Traits\HasCompany;
use App\Core\Traits\HasStandardizedConfiguration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * مسجّل التدقيق المحسّن لأحداث المستندات التجارية.
 * يسجّل تفاصيل دقيقة (من غيّر أيّ سطر / أيّ مبلغ / أيّ حالة) بعكس
 * جدول audits العام الذي يسجّل تغييرات النماذج على مستوى عام.
 */
class DocumentAuditLog extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'document_audit_logs';

    protected $fillable = [
        'document_id',
        'company_id',
        'user_id',
        'action',
        'field_name',
        'old_value',
        'new_value',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /** قائمة أفعال التدقيق المقبولة (تطابق enum في المخطط) */
    public const ACTIONS = [
        'created',
        'updated',
        'line_added',
        'line_removed',
        'line_modified',
        'price_changed',
        'discount_changed',
        'status_changed',
        'locked',
        'unlocked',
        'cancelled',
        'deleted',
        'payment_added',
        'payment_removed',
        'converted',
        'returned',
        'cloned',
        'stock_override',
    ];

    public static array $searchableFields = ['action', 'field_name'];
    public static array $filterable = ['document_id', 'company_id', 'user_id', 'action'];
    public static array $sortable = ['id', 'created_at', 'action'];
    public static array $defaultWith = ['user'];
    public static array $allowedIncludes = ['user', 'document'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['document_audit_logs'];

    /** معرّف تسلسلي ضمني: كل حدث = رقمه */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function document(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'document_id');
    }

    /** التحقق من أن الفعل ضمن القائمة المعروفة */
    public static function isValidAction(string $action): bool
    {
        return in_array($action, self::ACTIONS, true);
    }
}
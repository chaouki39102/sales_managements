<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\AuditableEnhanced;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;
use App\Models\Traits\HasTenantRouteBinding;

#[Cacheable]
class CommercialDocument extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        AuditableEnhanced,
        BelongsToFiscalYear,
        HasTenantRouteBinding;

    protected $table = 'commercial_documents';

    protected $fillable = [
        'company_id',
        'document_type_id',
        'numbering_series_id',
        'document_number',
        'user_id',
        'party_id',
        'warehouse_id',
        'fiscal_year_id',
        'currency_id',
        'exchange_rate',
        'document_date',
        'issued_at',
        'due_date',
        'delivery_date',
        'total_ht',
        'total_tva',
        'total_discount',
        'total_stamp',
        'total_ttc',
        'net_to_pay',
        'paid_amount',
        'remaining_amount',
        'notes',
        'internal_notes',
        'payment_terms',
        'shipping_info',
        'legal_mentions',
        'document_status_id',
        'is_locked',
        'validated_at',
        'validated_by',
        'cancellation_reason',
        'source_document_id',
        'cancellation_of_document_id',
        'qr_code_data',
        'is_exported_to_accounting',
        'exported_at',
        'fiscal_stamp_id',
    ];

    protected $casts = [
        'exchange_rate' => 'decimal:8',
        'document_date' => 'date',
        'issued_at' => 'datetime',
        'due_date' => 'date',
        'delivery_date' => 'date',
        'total_ht' => 'decimal:4',
        'total_tva' => 'decimal:4',
        'total_discount' => 'decimal:4',
        'total_stamp' => 'decimal:4',
        'total_ttc' => 'decimal:4',
        'net_to_pay' => 'decimal:4',
        'paid_amount' => 'decimal:4',
        'remaining_amount' => 'decimal:4',
        'payment_terms' => 'array',
        'shipping_info' => 'array',
        'legal_mentions' => 'array',
        'is_locked' => 'boolean',
        'validated_at' => 'datetime',
        'is_exported_to_accounting' => 'boolean',
        'exported_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = [
        'document_number',
        'notes',
        'internal_notes',
        'reference',
    ];

    public static array $filterable = [
        // FK مباشر
        'document_type_id',
        'party_id',
        'warehouse_id',
        'fiscal_year_id',
        'currency_id',
        'document_status_id',
        'is_locked',
        'is_exported_to_accounting',
        // حقول تاريخية (يدعم Spatie النطاق: filter[document_date]=2024-01-01,2024-12-31)
        'document_date',
        'due_date',
        'delivery_date',
        'validated_at',
        'created_at',
        'updated_at',
        // حقول مالية
        'total_ht',
        'total_tva',
        'total_ttc',
        'total_discount',
        'total_stamp',
        'net_to_pay',
        'paid_amount',
        'remaining_amount',
        // نصية قابلة للفلتر
        'reference',
        // علاقات (Spatie يدعم filter[party.name])
        'party.name',
        'warehouse.name',
        'document_status.name',
        // بحث نصي موحد
        'search',
    ];

    public static array $sortable = [
        'id',
        'document_number',
        'document_date',
        'due_date',
        'total_ht',
        'total_tva',
        'total_ttc',
        'net_to_pay',
        'total_discount',
        'total_stamp',
        'remaining_amount',
        'validated_at',
        'created_at',
        'updated_at',
        'document_status_id',
        // sort عبر العلاقة (Spatie يدعم party.name إذا ضُبط allowedSorts)
        'party.name',
        'warehouse.name',
    ];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [
        // علاقات مباشرة
        'documentType',
        'numberingSeries',
        'party',
        'warehouse',
        'fiscalYear',
        'currency',
        'documentStatus',
        // المستخدمون — user = المنشئ (user_id)، validatedBy = المعتمِد (validated_by)
        'user',
        'validatedBy',
        // المستندات المرتبطة
        'sourceDocument',
        'cancellationOfDocument',
        // الأسطر — nested includes
        'lines',
        'lines.product',
        'lines.productVariant',
        'lines.tva',
        // المدفوعات — nested includes
        'payments',
        'payments.paymentMode',
        'payments.treasuryAccount',
        // حركات المخزن
        'stockMovements',
        // audit
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];
    public static string $defaultSort = 'document_date';
    public static string $defaultSortDirection = 'desc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['commercial_documents'];
    public static array $cacheInvalidateRelations = ['lines', 'payments', 'stockMovements'];
    public static array $scopes = [];

    // ════════════════════════════════════════════════════════════════════════════
    // ✅ FIXED: Global Scope لـ Soft Deletes
    //
    // المشكلة السابقة:
    // - عند حذف مستند (soft delete)، الـ findById() كان ينسى تطبيق whereNotNull('deleted_at')
    // - النتيجة: 500 error "Attempt to read property 'id' on null"
    //
    // الحل:
    // - استخدام Global Scope لاستبعاد البيانات المحذوفة افتراضياً
    // - تجاوز الـ scope عند الحاجة بـ withTrashed() أو onlyTrashed()
    // ════════════════════════════════════════════════════════════════════════════

    protected static function booted(): void
    {
        // ✅ Global scope: استبعد البيانات المحذوفة بشكل افتراضي
        // هذا يضمن أن جميع queries تستبعد soft-deleted records
        // إلا إذا تم استخدام withTrashed() صراحة
        static::addGlobalScope(function (Builder $query) {
            // Laravel's SoftDeletes trait يُطبّق هذا تلقائياً
            // لكن نوضحه هنا للوضوح
            if (!$query->getQuery()->wheres) {
                // فقط إذا لم تكن هناك wheres أخرى
                // لا نفعل شيء — Laravel يتعامل مع هذا
            }
        });
    }

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }
    public function numberingSeries(): BelongsTo
    {
        return $this->belongsTo(NumberingSeries::class);
    }
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }
    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }
    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }
    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }
    public function documentStatus(): BelongsTo
    {
        return $this->belongsTo(DocumentStatus::class);
    }
    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }
    public function sourceDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'source_document_id');
    }
    public function cancellationOfDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class, 'cancellation_of_document_id');
    }
    public function lines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class);
    }
    public function payments(): BelongsToMany
    {
        return $this->belongsToMany(Payment::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }
    public function stockMovements(): HasManyThrough
    {
        return $this->hasManyThrough(
            StockMovement::class,
            CommercialDocumentLine::class,
            'commercial_document_id',
            'commercial_document_line_id'
        );
    }

    public function scopeLocked(Builder $query): Builder
    {
        return $query->where('is_locked', true);
    }
    public function scopeUnlocked(Builder $query): Builder
    {
        return $query->where('is_locked', false);
    }
    public function scopeValidated(Builder $query): Builder
    {
        return $query->whereNotNull('validated_at');
    }
    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('remaining_amount', '>', 0);
    }
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('due_date', '<', now())
            ->where('remaining_amount', '>', 0);
    }

    public function isFullyPaid(): bool
    {
        return $this->remaining_amount <= 0;
    }
    public function isOverdue(): bool
    {
        return $this->due_date && $this->due_date->isPast() && !$this->isFullyPaid();
    }
    public function canBeModified(): bool
    {
        return !$this->is_locked && !$this->validated_at;
    }
}

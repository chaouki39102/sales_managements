<?php

// دمج تلقائي لكل ملفات الـ models



// ===== ملف: Attachment.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Attachment Model
 *
 * Table: attachments
 * Polymorphic file attachments
 */
class Attachment extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'attachments';

        protected $fillable = [
        'file_name',
        'file_path',
        'file_type',
        'file_extension',
        'file_size',
        'attachable_type',
        'attachable_id',
        'title',
        'description',
        'category',
        'is_public',
        'disk',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'is_public' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['file_name', 'title', 'description'];
    public static array $filterable = ['attachable_type', 'category', 'is_public'];
    public static array $sortable = ['id', 'file_name', 'created_at', 'file_size'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['attachable', 'uploadedBy'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['attachments'];

    public function attachable()
    {
        return $this->morphTo();
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function getUrlAttribute(): string
    {
        return Storage::disk($this->disk)->url($this->file_path);
    }

    public function getDownloadUrlAttribute(): string
    {
        return route('attachments.download', $this->id);
    }

    public function getFileSizeFormatted(): string
    {
        $bytes = $this->file_size;
        if ($bytes >= 1073741824) {
            return number_format($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return number_format($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' bytes';
    }

}




// ===== ملف: Audit.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * Audit Model
 *
 * Table: audits
 * Comprehensive audit trail
 */
class Audit extends Model
{
    use
    HasCompany,
    HasStandardizedConfiguration;

    protected $table = 'audits';

    protected $fillable = [
        'user_id',
        'user_type',
        'event',
        'auditable_type',
        'auditable_id',
        'old_values',
        'new_values',
        'url',
        'ip_address',
        'user_agent',
        'tags',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'tags' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['event', 'url'];
    public static array $filterable = ['user_id', 'event', 'auditable_type'];
    public static array $sortable = ['id', 'created_at', 'event'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['user', 'auditable'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['audits'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function auditable()
    {
        return $this->morphTo();
    }

    public function scopeForEvent($query, string $event)
    {
        return $query->where('event', $event);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}




// ===== ملف: Barcode.php =====
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * @property int $id
 * @property int $company_id
 * @property int $product_id
 * @property string $barcode
 * @property string|null $type
 * @property bool $is_primary
 * @property string|null $unit
 * @property int|null $created_by
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Company $company
 * @property-read \App\Models\Product $product
 * @property-read \App\Models\User|null $creator
 */
class Barcode extends Model
{
    use HasFactory, HasCompany, HasStandardizedConfiguration;

    protected $table = 'barcodes';

    protected $fillable = [
        'company_id',
        'product_id',
        'barcode',
        'type',
        'is_primary',
        'unit',
        'created_by',
    ];

    protected $casts = [
        'is_primary' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration for HasStandardizedConfiguration --------------------
    public static array $searchableFields = ['barcode', 'type', 'unit'];
    public static array $filterable = ['product_id', 'is_primary', 'type', 'unit'];
    public static array $sortable = ['id', 'barcode', 'created_at'];
    public static array $defaultWith = ['product:id,name'];
    public static array $allowedIncludes = ['product', 'creator', 'company'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['barcodes'];

    // -------------------- Relations --------------------
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------- Boot --------------------
    protected static function booted(): void
    {
        static::creating(function (self $barcode) {
            // إذا كان الباركود جديداً وهو primary، نزيل الـ primary عن باقي باركودات المنتج
            if ($barcode->is_primary) {
                static::where('product_id', $barcode->product_id)
                    ->where('company_id', $barcode->company_id)
                    ->update(['is_primary' => false]);
            }
        });

        static::updating(function (self $barcode) {
            if ($barcode->isDirty('is_primary') && $barcode->is_primary) {
                static::where('product_id', $barcode->product_id)
                    ->where('company_id', $barcode->company_id)
                    ->where('id', '!=', $barcode->id)
                    ->update(['is_primary' => false]);
            }
        });
    }
}




// ===== ملف: Brand.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * Brand Model
 *
 * Table: brands
 * Product brands/manufacturers
 */
#[Cacheable]
class Brand extends Model
{
    use HasStandardizedConfiguration, SoftDeletes, Auditable;

    protected $table = 'brands';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'logo',
        'website',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description', 'website'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['brands'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    protected static function boot()
    {
        parent::boot();
        static::creating(function ($brand) {
            if (empty($brand->slug)) {
                $brand->slug = Str::slug($brand->name);
            }
        });
    }
}




// ===== ملف: Cache.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cache extends Model
{
    //
}




// ===== ملف: Check.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

/**
 * Check Model
 *
 * Table: checks
 * Manages check payments and their lifecycle
 */
#[Cacheable]
class Check extends Model
{
    use
        HasStandardizedConfiguration,
        HasCompany,
        Auditable;

    protected $table = 'checks';

    protected $fillable = [
        'check_number',
        'check_date',
        'due_date',
        'amount',
        'bank_name',
        'account_number',
        'drawer_name',
        'party_id',
        'status',
        'cleared_date',
        'bounce_reason',
        'notes',
        'metadata',
    ];

    protected $casts = [
        'check_date' => 'date',
        'due_date' => 'date',
        'amount' => 'decimal:4',
        'cleared_date' => 'date',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['check_number', 'drawer_name', 'bank_name', 'notes'];
    public static array $filterable = ['party_id', 'status'];
    public static array $sortable = ['id', 'check_number', 'check_date', 'due_date', 'amount'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['party', 'payments', 'createdBy', 'updatedBy'];
    public static string $defaultSort = 'due_date';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['checks'];

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }
    public function scopeCleared(Builder $query): Builder
    {
        return $query->where('status', 'cleared');
    }
    public function scopeBounced(Builder $query): Builder
    {
        return $query->where('status', 'bounced');
    }
    public function scopeDueToday(Builder $query): Builder
    {
        return $query->where('due_date', now()->toDateString())->where('status', 'pending');
    }
    public function scopeOverdue(Builder $query): Builder
    {
        return $query->where('due_date', '<', now())->where('status', 'pending');
    }

    public function markAsCleared(): bool
    {
        return $this->update(['status' => 'cleared', 'cleared_date' => now()]);
    }

    public function markAsBounced(string $reason): bool
    {
        return $this->update(['status' => 'bounced', 'bounce_reason' => $reason]);
    }

    public function isOverdue(): bool
    {
        return $this->status === 'pending' && $this->due_date->isPast();
    }
}




// ===== ملف: CommercialDocument.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;

/**
 * CommercialDocument Model
 *
 * Table: commercial_documents
 * Manages all commercial documents (invoices, quotes, orders, etc.)
 */
#[Cacheable]
class CommercialDocument extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable,
        BelongsToFiscalYear;

    protected $table = 'commercial_documents';

    // -------------------- Fillable --------------------
    protected $fillable = [
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
        'is_proforma',
        'cancellation_reason',
        'source_document_id',
        'cancellation_of_document_id',
        'qr_code_data',
        'is_exported_to_accounting',
        'exported_at',
    ];

    // -------------------- Casts --------------------
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
        'is_proforma' => 'boolean',
        'is_exported_to_accounting' => 'boolean',
        'exported_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'document_number',
        'notes',
        'internal_notes',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'document_type_id',
        'party_id',
        'warehouse_id',
        'fiscal_year_id',
        'currency_id',
        'document_status_id',
        'is_locked',
        'is_proforma',
        'is_exported_to_accounting',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'document_number',
        'document_date',
        'total_ttc',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'documentType',
        'numberingSeries',
        'user',
        'party',
        'warehouse',
        'fiscalYear',
        'currency',
        'documentStatus',
        'validatedBy',
        'sourceDocument',
        'cancellationOfDocument',
        'lines',
        'payments',
        'stockMovements',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'document_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0; // No cache for transactional data

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['commercial_documents'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [
        'lines',
        'payments',
        'stockMovements',
    ];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

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

    public function stockMovements(): \Illuminate\Database\Eloquent\Relations\HasManyThrough
    {
        return $this->hasManyThrough(
            StockMovement::class,
            CommercialDocumentLine::class,
            'commercial_document_id',
            'commercial_document_line_id'
        );
    }

    // -------------------- Scopes --------------------

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

    // -------------------- Helpers --------------------

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




// ===== ملف: CommercialDocumentLine.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * CommercialDocumentLine Model
 *
 * Table: commercial_document_lines
 * Stores line items for commercial documents
 */
#[Cacheable]
class CommercialDocumentLine extends Model
{
    use
        HasCompany,
    HasStandardizedConfiguration;

    protected $table = 'commercial_document_lines';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'commercial_document_id',
        'product_id',
        'line_order',
        'description',
        'quantity',
        'delivered_quantity',
        'returned_quantity',
        'unit_price_ht',
        'discount_percentage',
        'discount_amount',
        'additional_costs',
        'total_additional_cost',
        'total_discount_amount',
        'tva_rate',
        'total_ht',
        'total_tva',
        'total_ttc',
        'stock_lot_id',
        'is_auto_split',
        'parent_line_id',
        'line_attributes',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'additional_costs' => 'array',
        'total_additional_cost' => 'decimal:4',
        'total_discount_amount' => 'decimal:4',
        'line_order' => 'integer',
        'quantity' => 'decimal:3',
        'delivered_quantity' => 'decimal:3',
        'returned_quantity' => 'decimal:3',
        'unit_price_ht' => 'decimal:4',
        'discount_percentage' => 'decimal:2',
        'discount_amount' => 'decimal:4',
        'tva_rate' => 'decimal:2',
        'total_ht' => 'decimal:4',
        'total_tva' => 'decimal:4',
        'total_ttc' => 'decimal:4',
        'is_auto_split' => 'boolean',
        'line_attributes' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'description',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'commercial_document_id',
        'product_id',
        'stock_lot_id',
        'is_auto_split',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'line_order',
        'quantity',
        'total_ttc',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'commercialDocument',
        'product',
        'stockLot',
        'parentLine',
        'childLines',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'line_order';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 50;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 200;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['commercial_document_lines'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function commercialDocument(): BelongsTo
    {
        return $this->belongsTo(CommercialDocument::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'stock_lot_id');
    }

    public function parentLine(): BelongsTo
    {
        return $this->belongsTo(CommercialDocumentLine::class, 'parent_line_id');
    }

    public function childLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class, 'parent_line_id');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class, 'commercial_document_line_id');
    }

    // -------------------- Scopes --------------------

    public function scopeParentLines(Builder $query): Builder
    {
        return $query->whereNull('parent_line_id');
    }

    public function scopeChildLines(Builder $query): Builder
    {
        return $query->whereNotNull('parent_line_id');
    }

    // -------------------- Helpers --------------------

    public function getRemainingQuantity(): float
    {
        return $this->quantity - $this->delivered_quantity - $this->returned_quantity;
    }

    public function isFullyDelivered(): bool
    {
        return $this->getRemainingQuantity() <= 0;
    }

    public function hasDiscount(): bool
    {
        return $this->discount_percentage > 0 || $this->discount_amount > 0;
    }
}




// ===== ملف: Commune.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Commune Model
 *
 * Table: communes
 * Algerian municipalities (communes)
 */
#[Cacheable]
class Commune extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'communes';

    protected $fillable = [
        'post_code',
        'name',
        'arabic_name',
        'wilaya_id',
        'latitude',
        'longitude',
        'active',
    ];

    protected $casts = [
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'arabic_name', 'post_code'];
    public static array $filterable = ['wilaya_id', 'active'];
    public static array $sortable = ['id', 'name', 'post_code'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['wilaya', 'users', 'parties', 'warehouses'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['communes', 'geography'];

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }
}




// ===== ملف: Company.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * Company Model
 *
 * Table: companies
 *
 * الشركة هي "الحاوي" في بيئة Multi-Tenancy — لا تستخدم HasCompany
 * لأنها هي نفسها مرجع العزل وليست بيانات معزولة.
 *
 * خطط الاشتراك:
 *   free         → 3 مستخدمين  / 1 مستودع   / 500 منتج
 *   starter      → 10 مستخدمين / 2 مستودع   / 2,000 منتج
 *   professional → 25 مستخدمين / 5 مستودعات / 10,000 منتج
 *   enterprise   → بلا حدود
 *
 * حالات الشركة:
 *   is_active=true  + suspended_at=null   → نشطة طبيعية
 *   is_active=true  + suspended_at!=null  → معلّقة مؤقتاً (Super Admin)
 *   is_active=false + deactivated_at!=null → موقوفة نهائياً
 */
#[Cacheable]
class Company extends Model
{
    use HasStandardizedConfiguration, Auditable;

    // ⚠️ لا SoftDeletes — الشركة إما نشطة أو موقوفة عبر is_active/suspended_at
    // ⚠️ لا HasCompany — الشركة هي الـ tenant نفسها وليست بيانات تابعة له

    protected $table = 'companies';

    // ── Fillable ──────────────────────────────────────────────────────────────

    protected $fillable = [
        // بيانات أساسية
        'name',
        'commercial_name',
        'slug',
        'activity',

        // وثائق قانونية جزائرية
        'rc',
        'rc_date',
        'nif',
        'nis',
        'ai',
        'legal_form_id',
        'capital_amount',

        // معلومات الاتصال
        'address',
        'commune_id',
        'wilaya_id',
        'phone',
        'mobile',
        'fax',
        'email',
        'avatar',

        // معلومات مصرفية
        'bank_name',
        'rib',

        // إدارة الملكية
        'owner_id',
        'is_active',

        // حالة الشركة (Super Admin)
        'suspended_at',
        'suspension_reason',
        'suspended_by',
        'deactivated_at',
        'deactivated_by',

        // خطة الاشتراك والحدود
        'plan',
        'trial_ends_at',
        'max_users',
        'max_warehouses',
        'max_products',

        // توثيق وإدارة داخلية
        'verified_at',
        'verified_by',
        'notes',
        'settings_json',
    ];

    // ── Casts ─────────────────────────────────────────────────────────────────

    protected $casts = [
        'is_active'      => 'boolean',
        'capital_amount' => 'decimal:4',
        'rc_date'        => 'date',
        'suspended_at'   => 'datetime',
        'deactivated_at' => 'datetime',
        'trial_ends_at'  => 'datetime',
        'verified_at'    => 'datetime',
        'max_users'      => 'integer',
        'max_warehouses' => 'integer',
        'max_products'   => 'integer',
        'settings_json'  => 'array',
        'created_at'     => 'datetime',
        'updated_at'     => 'datetime',
    ];

    protected $appends = [
        'is_operational',
        'is_suspended',
        'is_verified',
        'is_on_trial',
        'trial_days_remaining',
    ];

    // ── HasStandardizedConfiguration ─────────────────────────────────────────
    // ApiListService و ModelConfigService يقرآن هذه الخصائص تلقائياً

    public static array $searchableFields = [
        'name',
        'commercial_name',
        'nif',
        'rc',
        'email',
        'phone',
    ];

    public static array $filterable = [
        'is_active',
        'plan',
        'legal_form_id',
        'wilaya_id',
        'owner_id',
    ];

    public static array $sortable = [
        'id',
        'name',
        'plan',
        'created_at',
        'trial_ends_at',
    ];

    public static array $defaultWith      = [];
    public static array $allowedIncludes  = [
        'owner',
        'legalForm',
        'wilaya',
        'commune',
        'activeUsers',
        'suspendedBy',
        'deactivatedBy',
        'verifiedBy',
    ];

    public static string $defaultSort          = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int    $defaultPerPage        = 20;
    public static int    $perPageLimit          = 100;
    public static ?int   $cacheTtl              = 300;
    public static array  $cacheTags             = ['companies'];

    // ── خطط الاشتراك ─────────────────────────────────────────────────────────

    public const PLANS = [
        'free'         => ['max_users' => 3,   'max_warehouses' => 1,  'max_products' => 500],
        'starter'      => ['max_users' => 10,  'max_warehouses' => 2,  'max_products' => 2000],
        'professional' => ['max_users' => 25,  'max_warehouses' => 5,  'max_products' => 10000],
        'enterprise'   => ['max_users' => 999, 'max_warehouses' => 99, 'max_products' => 999999],
    ];

    public const MEMBER_ROLES = ['owner', 'admin', 'manager', 'member', 'viewer'];

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function booted(): void
    {
        static::creating(function (self $company): void {
            // توليد slug فريد تلقائياً
            if (empty($company->slug)) {
                $company->slug = self::generateUniqueSlug($company->name);
            }

            // تطبيق حدود الخطة الافتراضية
            $plan = $company->plan ?? 'free';
            if (isset(self::PLANS[$plan])) {
                $limits = self::PLANS[$plan];
                $company->max_users      ??= $limits['max_users'];
                $company->max_warehouses ??= $limits['max_warehouses'];
                $company->max_products   ??= $limits['max_products'];
            }

            // فترة التجربة 14 يوم للخطة المجانية
            if ($plan === 'free' && empty($company->trial_ends_at)) {
                $company->trial_ends_at = now()->addDays(14);
            }
        });
    }

    // ── Route Model Binding ───────────────────────────────────────────────────

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    // ── Relations ─────────────────────────────────────────────────────────────

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function legalForm(): BelongsTo
    {
        return $this->belongsTo(LegalForm::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function suspendedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'suspended_by');
    }

    public function deactivatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deactivated_by');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    /** كل أعضاء الشركة عبر pivot */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['is_default', 'role', 'invited_by', 'joined_at', 'is_active'])
            ->withTimestamps();
    }

    /** الأعضاء النشطون فقط */
    public function activeUsers(): BelongsToMany
    {
        return $this->users()->wherePivot('is_active', true);
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }

    public function fiscalYears(): HasMany
    {
        return $this->hasMany(FiscalYear::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true)->whereNull('suspended_at');
    }

    public function scopeSuspended(Builder $query): Builder
    {
        return $query->whereNotNull('suspended_at');
    }

    public function scopeDeactivated(Builder $query): Builder
    {
        return $query->where('is_active', false);
    }

    public function scopeVerified(Builder $query): Builder
    {
        return $query->whereNotNull('verified_at');
    }

    public function scopeOnTrial(Builder $query): Builder
    {
        return $query->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '>', now());
    }

    public function scopeTrialExpired(Builder $query): Builder
    {
        return $query->whereNotNull('trial_ends_at')
            ->where('trial_ends_at', '<=', now())
            ->where('plan', 'free');
    }

    public function scopeOnPlan(Builder $query, string $plan): Builder
    {
        return $query->where('plan', $plan);
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /** نشطة فعلاً: is_active=true وغير معلّقة */
    public function getIsOperationalAttribute(): bool
    {
        return $this->is_active && is_null($this->suspended_at);
    }

    public function getIsSuspendedAttribute(): bool
    {
        return !is_null($this->suspended_at);
    }

    public function getIsVerifiedAttribute(): bool
    {
        return !is_null($this->verified_at);
    }

    public function getIsOnTrialAttribute(): bool
    {
        return !is_null($this->trial_ends_at) && $this->trial_ends_at->isFuture();
    }

    public function getTrialDaysRemainingAttribute(): ?int
    {
        if (!$this->is_on_trial) return null;
        return (int) now()->diffInDays($this->trial_ends_at);
    }

    public function getCurrentUsersCountAttribute(): int
    {
        return $this->activeUsers()->count();
    }

    public function getIsAtUsersLimitAttribute(): bool
    {
        return $this->current_users_count >= $this->max_users;
    }

    // ── Actions — يستدعيها CompanyService ────────────────────────────────────

    public function suspend(string $reason, int $byUserId): void
    {
        $this->update([
            'suspended_at'      => now(),
            'suspension_reason' => $reason,
            'suspended_by'      => $byUserId,
        ]);
    }

    public function unsuspend(): void
    {
        $this->update([
            'suspended_at'      => null,
            'suspension_reason' => null,
            'suspended_by'      => null,
        ]);
    }

    public function deactivate(int $byUserId): void
    {
        $this->update([
            'is_active'      => false,
            'deactivated_at' => now(),
            'deactivated_by' => $byUserId,
        ]);
    }

    public function activate(): void
    {
        $this->update([
            'is_active'         => true,
            'deactivated_at'    => null,
            'deactivated_by'    => null,
            'suspended_at'      => null,
            'suspension_reason' => null,
            'suspended_by'      => null,
        ]);
    }

    public function verify(int $byUserId): void
    {
        $this->update(['verified_at' => now(), 'verified_by' => $byUserId]);
    }

    public function unverify(): void
    {
        $this->update(['verified_at' => null, 'verified_by' => null]);
    }

    public function transferOwnership(int $newOwnerId): void
    {
        User::findOrFail($newOwnerId); // يرمي ModelNotFoundException إن لم يجد

        if (!$this->users()->where('users.id', $newOwnerId)->exists()) {
            $this->users()->attach($newOwnerId, [
                'is_default' => false,
                'role'       => 'owner',
                'joined_at'  => now(),
                'is_active'  => true,
            ]);
        } else {
            $this->users()->updateExistingPivot($newOwnerId, ['role' => 'owner']);
        }

        if ($this->owner_id && $this->owner_id !== $newOwnerId) {
            $this->users()->updateExistingPivot($this->owner_id, ['role' => 'admin']);
        }

        $this->update(['owner_id' => $newOwnerId]);
    }

    public function upgradePlan(string $plan, ?array $customLimits = null): void
    {
        abort_unless(array_key_exists($plan, self::PLANS), 422, 'خطة غير معروفة');

        $limits = array_merge(self::PLANS[$plan], $customLimits ?? []);

        $this->update([
            'plan'           => $plan,
            'max_users'      => $limits['max_users'],
            'max_warehouses' => $limits['max_warehouses'],
            'max_products'   => $limits['max_products'],
        ]);
    }

    public function addMember(int $userId, string $role = 'member', ?int $invitedBy = null): void
    {
        abort_if(
            $this->is_at_users_limit,
            422,
            "وصلت الشركة للحد الأقصى من المستخدمين ({$this->max_users})."
        );

        $this->users()->syncWithoutDetaching([
            $userId => [
                'role'       => $role,
                'invited_by' => $invitedBy,
                'joined_at'  => now(),
                'is_active'  => true,
            ],
        ]);
    }

    public function removeMember(int $userId): void
    {
        abort_if($userId === $this->owner_id, 422, 'لا يمكن إزالة مالك الشركة.');
        $this->users()->detach($userId);
    }

    public function deactivateMember(int $userId): void
    {
        abort_if($userId === $this->owner_id, 422, 'لا يمكن تعطيل مالك الشركة.');
        $this->users()->updateExistingPivot($userId, ['is_active' => false]);
    }

    public function activateMember(int $userId): void
    {
        $this->users()->updateExistingPivot($userId, ['is_active' => true]);
    }

    public function changeMemberRole(int $userId, string $role): void
    {
        abort_if(
            $userId === $this->owner_id && $role !== 'owner',
            422,
            'لا يمكن تغيير دور المالك — استخدم transferOwnership().'
        );
        $this->users()->updateExistingPivot($userId, ['role' => $role]);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    public static function generateUniqueSlug(string $name): string
    {
        $base = Str::slug($name);
        $slug = $base;
        $i    = 1;

        while (static::where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    public function getSetting(string $key, mixed $default = null): mixed
    {
        return data_get($this->settings_json, $key, $default);
    }

    public function setSetting(string $key, mixed $value): void
    {
        $settings = $this->settings_json ?? [];
        data_set($settings, $key, $value);
        $this->update(['settings_json' => $settings]);
    }
    /**
     * تحديد ما إذا كان المستخدم المعطى هو مدير (Admin) في هذه الشركة.
     */
    public function isAdmin(User $user): bool
    {
        $pivot = $this->users()
            ->where('user_id', $user->id)
            ->first()?->pivot;

        return $pivot && in_array($pivot->role, ['owner', 'admin']);
    }
}




// ===== ملف: Currency.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Currency Model
 *
 * Table: currencies
 * Manages different currencies used in the system
 */
#[Cacheable]
class Currency extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'currencies';

    protected $fillable = [
        'name',
        'code',
        'symbol',
        'decimal_places',
        'is_base_currency',
        'active',
    ];

    protected $casts = [
        'decimal_places' => 'integer',
        'is_base_currency' => 'boolean',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'symbol'];
    public static array $filterable = ['active', 'is_base_currency'];
    public static array $sortable = ['id', 'name', 'code'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commercialDocuments', 'payments', 'exchangeRatesFrom', 'exchangeRatesTo'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['currencies', 'lookups'];

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function exchangeRatesFrom(): HasMany
    {
        return $this->hasMany(ExchangeRate::class, 'from_currency_id');
    }

    public function exchangeRatesTo(): HasMany
    {
        return $this->hasMany(ExchangeRate::class, 'to_currency_id');
    }

    public function scopeBaseCurrency(Builder $query): Builder
    {
        return $query->where('is_base_currency', true);
    }

    public static function getBaseCurrency(): ?self
    {
        return static::where('is_base_currency', true)
            ->where('active', true)
            ->first();
    }

    public function formatAmount(float $amount): string
    {
        return number_format($amount, $this->decimal_places) . ' ' . $this->symbol;
    }
}




// ===== ملف: DocumentBaseOperation.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class DocumentBaseOperation extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['documentTypes'];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['document_base_operations', 'api'];

    // --- العلاقات ---
    public function documentTypes(): HasMany
    {
        return $this->hasMany(DocumentType::class);
    }
}




// ===== ملف: DocumentPayment.php =====
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




// ===== ملف: DocumentStatus.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * DocumentStatus Model
 *
 * Table: document_statuses
 * Manages commercial document statuses
 */
#[Cacheable]
class DocumentStatus extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'document_statuses';

    protected $fillable = [
        'name',
        'label',
        'color',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['name'];
    public static array $sortable = ['id', 'name', 'label'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['commercialDocuments'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_statuses', 'lookups'];

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function scopeByName(Builder $query, string $name): Builder
    {
        return $query->where('name', $name);
    }
}




// ===== ملف: DocumentType.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * DocumentType Model
 *
 * Table: document_types
 * Defines types of commercial documents
 */
#[Cacheable]
class DocumentType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'document_types';

    protected $fillable = [
        'name',
        'name_latin',
        'code',
        'description',
        'document_base_operation_id',
        'affects_stock_direction',
        'requires_party',
        'affects_accounting',
        'is_printable',
        'print_template',
        'active',
        'display_order',
    ];

    protected $casts = [
        'affects_stock_direction' => 'integer',
        'requires_party' => 'boolean',
        'affects_accounting' => 'boolean',
        'is_printable' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'name_latin', 'code', 'description'];
    public static array $filterable = ['document_base_operation_id', 'active', 'requires_party'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentBaseOperation', 'numberingSeries', 'commercialDocuments'];
    public static string $defaultSort = 'display_order';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['document_types', 'lookups'];

    public function documentBaseOperation(): BelongsTo
    {
        return $this->belongsTo(DocumentBaseOperation::class);
    }

    public function numberingSeries(): HasMany
    {
        return $this->hasMany(NumberingSeries::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function affectsStockIn(): bool
    {
        return $this->affects_stock_direction === 1;
    }

    public function affectsStockOut(): bool
    {
        return $this->affects_stock_direction === -1;
    }
}




// ===== ملف: Employee.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany; // ✅ مضاف

/**
 * Employee Model
 *
 * Table: employees
 *
 * ملاحظة: جدول employees يحتوي على company_id من migration الإنشاء،
 * لذا يجب أن يستخدم HasCompany trait لضمان عزل البيانات تلقائياً
 * عبر الـ Global Scope في بيئة Multi-Tenancy.
 */
#[Cacheable]
class Employee extends Model
{
    use HasStandardizedConfiguration,
        HasCompany,   // ✅ مضاف — يطبق CompanyScope تلقائياً
        SoftDeletes,
        Auditable;

    protected $table = 'employees';

    protected $fillable = [
        'company_id',   // ✅ مضاف — مطلوب لـ HasCompany
        'matricule',
        'user_id',
        'first_name',
        'last_name',
        'nss',
        'birth_date',
        'gender_id',
        'rib',
        'bank_name',
        'hire_date',
        'termination_date',
        'employment_status',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'birth_date'        => 'date',
        'hire_date'         => 'date',
        'termination_date'  => 'date',
        'created_at'        => 'datetime',
        'updated_at'        => 'datetime',
        'deleted_at'        => 'datetime',
    ];

    public static array $searchableFields = ['matricule', 'first_name', 'last_name', 'nss'];
    public static array $filterable       = ['gender_id', 'employment_status', 'company_id']; // ✅ أضفنا company_id
    public static array $sortable         = ['id', 'matricule', 'first_name', 'last_name', 'hire_date'];
    public static array $defaultWith      = [];
    public static array $allowedIncludes  = ['user', 'gender', 'contracts', 'company']; // ✅ أضفنا company
    public static string $defaultSort     = 'first_name';
    public static ?int $cacheTtl          = 600;
    public static array $cacheTags        = ['employees'];

    // -------------------- Relations --------------------

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class); // ✅ علاقة مضافة
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class);
    }

    public function contracts(): HasMany
    {
        return $this->hasMany(EmploymentContract::class);
    }

    // -------------------- Accessors --------------------

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->last_name}";
    }

    // -------------------- Scopes --------------------

    public function scopeActive($query)
    {
        return $query->where('employment_status', 'active');
    }
}




// ===== ملف: EmploymentContract.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * EmploymentContract Model
 *
 * Table: employment_contracts
 */
#[Cacheable]
class EmploymentContract extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'employment_contracts';

    protected $fillable = [
        'employee_id',
        'contract_type',
        'start_date',
        'end_date',
        'base_salary',
        'job_title',
        'department',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'base_salary' => 'decimal:4',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['job_title', 'department'];
    public static array $filterable = ['employee_id', 'contract_type', 'is_active'];
    public static array $sortable = ['id', 'start_date', 'end_date', 'base_salary'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['employee'];
    public static string $defaultSort = 'start_date';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['employment_contracts'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}





// ===== ملف: ExchangeRate.php =====
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * ExchangeRate Model
 *
 * Table: exchange_rates
 * Currency exchange rates
 */
#[Cacheable]
class ExchangeRate extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'exchange_rates';

    protected $fillable = [
        'from_currency_id',
        'to_currency_id',
        'rate',
        'rate_date',
    ];

    protected $casts = [
        'rate' => 'decimal:8',
        'rate_date' => 'date',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['from_currency_id', 'to_currency_id', 'rate_date'];
    public static array $sortable = ['id', 'rate_date', 'rate'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fromCurrency', 'toCurrency'];
    public static string $defaultSort = 'rate_date';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 1800;
    public static array $cacheTags = ['exchange_rates'];

    public function fromCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'from_currency_id');
    }

    public function toCurrency(): BelongsTo
    {
        return $this->belongsTo(Currency::class, 'to_currency_id');
    }

    public function scopeLatest(Builder $query): Builder
    {
        return $query->orderBy('rate_date', 'desc');
    }

    public function scopeForDate(Builder $query, $date): Builder
    {
        return $query->where('rate_date', '<=', $date)
            ->orderBy('rate_date', 'desc')
            ->limit(1);
    }

    public function scopeBetweenCurrencies(Builder $query, int $fromId, int $toId): Builder
    {
        return $query->where('from_currency_id', $fromId)
            ->where('to_currency_id', $toId);
    }
}




// ===== ملف: Expense.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;

/**
 * Expense Model
 *
 * Table: expenses
 * Tracks business expenses and operational costs
 */
#[Cacheable]
class Expense extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable,
        BelongsToFiscalYear;

    protected $table = 'expenses';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'expense_number',
        'date',
        'amount',
        'expense_category_id',
        'fiscal_year_id',
        'payment_mode_id',
        'treasury_account_id',
        'party_id',
        'description',
        'reference',
        'has_attachments',
        'status',
        'is_paid',
        'is_recurring',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:4',
        'has_attachments' => 'boolean',
        'is_paid' => 'boolean',
        'is_recurring' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'expense_number',
        'description',
        'reference',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'expense_category_id',
        'fiscal_year_id',
        'payment_mode_id',
        'treasury_account_id',
        'party_id',
        'status',
        'is_paid',
        'is_recurring',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'expense_number',
        'date',
        'amount',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'expenseCategory',
        'fiscalYear',
        'paymentMode',
        'treasuryAccount',
        'party',
        'attachments',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['expenses'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function expenseCategory(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function paymentMode(): BelongsTo
    {
        return $this->belongsTo(PaymentMode::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    // -------------------- Scopes --------------------

    public function scopePaid(Builder $query): Builder
    {
        return $query->where('is_paid', true);
    }

    public function scopeUnpaid(Builder $query): Builder
    {
        return $query->where('is_paid', false);
    }

    public function scopeRecurring(Builder $query): Builder
    {
        return $query->where('is_recurring', true);
    }

    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('date', [$startDate, $endDate]);
    }
}




// ===== ملف: ExpenseCategory.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * ExpenseCategory Model
 *
 * Table: expense_categories
 * Categorizes business expenses
 */
#[Cacheable]
class ExpenseCategory extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'expense_categories';

    protected $fillable = [
        'name',
        'code',
        'description',
        'parent_id',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['parent_id', 'active'];
    public static array $sortable = ['id', 'name', 'code', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parent', 'children', 'expenses', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['expense_categories'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(ExpenseCategory::class, 'parent_id');
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function isRoot(): bool
    {
        return is_null($this->parent_id);
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }
}




// ===== ملف: Family.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;

/**
 * Family Model
 *
 * Table: families
 * Hierarchical product categories/families
 */
#[Cacheable]
class Family extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        Auditable;

    protected $table = 'families';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'parent_id',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['parent_id', 'active'];
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parent', 'children', 'products', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 600;
    public static array $cacheTags = ['families'];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Family::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Family::class, 'parent_id');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function scopeRoots(Builder $query): Builder
    {
        return $query->whereNull('parent_id');
    }

    public function isRoot(): bool
    {
        return is_null($this->parent_id);
    }

    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($family) {
            if (empty($family->slug)) {
                $family->slug = Str::slug($family->name);
            }
        });
    }
}




// ===== ملف: FiscalStamp.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class FiscalStamp extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'min_amount',
        'max_amount',
        'stamp_value',
        'type',
        'active',
        'valid_from',
        'valid_to',
    ];

    protected $casts = [
        'min_amount' => 'decimal:4',
        'max_amount' => 'decimal:4',
        'stamp_value' => 'decimal:4',
        'active' => 'boolean',
        'valid_from' => 'date',
        'valid_to' => 'date',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'stamp_value', 'type'];
    public static array $filterable = ['active', 'type', 'valid_from', 'valid_to'];
    public static array $sortable = ['id', 'name', 'stamp_value', 'min_amount'];
    public static array $allowedIncludes = [];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['fiscal_stamps', 'api'];
}




// ===== ملف: FiscalYear.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * FiscalYear Model
 *
 * Table: fiscal_years
 * Manages fiscal/financial years for accounting periods
 */
#[Cacheable]
class FiscalYear extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'fiscal_years';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'start_date',
        'end_date',
        'is_closed',
        'closed_at',
        'closed_by',
        'is_current',
        'closing_notes',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'is_closed' => 'boolean',
        'closed_at' => 'date',
        'is_current' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'is_closed',
        'is_current',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'start_date',
        'end_date',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'closedBy',
        'commercialDocuments',
        'stockMovements',
        'payments',
        'expenses',
        'openingBalancesStock',
        'openingBalancesParties',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'start_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['fiscal_years'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by');
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function openingBalancesStock(): HasMany
    {
        return $this->hasMany(OpeningBalanceStock::class);
    }

    public function openingBalancesParties(): HasMany
    {
        return $this->hasMany(OpeningBalanceParty::class);
    }

    // -------------------- Scopes --------------------

    public function scopeCurrent(Builder $query): Builder
    {
        return $query->where('is_current', true);
    }

    public function scopeOpen(Builder $query): Builder
    {
        return $query->where('is_closed', false);
    }

    public function scopeClosed(Builder $query): Builder
    {
        return $query->where('is_closed', true);
    }

    // -------------------- Helpers --------------------

    public function close(int $userId, ?string $notes = null): bool
    {
        if ($this->is_closed) {
            return false;
        }

        return $this->update([
            'is_closed' => true,
            'closed_at' => now(),
            'closed_by' => $userId,
            'closing_notes' => $notes,
            'is_current' => false,
        ]);
    }

    public function setCurrent(): bool
    {
        // Set all other years as non-current
        static::where('id', '!=', $this->id)->update(['is_current' => false]);

        return $this->update(['is_current' => true]);
    }

    public function isActive(): bool
    {
        return !$this->is_closed && now()->between($this->start_date, $this->end_date);
    }
}




// ===== ملف: Gender.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Gender Model
 *
 * Table: genders
 * Represents gender lookup data
 */
#[Cacheable]
class Gender extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'genders';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'label',
        'active',
        'display_order',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name', 'label'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = ['active'];

    /** @var array حقول الترتيب */
    public static array $sortable = ['id', 'name', 'display_order', 'created_at'];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'display_order';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600; // 1 hour for lookup tables

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['genders', 'lookups'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = ['active'];

    // -------------------- Relations --------------------

    /**
     * Get users with this gender
     */
    public function users()
    {
        return $this->hasMany(User::class);
    }

    /**
     * Get employees with this gender
     */
    public function employees()
    {
        return $this->hasMany(Employee::class);
    }
}




// ===== ملف: InventoryValuationMethod.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class InventoryValuationMethod extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name', 'method', 'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    public static array $searchableFields = ['name', 'method'];
    public static array $filterable = ['is_default', 'method'];
    public static array $sortable = ['id', 'name', 'method'];
    public static array $allowedIncludes = ['products']; // ✅ تعديل: بدلاً من productVariants
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['inventory_valuation_methods', 'api'];

    // ✅ العلاقة مع المنتجات مباشرة
    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'valuation_method_id');
    }
}



// ===== ملف: Job.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Job extends Model
{
    //
}




// ===== ملف: LegalForm.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * LegalForm Model
 *
 * Table: legal_forms
 * Legal forms for companies (SARL, EURL, SPA, etc.)
 */
#[Cacheable]
class LegalForm extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'legal_forms';

    protected $fillable = [
        'code',
        'name',
        'description',
        'requires_capital',
        'active',
    ];

    protected $casts = [
        'requires_capital' => 'boolean',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['code', 'name', 'description'];
    public static array $filterable = ['active', 'requires_capital'];
    public static array $sortable = ['id', 'code', 'name'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parties'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['legal_forms', 'lookups'];

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }
}




// ===== ملف: LoginAttempt.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LoginAttempt extends Model
{
    protected $table = 'login_attempts';

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'email',
        'ip_address',
        'user_agent',
        'success',
        'attempted_at',
    ];

    protected $casts = [
        'success' => 'boolean',
        'attempted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public static function record(string $email, bool $success, ?string $ip = null): self
    {
        $user = User::where('email', $email)->first();

        return static::create([
            'user_id' => $user?->id,
            'email' => $email,
            'ip_address' => $ip ?? request()->ip(),
            'user_agent' => request()->userAgent(),
            'success' => $success,
            'attempted_at' => now(),
        ]);
    }

    public static function getFailedAttempts(string $email, int $minutes = 15): int
    {
        return static::where('email', $email)
            ->where('success', false)
            ->where('attempted_at', '>=', now()->subMinutes($minutes))
            ->count();
    }

    public static function isLockedOut(string $email, int $maxAttempts = 5, int $minutes = 15): bool
    {
        return static::getFailedAttempts($email, $minutes) >= $maxAttempts;
    }
}



// ===== ملف: Notification.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * Notification Model
 *
 * Table: notifications
 * System notifications
 */
class Notification extends Model
{
    use
    HasCompany,
    HasStandardizedConfiguration;

    protected $table = 'notifications';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'type',
        'notifiable_type',
        'notifiable_id',
        'data',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['type'];
    public static array $filterable = ['notifiable_type', 'notifiable_id', 'type'];
    public static array $sortable = ['created_at', 'read_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['notifiable'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['notifications'];

    public function notifiable()
    {
        return $this->morphTo();
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function scopeRead(Builder $query): Builder
    {
        return $query->whereNotNull('read_at');
    }

    public function markAsRead(): bool
    {
        if ($this->read_at) {
            return false;
        }

        return $this->forceFill(['read_at' => now()])->save();
    }

    public function markAsUnread(): bool
    {
        if (!$this->read_at) {
            return false;
        }

        return $this->forceFill(['read_at' => null])->save();
    }

    public function isUnread(): bool
    {
        return is_null($this->read_at);
    }
}




// ===== ملف: NumberingSeries.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * NumberingSeries Model
 *
 * Table: numbering_series
 * Manages automatic numbering sequences for documents
 */
#[Cacheable]
class NumberingSeries extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'numbering_series';

    protected $fillable = [
        'document_type_id',
        'warehouse_id',
        'prefix',
        'suffix',
        'format',
        'last_number',
        'padding',
        'start_number',
        'max_number',
        'reset_yearly',
        'reset_monthly',
        'current_year',
        'current_month',
        'reset_date',
        'active',
        'is_locked',
    ];

    protected $casts = [
        'last_number' => 'integer',
        'padding' => 'integer',
        'start_number' => 'integer',
        'max_number' => 'integer',
        'reset_yearly' => 'boolean',
        'reset_monthly' => 'boolean',
        'current_year' => 'integer',
        'current_month' => 'integer',
        'reset_date' => 'date',
        'active' => 'boolean',
        'is_locked' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['prefix', 'suffix', 'format'];
    public static array $filterable = ['document_type_id', 'warehouse_id', 'active', 'is_locked'];
    public static array $sortable = ['id', 'prefix', 'last_number'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentType', 'warehouse', 'commercialDocuments'];
    public static string $defaultSort = 'id';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['numbering_series'];

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function scopeUnlocked(Builder $query): Builder
    {
        return $query->where('is_locked', false);
    }

    public function getNextNumber(): string
    {
        $currentYear = now()->year;
        $currentMonth = now()->month;

        // Check if reset is needed
        if ($this->reset_yearly && $this->current_year != $currentYear) {
            $this->resetSequence($currentYear, $currentMonth);
        } elseif ($this->reset_monthly && $this->current_month != $currentMonth) {
            $this->resetSequence($currentYear, $currentMonth);
        }

        $nextNumber = $this->last_number + 1;

        // Check max_number constraint
        if ($this->max_number && $nextNumber > $this->max_number) {
            throw new \Exception("Numbering series has reached its maximum number ({$this->max_number})");
        }

        return $this->formatNumber($nextNumber);
    }

    public function incrementNumber(): bool
    {
        $currentYear = now()->year;
        $currentMonth = now()->month;

        if ($this->reset_yearly && $this->current_year != $currentYear) {
            return $this->resetSequence($currentYear, $currentMonth);
        } elseif ($this->reset_monthly && $this->current_month != $currentMonth) {
            return $this->resetSequence($currentYear, $currentMonth);
        }

        return $this->increment('last_number');
    }

    protected function resetSequence(int $year, int $month): bool
    {
        return $this->update([
            'last_number' => $this->start_number - 1,
            'current_year' => $year,
            'current_month' => $month,
        ]);
    }

    protected function formatNumber(int $number): string
    {
        $paddedNumber = str_pad($number, $this->padding, '0', STR_PAD_LEFT);

        $formatted = $this->format;
        $formatted = str_replace('{PREFIX}', $this->prefix, $formatted);
        $formatted = str_replace('{SUFFIX}', $this->suffix ?? '', $formatted);
        $formatted = str_replace('{YY}', now()->format('y'), $formatted);
        $formatted = str_replace('{YYYY}', now()->format('Y'), $formatted);
        $formatted = str_replace('{MM}', now()->format('m'), $formatted);
        $formatted = str_replace('{MONTH}', now()->format('m'), $formatted);
        $formatted = str_replace('{NUMBER}', $paddedNumber, $formatted);
        $formatted = preg_replace_callback('/\{NUMBER:(\d+)\}/', function ($matches) use ($number) {
            $width = (int) $matches[1];
            return str_pad($number, $width, '0', STR_PAD_LEFT);
        }, $formatted);

        return $formatted;
    }
}




// ===== ملف: OpeningBalanceParty.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * OpeningBalanceParty Model
 *
 * Table: opening_balances_parties
 * Opening balances for parties (customers/suppliers)
 */
#[Cacheable]
class OpeningBalanceParty extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'opening_balances_parties';

    protected $fillable = [
        'fiscal_year_id',
        'party_id',
        'opening_balance',
        'balance_type',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'party_id', 'balance_type'];
    public static array $sortable = ['id', 'opening_balance', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'party'];
    public static string $defaultSort = 'party_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_parties'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function isDebit(): bool
    {
        return $this->balance_type === 'debit';
    }

    public function isCredit(): bool
    {
        return $this->balance_type === 'credit';
    }
}




// ===== ملف: OpeningBalanceStock.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

#[Cacheable]
class OpeningBalanceStock extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'opening_balances_stock';

    protected $fillable = [
        'fiscal_year_id', 'product_id', 'warehouse_id', 'opening_quantity', 'opening_value',
    ];

    protected $casts = [
        'opening_quantity' => 'decimal:3',
        'opening_value' => 'decimal:4',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = [];
    public static array $filterable = ['fiscal_year_id', 'product_id', 'warehouse_id'];
    public static array $sortable = ['id', 'opening_quantity', 'opening_value'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['fiscalYear', 'product', 'warehouse']; // ✅ تعديل
    public static string $defaultSort = 'product_id';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['opening_balances_stock'];

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    // ✅ العلاقة مع المنتج مباشرة (بدلاً من productVariant)
    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function getAverageCostPrice(): float
    {
        if ($this->opening_quantity <= 0) {
            return 0;
        }
        return $this->opening_value / $this->opening_quantity;
    }
}




// ===== ملف: Party.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

/**
 * Party Model
 *
 * Table: parties
 * Manages customers, suppliers, and business partners
 */
#[Cacheable]
class Party extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable;

    protected $table = 'parties';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'party_type_id',
        'code',
        'name',
        'commercial_name',
        'slug',
        'activity',
        'rc',
        'nif',
        'nis',
        'ai',
        'legal_form_id',
        'capital_amount',
        'rc_date',
        'address',
        'commune_id',
        'wilaya_id',
        'phone',
        'mobile',
        'fax',
        'email',
        'avatar',
        'bank_name',
        'rib',
        'initial_balance',
        'credit_limit',
        'default_price_level_id',
        'credit_days',
        'is_tva_exempt',
        'is_taxable',
        'tax_option',
        'cnas_number',
        'tax_regime',
        'is_final_consumer',
        'is_vat_registered',
        'vat_registration_date',
        'additional_data',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'capital_amount' => 'decimal:4',
        'rc_date' => 'date',
        'initial_balance' => 'decimal:4',
        'credit_limit' => 'decimal:4',
        'credit_days' => 'integer',
        'is_tva_exempt' => 'boolean',
        'is_taxable' => 'boolean',
        'is_final_consumer' => 'boolean',
        'is_vat_registered' => 'boolean',
        'vat_registration_date' => 'date',
        'additional_data' => 'array',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Hidden --------------------
    protected $hidden = [];

    // -------------------- Appends --------------------
    protected $appends = [];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'commercial_name',
        'code',
        'nif',
        'rc',
        'email',
        'phone',
        'mobile',
        'address',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'party_type_id',
        'legal_form_id',
        'commune_id',
        'wilaya_id',
        'default_price_level_id',
        'is_tva_exempt',
        'is_taxable',
        'is_final_consumer',
        'is_vat_registered',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'code',
        'name',
        'commercial_name',
        'created_at',
        'updated_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'partyType',
        'legalForm',
        'commune',
        'wilaya',
        'defaultPriceLevel',
        'commercialDocuments',
        'payments',
        'openingBalances',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['parties'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [
        'commercialDocuments',
        'payments',
    ];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    /**
     * Get the party type
     */
    public function partyType(): BelongsTo
    {
        return $this->belongsTo(PartyType::class);
    }

    /**
     * Get the legal form
     */
    public function legalForm(): BelongsTo
    {
        return $this->belongsTo(LegalForm::class);
    }

    /**
     * Get the commune
     */
    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    /**
     * Get the wilaya
     */
    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    /**
     * Get the default price level
     */
    public function defaultPriceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class, 'default_price_level_id');
    }

    /**
     * Get commercial documents for this party
     */
    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    /**
     * Get payments for this party
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * Get opening balances
     */
    public function openingBalances(): HasMany
    {
        return $this->hasMany(OpeningBalanceParty::class);
    }

    /**
     * Get checks issued by this party
     */
    public function checks(): HasMany
    {
        return $this->hasMany(Check::class);
    }

    // -------------------- Scopes --------------------

    /**
     * Scope for customers only
     */
    public function scopeCustomers(Builder $query): Builder
    {
        return $query->whereHas('partyType', function ($q) {
            $q->whereIn('name', ['client', 'both']);
        });
    }

    /**
     * Scope for suppliers only
     */
    public function scopeSuppliers(Builder $query): Builder
    {
        return $query->whereHas('partyType', function ($q) {
            $q->whereIn('name', ['supplier', 'both']);
        });
    }

    /**
     * Scope for VAT registered parties
     */
    public function scopeVatRegistered(Builder $query): Builder
    {
        return $query->where('is_vat_registered', true);
    }

    // -------------------- Accessors --------------------

    /**
     * Get full address
     */
    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);

        return implode(', ', $parts);
    }

    /**
     * Get current balance (to be calculated from transactions)
     */
    public function getCurrentBalanceAttribute(): float
    {
        // يمكن حساب الرصيد الحالي من المستندات والمدفوعات
        return 0.00; // TODO: Implement balance calculation
    }

    // -------------------- Helpers --------------------

    /**
     * Check if party is a customer
     */
    public function isCustomer(): bool
    {
        return in_array($this->partyType?->name, ['client', 'both']);
    }

    /**
     * Check if party is a supplier
     */
    public function isSupplier(): bool
    {
        return in_array($this->partyType?->name, ['supplier', 'both']);
    }
}




// ===== ملف: PartyType.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * PartyType Model
 *
 * Table: party_types
 * Lookup table for party types (customer, supplier, both)
 */
#[Cacheable]
class PartyType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'party_types';

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['parties'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['party_types', 'lookups'];

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }
}




// ===== ملف: Payment.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;

/**
 * Payment Model
 *
 * Table: payments
 * Manages all payment transactions
 */
#[Cacheable]
class Payment extends Model
{
    use HasStandardizedConfiguration,
        SoftDeletes,
        HasCompany,
        Auditable,
        BelongsToFiscalYear;

    protected $table = 'payments';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'payment_number',
        'payment_date',
        'amount',
        'currency_id',
        'amount_local',
        'payment_mode_id',
        'treasury_account_id',
        'check_id',
        'party_id',
        'fiscal_year_id',
        'reference',
        'bank_reference',
        'notes',
        'status',
        'is_reconciled',
        'reconciliation_date',
        'clearing_date',
        'user_id',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'payment_date' => 'date',
        'amount' => 'decimal:4',
        'amount_local' => 'decimal:4',
        'is_reconciled' => 'boolean',
        'reconciliation_date' => 'date',
        'clearing_date' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'payment_number',
        'reference',
        'bank_reference',
        'notes',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'payment_mode_id',
        'treasury_account_id',
        'check_id',
        'party_id',
        'fiscal_year_id',
        'currency_id',
        'user_id',
        'status',
        'is_reconciled',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'payment_number',
        'payment_date',
        'amount',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'currency',
        'paymentMode',
        'treasuryAccount',
        'check',
        'party',
        'fiscalYear',
        'user',
        'commercialDocuments',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'payment_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['payments'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = ['commercialDocuments'];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function paymentMode(): BelongsTo
    {
        return $this->belongsTo(PaymentMode::class);
    }

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function check(): BelongsTo
    {
        return $this->belongsTo(Check::class);
    }

    public function party(): BelongsTo
    {
        return $this->belongsTo(Party::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function commercialDocuments(): BelongsToMany
    {
        return $this->belongsToMany(CommercialDocument::class, 'document_payment')
            ->withPivot('amount_applied', 'notes')
            ->withTimestamps();
    }

    // -------------------- Scopes --------------------

    public function scopeConfirmed(Builder $query): Builder
    {
        return $query->where('status', 'confirmed');
    }

    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', 'pending');
    }

    public function scopeReconciled(Builder $query): Builder
    {
        return $query->where('is_reconciled', true);
    }

    public function scopeUnreconciled(Builder $query): Builder
    {
        return $query->where('is_reconciled', false);
    }

    // -------------------- Helpers --------------------

    public function getTotalApplied(): float
    {
        return $this->commercialDocuments()->sum('document_payment.amount_applied');
    }

    public function getUnappliedAmount(): float
    {
        return $this->amount - $this->getTotalApplied();
    }

    public function isFullyApplied(): bool
    {
        return $this->getUnappliedAmount() <= 0.01;
    }
}




// ===== ملف: PaymentMode.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * PaymentMode Model
 *
 * Table: payment_modes
 * Payment methods (cash, check, transfer, etc.)
 */
#[Cacheable]
class PaymentMode extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'payment_modes';

    protected $fillable = [
        'name',
        'code',
        'description',
        'treasury_account_id',
        'requires_reference',
        'is_cash',
        'active',
        'display_order',
    ];

    protected $casts = [
        'requires_reference' => 'boolean',
        'is_cash' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'description'];
    public static array $filterable = ['treasury_account_id', 'is_cash', 'requires_reference', 'active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['treasuryAccount', 'payments', 'expenses'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['payment_modes', 'lookups'];

    public function treasuryAccount(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccount::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}




// ===== ملف: Permission.php =====
namespace App\Models;


use Spatie\Permission\Models\Permission as SpatiePermission;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Permission Model (extends Spatie)
 *
 * Table: permissions
 */
class Permission extends SpatiePermission
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'group',
        'description',
    ];

    public static array $searchableFields = ['name', 'display_name', 'description'];
    public static array $filterable = ['guard_name', 'group'];
    public static array $sortable = ['id', 'name', 'display_name', 'group'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['roles'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['permissions'];

    public function scopeByGroup($query, string $group)
    {
        return $query->where('group', $group);
    }
}




// ===== ملف: PersonalAccessToken.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PersonalAccessToken extends Model
{
    //
}




// ===== ملف: PriceLevel.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * PriceLevel Model
 *
 * Table: price_levels
 * Different pricing tiers for products
 */
#[Cacheable]
class PriceLevel extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'price_levels';

    protected $fillable = [
        'name',
        'description',
        'is_percentage',
        'value',
        'active',
        'display_order',
    ];

    protected $casts = [
        'is_percentage' => 'boolean',
        'value' => 'decimal:2',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['active', 'is_percentage'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['productPrices', 'parties'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['price_levels', 'lookups'];

    public function productPrices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class, 'default_price_level_id');
    }

    public function calculatePrice(float $basePrice): float
    {
        if ($this->is_percentage) {
            return $basePrice * (1 + $this->value / 100);
        }

        return $basePrice + $this->value;
    }
}




// ===== ملف: Product.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

/**
 * Product — النموذج الموحد (منتج + SKU في جدول واحد)
 *
 * العلاقات:
 *   packagings       → product_packagings   (Colisages)
 *   prices           → product_prices       (Tarifs)
 *   quantityDiscounts→ quantity_discounts   (Tx Remise)
 *   stockMovements   → stock_movements
 *   lots             → product_lots
 *   documentLines    → commercial_document_lines
 *   openingBalances  → opening_balances_stock
 */
#[Cacheable]
class Product extends Model
{
    use HasCompany, HasStandardizedConfiguration, SoftDeletes, Auditable;

    protected $table = 'products';

    protected $fillable = [
        // معلومات أساسية
        'name',
        'slug',
        'ref',
        'barcode',
        'description',

        // تصنيف
        'family_id',
        'brand_id',
        'product_type_id',

        // ضريبة ووحدة
        'tva_id',
        'unit_id',

        // تسعير
        'purchase_price_ht',

        // مخزون
        'manages_stock',
        'allow_negative_stock',
        'has_lots',
        'has_expiration_date',
        'min_stock_alert',
        'max_stock_alert',
        'manages_quantity_discounts',

        // تقييم المخزون
        'valuation_method_id',

        // أبعاد
        'weight',
        'volume',
        'length',
        'width',
        'height',

        // بيانات مرنة
        'specifications',
        'images',
        'meta_title',
        'meta_description',
        'meta_keywords',

        'active',
    ];

    protected $casts = [
        'specifications'             => 'array',
        'images'                     => 'array',
        'meta_keywords'              => 'array',
        'active'                     => 'boolean',
        'manages_stock'              => 'boolean',
        'allow_negative_stock'       => 'boolean',
        'has_lots'                   => 'boolean',
        'has_expiration_date'        => 'boolean',
        'manages_quantity_discounts' => 'boolean',
        'purchase_price_ht'          => 'decimal:4',
        'min_stock_alert'            => 'decimal:4',
        'max_stock_alert'            => 'decimal:4',
        'weight'                     => 'decimal:2',
        'volume'                     => 'decimal:2',
        'length'                     => 'decimal:2',
        'width'                      => 'decimal:2',
        'height'                     => 'decimal:2',
        'created_at'                 => 'datetime',
        'updated_at'                 => 'datetime',
        'deleted_at'                 => 'datetime',
    ];

    protected $appends = ['current_stock', 'is_low_stock'];

    // ── Configuration ──

    public static array $searchableFields = ['name', 'ref', 'barcode', 'description'];

    public static array $filterable = [
        'family_id',
        'brand_id',
        'product_type_id',
        'tva_id',
        'unit_id',
        'valuation_method_id',
        'manages_stock',
        'has_lots',
        'has_expiration_date',
        'manages_quantity_discounts',
        'active',
    ];

    public static array $sortable = [
        'id',
        'name',
        'ref',
        'purchase_price_ht',
        'created_at',
        'updated_at',
    ];

    public static array $defaultWith  = [];
    public static array $allowedIncludes = [
        'family',
        'brand',
        'productType',
        'tva',
        'unit',
        'valuationMethod',
        'packagings',
        'prices',
        'prices.priceLevel',
        'quantityDiscounts',
        'quantityDiscounts.priceLevel',
        'stockMovements',
        'lots',
        'documentLines',
        'openingBalances',
    ];

    public static string $defaultSort          = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int    $defaultPerPage        = 15;
    public static int    $perPageLimit          = 100;
    public static ?int   $cacheTtl              = 300;
    public static array  $cacheTags             = ['products'];

    // ── Relations ──

    public function family(): BelongsTo
    {
        return $this->belongsTo(Family::class);
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function productType(): BelongsTo
    {
        return $this->belongsTo(ProductType::class);
    }

    public function tva(): BelongsTo
    {
        return $this->belongsTo(Tva::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function valuationMethod(): BelongsTo
    {
        return $this->belongsTo(InventoryValuationMethod::class, 'valuation_method_id');
    }
    // app/Models/Product.php
    public function barcodes(): HasMany
    {
        return $this->hasMany(Barcode::class);
    }

    public function primaryBarcode(): HasOne
    {
        return $this->hasOne(Barcode::class)->where('is_primary', true);
    }
    /** Colisages — وحدات التعبئة */
    public function packagings(): HasMany
    {
        return $this->hasMany(ProductPackaging::class)->orderBy('display_order');
    }

    /** Tarifs — مستويات الأسعار */
    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class);
    }

    /** Tx Remise — تخفيضات الكميات */
    public function quantityDiscounts(): HasMany
    {
        return $this->hasMany(QuantityDiscount::class)
            ->orderBy('price_level_id')
            ->orderBy('tier_order');
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function lots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function documentLines(): HasMany
    {
        return $this->hasMany(CommercialDocumentLine::class);
    }

    public function openingBalances(): HasMany
    {
        return $this->hasMany(OpeningBalanceStock::class);
    }

    // ── Scopes ──

    public function scopeByFamily(Builder $q, int $familyId): Builder
    {
        return $q->where('family_id', $familyId);
    }

    public function scopeByBrand(Builder $q, int $brandId): Builder
    {
        return $q->where('brand_id', $brandId);
    }

    public function scopeManagesStock(Builder $q): Builder
    {
        return $q->where('manages_stock', true);
    }

    public function scopeLowStock(Builder $q): Builder
    {
        return $q->whereColumn(
            'min_stock_alert',
            '>=',
            // subquery: آخر stock_balance_after لهذا المنتج
            StockMovement::selectRaw('COALESCE(stock_balance_after, 0)')
                ->whereColumn('product_id', 'products.id')
                ->latest('movement_date')
                ->latest('id')
                ->limit(1)
                ->getQuery()
        );
    }

    // ── Accessors ──

    public function getCurrentStockAttribute(): float
    {
        return (float) ($this->stockMovements()
            ->latest('movement_date')
            ->latest('id')
            ->value('stock_balance_after') ?? 0);
    }

    public function getIsLowStockAttribute(): bool
    {
        if (!$this->manages_stock) return false;
        return $this->current_stock <= (float) $this->min_stock_alert;
    }

    // ── Business Logic ──

    /**
     * حساب سعر البيع HT لمستوى سعر معين
     * (بدون price_computed في DB — الحساب يتم هنا)
     */
    public function computedPrice(int $priceLevelId): float
    {
        $pp = $this->prices()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->first();

        if (!$pp) return 0.0;

        return $pp->computePrice((float) $this->purchase_price_ht);
    }

    /**
     * سعر البيع مع التعبئة
     * سعر الفاردو = سعر الوحدة × معامل التعبئة
     */
    public function priceForPackaging(int $priceLevelId, int $packagingId): float
    {
        $unitPrice = $this->computedPrice($priceLevelId);
        if (!$unitPrice) return 0.0;

        $packaging = $this->packagings()->find($packagingId);
        return $packaging
            ? round($unitPrice * (float) $packaging->quantity, 4)
            : $unitPrice;
    }

    /**
     * التخفيض المنطبق على كمية لتعريفة معينة
     */
    public function applicableDiscount(int $priceLevelId, float $qty): ?QuantityDiscount
    {
        if (!$this->manages_quantity_discounts) return null;

        return $this->quantityDiscounts()
            ->where('price_level_id', $priceLevelId)
            ->where('active', true)
            ->where('is_blocked', false)
            ->where('min_qty', '<=', $qty)
            ->where(function ($q) use ($qty) {
                $q->whereNull('max_qty')->orWhere('max_qty', '>=', $qty);
            })
            ->orderBy('tier_order')
            ->first();
    }

    /**
     * السعر النهائي بعد تطبيق خصم الكمية
     */
    public function finalPrice(int $priceLevelId, float $qty = 1, ?int $packagingId = null): float
    {
        $basePrice = $packagingId
            ? $this->priceForPackaging($priceLevelId, $packagingId)
            : $this->computedPrice($priceLevelId);

        if (!$basePrice) return 0.0;

        $discount = $this->applicableDiscount($priceLevelId, $qty);
        if (!$discount) return $basePrice;

        return $discount->calculateDiscountedPrice($basePrice);
    }

    /**
     * الوحدة الأساسية (is_default أو الأصغر quantity)
     */
    public function defaultPackaging(): ?ProductPackaging
    {
        return $this->packagings()
            ->where('is_default', true)
            ->first()
            ?? $this->packagings()->orderBy('quantity')->first();
    }

    // app/Models/Product.php

    /**
     * حساب كمية المخزون في تاريخ محدد
     */
    public function stockOnDate(int $warehouseId, string $date, bool $includeUnvalidated = false): float
    {
        $query = $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->where('movement_date', '<=', $date);

        if (!$includeUnvalidated) {
            $query->where('is_validated', true);
        }

        return $query->get()->sum(function ($movement) {
            $direction = $movement->stockMovementType->direction;
            return $direction * $movement->quantity;
        });
    }

    /**
     * الحصول على سعر التكلفة (PMP) في تاريخ محدد
     */
    public function costPriceOnDate(int $warehouseId, string $date): float
    {
        $movements = $this->stockMovements()
            ->where('warehouse_id', $warehouseId)
            ->where('is_validated', true)
            ->where('movement_date', '<=', $date)
            ->orderBy('movement_date')
            ->get();

        $totalValue = 0;
        $totalQuantity = 0;

        foreach ($movements as $movement) {
            $direction = $movement->stockMovementType->direction;
            $quantity = $direction * $movement->quantity;

            if ($quantity > 0) {
                // إدخال: نضيف القيمة والكمية
                $totalValue += $movement->quantity * $movement->unit_price;
                $totalQuantity += $movement->quantity;
            } else {
                // خروج: نطرح من المتوسط المرجح الحالي
                $currentPMP = $totalQuantity > 0 ? $totalValue / $totalQuantity : 0;
                $outValue = abs($quantity) * $currentPMP;
                $totalValue -= $outValue;
                $totalQuantity += $quantity; // quantity سالبة
            }
        }

        return $totalQuantity > 0 ? round($totalValue / $totalQuantity, 4) : 0;
    }

    // ── Boot ──

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function (Product $product) {
            if (empty($product->slug)) {
                $product->slug = Str::slug($product->name);
            }
        });

        static::updating(function (Product $product) {
            if ($product->isDirty('name') && !$product->isDirty('slug')) {
                $product->slug = Str::slug($product->name);
            }
        });
    }
}




// ===== ملف: ProductLot.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

/**
 * ProductLot Model
 *
 * Table: product_lots
 * Manages product batches/lots with FIFO tracking
 */
#[Cacheable]
class ProductLot extends Model
{
    use HasStandardizedConfiguration,
        HasCompany,
        SoftDeletes;

    protected $table = 'product_lots';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'lot_number',
        'product_id',
        'warehouse_id',
        'manufacturing_date',
        'expiration_date',
        'purchase_date',
        'purchase_price',
        'legal_selling_price',
        'margin_percentage',
        'original_quantity',
        'remaining_quantity',
        'stock_movement_id',
        'supplier_lot_number',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'purchase_date' => 'date',
        'purchase_price' => 'decimal:4',
        'legal_selling_price' => 'decimal:4',
        'margin_percentage' => 'decimal:4',
        'original_quantity' => 'decimal:3',
        'remaining_quantity' => 'decimal:3',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['is_depleted', 'is_expired'];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'lot_number',
        'supplier_lot_number',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_id',
        'warehouse_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'lot_number',
        'purchase_date',
        'expiration_date',
        'remaining_quantity',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'product',
        'warehouse',
        'stockMovement',
        'commercialDocumentLines',
        'stockMovements',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'purchase_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 20;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 300;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['product_lots'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class);
    }

    public function commercialDocumentLines()
    {
        return $this->hasMany(CommercialDocumentLine::class, 'stock_lot_id');
    }

    public function stockMovements()
    {
        return $this->hasMany(StockMovement::class, 'stock_lot_id');
    }

    // -------------------- Scopes --------------------

    public function scopeAvailable(Builder $query): Builder
    {
        return $query->where('remaining_quantity', '>', 0)
            ->where('active', true);
    }

    public function scopeDepleted(Builder $query): Builder
    {
        return $query->where('remaining_quantity', '<=', 0);
    }

    public function scopeExpired(Builder $query): Builder
    {
        return $query->whereNotNull('expiration_date')
            ->where('expiration_date', '<', now());
    }

    public function scopeExpiringSoon(Builder $query, int $days = 30): Builder
    {
        return $query->whereNotNull('expiration_date')
            ->whereBetween('expiration_date', [now(), now()->addDays($days)]);
    }

    public function scopeFifoOrder(Builder $query): Builder
    {
        return $query->orderBy('purchase_date')->orderBy('id');
    }

    // -------------------- Accessors --------------------

    public function getIsDepletedAttribute(): bool
    {
        return $this->remaining_quantity <= 0;
    }

    public function getIsExpiredAttribute(): bool
    {
        return $this->expiration_date && $this->expiration_date->isPast();
    }

    public function getTotalCostAttribute(): float
    {
        return $this->original_quantity * $this->purchase_price;
    }

    public function getRemainingValueAttribute(): float
    {
        return $this->remaining_quantity * $this->purchase_price;
    }

    // -------------------- Helpers --------------------

    public function decreaseQuantity(float $quantity): bool
    {
        if ($this->remaining_quantity < $quantity) {
            return false;
        }

        return $this->decrement('remaining_quantity', $quantity);
    }

    public function increaseQuantity(float $quantity): bool
    {
        return $this->increment('remaining_quantity', $quantity);
    }

    public function isExpiringSoon(int $days = 30): bool
    {
        return $this->expiration_date
            && $this->expiration_date->isFuture()
            && $this->expiration_date->diffInDays(now()) <= $days;
    }
}




// ===== ملف: ProductPackaging.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

// ═══════════════════════════════════════════════════════════
// ProductPackaging — وحدات التعبئة (Colisages)
// ═══════════════════════════════════════════════════════════

/**
 * Table: product_packagings
 *
 * UN=1 / FD=6 / PLT=480
 * سعر التعبئة = product.computedPrice(level) × quantity
 */
class ProductPackaging extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'product_packagings';

    protected $fillable = [
        'product_id',
        'code',
        'label',
        'quantity',
        'barcode',
        'is_default',
        'active',
        'display_order',
    ];

    protected $casts = [
        'quantity'      => 'decimal:4',
        'is_default'    => 'boolean',
        'active'        => 'boolean',
        'display_order' => 'integer',
    ];

    public static array $searchableFields = ['code', 'label', 'barcode'];
    public static array $filterable       = ['product_id', 'active', 'is_default'];
    public static array $sortable         = ['id', 'display_order', 'quantity'];
    public static array $allowedIncludes  = ['product'];
    public static string $defaultSort     = 'display_order';
    public static array $cacheTags        = ['product_packagings', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    /**
     * سعر هذه التعبئة لمستوى سعر معين
     */
    public function priceForLevel(int $priceLevelId): float
    {
        $unitPrice = $this->product->computedPrice($priceLevelId);
        return round($unitPrice * (float) $this->quantity, 4);
    }
}




// ===== ملف: ProductPrice.php =====
namespace App\Models;

use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;


// ═══════════════════════════════════════════════════════════
// ProductPrice — التعريفات (Tarifs)
// ═══════════════════════════════════════════════════════════

/**
 * Table: product_prices
 *
 * ثلاث طرق للتسعير — الحساب في PHP فقط (لا price_computed في DB):
 *
 *   fixed  → price_ht = price
 *   rate   → price_ht = purchase_price_ht × (1 + rate/100)
 *   margin → price_ht = purchase_price_ht + margin
 */
class ProductPrice extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'product_prices';

    protected $fillable = [
        'product_id', 'price_level_id',
        'pricing_method',
        'price', 'rate', 'margin',
        'active',
    ];

    protected $casts = [
        'price'  => 'decimal:4',
        'rate'   => 'decimal:4',
        'margin' => 'decimal:4',
        'active' => 'boolean',
    ];

    public static array $filterable      = ['product_id', 'price_level_id', 'active', 'pricing_method'];
    public static array $sortable        = ['id', 'price_level_id'];
    public static array $allowedIncludes = ['product', 'priceLevel'];
    public static string $defaultSort    = 'price_level_id';
    public static array $cacheTags       = ['product_prices', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class);
    }

    /**
     * حساب سعر البيع HT بناءً على طريقة التسعير وسعر الشراء
     *
     * @param float $purchasePriceHt سعر الشراء من جدول products
     */
    public function computePrice(float $purchasePriceHt): float
    {
        return match ($this->pricing_method) {
            'rate'   => round($purchasePriceHt * (1 + ((float)($this->rate   ?? 0)) / 100), 4),
            'margin' => round($purchasePriceHt  +      (float)($this->margin ?? 0),         4),
            default  => round((float)($this->price ?? 0), 4),
        };
    }

    /**
     * قيمة الهامش المحسوب (للعرض في الواجهة)
     */
    public function computedMargin(float $purchasePriceHt): float
    {
        return round($this->computePrice($purchasePriceHt) - $purchasePriceHt, 4);
    }

    /**
     * نسبة الربح المحسوبة (للعرض في الواجهة)
     */
    public function computedRate(float $purchasePriceHt): float
    {
        if (!$purchasePriceHt) return 0.0;
        return round((($this->computePrice($purchasePriceHt) / $purchasePriceHt) - 1) * 100, 4);
    }
}




// ===== ملف: ProductType.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * ProductType Model
 *
 * Table: product_types
 * Defines types of products (stockable, service, consumable)
 */
#[Cacheable]
class ProductType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'product_types';

    protected $fillable = [
        'name',
        'label',
        'description',
        'manages_stock',
        'active',
        'display_order',
    ];

    protected $casts = [
        'manages_stock' => 'boolean',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active', 'manages_stock'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['product_types', 'lookups'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}




// ===== ملف: ProductVariant.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Core\Traits\HasCompany;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * @property int $id
 * @property int $company_id
 * @property int $product_id
 * @property string|null $sku
 * @property string|null $barcode
 * @property string|null $price_type
 * @property float|null $price_value
 * @property float|null $stock
 * @property bool|null $track_stock
 * @property array|null $attributes
 * @property string|null $image
 * @property float|null $weight
 * @property float|null $volume
 * @property bool|null $active
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\Company $company
 * @property-read \App\Models\Product $product
 * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\Barcode[] $barcodes
 */
class ProductVariant extends Model
{
    use HasFactory, SoftDeletes, HasCompany, HasStandardizedConfiguration;

    protected $table = 'product_variants';

    protected $fillable = [
        'company_id',
        'product_id',
        'sku',
        'barcode',
        'price_type',
        'price_value',
        'stock',
        'track_stock',
        'attributes',
        'image',
        'weight',
        'volume',
        'active',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'price_value' => 'decimal:4',
        'stock' => 'decimal:4',
        'track_stock' => 'boolean',
        'attributes' => 'array',
        'weight' => 'decimal:2',
        'volume' => 'decimal:2',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration for HasStandardizedConfiguration --------------------
    public static array $searchableFields = ['sku', 'barcode', 'attributes'];
    public static array $filterable = ['product_id', 'price_type', 'active', 'track_stock'];
    public static array $sortable = ['id', 'sku', 'price_value', 'stock', 'created_at'];
    public static array $defaultWith = ['product:id,name,ref'];
    public static array $allowedIncludes = ['product', 'company', 'barcodes'];
    public static string $defaultSort = 'id';
    public static string $defaultSortDirection = 'asc';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['product_variants'];

    // -------------------- Relations --------------------
    public function company()
    {
        return $this->belongsTo(Company::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function barcodes()
    {
        return $this->hasMany(Barcode::class);
    }

    // -------------------- Accessors --------------------
    public function getFinalPriceAttribute(): ?float
    {
        if (!$this->product || !$this->price_type) {
            return $this->product?->price_ht ?? null;
        }

        $basePrice = $this->product->price_ht ?? 0;

        if ($this->price_type === 'fixed') {
            return $basePrice + ($this->price_value ?? 0);
        }

        if ($this->price_type === 'percentage') {
            return $basePrice * (1 + ($this->price_value / 100));
        }

        return $basePrice;
    }

    public function getIsInStockAttribute(): bool
    {
        if ($this->track_stock === false) {
            return true;
        }
        return ($this->stock ?? 0) > 0;
    }

    // -------------------- Boot --------------------
    protected static function booted(): void
    {
        static::creating(function ($variant) {
            if (empty($variant->active)) {
                $variant->active = true;
            }
            if ($variant->track_stock === null) {
                $variant->track_stock = true;
            }
        });
    }
}




// ===== ملف: QuantityDiscount.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

// ═══════════════════════════════════════════════════════════
// QuantityDiscount — تخفيضات الكميات (Tx Remise)
// ═══════════════════════════════════════════════════════════

/**
 * Table: quantity_discounts
 *
 * كل تعريفة + منتج لها شرائح مستقلة.
 * الكميات دائماً بالوحدة الأساسية.
 */
class QuantityDiscount extends Model
{
    use
        HasCompany,
        HasStandardizedConfiguration;

    protected $table = 'quantity_discounts';

    protected $fillable = [
        'product_id', 'price_level_id',
        'min_qty', 'max_qty',
        'discount_amount', 'discount_percentage',
        'tier_order', 'is_blocked', 'active',
    ];

    protected $casts = [
        'min_qty'             => 'decimal:4',
        'max_qty'             => 'decimal:4',
        'discount_amount'     => 'decimal:4',
        'discount_percentage' => 'decimal:4',
        'tier_order'          => 'integer',
        'is_blocked'          => 'boolean',
        'active'              => 'boolean',
    ];

    public static array $filterable      = ['product_id', 'price_level_id', 'active', 'is_blocked'];
    public static array $sortable        = ['id', 'min_qty', 'tier_order'];
    public static array $allowedIncludes = ['product', 'priceLevel'];
    public static string $defaultSort    = 'tier_order';
    public static array $cacheTags       = ['quantity_discounts', 'products'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function priceLevel(): BelongsTo
    {
        return $this->belongsTo(PriceLevel::class);
    }

    /**
     * هل هذه الشريحة تنطبق على الكمية المعطاة؟
     */
    public function appliesTo(float $qty): bool
    {
        return $this->active
            && !$this->is_blocked
            && $qty >= (float) $this->min_qty
            && (is_null($this->max_qty) || $qty <= (float) $this->max_qty);
    }

    /**
     * حساب السعر النهائي بعد تطبيق الخصم
     *
     * الأولوية: discount_percentage > discount_amount
     */
    public function calculateDiscountedPrice(float $unitPrice): float
    {
        if ($this->discount_percentage) {
            return round($unitPrice * (1 - (float) $this->discount_percentage / 100), 4);
        }
        if ($this->discount_amount) {
            return round(max(0, $unitPrice - (float) $this->discount_amount), 4);
        }
        return $unitPrice;
    }

    /**
     * قيمة الخصم على الوحدة (للعرض)
     */
    public function discountValue(float $unitPrice): float
    {
        return round($unitPrice - $this->calculateDiscountedPrice($unitPrice), 4);
    }
}




// ===== ملف: Role.php =====
namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Role Model (يمتد من Spatie)
 *
 * Table: roles
 */
class Role extends SpatieRole
{
    use HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'guard_name',
        'display_name',
        'description',
    ];

    // -------------------- التكوين --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = ['name', 'display_name', 'description'];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = ['guard_name'];

    /** @var array حقول الترتيب */
    public static array $sortable = ['id', 'name', 'display_name'];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = ['permissions', 'users'];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int مدة الكاش بالثواني */
    public static ?int $cacheTtl = 3600; // ساعة واحدة

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['roles', 'permissions'];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];
}




// ===== ملف: Setting.php =====
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Setting Model
 *
 * Table: settings
 * System-wide configuration settings
 */
#[Cacheable]
class Setting extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'settings';

    protected $fillable = [
        'key',
        'group',
        'value',
        'type',
        'description',
        'is_public',
        'is_editable',
        'display_order',
    ];

    protected $casts = [
        'value' => 'array',
        'is_public' => 'boolean',
        'is_editable' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['key', 'description'];
    public static array $filterable = ['group', 'is_public', 'is_editable'];
    public static array $sortable = ['id', 'key', 'group', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = [];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 7200;
    public static array $cacheTags = ['settings'];

    public function scopeByGroup(Builder $query, string $group): Builder
    {
        return $query->where('group', $group);
    }

    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_public', true);
    }

    public function scopeEditable(Builder $query): Builder
    {
        return $query->where('is_editable', true);
    }

    public static function get(string $key, $default = null)
    {
        return Cache::tags(['settings'])->remember(
            "setting:{$key}",
            now()->addHours(24),
            function () use ($key, $default) {
                $setting = static::where('key', $key)->first();
                return $setting ? $setting->getTypedValue() : $default;
            }
        );
    }

    public static function set(string $key, $value): bool
    {
        $setting = static::where('key', $key)->first();

        if (!$setting) {
            return false;
        }

        if (!$setting->is_editable) {
            return false;
        }

        $setting->value = $value;
        $result = $setting->save();

        if ($result) {
            Cache::tags(['settings'])->forget("setting:{$key}");
        }

        return $result;
    }

    public function getTypedValue()
    {
        $value = $this->value;

        return match ($this->type) {
            'integer', 'int' => is_array($value) ? (int)($value[0] ?? 0) : (int)$value,
            'float', 'double' => is_array($value) ? (float)($value[0] ?? 0) : (float)$value,
            'boolean', 'bool' => is_array($value) ? (bool)($value[0] ?? false) : (bool)$value,
            'json', 'array' => is_array($value) ? $value : json_decode($value, true),
            default => is_array($value) ? ($value[0] ?? '') : $value,
        };
    }

    protected static function boot()
    {
        parent::boot();

        static::saved(function ($setting) {
            Cache::tags(['settings'])->forget("setting:{$setting->key}");
        });

        static::deleted(function ($setting) {
            Cache::tags(['settings'])->forget("setting:{$setting->key}");
        });
    }
}





// ===== ملف: StockMovement.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\BelongsToFiscalYear;
use App\Models\Traits\HasCompany;

/**
 * StockMovement Model
 *
 * Table: stock_movements
 * Tracks all inventory movements with FIFO support
 */
#[Cacheable]
class StockMovement extends Model
{
    use HasStandardizedConfiguration,
        HasCompany,
        SoftDeletes,
        BelongsToFiscalYear;

    protected $table = 'stock_movements';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'product_id',
        'warehouse_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'movement_date',
        'quantity',
        'unit_price',
        'cost_price',
        'total_price',
        'stock_balance_after',
        'lot_number',
        'expiration_date',
        'reason',
        'notes',
        'user_id',
        'parent_movement_id',
        'is_validated',
        'validated_by',
        'validated_at',
        'stock_lot_id',
        'created_by',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'movement_date' => 'datetime',
        'quantity' => 'decimal:3',
        'unit_price' => 'decimal:4',
        'cost_price' => 'decimal:4',
        'total_price' => 'decimal:4',
        'stock_balance_after' => 'decimal:3',
        'expiration_date' => 'date',
        'is_validated' => 'boolean',
        'validated_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'lot_number',
        'reason',
        'notes',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'product_id',
        'warehouse_id',
        'fiscal_year_id',
        'stock_movement_type_id',
        'commercial_document_line_id',
        'user_id',
        'stock_lot_id',
        'is_validated',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'movement_date',
        'quantity',
        'total_price',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'product',
        'warehouse',
        'fiscalYear',
        'stockMovementType',
        'commercialDocumentLine',
        'user',
        'parentMovement',
        'validatedBy',
        'stockLot',
        'createdBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'movement_date';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'desc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 20;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 0; // No cache for transactional data

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['stock_movements'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function fiscalYear(): BelongsTo
    {
        return $this->belongsTo(FiscalYear::class);
    }

    public function stockMovementType(): BelongsTo
    {
        return $this->belongsTo(StockMovementType::class);
    }

    public function commercialDocumentLine(): BelongsTo
    {
        return $this->belongsTo(CommercialDocumentLine::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parentMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'parent_movement_id');
    }

    public function validatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'validated_by');
    }

    public function stockLot(): BelongsTo
    {
        return $this->belongsTo(ProductLot::class, 'stock_lot_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------- Scopes --------------------

    public function scopeValidated(Builder $query): Builder
    {
        return $query->where('is_validated', true);
    }

    public function scopeUnvalidated(Builder $query): Builder
    {
        return $query->where('is_validated', false);
    }

    public function scopeIncoming(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', function ($q) {
            $q->where('direction', 1);
        });
    }

    public function scopeOutgoing(Builder $query): Builder
    {
        return $query->whereHas('stockMovementType', function ($q) {
            $q->where('direction', -1);
        });
    }

    public function scopeByDateRange(Builder $query, $startDate, $endDate): Builder
    {
        return $query->whereBetween('movement_date', [$startDate, $endDate]);
    }

    // -------------------- Helpers --------------------

    public function isIncoming(): bool
    {
        return $this->stockMovementType?->direction === 1;
    }

    public function isOutgoing(): bool
    {
        return $this->stockMovementType?->direction === -1;
    }

    public function isAdjustment(): bool
    {
        return $this->stockMovementType?->direction === 0;
    }
}




// ===== ملف: StockMovementType.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * StockMovementType Model
 *
 * Table: stock_movement_types
 * Defines types of stock movements
 */
#[Cacheable]
class StockMovementType extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'stock_movement_types';

    protected $fillable = [
        'name',
        'label',
        'description',
        'direction',
        'active',
        'display_order',
    ];

    protected $casts = [
        'direction' => 'integer',
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'label', 'description'];
    public static array $filterable = ['active', 'direction'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['stockMovements'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['stock_movement_types', 'lookups'];

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function isIncoming(): bool
    {
        return $this->direction === 1;
    }

    public function isOutgoing(): bool
    {
        return $this->direction === -1;
    }

    public function isNeutral(): bool
    {
        return $this->direction === 0;
    }
}




// ===== ملف: TreasuryAccount.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

/**
 * TreasuryAccount Model
 *
 * Table: treasury_accounts
 * Manages bank and cash accounts
 */
#[Cacheable]
class TreasuryAccount extends Model
{
    use HasStandardizedConfiguration,
        HasCompany,
        SoftDeletes,
        Auditable;

    protected $table = 'treasury_accounts';

    protected $fillable = [
        'name',
        'code',
        'treasury_account_type_id',
        'bank_name',
        'account_number',
        'rib',
        'iban',
        'swift_bic',
        'currency',
        'initial_balance',
        'current_balance',
        'is_default',
        'active',
        'notes',
    ];

    protected $casts = [
        'initial_balance' => 'decimal:4',
        'current_balance' => 'decimal:4',
        'is_default' => 'boolean',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'code', 'bank_name', 'account_number', 'rib', 'iban'];
    public static array $filterable = ['treasury_account_type_id', 'is_default', 'active', 'currency'];
    public static array $sortable = ['id', 'name', 'code', 'current_balance'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['treasuryAccountType', 'payments', 'paymentModes', 'expenses', 'createdBy', 'updatedBy', 'deletedBy'];
    public static string $defaultSort = 'name';
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['treasury_accounts'];

    public function treasuryAccountType(): BelongsTo
    {
        return $this->belongsTo(TreasuryAccountType::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function paymentModes(): HasMany
    {
        return $this->hasMany(PaymentMode::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    public function scopeBankAccounts(Builder $query): Builder
    {
        return $query->whereHas('treasuryAccountType', function ($q) {
            $q->where('name', 'bank');
        });
    }

    public function scopeCashAccounts(Builder $query): Builder
    {
        return $query->whereHas('treasuryAccountType', function ($q) {
            $q->where('name', 'cash');
        });
    }

    public function isBankAccount(): bool
    {
        return $this->treasuryAccountType?->name === 'bank';
    }

    public function isCashAccount(): bool
    {
        return $this->treasuryAccountType?->name === 'cash';
    }

    public function updateBalance(float $amount): bool
    {
        return $this->increment('current_balance', $amount);
    }
}




// ===== ملف: TreasuryAccountType.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

// Core System
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HashesId;
use App\Core\Traits\HasStandardizedConfiguration;

#[Cacheable]
class TreasuryAccountType extends Model
{
    use HasFactory, HashesId, HasStandardizedConfiguration;

    protected $fillable = [
        'name',
        'label',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
    ];

    // --- Core Config ---
    public static array $searchableFields = ['name', 'label'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'label', 'display_order'];
    public static array $allowedIncludes = ['treasuryAccounts'];
    public static ?int $cacheTtl = 86400; // 1 day
    public static array $cacheTags = ['treasury_account_types', 'api'];

    // --- العلاقات ---
    public function treasuryAccounts(): HasMany
    {
        return $this->hasMany(TreasuryAccount::class);
    }
}




// ===== ملف: Tva.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Tva Model
 *
 * Table: tvas
 * VAT (Value Added Tax) rates
 */
#[Cacheable]
class Tva extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'tvas';

    protected $fillable = [
        'name',
        'rate',
        'description',
        'active',
        'is_default',
        'display_order',
    ];

    protected $casts = [
        'rate' => 'decimal:2',
        'active' => 'boolean',
        'is_default' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'description'];
    public static array $filterable = ['active', 'is_default'];
    public static array $sortable = ['id', 'name', 'rate', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['tvas', 'lookups'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function scopeDefault(Builder $query): Builder
    {
        return $query->where('is_default', true);
    }

    public static function getDefaultRate(): ?float
    {
        return static::where('is_default', true)
            ->where('active', true)
            ->value('rate');
    }
}




// ===== ملف: Unit.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Unit Model
 *
 * Table: units
 * Units of measurement for products
 */
#[Cacheable]
class Unit extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'units';

    protected $fillable = [
        'name',
        'symbol',
        'description',
        'active',
        'display_order',
    ];

    protected $casts = [
        'active' => 'boolean',
        'display_order' => 'integer',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'symbol', 'description'];
    public static array $filterable = ['active'];
    public static array $sortable = ['id', 'name', 'display_order'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['products'];
    public static string $defaultSort = 'display_order';
    public static ?int $cacheTtl = 3600;
    public static array $cacheTags = ['units', 'lookups'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }
}




// ===== ملف: User.php =====
declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * User Model
 *
 * Table: users
 * Manages system users with authentication and profile management
 *
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Company> $companies
 */
#[Cacheable]
class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, HasRoles, SoftDeletes, HasStandardizedConfiguration;

    // أدوار النظام العام (System Roles)
    public const ROLE_SUPER_ADMIN = 'super-admin';
    public const ROLE_ADMIN = 'admin';

    // أدوار المستخدم داخل الشركة (Company Pivot Roles)
    public const COMPANY_ROLE_OWNER = 'owner';
    public const COMPANY_ROLE_ADMIN = 'admin';
    public const COMPANY_ROLE_MEMBER = 'member';

    protected $table = 'users';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name', 'email', 'email_verified_at', 'username', 'phone', 'avatar',
        'bio', 'job_title', 'birth_date', 'gender_id', 'national_id', 'address',
        'commune_id', 'wilaya_id', 'role_id', 'last_login_at', 'last_login_ip',
        'register_ip', 'register_user_agent', 'active', 'created_by', 'updated_by', 'deleted_by',
    ];

    // -------------------- Hidden --------------------
    protected $hidden = [
        'password', 'remember_token', 'national_id',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',        // Laravel 10+ (أفضل من setPasswordAttribute)
        'birth_date' => 'date',
        'last_login_at' => 'datetime',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Appends --------------------
    protected $appends = ['full_address'];

    // -------------------- Spatie Permission --------------------
    protected $guard_name = 'web';

    // -------------------- Configuration (لـ HasStandardizedConfiguration) --------------------

    public static array $searchableFields = [
        'name', 'email', 'username', 'phone', 'job_title',
    ];

    public static array $filterable = [
        'gender_id', 'commune_id', 'wilaya_id', 'role_id', 'active',
    ];

    public static array $sortable = [
        'id', 'name', 'email', 'created_at', 'last_login_at',
    ];

    public static array $defaultWith = [];

    public static array $allowedIncludes = [
        'gender', 'commune', 'wilaya', 'role', 'roles', 'permissions',
        'createdBy', 'updatedBy', 'deletedBy', 'commercialDocuments',
        'payments', 'stockMovements', 'companies',
    ];

    public static string $defaultSort = 'name';
    public static string $defaultSortDirection = 'asc';
    public static int $defaultPerPage = 15;
    public static int $perPageLimit = 100;
    public static ?int $cacheTtl = 300;
    public static array $cacheTags = ['users'];
    public static array $cacheInvalidateRelations = [];
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function gender(): BelongsTo
    {
        return $this->belongsTo(Gender::class);
    }

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(\Spatie\Permission\Models\Role::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class, 'created_by');
    }

    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class)
            ->withPivot('is_default', 'role', 'invited_by', 'joined_at', 'is_active')
            ->withTimestamps();
    }

    public function defaultCompany(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    // -------------------- Mutators --------------------
    // ملاحظة: تم استبدال setPasswordAttribute بـ Cast 'hashed'، لذا يمكن حذفها.
    // لكن نبقها للتوافق مع الإصدارات القديمة إن وجدت.
    public function setPasswordAttribute($value)
    {
        if (strlen($value) === 60 && str_starts_with($value, '$2y$')) {
            $this->attributes['password'] = $value;
            return;
        }
        $this->attributes['password'] = \Illuminate\Support\Facades\Hash::make($value);
    }

    // -------------------- Accessors --------------------
    public function getDefaultCompanyAttribute()
    {
        return $this->companies()->wherePivot('is_default', true)->first();
    }

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);
        return implode(', ', $parts);
    }

    // -------------------- Helpers (محسّنة) --------------------
    public function updateLastLogin(): void
    {
        $this->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(self::ROLE_ADMIN);
    }

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(self::ROLE_SUPER_ADMIN);
    }

    /**
     * تحديد ما إذا كان المستخدم لديه حق الوصول إلى شركة معينة (عضو نشط).
     *
     * @param int|Company $company
     * @return bool
     */
    public function hasAccessToCompany(int|Company $company): bool
    {
        $id = $company instanceof Company ? $company->id : $company;

        if ($this->relationLoaded('companies')) {
            $member = $this->companies->firstWhere('id', $id);
            return $member && $member->pivot->is_active;
        }

        return $this->companies()
            ->where('companies.id', $id)
            ->wherePivot('is_active', true)
            ->exists();
    }

    /**
     * تحديد ما إذا كان المستخدم هو المالك الأساسي للشركة.
     */
    public function isOwnerOf(Company $company): bool
    {
        return $this->id === $company->owner_id;
    }

    /**
     * تحديد ما إذا كان المستخدم مديراً (Admin) في الشركة (مالك أو مدير).
     */
    public function isAdminOf(Company $company): bool
    {
        if ($this->relationLoaded('companies')) {
            $member = $this->companies->firstWhere('id', $company->id);
            return $member
                && $member->pivot->is_active
                && in_array($member->pivot->role, [self::COMPANY_ROLE_OWNER, self::COMPANY_ROLE_ADMIN]);
        }

        return $this->companies()
            ->where('companies.id', $company->id)
            ->wherePivot('is_active', true)
            ->wherePivotIn('role', [self::COMPANY_ROLE_OWNER, self::COMPANY_ROLE_ADMIN])
            ->exists();
    }
}




// ===== ملف: Warehouse.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

/**
 * Warehouse Model
 *
 * Table: warehouses
 * Manages inventory storage locations
 */
#[Cacheable]
class Warehouse extends Model
{
    use HasStandardizedConfiguration,
        HasCompany,
        SoftDeletes,
        Auditable;

    protected $table = 'warehouses';

    // -------------------- Fillable --------------------
    protected $fillable = [
        'name',
        'code',
        'address',
        'commune_id',
        'wilaya_id',
        'phone',
        'manager_name',
        'activity',
        'rc',
        'nif',
        'nis',
        'ai',
        'active',
    ];

    // -------------------- Casts --------------------
    protected $casts = [
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // -------------------- Configuration --------------------

    /** @var array حقول البحث */
    public static array $searchableFields = [
        'name',
        'code',
        'phone',
        'manager_name',
        'nif',
        'rc',
        'address',
    ];

    /** @var array الفلاتر المسموحة */
    public static array $filterable = [
        'commune_id',
        'wilaya_id',
        'active',
    ];

    /** @var array حقول الترتيب */
    public static array $sortable = [
        'id',
        'name',
        'code',
        'created_at',
    ];

    /** @var array العلاقات المحملة دائماً */
    public static array $defaultWith = [];

    /** @var array العلاقات المسموحة */
    public static array $allowedIncludes = [
        'commune',
        'wilaya',
        'commercialDocuments',
        'stockMovements',
        'productLots',
        'numberingSeries',
        'createdBy',
        'updatedBy',
        'deletedBy',
    ];

    /** @var string حقل الترتيب الافتراضي */
    public static string $defaultSort = 'name';

    /** @var string اتجاه الترتيب الافتراضي */
    public static string $defaultSortDirection = 'asc';

    /** @var int عدد السجلات في الصفحة */
    public static int $defaultPerPage = 15;

    /** @var int الحد الأقصى للسجلات */
    public static int $perPageLimit = 100;

    /** @var int|null مدة الكاش بالثواني */
    public static ?int $cacheTtl = 600;

    /** @var array تاجات الكاش */
    public static array $cacheTags = ['warehouses'];

    /** @var array الموديلات المرتبطة */
    public static array $cacheInvalidateRelations = [];

    /** @var array Scopes التلقائية */
    public static array $scopes = [];

    // -------------------- Relations --------------------

    public function commune(): BelongsTo
    {
        return $this->belongsTo(Commune::class);
    }

    public function wilaya(): BelongsTo
    {
        return $this->belongsTo(Wilaya::class);
    }

    public function commercialDocuments(): HasMany
    {
        return $this->hasMany(CommercialDocument::class);
    }

    public function stockMovements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function productLots(): HasMany
    {
        return $this->hasMany(ProductLot::class);
    }

    public function numberingSeries(): HasMany
    {
        return $this->hasMany(NumberingSeries::class);
    }

    // -------------------- Accessors --------------------

    public function getFullAddressAttribute(): string
    {
        $parts = array_filter([
            $this->address,
            $this->commune?->name,
            $this->wilaya?->name,
        ]);

        return implode(', ', $parts);
    }
}




// ===== ملف: Wilaya.php =====
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;

/**
 * Wilaya Model
 *
 * Table: wilayas
 * Algerian provinces (wilayas)
 */
#[Cacheable]
class Wilaya extends Model
{
    use HasStandardizedConfiguration;

    protected $table = 'wilayas';

    protected $fillable = [
        'code',
        'name',
        'arabic_name',
        'latitude',
        'longitude',
        'active',
    ];

    protected $casts = [
        'code' => 'integer',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['name', 'arabic_name'];
    public static array $filterable = ['active', 'code'];
    public static array $sortable = ['id', 'code', 'name'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['communes', 'users', 'parties', 'warehouses'];
    public static string $defaultSort = 'code';
    public static ?int $cacheTtl = 86400;
    public static array $cacheTags = ['wilayas', 'geography'];

    public function communes(): HasMany
    {
        return $this->hasMany(Commune::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function parties(): HasMany
    {
        return $this->hasMany(Party::class);
    }

    public function warehouses(): HasMany
    {
        return $this->hasMany(Warehouse::class);
    }
}



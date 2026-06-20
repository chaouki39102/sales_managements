<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

#[Cacheable]
class ApprovalThreshold extends Model
{
    use HasStandardizedConfiguration, HasCompany, Auditable;

    protected $table = 'approval_thresholds';

    protected $fillable = [
        'company_id',
        'document_type_id',
        'min_amount',
        'max_amount',
        'requires_approval',
        'role_id',
        'notes',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'min_amount' => 'decimal:4',
        'max_amount' => 'decimal:4',
        'requires_approval' => 'boolean',
        'is_active' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['notes'];
    public static array $filterable = ['document_type_id', 'role_id', 'is_active', 'min_amount', 'max_amount'];
    public static array $sortable = ['id', 'min_amount', 'max_amount', 'created_at'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['documentType', 'role', 'createdBy', 'updatedBy'];
    public static string $defaultSort = 'min_amount';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['approval_thresholds'];

    public function documentType(): BelongsTo
    {
        return $this->belongsTo(DocumentType::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeForDocumentType(Builder $query, int $documentTypeId): Builder
    {
        return $query->where('document_type_id', $documentTypeId);
    }
}

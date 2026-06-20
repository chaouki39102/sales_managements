<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Models\Traits\HasCompany;

class UserAlert extends Model
{
    use HasCompany, HasStandardizedConfiguration;

    protected $table = 'user_alerts';

    protected $fillable = [
        'company_id',
        'type',
        'title',
        'body',
        'severity',
        'document_id',
        'check_id',
        'product_id',
        'party_id',
        'user_id',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'is_read' => 'boolean',
        'read_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public static array $searchableFields = ['title', 'body', 'type'];
    public static array $filterable = ['type', 'severity', 'is_read', 'user_id'];
    public static array $sortable = ['created_at', 'read_at', 'severity'];
    public static array $defaultWith = [];
    public static array $allowedIncludes = ['document', 'party', 'check', 'product'];
    public static string $defaultSort = 'created_at';
    public static string $defaultSortDirection = 'desc';
    public static ?int $cacheTtl = 0;
    public static array $cacheTags = ['user_alerts'];

    public function document(): BelongsTo { return $this->belongsTo(CommercialDocument::class); }
    public function check(): BelongsTo    { return $this->belongsTo(Check::class); }
    public function product(): BelongsTo  { return $this->belongsTo(Product::class); }
    public function party(): BelongsTo    { return $this->belongsTo(Party::class); }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->where('is_read', false);
    }

    public function scopeForUser(Builder $query, ?int $userId): Builder
    {
        if ($userId) {
            return $query->where(function ($q) use ($userId) {
                $q->whereNull('user_id')->orWhere('user_id', $userId);
            });
        }
        return $query;
    }

    public function markAsRead(): bool
    {
        return $this->update(['is_read' => true, 'read_at' => now()]);
    }
}

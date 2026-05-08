<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use App\Core\Attributes\Cacheable;
use App\Core\Traits\HasStandardizedConfiguration;
use App\Core\Traits\Auditable;
use App\Models\Traits\HasCompany;

#[Cacheable]
class Check extends Model
{
    use HasStandardizedConfiguration, HasCompany, Auditable;

    protected $table = 'checks';

    protected $fillable = [
        'company_id',
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
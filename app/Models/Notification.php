<?php

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
        'id',
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

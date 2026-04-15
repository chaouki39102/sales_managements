<?php

namespace App\Core\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Enhanced SoftDeletes with better querying
 */
trait SoftDeletesEnhanced
{
    use SoftDeletes;

    /**
     * Scope: Get only trashed records
     */
    public function scopeTrashed(Builder $query): Builder
    {
        return $query->onlyTrashed();
    }

    /**
     * Scope: Get records deleted in date range
     */
    public function scopeDeletedBetween(Builder $query, $startDate, $endDate): Builder
    {
        return $query->onlyTrashed()
            ->whereBetween('deleted_at', [$startDate, $endDate]);
    }

    /**
     * Scope: Get recently deleted (last 7 days)
     */
    public function scopeRecentlyDeleted(Builder $query): Builder
    {
        return $query->onlyTrashed()
            ->where('deleted_at', '>=', now()->subDays(7));
    }

    /**
     * Restore with related models
     */
    public function restoreWithRelations(array $relations = []): bool
    {
        $restored = $this->restore();

        if (!$restored) {
            return false;
        }

        foreach ($relations as $relation) {
            if (method_exists($this, $relation)) {
                $this->$relation()->onlyTrashed()->restore();
            }
        }

        return true;
    }

    /**
     * Permanently delete with related models
     */
    public function forceDeleteWithRelations(array $relations = []): bool
    {
        foreach ($relations as $relation) {
            if (method_exists($this, $relation)) {
                $this->$relation()->forceDelete();
            }
        }

        return $this->forceDelete();
    }
}

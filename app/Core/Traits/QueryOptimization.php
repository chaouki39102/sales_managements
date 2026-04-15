<?php

namespace App\Core\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

/**
 * Trait لتحسين أداء الاستعلامات
 */
trait QueryOptimization
{
    /**
     * Scope: Select only necessary columns
     */
    public function scopeSelectMinimal(Builder $query): Builder
    {
        $table = $this->getTable();

        // الحقول الأساسية فقط
        return $query->select([
            "{$table}.id",
            "{$table}.name",
            "{$table}.created_at",
        ]);
    }

    /**
     * Scope: Chunked processing for large datasets
     */
    public function scopeChunkById(Builder $query, int $count, callable $callback): bool
    {
        return $query->orderBy($this->getKeyName())->chunk($count, $callback);
    }

    /**
     * Scope: Add index hint (MySQL specific)
     */
    public function scopeUseIndex(Builder $query, string $index): Builder
    {
        if (DB::getDriverName() !== 'mysql') {
            return $query;
        }

        $table = $this->getTable();
        return $query->from(DB::raw("{$table} USE INDEX ({$index})"));
    }

    /**
     * Check if query will use index
     */
    public function explainQuery(Builder $query): array
    {
        $sql = $query->toSql();
        $bindings = $query->getBindings();

        if (DB::getDriverName() === 'mysql') {
            $result = DB::select("EXPLAIN {$sql}", $bindings);
            return json_decode(json_encode($result), true);
        }

        return [];
    }

    /**
     * Get query execution time
     */
    public function benchmarkQuery(Builder $query): array
    {
        $start = microtime(true);
        $result = $query->get();
        $duration = microtime(true) - $start;

        return [
            'count' => $result->count(),
            'duration' => round($duration * 1000, 2) . ' ms',
            'memory' => round(memory_get_usage(true) / 1024 / 1024, 2) . ' MB',
        ];
    }
}

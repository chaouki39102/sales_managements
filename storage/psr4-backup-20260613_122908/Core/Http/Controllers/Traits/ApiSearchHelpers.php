<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Trait ApiSearchHelpers
 *
 * توحيد عمليات البحث مع دعم MySQL Full-Text و SQLite LIKE
 */
trait ApiSearchHelpers
{
    /**
     * تطبيق البحث العام على الاستعلام
     *
     * @param Builder $query
     * @param string $searchTerm
     * @param array $searchFields
     * @return Builder
     */
    protected function applyGlobalSearch(Builder $query, string $searchTerm, array $searchFields): Builder
    {
        if (empty($searchTerm) || empty($searchFields)) {
            return $query;
        }

        $searchTerm = trim($searchTerm);

        // التحقق من نوع قاعدة البيانات
        $driver = DB::connection()->getDriverName();

        return $query->where(function (Builder $q) use ($searchTerm, $searchFields, $driver) {
            foreach ($searchFields as $field) {
                if ($this->isRelationField($field)) {
                    $this->applyRelationSearch($q, $field, $searchTerm, $driver);
                } else {
                    $this->applyDirectSearch($q, $field, $searchTerm, $driver);
                }
            }
        });
    }

    /**
     * تطبيق البحث المباشر على حقل
     */
    protected function applyDirectSearch(Builder $query, string $field, string $searchTerm, string $driver): void
    {
        if ($driver === 'mysql') {
            // MySQL: استخدام FULLTEXT إن وجد، وإلا LIKE
            $query->orWhere($field, 'LIKE', "%{$searchTerm}%");
        } else {
            // SQLite وغيرها: LIKE فقط
            $query->orWhere($field, 'LIKE', "%{$searchTerm}%");
        }
    }

    /**
     * تطبيق البحث على علاقة (Relation)
     */
    protected function applyRelationSearch(Builder $query, string $field, string $searchTerm, string $driver): void
    {
        [$relation, $column] = explode('.', $field, 2);

        $query->orWhereHas($relation, function (Builder $q) use ($column, $searchTerm, $driver) {
            $this->applyDirectSearch($q, $column, $searchTerm, $driver);
        });
    }

    /**
     * التحقق من كون الحقل علاقة
     */
    protected function isRelationField(string $field): bool
    {
        return Str::contains($field, '.');
    }

    /**
     * بحث متقدم مع دعم Multiple Terms
     */
    protected function applyAdvancedSearch(Builder $query, string $searchTerm, array $searchFields): Builder
    {
        if (empty($searchTerm) || empty($searchFields)) {
            return $query;
        }

        // تقسيم إلى كلمات منفصلة
        $terms = array_filter(explode(' ', $searchTerm));

        if (empty($terms)) {
            return $query;
        }

        $driver = DB::connection()->getDriverName();

        return $query->where(function (Builder $q) use ($terms, $searchFields, $driver) {
            foreach ($terms as $term) {
                $q->where(function (Builder $subQuery) use ($term, $searchFields, $driver) {
                    foreach ($searchFields as $field) {
                        if ($this->isRelationField($field)) {
                            $this->applyRelationSearch($subQuery, $field, $term, $driver);
                        } else {
                            $this->applyDirectSearch($subQuery, $field, $term, $driver);
                        }
                    }
                });
            }
        });
    }

    /**
     * بحث دقيق (Exact Match)
     */
    protected function applyExactSearch(Builder $query, string $searchTerm, array $searchFields): Builder
    {
        if (empty($searchTerm) || empty($searchFields)) {
            return $query;
        }

        return $query->where(function (Builder $q) use ($searchTerm, $searchFields) {
            foreach ($searchFields as $field) {
                if ($this->isRelationField($field)) {
                    [$relation, $column] = explode('.', $field, 2);
                    $q->orWhereHas($relation, fn(Builder $qr) => $qr->where($column, $searchTerm));
                } else {
                    $q->orWhere($field, $searchTerm);
                }
            }
        });
    }

    /**
     * بحث JSON (للحقول من نوع JSON)
     */
    protected function applyJsonSearch(Builder $query, string $jsonField, string $key, $value): Builder
    {
        $driver = DB::connection()->getDriverName();

        if ($driver === 'mysql') {
            return $query->whereJsonContains("{$jsonField}->{$key}", $value);
        } else {
            // SQLite: استخدام JSON_EXTRACT
            return $query->whereRaw("JSON_EXTRACT({$jsonField}, '$.{$key}') = ?", [$value]);
        }
    }
}

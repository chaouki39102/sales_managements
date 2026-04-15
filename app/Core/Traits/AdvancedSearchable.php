<?php
namespace App\Core\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

/**
 * Advanced search capabilities
 */
trait AdvancedSearchable
{
    /**
     * Scope: Advanced search with operators
     */
    public function scopeAdvancedSearch(Builder $query, array $criteria): Builder
    {
        foreach ($criteria as $field => $params) {
            if (!is_array($params)) {
                $params = ['value' => $params, 'operator' => '='];
            }

            $value = $params['value'] ?? null;
            $operator = $params['operator'] ?? '=';

            if (is_null($value)) {
                continue;
            }

            switch ($operator) {
                case 'like':
                    $query->where($field, 'LIKE', "%{$value}%");
                    break;

                case 'starts_with':
                    $query->where($field, 'LIKE', "{$value}%");
                    break;

                case 'ends_with':
                    $query->where($field, 'LIKE', "%{$value}");
                    break;

                case 'in':
                    $query->whereIn($field, (array) $value);
                    break;

                case 'not_in':
                    $query->whereNotIn($field, (array) $value);
                    break;

                case 'between':
                    if (is_array($value) && count($value) === 2) {
                        $query->whereBetween($field, $value);
                    }
                    break;

                case 'null':
                    $query->whereNull($field);
                    break;

                case 'not_null':
                    $query->whereNotNull($field);
                    break;

                default:
                    $query->where($field, $operator, $value);
            }
        }

        return $query;
    }

    /**
     * Scope: Full-text search (MySQL)
     */
    public function scopeFullTextSearch(Builder $query, string $term, array $columns): Builder
    {
        if (empty($term) || empty($columns)) {
            return $query;
        }

        $columns = implode(',', $columns);

        return $query->whereRaw(
            "MATCH ({$columns}) AGAINST (? IN BOOLEAN MODE)",
            [$term]
        );
    }

    /**
     * Scope: Fuzzy search (Levenshtein distance)
     */
    public function scopeFuzzySearch(Builder $query, string $term, string $field, int $distance = 2): Builder
    {
        if (empty($term)) {
            return $query;
        }

        return $query->where(function ($q) use ($term, $field, $distance) {
            $words = explode(' ', $term);

            foreach ($words as $word) {
                if (strlen($word) < 3) {
                    continue;
                }

                $q->orWhere($field, 'LIKE', "%{$word}%");
            }
        });
    }
}

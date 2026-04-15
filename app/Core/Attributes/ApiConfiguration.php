<?php

namespace App\Core\Attributes;

use Attribute;

/**
 * An attribute to define the API configuration for a model directly on the class.
 * This provides a structured and discoverable way to set API behaviors like
 * searching, filtering, sorting, and caching.
 */
#[Attribute(Attribute::TARGET_CLASS)]
class ApiConfiguration
{
    /**
     * @param string[] $searchableFields Fields for global search.
     * @param string[]|array<string, array> $filterableFields Fields available for filtering.
     * @param string[] $sortableFields Fields available for sorting.
     * @param string[] $allowedIncludes Allowed relationships to be included.
     * @param int|null $cacheTtl Cache Time-To-Live in seconds. 0 to disable.
     * @param string $defaultSortField Default field to sort by.
     * @param string $defaultSortDirection Default sort direction ('asc' or 'desc').
     */
    public function __construct(
        public array $searchableFields = [],
        public array $filterableFields = [],
        public array $sortableFields = ['id', 'created_at'],
        public array $allowedIncludes = [],
        public ?int $cacheTtl = 300, // Default 5 minutes
        public string $defaultSortField = 'id',
        public string $defaultSortDirection = 'asc'
    ) {}
}

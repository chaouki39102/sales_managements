<?php

namespace App\Core\Pagination;

use Illuminate\Pagination\Paginator;
use Illuminate\Support\Collection;

/**
 * Keyset (cursor) pagination result.
 *
 * Extends Illuminate\Pagination\Paginator so the whole Laravel resource
 * pipeline (Resource::collection(), ApiResponders envelope) treats it exactly
 * like a simple paginator — but NO COUNT(*) is ever executed:
 * the page boundary is found by `WHERE <column> > <cursor> ORDER BY <column>
 * ASC LIMIT per_page + 1`. Because <column> is unique (id), ordering is
 * deterministic and pages never shift when rows are inserted between requests.
 *
 * `nextCursor()` exposes a stable cursor for "load more" UIs; ApiResponders
 * reads it into meta.next_cursor / meta.has_more.
 */
class KeysetPaginator extends Paginator
{
    /** Cursor of the current page (0 = first page). */
    protected int $cursor = 0;

    /** Cursor value to pass for the next page (0 = no more rows). */
    protected int $nextCursor = 0;

    /**
     * @param  array  $items  page items already sliced to $perPage (may include the +1 probe row)
     * @param  int  $perPage
     * @param  int  $cursor  current cursor (0 = first page)
     * @param  int  $nextCursor  cursor to request next (0 when $hasMore is false)
     * @param  bool  $hasMore
     * @param  string  $path
     */
    public function __construct(array $items, int $perPage, int $cursor, int $nextCursor, bool $hasMore, string $path = '')
    {
        $this->cursor     = $cursor;
        $this->nextCursor = $hasMore ? $nextCursor : 0;
        $this->hasMore    = $hasMore;

        parent::__construct($items, $perPage, $cursor > 0 ? 2 : 1, ['path' => $path]);
    }

    /** Cursor value to pass for the next page (0 = no more rows). */
    public function nextCursor(): int
    {
        return $this->nextCursor;
    }

    /** Cursor of the current page (0 = first page). */
    public function cursor(): int
    {
        return $this->cursor;
    }

    /**
     * Do not recompute hasMore from the item count — the caller already
     * fetched perPage + 1 rows and decided the boundary; keep the given flag.
     */
    protected function setItems($items)
    {
        $this->items = $items instanceof Collection ? $items : new Collection($items);
        $this->items = $this->items->slice(0, $this->perPage);
    }
}

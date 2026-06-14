<?php

namespace App\Core\Traits;

use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Support\Facades\DB;

/**
 * ResolvesFiscalYear
 * ══════════════════════════════════════════════════════════════════
 * Shared by InventoryStockService and PartyBalanceService.
 * Single source of truth for fiscal year resolution logic.
 *
 * Resolution order:
 *   1. Exact: start_date <= $date <= end_date
 *   2. Fallback: closest year with start_date <= $date
 *      (covers dates after the last fiscal year or in a gap)
 *   3. Neither → BusinessRuleException (no silent zero)
 * ══════════════════════════════════════════════════════════════════
 */
trait ResolvesFiscalYear
{
    public function resolveFiscalYearId(int $companyId, string $date): int
    {
        $id = DB::table('fiscal_years')
            ->where('company_id', $companyId)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date',   '>=', $date)
            ->value('id');

        if ($id) return $id;

        $id = DB::table('fiscal_years')
            ->where('company_id', $companyId)
            ->whereDate('start_date', '<=', $date)
            ->orderByDesc('start_date')
            ->value('id');

        if ($id) return $id;

        throw new BusinessRuleException(
            "لا توجد سنة مالية تغطي أو تسبق التاريخ {$date}.",
            422
        );
    }
}

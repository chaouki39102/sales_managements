<?php

namespace App\Services\Reports\Concerns;

use App\Services\CompanyContextService;
use Illuminate\Support\Facades\DB;

/**
 * Shared constants and query helpers for the report classes behind
 * App\Services\ReportService (moved verbatim from that class).
 */
trait ReportQueryHelpers
{
    private const SALE_CODES = ['FV', 'AV', 'POS'];
    private const PURCHASE_CODES = ['FA', 'AA'];
    private const AR_MONTHS = ['ط¬ط§ظ†ظپظٹ', 'ظپظٹظپط±ظٹ', 'ظ…ط§ط±ط³', 'ط£ظپط±ظٹظ„', 'ظ…ط§ظٹ', 'ط¬ظˆط§ظ†', 'ط¬ظˆظٹظ„ظٹط©', 'ط£ظˆطھ', 'ط³ط¨طھظ…ط¨ط±', 'ط£ظƒطھظˆط¨ط±', 'ظ†ظˆظپظ…ط¨ط±', 'ط¯ظٹط³ظ…ط¨ط±'];

    private function companyId(): int
    {
        return (int) app(CompanyContextService::class)->get();
    }

    private function canViewCost(): bool
    {
        return (bool) auth()->user()?->can('view_cost_price');
    }

    /**
     * ظٹط±ظپظ‚ ط£ط³ط·ط± ظƒظ„ ظˆط«ظٹظ‚ط© (طھظپط§طµظٹظ„ ط§ظ„طھظپط§طµظٹظ„) ط¨ظ‚ط§ط¦ظ…ط© ط§ظ„ظˆط«ط§ط¦ظ‚ ط§ظ„ظ…ط¨ظ†ظٹط© ظ…ط³ط¨ظ‚ط§ظ‹.
     * ظٹط³طھط®ط¯ظ… ظ„ط¥ط¸ظ‡ط§ط± طھظپط§طµظٹظ„ ظ‚ط§ط¨ظ„ط© ظ„ظ„ط·ظٹ ظپظٹ طھظ‚ط§ط±ظٹط± ط§ظ„ظ…ط¨ظٹط¹ط§طھ/ط§ظ„ظ…ط´طھط±ظٹط§طھ/ط§ظ„ط¥ط±ط¬ط§ط¹ط§طھ/ط§ظ„ظٹظˆظ…ظٹ.
     */
    private function attachDocumentLines(array $docsArray, \Illuminate\Support\Collection $documents): array
    {
        $docIds = $documents->pluck('id');
        $linesByDoc = collect();
        if ($docIds->isNotEmpty()) {
            $linesByDoc = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.commercial_document_id',
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    'cdl.quantity',
                    'cdl.unit_price_ht',
                    'cdl.discount_percentage',
                    'cdl.discount_amount',
                    'cdl.discount_amount_per_unit',
                    'cdl.total_discount_amount',
                    'cdl.tva_rate',
                    'cdl.total_ht',
                    'cdl.total_tva',
                    'cdl.total_ttc',
                    'cdl.packaging_units_snapshot'
                )
                ->orderBy('cdl.id')
                ->get()
                ->groupBy('commercial_document_id');
        }

        return array_map(function ($doc) use ($linesByDoc) {
            $doc['lines'] = ($linesByDoc->get($doc['id']) ?? collect())
                ->map(fn($l) => [
                    'product_id'          => $l->product_id,
                    'product_name'        => $l->product_name,
                    'product_ref'         => $l->product_ref,
                    'quantity'            => (float) $l->quantity,
                    'unit_price_ht'       => round((float) $l->unit_price_ht, 2),
                    'discount_percentage' => (float) $l->discount_percentage,
                    'discount_amount'     => (float) $l->discount_amount,
                    'discount_amount_per_unit' => (float) $l->discount_amount_per_unit,
                    'total_discount_amount'    => round((float) $l->total_discount_amount, 2),
                    'tva_rate'            => (float) $l->tva_rate,
                    'total_ht'            => round((float) $l->total_ht, 2),
                    'total_tva'           => round((float) $l->total_tva, 2),
                    'total_ttc'           => round((float) $l->total_ttc, 2),
                    'pack_qty'            => $l->packaging_units_snapshot ? (float) $l->packaging_units_snapshot : null,
                ])->values()->toArray();
            return $doc;
        }, $docsArray);
    }
}

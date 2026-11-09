<?php

namespace App\Services\Reports;

use App\Services\Reports\Concerns\ReportQueryHelpers;
use Illuminate\Support\Facades\DB;

/**
 * Party x product sales/purchase matrix and its cell detail.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class MatrixReports
{
    use ReportQueryHelpers;

    /**
     * طھظ‚ط±ظٹط± ط§ظ„ظ…طµظپظˆظپط©: طµظپظˆظپ = ط£ط·ط±ط§ظپ (ط²ط¨ط§ط¦ظ† ط£ظˆ ظ…ظˆط±ط¯ظˆظ†)طŒ ط£ط¹ظ…ط¯ط© = ظ…ظ†طھط¬ط§طھ.
     * ظƒظ„ ط®ظ„ظٹط© = ط§ظ„ظƒظ…ظٹط© / HT / TTC / ط§ظ„طھظƒظ„ظپط© ظ„ظ„ط²ظˆط¬ (ط·ط±ظپ أ— ظ…ظ†طھط¬).
     * ط§ظ„ط¥ط±ط¬ط§ط¹ط§طھ (AV/AA) طھظڈط­طھط³ط¨ ط¨ظ‚ظٹظ…ط© ط³ط§ظ„ط¨ط© ظپظٹ ط§ظ„ط®ظ„ظٹط©.
     *
     * @param string $mode 'sale' â†’ ط²ط¨ط§ط¦ظ† (SALE_CODES) طŒ 'purchase' â†’ ظ…ظˆط±ط¯ظˆظ† (PURCHASE_CODES)
     */
    public function matrixReport(array $filters = [], string $mode = 'sale'): array
    {
        $companyId    = $this->companyId();
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $fromDate     = $filters['from_date'] ?? null;
        $toDate       = $filters['to_date'] ?? null;
        $familyId     = $filters['family_id'] ?? null;
        $brandId      = $filters['brand_id'] ?? null;

        $isSale    = $mode === 'sale';
        $docCodes  = $isSale ? self::SALE_CODES : self::PURCHASE_CODES;
        $partyType = $isSale ? 1 : 2;

        $query = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt',       'dt.id', '=', 'cd.document_type_id')
            ->join('parties as pt',              'pt.id', '=', 'cd.party_id')
            ->leftJoin('products as p',          'p.id',  '=', 'cdl.product_id')
            ->where('cd.company_id', $companyId)
            ->where('pt.party_type_id', $partyType)
            ->whereIn('dt.code', $docCodes)
            ->whereNull('cd.deleted_at')
            ->whereNull('pt.deleted_at');

        if ($fiscalYearId) $query->where('cd.fiscal_year_id', $fiscalYearId);
        if ($fromDate)     $query->whereDate('cd.document_date', '>=', $fromDate);
        if ($toDate)       $query->whereDate('cd.document_date', '<=', $toDate);
        // فلاتر العائلة/العلامة تنطبق على المنتجات الكتالوجية فقط
        if ($familyId)     $query->where('p.family_id', $familyId);
        if ($brandId)      $query->where('p.brand_id', $brandId);

        $sign = "CASE WHEN dt.code IN ('AV', 'AA') THEN -1 ELSE 1 END";

        $rows = $query->select(
            'cd.party_id',
            'pt.name as party_name',
            'pt.code as party_code',
            'cdl.product_id',
            DB::raw("MAX(CASE WHEN cdl.product_id IS NULL THEN cdl.description ELSE NULL END) as manual_description"),
            'p.name as product_name',
            'p.ref as product_ref',
            DB::raw("SUM({$sign} * cdl.quantity) as qty"),
            DB::raw("SUM({$sign} * cdl.total_ht)  as ht"),
            DB::raw("SUM({$sign} * cdl.total_ttc) as ttc"),
            DB::raw("SUM({$sign} * cdl.quantity * cdl.cost_price_ht) as cost")
        )
            ->groupBy(
                'cd.party_id', 'pt.name', 'pt.code',
                'cdl.product_id', 'p.name', 'p.ref',
                DB::raw("CASE WHEN cdl.product_id IS NULL THEN COALESCE(cdl.description, '') ELSE '' END")
            )
            ->get();

        $partyMap   = [];
        $productMap = [];

        foreach ($rows as $r) {
            $partyId  = $r->party_id;
            $isManual = $r->product_id === null || $r->product_id === '';
            $manualName = $isManual
                ? (trim((string) ($r->manual_description ?? '')) ?: 'منتج يدوي')
                : null;
            // معرّف سلبي ثابت مشتق من الوصف ليبقى مفتاح الخلية/العمود مستقراً
            $prodId   = $isManual
                ? - (abs(crc32($manualName)) ?: 1)
                : (int) $r->product_id;
            $prodName = $isManual ? $manualName : ($r->product_name ?? '—');
            $prodRef  = $isManual ? 'يدوي' : ($r->product_ref ?? '—');
            $qty      = (float) $r->qty;
            $ht       = (float) $r->ht;
            $ttc      = (float) $r->ttc;
            $cost     = (float) $r->cost;

            if (!isset($partyMap[$partyId])) {
                $partyMap[$partyId] = [
                    'id'          => $partyId,
                    'name'        => $r->party_name,
                    'code'        => $r->party_code,
                    'total_qty'   => 0.0,
                    'total_ht'    => 0.0,
                    'total_ttc'   => 0.0,
                    'total_cost'  => 0.0,
                    'total_margin'=> 0.0,
                    'cells'       => [],
                ];
            }
            if (!isset($productMap[$prodId])) {
                $productMap[$prodId] = [
                    'id'          => $prodId,
                    'is_manual'   => $isManual,
                    'name'        => $prodName,
                    'ref'         => $prodRef,
                    'total_qty'   => 0.0,
                    'total_ht'    => 0.0,
                    'total_ttc'   => 0.0,
                    'total_cost'  => 0.0,
                    'total_margin'=> 0.0,
                ];
            }

            $partyMap[$partyId]['cells'][$prodId] = [
                'qty'  => $qty,
                'ht'   => $ht,
                'ttc'  => $ttc,
                'cost' => $cost,
            ];

            $partyMap[$partyId]['total_qty']  += $qty;
            $partyMap[$partyId]['total_ht']   += $ht;
            $partyMap[$partyId]['total_ttc']  += $ttc;
            $partyMap[$partyId]['total_cost'] += $cost;
            $partyMap[$partyId]['total_margin'] = $partyMap[$partyId]['total_ht'] - $partyMap[$partyId]['total_cost'];

            $productMap[$prodId]['total_qty']  += $qty;
            $productMap[$prodId]['total_ht']   += $ht;
            $productMap[$prodId]['total_ttc']  += $ttc;
            $productMap[$prodId]['total_cost'] += $cost;
            $productMap[$prodId]['total_margin'] = $productMap[$prodId]['total_ht'] - $productMap[$prodId]['total_cost'];
        }

        $parties = array_values($partyMap);
        foreach ($parties as &$p) {
            $p['total_qty']    = round($p['total_qty'], 3);
            $p['total_ht']     = round($p['total_ht'], 2);
            $p['total_ttc']    = round($p['total_ttc'], 2);
            $p['total_cost']   = round($p['total_cost'], 2);
            $p['total_margin'] = round($p['total_margin'], 2);
            $p['cells']        = array_map(fn($c) => [
                'qty'  => round($c['qty'], 3),
                'ht'   => round($c['ht'], 2),
                'ttc'  => round($c['ttc'], 2),
                'cost' => round($c['cost'], 2),
            ], $p['cells']);
        }
        unset($p);

        $products = array_values($productMap);
        foreach ($products as &$pr) {
            $pr['total_qty']    = round($pr['total_qty'], 3);
            $pr['total_ht']     = round($pr['total_ht'], 2);
            $pr['total_ttc']    = round($pr['total_ttc'], 2);
            $pr['total_cost']   = round($pr['total_cost'], 2);
            $pr['total_margin'] = round($pr['total_margin'], 2);
        }
        unset($pr);

        // طھط±طھظٹط¨: ط§ظ„ط£ط·ط±ط§ظپ ظˆط§ظ„ط£ط¹ظ…ط¯ط© ط­ط³ط¨ ط¥ط¬ظ…ط§ظ„ظٹ HT طھظ†ط§ط²ظ„ظٹط§ظ‹ (ط§ظ„ط£ظƒط«ط± ظ…ط¨ظٹط¹ط§ظ‹ ط£ظˆظ„ط§ظ‹)
        usort($parties,  fn($a, $b) => $b['total_ht'] <=> $a['total_ht']);
        usort($products, fn($a, $b) => $b['total_ht'] <=> $a['total_ht']);

        return [
            'mode'     => $mode,
            'parties'  => $parties,
            'products' => $products,
            'summary'  => [
                'party_count'   => count($parties),
                'product_count' => count($products),
                'total_qty'     => round(array_sum(array_column($parties, 'total_qty')), 3),
                'total_ht'      => round(array_sum(array_column($parties, 'total_ht')), 2),
                'total_ttc'     => round(array_sum(array_column($parties, 'total_ttc')), 2),
                'total_cost'    => round(array_sum(array_column($parties, 'total_cost')), 2),
                'total_margin'  => round(array_sum(array_column($parties, 'total_margin')), 2),
            ],
        ];
    }

    /**
     * طھظپط§طµظٹظ„ ط®ظ„ظٹط© ط§ظ„ظ…طµظپظˆظپط©: ط§ظ„ظˆط«ط§ط¦ظ‚ ط§ظ„ظپط¹ظ„ظٹط© ظ„ط²ظˆط¬ (ط·ط±ظپ أ— ظ…ظ†طھط¬) ط¶ظ…ظ† ط§ظ„ظپطھط±ط©.
     * طھظڈط³طھط®ط¯ظ… ظپظٹ "ط§ظ„طھظ†ظ‚ظٹط¨" ط¹ظ†ط¯ ط§ظ„ظ†ظ‚ط± ط¹ظ„ظ‰ ط®ظ„ظٹط© ظپظٹ طھظ‚ط±ظٹط± ط§ظ„ظ…طµظپظˆظپط©.
     */
    public function matrixDetail(array $filters = []): array
    {
        $companyId    = $this->companyId();
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $mode         = $filters['mode'] ?? 'sale';
        $partyId      = $filters['party_id'] ?? null;
        $productId    = $filters['product_id'] ?? null;
        $fromDate     = $filters['from_date'] ?? null;
        $toDate       = $filters['to_date'] ?? null;

        if (!$partyId || !$productId) {
            return [];
        }

        $docCodes = $mode === 'sale' ? self::SALE_CODES : self::PURCHASE_CODES;
        $sign     = "CASE WHEN dt.code IN ('AV', 'AA') THEN -1 ELSE 1 END";

        $query = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt',       'dt.id', '=', 'cd.document_type_id')
            ->where('cd.company_id', $companyId)
            ->where('cd.party_id', $partyId)
            ->where('cdl.product_id', $productId)
            ->whereIn('dt.code', $docCodes)
            ->whereNull('cd.deleted_at');

        if ($fiscalYearId) $query->where('cd.fiscal_year_id', $fiscalYearId);
        if ($fromDate)     $query->whereDate('cd.document_date', '>=', $fromDate);
        if ($toDate)       $query->whereDate('cd.document_date', '<=', $toDate);

        $rows = $query->select(
            'cd.id',
            'cd.document_number',
            'cd.document_date',
            'dt.name as type_name',
            'dt.code as type_code',
            'cdl.quantity',
            'cdl.unit_price_ht',
            'cdl.total_ht',
            'cdl.total_ttc',
            'cdl.cost_price_ht',
            DB::raw("{$sign} * cdl.quantity as signed_qty"),
            DB::raw("{$sign} * cdl.total_ht as signed_ht"),
            DB::raw("{$sign} * cdl.total_ttc as signed_ttc"),
            DB::raw("{$sign} * cdl.quantity * cdl.cost_price_ht as signed_cost")
        )
            ->orderBy('cd.document_date', 'asc')
            ->orderBy('cd.id', 'asc')
            ->get();

        return $rows->map(fn($r) => [
            'id'              => $r->id,
            'document_number' => $r->document_number,
            'document_date'   => $r->document_date,
            'type_name'       => $r->type_name,
            'type_code'       => $r->type_code,
            'quantity'        => round((float) $r->signed_qty, 3),
            'unit_price_ht'   => round((float) $r->unit_price_ht, 4),
            'total_ht'        => round((float) $r->signed_ht, 2),
            'total_ttc'       => round((float) $r->signed_ttc, 2),
            'cost_ht'         => round((float) $r->signed_cost, 2),
            'margin_value'    => round((float) $r->signed_ht - (float) $r->signed_cost, 2),
        ])->toArray();
    }
}

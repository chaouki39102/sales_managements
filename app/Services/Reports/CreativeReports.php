<?php

namespace App\Services\Reports;

use App\Models\CommercialDocument;
use App\Models\Party;
use App\Models\Payment;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * The "creative" analytics overview report.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class CreativeReports
{
    use ReportQueryHelpers;

    public function creativeReport(array $filters = []): array
    {
        $companyId     = $this->companyId();
        $fiscalYearId  = $filters['fiscal_year_id'] ?? null;
        $from          = $filters['from_date'] ?? null;
        $to            = $filters['to_date']   ?? null;

        if ($fiscalYearId && (!$from || !$to)) {
            $fy = \App\Models\FiscalYear::find($fiscalYearId);
            if ($fy) {
                $from = $from ?? $fy->start_date;
                $to   = $to   ?? $fy->end_date;
            }
        }
        $from = $from ?: now()->startOfYear()->toDateString();
        $to   = $to   ?: now()->toDateString();

        $salesQuery = CommercialDocument::with(['documentType', 'party'])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES))
            ->whereDate('document_date', '>=', $from)
            ->whereDate('document_date', '<=', $to);
        $salesDocs = $salesQuery->get();

        $purchasesQuery = CommercialDocument::with(['documentType', 'party'])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::PURCHASE_CODES))
            ->whereDate('document_date', '>=', $from)
            ->whereDate('document_date', '<=', $to);
        $purchasesDocs = $purchasesQuery->get();

        // ظ…ط¬ظ…ظˆط¹ ظ…ظˆظ‚ظ‘ط¹: ط§ظ„ط¥ط±ط¬ط§ط¹ط§طھ (AV/AA) ط¨ط³ط§ظ„ط¨
        $signedSum = fn($docs, string $negateCode, string $field) => $docs->reduce(
            fn($sum, $d) => $sum + ($d->documentType?->code === $negateCode ? -$d->{$field} : $d->{$field}),
            0
        );

        $totalSalesHt  = $signedSum($salesDocs, 'AV', 'total_ht');
        $totalSalesTva = $signedSum($salesDocs, 'AV', 'total_tva');
        $totalSalesTtc = $signedSum($salesDocs, 'AV', 'total_ttc');
        $totalPurchasesHt  = $signedSum($purchasesDocs, 'AA', 'total_ht');
        $totalPurchasesTva = $signedSum($purchasesDocs, 'AA', 'total_tva');
        $totalPurchasesTtc = $signedSum($purchasesDocs, 'AA', 'total_ttc');

        $saleReturns    = $salesDocs->filter(fn($d) => $d->documentType?->code === 'AV');
        $purchaseReturns = $purchasesDocs->filter(fn($d) => $d->documentType?->code === 'AA');

        // â”€â”€ طھظƒظ„ظپط© ط§ظ„ظ…ط¨ظٹط¹ط§طھ (ظƒظ„ ط§ظ„ط£ط³ط·ط±طŒ ظˆظ„ظٹط³ ط£ظپط¶ظ„ 10 ظپظ‚ط·) + ط£ظپط¶ظ„ 10 ظ…ظ†طھط¬ط§طھ â”€â”€
        $salesIds = $salesDocs->pluck('id');
        $totalSalesCost = 0.0;
        $productMargin = [];

        if ($salesIds->isNotEmpty()) {
            $costAgg = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $companyId)
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->selectRaw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost")
                ->first();
            $totalSalesCost = (float) ($costAgg->total_cost ?? 0);

            $lineData = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $companyId)
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->select(
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) - SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_margin")
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_margin')
                ->limit(10)
                ->get();

            foreach ($lineData as $ld) {
                $ht = (float) $ld->total_ht;
                $cost = (float) $ld->total_cost;
                $margin = (float) $ld->total_margin;
                $productMargin[] = [
                    'product_name'  => $ld->product_name,
                    'product_ref'   => $ld->product_ref,
                    'total_qty'     => (float) $ld->total_qty,
                    'total_ht'      => round($ht, 2),
                    'total_cost'    => round($cost, 2),
                    'margin_value'  => round($margin, 2),
                    'margin_pct'    => $ht > 0 ? round($margin / $ht * 100, 2) : 0,
                ];
            }
        }

        // â”€â”€ ط£ظپط¶ظ„ ط§ظ„ط²ط¨ط§ط¦ظ† / ط§ظ„ظ…ظˆط±ط¯ظٹظ† (ظƒظ„ ط§ظ„ظˆط«ط§ط¦ظ‚طŒ ظ…ظˆظ‚ظ‘ط¹ط© ط­ط³ط¨ ط§ظ„ط¥ط±ط¬ط§ط¹) â”€â”€
        $topCustomers = $this->topParties($salesDocs, 'AV', 10);
        $topSuppliers = $this->topParties($purchasesDocs, 'AA', 10);

        // â”€â”€ ط§ظ„ظ…طµط§ط±ظٹظپ: ط§ظ„ط¥ط¬ظ…ط§ظ„ظٹ + ط§ظ„طھظˆط²ظٹط¹ ط­ط³ط¨ ط§ظ„طھطµظ†ظٹظپ â”€â”€
        $expenseRows = DB::table('expenses as e')
            ->whereNull('e.deleted_at')
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
            ->where('e.company_id', $companyId)
            ->whereBetween('e.date', [$from, $to])
            ->select('e.date', 'e.amount', 'ec.name as category_name')
            ->orderBy('e.date', 'desc')
            ->get();
        $expensesTotal = (float) $expenseRows->sum('amount');
        $expensesCount = $expenseRows->count();
        $expensesByCategory = $expenseRows
            ->groupBy('category_name')
            ->map(fn($rows, $cat) => [
                'category_name' => $cat === '' || $cat === null ? 'ط؛ظٹط± ظ…طµظ†ظپ' : $cat,
                'total'         => round((float) $rows->sum('amount'), 2),
                'count'         => $rows->count(),
            ])
            ->sortByDesc('total')
            ->take(5)
            ->values()
            ->toArray();

        // â”€â”€ ط§ظ„ط¯ظپط¹ط§طھ: ظ…ظ‚ط¨ظˆط¶ / ظ…ط¯ظپظˆط¹ â”€â”€
        $paymentsQuery = Payment::where('status', 'confirmed')
            ->whereBetween('payment_date', [$from, $to]);
        $paymentsIn  = (float) (clone $paymentsQuery)->where('direction', 'in')->sum('amount');
        $paymentsOut = (float) (clone $paymentsQuery)->where('direction', 'out')->sum('amount');

        $totalReceivable = (float) $salesDocs->sum('remaining_amount');
        $totalPayable    = (float) $purchasesDocs->sum('remaining_amount');
        $totalSalesMargin = round($totalSalesHt - $totalSalesCost, 2);
        $netProfit        = round($totalSalesMargin - $expensesTotal, 2);

        // â”€â”€ ط§ظ„ط§طھط¬ط§ظ‡ ط§ظ„ط´ظ‡ط±ظٹ (ظ…ط¨ظٹط¹ط§طھ/ظ…ط´طھط±ظٹط§طھ/ظ…طµط§ط±ظٹظپ/ظ‡ط§ظ…ط´) ظ…ط¹ ظپط±ط§ط؛ط§طھ ظ…ط¹ط¨ظ‘ط£ط© â”€â”€
        $trend = [];
        $cursor = Carbon::parse($from)->startOfMonth();
        $trendEnd = Carbon::parse($to)->startOfMonth();
        while ($cursor->lte($trendEnd)) {
            $key = $cursor->format('Y-m');
            $trend[$key] = [
                'month'        => $key,
                'label'        => self::AR_MONTHS[$cursor->month - 1] ?? $key,
                'sales_ht'     => 0.0,
                'purchases_ht' => 0.0,
                'margin'       => 0.0,
                'expenses'     => 0.0,
            ];
            $cursor->addMonth();
        }
        foreach ($salesDocs as $d) {
            $k = $d->document_date?->format('Y-m');
            if ($k && isset($trend[$k])) {
                $trend[$k]['sales_ht'] += $d->documentType?->code === 'AV' ? -$d->total_ht : $d->total_ht;
            }
        }
        foreach ($purchasesDocs as $d) {
            $k = $d->document_date?->format('Y-m');
            if ($k && isset($trend[$k])) {
                $trend[$k]['purchases_ht'] += $d->documentType?->code === 'AA' ? -$d->total_ht : $d->total_ht;
            }
        }
        foreach ($expenseRows as $e) {
            $k = substr((string) $e->date, 0, 7);
            if (isset($trend[$k])) {
                $trend[$k]['expenses'] += (float) $e->amount;
            }
        }
        $monthlyCost = [];
        if ($salesIds->isNotEmpty()) {
            $monthlyCost = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $companyId)
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->selectRaw("substr(cd.document_date, 1, 7) as month, SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as cost")
                ->groupBy('month')
                ->pluck('cost', 'month');
        }
        $trend = array_map(function ($t) use ($monthlyCost) {
            $cost = (float) ($monthlyCost[$t['month']] ?? 0);
            $t['sales_ht']     = round($t['sales_ht'], 2);
            $t['purchases_ht'] = round($t['purchases_ht'], 2);
            $t['margin']       = round($t['sales_ht'] - $cost, 2);
            $t['expenses']     = round($t['expenses'], 2);
            return $t;
        }, array_values($trend));

        return [
            'overview' => [
                'total_sales_ht'       => round($totalSalesHt, 2),
                'total_sales_tva'      => round($totalSalesTva, 2),
                'total_sales_ttc'      => round($totalSalesTtc, 2),
                'total_sales_cost'     => round($totalSalesCost, 2),
                'total_sales_margin'   => $totalSalesMargin,
                'sales_margin_pct'     => $totalSalesHt > 0 ? round($totalSalesMargin / $totalSalesHt * 100, 2) : 0,
                'total_purchases_ht'   => round($totalPurchasesHt, 2),
                'total_purchases_tva'  => round($totalPurchasesTva, 2),
                'total_purchases_ttc'  => round($totalPurchasesTtc, 2),
                'total_payments_in'    => round($paymentsIn, 2),
                'total_payments_out'   => round($paymentsOut, 2),
                'total_receivable'     => round($totalReceivable, 2),
                'total_payable'        => round($totalPayable, 2),
                'sales_count'          => $salesDocs->count(),
                'purchases_count'      => $purchasesDocs->count(),
                'unpaid_sales_count'   => $salesDocs->where('remaining_amount', '>', 0.01)->count(),
                'sale_returns_count'   => $saleReturns->count(),
                'purchase_returns_count' => $purchaseReturns->count(),
                'returns_ht'           => round($saleReturns->sum('total_ht') + $purchaseReturns->sum('total_ht'), 2),
                'returns_ttc'          => round($saleReturns->sum('total_ttc') + $purchaseReturns->sum('total_ttc'), 2),
                'expenses_total'       => round($expensesTotal, 2),
                'expenses_count'       => $expensesCount,
                'net_profit'           => $netProfit,
                'net_profit_pct'       => $totalSalesHt > 0 ? round($netProfit / $totalSalesHt * 100, 2) : 0,
                'tva_collected'        => round($totalSalesTva, 2),
                'tva_deductible'       => round($totalPurchasesTva, 2),
                'tva_balance'          => round($totalSalesTva - $totalPurchasesTva, 2),
            ],
            'top_products'    => $productMargin,
            'top_customers'   => $topCustomers,
            'top_suppliers'   => $topSuppliers,
            'expenses_by_category' => $expensesByCategory,
            'trend'           => $trend,
            'cash_flow'       => [
                'collected'         => round($paymentsIn, 2),
                'paid_out'          => round($paymentsOut, 2),
                'net_cash'          => round($paymentsIn - $paymentsOut, 2),
                'outstanding'       => round($totalReceivable, 2),
                'collection_rate'   => $totalSalesTtc > 0 ? round($paymentsIn / $totalSalesTtc * 100, 2) : 0,
            ],
        ];
    }

    /**
     * ط£ظپط¶ظ„ ط§ظ„ط£ط·ط±ط§ظپ ط­ط³ط¨ ط§ظ„ظ‚ظٹظ…ط©طŒ ظ…ظˆظ‚ظ‘ط¹ط© ط­ط³ط¨ ظƒظˆط¯ ط§ظ„ط¥ط±ط¬ط§ط¹ (AV/AA).
     */
    private function topParties(\Illuminate\Support\Collection $docs, string $negateCode, int $limit = 10): array
    {
        $grouped = $docs->groupBy('party_id')->map(function ($group, $pid) use ($negateCode) {
            $ht = $group->reduce(fn($s, $d) => $s + ($d->documentType?->code === $negateCode ? -$d->total_ht : $d->total_ht), 0);
            $ttc = $group->reduce(fn($s, $d) => $s + ($d->documentType?->code === $negateCode ? -$d->total_ttc : $d->total_ttc), 0);
            return [
                'party_id'  => (int) $pid,
                'total_ht'  => round($ht, 2),
                'total_ttc' => round($ttc, 2),
                'doc_count' => $group->count(),
            ];
        });

        $sorted = $grouped->sortByDesc('total_ttc')->take($limit);
        $partyIds = $sorted->pluck('party_id')->filter()->unique();
        $partiesMap = Party::whereIn('id', $partyIds)->get()->keyBy('id');

        return $sorted->map(function ($row) use ($partiesMap) {
            $party = $partiesMap->get($row['party_id']);
            return [
                'party_name' => $party?->name ?? 'â€”',
                'total_ht'   => $row['total_ht'],
                'total_ttc'  => $row['total_ttc'],
                'doc_count'  => $row['doc_count'],
            ];
        })->values()->toArray();
    }
}

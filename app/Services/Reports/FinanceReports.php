<?php

namespace App\Services\Reports;

use App\Models\CommercialDocument;
use App\Models\Payment;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Financial reports: monthly, payments, taxes, P&L, cash flow and expenses.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class FinanceReports
{
    use ReportQueryHelpers;

    /**
     * ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ط´ظ‡ط±ظٹ: طµط§ظپظٹ ط§ظ„طھط¯ظپظ‚ (ظ†ظ‚ط¯ظٹ طھظ‚ط±ظٹط¨ظٹ) = ظ…ط¨ظٹط¹ط§طھ ط§ظ„ط´ظ‡ط± âˆ’ ظ…ط´طھط±ظٹط§طھ ط§ظ„ط´ظ‡ط±طŒ
     * ظ…ط¬ظ…ظ‘ط¹ط© ط´ظ‡ط±ط§ظ‹ ط¨ط´ظ‡ط± ط¶ظ…ظ† ط§ظ„ظپطھط±ط© ط§ظ„ظ…ط¹ط·ط§ط© (AV/AA ط¨ط¥ط´ط§ط±ط© ط³ط§ظ„ط¨ط©).
     */
    public function monthlyReport(array $filters = []): array
    {
        $fyId = $filters['fiscal_year_id'] ?? null;
        $from = $filters['from_date'] ?? null;
        $to   = $filters['to_date']   ?? null;

        if ($fyId && (!$from || !$to)) {
            $fy = \App\Models\FiscalYear::find($fyId);
            if ($fy) {
                $from = $from ?? $fy->start_date;
                $to   = $to   ?? $fy->end_date;
            }
        }

        $salesQ = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->whereNull('cd.deleted_at')
            ->where('cd.company_id', $this->companyId())
            ->whereIn('dt.code', self::SALE_CODES);
        $purchaseQ = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->whereNull('cd.deleted_at')
            ->where('cd.company_id', $this->companyId())
            ->whereIn('dt.code', self::PURCHASE_CODES);

        if ($from) { $salesQ->whereDate('cd.document_date', '>=', $from); $purchaseQ->whereDate('cd.document_date', '>=', $from); }
        if ($to)   { $salesQ->whereDate('cd.document_date', '<=', $to);   $purchaseQ->whereDate('cd.document_date', '<=', $to); }

        $salesRows    = $salesQ->select('cd.document_date', 'dt.code', 'cd.total_ht')->get();
        $purchaseRows = $purchaseQ->select('cd.document_date', 'dt.code', 'cd.total_ht')->get();

        $salesByMonth = [];
        foreach ($salesRows as $r) {
            $m = substr($r->document_date, 0, 7);
            $salesByMonth[$m] = ($salesByMonth[$m] ?? 0) + ($r->code === 'AV' ? -$r->total_ht : $r->total_ht);
        }
        $purchaseByMonth = [];
        foreach ($purchaseRows as $r) {
            $m = substr($r->document_date, 0, 7);
            $purchaseByMonth[$m] = ($purchaseByMonth[$m] ?? 0) + ($r->code === 'AA' ? -$r->total_ht : $r->total_ht);
        }

        $monthly = [];
        if ($from && $to) {
            $start = Carbon::parse($from)->startOfMonth();
            $end   = Carbon::parse($to)->startOfMonth();
            while ($start->lte($end)) {
                $m = $start->format('Y-m');
                $s = round($salesByMonth[$m] ?? 0, 2);
                $p = round($purchaseByMonth[$m] ?? 0, 2);
                $monthly[] = ['month' => $m, 'sales_ht' => $s, 'purchase_ht' => $p, 'diff' => round($s - $p, 2)];
                $start->addMonth();
            }
        } else {
            $months = array_unique(array_merge(array_keys($salesByMonth), array_keys($purchaseByMonth)));
            sort($months);
            foreach ($months as $m) {
                $s = round($salesByMonth[$m] ?? 0, 2);
                $p = round($purchaseByMonth[$m] ?? 0, 2);
                $monthly[] = ['month' => $m, 'sales_ht' => $s, 'purchase_ht' => $p, 'diff' => round($s - $p, 2)];
            }
        }

        return [
            'months'  => $monthly,
            'summary' => [
                'months_count' => count($monthly),
                'total_sales'    => round(array_sum(array_column($monthly, 'sales_ht')), 2),
                'total_purchase' => round(array_sum(array_column($monthly, 'purchase_ht')), 2),
                'total_diff'     => round(array_sum(array_column($monthly, 'diff')), 2),
            ],
        ];
    }

    public function paymentsReport(array $filters = []): array
    {
        $query = Payment::with(['commercialDocuments.documentType', 'paymentMode', 'treasuryAccount']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('payment_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('payment_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['payment_mode_id'])) {
            $query->where('payment_mode_id', $filters['payment_mode_id']);
        }
        if (!empty($filters['fiscal_year_id'])) {
            $query->whereHas('commercialDocuments', fn($q) => $q->where('fiscal_year_id', $filters['fiscal_year_id']));
        }

        $payments = $query->orderBy('payment_date', 'desc')->get();

        return [
            'payments' => $payments->map(fn($payment) => [
                'id'                => $payment->id,
                'payment_date'      => $payment->payment_date?->format('Y-m-d'),
                'amount'            => round($payment->amount, 2),
                'document_number'   => $payment->commercialDocuments->first()?->document_number,
                'document_type'     => $payment->commercialDocuments->first()?->documentType?->code,
                'party_name'        => $payment->party?->name,
                'payment_mode'      => $payment->paymentMode?->name,
                'treasury_account'  => $payment->treasuryAccount?->name,
                'reference'         => $payment->reference,
                'notes'             => $payment->notes,
                'status'            => $payment->status,
            ])->toArray(),
            'by_mode' => $payments->groupBy('paymentMode.name')->map(fn($pms, $name) => [
                'mode'   => $name,
                'count'  => $pms->count(),
                'total'  => round($pms->sum('amount'), 2),
            ])->values()->toArray(),
            'summary' => [
                'total_amount' => round($payments->sum('amount'), 2),
                'count'        => $payments->count(),
            ],
        ];
    }

    public function taxesReport(array $filters = []): array
    {
        $allCodes = array_merge(self::SALE_CODES, self::PURCHASE_CODES);
        $query = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', $allCodes));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }

        $documents = $query->get();

        $salesInvoices = $documents->filter(fn($d) => in_array($d->documentType?->code, self::SALE_CODES));
        $purchaseInvoices = $documents->filter(fn($d) => in_array($d->documentType?->code, self::PURCHASE_CODES));

        $negate = fn($docs, $code, $field) => $docs->reduce(fn($sum, $d) => $sum + ($d->documentType?->code === $code ? -$d->{$field} : $d->{$field}), 0);

        return [
            'sales' => [
                'total_ht'     => round($negate($salesInvoices, 'AV', 'total_ht'), 2),
                'total_tva'    => round($negate($salesInvoices, 'AV', 'total_tva'), 2),
                'total_stamp'  => round($negate($salesInvoices, 'AV', 'total_stamp'), 2),
                'total_ttc'    => round($negate($salesInvoices, 'AV', 'total_ttc'), 2),
                'count'        => $salesInvoices->count(),
            ],
            'purchases' => [
                'total_ht'     => round($negate($purchaseInvoices, 'AA', 'total_ht'), 2),
                'total_tva'    => round($negate($purchaseInvoices, 'AA', 'total_tva'), 2),
                'total_stamp'  => round($negate($purchaseInvoices, 'AA', 'total_stamp'), 2),
                'total_ttc'    => round($negate($purchaseInvoices, 'AA', 'total_ttc'), 2),
                'count'        => $purchaseInvoices->count(),
            ],
            'summary' => [
                'tva_collected'   => round($salesInvoices->sum('total_tva'), 2),
                'tva_deductible'  => round($purchaseInvoices->sum('total_tva'), 2),
                'tva_balance'     => round($salesInvoices->sum('total_tva') - $purchaseInvoices->sum('total_tva'), 2),
            ],
        ];
    }

    public function profitLossReport(array $filters = []): array
    {
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $from = $filters['from_date'] ?? null;
        $to   = $filters['to_date']   ?? null;

        if ($fiscalYearId && (!$from || !$to)) {
            $fy = \App\Models\FiscalYear::find($fiscalYearId);
            if ($fy) {
                $from = $from ?? $fy->start_date;
                $to   = $to   ?? $fy->end_date;
            }
        }

        $salesQuery = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES));
        $purchaseQuery = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', self::PURCHASE_CODES));
        $expenseQuery = DB::table('expenses')->whereNull('deleted_at')->where('company_id', $this->companyId());

        if ($from && $to) {
            $salesQuery->whereBetween('document_date', [$from, $to]);
            $purchaseQuery->whereBetween('document_date', [$from, $to]);
            $expenseQuery->whereBetween('date', [$from, $to]);
        }

        $salesDocs = $salesQuery->get();
        $purchaseDocs = $purchaseQuery->get();

        $salesHt = $salesDocs->reduce(fn($sum, $d) => $sum + ($d->documentType?->code === 'AV' ? -$d->total_ht : $d->total_ht), 0);
        $salesTva = $salesDocs->reduce(fn($sum, $d) => $sum + ($d->documentType?->code === 'AV' ? -$d->total_tva : $d->total_tva), 0);
        $salesTtc = $salesDocs->reduce(fn($sum, $d) => $sum + ($d->documentType?->code === 'AV' ? -$d->total_ttc : $d->total_ttc), 0);

        $purchaseHt = $purchaseDocs->reduce(fn($sum, $d) => $sum + ($d->documentType?->code === 'AA' ? -$d->total_ht : $d->total_ht), 0);
        $purchaseTva = $purchaseDocs->reduce(fn($sum, $d) => $sum + ($d->documentType?->code === 'AA' ? -$d->total_tva : $d->total_tva), 0);

        $salesCost = 0;
        $salesIds = $salesDocs->pluck('id');
        if ($salesIds->isNotEmpty()) {
            $salesCost = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->selectRaw("COALESCE(SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END), 0) as total")
                ->value('total') ?? 0;
        }

        $totalExpenses = $expenseQuery->sum('amount') ?? 0;

        $grossMargin = $salesHt - $salesCost;
        $netResult = $grossMargin - $totalExpenses;

        $expenseByCategory = [];
        if ($from && $to) {
            $expenseByCategory = DB::table('expenses as e')
                ->whereNull('e.deleted_at')
                ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
                ->where('e.company_id', $this->companyId())
                ->whereBetween('e.date', [$from, $to])
                ->select('ec.name as category_name', DB::raw('SUM(e.amount) as total'))
                ->groupBy('ec.name')
                ->get()
                ->toArray();
        }

        return [
            'revenue' => [
                'sales_ht'          => round($salesHt, 2),
                'sales_tva'         => round($salesTva, 2),
                'sales_ttc'         => round($salesTtc, 2),
                'sales_cost'        => round($salesCost, 2),
                'gross_margin'      => round($grossMargin, 2),
                'gross_margin_pct'  => $salesHt > 0 ? round($grossMargin / $salesHt * 100, 2) : 0,
            ],
            'purchases' => [
                'purchase_ht'   => round($purchaseHt, 2),
                'purchase_tva'  => round($purchaseTva, 2),
            ],
            'expenses' => [
                'total_expenses'      => round($totalExpenses, 2),
                'by_category'         => $expenseByCategory,
            ],
            'result' => [
                'gross_margin'  => round($grossMargin, 2),
                'net_result'    => round($netResult, 2),
            ],
        ];
    }

    public function cashFlowReport(array $filters = []): array
    {
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $from = $filters['from_date'] ?? null;
        $to   = $filters['to_date']   ?? null;

        $query = Payment::where('status', 'confirmed');
        if ($fiscalYearId) {
            $query->whereHas('fiscalYear', fn($q) => $q->where('id', $fiscalYearId));
        }
        if ($from) $query->whereDate('payment_date', '>=', $from);
        if ($to)   $query->whereDate('payment_date', '<=', $to);

        $payments = $query->orderBy('payment_date')->get();

        $daily = $payments->groupBy(fn($p) => $p->payment_date?->format('Y-m-d'))
            ->map(fn($pms, $date) => [
                'date'    => $date,
                'count'   => $pms->count(),
                'amount'  => round($pms->sum('amount'), 2),
            ])->values()->toArray();

        $byMode = $payments->groupBy('paymentMode.name')
            ->map(fn($pms, $name) => [
                'mode'   => $name ?? 'ط؛ظٹط± ظ…ط­ط¯ط¯',
                'count'  => $pms->count(),
                'total'  => round($pms->sum('amount'), 2),
            ])->values()->toArray();

        $monthly = $payments->groupBy(fn($p) => $p->payment_date?->format('Y-m'))
            ->map(fn($pms, $month) => [
                'month'  => $month,
                'count'  => $pms->count(),
                'amount' => round($pms->sum('amount'), 2),
            ])->values()->toArray();

        return [
            'daily'   => $daily,
            'monthly' => $monthly,
            'by_mode' => $byMode,
            'summary' => [
                'total_amount'  => round($payments->sum('amount'), 2),
                'count'         => $payments->count(),
                'avg_amount'    => $payments->count() > 0 ? round($payments->sum('amount') / $payments->count(), 2) : 0,
                'days_with_movements' => $daily ? count($daily) : 0,
            ],
        ];
    }

    public function expensesReport(array $filters = []): array
    {
        $companyId = $this->companyId();
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $from = $filters['from_date'] ?? null;
        $to   = $filters['to_date']   ?? null;

        if ($fiscalYearId && (!$from || !$to)) {
            $fy = \App\Models\FiscalYear::find($fiscalYearId);
            if ($fy) {
                $from = $from ?? $fy->start_date;
                $to   = $to   ?? $fy->end_date;
            }
        }

        $query = DB::table('expenses as e')
            ->whereNull('e.deleted_at')
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
            ->where('e.company_id', $companyId);

        if ($from && $to) $query->whereBetween('e.date', [$from, $to]);

        $rows = $query->select(
            'e.id', 'e.expense_number', 'e.date', 'e.amount', 'e.description', 'e.status',
            'ec.name as category_name'
        )->orderBy('e.date', 'desc')->get();

        $byCategoryQb = DB::table('expenses as e')
            ->whereNull('e.deleted_at')
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
            ->where('e.company_id', $companyId)
            ->select('ec.name as category_name', DB::raw('SUM(e.amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('ec.name')
            ->orderByDesc('total');

        if ($from && $to) $byCategoryQb->whereBetween('e.date', [$from, $to]);
        $byCategory = $byCategoryQb->get();

        $monthlyQb = DB::table('expenses')
            ->whereNull('deleted_at')
            ->where('company_id', $companyId)
            // SUBSTR works on MySQL and SQLite (DATE_FORMAT is MySQL-only and made
            // this report throw on the default SQLite install — manifest §2.1).
            ->select(DB::raw("SUBSTR(date, 1, 7) as month"), DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('month')
            ->orderBy('month');
        if ($from && $to) $monthlyQb->whereBetween('date', [$from, $to]);
        $monthly = $monthlyQb->get();

        return [
            'expenses' => $rows->map(fn($r) => [
                'id'             => $r->id,
                'expense_number' => $r->expense_number,
                'date'           => $r->date,
                'amount'         => round((float) $r->amount, 2),
                'category_name'  => $r->category_name,
                'description'    => $r->description,
                'status'         => $r->status,
            ])->toArray(),
            'by_category' => $byCategory->map(fn($r) => [
                'category_name' => $r->category_name ?? 'ط؛ظٹط± ظ…طµظ†ظپ',
                'total'         => round((float) $r->total, 2),
                'count'         => (int) $r->count,
            ])->toArray(),
            'monthly' => $monthly->map(fn($r) => [
                'month'  => $r->month,
                'total'  => round((float) $r->total, 2),
                'count'  => (int) $r->count,
            ])->toArray(),
            'summary' => [
                'total_expenses' => round($rows->sum('amount'), 2),
                'count'          => $rows->count(),
            ],
        ];
    }
}

<?php

namespace App\Services\Reports;

use App\Models\CommercialDocument;
use App\Models\Party;
use App\Services\PartyBalanceService;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Customer / supplier reports: balances, aging and the per-client monthly grid.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class PartyReports
{
    use ReportQueryHelpers;

    public function customersReport(array $filters = []): array
    {
        $partyIdsWithDocs = collect();
        $baseDocsQuery = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->whereNull('cd.deleted_at')
            ->where('cd.company_id', $this->companyId())
            ->whereIn('dt.code', self::SALE_CODES);
        if (!empty($filters['fiscal_year_id'])) {
            $baseDocsQuery->where('cd.fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) {
            $baseDocsQuery->whereDate('cd.document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $baseDocsQuery->whereDate('cd.document_date', '<=', $filters['to_date']);
        }
        $partyIdsWithDocs = $baseDocsQuery->pluck('cd.party_id')->filter()->unique();

        $query = Party::where('party_type_id', 1)->with(['commune', 'wilaya']);
        if ($partyIdsWithDocs->isNotEmpty()) {
            $query->whereIn('id', $partyIdsWithDocs);
        }
        $parties = $query->orderBy('name')->get();

        $partyIds = $parties->pluck('id');
        $partyStats = [];
        $allDocIds = [];
        if ($partyIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_documents as cd')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cd.party_id', $partyIds)
                ->whereIn('dt.code', self::SALE_CODES);
            if (!empty($filters['fiscal_year_id'])) {
                $statsQuery->where('cd.fiscal_year_id', $filters['fiscal_year_id']);
            }
            if (!empty($filters['from_date'])) {
                $statsQuery->whereDate('cd.document_date', '>=', $filters['from_date']);
            }
            if (!empty($filters['to_date'])) {
                $statsQuery->whereDate('cd.document_date', '<=', $filters['to_date']);
            }
            $stats = $statsQuery->select(
                    'cd.party_id',
                    'cd.id as doc_id',
                    DB::raw('COUNT(*) as doc_count'),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cd.total_ht ELSE cd.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cd.total_ttc ELSE cd.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cd.paid_amount ELSE cd.paid_amount END) as total_paid"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cd.remaining_amount ELSE cd.remaining_amount END) as total_remaining")
                )
                ->groupBy('cd.party_id')
                ->get()
                ->keyBy('party_id');

            foreach ($stats as $sid => $s) {
                $partyStats[$sid] = [
                    'doc_count'       => (int) $s->doc_count,
                    'total_ht'        => round((float) $s->total_ht, 2),
                    'total_ttc'       => round((float) $s->total_ttc, 2),
                    'total_paid'      => round((float) $s->total_paid, 2),
                    'total_remaining' => round((float) $s->total_remaining, 2),
                ];
            }

            $allDocIds = DB::table('commercial_documents as cd')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cd.party_id', $partyIds)
                ->whereIn('dt.code', self::SALE_CODES)
                ->pluck('cd.id');
        }

        $totalDiscount = 0;
        $productRecap = [];
        if ($allDocIds->isNotEmpty()) {
            $lineRows = DB::table('commercial_document_lines as cdl')
                ->leftJoin('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $allDocIds)
                ->select(
                    'cdl.product_id',
                    DB::raw("MAX(CASE WHEN cdl.product_id IS NULL THEN cdl.description ELSE NULL END) as manual_description"),
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ttc ELSE cdl.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_discount_amount ELSE cdl.total_discount_amount END) as total_discount")
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref', DB::raw("CASE WHEN cdl.product_id IS NULL THEN COALESCE(cdl.description, '') ELSE '' END"))
                ->orderByDesc('total_ht')
                ->get();

            foreach ($lineRows as $lr) {
                $totalDiscount += (float) $lr->total_discount;
                $isManual = $lr->product_id === null || $lr->product_id === '';
                $name = $isManual
                    ? (trim((string) ($lr->manual_description ?? '')) ?: 'منتج يدوي')
                    : ($lr->product_name ?? '—');
                $ref = $isManual ? 'يدوي' : ($lr->product_ref ?? '—');
                $ht = (float) $lr->total_ht;
                $productRecap[] = [
                    'product_id'     => $lr->product_id !== null ? (int) $lr->product_id : null,
                    'is_manual'      => $isManual,
                    'product_name'   => $name,
                    'product_ref'    => $ref,
                    'total_qty'      => (float) $lr->total_qty,
                    'total_ht'       => round($ht, 2),
                    'total_ttc'      => round((float) $lr->total_ttc, 2),
                    'total_discount' => round((float) $lr->total_discount, 2),
                ];
            }
        }

        // Fetch actual party balances using the authoritative PartyBalanceService
        // (opening_balance + documents - payments), NOT SUM(remaining_amount)
        $balanceDate = !empty($filters['to_date']) ? $filters['to_date'] : now()->toDateString();
        $partyBalanceService = app(PartyBalanceService::class);
        $actualBalances = $partyBalanceService->getAllBalancesAt($balanceDate, 1);
        $balanceMap = collect($actualBalances)->keyBy('party_id');

        return [
            'customers' => $parties->map(function ($party) use ($partyStats, $balanceMap) {
                $stats = $partyStats[$party->id] ?? ['doc_count' => 0, 'total_ht' => 0, 'total_ttc' => 0, 'total_paid' => 0, 'total_remaining' => 0];
                $balance = $balanceMap[$party->id] ?? null;
                return [
                    'id'              => $party->id,
                    'code'            => $party->code,
                    'name'            => $party->name,
                    'activity'        => $party->activity,
                    'phone'           => $party->phone,
                    'email'           => $party->email,
                    'wilaya'          => $party->wilaya?->name,
                    'created_at'      => $party->created_at?->format('Y-m-d'),
                    'doc_count'       => $stats['doc_count'],
                    'total_ht'        => $stats['total_ht'],
                    'total_ttc'       => $stats['total_ttc'],
                    'total_paid'      => $stats['total_paid'],
                    'total_remaining' => $balance ? round((float) $balance['current_balance'], 2) : 0,
                ];
            })->toArray(),
            'product_recap' => $productRecap,
            'summary' => [
                'total_customers'   => $parties->count(),
                'total_ht'          => round(collect($partyStats)->sum('total_ht'), 2),
                'total_ttc'         => round(collect($partyStats)->sum('total_ttc'), 2),
                'total_discount'    => round($totalDiscount, 2),
                'total_remaining'   => round((float) collect($actualBalances)->sum('current_balance'), 2),
            ],
        ];
    }

    public function suppliersReport(array $filters = []): array
    {
        $partyIdsWithDocs = collect();
        $baseDocsQuery = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->whereNull('cd.deleted_at')
            ->where('cd.company_id', $this->companyId())
            ->whereIn('dt.code', self::PURCHASE_CODES);
        if (!empty($filters['fiscal_year_id'])) {
            $baseDocsQuery->where('cd.fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) {
            $baseDocsQuery->whereDate('cd.document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $baseDocsQuery->whereDate('cd.document_date', '<=', $filters['to_date']);
        }
        $partyIdsWithDocs = $baseDocsQuery->pluck('cd.party_id')->filter()->unique();

        $query = Party::where('party_type_id', 2)->with(['commune', 'wilaya']);
        if ($partyIdsWithDocs->isNotEmpty()) {
            $query->whereIn('id', $partyIdsWithDocs);
        }
        $parties = $query->orderBy('name')->get();

        $partyIds = $parties->pluck('id');
        $partyStats = [];
        if ($partyIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_documents as cd')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cd.party_id', $partyIds)
                ->whereIn('dt.code', self::PURCHASE_CODES);
            if (!empty($filters['fiscal_year_id'])) {
                $statsQuery->where('cd.fiscal_year_id', $filters['fiscal_year_id']);
            }
            $stats = $statsQuery->select(
                    'cd.party_id',
                    DB::raw('COUNT(*) as doc_count'),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cd.total_ht ELSE cd.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cd.total_ttc ELSE cd.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cd.paid_amount ELSE cd.paid_amount END) as total_paid"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cd.remaining_amount ELSE cd.remaining_amount END) as total_remaining")
                )
                ->groupBy('cd.party_id')
                ->get()
                ->keyBy('party_id');

            foreach ($stats as $sid => $s) {
                $partyStats[$sid] = [
                    'doc_count'       => (int) $s->doc_count,
                    'total_ht'        => round((float) $s->total_ht, 2),
                    'total_ttc'       => round((float) $s->total_ttc, 2),
                    'total_paid'      => round((float) $s->total_paid, 2),
                    'total_remaining' => round((float) $s->total_remaining, 2),
                ];
            }
        }

        return [
            'suppliers' => $parties->map(function ($party) use ($partyStats) {
                $stats = $partyStats[$party->id] ?? ['doc_count' => 0, 'total_ht' => 0, 'total_ttc' => 0, 'total_paid' => 0, 'total_remaining' => 0];
                return [
                    'id'              => $party->id,
                    'code'            => $party->code,
                    'name'            => $party->name,
                    'activity'        => $party->activity,
                    'phone'           => $party->phone,
                    'email'           => $party->email,
                    'wilaya'          => $party->wilaya?->name,
                    'nif'             => $party->nif,
                    'nis'             => $party->nis,
                    'ai'              => $party->ai,
                    'created_at'      => $party->created_at?->format('Y-m-d'),
                    'doc_count'       => $stats['doc_count'],
                    'total_ht'        => $stats['total_ht'],
                    'total_ttc'       => $stats['total_ttc'],
                    'total_paid'      => $stats['total_paid'],
                    'total_remaining' => $stats['total_remaining'],
                ];
            })->toArray(),
            'summary' => [
                'total_suppliers'   => $parties->count(),
                'total_ht'          => round(collect($partyStats)->sum('total_ht'), 2),
                'total_ttc'         => round(collect($partyStats)->sum('total_ttc'), 2),
                'total_remaining'   => round(collect($partyStats)->sum('total_remaining'), 2),
            ],
        ];
    }

    public function agingReport(array $filters = []): array
    {
        $refInput = $filters['as_of_date'] ?? $filters['to_date'] ?? null;
        try {
            $ref     = $refInput ? Carbon::parse($refInput) : now();
        } catch (\Throwable) {
            $ref     = now();
        }
        $refDate  = $ref->toDateString();

        $query = CommercialDocument::with('party')
            ->whereHas('documentType', fn($q) => $q->whereIn('code', array_merge(self::SALE_CODES, ['BL', 'BCC'])))
            ->where('remaining_amount', '>', 0)
            ->whereDate('document_date', '<=', $refDate);

        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }

        $invoices = $query->orderBy('due_date')
            ->get();

        $parties = $invoices->groupBy('party_id');

        $buckets = [
            '0_30'   => ['label' => '0â€“30 ظٹظˆظ…',  'total' => 0, 'count' => 0],
            '31_60'  => ['label' => '31â€“60 ظٹظˆظ…', 'total' => 0, 'count' => 0],
            '61_90'  => ['label' => '61â€“90 ظٹظˆظ…', 'total' => 0, 'count' => 0],
            '90_plus' => ['label' => 'ط£ظƒط«ط± ظ…ظ† 90 ظٹظˆظ…', 'total' => 0, 'count' => 0],
        ];

        $rows = $parties->map(function ($docs, $partyId) use ($ref, &$buckets) {
            $party = $docs->first()->party;
            $total = $docs->sum('remaining_amount');
            $days  = $ref->diffInDays($docs->max('due_date') ?? $docs->max('document_date'));
            $bucket = $days <= 30 ? '0_30' : ($days <= 60 ? '31_60' : ($days <= 90 ? '61_90' : '90_plus'));

            $buckets[$bucket]['total'] += $total;
            $buckets[$bucket]['count'] += $docs->count();

            return [
                'party_id'      => (int) $partyId,
                'party_name'    => $party?->name ?? 'â€”',
                'total_due'     => round($total, 2),
                'invoice_count' => $docs->count(),
                'max_days'      => $days,
                'bucket'        => $bucket,
                'invoices'      => $docs->map(fn($d) => [
                    'id'               => $d->id,
                    'document_number'  => $d->document_number,
                    'total_ttc'        => round($d->total_ttc, 2),
                    'remaining_amount' => round($d->remaining_amount, 2),
                    'document_date'    => $d->document_date?->format('Y-m-d'),
                    'due_date'         => $d->due_date?->format('Y-m-d'),
                ])->toArray(),
            ];
        })->values()->toArray();

        return [
            'rows'    => $rows,
            'buckets' => array_values($buckets),
            'summary' => [
                'total_due'   => round(array_sum(array_column($buckets, 'total')), 2),
                'total_count' => array_sum(array_column($buckets, 'count')),
                'as_of_date'  => $refDate,
            ],
        ];
    }

    /**
     * ط±ظ‚ظ… ط§ظ„ط£ط¹ظ…ط§ظ„ ط§ظ„ط´ظ‡ط±ظٹ ط­ط³ط¨ ط§ظ„ط²ط¨ظˆظ† (Chiffre d'affaires mensuel par client).
     * ط§ظ„طµظپظˆظپ = ط§ظ„ط²ط¨ط§ط¦ظ†طŒ ط§ظ„ط£ط¹ظ…ط¯ط© = ط§ظ„ط£ط´ظ‡ط±طŒ ط§ظ„ط®ظ„ظٹط© = ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ط²ط¨ظˆظ† ظپظٹ ط°ظ„ظƒ ط§ظ„ط´ظ‡ط±.
     * ط§ظ„ط¥ط±ط¬ط§ط¹ط§طھ (AV) طھظڈط­طھط³ط¨ ط¨ط¥ط´ط§ط±ط© ط³ط§ظ„ط¨ط©.
     */
    public function clientMonthlyReport(array $filters = []): array
    {
        $companyId    = $this->companyId();
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;
        $fromDate     = $filters['from_date'] ?? null;
        $toDate       = $filters['to_date'] ?? null;

        $query = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt',       'dt.id', '=', 'cd.document_type_id')
            ->join('parties as pt',              'pt.id', '=', 'cd.party_id')
            ->where('cd.company_id', $companyId)
            ->where('pt.party_type_id', 1)
            ->whereIn('dt.code', self::SALE_CODES)
            ->whereNull('cd.deleted_at')
            ->whereNull('pt.deleted_at');

        if ($fiscalYearId) $query->where('cd.fiscal_year_id', $fiscalYearId);
        if ($fromDate)     $query->whereDate('cd.document_date', '>=', $fromDate);
        if ($toDate)       $query->whereDate('cd.document_date', '<=', $toDate);

        $sign = "CASE WHEN dt.code = 'AV' THEN -1 ELSE 1 END";

        $rows = $query->select(
            'cd.party_id',
            'pt.name as party_name',
            'pt.code as party_code',
            'cd.document_date',
            DB::raw("SUM({$sign} * cdl.quantity) as qty"),
            DB::raw("SUM({$sign} * cdl.total_ht)  as ht"),
            DB::raw("SUM({$sign} * cdl.total_ttc) as ttc")
        )
            ->groupBy('cd.party_id', 'pt.name', 'pt.code', 'cd.document_date')
            ->get();

        $partyMap    = [];
        $monthTotals = [];

        foreach ($rows as $r) {
            $month   = substr((string) $r->document_date, 0, 7);
            $partyId = $r->party_id;
            $qty     = (float) $r->qty;
            $ht      = (float) $r->ht;
            $ttc     = (float) $r->ttc;

            if (!isset($partyMap[$partyId])) {
                $partyMap[$partyId] = [
                    'id'         => $partyId,
                    'name'       => $r->party_name,
                    'code'       => $r->party_code,
                    'total_qty'  => 0.0,
                    'total_ht'   => 0.0,
                    'total_ttc'  => 0.0,
                    'months'     => [],
                ];
            }

            $partyMap[$partyId]['months'][$month] = [
                'qty' => round($qty, 3),
                'ht'  => round($ht, 2),
                'ttc' => round($ttc, 2),
            ];
            $partyMap[$partyId]['total_qty'] += $qty;
            $partyMap[$partyId]['total_ht']  += $ht;
            $partyMap[$partyId]['total_ttc'] += $ttc;

            $monthTotals[$month]['qty'] = ($monthTotals[$month]['qty'] ?? 0) + $qty;
            $monthTotals[$month]['ht']  = ($monthTotals[$month]['ht']  ?? 0) + $ht;
            $monthTotals[$month]['ttc'] = ($monthTotals[$month]['ttc'] ?? 0) + $ttc;
        }

        // ط£ط´ظ‡ط± ط§ظ„ظپطھط±ط© (ط´ظ‡ط±ط§ظ‹ ط¨ط´ظ‡ط± ظ…ظ† آ«ظ…ظ†آ» ط¥ظ„ظ‰ آ«ط¥ظ„ظ‰آ»)
        $monthKeys = [];
        if ($fromDate && $toDate) {
            $start = Carbon::parse($fromDate)->startOfMonth();
            $end   = Carbon::parse($toDate)->startOfMonth();
            while ($start->lte($end)) {
                $monthKeys[] = $start->format('Y-m');
                $start->addMonth();
            }
        } else {
            $monthKeys = array_keys($monthTotals);
            sort($monthKeys);
        }

        $months = array_map(fn($m) => [
            'month'     => $m,
            'label'     => self::arabicMonthLabel($m),
            'total_qty' => round($monthTotals[$m]['qty'] ?? 0, 3),
            'total_ht'  => round($monthTotals[$m]['ht']  ?? 0, 2),
            'total_ttc' => round($monthTotals[$m]['ttc'] ?? 0, 2),
        ], $monthKeys);

        $parties = array_values($partyMap);
        foreach ($parties as &$p) {
            $p['total_qty'] = round($p['total_qty'], 3);
            $p['total_ht']  = round($p['total_ht'], 2);
            $p['total_ttc'] = round($p['total_ttc'], 2);
        }
        unset($p);

        // ط§ظ„طھط±طھظٹط¨ ط­ط³ط¨ ط±ظ‚ظ… ط§ظ„ط£ط¹ظ…ط§ظ„ (TTC) طھظ†ط§ط²ظ„ظٹط§ظ‹
        usort($parties, fn($a, $b) => $b['total_ttc'] <=> $a['total_ttc']);

        return [
            'months'  => $months,
            'parties' => $parties,
            'summary' => [
                'party_count' => count($parties),
                'month_count' => count($months),
                'total_qty'   => round(array_sum(array_column($parties, 'total_qty')), 3),
                'total_ht'    => round(array_sum(array_column($parties, 'total_ht')), 2),
                'total_ttc'   => round(array_sum(array_column($parties, 'total_ttc')), 2),
            ],
        ];
    }

    private static function arabicMonthLabel(string $ym): string
    {
        [$year, $month] = explode('-', $ym);
        $idx = ((int) $month) - 1;
        $name = self::AR_MONTHS[$idx] ?? $month;
        return "{$name} {$year}";
    }
}

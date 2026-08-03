<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Party;
use App\Models\Product;
use App\Models\Payment;
use App\Models\StockMovement;
use App\Services\CompanyContextService;
use App\Services\PartyBalanceService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    private const SALE_CODES = ['FV', 'AV', 'POS'];
    private const PURCHASE_CODES = ['FA', 'AA'];
    private const AR_MONTHS = ['جانفي', 'فيفري', 'مارس', 'أفريل', 'ماي', 'جوان', 'جويلية', 'أوت', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    private function companyId(): int
    {
        return (int) app(CompanyContextService::class)->get();
    }

    /**
     * يرفق أسطر كل وثيقة (تفاصيل التفاصيل) بقائمة الوثائق المبنية مسبقاً.
     * يستخدم لإظهار تفاصيل قابلة للطي في تقارير المبيعات/المشتريات/الإرجاعات/اليومي.
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

    public function salesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES));

        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['party_id'])) {
            $query->where('party_id', $filters['party_id']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        $docIds = $documents->pluck('id');
        $costMap = [];
        $discountMap = [];
        if ($docIds->isNotEmpty()) {
            $lineAgg = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.commercial_document_id',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as doc_cost_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_discount_amount ELSE cdl.total_discount_amount END) as doc_discount")
                )
                ->groupBy('cdl.commercial_document_id')
                ->get();

            foreach ($lineAgg as $la) {
                $costMap[$la->commercial_document_id] = (float) $la->doc_cost_ht;
                $discountMap[$la->commercial_document_id] = (float) $la->doc_discount;
            }
        }

        $productRecap = [];
        if ($docIds->isNotEmpty()) {
            $lineRows = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ttc ELSE cdl.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_tva ELSE cdl.total_tva END) as total_tva"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_discount_amount ELSE cdl.total_discount_amount END) as total_discount")
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_ht')
                ->get();

            foreach ($lineRows as $lr) {
                $ht = (float) $lr->total_ht;
                $cost = (float) $lr->total_cost;
                $margin = $ht - $cost;
                $productRecap[] = [
                    'product_id'   => $lr->product_id,
                    'product_name' => $lr->product_name,
                    'product_ref'  => $lr->product_ref,
                    'total_qty'    => (float) $lr->total_qty,
                    'total_ht'     => round($ht, 2),
                    'total_tva'    => round((float) $lr->total_tva, 2),
                    'total_ttc'    => round((float) $lr->total_ttc, 2),
                    'total_cost'   => round($cost, 2),
                    'total_discount' => round((float) $lr->total_discount, 2),
                    'margin_value' => round($margin, 2),
                    'margin_pct'   => $ht > 0 ? round($margin / $ht * 100, 2) : 0,
                ];
            }
        }

        $docsArray = $documents->map(function ($doc) use ($costMap, $discountMap) {
            $docCost = $costMap[$doc->id] ?? 0;
            $docDiscount = $discountMap[$doc->id] ?? 0;
            return [
                'id'                => $doc->id,
                'document_number'   => $doc->document_number,
                'document_type'     => $doc->documentType?->code,
                'document_type_name' => $doc->documentType?->name,
                'date'              => $doc->document_date?->format('Y-m-d'),
                'party_name'        => $doc->party?->name,
                'total_ht'          => round($doc->total_ht, 2),
                'total_tva'         => round($doc->total_tva, 2),
                'total_stamp'       => round($doc->total_stamp, 2),
                'total_ttc'         => round($doc->total_ttc, 2),
                'total_discount'    => round($docDiscount, 2),
                'paid_amount'       => round($doc->paid_amount, 2),
                'remaining_amount'  => round($doc->remaining_amount, 2),
                'doc_cost_ht'       => round($docCost, 2),
                'margin_value'      => round($doc->total_ht - $docCost, 2),
                'payment_status'    => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
                'status'            => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
            ];
        })->toArray();

        $docsArray = $this->attachDocumentLines($docsArray, $documents);

        $totalCost = array_sum(array_column($docsArray, 'doc_cost_ht'));
        $totalDiscount = array_sum(array_column($docsArray, 'total_discount'));
        $totalHt = $documents->sum('total_ht');

        $byType = $documents->groupBy('documentType.code')->map(function ($docs, $code) {
            return [
                'code'  => $code,
                'count' => $docs->count(),
                'total_ht'  => round($docs->sum('total_ht'), 2),
                'total_ttc' => round($docs->sum('total_ttc'), 2),
            ];
        })->values()->toArray();

        return [
            'documents'    => $docsArray,
            'product_recap' => $productRecap,
            'by_type'      => $byType,
            'summary'      => [
                'total_ht'          => round($totalHt, 2),
                'total_tva'         => round($documents->sum('total_tva'), 2),
                'total_stamp'       => round($documents->sum('total_stamp'), 2),
                'total_ttc'         => round($documents->sum('total_ttc'), 2),
                'total_discount'    => round($totalDiscount, 2),
                'total_cost'        => round($totalCost, 2),
                'total_margin'      => round($totalHt - $totalCost, 2),
                'margin_pct'        => $totalHt > 0 ? round(($totalHt - $totalCost) / $totalHt * 100, 2) : 0,
                'total_paid'        => round($documents->sum('paid_amount'), 2),
                'total_remaining'   => round($documents->sum('remaining_amount'), 2),
                'count'             => $documents->count(),
                'unpaid_count'      => $documents->where('remaining_amount', '>', 0.01)->count(),
            ],
        ];
    }

    public function purchasesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::PURCHASE_CODES));

        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['party_id'])) {
            $query->where('party_id', $filters['party_id']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        $docIds = $documents->pluck('id');
        $discountMap = [];
        if ($docIds->isNotEmpty()) {
            $lineRows = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.commercial_document_id',
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ttc ELSE cdl.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_tva ELSE cdl.total_tva END) as total_tva"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_discount_amount ELSE cdl.total_discount_amount END) as total_discount")
                )
                ->groupBy('cdl.commercial_document_id', 'cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_ht')
                ->get();

            $productRecap = [];
            foreach ($lineRows as $lr) {
                $docId = $lr->commercial_document_id;
                $discountMap[$docId] = ($discountMap[$docId] ?? 0) + (float) $lr->total_discount;
                $productRecap[] = [
                    'product_id'      => $lr->product_id,
                    'product_name'    => $lr->product_name,
                    'product_ref'     => $lr->product_ref,
                    'total_qty'       => (float) $lr->total_qty,
                    'total_ht'        => round((float) $lr->total_ht, 2),
                    'total_tva'       => round((float) $lr->total_tva, 2),
                    'total_ttc'       => round((float) $lr->total_ttc, 2),
                    'total_discount'  => round((float) $lr->total_discount, 2),
                ];
            }
        } else {
            $productRecap = [];
        }

        $totalDiscount = array_sum($discountMap);

        $docsArray = $documents->map(function ($doc) use ($discountMap) {
            return [
                'id'                => $doc->id,
                'document_number'   => $doc->document_number,
                'document_type'     => $doc->documentType?->code,
                'document_type_name' => $doc->documentType?->name,
                'date'              => $doc->document_date?->format('Y-m-d'),
                'party_name'        => $doc->party?->name,
                'total_ht'          => round($doc->total_ht, 2),
                'total_tva'         => round($doc->total_tva, 2),
                'total_stamp'       => round($doc->total_stamp, 2),
                'total_ttc'         => round($doc->total_ttc, 2),
                'total_discount'    => round($discountMap[$doc->id] ?? 0, 2),
                'paid_amount'       => round($doc->paid_amount, 2),
                'remaining_amount'  => round($doc->remaining_amount, 2),
                'payment_status'    => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
                'status'            => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
            ];
        })->toArray();

        $docsArray = $this->attachDocumentLines($docsArray, $documents);

        return [
            'documents'     => $docsArray,
            'product_recap' => $productRecap,
            'summary'       => [
                'total_ht'          => round($documents->sum('total_ht'), 2),
                'total_tva'         => round($documents->sum('total_tva'), 2),
                'total_stamp'       => round($documents->sum('total_stamp'), 2),
                'total_ttc'         => round($documents->sum('total_ttc'), 2),
                'total_discount'    => round($totalDiscount, 2),
                'total_paid'        => round($documents->sum('paid_amount'), 2),
                'total_remaining'   => round($documents->sum('remaining_amount'), 2),
                'count'             => $documents->count(),
                'unpaid_count'      => $documents->where('remaining_amount', '>', 0.01)->count(),
            ],
        ];
    }

    public function customersReport(array $filters = []): array
    {
        $partyIdsWithDocs = collect();
        $baseDocsQuery = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
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
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cd.party_id', $partyIds)
                ->whereIn('dt.code', self::SALE_CODES)
                ->pluck('cd.id');
        }

        $totalDiscount = 0;
        $productRecap = [];
        if ($allDocIds->isNotEmpty()) {
            $lineRows = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $allDocIds)
                ->select(
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ttc ELSE cdl.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_discount_amount ELSE cdl.total_discount_amount END) as total_discount")
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_ht')
                ->get();

            foreach ($lineRows as $lr) {
                $totalDiscount += (float) $lr->total_discount;
                $ht = (float) $lr->total_ht;
                $productRecap[] = [
                    'product_id'     => $lr->product_id,
                    'product_name'   => $lr->product_name,
                    'product_ref'    => $lr->product_ref,
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

    public function productsReport(array $filters = []): array
    {
        return $this->productProfitData($filters);
    }

    /**
     * بيانات المنتجات الغنية: مبيعات الفترة + مشتريات الفترة + متوسط سعر الشراء المرجح
     * (كل الفترات) + تكلفة البضاعة المباعة المقدرة + الربح المقدر + حالة المخزون.
     * تُستهلك من تقرير المنتجات ولوحة القيادة (KPIs) معاً.
     */
    private function productProfitData(array $filters = []): array
    {
        $query = Product::with(['family', 'brand', 'unit', 'tva']);

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }
        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        $products = $query->orderBy('name')->get();

        $productIds = $products->pluck('id');

        // ─── مبيعات الفترة ────────────────────────────────────────────────────────
        $salesStats = [];
        if ($productIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.product_id', $productIds)
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
                    'cdl.product_id',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_sold"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as sales_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as sales_cost")
                )
                ->groupBy('cdl.product_id')
                ->get()
                ->keyBy('product_id');

            foreach ($stats as $sid => $s) {
                $salesStats[$sid] = [
                    'total_sold' => (int) $s->total_sold,
                    'sales_ht'   => round((float) $s->sales_ht, 2),
                    'sales_cost' => round((float) $s->sales_cost, 2),
                ];
            }
        }

        // ─── مشتريات الفترة (كمية + قيمة) ──────────────────────────────────────────
        $purchaseStats = [];
        if ($productIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.product_id', $productIds)
                ->whereIn('dt.code', self::PURCHASE_CODES);
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
                    'cdl.product_id',
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.quantity ELSE cdl.quantity END) as qty_bought"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ht ELSE cdl.total_ht END) as purchase_ht")
                )
                ->groupBy('cdl.product_id')
                ->get()
                ->keyBy('product_id');

            foreach ($stats as $sid => $s) {
                $purchaseStats[$sid] = [
                    'qty_bought'  => (float) $s->qty_bought,
                    'purchase_ht' => round((float) $s->purchase_ht, 2),
                ];
            }
        }

        // ─── متوسط سعر الشراء المرجح (كل الفترات — بدون فلتر تاريخ) ─────────────────
        $avgPurchase = [];
        if ($productIds->isNotEmpty()) {
            $avgRows = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.product_id', $productIds)
                ->whereIn('dt.code', self::PURCHASE_CODES)
                ->select(
                    'cdl.product_id',
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_value")
                )
                ->groupBy('cdl.product_id')
                ->get();

            foreach ($avgRows as $r) {
                $avgPurchase[$r->product_id] = $r->total_qty > 0 ? (float) $r->total_value / (float) $r->total_qty : 0;
            }
        }

        $warehouseStockMap = [];
        $useWarehouseStock = !empty($filters['warehouse_id']) && $productIds->isNotEmpty();
        if ($useWarehouseStock) {
            $stockRows = DB::table('stock_movements as sm')
                ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
                ->where('sm.company_id', $this->companyId())
                ->where('sm.warehouse_id', $filters['warehouse_id'])
                ->whereIn('sm.product_id', $productIds)
                ->select(
                    'sm.product_id',
                    DB::raw("SUM(CASE WHEN smt.direction = 1 THEN sm.quantity WHEN smt.direction = -1 THEN -sm.quantity ELSE sm.quantity END) as qty")
                )
                ->groupBy('sm.product_id')
                ->get();

            foreach ($stockRows as $row) {
                $warehouseStockMap[$row->product_id] = (float) $row->qty;
            }
        }

        // ─── المخزون الحالي (SSOT: InventoryStockService — نفس مصدر صفحات المخزون) ──
        $stockMap = [];
        if (!$useWarehouseStock && $productIds->isNotEmpty()) {
            $asOf = $filters['to_date'] ?? date('Y-m-d');
            foreach (app(InventoryStockService::class)->getStockAt($asOf) as $s) {
                $stockMap[$s['id']] = $s;
            }
        }

        $rows = $products->map(function ($product) use ($salesStats, $purchaseStats, $avgPurchase, $useWarehouseStock, $warehouseStockMap, $stockMap) {
            $ss = $salesStats[$product->id] ?? ['total_sold' => 0, 'sales_ht' => 0, 'sales_cost' => 0];
            $ps = $purchaseStats[$product->id] ?? ['qty_bought' => 0, 'purchase_ht' => 0];
            $stockQty = $useWarehouseStock ? ($warehouseStockMap[$product->id] ?? 0) : ($stockMap[$product->id]['current_stock'] ?? 0);
            $avgCost = $avgPurchase[$product->id] ?? (float) $product->purchase_price_ht;
            $stockVal = round($stockQty * $avgCost, 2);
            $margin = $ss['sales_ht'] - $ss['sales_cost'];
            // تكلفة البضاعة المباعة = التكلفة المسجلة على أسطر البيع (SSOT — تشمل خصم/إرجاع AV)
            $cogs = $ss['sales_cost'] > 0 ? $ss['sales_cost'] : $ss['total_sold'] * $avgCost;
            $estProfit = $ss['sales_ht'] - $cogs;
            $status = $stockQty <= 0 ? 'out_of_stock' : ($stockQty < (float) $product->min_stock_alert ? 'reorder' : 'good');
            return [
                'id'                  => $product->id,
                'ref'                 => $product->ref,
                'name'                => $product->name,
                'family'              => $product->family?->name,
                'brand'               => $product->brand?->name,
                'unit'                => $product->unit?->name,
                'purchase_price_ht'   => round($product->purchase_price_ht, 2),
                'current_cost_price'  => round($product->current_cost_price, 2),
                'tva_rate'            => $product->tva?->rate,
                'stock_quantity'       => round($stockQty, 2),
                'min_stock_alert'     => $product->min_stock_alert,
                'stock_value'         => $stockVal,
                'total_sold'          => $ss['total_sold'],
                'sales_ht'            => $ss['sales_ht'],
                'sales_cost'          => $ss['sales_cost'],
                'margin_value'        => round($margin, 2),
                'margin_pct'          => $ss['sales_ht'] > 0 ? round($margin / $ss['sales_ht'] * 100, 2) : 0,
                'qty_bought'          => round($ps['qty_bought'], 2),
                'purchase_ht'         => $ps['purchase_ht'],
                'avg_purchase_price'  => round($avgCost, 4),
                'cogs_estimated'      => round($cogs, 2),
                'est_profit'          => round($estProfit, 2),
                'profit_pct'          => $ss['sales_ht'] > 0 ? round($estProfit / $ss['sales_ht'] * 100, 2) : 0,
                'stock_status'        => $status,
            ];
        })->values();

        // ترتيب حسب الربح المقدر (تنازلي) ثم تثبيت رقم الترتيب
        $rows = $rows->sortByDesc('est_profit')->values()
            ->map(function ($row, $i) {
                $row['profit_rank'] = $i + 1;
                return $row;
            });

        $totalSalesHt = round(array_sum(array_column($rows->toArray(), 'sales_ht')), 2);
        $totalEstProfit = round(array_sum(array_column($rows->toArray(), 'est_profit')), 2);

        $withSales = $rows->filter(fn($r) => (float) $r['sales_ht'] > 0)->values();
        $best  = $withSales->sortByDesc('est_profit')->first();
        $worst = $withSales->sortBy('est_profit')->first();

        return [
            'products' => $rows->toArray(),
            'summary' => [
                'total_products'    => $products->count(),
                'total_stock_value' => round(array_sum(array_column($rows->toArray(), 'stock_value')), 2),
                'total_sold'        => array_sum(array_column($rows->toArray(), 'total_sold')),
                'total_sales_ht'    => $totalSalesHt,
                'total_qty_bought'  => round(array_sum(array_column($rows->toArray(), 'qty_bought')), 2),
                'total_purchase_ht' => round(array_sum(array_column($rows->toArray(), 'purchase_ht')), 2),
                'total_cogs'        => round(array_sum(array_column($rows->toArray(), 'cogs_estimated')), 2),
                'total_est_profit'  => $totalEstProfit,
                'margin_pct'        => $totalSalesHt > 0 ? round($totalEstProfit / $totalSalesHt * 100, 2) : 0,
                'reorder_count'     => $rows->filter(fn($r) => $r['stock_status'] !== 'good')->count(),
            ],
            'best_product'  => $best  ? ['id' => $best['id'], 'name' => $best['name'], 'est_profit' => $best['est_profit']] : null,
            'worst_product' => $worst ? ['id' => $worst['id'], 'name' => $worst['name'], 'est_profit' => $worst['est_profit']] : null,
        ];
    }

    /**
     * لوحة القيادة (KPIs): إجمالي المبيعات/المشتريات، الربح المقدر، هامش الربح،
     * الوحدات المباعة، قيمة المخزون، عدد المنتجات التي تحتاج إعادة طلب + أفضل/أضعف منتج.
     * تُبنى من نفس بيانات تقرير المنتجات (productProfitData).
     */
    public function dashboardReport(array $filters = []): array
    {
        $data = $this->productProfitData($filters);

        return [
            'summary'       => $data['summary'],
            'best_product'  => $data['best_product'],
            'worst_product' => $data['worst_product'],
        ];
    }

    /**
     * التنبؤ وإعادة الطلب: معدل البيع اليومي لكل منتج منذ أول عملية بيع (أيام النشاط =
     * فرق التواريخ + 1)، التوقع = المعدل اليومي × أفق التنبؤ، الكمية المقترحة =
     * التوقع − المخزون الحالي (لا تقل عن صفر).
     */
    public function forecastReport(array $filters = []): array
    {
        $horizon = max(1, (int) ($filters['horizon'] ?? 30));
        $fyId = $filters['fiscal_year_id'] ?? null;
        $from = $filters['from_date'] ?? null;
        $to   = $filters['to_date']   ?? null;

        $salesQ = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->where('cd.company_id', $this->companyId())
            ->whereIn('dt.code', self::SALE_CODES);
        if ($fyId) $salesQ->where('cd.fiscal_year_id', $fyId);
        if ($from) $salesQ->whereDate('cd.document_date', '>=', $from);
        if ($to)   $salesQ->whereDate('cd.document_date', '<=', $to);

        $salesRows = $salesQ->select(
                'cdl.product_id',
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                DB::raw('MIN(cd.document_date) as first_sale'),
                DB::raw('MAX(cd.document_date) as last_sale')
            )
            ->groupBy('cdl.product_id')
            ->havingRaw('total_qty > 0')
            ->get();

        $productIds = $salesRows->pluck('product_id');
        $products   = Product::whereIn('id', $productIds)->get()->keyBy('id');

        // متوسط سعر الشراء المرجح (كل الفترات)
        $avgPurchase = [];
        if ($productIds->isNotEmpty()) {
            $avgRows = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.product_id', $productIds)
                ->whereIn('dt.code', self::PURCHASE_CODES)
                ->select(
                    'cdl.product_id',
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_value")
                )
                ->groupBy('cdl.product_id')
                ->get();

            foreach ($avgRows as $r) {
                $avgPurchase[$r->product_id] = $r->total_qty > 0 ? (float) $r->total_value / (float) $r->total_qty : 0;
            }
        }

        // المخزون الحالي (SSOT)
        $stockMap = [];
        if ($productIds->isNotEmpty()) {
            $asOf = $to ?? date('Y-m-d');
            foreach (app(InventoryStockService::class)->getStockAt($asOf) as $s) {
                $stockMap[$s['id']] = $s;
            }
        }

        $items = $salesRows->map(function ($r) use ($products, $avgPurchase, $stockMap, $horizon) {
            $p = $products->get($r->product_id);
            $avgCost = $avgPurchase[$r->product_id] ?? (float) ($p?->purchase_price_ht ?? 0);
            $first = Carbon::parse($r->first_sale);
            $last  = Carbon::parse($r->last_sale);
            $activeDays = max(1, (int) $first->diffInDays($last) + 1);
            $totalQty = (float) $r->total_qty;
            $totalHt  = (float) $r->total_ht;
            $dailyQty   = $totalQty / $activeDays;
            $dailyValue = $totalHt / $activeDays;
            $forecastQty   = round($dailyQty * $horizon, 2);
            $forecastValue = round($dailyValue * $horizon, 2);
            $forecastProfit = round($forecastValue - $forecastQty * $avgCost, 2);
            $stock = (float) ($stockMap[$r->product_id]['current_stock'] ?? 0);
            $suggested = max(0, round($forecastQty - $stock, 2));
            return [
                'product_id'         => (int) $r->product_id,
                'product_name'       => $p?->name ?? '—',
                'product_ref'        => $p?->ref ?? '—',
                'first_sale'         => $r->first_sale,
                'last_sale'          => $r->last_sale,
                'active_days'        => $activeDays,
                'total_sold'         => round($totalQty, 2),
                'sales_ht'           => round($totalHt, 2),
                'daily_rate_qty'     => round($dailyQty, 4),
                'daily_rate_value'   => round($dailyValue, 2),
                'avg_purchase_price' => round($avgCost, 4),
                'forecast_qty'       => $forecastQty,
                'forecast_value'     => $forecastValue,
                'forecast_profit'    => $forecastProfit,
                'current_stock'      => round($stock, 2),
                'suggested_qty'      => $suggested,
                'needs_reorder'      => $suggested > 0,
            ];
        })->sortByDesc('suggested_qty')->values()->toArray();

        return [
            'items'   => $items,
            'horizon' => $horizon,
            'summary' => [
                'products_count'        => count($items),
                'total_forecast_value'  => round(array_sum(array_column($items, 'forecast_value')), 2),
                'total_forecast_profit' => round(array_sum(array_column($items, 'forecast_profit')), 2),
                'total_suggested_qty'   => round(array_sum(array_column($items, 'suggested_qty')), 2),
                'needs_reorder_count'   => count(array_filter($items, fn($i) => $i['needs_reorder'])),
            ],
        ];
    }

    /**
     * التقرير الشهري: صافي التدفق (نقدي تقريبي) = مبيعات الشهر − مشتريات الشهر،
     * مجمّعة شهراً بشهر ضمن الفترة المعطاة (AV/AA بإشارة سالبة).
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
            ->where('cd.company_id', $this->companyId())
            ->whereIn('dt.code', self::SALE_CODES);
        $purchaseQ = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
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

    public function inventoryReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand']);

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }

        $products = $query->orderBy('name')->get();
        $productIds = $products->pluck('id');

        // ─── مصدر المخزون: رصيد حتى تاريخ (as_of) | مستودع محدد | المخزون الحالي ──
        $asOfDate = !empty($filters['as_of_date']) ? $filters['as_of_date'] : null;
        $stockMap = [];

        if ($asOfDate && $productIds->isNotEmpty()) {
            $rows = app(InventoryStockService::class)->getStockAt(
                $asOfDate,
                !empty($filters['warehouse_id']) ? (int) $filters['warehouse_id'] : null
            );
            foreach ($rows as $row) {
                $stockMap[$row['id']] = [
                    'qty'  => $row['current_stock'],
                    'cost' => $row['current_cost_price'],
                ];
            }
        } elseif (!empty($filters['warehouse_id']) && $productIds->isNotEmpty()) {
            $stockRows = DB::table('stock_movements as sm')
                ->join('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
                ->where('sm.company_id', $this->companyId())
                ->where('sm.warehouse_id', $filters['warehouse_id'])
                ->whereIn('sm.product_id', $productIds)
                ->select(
                    'sm.product_id',
                    DB::raw("SUM(CASE WHEN smt.direction = 1 THEN sm.quantity WHEN smt.direction = -1 THEN -sm.quantity ELSE sm.quantity END) as qty")
                )
                ->groupBy('sm.product_id')
                ->get();

            foreach ($stockRows as $row) {
                $stockMap[$row->product_id] = ['qty' => (float) $row->qty, 'cost' => 0];
            }
        }

        $stockOf = function (Product $product) use ($stockMap, $asOfDate): array {
            if (isset($stockMap[$product->id])) {
                $entry = $stockMap[$product->id];
                return [
                    'qty'  => (float) $entry['qty'],
                    'cost' => (float) $entry['cost'] > 0 ? (float) $entry['cost'] : (float) $product->current_cost_price,
                ];
            }
            if ($asOfDate) {
                return ['qty' => 0, 'cost' => (float) $product->current_cost_price];
            }
            return ['qty' => (float) $product->current_stock, 'cost' => (float) $product->current_cost_price];
        };

        $lowStock = $products->filter(fn($p) => $stockOf($p)['qty'] <= $p->min_stock_alert && $stockOf($p)['qty'] > 0);
        $outOfStock = $products->filter(fn($p) => $stockOf($p)['qty'] == 0);

        $showLowStock = !empty($filters['low_stock']) && $filters['low_stock'] != '0';
        $showOutOfStock = !empty($filters['out_of_stock']) && $filters['out_of_stock'] != '0';

        if ($showLowStock && !$showOutOfStock) {
            $products = $products->filter(fn($p) => $stockOf($p)['qty'] <= $p->min_stock_alert && $stockOf($p)['qty'] > 0);
        } elseif (!$showLowStock && $showOutOfStock) {
            $products = $products->filter(fn($p) => $stockOf($p)['qty'] == 0);
        } elseif ($showLowStock && $showOutOfStock) {
            $products = $products->filter(fn($p) => $stockOf($p)['qty'] <= $p->min_stock_alert);
        }

        return [
            'products' => $products->map(function ($product) use ($stockOf) {
                $stock = $stockOf($product);
                return [
                    'id'                => $product->id,
                    'ref'               => $product->ref,
                    'name'              => $product->name,
                    'family'            => $product->family?->name,
                    'brand'             => $product->brand?->name,
                    'stock_quantity'    => round($stock['qty'], 2),
                    'min_stock_alert'   => $product->min_stock_alert,
                    'purchase_price_ht' => round($product->purchase_price_ht, 2),
                    'current_cost_price' => round($stock['cost'], 2),
                    'stock_value'       => round($stock['qty'] * $stock['cost'], 2),
                    'status'            => $stock['qty'] == 0 ? 'out_of_stock' : ($stock['qty'] <= $product->min_stock_alert ? 'low_stock' : 'in_stock'),
                ];
            })->toArray(),
            'summary' => [
                'total_products'    => $products->count(),
                'total_quantity'    => round((float) $products->sum(fn($p) => $stockOf($p)['qty']), 2),
                'total_value'       => round((float) $products->sum(fn($p) => $stockOf($p)['qty'] * $stockOf($p)['cost']), 2),
                'low_stock_count'   => $lowStock->count(),
                'out_of_stock_count' => $outOfStock->count(),
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

    public function velocityReport(array $filters = []): array
    {
        $from = $filters['from_date'] ?? now()->subMonth(3)->toDateString();
        $to   = $filters['to_date']   ?? now()->toDateString();
        $fyId = $filters['fiscal_year_id'] ?? null;

        $rows = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->where('cd.company_id', $this->companyId())
            ->whereDate('cd.document_date', '>=', $from)
            ->whereDate('cd.document_date', '<=', $to)
            ->whereIn('dt.code', array_merge(self::SALE_CODES, ['BL', 'BCC']))
            ->select(
                'cdl.product_id',
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                DB::raw('COUNT(DISTINCT cdl.commercial_document_id) as doc_count'),
                DB::raw('AVG(cdl.unit_price_ht) as avg_price'),
            );
        if ($fyId) $rows->where('cd.fiscal_year_id', $fyId);

        $rows = $rows->groupBy('cdl.product_id')
            ->orderByDesc('total_qty')
            ->limit(50)
            ->get();

        $productIds = $rows->pluck('product_id');
        $products   = Product::whereIn('id', $productIds)->get()->keyBy('id');

        $days = max(1, Carbon::parse($from)->diffInDays(Carbon::parse($to)));

        $items = $rows->map(fn($r) => [
            'product_id'   => $r->product_id,
            'product_name' => $products->get($r->product_id)?->name ?? '—',
            'product_ref'  => $products->get($r->product_id)?->ref ?? '—',
            'total_qty'    => (float) $r->total_qty,
            'doc_count'    => (int) $r->doc_count,
            'avg_price'    => round((float) $r->avg_price, 2),
            'velocity'     => $days > 0 ? round((float) $r->total_qty / $days, 2) : 0,
            'days'         => $days,
        ])->values()->toArray();

        return [
            'items' => $items,
            'summary' => [
                'total_qty'    => round($rows->sum('total_qty'), 2),
                'total_docs'   => $rows->sum('doc_count'),
                'period_days'  => $days,
            ],
        ];
    }

    public function marginReport(array $filters = []): array
    {
        $from = $filters['from_date'] ?? now()->startOfYear()->toDateString();
        $to   = $filters['to_date']   ?? now()->toDateString();
        $fyId = $filters['fiscal_year_id'] ?? null;

        $rows = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->where('cd.company_id', $this->companyId())
            ->whereDate('cd.document_date', '>=', $from)
            ->whereDate('cd.document_date', '<=', $to)
            ->whereIn('dt.code', array_merge(self::SALE_CODES, ['BL', 'BCC']))
            ->select(
                'cdl.product_id',
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost")
            );
        if ($fyId) $rows->where('cd.fiscal_year_id', $fyId);

        $rows = $rows->groupBy('cdl.product_id')
            ->orderByDesc('total_ht')
            ->limit(50)
            ->get();

        $productIds = $rows->pluck('product_id');
        $products   = Product::whereIn('id', $productIds)->get()->keyBy('id');

        $items = $rows->map(fn($r) => [
            'product_id'    => $r->product_id,
            'product_name'  => $products->get($r->product_id)?->name ?? '—',
            'product_ref'   => $products->get($r->product_id)?->ref ?? '—',
            'total_qty'     => (float) $r->total_qty,
            'total_ht'      => round((float) $r->total_ht, 2),
            'cost_price'    => (float) $r->total_qty > 0 ? round((float) $r->total_cost / (float) $r->total_qty, 2) : 0,
            'cost_total'    => round((float) $r->total_cost, 2),
            'margin_amount' => 0,
            'margin_pct'    => 0,
        ])->map(fn($i) => [
            ...$i,
            'margin_amount' => round($i['total_ht'] - $i['cost_total'], 2),
            'margin_pct'    => $i['total_ht'] > 0
                ? round(($i['total_ht'] - $i['cost_total']) / $i['total_ht'] * 100, 2)
                : 0,
        ])->values()->toArray();

        $totalHt  = array_sum(array_column($items, 'total_ht'));
        $totalCost = array_sum(array_column($items, 'cost_total'));

        return [
            'items' => $items,
            'summary' => [
                'total_ht'      => round($totalHt, 2),
                'total_cost'    => round($totalCost, 2),
                'total_margin'  => round($totalHt - $totalCost, 2),
                'margin_pct'    => $totalHt > 0 ? round(($totalHt - $totalCost) / $totalHt * 100, 2) : 0,
            ],
        ];
    }

    public function agingReport(array $filters = []): array
    {
        $refDate = $filters['as_of_date'] ?? now()->toDateString();
        $ref     = Carbon::parse($refDate);

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
            '0_30'   => ['label' => '0–30 يوم',  'total' => 0, 'count' => 0],
            '31_60'  => ['label' => '31–60 يوم', 'total' => 0, 'count' => 0],
            '61_90'  => ['label' => '61–90 يوم', 'total' => 0, 'count' => 0],
            '90_plus' => ['label' => 'أكثر من 90 يوم', 'total' => 0, 'count' => 0],
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
                'party_name'    => $party?->name ?? '—',
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

        // مجموع موقّع: الإرجاعات (AV/AA) بسالب
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

        // ── تكلفة المبيعات (كل الأسطر، وليس أفضل 10 فقط) + أفضل 10 منتجات ──
        $salesIds = $salesDocs->pluck('id');
        $totalSalesCost = 0.0;
        $productMargin = [];

        if ($salesIds->isNotEmpty()) {
            $costAgg = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->where('cd.company_id', $companyId)
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->selectRaw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost")
                ->first();
            $totalSalesCost = (float) ($costAgg->total_cost ?? 0);

            $lineData = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
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

        // ── أفضل الزبائن / الموردين (كل الوثائق، موقّعة حسب الإرجاع) ──
        $topCustomers = $this->topParties($salesDocs, 'AV', 10);
        $topSuppliers = $this->topParties($purchasesDocs, 'AA', 10);

        // ── المصاريف: الإجمالي + التوزيع حسب التصنيف ──
        $expenseRows = DB::table('expenses as e')
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
                'category_name' => $cat === '' || $cat === null ? 'غير مصنف' : $cat,
                'total'         => round((float) $rows->sum('amount'), 2),
                'count'         => $rows->count(),
            ])
            ->sortByDesc('total')
            ->take(5)
            ->values()
            ->toArray();

        // ── الدفعات: مقبوض / مدفوع ──
        $paymentsQuery = Payment::where('status', 'confirmed')
            ->whereBetween('payment_date', [$from, $to]);
        $paymentsIn  = (float) (clone $paymentsQuery)->where('direction', 'in')->sum('amount');
        $paymentsOut = (float) (clone $paymentsQuery)->where('direction', 'out')->sum('amount');

        $totalReceivable = (float) $salesDocs->sum('remaining_amount');
        $totalPayable    = (float) $purchasesDocs->sum('remaining_amount');
        $totalSalesMargin = round($totalSalesHt - $totalSalesCost, 2);
        $netProfit        = round($totalSalesMargin - $expensesTotal, 2);

        // ── الاتجاه الشهري (مبيعات/مشتريات/مصاريف/هامش) مع فراغات معبّأة ──
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
     * أفضل الأطراف حسب القيمة، موقّعة حسب كود الإرجاع (AV/AA).
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
                'party_name' => $party?->name ?? '—',
                'total_ht'   => $row['total_ht'],
                'total_ttc'  => $row['total_ttc'],
                'doc_count'  => $row['doc_count'],
            ];
        })->values()->toArray();
    }

    public function dailyReport(array $filters = []): array
    {
        $date = $filters['date'] ?? now()->toDateString();

        $docsQuery = CommercialDocument::with(['documentType', 'party'])
            ->whereDate('document_date', $date);
        if (!empty($filters['fiscal_year_id'])) {
            $docsQuery->where('fiscal_year_id', $filters['fiscal_year_id']);
        }
        $docs = $docsQuery->orderBy('created_at')
            ->get();

        $payments = Payment::whereDate('payment_date', $date)->where('status', 'confirmed')->get();

        $saleDocs = $docs->filter(fn($d) => in_array($d->documentType?->code, self::SALE_CODES));
        $purchaseDocs = $docs->filter(fn($d) => in_array($d->documentType?->code, self::PURCHASE_CODES));

        $docDetails = $docs->map(fn($doc) => [
            'id'               => $doc->id,
            'document_number'  => $doc->document_number,
            'document_type'    => $doc->documentType?->code,
            'document_type_name' => $doc->documentType?->name,
            'party_name'       => $doc->party?->name,
            'total_ht'         => round($doc->total_ht, 2),
            'total_tva'        => round($doc->total_tva, 2),
            'total_ttc'        => round($doc->total_ttc, 2),
            'payment_status'   => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
            'status'           => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
        ])->toArray();

        $docDetails = $this->attachDocumentLines($docDetails, $docs);

        return [
            'date'       => $date,
            'documents'  => $docDetails,
            'summary'    => [
                'total_docs'         => $docs->count(),
                'sales_count'        => $saleDocs->count(),
                'purchases_count'    => $purchaseDocs->count(),
                'sales_ht'           => round($saleDocs->sum('total_ht'), 2),
                'sales_ttc'          => round($saleDocs->sum('total_ttc'), 2),
                'purchases_ht'       => round($purchaseDocs->sum('total_ht'), 2),
                'purchases_ttc'      => round($purchaseDocs->sum('total_ttc'), 2),
                'payments_received'  => round($payments->sum('amount'), 2),
                'payment_count'      => $payments->count(),
            ],
        ];
    }

    public function productMovementReport(array $filters = []): array
    {
        $productId = $filters['product_id'] ?? null;
        $from = $filters['from_date'] ?? now()->startOfYear()->toDateString();
        $to   = $filters['to_date']   ?? now()->toDateString();
        $fyId = $filters['fiscal_year_id'] ?? null;

        $query = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->where('cd.company_id', $this->companyId())
            ->whereDate('cd.document_date', '>=', $from)
            ->whereDate('cd.document_date', '<=', $to);

        if ($productId) {
            $query->where('cdl.product_id', $productId);
        }
        if ($fyId) {
            $query->where('cd.fiscal_year_id', $fyId);
        }

        $rows = $query->select(
            'cdl.product_id',
            'dt.code as doc_type',
            DB::raw('SUM(cdl.quantity) as total_qty'),
            DB::raw('SUM(cdl.total_ht) as total_ht'),
            DB::raw('COUNT(DISTINCT cd.id) as doc_count')
        )
            ->groupBy('cdl.product_id', 'dt.code')
            ->get();

        $productIds = $rows->pluck('product_id')->unique();
        $products = Product::whereIn('id', $productIds)->get()->keyBy('id');

        $grouped = $rows->groupBy('product_id')->map(function ($lines, $pid) use ($products) {
            $product = $products->get($pid);
            $salesQty = 0;
            $purchaseQty = 0;
            $salesHt = 0;
            $purchaseHt = 0;

            foreach ($lines as $line) {
                if (in_array($line->doc_type, self::SALE_CODES)) {
                    $salesQty += $line->total_qty;
                    $salesHt += $line->total_ht;
                } elseif (in_array($line->doc_type, self::PURCHASE_CODES)) {
                    $purchaseQty += $line->total_qty;
                    $purchaseHt += $line->total_ht;
                }
            }

            return [
                'product_id'    => $pid,
                'product_name'  => $product?->name ?? '—',
                'product_ref'   => $product?->ref ?? '—',
                'sales_qty'     => (int) $salesQty,
                'sales_ht'      => round($salesHt, 2),
                'purchase_qty'  => (int) $purchaseQty,
                'purchase_ht'   => round($purchaseHt, 2),
                'net_qty'       => (int) ($salesQty - $purchaseQty),
            ];
        })->values()->toArray();

        return [
            'items'    => $grouped,
            'summary'  => [
                'total_products'    => count($grouped),
                'total_sales_qty'   => array_sum(array_column($grouped, 'sales_qty')),
                'total_sales_ht'    => round(array_sum(array_column($grouped, 'sales_ht')), 2),
                'total_purchase_qty' => array_sum(array_column($grouped, 'purchase_qty')),
                'total_purchase_ht'  => round(array_sum(array_column($grouped, 'purchase_ht')), 2),
            ],
        ];
    }

    /**
     * سجل حركة منتج: كل وثيقة تحتوي على المنتج في الفترة، مع الإرجاعات بإشارة سالبة.
     */
    public function productHistoryReport(array $filters = []): array
    {
        $productId = $filters['product_id'] ?? null;
        $from = $filters['from_date'] ?? null;
        $to   = $filters['to_date']   ?? null;

        $empty = [
            'items'   => [],
            'summary' => ['doc_count' => 0, 'total_qty' => 0, 'total_ht' => 0.0, 'total_ttc' => 0.0],
        ];

        if (!$productId || !$from || !$to) {
            return $empty;
        }

        $rows = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt',       'dt.id', '=', 'cd.document_type_id')
            ->join('parties as pt',              'pt.id', '=', 'cd.party_id')
            ->where('cd.company_id',   $this->companyId())
            ->where('cdl.product_id',  $productId)
            ->whereDate('cd.document_date', '>=', $from)
            ->whereDate('cd.document_date', '<=', $to)
            ->whereNull('cd.deleted_at')
            ->whereNull('pt.deleted_at')
            ->select(
                'cd.id',
                'cd.document_number',
                'cd.document_date',
                'dt.code as type_code',
                'dt.name as type_name',
                'pt.name as party_name',
                'cdl.quantity',
                'cdl.total_ht',
                'cdl.total_tva',
                'cdl.total_ttc'
            )
            ->orderBy('cd.document_date', 'asc')
            ->orderBy('cd.id', 'asc')
            ->get();

        $sign = fn(string $code, float $val) => in_array($code, ['AV', 'AA']) ? -$val : $val;

        $items = $rows->map(fn($r) => [
            'id'              => $r->id,
            'document_number' => $r->document_number,
            'document_date'   => substr((string) $r->document_date, 0, 10),
            'type_code'       => $r->type_code,
            'type_name'       => $r->type_name,
            'party_name'      => $r->party_name,
            'quantity'        => round($sign((string) $r->type_code, (float) $r->quantity), 3),
            'total_ht'        => round($sign((string) $r->type_code, (float) $r->total_ht), 2),
            'total_tva'       => round($sign((string) $r->type_code, (float) $r->total_tva), 2),
            'total_ttc'       => round($sign((string) $r->type_code, (float) $r->total_ttc), 2),
        ])->values()->toArray();

        return [
            'items'   => $items,
            'summary' => [
                'doc_count' => count($items),
                'total_qty' => round(array_sum(array_column($items, 'quantity')), 3),
                'total_ht'  => round(array_sum(array_column($items, 'total_ht')), 2),
                'total_ttc' => round(array_sum(array_column($items, 'total_ttc')), 2),
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
        $expenseQuery = DB::table('expenses')->where('company_id', $this->companyId());

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

    public function returnsReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party'])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', ['AV', 'AA']));

        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $documents = $query->orderBy('document_date', 'desc')->get();

        $saleReturns   = $documents->filter(fn($d) => $d->documentType?->code === 'AV');
        $purchaseReturns = $documents->filter(fn($d) => $d->documentType?->code === 'AA');

        $lineData = [];
        if ($documents->isNotEmpty()) {
            $lineData = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $documents->pluck('id'))
                ->select(
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw('SUM(cdl.quantity) as total_qty'),
                    DB::raw('SUM(cdl.total_ht) as total_ht'),
                    DB::raw('SUM(cdl.total_ttc) as total_ttc')
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_ht')
                ->get()
                ->toArray();
        }

        $returnDocs = $documents->map(fn($doc) => [
            'id'              => $doc->id,
            'document_number' => $doc->document_number,
            'document_type'   => $doc->documentType?->code,
            'document_type_name' => $doc->documentType?->name,
            'date'            => $doc->document_date?->format('Y-m-d'),
            'party_name'      => $doc->party?->name,
            'total_ht'        => round($doc->total_ht, 2),
            'total_ttc'       => round($doc->total_ttc, 2),
            'reason'          => $doc->notes,
        ])->toArray();

        $returnDocs = $this->attachDocumentLines($returnDocs, $documents);

        return [
            'documents' => $returnDocs,
            'product_recap' => array_map(fn($lr) => [
                'product_id'   => $lr->product_id,
                'product_name' => $lr->product_name,
                'product_ref'  => $lr->product_ref,
                'total_qty'    => (float) $lr->total_qty,
                'total_ht'     => round((float) $lr->total_ht, 2),
                'total_ttc'    => round((float) $lr->total_ttc, 2),
            ], $lineData),
            'summary' => [
                'total_returns'      => $documents->count(),
                'sale_returns'       => $saleReturns->count(),
                'purchase_returns'   => $purchaseReturns->count(),
                'total_ht'           => round($documents->sum('total_ht'), 2),
                'total_ttc'          => round($documents->sum('total_ttc'), 2),
                'sale_returns_ht'    => round($saleReturns->sum('total_ht'), 2),
                'purchase_returns_ht' => round($purchaseReturns->sum('total_ht'), 2),
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
                'mode'   => $name ?? 'غير محدد',
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
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
            ->where('e.company_id', $companyId);

        if ($from && $to) $query->whereBetween('e.date', [$from, $to]);

        $rows = $query->select(
            'e.id', 'e.expense_number', 'e.date', 'e.amount', 'e.description', 'e.status',
            'ec.name as category_name'
        )->orderBy('e.date', 'desc')->get();

        $byCategoryQb = DB::table('expenses as e')
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
            ->where('e.company_id', $companyId)
            ->select('ec.name as category_name', DB::raw('SUM(e.amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('ec.name')
            ->orderByDesc('total');

        if ($from && $to) $byCategoryQb->whereBetween('e.date', [$from, $to]);
        $byCategory = $byCategoryQb->get();

        $monthlyQb = DB::table('expenses')
            ->where('company_id', $companyId)
            ->select(DB::raw("DATE_FORMAT(date, '%Y-%m') as month"), DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
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
                'category_name' => $r->category_name ?? 'غير مصنف',
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

    public function salesTrendReport(array $filters = []): array
    {
        $query = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES));

        if (!empty($filters['fiscal_year_id'])) {
            $query->where('fiscal_year_id', $filters['fiscal_year_id']);
        }
        if (!empty($filters['from_date'])) $query->whereDate('document_date', '>=', $filters['from_date']);
        if (!empty($filters['to_date']))   $query->whereDate('document_date', '<=', $filters['to_date']);

        $documents = $query->get();

        $daily = $documents->groupBy(fn($d) => $d->document_date?->format('Y-m-d'))
            ->map(fn($docs, $date) => [
                'date'       => $date,
                'count'      => $docs->count(),
                'total_ht'   => round($docs->sum('total_ht'), 2),
                'total_ttc'  => round($docs->sum('total_ttc'), 2),
            ])->values()->toArray();

        $weekly = $documents->groupBy(fn($d) => $d->document_date?->startOfWeek()?->format('Y-W'))
            ->map(fn($docs, $week) => [
                'week'      => $week,
                'count'     => $docs->count(),
                'total_ht'  => round($docs->sum('total_ht'), 2),
                'total_ttc' => round($docs->sum('total_ttc'), 2),
            ])->values()->toArray();

        $monthly = $documents->groupBy(fn($d) => $d->document_date?->format('Y-m'))
            ->map(fn($docs, $month) => [
                'month'     => $month,
                'count'     => $docs->count(),
                'total_ht'  => round($docs->sum('total_ht'), 2),
                'total_ttc' => round($docs->sum('total_ttc'), 2),
            ])->values()->toArray();

        $byType = $documents->groupBy('documentType.code')
            ->map(fn($docs, $code) => [
                'code'      => $code,
                'count'     => $docs->count(),
                'total_ht'  => round($docs->sum('total_ht'), 2),
                'total_ttc' => round($docs->sum('total_ttc'), 2),
            ])->values()->toArray();

        return [
            'daily'   => $daily,
            'weekly'  => $weekly,
            'monthly' => $monthly,
            'by_type' => $byType,
            'summary' => [
                'total_docs'  => $documents->count(),
                'total_ht'    => round($documents->sum('total_ht'), 2),
                'total_ttc'   => round($documents->sum('total_ttc'), 2),
                'avg_ht'      => $documents->count() > 0 ? round($documents->sum('total_ht') / $documents->count(), 2) : 0,
                'days_with_sales' => count($daily),
            ],
        ];
    }

    public function stockMovementsReport(array $filters = []): array
    {
        $query = DB::table('stock_movements as sm')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('warehouses as w', 'w.id', '=', 'sm.warehouse_id')
            ->leftJoin('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->where('sm.company_id', $this->companyId());

        if (!empty($filters['product_id'])) $query->where('sm.product_id', $filters['product_id']);
        if (!empty($filters['warehouse_id'])) $query->where('sm.warehouse_id', $filters['warehouse_id']);
        if (!empty($filters['from_date'])) $query->whereDate('sm.movement_date', '>=', $filters['from_date']);
        if (!empty($filters['to_date']))   $query->whereDate('sm.movement_date', '<=', $filters['to_date']);

        $movements = $query->select(
            'sm.id', 'sm.movement_date', 'sm.quantity', 'sm.unit_price', 'sm.cost_price',
            'sm.total_price', 'sm.reason', 'sm.lot_number',
            'p.name as product_name', 'p.ref as product_ref',
            'w.name as warehouse_name',
            'smt.label as type_label', 'smt.direction as direction'
        )->orderBy('sm.movement_date', 'desc')->limit(500)->get();

        $summaryQuery = DB::table('stock_movements as sm')
            ->leftJoin('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id')
            ->where('sm.company_id', $this->companyId());

        if (!empty($filters['product_id'])) $summaryQuery->where('sm.product_id', $filters['product_id']);
        if (!empty($filters['warehouse_id'])) $summaryQuery->where('sm.warehouse_id', $filters['warehouse_id']);
        if (!empty($filters['from_date'])) $summaryQuery->whereDate('sm.movement_date', '>=', $filters['from_date']);
        if (!empty($filters['to_date']))   $summaryQuery->whereDate('sm.movement_date', '<=', $filters['to_date']);

        $totals = $summaryQuery->select(
            DB::raw('SUM(CASE WHEN smt.direction = 1 THEN sm.quantity ELSE 0 END) as total_in'),
            DB::raw('SUM(CASE WHEN smt.direction = -1 THEN sm.quantity ELSE 0 END) as total_out'),
            DB::raw('SUM(CASE WHEN smt.direction = 0 THEN sm.quantity ELSE 0 END) as total_adjustment'),
            DB::raw('COUNT(*) as movement_count')
        )->first();

        return [
            'movements' => $movements->map(fn($m) => [
                'id'             => $m->id,
                'movement_date'  => $m->movement_date ? date('Y-m-d', strtotime($m->movement_date)) : null,
                'product_name'   => $m->product_name,
                'product_ref'    => $m->product_ref,
                'warehouse_name' => $m->warehouse_name,
                'type_label'     => $m->type_label,
                'direction'      => (int) $m->direction,
                'quantity'       => (float) $m->quantity,
                'unit_price'     => round((float) $m->unit_price, 2),
                'total_price'    => round((float) $m->total_price, 2),
                'reason'         => $m->reason,
                'lot_number'     => $m->lot_number,
            ])->toArray(),
            'summary' => [
                'total_in'        => round((float) ($totals->total_in ?? 0), 2),
                'total_out'       => round((float) ($totals->total_out ?? 0), 2),
                'total_adjustment' => round((float) ($totals->total_adjustment ?? 0), 2),
                'movement_count'  => (int) ($totals->movement_count ?? 0),
            ],
        ];
    }

    /**
     * تقرير المصفوفة: صفوف = أطراف (زبائن أو موردون)، أعمدة = منتجات.
     * كل خلية = الكمية / HT / TTC / التكلفة للزوج (طرف × منتج).
     * الإرجاعات (AV/AA) تُحتسب بقيمة سالبة في الخلية.
     *
     * @param string $mode 'sale' → زبائن (SALE_CODES) ، 'purchase' → موردون (PURCHASE_CODES)
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
            ->join('products as p',              'p.id',  '=', 'cdl.product_id')
            ->where('cd.company_id', $companyId)
            ->where('pt.party_type_id', $partyType)
            ->whereIn('dt.code', $docCodes)
            ->whereNull('cd.deleted_at')
            ->whereNull('pt.deleted_at');

        if ($fiscalYearId) $query->where('cd.fiscal_year_id', $fiscalYearId);
        if ($fromDate)     $query->whereDate('cd.document_date', '>=', $fromDate);
        if ($toDate)       $query->whereDate('cd.document_date', '<=', $toDate);
        if ($familyId)     $query->where('p.family_id', $familyId);
        if ($brandId)      $query->where('p.brand_id', $brandId);

        $sign = "CASE WHEN dt.code IN ('AV', 'AA') THEN -1 ELSE 1 END";

        $rows = $query->select(
            'cd.party_id',
            'pt.name as party_name',
            'pt.code as party_code',
            'p.id as product_id',
            'p.name as product_name',
            'p.ref as product_ref',
            DB::raw("SUM({$sign} * cdl.quantity) as qty"),
            DB::raw("SUM({$sign} * cdl.total_ht)  as ht"),
            DB::raw("SUM({$sign} * cdl.total_ttc) as ttc"),
            DB::raw("SUM({$sign} * cdl.quantity * cdl.cost_price_ht) as cost")
        )
            ->groupBy('cd.party_id', 'pt.name', 'pt.code', 'p.id', 'p.name', 'p.ref')
            ->get();

        $partyMap   = [];
        $productMap = [];

        foreach ($rows as $r) {
            $partyId = $r->party_id;
            $prodId  = $r->product_id;
            $qty     = (float) $r->qty;
            $ht      = (float) $r->ht;
            $ttc     = (float) $r->ttc;
            $cost    = (float) $r->cost;

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
                    'name'        => $r->product_name,
                    'ref'         => $r->product_ref,
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

        // ترتيب: الأطراف والأعمدة حسب إجمالي HT تنازلياً (الأكثر مبيعاً أولاً)
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
     * تفاصيل خلية المصفوفة: الوثائق الفعلية لزوج (طرف × منتج) ضمن الفترة.
     * تُستخدم في "التنقيب" عند النقر على خلية في تقرير المصفوفة.
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

    /**
     * رقم الأعمال الشهري حسب الزبون (Chiffre d'affaires mensuel par client).
     * الصفوف = الزبائن، الأعمدة = الأشهر، الخلية = إجمالي الزبون في ذلك الشهر.
     * الإرجاعات (AV) تُحتسب بإشارة سالبة.
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

        // أشهر الفترة (شهراً بشهر من «من» إلى «إلى»)
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

        // الترتيب حسب رقم الأعمال (TTC) تنازلياً
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

    /**
     * دفتر الأستاذ العام (Grand Livre): سجل زمني لكل الحركات (وثائق + دفعات)
     * لكل طرف في الفترة، مع الرصيد الافتتاحي قبل بداية الفترة والرصيد الجاري.
     * debit = ما هو مستحق لنا / credit = ما هو مستحق منا.
     */
    public function grandLivreReport(array $filters = []): array
    {
        $companyId    = $this->companyId();
        $partyId      = $filters['party_id'] ?? null;
        $partyTypeId  = $filters['party_type_id'] ?? null;
        $fromDate     = $filters['from_date'] ?? null;
        $toDate       = $filters['to_date'] ?? null;

        $empty = [
            'parties' => [],
            'summary' => [
                'party_count'      => 0,
                'transaction_count'=> 0,
                'total_debit'      => 0.0,
                'total_credit'     => 0.0,
                'net'              => 0.0,
            ],
        ];

        if (!$fromDate || !$toDate) {
            return $empty;
        }

        $from = Carbon::parse($fromDate)->toDateString();
        $to   = Carbon::parse($toDate)->toDateString();

        // 1. نطاق الأطراف
        $partyQuery = DB::table('parties as pt')
            ->where('pt.company_id', $companyId)
            ->whereNull('pt.deleted_at')
            ->select('pt.id', 'pt.name', 'pt.code', 'pt.party_type_id');
        if ($partyId)     $partyQuery->where('pt.id', $partyId);
        if ($partyTypeId) $partyQuery->where('pt.party_type_id', $partyTypeId);

        $parties  = $partyQuery->get();
        $partyIds = $parties->pluck('id');
        if ($partyIds->isEmpty()) {
            return $empty;
        }

        // 2. الرصيد الافتتاحي لكل طرف قبل بداية الفترة (نفس SSOT الخاص بالرصيد)
        $balanceService = app(PartyBalanceService::class);
        $openingMap     = [];
        $beforeDate     = Carbon::parse($from)->subDay()->toDateString();
        foreach ($balanceService->getAllBalancesAt($beforeDate, $partyTypeId) as $ob) {
            $openingMap[$ob['party_id']] = (float) $ob['current_balance'];
        }

        // 3. الوثائق
        $documents = DB::table('commercial_documents as cd')
            ->join('document_types as dt',             'cd.document_type_id',           '=', 'dt.id')
            ->join('document_base_operations as dbo',  'dt.document_base_operation_id', '=', 'dbo.id')
            ->where('cd.company_id',         $companyId)
            ->whereIn('cd.party_id',         $partyIds)
            ->where('dt.affects_accounting', true)
            ->whereDate('cd.document_date',  '>=', $from)
            ->whereDate('cd.document_date',  '<=', $to)
            ->whereNull('cd.deleted_at')
            ->select(
                'cd.id',
                'cd.party_id',
                'cd.document_number',
                'cd.document_date',
                'cd.net_to_pay',
                'cd.created_at',
                'dt.name as type_name',
                'dt.code as type_code',
                'dbo.name as operation'
            )
            ->get();

        // 4. الدفعات
        $payments = DB::table('payments')
            ->leftJoin('payment_modes as pm', 'payments.payment_mode_id', '=', 'pm.id')
            ->where('payments.company_id',   $companyId)
            ->whereIn('payments.party_id',   $partyIds)
            ->where('payments.status',       'confirmed')
            ->whereDate('payments.payment_date', '>=', $from)
            ->whereDate('payments.payment_date', '<=', $to)
            ->whereNull('payments.deleted_at')
            ->select(
                'payments.id',
                'payments.party_id',
                'payments.payment_number',
                'payments.payment_date',
                'payments.amount',
                'payments.direction',
                'payments.created_at',
                'pm.name as mode_name'
            )
            ->get();

        // 5. تجميع الحركات لكل طرف
        $txByParty = [];
        foreach ($documents as $doc) {
            [$debit, $credit] = $this->ledgerSplit((string) $doc->operation, $doc->type_code, (float) $doc->net_to_pay);
            $txByParty[$doc->party_id][] = [
                'type'      => 'document',
                'date'      => substr((string) $doc->document_date, 0, 10),
                'datetime'  => (string) $doc->created_at,
                'reference' => $doc->document_number,
                'label'     => $doc->type_name,
                'type_code' => $doc->type_code,
                'debit'     => $debit,
                'credit'    => $credit,
            ];
        }
        foreach ($payments as $p) {
            $amount = (float) $p->amount;
            if ($p->direction === 'out') {
                $debit  = round($amount, 2);
                $credit = 0.0;
            } else {
                $debit  = 0.0;
                $credit = round($amount, 2);
            }
            $txByParty[$p->party_id][] = [
                'type'      => 'payment',
                'date'      => substr((string) $p->payment_date, 0, 10),
                'datetime'  => (string) $p->created_at,
                'reference' => $p->payment_number,
                'label'     => $p->mode_name ?: 'دفعة',
                'type_code' => null,
                'debit'     => $debit,
                'credit'    => $credit,
            ];
        }

        // 6. ترتيب زمني + رصيد جاري
        $resultParties = [];
        $totalDebit    = 0.0;
        $totalCredit   = 0.0;
        $txCount       = 0;

        foreach ($parties as $party) {
            $opening = round($openingMap[$party->id] ?? 0.0, 2);
            $txs     = $txByParty[$party->id] ?? [];

            // أطراف بلا حركة في الفترة ولا رصيد افتتاحي → تُتجاهل
            if (empty($txs) && abs($opening) < 0.005) {
                continue;
            }

            usort($txs, function ($a, $b) {
                $cmp = strcmp($a['date'], $b['date']);
                if ($cmp !== 0) return $cmp;
                $cmp = strcmp($a['datetime'] ?? '', $b['datetime'] ?? '');
                if ($cmp !== 0) return $cmp;
                if ($a['type'] !== $b['type']) return $a['type'] === 'document' ? -1 : 1;
                return strcmp((string) $a['reference'], (string) $b['reference']);
            });

            $running  = $opening;
            $pDebit   = 0.0;
            $pCredit  = 0.0;
            foreach ($txs as $i => &$tx) {
                $tx['seq']     = $i + 1;
                $running += $tx['debit'] - $tx['credit'];
                $tx['balance'] = round($running, 2);
                $pDebit  += $tx['debit'];
                $pCredit += $tx['credit'];
            }
            unset($tx);

            $resultParties[] = [
                'id'              => $party->id,
                'name'            => $party->name,
                'code'            => $party->code,
                'party_type_id'   => $party->party_type_id,
                'opening_balance' => $opening,
                'closing_balance' => round($running, 2),
                'total_debit'     => round($pDebit, 2),
                'total_credit'    => round($pCredit, 2),
                'transactions'    => $txs,
            ];

            $totalDebit  += $pDebit;
            $totalCredit += $pCredit;
            $txCount     += count($txs);
        }

        usort($resultParties, fn($a, $b) => strcmp($a['name'], $b['name']));

        return [
            'parties' => $resultParties,
            'summary' => [
                'party_count'       => count($resultParties),
                'transaction_count' => $txCount,
                'total_debit'       => round($totalDebit, 2),
                'total_credit'      => round($totalCredit, 2),
                'net'               => round($totalDebit - $totalCredit, 2),
            ],
        ];
    }

    /**
     * تقسيم مبلغ حركة إلى (مدين / دائن) وفق اتفاقية الرصيد الموحدة:
     * بيع → مدين (+)، إرجاع بيع (AV) → دائن، شراء → دائن (−)، إرجاع شراء (AA) → مدين.
     */
    private function ledgerSplit(string $operation, ?string $code, float $net): array
    {
        $net = round($net, 2);
        if ($operation === 'sale') {
            return $code === 'AV' ? [0.0, $net] : [$net, 0.0];
        }
        if ($operation === 'purchase') {
            return $code === 'AA' ? [$net, 0.0] : [0.0, $net];
        }
        return [0.0, 0.0];
    }
}

<?php

namespace App\Services\Reports;

use App\Models\CommercialDocument;
use App\Models\Payment;
use App\Models\Product;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Sales-side document reports: sales, returns, daily, trend and velocity.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class SalesReports
{
    use ReportQueryHelpers;

    public function salesReport(array $filters = []): array
    {
        $canViewCost = $this->canViewCost();
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
                ->whereNull('cd.deleted_at')
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
                ->leftJoin('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.product_id',
                    DB::raw("MAX(CASE WHEN cdl.product_id IS NULL THEN cdl.description ELSE NULL END) as manual_description"),
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ttc ELSE cdl.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_tva ELSE cdl.total_tva END) as total_tva"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_discount_amount ELSE cdl.total_discount_amount END) as total_discount")
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref', DB::raw("CASE WHEN cdl.product_id IS NULL THEN COALESCE(cdl.description, '') ELSE '' END"))
                ->orderByDesc('total_ht')
                ->get();

            foreach ($lineRows as $lr) {
                $isManual = $lr->product_id === null || $lr->product_id === '';
                $name = $isManual
                    ? (trim((string) ($lr->manual_description ?? '')) ?: 'منتج يدوي')
                    : ($lr->product_name ?? '—');
                $ref = $isManual ? 'يدوي' : ($lr->product_ref ?? '—');
                $ht = (float) $lr->total_ht;
                $cost = (float) $lr->total_cost;
                $margin = $ht - $cost;
                $productRecap[] = [
                    'product_id'     => $lr->product_id !== null ? (int) $lr->product_id : null,
                    'is_manual'      => $isManual,
                    'product_name'   => $name,
                    'product_ref'    => $ref,
                    'total_qty'      => (float) $lr->total_qty,
                    'total_ht'       => round($ht, 2),
                    'total_tva'      => round((float) $lr->total_tva, 2),
                    'total_ttc'      => round((float) $lr->total_ttc, 2),
                    'total_cost'     => $canViewCost ? round($cost, 2) : null,
                    'total_discount' => round((float) $lr->total_discount, 2),
                    'margin_value'   => $canViewCost ? round($margin, 2) : null,
                    'margin_pct'     => $canViewCost ? ($ht > 0 ? round($margin / $ht * 100, 2) : 0) : null,
                ];
            }
        }

        $docsArray = $documents->map(function ($doc) use ($costMap, $discountMap, $canViewCost) {
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
                'doc_cost_ht'       => $canViewCost ? round($docCost, 2) : null,
                'margin_value'      => $canViewCost ? round($doc->total_ht - $docCost, 2) : null,
                'payment_status'    => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
                'status'            => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
            ];
        })->toArray();

        $docsArray = $this->attachDocumentLines($docsArray, $documents);

        $totalCost = array_sum($costMap);
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
                'total_cost'        => $canViewCost ? round($totalCost, 2) : null,
                'total_margin'      => $canViewCost ? round($totalHt - $totalCost, 2) : null,
                'margin_pct'        => $canViewCost ? ($totalHt > 0 ? round(($totalHt - $totalCost) / $totalHt * 100, 2) : 0) : null,
                'total_paid'        => round($documents->sum('paid_amount'), 2),
                'total_remaining'   => round($documents->sum('remaining_amount'), 2),
                'count'             => $documents->count(),
                'unpaid_count'      => $documents->where('remaining_amount', '>', 0.01)->count(),
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
                ->leftJoin('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->where('cd.company_id', $this->companyId())
                ->whereIn('cdl.commercial_document_id', $documents->pluck('id'))
                ->select(
                    'cdl.product_id',
                    DB::raw("MAX(CASE WHEN cdl.product_id IS NULL THEN cdl.description ELSE NULL END) as manual_description"),
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw('SUM(cdl.quantity) as total_qty'),
                    DB::raw('SUM(cdl.total_ht) as total_ht'),
                    DB::raw('SUM(cdl.total_ttc) as total_ttc')
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref', DB::raw("CASE WHEN cdl.product_id IS NULL THEN COALESCE(cdl.description, '') ELSE '' END"))
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
            'product_recap' => array_map(function ($lr) {
                $isManual = $lr->product_id === null || $lr->product_id === '';
                $name = $isManual
                    ? (trim((string) ($lr->manual_description ?? '')) ?: 'منتج يدوي')
                    : ($lr->product_name ?? '—');
                $ref = $isManual ? 'يدوي' : ($lr->product_ref ?? '—');

                return [
                    'product_id'   => $lr->product_id !== null ? (int) $lr->product_id : null,
                    'is_manual'    => $isManual,
                    'product_name' => $name,
                    'product_ref'  => $ref,
                    'total_qty'    => (float) $lr->total_qty,
                    'total_ht'     => round((float) $lr->total_ht, 2),
                    'total_ttc'    => round((float) $lr->total_ttc, 2),
                ];
            }, $lineData),
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

    public function velocityReport(array $filters = []): array
    {
        $from = $filters['from_date'] ?? now()->subMonth(3)->toDateString();
        $to   = $filters['to_date']   ?? now()->toDateString();
        $fyId = $filters['fiscal_year_id'] ?? null;

        $rows = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->whereNull('cd.deleted_at')
            ->where('cd.company_id', $this->companyId())
            ->whereDate('cd.document_date', '>=', $from)
            ->whereDate('cd.document_date', '<=', $to)
            ->whereIn('dt.code', array_merge(self::SALE_CODES, ['BL', 'BCC']))
            ->select(
                'cdl.product_id',
                DB::raw("MAX(CASE WHEN cdl.product_id IS NULL THEN cdl.description ELSE NULL END) as manual_description"),
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                DB::raw('COUNT(DISTINCT cdl.commercial_document_id) as doc_count'),
                DB::raw('AVG(cdl.unit_price_ht) as avg_price'),
            );
        if ($fyId) $rows->where('cd.fiscal_year_id', $fyId);

        $rows = $rows->groupBy('cdl.product_id', DB::raw("CASE WHEN cdl.product_id IS NULL THEN COALESCE(cdl.description, '') ELSE '' END"))
            ->orderByDesc('total_qty')
            ->limit(50)
            ->get();

        $productIds = $rows->pluck('product_id')->filter()->unique()->values();
        $products   = $productIds->isNotEmpty()
            ? Product::whereIn('id', $productIds)->get()->keyBy('id')
            : collect();

        $days = max(1, Carbon::parse($from)->diffInDays(Carbon::parse($to)));

        $items = $rows->map(function ($r) use ($products, $days) {
            $isManual = $r->product_id === null || $r->product_id === '';
            $name = $isManual
                ? (trim((string) ($r->manual_description ?? '')) ?: 'منتج يدوي')
                : ($products->get($r->product_id)?->name ?? '—');
            $ref = $isManual ? 'يدوي' : ($products->get($r->product_id)?->ref ?? '—');

            return [
                'product_id'   => $r->product_id !== null ? (int) $r->product_id : null,
                'is_manual'    => $isManual,
                'product_name' => $name,
                'product_ref'  => $ref,
                'total_qty'    => (float) $r->total_qty,
                'doc_count'    => (int) $r->doc_count,
                'avg_price'    => round((float) $r->avg_price, 2),
                'velocity'     => $days > 0 ? round((float) $r->total_qty / $days, 2) : 0,
                'days'         => $days,
            ];
        })->values()->toArray();

        return [
            'items' => $items,
            'summary' => [
                'total_qty'    => round($rows->sum('total_qty'), 2),
                'total_docs'   => $rows->sum('doc_count'),
                'period_days'  => $days,
            ],
        ];
    }
}

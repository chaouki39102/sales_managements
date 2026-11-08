<?php

namespace App\Services\Reports;

use App\Models\CommercialDocument;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Illuminate\Support\Facades\DB;

/**
 * Purchase-side document reports.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class PurchaseReports
{
    use ReportQueryHelpers;

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
                ->whereNull('cd.deleted_at')
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
}

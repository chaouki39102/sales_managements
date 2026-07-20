<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Party;
use App\Models\Product;
use App\Models\Payment;
use App\Models\StockMovement;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportService
{
    private const SALE_CODES = ['FV', 'AV', 'POS'];
    private const PURCHASE_CODES = ['FA', 'AA'];

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
        if ($docIds->isNotEmpty()) {
            $costRows = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.commercial_document_id',
                    DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as doc_cost_ht")
                )
                ->groupBy('cdl.commercial_document_id')
                ->get()
                ->keyBy('commercial_document_id');

            foreach ($costRows as $cr) {
                $costMap[$cr->commercial_document_id] = (float) $cr->doc_cost_ht;
            }
        }

        $productRecap = [];
        if ($docIds->isNotEmpty()) {
            $lineRows = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
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

        $docsArray = $documents->map(function ($doc) use ($costMap) {
            $docCost = $costMap[$doc->id] ?? 0;
            return [
                'id'                => $doc->id,
                'document_number'   => $doc->document_number,
                'document_type'     => $doc->documentType?->code,
                'date'              => $doc->document_date?->format('Y-m-d'),
                'party_name'        => $doc->party?->name,
                'total_ht'          => round($doc->total_ht, 2),
                'total_tva'         => round($doc->total_tva, 2),
                'total_stamp'       => round($doc->total_stamp, 2),
                'total_ttc'         => round($doc->total_ttc, 2),
                'paid_amount'       => round($doc->paid_amount, 2),
                'remaining_amount'  => round($doc->remaining_amount, 2),
                'doc_cost_ht'       => round($docCost, 2),
                'margin_value'      => round($doc->total_ht - $docCost, 2),
                'payment_status'    => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
            ];
        })->toArray();

        $totalCost = array_sum(array_column($docsArray, 'doc_cost_ht'));
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
        if ($docIds->isNotEmpty()) {
            $lineRows = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereIn('cdl.commercial_document_id', $docIds)
                ->select(
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_ttc ELSE cdl.total_ttc END) as total_ttc"),
                    DB::raw("SUM(CASE WHEN dt.code = 'AA' THEN -cdl.total_tva ELSE cdl.total_tva END) as total_tva")
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_ht')
                ->get();

            $productRecap = [];
            foreach ($lineRows as $lr) {
                $productRecap[] = [
                    'product_id'   => $lr->product_id,
                    'product_name' => $lr->product_name,
                    'product_ref'  => $lr->product_ref,
                    'total_qty'    => (float) $lr->total_qty,
                    'total_ht'     => round((float) $lr->total_ht, 2),
                    'total_tva'    => round((float) $lr->total_tva, 2),
                    'total_ttc'    => round((float) $lr->total_ttc, 2),
                ];
            }
        } else {
            $productRecap = [];
        }

        $docsArray = $documents->map(fn($doc) => [
            'id'                => $doc->id,
            'document_number'   => $doc->document_number,
            'document_type'     => $doc->documentType?->code,
            'date'              => $doc->document_date?->format('Y-m-d'),
            'party_name'        => $doc->party?->name,
            'total_ht'          => round($doc->total_ht, 2),
            'total_tva'         => round($doc->total_tva, 2),
            'total_ttc'         => round($doc->total_ttc, 2),
            'paid_amount'       => round($doc->paid_amount, 2),
            'remaining_amount'  => round($doc->remaining_amount, 2),
            'payment_status'    => $doc->remaining_amount > 0.01 ? 'unpaid' : 'paid',
        ])->toArray();

        return [
            'documents'     => $docsArray,
            'product_recap' => $productRecap,
            'summary'       => [
                'total_ht'          => round($documents->sum('total_ht'), 2),
                'total_tva'         => round($documents->sum('total_tva'), 2),
                'total_ttc'         => round($documents->sum('total_ttc'), 2),
                'total_paid'        => round($documents->sum('paid_amount'), 2),
                'total_remaining'   => round($documents->sum('remaining_amount'), 2),
                'count'             => $documents->count(),
                'unpaid_count'      => $documents->where('remaining_amount', '>', 0.01)->count(),
            ],
        ];
    }

    public function customersReport(array $filters = []): array
    {
        $query = Party::where('party_type_id', 1)->with(['commune', 'wilaya']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        $parties = $query->orderBy('created_at', 'desc')->get();

        $partyIds = $parties->pluck('id');
        $partyStats = [];
        if ($partyIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_documents as cd')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereIn('cd.party_id', $partyIds)
                ->whereIn('dt.code', self::SALE_CODES);
            if (!empty($filters['fiscal_year_id'])) {
                $statsQuery->where('cd.fiscal_year_id', $filters['fiscal_year_id']);
            }
            $stats = $statsQuery->select(
                    'cd.party_id',
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
                    'doc_count'      => (int) $s->doc_count,
                    'total_ht'       => round((float) $s->total_ht, 2),
                    'total_ttc'      => round((float) $s->total_ttc, 2),
                    'total_paid'     => round((float) $s->total_paid, 2),
                    'total_remaining' => round((float) $s->total_remaining, 2),
                ];
            }
        }

        return [
            'customers' => $parties->map(function ($party) use ($partyStats) {
                $stats = $partyStats[$party->id] ?? ['doc_count' => 0, 'total_ht' => 0, 'total_ttc' => 0, 'total_paid' => 0, 'total_remaining' => 0];
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
                    'total_remaining' => $stats['total_remaining'],
                ];
            })->toArray(),
            'summary' => [
                'total_customers'   => $parties->count(),
                'total_ht'          => round(collect($partyStats)->sum('total_ht'), 2),
                'total_ttc'         => round(collect($partyStats)->sum('total_ttc'), 2),
                'total_remaining'   => round(collect($partyStats)->sum('total_remaining'), 2),
            ],
        ];
    }

    public function suppliersReport(array $filters = []): array
    {
        $query = Party::where('party_type_id', 2)->with(['commune', 'wilaya']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }

        $parties = $query->orderBy('created_at', 'desc')->get();

        $partyIds = $parties->pluck('id');
        $partyStats = [];
        if ($partyIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_documents as cd')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
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
        $query = Product::with(['family', 'brand', 'unit', 'tva']);

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }
        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        $products = $query->orderBy('name')->get();

        $productIds = $products->pluck('id');
        $salesStats = [];
        if ($productIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereIn('cdl.product_id', $productIds)
                ->whereIn('dt.code', self::SALE_CODES);
            if (!empty($filters['fiscal_year_id'])) {
                $statsQuery->where('cd.fiscal_year_id', $filters['fiscal_year_id']);
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

        return [
            'products' => $products->map(function ($product) use ($salesStats) {
                $ss = $salesStats[$product->id] ?? ['total_sold' => 0, 'sales_ht' => 0, 'sales_cost' => 0];
                $stockVal = round($product->current_stock * $product->current_cost_price, 2);
                $margin = $ss['sales_ht'] - $ss['sales_cost'];
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
                    'stock_quantity'       => $product->current_stock,
                    'min_stock_alert'     => $product->min_stock_alert,
                    'stock_value'         => $stockVal,
                    'total_sold'          => $ss['total_sold'],
                    'sales_ht'            => $ss['sales_ht'],
                    'sales_cost'          => $ss['sales_cost'],
                    'margin_value'        => round($margin, 2),
                    'margin_pct'          => $ss['sales_ht'] > 0 ? round($margin / $ss['sales_ht'] * 100, 2) : 0,
                ];
            })->toArray(),
            'summary' => [
                'total_products'    => $products->count(),
                'total_stock_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
                'total_sold'        => array_sum(array_column($salesStats, 'total_sold')),
                'total_sales_ht'    => round(array_sum(array_column($salesStats, 'sales_ht')), 2),
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

        $lowStock = $products->filter(fn($p) => $p->current_stock <= $p->min_stock_alert && $p->current_stock > 0);
        $outOfStock = $products->filter(fn($p) => $p->current_stock == 0);

        return [
            'products' => $products->map(fn($product) => [
                'id'                => $product->id,
                'ref'               => $product->ref,
                'name'              => $product->name,
                'family'            => $product->family?->name,
                'brand'             => $product->brand?->name,
                'stock_quantity'     => $product->current_stock,
                'min_stock_alert'    => $product->min_stock_alert,
                'purchase_price_ht'  => round($product->purchase_price_ht, 2),
                'current_cost_price' => round($product->current_cost_price, 2),
                'stock_value'        => round($product->current_stock * $product->current_cost_price, 2),
                'status'             => $product->current_stock == 0 ? 'out_of_stock' : ($product->current_stock <= $product->min_stock_alert ? 'low_stock' : 'in_stock'),
            ])->toArray(),
            'summary' => [
                'total_products'    => $products->count(),
                'total_quantity'    => $products->sum('current_stock'),
                'total_value'       => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
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
            ->whereDate('cd.document_date', '>=', $from)
            ->whereDate('cd.document_date', '<=', $to)
            ->whereIn('dt.code', array_merge(self::SALE_CODES, ['BL', 'BCC']))
            ->select(
                'cdl.product_id',
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity ELSE cdl.quantity END) as total_qty"),
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
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
            'cost_price'    => $products->get($r->product_id)?->current_cost_price ?? 0,
            'cost_total'    => round((float) $r->total_qty * ($products->get($r->product_id)?->current_cost_price ?? 0), 2),
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

        $invoices = CommercialDocument::with('party')
            ->whereHas('documentType', fn($q) => $q->whereIn('code', array_merge(self::SALE_CODES, ['BL', 'BCC'])))
            ->where('remaining_amount', '>', 0)
            ->whereDate('document_date', '<=', $refDate)
            ->orderBy('due_date')
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
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;

        $salesQuery = CommercialDocument::with([])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES));
        if ($fiscalYearId) $salesQuery->where('fiscal_year_id', $fiscalYearId);
        $salesDocs = $salesQuery->get();

        $purchasesQuery = CommercialDocument::with([])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::PURCHASE_CODES));
        if ($fiscalYearId) $purchasesQuery->where('fiscal_year_id', $fiscalYearId);
        $purchasesDocs = $purchasesQuery->get();

        $salesIds = $salesDocs->pluck('id');
        $totalSalesCost = 0;
        $productMargin = [];

        if ($salesIds->isNotEmpty()) {
            $lineData = DB::table('commercial_document_lines as cdl')
                ->join('products as p', 'p.id', '=', 'cdl.product_id')
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->select(
                    'cdl.product_id',
                    'p.name as product_name',
                    'p.ref as product_ref',
                    DB::raw('SUM(cdl.quantity) as total_qty'),
                    DB::raw('SUM(cdl.total_ht) as total_ht'),
                    DB::raw('SUM(cdl.quantity * cdl.cost_price_ht) as total_cost')
                )
                ->groupBy('cdl.product_id', 'p.name', 'p.ref')
                ->orderByDesc('total_ht')
                ->limit(10)
                ->get();

            foreach ($lineData as $ld) {
                $ht = (float) $ld->total_ht;
                $cost = (float) $ld->total_cost;
                $totalSalesCost += $cost;
                $margin = $ht - $cost;
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

        $totalSalesHt = $salesDocs->sum('total_ht');
        $totalSalesTtc = $salesDocs->sum('total_ttc');
        $totalPurchasesHt = $purchasesDocs->sum('total_ht');
        $totalPurchasesTtc = $purchasesDocs->sum('total_ttc');

        $topCustomers = CommercialDocument::with([])
            ->whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES))
            ->where('remaining_amount', '>', 0);
        if ($fiscalYearId) $topCustomers->where('fiscal_year_id', $fiscalYearId);
        $topCustomers = $topCustomers
            ->select('party_id', DB::raw('SUM(total_ttc) as total_ttc'), DB::raw('COUNT(*) as doc_count'))
            ->groupBy('party_id')
            ->orderByDesc('total_ttc')
            ->limit(10)
            ->get()
            ->map(function ($row) {
                $party = Party::find($row->party_id);
                return [
                    'party_name'   => $party?->name ?? '—',
                    'total_ttc'    => round((float) $row->total_ttc, 2),
                    'doc_count'    => (int) $row->doc_count,
                ];
            });

        $paymentsQuery = Payment::where('status', 'confirmed');
        if ($fiscalYearId) {
            $paymentsQuery->whereHas('commercialDocuments', fn($q) => $q->where('fiscal_year_id', $fiscalYearId));
        }
        $totalPayments = $paymentsQuery->sum('amount');

        return [
            'overview' => [
                'total_sales_ht'       => round($totalSalesHt, 2),
                'total_sales_ttc'      => round($totalSalesTtc, 2),
                'total_sales_cost'     => round($totalSalesCost, 2),
                'total_sales_margin'   => round($totalSalesHt - $totalSalesCost, 2),
                'sales_margin_pct'     => $totalSalesHt > 0 ? round(($totalSalesHt - $totalSalesCost) / $totalSalesHt * 100, 2) : 0,
                'total_purchases_ht'   => round($totalPurchasesHt, 2),
                'total_purchases_ttc'  => round($totalPurchasesTtc, 2),
                'total_payments'       => round((float) $totalPayments, 2),
                'total_receivable'     => round($salesDocs->sum('remaining_amount'), 2),
                'total_payable'        => round($purchasesDocs->sum('remaining_amount'), 2),
                'sales_count'          => $salesDocs->count(),
                'purchases_count'      => $purchasesDocs->count(),
                'unpaid_sales_count'   => $salesDocs->where('remaining_amount', '>', 0.01)->count(),
            ],
            'top_products'    => $productMargin,
            'top_customers'   => $topCustomers->toArray(),
            'cash_flow'       => [
                'collected'         => round((float) $totalPayments, 2),
                'outstanding'       => round($salesDocs->sum('remaining_amount'), 2),
                'collection_rate'   => $totalSalesTtc > 0 ? round((float) $totalPayments / $totalSalesTtc * 100, 2) : 0,
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
        ])->toArray();

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

    public function profitLossReport(array $filters = []): array
    {
        $fiscalYearId = $filters['fiscal_year_id'] ?? null;

        $salesQuery = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', self::SALE_CODES));
        $purchaseQuery = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', self::PURCHASE_CODES));
        $expenseQuery = DB::table('expenses');

        if ($fiscalYearId) {
            $fy = \App\Models\FiscalYear::find($fiscalYearId);
            if ($fy) {
                $salesQuery->whereBetween('document_date', [$fy->start_date, $fy->end_date]);
                $purchaseQuery->whereBetween('document_date', [$fy->start_date, $fy->end_date]);
                $expenseQuery->whereBetween('date', [$fy->start_date, $fy->end_date]);
            }
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
                ->whereIn('cdl.commercial_document_id', $salesIds)
                ->selectRaw("COALESCE(SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END), 0) as total")
                ->value('total') ?? 0;
        }

        $totalExpenses = $expenseQuery->sum('amount') ?? 0;

        $grossMargin = $salesHt - $salesCost;
        $netResult = $grossMargin - $totalExpenses;

        $expenseByCategory = [];
        if ($fiscalYearId) {
            $fy = \App\Models\FiscalYear::find($fiscalYearId);
            if ($fy) {
                $expenseByCategory = DB::table('expenses as e')
                    ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
                    ->whereBetween('e.date', [$fy->start_date, $fy->end_date])
                    ->select('ec.name as category_name', DB::raw('SUM(e.amount) as total'))
                    ->groupBy('ec.name')
                    ->get()
                    ->toArray();
            }
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

        return [
            'documents' => $documents->map(fn($doc) => [
                'id'              => $doc->id,
                'document_number' => $doc->document_number,
                'document_type'   => $doc->documentType?->code,
                'date'            => $doc->document_date?->format('Y-m-d'),
                'party_name'      => $doc->party?->name,
                'total_ht'        => round($doc->total_ht, 2),
                'total_ttc'       => round($doc->total_ttc, 2),
                'reason'          => $doc->notes,
            ])->toArray(),
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
        $query = DB::table('expenses as e')
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id');

        if (!empty($filters['fiscal_year_id'])) {
            $fy = \App\Models\FiscalYear::find($filters['fiscal_year_id']);
            if ($fy) $query->whereBetween('e.date', [$fy->start_date, $fy->end_date]);
        }
        if (!empty($filters['from_date'])) $query->whereDate('e.date', '>=', $filters['from_date']);
        if (!empty($filters['to_date']))   $query->whereDate('e.date', '<=', $filters['to_date']);

        $rows = $query->select(
            'e.id', 'e.expense_number', 'e.date', 'e.amount', 'e.description', 'e.status',
            'ec.name as category_name'
        )->orderBy('e.date', 'desc')->get();

        $byCategoryQb = DB::table('expenses as e')
            ->leftJoin('expense_categories as ec', 'ec.id', '=', 'e.expense_category_id')
            ->select('ec.name as category_name', DB::raw('SUM(e.amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('ec.name')
            ->orderByDesc('total');

        if (!empty($filters['fiscal_year_id'])) {
            $fy = \App\Models\FiscalYear::find($filters['fiscal_year_id']);
            if ($fy) $byCategoryQb->whereBetween('e.date', [$fy->start_date, $fy->end_date]);
        }
        $byCategory = $byCategoryQb->get();

        $monthlyQb = DB::table('expenses')
            ->select(DB::raw("strftime('%Y-%m', date) as month"), DB::raw('SUM(amount) as total'), DB::raw('COUNT(*) as count'))
            ->groupBy('month')
            ->orderBy('month');
        if (!empty($filters['fiscal_year_id'])) {
            $fyMonthly = \App\Models\FiscalYear::find($filters['fiscal_year_id']);
            if ($fyMonthly) $monthlyQb->whereBetween('date', [$fyMonthly->start_date, $fyMonthly->end_date]);
        }
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
            ->leftJoin('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id');

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
            ->leftJoin('stock_movement_types as smt', 'smt.id', '=', 'sm.stock_movement_type_id');

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
}

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
    public function salesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'));

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

        return [
            'documents' => $documents->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'date' => $doc->document_date?->format('Y-m-d'),
                'party_name' => $doc->party?->name,
                'total_ht' => round($doc->total_ht, 2),
                'total_tva' => round($doc->total_tva, 2),
                'total_ttc' => round($doc->total_ttc, 2),
                'paid_amount' => round($doc->paid_amount, 2),
                'remaining_amount' => round($doc->remaining_amount, 2),
                'status' => $doc->documentStatus?->name,
            ])->toArray(),
            'summary' => [
                'total_ht' => round($documents->sum('total_ht'), 2),
                'total_tva' => round($documents->sum('total_tva'), 2),
                'total_ttc' => round($documents->sum('total_ttc'), 2),
                'total_paid' => round($documents->sum('paid_amount'), 2),
                'total_remaining' => round($documents->sum('remaining_amount'), 2),
                'count' => $documents->count(),
            ],
        ];
    }

    public function purchasesReport(array $filters = []): array
    {
        $query = CommercialDocument::with(['documentType', 'party', 'currency'])
            ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'));

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

        return [
            'documents' => $documents->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'date' => $doc->document_date?->format('Y-m-d'),
                'party_name' => $doc->party?->name,
                'total_ht' => round($doc->total_ht, 2),
                'total_tva' => round($doc->total_tva, 2),
                'total_ttc' => round($doc->total_ttc, 2),
                'status' => $doc->documentStatus?->name,
            ])->toArray(),
            'summary' => [
                'total_ht' => round($documents->sum('total_ht'), 2),
                'total_tva' => round($documents->sum('total_tva'), 2),
                'total_ttc' => round($documents->sum('total_ttc'), 2),
                'count' => $documents->count(),
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

        return [
            'customers' => $parties->map(fn($party) => [
                'id' => $party->id,
                'code' => $party->code,
                'name' => $party->name,
                'activity' => $party->activity,
                'phone' => $party->phone,
                'email' => $party->email,
                'wilaya' => $party->wilaya?->name,
                'created_at' => $party->created_at?->format('Y-m-d'),
                'total_purchases' => round($party->commercialDocuments()
                    ->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))
                    ->sum('total_ttc') ?? 0, 2),
            ])->toArray(),
            'summary' => [
                'total_customers' => $parties->count(),
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

        return [
            'suppliers' => $parties->map(fn($party) => [
                'id' => $party->id,
                'code' => $party->code,
                'name' => $party->name,
                'activity' => $party->activity,
                'phone' => $party->phone,
                'email' => $party->email,
                'wilaya' => $party->wilaya?->name,
                'nif' => $party->nif,
                'nis' => $party->nis,
                'ai' => $party->ai,
                'total_purchases' => round($party->commercialDocuments()
                    ->whereHas('documentType', fn($q) => $q->where('code', 'purchase_invoice'))
                    ->sum('total_ttc') ?? 0, 2),
            ])->toArray(),
            'summary' => [
                'total_suppliers' => $parties->count(),
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

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'ref' => $product->ref,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'unit' => $product->unit?->name,
                'purchase_price_ht' => round($product->purchase_price_ht, 2),
                'current_cost_price' => round($product->current_cost_price, 2),
                'tva_rate' => $product->tva?->rate,
                'stock_quantity' => $product->current_stock, // ✅ استخدام attribute المحسوب
                'min_stock_alert' => $product->min_stock_alert,
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_stock_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
            ],
        ];
    }

    public function inventoryReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand']);

        $products = $query->get();

        $lowStock = $products->filter(fn($p) => $p->current_stock <= $p->min_stock_alert);
        $outOfStock = $products->filter(fn($p) => $p->current_stock == 0);

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'ref' => $product->ref,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'stock_quantity' => $product->current_stock,
                'min_stock_alert' => $product->min_stock_alert,
                'purchase_price_ht' => round($product->purchase_price_ht, 2),
                'stock_value' => round($product->current_stock * $product->current_cost_price, 2),
                'status' => $product->current_stock == 0 ? 'out_of_stock' : ($product->current_stock <= $product->min_stock_alert ? 'low_stock' : 'in_stock'),
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_quantity' => $products->sum('current_stock'),
                'total_value' => round($products->sum(fn($p) => $p->current_stock * $p->current_cost_price), 2),
                'low_stock_count' => $lowStock->count(),
                'out_of_stock_count' => $outOfStock->count(),
            ],
        ];
    }

    public function paymentsReport(array $filters = []): array
    {
        $query = Payment::with(['commercialDocument', 'paymentMode', 'treasuryAccount']);

        if (!empty($filters['from_date'])) {
            $query->whereDate('payment_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('payment_date', '<=', $filters['to_date']);
        }
        if (!empty($filters['payment_mode_id'])) {
            $query->where('payment_mode_id', $filters['payment_mode_id']);
        }

        $payments = $query->orderBy('payment_date', 'desc')->get();

        return [
            'payments' => $payments->map(fn($payment) => [
                'id' => $payment->id,
                'payment_date' => $payment->payment_date?->format('Y-m-d'),
                'amount' => round($payment->amount, 2),
                'document_number' => $payment->commercialDocument?->document_number,
                'payment_mode' => $payment->paymentMode?->name,
                'treasury_account' => $payment->treasuryAccount?->name,
                'reference' => $payment->reference,
                'notes' => $payment->notes,
            ])->toArray(),
            'summary' => [
                'total_amount' => round($payments->sum('amount'), 2),
                'count' => $payments->count(),
            ],
        ];
    }

    public function velocityReport(array $filters = []): array
    {
        $from = $filters['from_date'] ?? now()->subMonth(3)->toDateString();
        $to   = $filters['to_date']   ?? now()->toDateString();

        $rows = CommercialDocumentLine::select(
            'product_id',
            DB::raw('SUM(quantity) as total_qty'),
            DB::raw('COUNT(DISTINCT commercial_document_id) as doc_count'),
            DB::raw('AVG(unit_price_ht) as avg_price'),
        )
            ->whereHas('document', fn($q) => $q
                ->whereHas('documentType', fn($t) => $t->whereIn('code', ['FV', 'BL', 'BCC', 'AV']))
                ->whereDate('document_date', '>=', $from)
                ->whereDate('document_date', '<=', $to)
            )
            ->groupBy('product_id')
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

        $rows = CommercialDocumentLine::select(
            'product_id',
            DB::raw('SUM(quantity) as total_qty'),
            DB::raw('SUM(quantity * unit_price_ht) as total_ht'),
        )
            ->whereHas('document', fn($q) => $q
                ->whereHas('documentType', fn($t) => $t->whereIn('code', ['FV', 'BL', 'BCC', 'AV']))
                ->whereDate('document_date', '>=', $from)
                ->whereDate('document_date', '<=', $to)
            )
            ->groupBy('product_id')
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
            ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'BL', 'BCC']))
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
                'party_id'   => (int) $partyId,
                'party_name' => $party?->name ?? '—',
                'total_due'  => round($total, 2),
                'invoice_count' => $docs->count(),
                'max_days'   => $days,
                'bucket'     => $bucket,
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
        $query = CommercialDocument::whereHas('documentType', fn($q) => $q->whereIn('code', ['invoice', 'purchase_invoice']));

        if (!empty($filters['from_date'])) {
            $query->whereDate('document_date', '>=', $filters['from_date']);
        }
        if (!empty($filters['to_date'])) {
            $query->whereDate('document_date', '<=', $filters['to_date']);
        }

        $documents = $query->get();

        $salesInvoices = $documents->filter(fn($d) => $d->documentType?->code === 'invoice');
        $purchaseInvoices = $documents->filter(fn($d) => $d->documentType?->code === 'purchase_invoice');

        return [
            'sales' => [
                'total_ht' => round($salesInvoices->sum('total_ht'), 2),
                'total_tva' => round($salesInvoices->sum('total_tva'), 2),
                'total_stamp' => round($salesInvoices->sum('total_stamp'), 2),
                'total_ttc' => round($salesInvoices->sum('total_ttc'), 2),
                'count' => $salesInvoices->count(),
            ],
            'purchases' => [
                'total_ht' => round($purchaseInvoices->sum('total_ht'), 2),
                'total_tva' => round($purchaseInvoices->sum('total_tva'), 2),
                'total_stamp' => round($purchaseInvoices->sum('total_stamp'), 2),
                'total_ttc' => round($purchaseInvoices->sum('total_ttc'), 2),
                'count' => $purchaseInvoices->count(),
            ],
            'summary' => [
                'tva_collected' => round($salesInvoices->sum('total_tva'), 2),
                'tva_deductible' => round($purchaseInvoices->sum('total_tva'), 2),
                'tva_balance' => round($salesInvoices->sum('total_tva') - $purchaseInvoices->sum('total_tva'), 2),
            ],
        ];
    }
}

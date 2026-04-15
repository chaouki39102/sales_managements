<?php

namespace App\Services;

use App\Models\CommercialDocument;
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

        $customersWithSales = $query->clone()
            ->withCount(['commercialDocuments' => fn($q) => $q->whereHas('documentType', fn($q) => $q->where('code', 'invoice'))])
            ->get();

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
                'code' => $product->code,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'unit' => $product->unit?->name,
                'sale_price' => round($product->sale_price, 2),
                'purchase_price' => round($product->purchase_price, 2),
                'tva_rate' => $product->tva?->rate,
                'stock_quantity' => $product->variants->sum('quantity'),
                'minimum_stock' => $product->minimum_stock,
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_stock_value' => round($products->map(fn($p) => $p->variants->sum('quantity') * $p->purchase_price)->sum(), 2),
            ],
        ];
    }

    public function inventoryReport(array $filters = []): array
    {
        $query = Product::with(['variants', 'family', 'brand']);

        $products = $query->get();

        $lowStock = $products->filter(fn($p) => $p->variants->sum('quantity') <= ($p->minimum_stock ?? 0));
        $outOfStock = $products->filter(fn($p) => $p->variants->sum('quantity') == 0);

        return [
            'products' => $products->map(fn($product) => [
                'id' => $product->id,
                'code' => $product->code,
                'name' => $product->name,
                'family' => $product->family?->name,
                'brand' => $product->brand?->name,
                'quantity' => $product->variants->sum('quantity'),
                'minimum_stock' => $product->minimum_stock,
                'purchase_price' => round($product->purchase_price, 2),
                'stock_value' => round($product->variants->sum('quantity') * $product->purchase_price, 2),
                'status' => $product->variants->sum('quantity') == 0 ? 'out_of_stock' : ($product->variants->sum('quantity') <= ($product->minimum_stock ?? 0) ? 'low_stock' : 'in_stock'),
            ])->toArray(),
            'summary' => [
                'total_products' => $products->count(),
                'total_quantity' => $products->sum(fn($p) => $p->variants->sum('quantity')),
                'total_value' => round($products->map(fn($p) => $p->variants->sum('quantity') * $p->purchase_price)->sum(), 2),
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
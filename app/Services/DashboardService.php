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

class DashboardService
{
    public function getSummary(): array
    {
        $currentYear = Carbon::now()->year;
        $currentMonth = Carbon::now()->month;

        $salesTotal = CommercialDocument::whereYear('document_date', $currentYear)
            ->whereMonth('document_date', $currentMonth)
            ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'AV', 'POS']))
            ->sum('total_ttc');

        $purchasesTotal = CommercialDocument::whereYear('document_date', $currentYear)
            ->whereMonth('document_date', $currentMonth)
            ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FA', 'AA']))
            ->sum('total_ttc');

        $customersCount = Party::where('party_type_id', 1)->count();
        $suppliersCount = Party::where('party_type_id', 2)->count();
        $productsCount = Product::count();

        $unpaidInvoices = CommercialDocument::where('remaining_amount', '>', 0)
            ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'AV', 'POS']))
            ->count();

        $overdueInvoices = CommercialDocument::where('due_date', '<', Carbon::now())
            ->where('remaining_amount', '>', 0)
            ->count();

        return [
            'sales_this_month' => round($salesTotal, 2),
            'purchases_this_month' => round($purchasesTotal, 2),
            'customers_count' => $customersCount,
            'suppliers_count' => $suppliersCount,
            'products_count' => $productsCount,
            'unpaid_invoices' => $unpaidInvoices,
            'overdue_invoices' => $overdueInvoices,
        ];
    }

    public function getSalesChart(string $period = 'month'): array
    {
        $data = [];

        if ($period === 'year') {
            for ($month = 1; $month <= 12; $month++) {
                $total = CommercialDocument::whereYear('document_date', Carbon::now()->year)
                    ->whereMonth('document_date', $month)
                    ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'AV', 'POS']))
                    ->sum('total_ttc');
                $data[] = [
                    'month' => $month,
                    'label' => Carbon::create(null, $month)->format('M'),
                    'total' => round($total, 2),
                ];
            }
        } else {
            for ($i = 29; $i >= 0; $i--) {
                $date = Carbon::now()->subDays($i);
                $total = CommercialDocument::whereDate('document_date', $date)
                    ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'AV', 'POS']))
                    ->sum('total_ttc');
                $data[] = [
                    'date' => $date->format('Y-m-d'),
                    'label' => $date->format('d M'),
                    'total' => round($total, 2),
                ];
            }
        }

        return $data;
    }

    public function getTopProducts(int $limit = 10): array
    {
        return CommercialDocumentLine::select('product_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(total_ht) as total_amount'))
            ->whereHas('commercialDocument', fn($q) => $q->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'AV', 'POS'])))
            ->groupBy('product_id')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'product_id' => $item->product_id,
                'product_name' => $item->product?->name,
                'total_quantity' => $item->total_qty,
                'total_amount' => round($item->total_amount, 2),
            ])
            ->toArray();
    }

    public function getTopCustomers(int $limit = 10): array
    {
        return CommercialDocument::select('party_id', DB::raw('SUM(total_ttc) as total_amount'))
            ->whereHas('documentType', fn($q) => $q->whereIn('code', ['FV', 'AV', 'POS']))
            ->whereYear('document_date', Carbon::now()->year)
            ->groupBy('party_id')
            ->orderByDesc('total_amount')
            ->limit($limit)
            ->get()
            ->map(fn($item) => [
                'party_id' => $item->party_id,
                'party_name' => $item->party?->name,
                'total_amount' => round($item->total_amount, 2),
            ])
            ->toArray();
    }

    public function getRecentTransactions(int $limit = 10): array
    {
        return CommercialDocument::with(['documentType', 'party'])
            ->whereYear('document_date', Carbon::now()->year)
            ->orderByDesc('document_date')
            ->limit($limit)
            ->get()
            ->map(fn($doc) => [
                'id' => $doc->id,
                'document_number' => $doc->document_number,
                'document_type' => $doc->documentType?->name,
                'party_name' => $doc->party?->name,
                'total' => round($doc->total_ttc, 2),
                'status' => $doc->documentStatus?->name,
                'date' => $doc->document_date?->format('Y-m-d'),
            ])
            ->toArray();
    }

    public function getInventorySummary(): array
    {
        $totalProducts = Product::count();

        // جدول products لا يحتوي عمود current_stock — المخزون يُحسب من حركات
        // المخزون عبر الخدمة المرجعية (مخزَّنة 60 ثانية لكل شركة).
        $lowStockProducts = collect(
            app(InventoryStockService::class)->getStockAt(now()->toDateString())
        )->filter(fn ($r) => (float) $r['current_stock'] <= (float) $r['min_stock_alert'])
        ->count();

        // أنواع الحركات تُعرَّف بـ stock_movement_types.direction (+1/-1) —
        // لا يوجد عمود movement_type_id على جدول stock_movements.
        $monthlyMovements = StockMovement::query()
            ->join('stock_movement_types as smt', function ($j) {
                $j->on('smt.id', '=', 'stock_movements.stock_movement_type_id')
                  ->on('smt.company_id', '=', 'stock_movements.company_id');
            })
            ->whereYear('stock_movements.created_at', Carbon::now()->year)
            ->whereMonth('stock_movements.created_at', Carbon::now()->month);

        $stockIn = (clone $monthlyMovements)
            ->where('smt.direction', '>', 0)
            ->sum('stock_movements.quantity');

        $stockOut = (clone $monthlyMovements)
            ->where('smt.direction', '<', 0)
            ->sum('stock_movements.quantity');

        return [
            'total_products' => $totalProducts,
            'low_stock_count' => $lowStockProducts,
            'stock_in_this_month' => $stockIn ?? 0,
            'stock_out_this_month' => $stockOut ?? 0,
        ];
    }
}

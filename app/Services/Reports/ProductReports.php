<?php

namespace App\Services\Reports;

use App\Models\Product;
use App\Services\InventoryStockService;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Product profitability, dashboard, forecast and margin reports.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class ProductReports
{
    use ReportQueryHelpers;

    public function productsReport(array $filters = []): array
    {
        return $this->productProfitData($filters);
    }

    /**
     * ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„ط؛ظ†ظٹط©: ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظپطھط±ط© + ظ…ط´طھط±ظٹط§طھ ط§ظ„ظپطھط±ط© + ظ…طھظˆط³ط· ط³ط¹ط± ط§ظ„ط´ط±ط§ط، ط§ظ„ظ…ط±ط¬ط­
     * (ظƒظ„ ط§ظ„ظپطھط±ط§طھ) + طھظƒظ„ظپط© ط§ظ„ط¨ط¶ط§ط¹ط© ط§ظ„ظ…ط¨ط§ط¹ط© ط§ظ„ظ…ظ‚ط¯ط±ط© + ط§ظ„ط±ط¨ط­ ط§ظ„ظ…ظ‚ط¯ط± + ط­ط§ظ„ط© ط§ظ„ظ…ط®ط²ظˆظ†.
     * طھظڈط³طھظ‡ظ„ظƒ ظ…ظ† طھظ‚ط±ظٹط± ط§ظ„ظ…ظ†طھط¬ط§طھ ظˆظ„ظˆط­ط© ط§ظ„ظ‚ظٹط§ط¯ط© (KPIs) ظ…ط¹ط§ظ‹.
     */
    private function productProfitData(array $filters = []): array
    {
        $query = Product::with(['family', 'brand', 'unit', 'tva']);

        $canViewCost = $this->canViewCost();

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }
        if (!empty($filters['brand_id'])) {
            $query->where('brand_id', $filters['brand_id']);
        }

        $products = $query->orderBy('name')->get();

        $productIds = $products->pluck('id');

        // â”€â”€â”€ ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظپطھط±ط© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        $salesStats = [];
        if ($productIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
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

        // â”€â”€â”€ ظ…ط´طھط±ظٹط§طھ ط§ظ„ظپطھط±ط© (ظƒظ…ظٹط© + ظ‚ظٹظ…ط©) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        $purchaseStats = [];
        if ($productIds->isNotEmpty()) {
            $statsQuery = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
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

        // â”€â”€â”€ ظ…طھظˆط³ط· ط³ط¹ط± ط§ظ„ط´ط±ط§ط، ط§ظ„ظ…ط±ط¬ط­ (ظƒظ„ ط§ظ„ظپطھط±ط§طھ â€” ط¨ط¯ظˆظ† ظپظ„طھط± طھط§ط±ظٹط®) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        $avgPurchase = [];
        if ($productIds->isNotEmpty()) {
            $avgRows = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
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
                ->whereNull('sm.deleted_at')
                ->join('stock_movement_types as smt', function ($j) {
                $j->on('smt.id', '=', 'sm.stock_movement_type_id')
                  ->on('smt.company_id', '=', 'sm.company_id');
            })
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

        // â”€â”€â”€ ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ط­ط§ظ„ظٹ (SSOT: InventoryStockService â€” ظ†ظپط³ ظ…طµط¯ط± طµظپط­ط§طھ ط§ظ„ظ…ط®ط²ظˆظ†) â”€â”€
        $stockMap = [];
        if (!$useWarehouseStock && $productIds->isNotEmpty()) {
            $asOf = $filters['to_date'] ?? date('Y-m-d');
            foreach (app(InventoryStockService::class)->getStockAt($asOf) as $s) {
                $stockMap[$s['id']] = $s;
            }
        }

        $rows = $products->map(function ($product) use ($salesStats, $purchaseStats, $avgPurchase, $useWarehouseStock, $warehouseStockMap, $stockMap, $canViewCost) {
            $ss = $salesStats[$product->id] ?? ['total_sold' => 0, 'sales_ht' => 0, 'sales_cost' => 0];
            $ps = $purchaseStats[$product->id] ?? ['qty_bought' => 0, 'purchase_ht' => 0];
            $stockQty = $useWarehouseStock ? ($warehouseStockMap[$product->id] ?? 0) : ($stockMap[$product->id]['current_stock'] ?? 0);
            $avgCost = $avgPurchase[$product->id] ?? (float) $product->purchase_price_ht;
            $stockVal = round($stockQty * $avgCost, 2);
            $margin = $ss['sales_ht'] - $ss['sales_cost'];
            // طھظƒظ„ظپط© ط§ظ„ط¨ط¶ط§ط¹ط© ط§ظ„ظ…ط¨ط§ط¹ط© = ط§ظ„طھظƒظ„ظپط© ط§ظ„ظ…ط³ط¬ظ„ط© ط¹ظ„ظ‰ ط£ط³ط·ط± ط§ظ„ط¨ظٹط¹ (SSOT â€” طھط´ظ…ظ„ ط®طµظ…/ط¥ط±ط¬ط§ط¹ AV)
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
                'purchase_price_ht'   => $canViewCost ? round($product->purchase_price_ht, 2) : null,
                'current_cost_price'  => $canViewCost ? round($product->current_cost_price, 2) : null,
                'tva_rate'            => $product->tva?->rate,
                'stock_quantity'       => round($stockQty, 2),
                'min_stock_alert'     => $product->min_stock_alert,
                'stock_value'         => $canViewCost ? $stockVal : null,
                'total_sold'          => $ss['total_sold'],
                'sales_ht'            => $ss['sales_ht'],
                'sales_cost'          => $canViewCost ? $ss['sales_cost'] : null,
                'margin_value'        => $canViewCost ? round($margin, 2) : null,
                'margin_pct'          => $canViewCost ? ($ss['sales_ht'] > 0 ? round($margin / $ss['sales_ht'] * 100, 2) : 0) : null,
                'qty_bought'          => round($ps['qty_bought'], 2),
                'purchase_ht'         => $ps['purchase_ht'],
                'avg_purchase_price'  => $canViewCost ? round($avgCost, 4) : null,
                'cogs_estimated'      => $canViewCost ? round($cogs, 2) : null,
                'est_profit'          => $canViewCost ? round($estProfit, 2) : null,
                'profit_pct'          => $canViewCost ? ($ss['sales_ht'] > 0 ? round($estProfit / $ss['sales_ht'] * 100, 2) : 0) : null,
                'stock_status'        => $status,
            ];
        })->values();

        // طھط±طھظٹط¨ ط­ط³ط¨ ط§ظ„ط±ط¨ط­ ط§ظ„ظ…ظ‚ط¯ط± (طھظ†ط§ط²ظ„ظٹ) ط«ظ… طھط«ط¨ظٹطھ ط±ظ‚ظ… ط§ظ„طھط±طھظٹط¨
        $rows = $rows->sortByDesc('est_profit')->values()
            ->map(function ($row, $i) use ($canViewCost) {
                $row['profit_rank'] = $canViewCost ? $i + 1 : null;
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
                'total_stock_value' => $canViewCost ? round(array_sum(array_column($rows->toArray(), 'stock_value')), 2) : null,
                'total_sold'        => array_sum(array_column($rows->toArray(), 'total_sold')),
                'total_sales_ht'    => $totalSalesHt,
                'total_qty_bought'  => round(array_sum(array_column($rows->toArray(), 'qty_bought')), 2),
                'total_purchase_ht' => round(array_sum(array_column($rows->toArray(), 'purchase_ht')), 2),
                'total_cogs'        => $canViewCost ? round(array_sum(array_column($rows->toArray(), 'cogs_estimated')), 2) : null,
                'total_est_profit'  => $canViewCost ? $totalEstProfit : null,
                'margin_pct'        => $canViewCost ? ($totalSalesHt > 0 ? round($totalEstProfit / $totalSalesHt * 100, 2) : 0) : null,
                'reorder_count'     => $rows->filter(fn($r) => $r['stock_status'] !== 'good')->count(),
            ],
            'best_product'  => $best  ? ['id' => $best['id'], 'name' => $best['name'], 'est_profit' => $canViewCost ? $best['est_profit'] : null] : null,
            'worst_product' => $worst ? ['id' => $worst['id'], 'name' => $worst['name'], 'est_profit' => $canViewCost ? $worst['est_profit'] : null] : null,
        ];
    }

    /**
     * ظ„ظˆط­ط© ط§ظ„ظ‚ظٹط§ط¯ط© (KPIs): ط¥ط¬ظ…ط§ظ„ظٹ ط§ظ„ظ…ط¨ظٹط¹ط§طھ/ط§ظ„ظ…ط´طھط±ظٹط§طھطŒ ط§ظ„ط±ط¨ط­ ط§ظ„ظ…ظ‚ط¯ط±طŒ ظ‡ط§ظ…ط´ ط§ظ„ط±ط¨ط­طŒ
     * ط§ظ„ظˆط­ط¯ط§طھ ط§ظ„ظ…ط¨ط§ط¹ط©طŒ ظ‚ظٹظ…ط© ط§ظ„ظ…ط®ط²ظˆظ†طŒ ط¹ط¯ط¯ ط§ظ„ظ…ظ†طھط¬ط§طھ ط§ظ„طھظٹ طھط­طھط§ط¬ ط¥ط¹ط§ط¯ط© ط·ظ„ط¨ + ط£ظپط¶ظ„/ط£ط¶ط¹ظپ ظ…ظ†طھط¬.
     * طھظڈط¨ظ†ظ‰ ظ…ظ† ظ†ظپط³ ط¨ظٹط§ظ†ط§طھ طھظ‚ط±ظٹط± ط§ظ„ظ…ظ†طھط¬ط§طھ (productProfitData).
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
     * ط§ظ„طھظ†ط¨ط¤ ظˆط¥ط¹ط§ط¯ط© ط§ظ„ط·ظ„ط¨: ظ…ط¹ط¯ظ„ ط§ظ„ط¨ظٹط¹ ط§ظ„ظٹظˆظ…ظٹ ظ„ظƒظ„ ظ…ظ†طھط¬ ظ…ظ†ط° ط£ظˆظ„ ط¹ظ…ظ„ظٹط© ط¨ظٹط¹ (ط£ظٹط§ظ… ط§ظ„ظ†ط´ط§ط· =
     * ظپط±ظ‚ ط§ظ„طھظˆط§ط±ظٹط® + 1)طŒ ط§ظ„طھظˆظ‚ط¹ = ط§ظ„ظ…ط¹ط¯ظ„ ط§ظ„ظٹظˆظ…ظٹ أ— ط£ظپظ‚ ط§ظ„طھظ†ط¨ط¤طŒ ط§ظ„ظƒظ…ظٹط© ط§ظ„ظ…ظ‚طھط±ط­ط© =
     * ط§ظ„طھظˆظ‚ط¹ âˆ’ ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ط­ط§ظ„ظٹ (ظ„ط§ طھظ‚ظ„ ط¹ظ† طµظپط±).
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
            ->whereNull('cd.deleted_at')
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

        // ظ…طھظˆط³ط· ط³ط¹ط± ط§ظ„ط´ط±ط§ط، ط§ظ„ظ…ط±ط¬ط­ (ظƒظ„ ط§ظ„ظپطھط±ط§طھ)
        $avgPurchase = [];
        if ($productIds->isNotEmpty()) {
            $avgRows = DB::table('commercial_document_lines as cdl')
                ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
                ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
                ->whereNull('cd.deleted_at')
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

        // ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ط­ط§ظ„ظٹ (SSOT)
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
                'product_name'       => $p?->name ?? 'â€”',
                'product_ref'        => $p?->ref ?? 'â€”',
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

    public function marginReport(array $filters = []): array
    {
        $from = $filters['from_date'] ?? now()->startOfYear()->toDateString();
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
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.total_ht ELSE cdl.total_ht END) as total_ht"),
                DB::raw("SUM(CASE WHEN dt.code = 'AV' THEN -cdl.quantity * cdl.cost_price_ht ELSE cdl.quantity * cdl.cost_price_ht END) as total_cost")
            );
        if ($fyId) $rows->where('cd.fiscal_year_id', $fyId);

        // Catalog products group by product_id; manual (null product_id) lines group by description.
        $rows = $rows->groupBy('cdl.product_id', DB::raw("CASE WHEN cdl.product_id IS NULL THEN COALESCE(cdl.description, '') ELSE '' END"))
            ->orderByDesc('total_ht')
            ->limit(50)
            ->get();

        $productIds = $rows->pluck('product_id')->filter()->unique()->values();
        $products   = $productIds->isNotEmpty()
            ? Product::whereIn('id', $productIds)->get()->keyBy('id')
            : collect();

        $items = $rows->map(function ($r) use ($products) {
            $isManual = $r->product_id === null || $r->product_id === '';
            $product  = !$isManual ? $products->get($r->product_id) : null;
            $name     = $isManual
                ? (trim((string) ($r->manual_description ?? '')) ?: 'منتج يدوي')
                : ($product?->name ?? '—');
            $ref      = $isManual ? 'يدوي' : ($product?->ref ?? '—');
            return [
                'product_id'    => $r->product_id,
                'is_manual'     => $isManual,
                'product_name'  => $name,
                'product_ref'   => $ref,
                'total_qty'     => (float) $r->total_qty,
                'total_ht'      => round((float) $r->total_ht, 2),
                'cost_price'    => (float) $r->total_qty > 0 ? round((float) $r->total_cost / (float) $r->total_qty, 2) : 0,
                'cost_total'    => round((float) $r->total_cost, 2),
                'margin_amount' => 0,
                'margin_pct'    => 0,
            ];
        })->map(fn($i) => [
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
}

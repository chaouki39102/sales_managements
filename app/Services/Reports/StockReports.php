<?php

namespace App\Services\Reports;

use App\Models\Product;
use App\Services\InventoryStockService;
use App\Services\Reports\Concerns\ReportQueryHelpers;
use Illuminate\Support\Facades\DB;

/**
 * Inventory and stock-movement reports.
 *
 * Implementation behind App\Services\ReportService (the public façade).
 */
class StockReports
{
    use ReportQueryHelpers;

    public function inventoryReport(array $filters = []): array
    {
        $query = Product::with(['family', 'brand']);

        if (!empty($filters['family_id'])) {
            $query->where('family_id', $filters['family_id']);
        }

        $products = $query->orderBy('name')->get();
        $productIds = $products->pluck('id');

        // â”€â”€â”€ ظ…طµط¯ط± ط§ظ„ظ…ط®ط²ظˆظ†: ط±طµظٹط¯ ط­طھظ‰ طھط§ط±ظٹط® (as_of) | ظ…ط³طھظˆط¯ط¹ ظ…ط­ط¯ط¯ | ط§ظ„ظ…ط®ط²ظˆظ† ط§ظ„ط­ط§ظ„ظٹ â”€â”€
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

    public function productMovementReport(array $filters = []): array
    {
        $productId = $filters['product_id'] ?? null;
        $from = $filters['from_date'] ?? now()->startOfYear()->toDateString();
        $to   = $filters['to_date']   ?? now()->toDateString();
        $fyId = $filters['fiscal_year_id'] ?? null;

        $query = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->whereNull('cd.deleted_at')
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
                'product_name'  => $product?->name ?? 'â€”',
                'product_ref'   => $product?->ref ?? 'â€”',
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
     * ط³ط¬ظ„ ط­ط±ظƒط© ظ…ظ†طھط¬: ظƒظ„ ظˆط«ظٹظ‚ط© طھط­طھظˆظٹ ط¹ظ„ظ‰ ط§ظ„ظ…ظ†طھط¬ ظپظٹ ط§ظ„ظپطھط±ط©طŒ ظ…ط¹ ط§ظ„ط¥ط±ط¬ط§ط¹ط§طھ ط¨ط¥ط´ط§ط±ط© ط³ط§ظ„ط¨ط©.
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

    public function stockMovementsReport(array $filters = []): array
    {
        $query = DB::table('stock_movements as sm')
            ->whereNull('sm.deleted_at')
            ->join('products as p', 'p.id', '=', 'sm.product_id')
            ->leftJoin('warehouses as w', 'w.id', '=', 'sm.warehouse_id')
            ->leftJoin('stock_movement_types as smt', function ($j) {
            $j->on('smt.id', '=', 'sm.stock_movement_type_id')
              ->on('smt.company_id', '=', 'sm.company_id');
        })
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
            ->whereNull('sm.deleted_at')
            ->leftJoin('stock_movement_types as smt', function ($j) {
            $j->on('smt.id', '=', 'sm.stock_movement_type_id')
              ->on('smt.company_id', '=', 'sm.company_id');
        })
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
}

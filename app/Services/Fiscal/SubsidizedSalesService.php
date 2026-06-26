<?php

namespace App\Services\Fiscal;

use App\Models\RegulatedProductConfig;
use App\Models\SubsidizedSalesSummary;
use App\Services\CompanyContextService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SubsidizedSalesService
{
    public function __construct(
        private readonly TaxConfigService $taxConfigService,
    ) {}

    private function monthCondition(string $column, int $month): array
    {
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            return [sprintf("AND strftime('%%m', %s) = ?", $column), sprintf('%02d', $month)];
        }
        return [sprintf("AND MONTH(%s) = ?", $column), $month];
    }

    public function getSummary(int $companyId, int $fiscalYearId, ?int $month = null): array
    {
        $query = SubsidizedSalesSummary::forCompany($companyId)
            ->where('fiscal_year_id', $fiscalYearId);

        if ($month) {
            $query->where('month', $month);
        }

        $rows = $query->with('regulatedProductConfig')->get();

        $totals = [
            'total_qty'        => 0,
            'total_margin'     => 0,
            'total_ifu'        => 0,
            'violations_count' => 0,
            'computed_at'      => null,
        ];

        foreach ($rows as $row) {
            $totals['total_qty']    += $row->qty_sold;
            $totals['total_margin'] += $row->total_margin;
            $totals['total_ifu']    += $row->ifu_amount;
            if ($row->price_violation) {
                $totals['violations_count']++;
            }
            if (!$totals['computed_at'] || $row->computed_at?->gt($totals['computed_at'])) {
                $totals['computed_at'] = $row->computed_at;
            }
        }

        return [
            'summaries' => $rows,
            'totals'    => $totals,
        ];
    }

    public function computeSummary(int $companyId, int $fiscalYearId, ?int $month = null): array
    {
        $taxConfig = $this->taxConfigService->getActiveConfig($companyId, 'forfaitaire');
        $ifuRate   = (float) ($taxConfig->ifu_rate_goods ?? 0.05);
        $subSource = $taxConfig->ifuDocumentSources->firstWhere('category', 'subsidized');
        $ifuBase   = $subSource?->base ?? 'purchases';

        $regulatedProducts = RegulatedProductConfig::forCompany($companyId)
            ->where('active', true)
            ->get();

        $results = [];
        $now     = now();

        foreach ($regulatedProducts as $product) {
            $result = $this->computeForProduct($product, $companyId, $fiscalYearId, $month, $ifuRate, $ifuBase, $now);
            if ($result) {
                $results[] = $result;
            }
        }

        return [
            'summaries' => $results,
            'totals'    => $this->aggregateTotals($results),
        ];
    }

    private function computeForProduct(
        RegulatedProductConfig $product,
        int $companyId,
        int $fiscalYearId,
        ?int $month,
        float $ifuRate,
        string $ifuBaseType,
        $now,
    ): ?array {
        $purchaseParams = [$fiscalYearId, $companyId, $product->id];
        $purchaseSql = '';
        if ($month) {
            [$purchaseSql, $m] = $this->monthCondition('sm.movement_date', $month);
            $purchaseParams[] = $m;
        }

        $purchaseData = DB::selectOne("
            SELECT
                COALESCE(SUM(sm.quantity * sm.cost_price), 0) as total_cost,
                COALESCE(SUM(sm.quantity), 0) as total_qty
            FROM stock_movements sm
            JOIN stock_movement_types smt ON smt.id = sm.stock_movement_type_id
            WHERE sm.fiscal_year_id = ?
              AND sm.company_id = ?
              AND sm.is_validated = 1
              AND sm.deleted_at IS NULL
              AND smt.direction = 1
              AND sm.product_id IN (
                  SELECT id FROM products
                  WHERE regulated_product_config_id = ?
                    AND deleted_at IS NULL
              )
              {$purchaseSql}
        ", $purchaseParams);

        $totalPurchaseCost = (float) ($purchaseData->total_cost ?? 0);
        $totalPurchaseQty  = (float) ($purchaseData->total_qty ?? 0);
        $purchasePriceAvg  = $totalPurchaseQty > 0 ? $totalPurchaseCost / $totalPurchaseQty : 0;

        if ($totalPurchaseCost <= 0 && $totalPurchaseQty <= 0) {
            $opening = DB::selectOne("
                SELECT COALESCE(obs.opening_quantity, 0) as qty,
                       COALESCE(obs.opening_value, 0) as val
                FROM opening_balances_stock obs
                JOIN products p ON p.id = obs.product_id
                WHERE obs.fiscal_year_id = ?
                  AND obs.company_id = ?
                  AND p.regulated_product_config_id = ?
                LIMIT 1
            ", [$fiscalYearId, $companyId, $product->id]);

            $qty = (float) ($opening->qty ?? 0);
            $val = (float) ($opening->val ?? 0);

            if ($qty <= 0) {
                return null;
            }

            $totalPurchaseQty  = $qty;
            $totalPurchaseCost = $val;
            $purchasePriceAvg  = $val / $qty;
        }

        $sellParams = [$fiscalYearId, $product->id];
        $sellSql = '';
        if ($month) {
            [$sellSql, $m2] = $this->monthCondition('cd.document_date', $month);
            $sellParams[] = $m2;
        }

        $sellData = DB::selectOne("
            SELECT
                COALESCE(SUM(cdl.quantity * cdl.unit_price_ht), 0) as total_revenue,
                COALESCE(SUM(cdl.quantity), 0) as total_qty
            FROM commercial_document_lines cdl
            JOIN commercial_documents cd ON cd.id = cdl.commercial_document_id
            JOIN document_types dt ON dt.id = cd.document_type_id
            JOIN document_base_operations dbo ON dbo.id = dt.document_base_operation_id
            WHERE cd.fiscal_year_id = ?
              AND cd.is_locked = 1
              AND cd.deleted_at IS NULL
              AND dbo.name = 'sale'
              AND cdl.product_id IN (
                  SELECT id FROM products
                  WHERE regulated_product_config_id = ?
                    AND deleted_at IS NULL
              )
              {$sellSql}
        ", $sellParams);

        $totalRevenue    = (float) ($sellData->total_revenue ?? 0);
        $qtySold         = (float) ($sellData->total_qty ?? 0);
        $actualSellPrice = $qtySold > 0 ? $totalRevenue / $qtySold : 0;

        $regulatedMaxPrice = (float) $product->regulated_max_price;
        $priceViolation    = $qtySold > 0 && $actualSellPrice > $regulatedMaxPrice;
        $effectiveSell     = $qtySold > 0 ? min($actualSellPrice, $regulatedMaxPrice) : 0;
        $marginPerUnit     = $qtySold > 0 ? max($effectiveSell - $purchasePriceAvg, 0) : 0;
        $totalMargin       = $qtySold * $marginPerUnit;

        $ifuBase = match ($ifuBaseType) {
            'margin'    => $totalMargin,
            'revenue'   => $totalRevenue,
            default     => $totalPurchaseCost,
        };
        $ifuAmount = $ifuBase * $ifuRate;

        $data = [
            'company_id'                => $companyId,
            'fiscal_year_id'            => $fiscalYearId,
            'month'                     => $month,
            'regulated_product_config_id' => $product->id,
            'qty_sold'                  => $qtySold,
            'purchase_price_avg'        => $purchasePriceAvg,
            'actual_sell_price'         => $actualSellPrice,
            'regulated_max_price'       => $regulatedMaxPrice,
            'margin_per_unit'           => $marginPerUnit,
            'total_margin'              => $totalMargin,
            'total_purchase_cost'       => $totalPurchaseCost,
            'ifu_base'                  => $ifuBase,
            'ifu_amount'                => $ifuAmount,
            'price_violation'           => $priceViolation,
            'computed_at'               => $now,
            'created_at'                => $now,
            'updated_at'                => $now,
        ];

        SubsidizedSalesSummary::forCompany($companyId)->updateOrCreate(
            [
                'fiscal_year_id'            => $fiscalYearId,
                'month'                     => $month,
                'regulated_product_config_id' => $product->id,
            ],
            $data,
        );

        $data['regulated_product'] = $product;

        return $data;
    }

    private function computePurchasePriceAvg(int $regulatedConfigId, int $companyId, int $fiscalYearId, ?int $month): float
    {
        $result = DB::selectOne("
            SELECT
                COALESCE(SUM(sm.quantity * sm.cost_price), 0) as total_cost,
                COALESCE(SUM(sm.quantity), 0) as total_qty
            FROM stock_movements sm
            JOIN stock_movement_types smt ON smt.id = sm.stock_movement_type_id
            WHERE sm.fiscal_year_id = ?
              AND sm.company_id = ?
              AND sm.is_validated = 1
              AND sm.deleted_at IS NULL
              AND smt.direction = 1
              AND sm.product_id IN (
                  SELECT id FROM products
                  WHERE regulated_product_config_id = ?
                    AND deleted_at IS NULL
              )
        ", [$fiscalYearId, $companyId, $regulatedConfigId]);

        $totalCost = (float) ($result->total_cost ?? 0);
        $totalQty  = (float) ($result->total_qty ?? 0);

        if ($totalQty <= 0) {
            $opening = DB::selectOne("
                SELECT COALESCE(obs.opening_quantity, 0) as qty,
                       COALESCE(obs.opening_value, 0) as val
                FROM opening_balances_stock obs
                JOIN products p ON p.id = obs.product_id
                WHERE obs.fiscal_year_id = ?
                  AND obs.company_id = ?
                  AND p.regulated_product_config_id = ?
                LIMIT 1
            ", [$fiscalYearId, $companyId, $regulatedConfigId]);

            $qty = (float) ($opening->qty ?? 0);
            $val = (float) ($opening->val ?? 0);

            return $qty > 0 ? $val / $qty : 0;
        }

        return $totalCost / $totalQty;
    }

    public function updateRow(int $id, int $companyId, array $data): SubsidizedSalesSummary
    {
        $row = SubsidizedSalesSummary::forCompany($companyId)->findOrFail($id);

        $allowed = [
            'qty_sold', 'purchase_price_avg', 'actual_sell_price',
            'margin_per_unit', 'total_margin', 'ifu_base', 'ifu_amount', 'price_violation',
        ];

        $update = array_intersect_key($data, array_flip($allowed));

        if (isset($update['qty_sold'])) {
            $update['qty_sold'] = max((float) $update['qty_sold'], 0);
        }
        if (isset($update['purchase_price_avg'])) {
            $update['purchase_price_avg'] = max((float) $update['purchase_price_avg'], 0);
        }
        if (isset($update['actual_sell_price'])) {
            $update['actual_sell_price'] = max((float) $update['actual_sell_price'], 0);
        }

        $row->update($update);

        return $row->fresh()->load('regulatedProductConfig');
    }

    public function deleteRow(int $id, int $companyId): bool
    {
        return SubsidizedSalesSummary::forCompany($companyId)
            ->where('id', $id)
            ->delete();
    }

    public function getViolations(int $companyId, int $fiscalYearId): array
    {
        $violations = SubsidizedSalesSummary::forCompany($companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('price_violation', true)
            ->with('regulatedProductConfig')
            ->get();

        return [
            'count' => $violations->count(),
            'rows'  => $violations,
        ];
    }

    private function aggregateTotals(array $results): array
    {
        $totals = [
            'total_qty'    => 0,
            'total_margin' => 0,
            'total_ifu'    => 0,
        ];

        foreach ($results as $r) {
            $totals['total_qty']    += $r['qty_sold'];
            $totals['total_margin'] += $r['total_margin'];
            $totals['total_ifu']    += $r['ifu_amount'];
        }

        return $totals;
    }
}

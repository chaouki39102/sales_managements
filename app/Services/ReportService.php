<?php

namespace App\Services;

use App\Services\Reports\CreativeReports;
use App\Services\Reports\FinanceReports;
use App\Services\Reports\LedgerReports;
use App\Services\Reports\MatrixReports;
use App\Services\Reports\PartyReports;
use App\Services\Reports\ProductReports;
use App\Services\Reports\PurchaseReports;
use App\Services\Reports\SalesReports;
use App\Services\Reports\StockReports;

/**
 * Public façade for every report. Controllers and the container resolve this
 * class; each method delegates to a single-purpose class in App\Services\Reports.
 */
class ReportService
{
    public function __construct(
        private readonly SalesReports $salesReports,
        private readonly PurchaseReports $purchaseReports,
        private readonly PartyReports $partyReports,
        private readonly ProductReports $productReports,
        private readonly StockReports $stockReports,
        private readonly FinanceReports $financeReports,
        private readonly MatrixReports $matrixReports,
        private readonly CreativeReports $creativeReports,
        private readonly LedgerReports $ledgerReports,
    ) {
    }

    public function salesReport(array $filters = []): array
    {
        return $this->salesReports->salesReport($filters);
    }

    public function purchasesReport(array $filters = []): array
    {
        return $this->purchaseReports->purchasesReport($filters);
    }

    public function customersReport(array $filters = []): array
    {
        return $this->partyReports->customersReport($filters);
    }

    public function suppliersReport(array $filters = []): array
    {
        return $this->partyReports->suppliersReport($filters);
    }

    public function productsReport(array $filters = []): array
    {
        return $this->productReports->productsReport($filters);
    }

    public function dashboardReport(array $filters = []): array
    {
        return $this->productReports->dashboardReport($filters);
    }

    public function forecastReport(array $filters = []): array
    {
        return $this->productReports->forecastReport($filters);
    }

    public function monthlyReport(array $filters = []): array
    {
        return $this->financeReports->monthlyReport($filters);
    }

    public function inventoryReport(array $filters = []): array
    {
        return $this->stockReports->inventoryReport($filters);
    }

    public function paymentsReport(array $filters = []): array
    {
        return $this->financeReports->paymentsReport($filters);
    }

    public function velocityReport(array $filters = []): array
    {
        return $this->salesReports->velocityReport($filters);
    }

    public function marginReport(array $filters = []): array
    {
        return $this->productReports->marginReport($filters);
    }

    public function agingReport(array $filters = []): array
    {
        return $this->partyReports->agingReport($filters);
    }

    public function taxesReport(array $filters = []): array
    {
        return $this->financeReports->taxesReport($filters);
    }

    public function creativeReport(array $filters = []): array
    {
        return $this->creativeReports->creativeReport($filters);
    }

    public function dailyReport(array $filters = []): array
    {
        return $this->salesReports->dailyReport($filters);
    }

    public function productMovementReport(array $filters = []): array
    {
        return $this->stockReports->productMovementReport($filters);
    }

    public function productHistoryReport(array $filters = []): array
    {
        return $this->stockReports->productHistoryReport($filters);
    }

    public function profitLossReport(array $filters = []): array
    {
        return $this->financeReports->profitLossReport($filters);
    }

    public function returnsReport(array $filters = []): array
    {
        return $this->salesReports->returnsReport($filters);
    }

    public function cashFlowReport(array $filters = []): array
    {
        return $this->financeReports->cashFlowReport($filters);
    }

    public function expensesReport(array $filters = []): array
    {
        return $this->financeReports->expensesReport($filters);
    }

    public function salesTrendReport(array $filters = []): array
    {
        return $this->salesReports->salesTrendReport($filters);
    }

    public function stockMovementsReport(array $filters = []): array
    {
        return $this->stockReports->stockMovementsReport($filters);
    }

    public function matrixReport(array $filters = [], string $mode = 'sale'): array
    {
        return $this->matrixReports->matrixReport($filters, $mode);
    }

    public function matrixDetail(array $filters = []): array
    {
        return $this->matrixReports->matrixDetail($filters);
    }

    public function clientMonthlyReport(array $filters = []): array
    {
        return $this->partyReports->clientMonthlyReport($filters);
    }

    public function grandLivreReport(array $filters = []): array
    {
        return $this->ledgerReports->grandLivreReport($filters);
    }
}

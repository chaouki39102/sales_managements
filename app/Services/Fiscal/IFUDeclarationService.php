<?php

namespace App\Services\Fiscal;

use App\Models\TaxDeclarationPeriod;
use Illuminate\Support\Facades\DB;

class IFUDeclarationService
{
    public function __construct(
        private readonly TaxConfigService $taxConfigService,
    ) {}

    private function monthCondition(string $column, int $month): array
    {
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            return [sprintf("strftime('%%m', %s) = ?", $column), sprintf('%02d', $month)];
        }
        return [sprintf('MONTH(%s) = ?', $column), $month];
    }

    private function getDefaultSourceConfig(): array
    {
        return [
            'subsidized' => [
                'document_codes' => ['FA', 'BR'],
                'require_locked' => false,
                'base'           => 'purchases',
                'rate_field'     => 'ifu_rate_subsidized',
            ],
            'other_goods' => [
                'document_codes' => ['FA', 'BR'],
                'require_locked' => false,
                'base'           => 'purchases',
                'rate_field'     => 'ifu_rate_goods',
            ],
            'services' => [
                'document_codes' => ['FA'],
                'require_locked' => false,
                'base'           => 'purchases',
                'rate_field'     => 'ifu_rate_services',
            ],
        ];
    }

    public function getDeclaration(int $companyId, int $fiscalYearId, ?int $month = null): array
    {
        $taxConfig = $this->taxConfigService->getActiveConfig($companyId, 'forfaitaire');

        $requireLocked = (bool) ($taxConfig->ifu_require_locked ?? false);
        $ifuRateGoods  = (float) ($taxConfig->ifu_rate_goods ?? 0.05);
        $ifuRateSub    = $taxConfig->ifu_rate_subsidized ? (float) $taxConfig->ifu_rate_subsidized : $ifuRateGoods;
        $ifuRateServ   = (float) ($taxConfig->ifu_rate_services ?? 0.12);
        $ifuRateAuto   = (float) ($taxConfig->ifu_rate_auto ?? 0.005);
        $ifuMinimum    = (float) ($taxConfig->ifu_minimum ?? 30000.00);

        $docSources = $taxConfig->ifuDocumentSources->keyBy('category');

        $subConfig  = $docSources->get('subsidized');
        $otherConfig = $docSources->get('other_goods');
        $servConfig = $docSources->get('services');

        $subsidizedResult = $this->computeCategory(
            $companyId, $fiscalYearId, $month,
            $subConfig?->codes->pluck('document_code')->toArray() ?? ['FA', 'BR'],
            $ifuRateSub,
            $subConfig?->require_locked ?? $requireLocked,
            'subsidized',
            $subConfig?->base ?? 'purchases',
        );

        $otherGoodsResult = $this->computeCategory(
            $companyId, $fiscalYearId, $month,
            $otherConfig?->codes->pluck('document_code')->toArray() ?? ['FA', 'BR'],
            $ifuRateGoods,
            $otherConfig?->require_locked ?? $requireLocked,
            'other_goods',
            $otherConfig?->base ?? 'purchases',
        );

        $servicesResult = $this->computeCategory(
            $companyId, $fiscalYearId, $month,
            $servConfig?->codes->pluck('document_code')->toArray() ?? ['FA'],
            $ifuRateServ,
            $servConfig?->require_locked ?? $requireLocked,
            'services',
            $servConfig?->base ?? 'purchases',
        );

        $ifuSubsidized = $subsidizedResult['ifu_amount'];
        $ifuOther      = $otherGoodsResult['ifu_amount'];
        $ifuServices   = $servicesResult['ifu_amount'];
        $ifuAuto       = 0.0;

        $ifuTotal = $ifuSubsidized + $ifuOther + $ifuServices + $ifuAuto;
        $ifuDue   = max($ifuTotal, $ifuMinimum);

        $tranche1Pct = (int) ($taxConfig->g12_tranche1_pct ?? 50);
        $tranche2Pct = (int) ($taxConfig->g12_tranche2_pct ?? 25);
        $tranche3Pct = (int) ($taxConfig->g12_tranche3_pct ?? 25);

        $currentYear = now()->year;

        return [
            'subsidized' => $subsidizedResult,
            'other_goods' => $otherGoodsResult,
            'services' => $servicesResult,
            'summary' => [
                'ifu_subsidized' => $ifuSubsidized,
                'ifu_other'      => $ifuOther,
                'ifu_services'   => $ifuServices,
                'ifu_auto'       => $ifuAuto,
                'ifu_total'      => $ifuTotal,
                'ifu_minimum'    => $ifuMinimum,
                'ifu_due'        => $ifuDue,
            ],
            'config_info' => [
                'subsidized' => [
                    'doc_codes'      => $subConfig?->codes->pluck('document_code')->toArray() ?? ['FA', 'BR'],
                    'require_locked' => $subConfig?->require_locked ?? false,
                    'base_type'      => $subConfig?->base ?? 'purchases',
                    'rate'           => $ifuRateSub,
                ],
                'other_goods' => [
                    'doc_codes'      => $otherConfig?->codes->pluck('document_code')->toArray() ?? ['FA', 'BR'],
                    'require_locked' => $otherConfig?->require_locked ?? false,
                    'base_type'      => $otherConfig?->base ?? 'purchases',
                    'rate'           => $ifuRateGoods,
                ],
                'services' => [
                    'doc_codes'      => $servConfig?->codes->pluck('document_code')->toArray() ?? ['FA'],
                    'require_locked' => $servConfig?->require_locked ?? false,
                    'base_type'      => $servConfig?->base ?? 'purchases',
                    'rate'           => $ifuRateServ,
                ],
            ],
            'payment_schedule' => [
                'tranche1_pct'      => $tranche1Pct,
                'tranche1_amount'   => $ifuDue * $tranche1Pct / 100,
                'tranche1_deadline' => $taxConfig->g12_previsionnel_deadline . "/{$currentYear}",
                'tranche2_pct'      => $tranche2Pct,
                'tranche2_amount'   => $ifuDue * $tranche2Pct / 100,
                'tranche2_deadline' => $taxConfig->g12_tranche2_deadline . "/{$currentYear}",
                'tranche3_pct'      => $tranche3Pct,
                'tranche3_amount'   => $ifuDue * $tranche3Pct / 100,
                'tranche3_deadline' => $taxConfig->g12_tranche3_deadline . "/{$currentYear}",
                'g12bis_deadline'   => $taxConfig->g12_definitif_deadline . "/" . ($currentYear + 1),
            ],
            'fiscal_year_id' => $fiscalYearId,
        ];
    }

    private function computeCategory(
        int $companyId,
        int $fiscalYearId,
        ?int $month,
        array $docCodes,
        float $rate,
        bool $requireLocked,
        string $categoryType,
        string $baseType,
    ): array {
        $docCodes = $docCodes ?: ['FA'];

        $query = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.fiscal_year_id', $fiscalYearId)
            ->where('cd.company_id', $companyId)
            ->whereNull('cd.deleted_at')
            ->whereIn('dt.code', $docCodes);

        if ($requireLocked) {
            $query->where('cd.is_locked', true);
        }

        if ($month) {
            [$monthSql, $monthBind] = $this->monthCondition('cd.document_date', $month);
            $query->whereRaw($monthSql, [$monthBind]);
        }

        $query->join('products as p', 'p.id', '=', 'cdl.product_id')
              ->leftJoin('product_types as pt', 'pt.id', '=', 'p.product_type_id')
              ->whereNull('p.deleted_at');

        if ($categoryType === 'subsidized') {
            $query->where('p.is_subsidized', true);
        } elseif ($categoryType === 'other_goods') {
            $query->where('p.is_subsidized', false)
                  ->where(fn($q) => $q->where('pt.name', '!=', 'service')->orWhereNull('pt.name'));
        } elseif ($categoryType === 'services') {
            $query->where('pt.name', 'service');
        }

        $baseAmount = match ($baseType) {
            'purchases', 'revenue' => (float) $query->sum(DB::raw(
                "COALESCE(cdl.quantity, 0) * CASE WHEN COALESCE(cdl.unit_price_ht, 0) > 0 THEN cdl.unit_price_ht ELSE 0 END"
            )),
            'margin' => $this->computeMarginBase($companyId, $fiscalYearId, $month, $categoryType),
            default => 0.0,
        };

        $ifuAmount = $baseAmount * $rate;

        return [
            'rows'            => [],
            'base_amount'     => $baseAmount,
            'ifu_amount'      => $ifuAmount,
            'rate'            => $rate,
            'doc_codes'       => $docCodes,
            'base_type'       => $baseType,
            'require_locked'  => $requireLocked,
        ];
    }

    private function computeMarginBase(int $companyId, int $fiscalYearId, ?int $month, string $categoryType): float
    {
        $saleDocCodes = ['FV', 'BL'];

        $revenueQuery = DB::table('commercial_document_lines as cdl')
            ->join('commercial_documents as cd', 'cd.id', '=', 'cdl.commercial_document_id')
            ->join('document_types as dt', 'dt.id', '=', 'cd.document_type_id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->join('products as p', 'p.id', '=', 'cdl.product_id')
            ->leftJoin('product_types as pt', 'pt.id', '=', 'p.product_type_id')
            ->where('cd.fiscal_year_id', $fiscalYearId)
            ->where('cd.company_id', $companyId)
            ->whereNull('cd.deleted_at')
            ->whereNull('p.deleted_at')
            ->where('dbo.name', 'sale')
            ->whereIn('dt.code', $saleDocCodes);

        if ($month) {
            [$mSql, $mBind] = $this->monthCondition('cd.document_date', $month);
            $revenueQuery->whereRaw($mSql, [$mBind]);
        }

        if ($categoryType === 'subsidized') {
            $revenueQuery->where('p.is_subsidized', true);
        } elseif ($categoryType === 'other_goods') {
            $revenueQuery->where('p.is_subsidized', false)
                         ->where(fn($q) => $q->where('pt.name', '!=', 'service')->orWhereNull('pt.name'));
        }

        $totalRevenue = (float) $revenueQuery->sum(DB::raw(
            "COALESCE(cdl.quantity, 0) * CASE WHEN COALESCE(cdl.unit_price_ht, 0) > 0 THEN cdl.unit_price_ht ELSE 0 END"
        ));

        $productIds = (clone $revenueQuery)->distinct()->pluck('cdl.product_id');

        if ($productIds->isEmpty()) {
            return 0;
        }

        $costData = DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', function ($join) {
                $join->on('smt.id', '=', 'sm.stock_movement_type_id')
                     ->on('smt.company_id', '=', 'sm.company_id');
            })
            ->whereIn('sm.product_id', $productIds)
            ->where('sm.fiscal_year_id', $fiscalYearId)
            ->where('sm.company_id', $companyId)
            ->where('sm.is_validated', 1)
            ->whereNull('sm.deleted_at')
            ->where('smt.direction', 1)
            ->selectRaw("COALESCE(SUM(sm.quantity * sm.cost_price), 0) as total_cost, COALESCE(SUM(sm.quantity), 0) as total_qty")
            ->first();

        $totalCost = (float) ($costData->total_cost ?? 0);
        return max($totalRevenue - $totalCost, 0);
    }

    public function savePeriod(int $companyId, array $data, int $userId): TaxDeclarationPeriod
    {
        $data['company_id'] = $companyId;
        $data['regime']     = 'forfaitaire';
        $data['created_by'] = $userId;
        $data['status']     = $data['status'] ?? 'draft';

        if ($data['status'] === 'submitted' && empty($data['submitted_at'])) {
            $data['submitted_at'] = now()->toDateString();
        }

        if ($data['status'] === 'paid' && empty($data['paid_at'])) {
            $data['paid_at'] = now()->toDateString();
        }

        return TaxDeclarationPeriod::updateOrCreate(
            [
                'company_id'     => $companyId,
                'fiscal_year_id' => $data['fiscal_year_id'],
                'form_type'      => $data['form_type'],
                'month'          => $data['month'] ?? null,
            ],
            $data,
        );
    }

    public function getHistory(int $companyId, int $fiscalYearId): \Illuminate\Support\Collection
    {
        return TaxDeclarationPeriod::forCompany($companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->whereIn('form_type', ['g12', 'g12bis'])
            ->orderByDesc('created_at')
            ->get();
    }
}

<?php

namespace App\Services\Fiscal;

use App\Models\FiscalYear;
use App\Models\TaxDeclarationPeriod;
use App\Services\CompanyContextService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class G50DeclarationService
{
    public function __construct(
        private readonly TaxConfigService $taxConfigService,
    ) {}

    private function monthCondition(string $column, int $month): array
    {
        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            return ["strftime('%m', {$column}) = ?", [sprintf('%02d', $month)]];
        }
        return ["MONTH({$column}) = ?", [$month]];
    }

    public function getDeclaration(int $companyId, int $fiscalYearId, int $month): array
    {
        $taxConfig = $this->taxConfigService->getActiveConfig($companyId, 'reel');

        $tvaCollectee = (float) DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.fiscal_year_id', $fiscalYearId)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dbo.name', 'sale')
            ->whereRaw(...$this->monthCondition('cd.document_date', $month))
            ->sum('cd.total_tva');

        $tvaDeductible = (float) DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.fiscal_year_id', $fiscalYearId)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dbo.name', 'purchase')
            ->whereRaw(...$this->monthCondition('cd.document_date', $month))
            ->sum('cd.total_tva');

        $tvaCarryFwd = 0;
        if ($month === 1) {
            $tvaCarryFwd = (float) DB::table('fiscal_year_carry_forward')
                ->where('company_id', $companyId)
                ->where('fiscal_year_id', $fiscalYearId)
                ->where('category', 'tva_deductible')
                ->sum('amount_dzd');
        }

        $tvaNet   = $tvaCollectee - $tvaDeductible - $tvaCarryFwd;
        $tvaDue   = max($tvaNet, 0);
        $tvaCredit = max(-$tvaNet, 0);

        $timbreMonth = (float) DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.fiscal_year_id', $fiscalYearId)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dbo.name', 'sale')
            ->whereRaw(...$this->monthCondition('cd.document_date', $month))
            ->sum('cd.total_stamp');

        $timbreCarryFwd = 0;
        if ($month === 1) {
            $timbreCarryFwd = (float) DB::table('fiscal_year_carry_forward')
                ->where('company_id', $companyId)
                ->where('fiscal_year_id', $fiscalYearId)
                ->where('category', 'timbre_fiscal')
                ->sum('amount_dzd');
        }

        $timbreTotal = $timbreMonth + $timbreCarryFwd;
        $totalDue    = $tvaDue + $timbreTotal;

        $deadlineDay  = (int) ($taxConfig->g50_deadline_day ?? 20);
        $fiscalYear   = FiscalYear::findOrFail($fiscalYearId);
        $deadlineDate = now()->setYear($fiscalYear->start_date->year)->startOfMonth()->addMonths($month)->setDay(min($deadlineDay, 28));

        return [
            'tva_collectee'  => $tvaCollectee,
            'tva_deductible' => $tvaDeductible,
            'tva_carry_fwd'  => $tvaCarryFwd,
            'tva_net'        => $tvaNet,
            'tva_due'        => $tvaDue,
            'tva_credit'     => $tvaCredit,
            'timbre_month'   => $timbreMonth,
            'timbre_carry'   => $timbreCarryFwd,
            'timbre_total'   => $timbreTotal,
            'total_due'      => $totalDue,
            'deadline'       => $deadlineDate->toDateString(),
            'month'          => $month,
            'fiscal_year_id' => $fiscalYearId,
        ];
    }

    public function savePeriod(int $companyId, array $data, int $userId): TaxDeclarationPeriod
    {
        $data['company_id']   = $companyId;
        $data['regime']       = 'reel';
        $data['created_by']   = $userId;
        $data['status']       = $data['status'] ?? 'draft';
        $data['amount_due']   = ($data['tva_due'] ?? 0) + ($data['timbre_fiscal'] ?? 0);

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
                'month'          => $data['month'],
            ],
            $data,
        );
    }

    public function getHistory(int $companyId, int $fiscalYearId): \Illuminate\Support\Collection
    {
        return TaxDeclarationPeriod::forCompany($companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('form_type', 'g50')
            ->orderBy('month')
            ->get();
    }
}

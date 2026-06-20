<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\Party;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class CreditCheckService
{
    public function __construct(
        private PartyBalanceService   $balanceService,
        private CompanyContextService $companyContext,
    ) {}

    public function check(int $partyId, float $newAmount, string $date): array
    {
        $companyId = $this->companyContext->get();

        $party = Party::where('company_id', $companyId)->findOrFail($partyId);

        $balanceData = $this->balanceService->getBalanceAt($partyId, $date);
        $currentBalance = $balanceData['current_balance'];

        $creditLimit   = (float) ($party->credit_limit ?? 0);
        $creditDays    = (int)   ($party->credit_days  ?? 0);
        $usedCredit    = $currentBalance;
        $available     = $creditLimit > 0 ? max(0, $creditLimit - $usedCredit) : null;
        $willExceed    = $creditLimit > 0 && ($usedCredit + $newAmount) > $creditLimit;
        $exceedBy      = $willExceed ? round(($usedCredit + $newAmount) - $creditLimit, 4) : 0;

        $overdueInvoices = $this->getOverdueInvoices($partyId, $companyId, $date);

        $suggestedDueDate = $creditDays > 0
            ? Carbon::parse($date)->addDays($creditDays)->format('Y-m-d')
            : null;

        $alerts = [];

        if ($willExceed) {
            $alerts[] = [
                'type'    => 'credit_limit_exceeded',
                'level'   => 'error',
                'message' => "سيتجاوز حد الائتمان بمقدار " . number_format($exceedBy, 2) . " دج",
            ];
        } elseif ($creditLimit > 0 && $available < $newAmount * 0.2) {
            $alerts[] = [
                'type'    => 'credit_limit_warning',
                'level'   => 'warning',
                'message' => "الائتمان المتاح منخفض: " . number_format($available, 2) . " دج",
            ];
        }

        if ($overdueInvoices['count'] > 0) {
            $alerts[] = [
                'type'    => 'overdue_invoices',
                'level'   => 'warning',
                'message' => "هذا الزبون لديه {$overdueInvoices['count']} فاتورة متأخرة بقيمة " .
                             number_format($overdueInvoices['total_amount'], 2) . " دج",
            ];
        }

        return [
            'party_id'             => $partyId,
            'party_name'           => $party->name,
            'credit_limit'         => $creditLimit,
            'credit_days'          => $creditDays,
            'used_credit'          => $usedCredit,
            'available_credit'     => $available,
            'new_amount'           => $newAmount,
            'total_after'          => $usedCredit + $newAmount,
            'will_exceed'          => $willExceed,
            'exceed_by'            => $exceedBy,
            'suggested_due_date'   => $suggestedDueDate,
            'overdue_invoices'     => $overdueInvoices,
            'is_tva_exempt'        => $party->is_tva_exempt,
            'is_final_consumer'    => $party->is_final_consumer,
            'default_price_level_id' => $party->default_price_level_id,
            'alerts'               => $alerts,
            'can_proceed'          => !$willExceed || $creditLimit === 0,
        ];
    }

    private function getOverdueInvoices(int $partyId, int $companyId, string $date): array
    {
        $overdue = DB::table('commercial_documents as cd')
            ->join('document_types as dt',           'cd.document_type_id',           '=', 'dt.id')
            ->join('document_statuses as ds',         'cd.document_status_id',         '=', 'ds.id')
            ->where('cd.company_id',   $companyId)
            ->where('cd.party_id',     $partyId)
            ->where('dt.affects_accounting', true)
            ->whereIn('ds.name', ['validated', 'partially_paid', 'overdue'])
            ->where('cd.remaining_amount', '>', 0.001)
            ->whereNotNull('cd.due_date')
            ->whereDate('cd.due_date', '<', $date)
            ->whereNull('cd.deleted_at')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(cd.remaining_amount), 0) as total_amount')
            ->first();

        return [
            'count'        => (int)   ($overdue->count        ?? 0),
            'total_amount' => (float) ($overdue->total_amount ?? 0),
        ];
    }

    public function enforceLimit(int $partyId, float $amount, string $date): void
    {
        $result = $this->check($partyId, $amount, $date);

        if ($result['will_exceed'] && !auth()->user()?->can('override_credit_limit')) {
            throw new BusinessRuleException(
                "تجاوز حد الائتمان: المتاح {$result['available_credit']} دج " .
                "والمطلوب {$amount} دج. تجاوز بـ {$result['exceed_by']} دج.",
                422,
                ['credit_check' => $result]
            );
        }
    }
}

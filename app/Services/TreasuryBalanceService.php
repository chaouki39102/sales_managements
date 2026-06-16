<?php

namespace App\Services;

use App\Core\Traits\ResolvesFiscalYear;
use Illuminate\Support\Facades\DB;

/**
 * TreasuryBalanceService
 * ══════════════════════════════════════════════════════════════════
 * الخزينة — العمود الثالث في جدول التناظر:
 *
 *   | | المخزون | رصيد المتعامل | الخزينة |
 *   |---|---|---|---|
 *   | الافتتاحي | opening_balances_stock | opening_balances_parties | opening_balances_treasury |
 *   | الحركات | stock_movements | commercial_documents + payments | payments |
 *   | الترحيل | transferStockBalances | transferPartyBalances | transferTreasuryBalances |
 *   | الحساب | getStockAt() | getBalanceAt() | getTreasuryBalanceAt() |
 *   | القاعدة | PMP | opening + docs - payments | opening + in - out |
 *
 * Formula:
 *   balance = opening_balance (السنة المالية المطابقة للتاريخ)
 *           + SUM(payments.amount WHERE direction='in',  status='confirmed', up to $date)
 *           - SUM(payments.amount WHERE direction='out', status='confirmed', up to $date)
 *
 * يستخدم ResolvesFiscalYear trait — نفس منطق تحديد السنة المالية
 * المستخدم في InventoryStockService و PartyBalanceService.
 * ══════════════════════════════════════════════════════════════════
 */
class TreasuryBalanceService
{
    use ResolvesFiscalYear;

    public function __construct(
        private CompanyContextService $companyContext
    ) {}

    /**
     * رصيد حساب خزينة واحد في تاريخ محدد.
     *
     * @throws \App\Core\Exceptions\BusinessRuleException
     */
    public function getTreasuryBalanceAt(int $treasuryAccountId, string $date): array
    {
        $companyId    = $this->companyContext->get();
        $fiscalYearId = $this->resolveFiscalYearId($companyId, $date);

        // 1. الرصيد الافتتاحي للسنة المطابقة
        $opening = DB::table('opening_balances_treasury')
            ->where('company_id',          $companyId)
            ->where('treasury_account_id', $treasuryAccountId)
            ->where('fiscal_year_id',      $fiscalYearId)
            ->value('opening_balance') ?? 0;

        // 2. الدفعات الواردة (in) ضمن السنة المالية حتى التاريخ
        $totalIn = DB::table('payments')
            ->where('company_id',          $companyId)
            ->where('treasury_account_id', $treasuryAccountId)
            ->where('fiscal_year_id',      $fiscalYearId)
            ->where('status',              'confirmed')
            ->where('direction',           'in')
            ->whereDate('payment_date', '<=', $date)
            ->whereNull('deleted_at')
            ->sum('amount');

        // 3. الدفعات الصادرة (out) ضمن السنة المالية حتى التاريخ
        $totalOut = DB::table('payments')
            ->where('company_id',          $companyId)
            ->where('treasury_account_id', $treasuryAccountId)
            ->where('fiscal_year_id',      $fiscalYearId)
            ->where('status',              'confirmed')
            ->where('direction',           'out')
            ->whereDate('payment_date', '<=', $date)
            ->whereNull('deleted_at')
            ->sum('amount');

        $currentBalance = round(
            (float) $opening + (float) $totalIn - (float) $totalOut,
            4
        );

        return [
            'treasury_account_id' => $treasuryAccountId,
            'date'                => $date,
            'fiscal_year_id'      => $fiscalYearId,
            'opening_balance'     => round((float) $opening,   4),
            'total_in'            => round((float) $totalIn,   4),
            'total_out'           => round((float) $totalOut,  4),
            'current_balance'     => $currentBalance,
        ];
    }

    /**
     * أرصدة كل حسابات الخزينة في تاريخ محدد.
     */
    public function getAllTreasuryBalancesAt(string $date, ?string $type = null): array
    {
        $companyId = $this->companyContext->get();

        $query = DB::table('treasury_accounts')
            ->where('company_id', $companyId)
            ->where('active',     true)
            ->whereNull('deleted_at');

        if ($type) {
            $query->whereExists(function ($q) use ($type, $companyId) {
                $q->from('treasury_account_types')
                  ->whereColumn('treasury_account_types.id', 'treasury_accounts.treasury_account_type_id')
                  ->where('treasury_account_types.name', $type)
                  ->where('treasury_account_types.company_id', $companyId);
            });
        }

        $ids = $query->pluck('id');

        return $ids->map(fn($id) => $this->getTreasuryBalanceAt($id, $date))->toArray();
    }
}

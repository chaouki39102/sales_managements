<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * PartyBalanceService
 * ══════════════════════════════════════════════════════════════════
 * مرآة كاملة لـ InventoryStockService::getStockAt() — لكن للأرصدة
 * المالية بدل المخزون.
 *
 * المعادلة:
 *   balance_at_date = opening_balance (للسنة المالية المطابقة للتاريخ)
 *                    + SUM(net_to_pay لمستندات المبيعات/الشراء المؤكدة حتى التاريخ)
 *                    - SUM(payments المسددة حتى التاريخ)
 *
 * الإشارة (+/-):
 *   - opening_balance: balance_type = 'debit' → +  | 'credit' → -
 *   - مستندات المبيعات (الزبون يدين لك)        → +
 *   - مستندات الشراء (أنت تدين للمورّد)         → -
 *   - الدفعات المستلمة من الزبون / المدفوعة للمورّد → تُخفّض الدين دائماً → -
 * ══════════════════════════════════════════════════════════════════
 */
class PartyBalanceService
{
    public function __construct(
        private CompanyContextService $companyContext
    ) {}

    /**
     * رصيد متعامل واحد في تاريخ محدد.
     */
    public function getBalanceAt(int $partyId, string $date): array
    {
        $companyId = $this->companyContext->get();

        // ─── 1. تحديد السنة المالية المطابقة للتاريخ ──────────────────────
        $fiscalYear = DB::table('fiscal_years')
            ->where('company_id', $companyId)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date',   '>=', $date)
            ->select('id')
            ->first();

        // ─── 2. الرصيد الافتتاحي ───────────────────────────────────────────
        $opening = DB::table('opening_balances_parties')
            ->where('company_id', $companyId)
            ->where('party_id',   $partyId)
            ->when($fiscalYear,  fn($q) => $q->where('fiscal_year_id', $fiscalYear->id))
            ->when(!$fiscalYear, fn($q) => $q->whereRaw('1 = 0'))
            ->select('opening_balance', 'balance_type')
            ->first();

        $openingAmount = 0.0;
        if ($opening) {
            $openingAmount = $opening->balance_type === 'debit'
                ? (float) $opening->opening_balance
                : -(float) $opening->opening_balance;
        }

        // ─── 3. مستندات المبيعات/الشراء المؤكدة حتى التاريخ ───────────────
        //    DocumentType.code: نوع البيع (FV/BL/AV...) أو نوع الشراء (FA/AA/BCF...)
        //    isPurch مُحدَّد عبر document_types.is_purchase (راجع DocumentType)
        $documentsBalance = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->where('cd.company_id', $companyId)
            ->where('cd.party_id',   $partyId)
            ->where('cd.is_validated', true)
            ->whereDate('cd.document_date', '<=', $date)
            ->select(
                DB::raw('
                    SUM(CASE WHEN dt.is_purchase = 0 THEN cd.net_to_pay ELSE 0 END)
                    -
                    SUM(CASE WHEN dt.is_purchase = 1 THEN cd.net_to_pay ELSE 0 END)
                    as balance
                ')
            )
            ->value('balance') ?? 0;

        // ─── 4. الدفعات المسددة حتى التاريخ ────────────────────────────────
        $paymentsTotal = DB::table('payments')
            ->where('company_id', $companyId)
            ->where('party_id',   $partyId)
            ->where('status', 'confirmed') // أو is_reconciled إن كان المعيار
            ->whereDate('payment_date', '<=', $date)
            ->sum('amount');

        $currentBalance = round(
            $openingAmount + (float) $documentsBalance - (float) $paymentsTotal,
            4
        );

        return [
            'party_id'         => $partyId,
            'date'             => $date,
            'fiscal_year_id'   => $fiscalYear?->id,
            'opening_balance'  => round($openingAmount, 4),
            'documents_balance' => round((float) $documentsBalance, 4),
            'payments_total'   => round((float) $paymentsTotal, 4),
            'current_balance'  => $currentBalance,
            // موجب = العميل مدين لك / أنت مدين للمورّد (حسب نوع المتعامل)
            'balance_type'     => $currentBalance >= 0 ? 'debit' : 'credit',
        ];
    }

    /**
     * أرصدة كل المتعاملين (أو فئة معينة) في تاريخ محدد — لشاشة قائمة.
     */
    public function getAllBalancesAt(string $date, ?int $partyTypeId = null): array
    {
        $companyId = $this->companyContext->get();

        $partyIds = DB::table('parties')
            ->where('company_id', $companyId)
            ->when($partyTypeId, fn($q) => $q->where('party_type_id', $partyTypeId))
            ->pluck('id');

        return $partyIds->map(fn($id) => $this->getBalanceAt($id, $date))->toArray();
    }
}

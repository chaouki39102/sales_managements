<?php

namespace App\Services\Accounting;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use App\Models\Traits\BelongsToFiscalYear;
use App\Services\PartyBalanceService;
use App\Services\TreasuryBalanceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * FiscalYearClosureService — النسخة المدمجة النهائية
 * ══════════════════════════════════════════════════════════════════
 * إصلاحات عن النسخة الأصلية:
 *
 * 1. transferPartyBalances:
 *    قبل: SUM(remaining_amount) + status!='cancelled' → خاطئ
 *    بعد: PartyBalanceService::getBalanceAt() → نفس معادلة العرض
 *
 * 2. transferStockBalances:
 *    قبل: AVG(cost_price) → خاطئ محاسبياً
 *    بعد: PMP = SUM(qty×price)/SUM(qty) → صحيح
 *
 * 3. transferStockBalances:
 *    قبل: Subquery لكل direction → بطيء
 *    بعد: JOIN مباشر مع stock_movement_types → أسرع
 *
 * 4. createNextFiscalYear:
 *    قبل: company_id مفقود → bug
 *    بعد: company_id مضاف صراحةً
 *
 * 5. validateBeforeClosure:
 *    قبل: status='draft' على commercial_documents → عمود غير موجود
 *    بعد: is_locked=false → صحيح
 *    قبل: journalEntries() → جدول غير موجود في النظام الحالي
 *    بعد: تحقق محذوف (لا محاسبة SCF في هذا النظام)
 *
 * 6. upsert() بدل insert():
 *    آمن لإعادة التشغيل — UNIQUE constraints لا تسبب فشلاً
 *
 * 7. transferTreasuryBalances: جديد كلياً
 *    ينقل أرصدة الخزينة = العمود الثالث في جدول التناظر
 *
 * 8. whereNull('deleted_at') على كل DB::table() queries
 *    SoftDeletes لا تعمل تلقائياً مع DB::table()
 *
 * جدول التناظر مكتمل 100%:
 *   المخزون      → transferStockBalances   → opening_balances_stock
 *   المتعاملون   → transferPartyBalances   → opening_balances_parties
 *   الخزينة      → transferTreasuryBalances → opening_balances_treasury
 * ══════════════════════════════════════════════════════════════════
 */
class FiscalYearClosureService
{
    public function __construct(
        private PartyBalanceService    $partyBalanceService,
        private TreasuryBalanceService $treasuryBalanceService,
    ) {}

    public function closeYear(FiscalYear $yearToClose, int $closedBy): FiscalYear
    {
        $this->validateBeforeClosure($yearToClose);

        try {
            return DB::transaction(function () use ($yearToClose, $closedBy) {

                $newYear = $this->createNextFiscalYear($yearToClose);

                $this->transferPartyBalances($yearToClose, $newYear);
                $this->transferStockBalances($yearToClose, $newYear);
                $this->transferTreasuryBalances($yearToClose, $newYear);

                $yearToClose->update([
                    'is_closed'  => true,
                    'is_current' => false,
                    'closed_at'  => now(),
                    'closed_by'  => $closedBy,
                ]);

                $newYear->update(['is_current' => true]);

                // تحديث كاش BelongsToFiscalYear trait
                BelongsToFiscalYear::refreshClosedYearsCache();

                Log::info("تم إقفال السنة المالية {$yearToClose->name} — السنة الجديدة: {$newYear->name}");

                return $newYear;
            });
        } catch (Exception $e) {
            Log::error("فشل إقفال السنة المالية {$yearToClose->name}: {$e->getMessage()}");
            throw $e;
        }
    }

    // ─────────────────────────────────────────────────────────────────────────

    protected function validateBeforeClosure(FiscalYear $year): void
    {
        if ($year->is_closed) {
            throw new FiscalYearClosedException('السنة المالية مقفلة بالفعل.');
        }

        // is_locked=false → مستند غير مؤكد (مسودة)
        // commercial_documents لا يحتوي عمود 'status' مباشرة
        $openDocs = $year->commercialDocuments()
            ->where('is_locked', false)
            ->count();

        if ($openDocs > 0) {
            throw new Exception(
                "لا يمكن الإقفال: يوجد {$openDocs} مستند غير مؤكد."
            );
        }
    }

    protected function createNextFiscalYear(FiscalYear $currentYear): FiscalYear
    {
        return FiscalYear::create([
            'company_id' => $currentYear->company_id, // ✅ مطلوب صراحةً
            'name'       => (string) ((int) $currentYear->name + 1),
            'start_date' => $currentYear->end_date->copy()->addDay(),
            'end_date'   => $currentYear->end_date->copy()->addYear(),
            'is_current' => false,
            'is_closed'  => false,
        ]);
    }

    /**
     * ترحيل أرصدة المتعاملين.
     *
     * Fix: يستخدم PartyBalanceService::getBalanceAt() بدل SUM(remaining_amount)
     * لأن remaining_amount يتجاهل الرصيد الافتتاحي للسنة المُقفلة.
     *
     * يجمع المتعاملين من المستندات والدفعات معاً لتجنب إغفال
     * من لديهم دفعات فقط بدون مستندات.
     *
     * upsert() → آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + party_id)
     */
    protected function transferPartyBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $partyIds = DB::table('commercial_documents')
            ->where('fiscal_year_id', $oldYear->id)
            ->whereNotNull('party_id')
            ->whereNull('deleted_at')
            ->distinct()
            ->pluck('party_id')
            ->merge(
                DB::table('payments')
                    ->where('fiscal_year_id', $oldYear->id)
                    ->whereNotNull('party_id')
                    ->whereNull('deleted_at')
                    ->distinct()
                    ->pluck('party_id')
            )
            ->unique();

        $rows = [];
        foreach ($partyIds as $partyId) {
            $result  = $this->partyBalanceService->getBalanceAt(
                $partyId,
                $oldYear->end_date->toDateString()
            );
            $balance = $result['current_balance'];

            if (abs($balance) < 0.0001) continue;

            $rows[] = [
                'company_id'      => $oldYear->company_id,
                'fiscal_year_id'  => $newYear->id,
                'party_id'        => $partyId,
                'opening_balance' => abs($balance),
                'balance_type'    => $balance >= 0 ? 'debit' : 'credit',
                'created_at'      => now(),
                'updated_at'      => now(),
            ];
        }

        if (empty($rows)) return;

        DB::table('opening_balances_parties')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'party_id'],
            ['opening_balance', 'balance_type', 'updated_at']
        );
    }

    /**
     * ترحيل أرصدة المخزون.
     *
     * Fix 1: JOIN مباشر مع stock_movement_types بدل Subquery داخل CASE
     * Fix 2: PMP = SUM(qty×cost_price)/SUM(qty) بدل AVG(cost_price)
     * Fix 3: whereNull('deleted_at') — SoftDeletes لا تعمل مع DB::table()
     * Fix 4: upsert() بدل insert() — آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + product_id + warehouse_id)
     */
    protected function transferStockBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $stockBalances = DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', 'sm.stock_movement_type_id', '=', 'smt.id')
            ->where('sm.fiscal_year_id', $oldYear->id)
            ->where('sm.is_validated',   true)
            ->whereNull('sm.deleted_at')
            ->select(
                'sm.product_id',
                'sm.warehouse_id',
                DB::raw("
                    SUM(
                        CASE WHEN smt.direction =  1 THEN  sm.quantity
                             WHEN smt.direction = -1 THEN -sm.quantity
                             ELSE 0 END
                    ) as final_quantity
                "),
                // PMP = SUM(qty_in × cost_price) / SUM(qty_in)
                DB::raw("
                    SUM(CASE WHEN smt.direction = 1 THEN sm.quantity * sm.cost_price ELSE 0 END)
                    /
                    NULLIF(SUM(CASE WHEN smt.direction = 1 THEN sm.quantity ELSE 0 END), 0)
                    as pmp_cost_price
                ")
            )
            ->groupBy('sm.product_id', 'sm.warehouse_id')
            ->having('final_quantity', '>', 0)
            ->get();

        $rows = [];
        foreach ($stockBalances as $b) {
            $rows[] = [
                'company_id'       => $oldYear->company_id,
                'fiscal_year_id'   => $newYear->id,
                'product_id'       => $b->product_id,
                'warehouse_id'     => $b->warehouse_id,
                'opening_quantity' => $b->final_quantity,
                'opening_value'    => round(
                    $b->final_quantity * ($b->pmp_cost_price ?? 0), 4
                ),
                'created_at'       => now(),
                'updated_at'       => now(),
            ];
        }

        if (empty($rows)) return;

        DB::table('opening_balances_stock')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'product_id', 'warehouse_id'],
            ['opening_quantity', 'opening_value', 'updated_at']
        );
    }

    /**
     * ترحيل أرصدة الخزينة — جديد كلياً.
     *
     * يستخدم TreasuryBalanceService::getTreasuryBalanceAt()
     * نفس معادلة العرض: opening + in - out
     *
     * upsert() → آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + treasury_account_id)
     */
    protected function transferTreasuryBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $accountIds = DB::table('treasury_accounts')
            ->where('company_id', $oldYear->company_id)
            ->whereNull('deleted_at')
            ->pluck('id');

        $rows = [];
        foreach ($accountIds as $accountId) {
            $result  = $this->treasuryBalanceService->getTreasuryBalanceAt(
                $accountId,
                $oldYear->end_date->toDateString()
            );
            $balance = $result['current_balance'];

            if (abs($balance) < 0.0001) continue;

            $rows[] = [
                'company_id'          => $oldYear->company_id,
                'fiscal_year_id'      => $newYear->id,
                'treasury_account_id' => $accountId,
                'opening_balance'     => $balance,
                'created_at'          => now(),
                'updated_at'          => now(),
            ];
        }

        if (empty($rows)) return;

        DB::table('opening_balances_treasury')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'treasury_account_id'],
            ['opening_balance', 'updated_at']
        );
    }
}

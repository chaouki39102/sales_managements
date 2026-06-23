<?php

namespace App\Services\Accounting;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use App\Models\Traits\BelongsToFiscalYear; // ✅ إصلاح: namespace صحيح
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * خدمة إقفال السنة المالية مع نقل الأرصدة
 * Performance: استخدام استعلامات Bulk بدلاً من Loops
 */
class FiscalYearClosureService
{
    /**
     * إقفال السنة المالية بشكل آمن
     */
    public function closeYear(FiscalYear $yearToClose, int $closedBy): FiscalYear
    {
        // 1. التحقق الأولي
        $this->validateBeforeClosure($yearToClose);

        try {
            return DB::transaction(function () use ($yearToClose, $closedBy) {

                // 2. إنشاء السنة الجديدة
                $newYear = $this->createNextFiscalYear($yearToClose);

                // 3. نقل الأرصدة (Performance Optimized)
                $this->transferAccountBalances($yearToClose, $newYear);
                $this->transferPartyBalances($yearToClose, $newYear);
                $this->transferStockBalances($yearToClose, $newYear);

                // 4. إقفال السنة القديمة
                $yearToClose->update([
                    'is_closed' => true,
                    'is_current' => false,
                    'closed_at' => now(),
                    'closed_by' => $closedBy,
                ]);

                // 5. تفعيل السنة الجديدة
                $newYear->update(['is_current' => true]);

                // 6. تحديث الـ Cache
                BelongsToFiscalYear::refreshClosedYearsCache();

                Log::info("تم إقفال السنة المالية {$yearToClose->name} بنجاح");

                return $newYear;
            });
        } catch (Exception $e) {
            Log::error("فشل إقفال السنة المالية: {$e->getMessage()}");
            throw $e;
        }
    }

    /**
     * التحقق من إمكانية الإقفال
     */
    protected function validateBeforeClosure(FiscalYear $year): void
    {
        if ($year->is_closed) {
            throw new FiscalYearClosedException('السنة المالية مقفلة بالفعل');
        }

        // ✅ تحقق من القيود غير المتوازنة
        $unbalancedCount = $year->journalEntries()
            ->where('is_balanced', false)
            ->count();

        if ($unbalancedCount > 0) {
            throw new Exception("لا يمكن الإقفال: يوجد {$unbalancedCount} قيود غير متوازنة");
        }

        // ✅ تحقق من المستندات المفتوحة (Draft)
        $openDocumentsCount = $year->commercialDocuments()
            ->where('status', 'draft')
            ->count();

        if ($openDocumentsCount > 0) {
            throw new Exception("لا يمكن الإقفال: يوجد {$openDocumentsCount} مستندات بحالة مسودة");
        }
    }

    /**
     * إنشاء السنة المالية الجديدة
     */
    protected function createNextFiscalYear(FiscalYear $currentYear): FiscalYear
    {
        $nextYearName = (int)$currentYear->name + 1;

        return FiscalYear::create([
            'name' => (string)$nextYearName,
            'start_date' => $currentYear->end_date->addDay(),
            'end_date' => $currentYear->end_date->copy()->addYear(),
            'is_current' => false, // سيتم تفعيلها لاحقاً
            'is_closed' => false,
        ]);
    }

    /**
     * نقل أرصدة الحسابات (Performance: Bulk Insert)
     */
    protected function transferAccountBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        // ✅ استعلام واحد لحساب كل الأرصدة
        $balances = DB::table('journal_entry_lines as jel')
            ->join('journal_entries as je', 'je.id', '=', 'jel.journal_entry_id')
            ->where('je.fiscal_year_id', $oldYear->id)
            ->where('je.status', 'posted') // فقط القيود المحققة
            ->select(
                'jel.account_id',
                DB::raw('SUM(jel.debit) as total_debit'),
                DB::raw('SUM(jel.credit) as total_credit')
            )
            ->groupBy('jel.account_id')
            ->get();

        // ✅ إدراج جماعي (Bulk Insert)
        $openingBalances = [];
        foreach ($balances as $balance) {
            $netBalance = $balance->total_debit - $balance->total_credit;

            $openingBalances[] = [
                'fiscal_year_id' => $newYear->id,
                'account_id' => $balance->account_id,
                'opening_debit' => $netBalance > 0 ? $netBalance : 0,
                'opening_credit' => $netBalance < 0 ? abs($netBalance) : 0,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($openingBalances)) {
            DB::table('opening_balances_accounts')->insert($openingBalances);
        }
    }

    /**
     * نقل أرصدة الأطراف (الزبائن/الموردين)
     */
    protected function transferPartyBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        // ✅ حساب الأرصدة من المستندات التجارية
        $partyBalances = DB::table('commercial_documents')
            ->where('fiscal_year_id', $oldYear->id)
            ->whereNotNull('party_id')
            ->where('status', '!=', 'cancelled')
            ->select(
                'party_id',
                DB::raw('SUM(remaining_amount) as balance')
            )
            ->groupBy('party_id')
            ->having('balance', '!=', 0)
            ->get();

        $openingBalances = [];
        foreach ($partyBalances as $balance) {
            $openingBalances[] = [
                'fiscal_year_id' => $newYear->id,
                'party_id' => $balance->party_id,
                'opening_balance' => abs($balance->balance),
                'balance_type' => $balance->balance > 0 ? 'debit' : 'credit',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($openingBalances)) {
            DB::table('opening_balances_parties')->insert($openingBalances);
        }
    }

    /**
     * نقل أرصدة المخزون
     */
    protected function transferStockBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        // ✅ حساب الرصيد النهائي لكل صنف في كل مستودع
        $stockBalances = DB::table('stock_movements')
            ->where('fiscal_year_id', $oldYear->id)
            ->where('is_validated', true)
            ->select(
                'product_id',
                'warehouse_id',
                DB::raw('SUM(
                    CASE
                        WHEN stock_movement_type_id IN (
                            SELECT id FROM stock_movement_types WHERE direction = 1
                        ) THEN quantity
                        WHEN stock_movement_type_id IN (
                            SELECT id FROM stock_movement_types WHERE direction = -1
                        ) THEN -quantity
                        ELSE 0
                    END
                ) as final_quantity'),
                DB::raw('AVG(cost_price) as avg_cost_price')
            )
            ->groupBy('product_id', 'warehouse_id')
            ->having('final_quantity', '>', 0)
            ->get();

        $openingBalances = [];
        foreach ($stockBalances as $balance) {
            $openingBalances[] = [
                'fiscal_year_id' => $newYear->id,
                'product_id' => $balance->product_id,
                'warehouse_id' => $balance->warehouse_id,
                'opening_quantity' => $balance->final_quantity,
                'opening_value' => $balance->final_quantity * $balance->avg_cost_price,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        if (!empty($openingBalances)) {
            DB::table('opening_balances_stock')->insert($openingBalances);
        }
    }
}
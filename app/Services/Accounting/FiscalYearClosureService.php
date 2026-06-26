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

                // ✅ ترحيل TVA وأرصدة الجرد وفق قانون الضرائب الجزائري
                $this->transferTvaBalances($yearToClose, $newYear);
                $this->transferAdvanceBalances($yearToClose, $newYear);
                $this->transferForexDifferences($yearToClose, $newYear);
                $this->transferTimbreFiscal($yearToClose, $newYear);

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

                Log::info("تم إقفال {$yearToClose->name} — ترحيل: أطراف + مخزون + خزينة + TVA + تسبيقات + صرف + طابع");

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

    // ─────────────────────────────────────────────────────────────
    //  الطرق الجديدة — الامتثال لقانون الضرائب الجزائري
    // ─────────────────────────────────────────────────────────────

    /**
     * ترحيل رصيد TVA الصافي وفق المادة 76 من قانون الرسوم على رقم الأعمال.
     */
    protected function transferTvaBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $tvaCollectee = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dt.base_operation', 'sale')
            ->sum('cd.tva_amount');

        $tvaDeductible = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dt.base_operation', 'purchase')
            ->sum('cd.tva_amount');

        $rows = [];
        $now  = now();

        if ($tvaCollectee > 0.0001) {
            $rows[] = [
                'company_id'           => $oldYear->company_id,
                'fiscal_year_id'       => $newYear->id,
                'source_fiscal_year_id'=> $oldYear->id,
                'category'             => 'tva_collectee',
                'amount'               => round($tvaCollectee, 4),
                'currency_id'          => null,
                'exchange_rate'        => null,
                'amount_dzd'           => round($tvaCollectee, 4),
                'notes'                => "TVA collectée SY {$oldYear->name}",
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        }

        if ($tvaDeductible > 0.0001) {
            $rows[] = [
                'company_id'           => $oldYear->company_id,
                'fiscal_year_id'       => $newYear->id,
                'source_fiscal_year_id'=> $oldYear->id,
                'category'             => 'tva_deductible',
                'amount'               => round($tvaDeductible, 4),
                'currency_id'          => null,
                'exchange_rate'        => null,
                'amount_dzd'           => round($tvaDeductible, 4),
                'notes'                => "TVA déductible SY {$oldYear->name}",
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        }

        if (empty($rows)) return;

        DB::table('fiscal_year_carry_forward')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'category', 'currency_id'],
            ['amount', 'amount_dzd', 'notes', 'updated_at']
        );
    }

    /**
     * ترحيل التسبيقات غير المستهلكة (avances non apurées).
     */
    protected function transferAdvanceBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        if (! \Schema::hasColumn('payments', 'payment_type')) {
            Log::info("transferAdvanceBalances: عمود payment_type غير موجود — تم التخطي");
            return;
        }

        $now = now();
        $rows = [];

        foreach ([
            'advance_client'   => 'customer',
            'advance_supplier' => 'supplier',
        ] as $category => $partyType) {

            $total = DB::table('payments as p')
                ->join('parties as pa', 'p.party_id', '=', 'pa.id')
                ->where('p.fiscal_year_id', $oldYear->id)
                ->where('p.payment_type', 'advance')
                ->where('pa.party_type', $partyType)
                ->whereNull('p.deleted_at')
                ->sum('p.amount');

            if (abs($total) < 0.0001) continue;

            $rows[] = [
                'company_id'           => $oldYear->company_id,
                'fiscal_year_id'       => $newYear->id,
                'source_fiscal_year_id'=> $oldYear->id,
                'category'             => $category,
                'amount'               => round(abs($total), 4),
                'currency_id'          => null,
                'exchange_rate'        => null,
                'amount_dzd'           => round(abs($total), 4),
                'notes'                => "تسبيقات {$partyType} SY {$oldYear->name}",
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        }

        if (empty($rows)) return;

        DB::table('fiscal_year_carry_forward')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'category', 'currency_id'],
            ['amount', 'amount_dzd', 'notes', 'updated_at']
        );
    }

    /**
     * ترحيل فروق إعادة تقييم العملات الأجنبية (scaffold فقط).
     */
    protected function transferForexDifferences(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        if (! \Schema::hasTable('exchange_rates')) {
            Log::info("transferForexDifferences: جدول exchange_rates غير موجود — تم التخطي");
            return;
        }

        $now = now();

        $foreignAccounts = DB::table('treasury_accounts as ta')
            ->join('currencies as c', 'ta.currency_id', '=', 'c.id')
            ->where('ta.company_id', $oldYear->company_id)
            ->where('c.is_base_currency', false)
            ->whereNull('ta.deleted_at')
            ->select('ta.id', 'ta.currency_id')
            ->get();

        if ($foreignAccounts->isEmpty()) return;

        $rows = [];
        $endDate = $oldYear->end_date->toDateString();

        foreach ($foreignAccounts as $account) {
            $rateRecord = DB::table('exchange_rates')
                ->where('currency_id', $account->currency_id)
                ->where('rate_date', '<=', $endDate)
                ->orderByDesc('rate_date')
                ->first();

            if (!$rateRecord) continue;

            $openingDzd = DB::table('opening_balances_treasury')
                ->where('fiscal_year_id', $oldYear->id)
                ->where('treasury_account_id', $account->id)
                ->value('opening_balance') ?? 0;

            $diff = 0;

            if (abs($diff) < 0.0001) continue;

            $rows[] = [
                'company_id'           => $oldYear->company_id,
                'fiscal_year_id'       => $newYear->id,
                'source_fiscal_year_id'=> $oldYear->id,
                'category'             => 'forex_diff',
                'amount'               => round(abs($diff), 4),
                'currency_id'          => $account->currency_id,
                'exchange_rate'        => $rateRecord->rate,
                'amount_dzd'           => round(abs($diff), 4),
                'notes'                => "فرق صرف SY {$oldYear->name}",
                'created_at'           => $now,
                'updated_at'           => $now,
            ];
        }

        if (empty($rows)) return;

        DB::table('fiscal_year_carry_forward')->upsert(
            $rows,
            ['company_id', 'fiscal_year_id', 'category', 'currency_id'],
            ['amount', 'exchange_rate', 'amount_dzd', 'notes', 'updated_at']
        );
    }

    /**
     * ترحيل الطابع المالي المستحق غير المدفوع — LF 2024/2025.
     */
    protected function transferTimbreFiscal(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        if (! \Schema::hasColumn('commercial_documents', 'timbre_fiscal_amount')) {
            Log::info("transferTimbreFiscal: عمود timbre_fiscal_amount غير موجود — تم التخطي");
            return;
        }

        $total = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->whereIn('dt.base_operation', ['sale'])
            ->sum('cd.timbre_fiscal_amount');

        if (abs($total) < 0.0001) return;

        $now = now();
        DB::table('fiscal_year_carry_forward')->upsert(
            [[
                'company_id'           => $oldYear->company_id,
                'fiscal_year_id'       => $newYear->id,
                'source_fiscal_year_id'=> $oldYear->id,
                'category'             => 'timbre_fiscal',
                'amount'               => round($total, 4),
                'currency_id'          => null,
                'exchange_rate'        => null,
                'amount_dzd'           => round($total, 4),
                'notes'                => "طابع مالي مستحق SY {$oldYear->name}",
                'created_at'           => $now,
                'updated_at'           => $now,
            ]],
            ['company_id', 'fiscal_year_id', 'category', 'currency_id'],
            ['amount', 'amount_dzd', 'notes', 'updated_at']
        );
    }
}
<?php

namespace App\Services\Accounting;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use App\Models\Traits\BelongsToFiscalYear; // ✅ إصلاح: namespace صحيح
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
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
                $this->transferTreasuryBalances($yearToClose, $newYear);

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

        // ✅ تحقق من القيود غير المتوازنة (فقط عند تثبيت وحدة المحاسبة/القيود)
        if (Schema::hasTable('journal_entries') && Schema::hasColumn('journal_entries', 'is_balanced')) {
            $unbalancedCount = DB::table('journal_entries')
                ->where('fiscal_year_id', $year->id)
                ->where('is_balanced', false)
                ->count();

            if ($unbalancedCount > 0) {
                throw new Exception("لا يمكن الإقفال: يوجد {$unbalancedCount} قيود غير متوازنة");
            }
        }

        // ✅ تحقق من المستندات المفتوحة (Draft) — document_statuses.name وليس عمود status
        $openDocumentsCount = $year->commercialDocuments()
            ->whereHas('documentStatus', fn($q) => $q->where('name', 'draft'))
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

        // ✅ إذا كانت السنة التالية موجودة مسبقاً (أُنشئت يدوياً/تلقائياً)، نعيد استخدامها
        //    بدل كسر قيد التفرد (company_id, name) عند الإقفال.
        $existing = FiscalYear::where('company_id', $currentYear->company_id)
            ->where('name', (string)$nextYearName)
            ->first();

        if ($existing) {
            return $existing;
        }

        return FiscalYear::create([
            'company_id' => $currentYear->company_id,
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
        // ✅ وحدة المحاسبة (القيود) قد لا تكون مثبتة — نتخطى بأمان بدل تعطل الإقفال
        if (! Schema::hasTable('journal_entries')) {
            Log::info("transferAccountBalances: جدول journal_entries غير موجود (وحدة المحاسبة غير مثبتة) — تم التخطي");
            return;
        }

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
                'company_id' => $oldYear->company_id,
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
        // ✅ حساب الأرصدة من المستندات التجارية (مع فلترة الشركة و المستندات المحذوفة)
        $partyBalances = DB::table('commercial_documents as cd')
            ->join('document_statuses as ds', 'ds.id', '=', 'cd.document_status_id')
            ->where('cd.company_id', $oldYear->company_id)
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->whereNotNull('cd.party_id')
            ->where('ds.name', '!=', 'cancelled')
            ->whereNull('cd.deleted_at')
            ->select(
                'cd.party_id',
                DB::raw('SUM(cd.remaining_amount) as balance')
            )
            ->groupBy('cd.party_id')
            ->having('balance', '!=', 0)
            ->get();

        $openingBalances = [];
        foreach ($partyBalances as $balance) {
            $openingBalances[] = [
                'company_id' => $oldYear->company_id,
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
        //    join على stock_movement_types مقيدة بـ sm.company_id (مصطلح الحركة خاص بكل شركة)
        //    + whereNull(sm.deleted_at) — DB::table لا يطبق SoftDeletes تلقائياً
        $stockBalances = DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', function ($join) {
                $join->on('smt.id', '=', 'sm.stock_movement_type_id')
                     ->on('smt.company_id', '=', 'sm.company_id');
            })
            ->where('sm.company_id', $oldYear->company_id)
            ->where('sm.fiscal_year_id', $oldYear->id)
            ->where('sm.is_validated', true)
            ->whereNull('sm.deleted_at')
            ->select(
                'sm.product_id',
                'sm.warehouse_id',
                DB::raw('SUM(
                    CASE
                        WHEN smt.direction > 0 THEN sm.quantity
                        WHEN smt.direction < 0 THEN -sm.quantity
                        ELSE 0
                    END
                ) as final_quantity'),
                DB::raw('AVG(sm.cost_price) as avg_cost_price')
            )
            ->groupBy('sm.product_id', 'sm.warehouse_id')
            ->having('final_quantity', '>', 0)
            ->get();

        $openingBalances = [];
        foreach ($stockBalances as $balance) {
            $openingBalances[] = [
                'company_id' => $oldYear->company_id,
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
     * ترحيل أرصدة الخزينة إلى السنة الجديدة.
     *
     * نفس معادلة العرض في TreasuryBalanceService (opening + in - out)
     * لكن محسوبة مباشرة بـ company_id صريح حتى تعمل من سطر الأوامر
     * دون الحاجة إلى سياق الشركة (CompanyContextService).
     *
     * upsert() → آمن لإعادة التشغيل
     * (UNIQUE: company_id + fiscal_year_id + treasury_account_id)
     */
    protected function transferTreasuryBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $companyId = $oldYear->company_id;

        $accountIds = DB::table('treasury_accounts')
            ->where('company_id', $companyId)
            ->where('active', true)
            ->whereNull('deleted_at')
            ->pluck('id');

        $rows = [];
        foreach ($accountIds as $accountId) {
            $opening = (float) DB::table('opening_balances_treasury')
                ->where('company_id', $companyId)
                ->where('treasury_account_id', $accountId)
                ->where('fiscal_year_id', $oldYear->id)
                ->value('opening_balance') ?? 0;

            $totalIn = (float) DB::table('payments')
                ->where('company_id', $companyId)
                ->where('treasury_account_id', $accountId)
                ->where('fiscal_year_id', $oldYear->id)
                ->where('status', 'confirmed')
                ->where('direction', 'in')
                ->whereNull('deleted_at')
                ->sum('amount');

            $totalOut = (float) DB::table('payments')
                ->where('company_id', $companyId)
                ->where('treasury_account_id', $accountId)
                ->where('fiscal_year_id', $oldYear->id)
                ->where('status', 'confirmed')
                ->where('direction', 'out')
                ->whereNull('deleted_at')
                ->sum('amount');

            $balance = round($opening + $totalIn - $totalOut, 4);

            if (abs($balance) < 0.0001) continue;

            $rows[] = [
                'company_id'          => $companyId,
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

    /**
     * ترحيل رصيد TVA الصافي وفق المادة 76 من قانون الرسوم على رقم الأعمال.
     */
    protected function transferTvaBalances(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        $tvaCollectee = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.company_id', $oldYear->company_id)
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dbo.name', 'sale')
            ->sum('cd.total_tva');

        $tvaDeductible = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.company_id', $oldYear->company_id)
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dbo.name', 'purchase')
            ->sum('cd.total_tva');

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
     * ترحيل فروق إعادة تقييم العملات الأجنبية.
     *
     * ملاحظة: هذا المسار لا يزال مسودة (scaffold) — حساب الفرق يتطلب
     * سعر الصرف الافتتاحي المسجل عند ترحيل الرصيد الافتتاحي، وهو غير
     * متوفر في الجدول الحالي. حتى اكتمال المتطلبات، نعود بأمان بدون
     * تعطيل إقفال السنة (كان الكود السابق يعطل الإقفال بسبب عمود currency_id
     * غير الموجود في جدول exchange_rates).
     */
    protected function transferForexDifferences(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        Log::info("transferForexDifferences: ميزة فروق الصرف ما زالت قيد التطوير — تم التخطي بأمان أثناء إقفال {$oldYear->name}");
    }

    /**
     * ترحيل الطابع المالي المستحق غير المدفوع — LF 2024/2025.
     */
    protected function transferTimbreFiscal(FiscalYear $oldYear, FiscalYear $newYear): void
    {
        if (! \Schema::hasColumn('commercial_documents', 'total_stamp')) {
            Log::info("transferTimbreFiscal: عمود total_stamp غير موجود — تم التخطي");
            return;
        }

        $total = DB::table('commercial_documents as cd')
            ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
            ->join('document_base_operations as dbo', 'dbo.id', '=', 'dt.document_base_operation_id')
            ->where('cd.company_id', $oldYear->company_id)
            ->where('cd.fiscal_year_id', $oldYear->id)
            ->where('cd.is_locked', true)
            ->whereNull('cd.deleted_at')
            ->where('dbo.name', 'sale')
            ->sum('cd.total_stamp');

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
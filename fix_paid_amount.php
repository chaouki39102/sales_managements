<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

// For ALL companies where stamp is disabled, fix paid_amount and payments
// Only for docs where paid_amount - net_to_pay is a small clean number (stamp amount)
$disabledCompanies = [1, 9];

foreach ($disabledCompanies as $companyId) {
    echo "=== Company {$companyId} ===" . PHP_EOL;

    // Find docs where paid_amount exceeds net_to_pay by a small amount (the stamp residue)
    $docs = DB::table('commercial_documents as cd')
        ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
        ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
        ->where('cd.company_id', $companyId)
        ->where('dbo.name', 'sale')
        ->where('dt.affects_accounting', true)
        ->whereNull('cd.deleted_at')
        ->where('cd.total_stamp', 0)
        ->whereRaw('cd.paid_amount > cd.net_to_pay + 0.001')
        ->whereRaw('cd.paid_amount - cd.net_to_pay <= 500') // stamp is always <= 2500, but per-doc it's small
        ->select('cd.id', 'cd.party_id', 'cd.document_date', 'cd.total_ht', 'cd.total_tva', 'cd.net_to_pay', 'cd.paid_amount')
        ->orderBy('cd.id')
        ->get();

    foreach ($docs as $d) {
        $diff = round($d->paid_amount - $d->net_to_pay, 2);

        // Check if the diff is a plausible stamp amount (5 to 2500, and roughly 1% of total_ht+tva)
        $htPlusTva = $d->total_ht + $d->total_tva;
        $expectedStamp = round(max(5, min($htPlusTva * 0.01, 2500)), 2);

        if (abs($diff - $expectedStamp) < 0.1) {
            echo "  Doc #{$d->id}: paid={$d->paid_amount} net={$d->net_to_pay} diff={$diff} (expected stamp={$expectedStamp})" . PHP_EOL;

            // Fix paid_amount
            DB::table('commercial_documents')
                ->where('id', $d->id)
                ->update(['paid_amount' => $d->net_to_pay]);

            // Find matching payment and reduce by stamp amount
            $payment = DB::table('payments')
                ->where('company_id', $companyId)
                ->where('party_id', $d->party_id)
                ->where('status', 'confirmed')
                ->whereDate('payment_date', $d->document_date)
                ->whereNull('deleted_at')
                ->whereRaw('ABS(amount - ' . $d->paid_amount . ') < 0.01')
                ->first();

            if ($payment) {
                $newPayAmount = round($payment->amount - $diff, 2);
                DB::table('payments')->where('id', $payment->id)->update(['amount' => $newPayAmount]);
                echo "    -> Pay #{$payment->id}: {$payment->amount} -> {$newPayAmount}" . PHP_EOL;
            } else {
                echo "    -> No matching payment found!" . PHP_EOL;
            }
        }
    }
}

// Clear caches
foreach ([null, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as $cid) {
    $prefix = $cid ?? 'null';
    foreach (['invoice', 'fiscal', 'inventory', 'alerts', 'general', 'company'] as $group) {
        \Illuminate\Support\Facades\Cache::forget("settings:{$prefix}:{$group}");
    }
    \Illuminate\Support\Facades\Cache::forget("settings:{$prefix}:all");
    \Illuminate\Support\Facades\Cache::forget("setting:{$prefix}:fiscal_stamp_enabled");
}

echo PHP_EOL . "=== Final balance check ===" . PHP_EOL;
$fiscalYearId = DB::table('fiscal_years')->where('company_id', 9)->whereDate('start_date', '<=', date('Y-m-d'))->whereDate('end_date', '>=', date('Y-m-d'))->value('id');

foreach (DB::table('parties')->where('company_id', 9)->whereNull('deleted_at')->get() as $p) {
    $docsBal = (float) DB::table('commercial_documents as cd')
        ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
        ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
        ->where('cd.company_id', 9)->where('cd.party_id', $p->id)->where('cd.fiscal_year_id', $fiscalYearId)
        ->where('dt.affects_accounting', true)->whereDate('cd.document_date', '<=', date('Y-m-d'))->whereNull('cd.deleted_at')
        ->selectRaw("COALESCE(SUM(CASE WHEN dbo.name='sale' THEN cd.net_to_pay ELSE 0 END),0) as sales")
        ->value('sales') ?? 0;

    $payTotal = (float) DB::table('payments')
        ->where('company_id', 9)->where('party_id', $p->id)->where('fiscal_year_id', $fiscalYearId)
        ->where('status', 'confirmed')->whereDate('payment_date', '<=', date('Y-m-d'))->whereNull('deleted_at')
        ->sum('amount') ?? 0;

    $balance = round($docsBal - $payTotal, 2);
    echo "{$p->name}: docs={$docsBal} pay={$payTotal} balance={$balance}" . PHP_EOL;
}

<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

$docs = DB::table('commercial_documents')
    ->where('party_id', 15)
    ->whereNull('deleted_at')
    ->whereRaw('id >= 188')
    ->orderBy('id')
    ->get(['id', 'total_ht', 'total_tva', 'total_stamp', 'net_to_pay', 'paid_amount', 'document_date']);

foreach ($docs as $d) {
    echo "#{$d->id} ({$d->document_date}): HT={$d->total_ht} TVA={$d->total_tva} stamp={$d->total_stamp} net={$d->net_to_pay} paid={$d->paid_amount} diff=" . round($d->net_to_pay - $d->paid_amount, 2) . PHP_EOL;
}

// Also check: what is Client Cash's CURRENT party balance?
$fiscalYearId = DB::table('fiscal_years')->where('company_id', 9)->whereDate('start_date', '<=', date('Y-m-d'))->whereDate('end_date', '>=', date('Y-m-d'))->value('id');

$docsBalance = DB::table('commercial_documents as cd')
    ->join('document_types as dt', 'cd.document_type_id', '=', 'dt.id')
    ->join('document_base_operations as dbo', 'dt.document_base_operation_id', '=', 'dbo.id')
    ->where('cd.company_id', 9)->where('cd.party_id', 15)->where('cd.fiscal_year_id', $fiscalYearId)
    ->where('dt.affects_accounting', true)->whereDate('cd.document_date', '<=', date('Y-m-d'))->whereNull('cd.deleted_at')
    ->selectRaw("SUM(CASE WHEN dbo.name='sale' THEN cd.net_to_pay ELSE 0 END) as sales, SUM(CASE WHEN dbo.name='purchase' THEN cd.net_to_pay ELSE 0 END) as purchases")
    ->first();

$payTotal = DB::table('payments')->where('company_id', 9)->where('party_id', 15)->where('fiscal_year_id', $fiscalYearId)->where('status', 'confirmed')->whereDate('payment_date', '<=', date('Y-m-d'))->whereNull('deleted_at')->sum('amount');

echo PHP_EOL . "Sales total: {$docsBalance->sales}" . PHP_EOL;
echo "Payments total: {$payTotal}" . PHP_EOL;
echo "Balance: " . round($docsBalance->sales - $payTotal, 2) . PHP_EOL;
echo "Note: negative = customer overpaid (credit)" . PHP_EOL;

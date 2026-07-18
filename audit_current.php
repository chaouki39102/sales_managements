<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use Illuminate\Support\Facades\DB;

echo "=== Current state of Client Cash docs (company 9) ===" . PHP_EOL;

$docs = DB::table('commercial_documents')
    ->where('party_id', 15)
    ->whereNull('deleted_at')
    ->orderBy('id')
    ->get(['id', 'total_ht', 'total_tva', 'total_stamp', 'net_to_pay', 'paid_amount', 'document_date']);

foreach ($docs as $d) {
    echo "#{$d->id}: HT={$d->total_ht} stamp={$d->total_stamp} net={$d->net_to_pay} paid={$d->paid_amount}" . PHP_EOL;
}

// Check what payments exist
$payments = DB::table('payments')
    ->where('company_id', 9)
    ->where('party_id', 15)
    ->whereNull('deleted_at')
    ->orderBy('id')
    ->get(['id', 'payment_date', 'amount', 'status']);

echo PHP_EOL . "=== Payments ===" . PHP_EOL;
foreach ($payments as $p) {
    echo "Pay #{$p->id}: {$p->payment_date} amount={$p->amount} status={$p->status}" . PHP_EOL;
}

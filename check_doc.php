<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\CommercialDocument;

$doc = CommercialDocument::where('document_number', 'POS-2026-000173')->first();
if (!$doc) {
    // Try the latest document
    $doc = CommercialDocument::latest()->first();
    echo "Using latest doc: {$doc->document_number}\n";
}
if ($doc) {
    echo "Doc ID: {$doc->id}\n";
    echo "Number: {$doc->document_number}\n";
    echo "Total HT: {$doc->total_ht}\n";
    echo "Total TTC: {$doc->total_ttc}\n";
    echo "Total Discount: {$doc->total_discount}\n";
    echo "--- Lines ---\n";
    foreach ($doc->lines as $line) {
        $raw = $line->getAttributes();
        echo "Line {$line->id}:\n";
        echo "  qty (raw): {$raw['quantity']}\n";
        echo "  price (raw): {$raw['unit_price_ht']}\n";
        echo "  discPct (raw): {$raw['discount_percentage']}\n";
        echo "  discAmt (raw): {$raw['discount_amount']}\n";
        echo "  totalDiscAmt (raw): {$raw['total_discount_amount']}\n";
        echo "  ht (raw): {$raw['total_ht']}\n";
        echo "  tvaRate (raw): {$raw['tva_rate']}\n";
        echo "  cast discPct: {$line->discount_percentage}\n";
        echo "  cast discAmt: {$line->discount_amount}\n";
    }
} else {
    echo "No documents found\n";
}

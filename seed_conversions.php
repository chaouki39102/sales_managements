<?php
require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

$companies = DB::table('companies')->get();
foreach ($companies as $c) {
    $exists = DB::table('document_type_conversions')->where('company_id', $c->id)->exists();
    echo "{$c->slug}: conversions exists = " . ($exists ? 'true' : 'false') . PHP_EOL;
    if (!$exists) {
        config(['seeding.company_id' => $c->id]);
        (new Database\Seeders\DocumentTypeConversionSeeder)->run();
        echo "  -> seeded" . PHP_EOL;
    }
}
echo "Done" . PHP_EOL;

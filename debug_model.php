<?php
require __DIR__ . '/vendor/autoload.php';
$app = require __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Test 1: SQL without scope
echo "=== Test 1: whereKey(1) SQL ===\n";
$query = App\Models\PrintTemplate::whereKey(1);
echo "SQL: " . $query->toSql() . "\n";
echo "Bindings: " . json_encode($query->getBindings()) . "\n";

// Test 3: Simulate HTTP context
echo "\n=== Test 3: Simulate HTTP context ===\n";
$context = app(App\Services\CompanyContextService::class);
$context->set(15);
echo "Context set to: " . $context->get() . "\n";

$query2 = App\Models\PrintTemplate::whereKey(1);
echo "SQL: " . $query2->toSql() . "\n";
echo "Bindings: " . json_encode($query2->getBindings()) . "\n";

$tpl = App\Models\PrintTemplate::whereKey(1)->first();
echo "Found: " . ($tpl ? $tpl->name . ' (id=' . $tpl->id . ', company_id=' . $tpl->company_id . ')' : 'NULL') . "\n";

// Test title_text
$raw = $tpl->getRawOriginal('config');
echo "\nRaw config excerpt: " . mb_substr($raw, 0, 300) . "\n";
$config = $tpl->config;
echo "title_text: " . ($config['title_text'] ?? 'NOT SET') . "\n";

// Simulate saving
echo "\n=== Test save ===\n";
$config['title_text'] = 'عنوان المستند';
$tpl->config = $config;
$tpl->save();
echo "Saved! Checking...\n";
$tpl->fresh();
$raw2 = $tpl->getRawOriginal('config');
echo "Raw after save: " . mb_substr($raw2, 0, 300) . "\n";
echo "title_text after save: " . ($tpl->config['title_text'] ?? 'NOT SET') . "\n";

// Clean up - restore the corrupted title
$config['title_text'] = '????? ?????';
$tpl->config = $config;
$tpl->save();

echo "\n=== Done ===\n";

<?php

$dir = __DIR__ . '/database/Seeders';
$outputFile = __DIR__ . '/all_seeders_combined.php';

$files = glob($dir . '/*.php');

if (!$files) {
    echo "❌ لم يتم العثور على ملفات seeders.\n";
    exit;
}

$content = "<?php\n\n// دمج تلقائي لكل ملفات الـ seeders\n\n";

foreach ($files as $file) {
    $filename = basename($file);
    $fileContent = file_get_contents($file);

    // حذف <?php من الملفات المدمجة لتجنب التكرار
    $fileContent = preg_replace('/^<\?php\s*/', '', $fileContent);

    $content .= "\n\n// ===== ملف: $filename =====\n";
    $content .= $fileContent;
    $content .= "\n\n";
}

file_put_contents($outputFile, $content);

echo "✅ تم دمج جميع ملفات الـ seeders في الملف: all_seeders_combined.php\n";

<?php

$dir = __DIR__ . '/app/Policies';
$outputFile = __DIR__ . '/all_policies_combined.php';

$files = glob($dir . '/*.php');

if (!$files) {
    echo "❌ لم يتم العثور على ملفات policies.\n";
    exit;
}

$content = "<?php\n\n// دمج تلقائي لكل ملفات الـ policies\n\n";

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

echo "✅ تم دمج جميع ملفات الـ policies في الملف: all_policies_combined.php\n";

<?php

declare(strict_types=1);

$projectRoot = __DIR__;
$appDir      = $projectRoot . '/app';
$backupDir   = $projectRoot . '/storage/psr4-backup-' . date('Ymd_His');

echo PHP_EOL;
echo "======================================" . PHP_EOL;
echo " Laravel PSR-4 Auto Fix Tool" . PHP_EOL;
echo "======================================" . PHP_EOL;

if (!is_dir($backupDir)) {
    mkdir($backupDir, 0777, true);
}

function copyDirectory(string $src, string $dst): void
{
    if (!is_dir($dst)) {
        mkdir($dst, 0777, true);
    }

    foreach (scandir($src) as $item) {
        if ($item === '.' || $item === '..') {
            continue;
        }

        $source = $src . DIRECTORY_SEPARATOR . $item;
        $target = $dst . DIRECTORY_SEPARATOR . $item;

        if (is_dir($source)) {
            copyDirectory($source, $target);
        } else {
            copy($source, $target);
        }
    }
}

echo "Creating backup..." . PHP_EOL;
copyDirectory($appDir, $backupDir);

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($appDir)
);

$totalFiles = 0;
$renamed = 0;
$splitFiles = 0;

foreach ($iterator as $file) {

    if (!$file->isFile()) {
        continue;
    }

    if ($file->getExtension() !== 'php') {
        continue;
    }

    $path = $file->getRealPath();
    $content = file_get_contents($path);

    $totalFiles++;

    preg_match('/namespace\s+([^;]+);/i', $content, $namespaceMatch);

    $namespace = $namespaceMatch[1] ?? '';

    preg_match_all(
        '/class\s+([A-Za-z0-9_]+)/',
        $content,
        $classMatches
    );

    $classes = $classMatches[1] ?? [];

    if (count($classes) === 0) {
        continue;
    }

    /*
    |--------------------------------------------------------------------------
    | حالة Class واحدة
    |--------------------------------------------------------------------------
    */
    if (count($classes) === 1) {

        $className = $classes[0];

        $expectedFile =
            dirname($path)
            . DIRECTORY_SEPARATOR
            . $className
            . '.php';

        if (
            basename($path) !== basename($expectedFile)
        ) {

            if (!file_exists($expectedFile)) {

                rename($path, $expectedFile);

                echo "[RENAMED] "
                    . basename($path)
                    . " => "
                    . basename($expectedFile)
                    . PHP_EOL;

                $renamed++;
            }
        }

        continue;
    }

    /*
    |--------------------------------------------------------------------------
    | حالة عدة Classes داخل نفس الملف
    |--------------------------------------------------------------------------
    */

    echo PHP_EOL;
    echo "[MULTI CLASS] " . $path . PHP_EOL;

    preg_match_all(
        '/(class\s+[A-Za-z0-9_]+[\s\S]*?)(?=(?:class\s+[A-Za-z0-9_]+)|\z)/',
        $content,
        $blocks
    );

    preg_match(
        '/^(.*?)(?=class\s+[A-Za-z0-9_]+)/s',
        $content,
        $header
    );

    $headerPart = $header[1] ?? '';

    foreach ($blocks[1] as $classBlock) {

        preg_match(
            '/class\s+([A-Za-z0-9_]+)/',
            $classBlock,
            $nameMatch
        );

        if (!isset($nameMatch[1])) {
            continue;
        }

        $className = $nameMatch[1];

        $newFile =
            dirname($path)
            . DIRECTORY_SEPARATOR
            . $className
            . '.php';

        if (!file_exists($newFile)) {

            file_put_contents(
                $newFile,
                $headerPart . PHP_EOL . $classBlock
            );

            echo "   -> Created: "
                . basename($newFile)
                . PHP_EOL;

            $splitFiles++;
        }
    }

    unlink($path);
}

echo PHP_EOL;
echo "======================================" . PHP_EOL;
echo "Files scanned : {$totalFiles}" . PHP_EOL;
echo "Files renamed : {$renamed}" . PHP_EOL;
echo "Files split   : {$splitFiles}" . PHP_EOL;
echo "======================================" . PHP_EOL;

echo PHP_EOL;
echo "Running Composer..." . PHP_EOL;

passthru('composer dump-autoload');

echo PHP_EOL;
echo "Done." . PHP_EOL;

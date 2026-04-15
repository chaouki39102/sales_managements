<?php

namespace App\Core\Console\Commands;

use Illuminate\Console\Command;
use App\Core\Services\ModelConfigService;
use Illuminate\Support\Facades\File;

/**
 * أمر تسخين الكاش
 *
 * الاستخدام:
 * php artisan cache:warmup
 * php artisan cache:warmup --model=User
 * php artisan cache:warmup --all
 */
class CacheWarmupCommand extends Command
{
    protected $signature = 'cache:warmup
                            {--model= : نموذج محدد للتسخين}
                            {--all : تسخين جميع النماذج}
                            {--force : إعادة بناء الكاش حتى لو كان موجوداً}';

    protected $description = 'تسخين كاش إعدادات النماذج';

    public function handle()
    {
        $this->info('🔥 بدء تسخين الكاش...');
        $this->newLine();

        $startTime = microtime(true);
        $force = $this->option('force');

        if ($modelName = $this->option('model')) {
            $this->warmupModel($modelName, $force);
        } elseif ($this->option('all')) {
            $this->warmupAllModels($force);
        } else {
            $this->warmupCriticalModels($force);
        }

        $duration = round(microtime(true) - $startTime, 2);

        $this->newLine();
        $this->info("✅ اكتمل تسخين الكاش في {$duration} ثانية");

        return Command::SUCCESS;
    }

    protected function warmupModel(string $modelName, bool $force): void
    {
        $modelClass = "App\\Models\\{$modelName}";

        if (!class_exists($modelClass)) {
            $this->error("❌ النموذج غير موجود: {$modelClass}");
            return;
        }

        $this->info("📦 تسخين: {$modelName}");

        try {
            if ($force) {
                $this->line("   🔄 مسح الكاش (force)...");
                ModelConfigService::flushConfigCache($modelClass);
                ModelConfigService::flushReflectionCache($modelClass);
            }

            $startTime = microtime(true);
            ModelConfigService::warmUp($modelClass);
            $duration = round((microtime(true) - $startTime) * 1000, 2);

            $this->line("   ✓ تم التخزين في {$duration}ms");

        } catch (\Throwable $e) {
            $this->error("   ❌ فشل: {$e->getMessage()}");
        }
    }

    protected function warmupAllModels(bool $force): void
    {
        $this->info('📚 تسخين جميع النماذج...');
        if ($force) {
            $this->warn('⚠️  إعادة بناء الكاش لجميع النماذج...');
            ModelConfigService::flushAllReflections();
        }
        $this->newLine();

        $result = ModelConfigService::warmUpAll();

        $this->displayResults($result);
    }

    protected function warmupCriticalModels(bool $force): void
    {
        $criticalModels = config('cache.critical_models', [
            'User',
            'Permission',
            'Role',
            'Setting',
            'FiscalYear',
            'DocumentType',
            'Party',
            'ProductVariant',
        ]);

        $this->info('⭐ تسخين النماذج الحرجة...');
        if ($force) {
            $this->warn('⚠️  إعادة بناء الكاش للنماذج الحرجة...');
        }
        $this->newLine();

        $warmedUp = [];
        $failed = [];

        foreach ($criticalModels as $modelName) {
            $modelClass = $this->resolveModelClass($modelName);

            if (!class_exists($modelClass)) {
                $this->warn("⚠️  {$modelName}: الكلاس غير موجود ({$modelClass})");
                $failed[] = [
                    'model' => $modelName,
                    'error' => 'Class not found'
                ];
                continue;
            }

            $this->line("📦 معالجة {$modelName}...");

            try {
                if ($force) {
                    $this->line("   🔄 مسح الكاش...");
                    ModelConfigService::flushConfigCache($modelClass);
                    ModelConfigService::flushReflectionCache($modelClass);
                }

                $startTime = microtime(true);
                ModelConfigService::warmUp($modelClass);
                $duration = round((microtime(true) - $startTime) * 1000, 2);

                $this->line("   ✓ تم في {$duration}ms");
                $warmedUp[] = $modelClass;

            } catch (\Throwable $e) {
                $this->error("   ❌ فشل: {$e->getMessage()}");
                $failed[] = [
                    'model' => $modelName,
                    'error' => $e->getMessage()
                ];
            }
        }

        $this->newLine();
        $this->displayResults([
            'warmed_up' => $warmedUp,
            'failed' => $failed,
            'total' => count($warmedUp),
            'errors' => count($failed),
        ]);
    }

    /**
     * تحديد مسار الكلاس الصحيح للنموذج
     */
    protected function resolveModelClass(string $modelName): string
    {
        // التعامل مع نماذج Spatie الخاصة
        $specialModels = [
            'Role' => \Spatie\Permission\Models\Role::class,
            'Permission' => \Spatie\Permission\Models\Permission::class,
        ];

        if (isset($specialModels[$modelName])) {
            // التحقق من وجود نموذج مخصص أولاً
            $customModel = "App\\Models\\{$modelName}";
            if (class_exists($customModel)) {
                return $customModel;
            }
            return $specialModels[$modelName];
        }

        return "App\\Models\\{$modelName}";
    }

    protected function displayResults(array $result): void
    {
        $this->table(
            ['المقياس', 'العدد'],
            [
                ['النماذج المسخنة', $result['total']],
                ['الفشل', $result['errors']],
                ['نسبة النجاح', $this->calculateSuccessRate($result)],
            ]
        );

        if (!empty($result['failed'])) {
            $this->newLine();
            $this->warn('⚠️  النماذج الفاشلة:');

            $failedData = array_map(function($item) {
                $modelName = is_string($item['model'])
                    ? class_basename($item['model'])
                    : $item['model'];

                return [
                    $modelName,
                    $item['error']
                ];
            }, $result['failed']);

            $this->table(['النموذج', 'الخطأ'], $failedData);
        }

        if ($result['total'] > 0) {
            $this->newLine();
            $this->info("✨ تم تسخين {$result['total']} نموذج بنجاح!");
        }
    }

    protected function calculateSuccessRate(array $result): string
    {
        $totalProcessed = $result['total'] + $result['errors'];

        if ($totalProcessed === 0) {
            return 'لا يوجد';
        }

        $rate = ($result['total'] / $totalProcessed) * 100;
        return round($rate, 2) . '%';
    }
}

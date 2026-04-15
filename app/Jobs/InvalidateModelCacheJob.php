<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Log;
use App\Core\Services\ModelConfigService;

class InvalidateModelCacheJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $tag;
    public string $modelClass;
    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(string $tag, string $modelClass)
    {
        $this->tag = $tag;
        $this->modelClass = $modelClass;
    }

    public function handle(): void
    {
        $key = 'cache-invalidation:' . $this->tag;

        // ✅ الإصلاح: إضافة retry بدلاً من تجاهل الطلب
        if (!RateLimiter::attempt($key, 10, function () {
            $this->performInvalidation();
        }, 60)) {
            Log::warning('Cache invalidation rate limited - retrying in 60 seconds', [
                'key' => $key,
                'tag' => $this->tag
            ]);

            // ✅ أعد المحاولة بعد دقيقة
            $this->release(60);
        }
    }

    protected function performInvalidation(): void
    {
        try {
            $tagsToFlush = ['api', $this->tag];

            // إضافة tags الموديلات المرتبطة
            if (class_exists($this->modelClass)) {
                $config = ModelConfigService::getResolvedConfig($this->modelClass);
                $relatedModels = $config['invalidate_relations'] ?? [];

                foreach ($relatedModels as $relatedClass) {
                    if (is_string($relatedClass) && class_exists($relatedClass)) {
                        $relatedTag = class_basename($relatedClass);
                        $tagsToFlush[] = $relatedTag;
                    }
                }
            }

            $tagsToFlush = array_unique($tagsToFlush);

            // مسح الكاش
            if (method_exists(Cache::getStore(), 'tags')) {
                Cache::tags($tagsToFlush)->flush();
                Log::info('Cache invalidated successfully', [
                    'tags' => $tagsToFlush,
                    'model' => $this->modelClass
                ]);
            } else {
                // Fallback: مسح كل الكاش (خطير!)
                Cache::flush();
                Log::warning('Cache store does not support tags - flushed entire cache', [
                    'model' => $this->modelClass
                ]);
            }

            // ✅ الإصلاح: استخدام الاسم الصحيح للدالة
            ModelConfigService::flushConfigCache($this->modelClass);
        } catch (\Exception $e) {
            Log::error('Cache invalidation failed', [
                'tag' => $this->tag,
                'model' => $this->modelClass,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    public function failed(\Throwable $exception): void
    {
        Log::error('Cache invalidation job failed permanently', [
            'tag' => $this->tag,
            'model' => $this->modelClass,
            'error' => $exception->getMessage(),
            'attempts' => $this->attempts()
        ]);
    }
}

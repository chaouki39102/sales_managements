<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

/**
 * Trait ApiHelpers
 *
 * دوال مساعدة عامة لجميع متحكمات الـ API
 */
trait ApiHelpers
{
    /**
     * توليد Cache Key فريد للطلب
     */
    protected function generateCacheKey(string $operation, array $params = []): string
    {
        $userId = auth()->id() ?? 'guest';
        $tenant = config('app.tenant_id') ?? 'default';

        // ترتيب المعاملات لضمان consistency
        ksort($params);
        array_walk_recursive($params, function (&$item) {
            if (is_array($item)) ksort($item);
        });

        $hash = md5(json_encode($params));

        return sprintf(
            '%s:%s:%s:%s:%s',
            $tenant,
            $this->resourceName ?? 'resource',
            $operation,
            $userId,
            $hash
        );
    }

    /**
     * مسح كاش محدد بناءً على key pattern
     */
    protected function clearCacheByPattern(string $pattern): void
    {
        if (!method_exists(Cache::getStore(), 'tags')) {
            return;
        }

        try {
            Cache::tags(['api', $this->resourceName ?? 'resource'])->flush();

            Log::debug('Cache cleared', [
                'pattern' => $pattern,
                'resource' => $this->resourceName ?? 'unknown'
            ]);
        } catch (\Exception $e) {
            Log::warning('Failed to clear cache', [
                'pattern' => $pattern,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * التحقق من صحة الاتصال بقاعدة البيانات
     */
    protected function checkDatabaseConnection(): bool
    {
        try {
            DB::connection()->getPdo();
            return DB::connection()->getDatabaseName() ? true : false;
        } catch (\Exception $e) {
            Log::error('Database connection check failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * التحقق من صحة الـ Cache
     */
    protected function checkCacheConnection(): bool
    {
        try {
            $testKey = 'health_check_' . uniqid();
            Cache::put($testKey, true, 1);
            $result = Cache::get($testKey) === true;
            Cache::forget($testKey);
            return $result;
        } catch (\Exception $e) {
            Log::error('Cache connection check failed', [
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * التحقق من صحة Storage
     */
    protected function checkStorageConnection(string $disk = 'public'): bool
    {
        try {
            return Storage::disk($disk)->exists('.');
        } catch (\Exception $e) {
            Log::error('Storage connection check failed', [
                'disk' => $disk,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * الحصول على معلومات الطلب (للتدقيق)
     */
    protected function getRequestMetadata(): array
    {
        $request = request();

        return [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'timestamp' => now()->toISOString(),
            'user_id' => auth()->id(),
            'user_email' => auth()->user()?->email,
        ];
    }

    /**
     * معالجة الأخطاء غير المتوقعة
     */
    protected function handleUnexpectedException(\Throwable $e, string $operation = 'operation'): void
    {
        Log::error("Unexpected error during {$operation}", [
            'exception' => get_class($e),
            'message' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString(),
            'controller' => static::class,
            'metadata' => $this->getRequestMetadata(),
        ]);
    }
}

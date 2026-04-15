<?php

namespace App\Core\Http\Controllers\Traits;

use App\Core\Services\ApiListService;
use App\Core\Services\ModelConfigService;
use App\Core\Exceptions\ApiQueryBuilderException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Exception;

/**
 * Trait: HasApiList
 * يحتوي الأدوات المساعدة لاستدعاء ApiListService.
 */
trait HasApiList
{
    /**
     * جلب القائمة اعتمادًا على إعدادات الموديل الموجود في الكاش.
     */
    protected function apiList(string $modelClass, Request $request = null)
    {
        try {
            $request = $request ?? request();
            $config = ModelConfigService::getResolvedConfig($modelClass);
            return ApiListService::getList($modelClass, $config, $request);
        } catch (Exception $e) {
            return $this->handleApiListError($e, $modelClass);
        }
    }

    /**
     * apiList مع config إضافي (مثلاً cache_tags, cache_ttl)
     */
    protected function apiListWithConfig(string $modelClass, array $extraConfig = [], Request $request = null)
    {
        $request = $request ?? request();
        $base = ModelConfigService::getResolvedConfig($modelClass);
        $config = array_merge($base, $extraConfig);
        return ApiListService::getList($modelClass, $config, $request);
    }

    /**
     * apiList مع callback لتعديل الـ QueryBuilder مباشرة
     */
    protected function apiListWithCallback(string $modelClass, callable $callback, Request $request = null, array $extraConfig = [])
    {
        $request = $request ?? request();
        $base = ModelConfigService::getResolvedConfig($modelClass);
        $config = array_merge($base, $extraConfig);
        $config['query_callback'] = $callback;
        return ApiListService::getList($modelClass, $config, $request);
    }

    /**
     * Cached API list: explicit wrapper
     */
    protected function cachedApiList(string $modelClass, string $cacheKey, int $ttl, Request $request = null, array $extraConfig = [])
    {
        $request = $request ?? request();
        $base = ModelConfigService::getResolvedConfig($modelClass);
        $config = array_merge($base, $extraConfig, [
            'cache_ttl' => $ttl,
            'cache_tags' => $base['cache_tags'] ?? ['api']
        ]);

        return ApiListService::getList($modelClass, $config, $request);
    }

    /**
     * معالجة الأخطاء الخاصة بـ apiList (تستخدم الآن errorResponse من Trait)
     */
    protected function handleApiListError(Exception $e, string $modelClass)
    {
        Log::error('apiList error', [
            'model' => $modelClass,
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ]);

        // التحقق من الاستثناء المخصص (400 Bad Request)
        if ($e instanceof ApiQueryBuilderException) {
            return $this->errorResponse(
                $e->getMessage(),
                $e->getCode() ?: 400,
                'QUERY_ERROR'
            );
        }

        // خطأ عام 500
        return $this->errorResponse(
            'فشل في جلب البيانات',
            500,
            'SERVER_ERROR'
        );
    }

    /**
     * بعض الاختصارات الشائعة
     */
    protected function getLatest(string $modelClass, int $limit = 10)
    {
        return $modelClass::latest()->take($limit)->get();
    }

    protected function getRandom(string $modelClass, int $limit = 5)
    {
        return $modelClass::inRandomOrder()->take($limit)->get();
    }
}

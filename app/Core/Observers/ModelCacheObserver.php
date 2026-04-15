<?php

namespace App\Core\Observers;

use App\Jobs\InvalidateModelCacheJob;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

/**
 * Model Cache Observer - Enhanced v2.0
 *
 * IMPROVEMENTS:
 * - ✅ Added queue priority support
 * - ✅ Better error handling
 * - ✅ Metrics tracking
 * - ✅ Configurable invalidation strategy
 * - ✅ Support for conditional invalidation
 */
class ModelCacheObserver
{
    /**
     * Handle created event
     */
    public function created(Model $model): void
    {
        $this->invalidate($model, 'created');
    }

    /**
     * Handle updated event
     */
    public function updated(Model $model): void
    {
        $this->invalidate($model, 'updated');
    }

    /**
     * Handle deleted event
     */
    public function deleted(Model $model): void
    {
        $this->invalidate($model, 'deleted');
    }

    /**
     * Handle restored event
     */
    public function restored(Model $model): void
    {
        $this->invalidate($model, 'restored');
    }

    /**
     * Handle force deleted event
     */
    public function forceDeleted(Model $model): void
    {
        $this->invalidate($model, 'forceDeleted');
    }

    /**
     * ✅ Invalidate cache with enhanced logic
     */
    protected function invalidate(Model $model, string $event): void
    {
        try {
            $modelClass = get_class($model);
            $tag = class_basename($modelClass);

            // ✅ Check if model is cacheable
            if (!$this->shouldInvalidateCache($model, $event)) {
                Log::debug('Cache invalidation skipped', [
                    'model' => $modelClass,
                    'event' => $event,
                    'reason' => 'not_cacheable'
                ]);
                return;
            }

            // ✅ Get queue priority based on model importance
            $queue = $this->getQueuePriority($model, $event);

            // ✅ Dispatch invalidation job
            dispatch(new InvalidateModelCacheJob($tag, $modelClass))
                ->onQueue($queue);

            Log::debug('Cache invalidation dispatched', [
                'model' => $modelClass,
                'event' => $event,
                'id' => $model->getKey() ?? 'unknown',
                'queue' => $queue,
            ]);

            // ✅ Invalidate related models
            $this->invalidateRelatedModels($model, $modelClass, $event);

            // ✅ Record metrics
            $this->recordMetric($modelClass, $event);

        } catch (\Throwable $e) {
            Log::error('Cache invalidation failed', [
                'model' => get_class($model),
                'event' => $event,
                'error' => $e->getMessage(),
                'trace' => config('app.debug') ? $e->getTraceAsString() : null,
            ]);

            // ✅ Fallback: Try immediate cache clear
            $this->fallbackCacheClear($model);
        }
    }

    /**
     * ✅ Check if cache should be invalidated
     */
    protected function shouldInvalidateCache(Model $model, string $event): bool
    {
        $modelClass = get_class($model);

        // 1. Check if model has cache TTL defined
        if (property_exists($modelClass, 'cacheTtl')) {
            $ttl = $modelClass::$cacheTtl ?? null;
            if ($ttl === null || $ttl === 0) {
                return false; // Caching disabled
            }
        }

        // 2. Check for Cacheable attribute
        if (method_exists($model, 'isCacheable')) {
            return $model->isCacheable();
        }

        // 3. Check global config
        $disabledEvents = config('cache.observer.disabled_events', []);
        if (in_array($event, $disabledEvents)) {
            return false;
        }

        // 4. Check model-specific config
        if (property_exists($modelClass, 'skipCacheInvalidation')) {
            return !$modelClass::$skipCacheInvalidation;
        }

        return true; // Default: invalidate
    }

    /**
     * ✅ Get queue priority based on model and event
     */
    protected function getQueuePriority(Model $model, string $event): string
    {
        $modelClass = get_class($model);

        // 1. Check model-specific priority
        if (property_exists($modelClass, 'cacheInvalidationQueue')) {
            return $modelClass::$cacheInvalidationQueue;
        }

        // 2. Check config
        $priorities = config('cache.observer.queue_priorities', [
            'high' => ['User', 'Permission', 'Role'],
            'medium' => ['Product', 'Order', 'Customer'],
            'low' => [],
        ]);

        $className = class_basename($modelClass);

        foreach ($priorities as $priority => $models) {
            if (in_array($className, $models)) {
                return "{$priority}-priority";
            }
        }

        // 3. Critical events get high priority
        $criticalEvents = ['forceDeleted', 'deleted'];
        if (in_array($event, $criticalEvents)) {
            return 'high-priority';
        }

        return 'default'; // Default queue
    }

    /**
     * ✅ Invalidate related models
     */
    protected function invalidateRelatedModels(Model $model, string $modelClass, string $event): void
    {
        if (!property_exists($modelClass, 'cacheInvalidateRelations')) {
            return;
        }

        $relations = $modelClass::$cacheInvalidateRelations ?? [];

        if (empty($relations)) {
            return;
        }

        foreach ($relations as $relatedClass) {
            try {
                if (!class_exists($relatedClass)) {
                    Log::warning('Related model not found', [
                        'model' => $modelClass,
                        'related' => $relatedClass
                    ]);
                    continue;
                }

                $relatedTag = class_basename($relatedClass);
                $queue = $this->getQueuePriority($model, $event);

                dispatch(new InvalidateModelCacheJob($relatedTag, $relatedClass))
                    ->onQueue($queue);

                Log::debug('Related cache invalidation dispatched', [
                    'related_model' => $relatedClass,
                    'triggered_by' => $modelClass,
                    'event' => $event,
                    'queue' => $queue,
                ]);

            } catch (\Throwable $e) {
                Log::error('Failed to invalidate related model cache', [
                    'model' => $modelClass,
                    'related' => $relatedClass,
                    'error' => $e->getMessage()
                ]);
            }
        }
    }

    /**
     * ✅ Fallback cache clear (immediate)
     */
    protected function fallbackCacheClear(Model $model): void
    {
        try {
            $modelClass = get_class($model);
            $tag = class_basename($modelClass);

            // Try to clear cache tags directly
            if (property_exists($modelClass, 'cacheTags')) {
                $tags = $modelClass::$cacheTags ?? [$tag];
                Cache::tags($tags)->flush();

                Log::info('Fallback cache clear executed', [
                    'model' => $modelClass,
                    'tags' => $tags
                ]);
            }

        } catch (\Throwable $e) {
            Log::critical('Fallback cache clear failed', [
                'model' => get_class($model),
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * ✅ Record invalidation metrics
     */
    protected function recordMetric(string $modelClass, string $event): void
    {
        if (!config('cache.observer.track_metrics', false)) {
            return;
        }

        try {
            $key = "cache:invalidations:" . date('Y-m-d');
            $field = class_basename($modelClass) . ":{$event}";

            Cache::increment("{$key}:{$field}");

        } catch (\Throwable $e) {
            // Silent fail for metrics
        }
    }

    /**
     * ✅ Get invalidation statistics
     */
    public static function getStats(string $date = null): array
    {
        $date = $date ?? date('Y-m-d');
        $key = "cache:invalidations:{$date}";

        try {
            $stats = [];
            $keys = Cache::get($key, []);

            foreach ($keys as $field => $count) {
                [$model, $event] = explode(':', $field, 2);

                if (!isset($stats[$model])) {
                    $stats[$model] = [
                        'total' => 0,
                        'by_event' => []
                    ];
                }

                $stats[$model]['total'] += $count;
                $stats[$model]['by_event'][$event] = $count;
            }

            return $stats;

        } catch (\Throwable $e) {
            Log::error('Failed to get cache invalidation stats', [
                'error' => $e->getMessage()
            ]);
            return [];
        }
    }
}

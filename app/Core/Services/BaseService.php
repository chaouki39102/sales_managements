<?php

namespace App\Core\Services;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Core\Exceptions\BusinessRuleException;

/**
 * Enhanced Base Service - حل مشكلة "الخدمة السمينة"
 *
 * **التحسينات الرئيسية:**
 * 1. ✅ تفويض المهام المعقدة إلى Action Classes
 * 2. ✅ فصل العمليات الخارجية (بعد Commit فقط)
 * 3. ✅ تسجيل محسّن (Log Levels مناسبة)
 * 4. ✅ دعم Orchestrators للمنطق المعقد
 *
 * @package App\Core\Services
 */
abstract class BaseService
{
    protected string $model;
    protected string $resourceName;
    protected array $defaultWith = [];
    protected array $showWith = [];

    // === القراءة ===

    public function findById($id, array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge($this->defaultWith, $this->showWith));
        return $this->model::with($relations)->findOrFail($id);
    }

    public function findTrashedById($id): Model
    {
        if (!method_exists($this->model, 'withTrashed')) {
            throw new BusinessRuleException('هذا المورد لا يدعم الحذف المؤقت', 400);
        }
        return $this->model::onlyTrashed()->findOrFail($id);
    }

    // === الإنشاء ===

    /**
     * إنشاء عنصر جديد
     * ✅ محسّن: فصل واضح بين داخل/خارج Transaction
     */
    public function create(array $data, Request $request = null): Model
    {
        // 1. معالجة ما قبل Transaction (تحضير البيانات فقط)
        $data = $this->beforeCreate($data, $request);

        // 2. Transaction (عمليات DB فقط)
        $item = DB::transaction(function () use ($data, $request) {
            $item = $this->model::create($data);

            // ✅ داخل Transaction: DB operations فقط
            $this->afterCreate($item, $data, $request);

            $item = $this->loadDefaultRelations($item);
            return $item;
        });

        // 3. ما بعد Transaction (العمليات الخارجية)
        $this->performPostCommitOperations($item, $data, $request, 'create');

        return $item;
    }

    // === التحديث ===

    public function update(Model $item, array $data, Request $request = null): Model
    {
        // 1. التحقق من قواعد العمل (خارج Transaction)
        $this->beforeUpdate($item, $data, $request);

        // 2. Transaction (DB operations فقط)
        $item = DB::transaction(function () use ($item, $data, $request) {
            $data = $this->prepareDataForUpdate($item, $data, $request);
            $item->update($data);

            $this->afterUpdate($item, $data, $request);

            return $item->fresh();
        });

        // 3. ما بعد Transaction
        $this->performPostCommitOperations($item, $data, $request, 'update');

        return $item;
    }

    // === الحذف ===

    public function delete(Model $item): bool
    {
        $this->beforeDelete($item);

        $deleted = DB::transaction(function () use ($item) {
            $deleted = $item->delete();
            $this->afterDelete($item);
            return $deleted;
        });

        $this->performPostCommitOperations($item, [], request(), 'delete');

        return $deleted;
    }

    // === ⭐ الحل الرئيسي: Post-Commit Operations ===

    /**
     * تنفيذ العمليات بعد Commit
     * ✅ هنا فقط: Emails, SMS, External APIs, Events
     *
     * @param Model $item
     * @param array $data
     * @param Request|null $request
     * @param string $operation
     */
    protected function performPostCommitOperations(
        Model $item,
        array $data,
        ?Request $request,
        string $operation
    ): void {
        try {
            // 1. مسح الكاش
            $this->clearCache();

            // 2. تسجيل العملية (Info level - ليس Error)
            $this->logOperation($operation, $item);

            // 3. إطلاق Events
            Event::dispatch("{$this->resourceName}.{$operation}d", $item);

            // 4. استدعاء Hook الخارجي
            match ($operation) {
                'create' => $this->afterCreateCommitted($item, $data, $request),
                'update' => $this->afterUpdateCommitted($item, $data, $request),
                'delete' => $this->afterDeleteCommitted($item),
                default => null,
            };

        } catch (\Throwable $e) {
            // ⚠️ لا نفشل العملية إذا فشلت العمليات الخارجية
            Log::warning("Post-commit operations failed for {$operation}", [
                'resource' => $this->resourceName,
                'id' => $item->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    // === Hooks ===

    /**
     * قبل الإنشاء (خارج Transaction)
     * ✅ فقط: تحضير البيانات، لا DB operations
     */
    protected function beforeCreate(array $data, ?Request $request): array
    {
        return $data;
    }

    /**
     * بعد الإنشاء (داخل Transaction)
     * ⚠️ CRITICAL: DB operations فقط، لا External APIs
     */
    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // No default implementation
    }

    /**
     * بعد Commit الإنشاء (خارج Transaction)
     * ✅ هنا فقط: Emails, SMS, Webhooks, External APIs
     */
    protected function afterCreateCommitted(Model $item, array $data, ?Request $request): void
    {
        // No default implementation
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // No default implementation
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // No default implementation
    }

    protected function afterUpdateCommitted(Model $item, array $data, ?Request $request): void
    {
        // No default implementation
    }

    protected function beforeDelete(Model $item): void
    {
        // No default implementation
    }

    protected function afterDelete(Model $item): void
    {
        // No default implementation
    }

    protected function afterDeleteCommitted(Model $item): void
    {
        // No default implementation
    }

    // === Helper Methods ===

    protected function loadDefaultRelations(Model $item): Model
    {
        if (!empty($this->defaultWith)) {
            $item->load($this->defaultWith);
        }
        return $item;
    }

    protected function clearCache(): void
    {
        Cache::tags(['api', $this->resourceName])->flush();
    }

    /**
     * ✅ محسّن: Info level (ليس Error)
     */
    protected function logOperation(string $operation, Model $item): void
    {
        Log::info("Service operation: {$operation}", [
            'resource' => $this->resourceName,
            'model' => get_class($item),
            'id' => $item->id ?? null,
            'user_id' => auth()->id() ?? null,
        ]);
    }

    // === ⭐ حل "الخدمة السمينة": Action Delegation ===

    /**
     * تفويض إلى Action Class
     *
     * مثال:
     * protected function processComplexLogic($item, $data)
     * {
     *     return $this->delegateToAction(CreateInvoiceItemsAction::class, $item, $data);
     * }
     */
    protected function delegateToAction(string $actionClass, ...$params)
    {
        if (!class_exists($actionClass)) {
            throw new \Exception("Action class {$actionClass} not found");
        }

        $action = app($actionClass);
        return $action->execute(...$params);
    }

    /**
     * تفويض إلى Manager Class
     *
     * مثال:
     * protected function updateStock($item)
     * {
     *     return $this->delegateToManager(StockManager::class, 'decrease', $item);
     * }
     */
    protected function delegateToManager(string $managerClass, string $method, ...$params)
    {
        if (!class_exists($managerClass)) {
            throw new \Exception("Manager class {$managerClass} not found");
        }

        $manager = app($managerClass);

        if (!method_exists($manager, $method)) {
            throw new \Exception("Method {$method} not found in {$managerClass}");
        }

        return $manager->$method(...$params);
    }
}

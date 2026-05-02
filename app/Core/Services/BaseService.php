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
 * Enhanced Base Service - الحل الشامل والنهائي
 *
 * **التحسينات الرئيسية:**
 * 1. ✅ تفويض المهام المعقدة إلى Action Classes
 * 2. ✅ فصل العمليات الخارجية (بعد Commit فقط)
 * 3. ✅ تسجيل محسّن (Log Levels مناسبة)
 * 4. ✅ سلوك افتراضي موحّد لكل خدمات الـ Tenant (منع تغيير company_id، إسناد updated_by)
 * 5. ✅ عمليات Bulk (إنشاء/تحديث/حذف متعدد)
 * 6. ✅ دعم Soft Deletes (استعادة، حذف نهائي)
 * 7. ✅ دوال استعلام مساعدة (findMany, exists, count)
 *
 * @package App\Core\Services
 */
abstract class BaseService
{
    protected string $model;
    protected string $resourceName;
    protected array $defaultWith = [];
    protected array $showWith = [];

    // ═══════════════════════════════════════════════
    // 1. عمليات القراءة الأساسية
    // ═══════════════════════════════════════════════

    public function findById($id, array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge($this->defaultWith, $this->showWith));
        return $this->model::with($relations)->findOrFail($id);
    }

    public function findMany(array $ids, array $with = null): \Illuminate\Database\Eloquent\Collection
    {
        $relations = $with ?? $this->defaultWith;
        return $this->model::with($relations)->whereIn('id', $ids)->get();
    }

    public function findTrashedById($id): Model
    {
        if (!method_exists($this->model, 'withTrashed')) {
            throw new BusinessRuleException('هذا المورد لا يدعم الحذف المؤقت', 400);
        }
        return $this->model::onlyTrashed()->findOrFail($id);
    }

    public function exists($id): bool
    {
        return $this->model::where('id', $id)->exists();
    }

    // ═══════════════════════════════════════════════
    // 2. عمليات الإنشاء (Create / Bulk Create)
    // ═══════════════════════════════════════════════

    public function create(array $data, Request $request = null): Model
    {
        $data = $this->beforeCreate($data, $request);

        $item = DB::transaction(function () use ($data, $request) {
            $item = $this->model::create($data);
            $this->afterCreate($item, $data, $request);
            return $this->loadDefaultRelations($item);
        });

        $this->performPostCommitOperations($item, $data, $request, 'create');
        return $item;
    }

    /**
     * إنشاء مجموعة من السجلات دفعة واحدة.
     * يفيد في استيراد البيانات مثلاً.
     */
    public function bulkCreate(array $records, Request $request = null): \Illuminate\Database\Eloquent\Collection
    {
        $created = new \Illuminate\Database\Eloquent\Collection();

        DB::transaction(function () use ($records, $request, &$created) {
            foreach ($records as $data) {
                $data = $this->beforeCreate($data, $request);
                $item = $this->model::create($data);
                $this->afterCreate($item, $data, $request);
                $created->push($item);
                $this->performPostCommitOperations($item, $data, $request, 'create');
            }
        });

        return $created;
    }

    // ═══════════════════════════════════════════════
    // 3. عمليات التحديث (Update / Bulk Update)
    // ═══════════════════════════════════════════════

    public function update(Model $item, array $data, Request $request = null): Model
    {
        $this->beforeUpdate($item, $data, $request);

        $item = DB::transaction(function () use ($item, $data, $request) {
            $data = $this->prepareDataForUpdate($item, $data, $request);
            $item->update($data);
            $this->afterUpdate($item, $data, $request);
            return $item->fresh();
        });

        $this->performPostCommitOperations($item, $data, $request, 'update');
        return $item;
    }

    /**
     * تحديث مجموعة من السجلات بنفس البيانات.
     * مثال: تعطيل مجموعة منتجات.
     */
    public function bulkUpdate(array $ids, array $data, Request $request = null): int
    {
        $count = 0;
        DB::transaction(function () use ($ids, $data, $request, &$count) {
            $items = $this->findMany($ids);
            foreach ($items as $item) {
                $this->beforeUpdate($item, $data, $request);
                $prepared = $this->prepareDataForUpdate($item, $data, $request);
                $item->update($prepared);
                $this->afterUpdate($item, $data, $request);
                $this->performPostCommitOperations($item, $data, $request, 'update');
                $count++;
            }
        });
        return $count;
    }

    // ═══════════════════════════════════════════════
    // 4. عمليات الحذف (Delete / Bulk Delete / Force Delete / Restore)
    // ═══════════════════════════════════════════════

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

    /**
     * حذف مجموعة من السجلات.
     */
    public function bulkDelete(array $ids): int
    {
        $count = 0;
        DB::transaction(function () use ($ids, &$count) {
            $items = $this->findMany($ids);
            foreach ($items as $item) {
                $this->beforeDelete($item);
                $item->delete();
                $this->afterDelete($item);
                $this->performPostCommitOperations($item, [], request(), 'delete');
                $count++;
            }
        });
        return $count;
    }

    /**
     * حذف نهائي (تجاوز SoftDelete).
     */
    public function forceDelete(Model $item): bool
    {
        $this->beforeDelete($item);
        $deleted = DB::transaction(function () use ($item) {
            if (method_exists($item, 'forceDelete')) {
                $deleted = $item->forceDelete();
            } else {
                $deleted = $item->delete();
            }
            $this->afterDelete($item);
            return $deleted;
        });
        $this->performPostCommitOperations($item, [], request(), 'delete');
        return $deleted;
    }

    /**
     * استعادة عنصر محذوف (SoftDelete).
     */
    public function restore(Model $item): Model
    {
        if (!method_exists($item, 'restore')) {
            throw new BusinessRuleException('هذا المورد لا يدعم الاستعادة.', 400);
        }

        DB::transaction(function () use ($item) {
            $item->restore();
            $this->afterRestore($item);
        });

        $this->performPostCommitOperations($item, [], request(), 'restore');
        return $item->fresh();
    }

    // ═══════════════════════════════════════════════
    // 5. Post-Commit Operations (للعمليات الخارجية)
    // ═══════════════════════════════════════════════

    protected function performPostCommitOperations(
        Model $item,
        array $data,
        ?Request $request,
        string $operation
    ): void {
        try {
            $this->clearCache();
            $this->logOperation($operation, $item);
            Event::dispatch("{$this->resourceName}.{$operation}d", $item);

            match ($operation) {
                'create'  => $this->afterCreateCommitted($item, $data, $request),
                'update'  => $this->afterUpdateCommitted($item, $data, $request),
                'delete'  => $this->afterDeleteCommitted($item),
                'restore' => $this->afterRestoreCommitted($item),
                default   => null,
            };
        } catch (\Throwable $e) {
            Log::warning("Post-commit operations failed for {$operation}", [
                'resource' => $this->resourceName,
                'id' => $item->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    // ═══════════════════════════════════════════════
    // 6. Hooks (قابلة للتجاوز)
    // ═══════════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void {}

    protected function afterCreateCommitted(Model $item, array $data, ?Request $request): void {}

    /**
     * ✅ سلوك افتراضي موحّد لجميع خدمات الـ Tenant
     */
    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // 1. منع تغيير company_id
        if ($this->modelHasColumn('company_id') && isset($data['company_id']) && (int)$data['company_id'] !== (int)$item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالسجل.', 422);
        }

        // 2. إسناد updated_by تلقائياً
        if ($this->modelHasColumn('updated_by') && auth()->check()) {
            $data['updated_by'] = auth()->id();
        }
    }

    /**
     * ✅ إزالة company_id من بيانات التحديث
     */
    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        if ($this->modelHasColumn('company_id')) {
            unset($data['company_id']);
        }
        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void {}

    protected function afterUpdateCommitted(Model $item, array $data, ?Request $request): void {}

    protected function beforeDelete(Model $item): void {}

    protected function afterDelete(Model $item): void {}

    protected function afterDeleteCommitted(Model $item): void {}

    protected function afterRestore(Model $item): void {}

    protected function afterRestoreCommitted(Model $item): void {}

    // ═══════════════════════════════════════════════
    // 7. دوال مساعدة
    // ═══════════════════════════════════════════════

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

    protected function logOperation(string $operation, Model $item): void
    {
        Log::info("Service operation: {$operation}", [
            'resource' => $this->resourceName,
            'model' => get_class($item),
            'id' => $item->id ?? null,
            'user_id' => auth()->id() ?? null,
        ]);
    }

    protected function modelHasColumn(string $column): bool
    {
        static $columnsCache = [];
        if (!isset($columnsCache[$this->model])) {
            $columnsCache[$this->model] = \Illuminate\Support\Facades\Schema::getColumnListing((new $this->model)->getTable());
        }
        return in_array($column, $columnsCache[$this->model]);
    }

    // ═══════════════════════════════════════════════
    // 8. تفويض العمليات المعقدة
    // ═══════════════════════════════════════════════

    protected function delegateToAction(string $actionClass, ...$params)
    {
        if (!class_exists($actionClass)) {
            throw new \Exception("Action class {$actionClass} not found");
        }
        return app($actionClass)->execute(...$params);
    }

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

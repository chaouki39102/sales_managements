<?php

namespace App\Core\Services;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Core\Exceptions\BusinessRuleException;

abstract class BaseService
{
    protected string $model;
    protected array $defaultWith = [];
    protected array $showWith = [];

    /**
     * اسم المورد (إجباري – يُستخدم في الكاش، الأحداث، والسجلات)
     */
    abstract protected function getResourceName(): string;

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
        return $this->model::with($with ?? $this->defaultWith)
            ->whereIn('id', $ids)
            ->get();
    }

    public function findTrashedById($id): Model
    {
        if (!method_exists($this->model, 'withTrashed')) {
            throw new BusinessRuleException('هذا المورد لا يدعم الحذف المؤقت.', 400);
        }
        return $this->model::onlyTrashed()->findOrFail($id);
    }

    public function exists($id): bool
    {
        return $this->model::where('id', $id)->exists();
    }

    public function count(): int
    {
        return $this->model::count();
    }

    // ═══════════════════════════════════════════════
    // 2. عمليات الإنشاء
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

    public function bulkCreate(array $records, Request $request = null): \Illuminate\Database\Eloquent\Collection
    {
        $created = new \Illuminate\Database\Eloquent\Collection();

        DB::transaction(function () use ($records, $request, &$created) {
            foreach ($records as $data) {
                $data = $this->beforeCreate($data, $request);
                $item = $this->model::create($data);
                $this->afterCreate($item, $data, $request);
                $created->push($this->loadDefaultRelations($item));
            }
        });

        foreach ($created as $item) {
            $this->performPostCommitOperations($item, [], $request, 'create');
        }

        return $created;
    }

    // ═══════════════════════════════════════════════
    // 3. عمليات التحديث
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

    public function bulkUpdate(array $ids, array $data, Request $request = null): int
    {
        $count   = 0;
        $updated = new \Illuminate\Database\Eloquent\Collection();

        DB::transaction(function () use ($ids, $data, $request, &$count, &$updated) {
            $items = $this->findMany($ids);
            foreach ($items as $item) {
                $this->beforeUpdate($item, $data, $request);
                $prepared = $this->prepareDataForUpdate($item, $data, $request);
                $item->update($prepared);
                $this->afterUpdate($item, $data, $request);
                $updated->push($item->fresh());
                $count++;
            }
        });

        foreach ($updated as $item) {
            $this->performPostCommitOperations($item, $data, $request, 'update');
        }

        return $count;
    }

    // ═══════════════════════════════════════════════
    // 4. عمليات الحذف والاستعادة
    // ═══════════════════════════════════════════════

    public function delete(Model $item, Request $request = null): bool
    {
        $this->beforeDelete($item);

        $deleted = DB::transaction(function () use ($item) {
            $deleted = $item->delete();
            $this->afterDelete($item);
            return $deleted;
        });

        $this->performPostCommitOperations($item, [], $request, 'delete');
        return $deleted;
    }

    public function bulkDelete(array $ids, Request $request = null): int
    {
        $count   = 0;
        $deleted = new \Illuminate\Database\Eloquent\Collection();

        DB::transaction(function () use ($ids, &$count, &$deleted) {
            $items = $this->findMany($ids);
            foreach ($items as $item) {
                $this->beforeDelete($item);
                $item->delete();
                $this->afterDelete($item);
                $deleted->push($item);
                $count++;
            }
        });

        foreach ($deleted as $item) {
            $this->performPostCommitOperations($item, [], $request, 'delete');
        }

        return $count;
    }

    public function forceDelete(Model $item, Request $request = null): bool
    {
        $this->beforeDelete($item);

        $deleted = DB::transaction(function () use ($item) {
            $deleted = method_exists($item, 'forceDelete')
                ? $item->forceDelete()
                : $item->delete();
            $this->afterDelete($item);
            return $deleted;
        });

        $this->performPostCommitOperations($item, [], $request, 'delete');
        return $deleted;
    }

    public function restore(Model $item, Request $request = null): Model
    {
        if (!method_exists($item, 'restore')) {
            throw new BusinessRuleException('هذا المورد لا يدعم الاستعادة.', 400);
        }

        DB::transaction(function () use ($item) {
            $item->restore();
            $this->afterRestore($item);
        });

        $this->performPostCommitOperations($item, [], $request, 'restore');
        return $item->fresh();
    }

    // ═══════════════════════════════════════════════
    // 5. Post-Commit Operations
    // ═══════════════════════════════════════════════

    protected function performPostCommitOperations(
        Model    $item,
        array    $data,
        ?Request $request,
        string   $operation
    ): void {
        try {
            $this->clearCache();
            $this->logOperation($operation, $item);
            Event::dispatch("{$this->getResourceName()}.{$operation}d", $item);

            match ($operation) {
                'create'  => $this->afterCreateCommitted($item, $data, $request),
                'update'  => $this->afterUpdateCommitted($item, $data, $request),
                'delete'  => $this->afterDeleteCommitted($item),
                'restore' => $this->afterRestoreCommitted($item),
                default   => null,
            };
        } catch (\Throwable $e) {
            Log::warning("Post-commit operations failed for [{$operation}]", [
                'resource' => $this->getResourceName(),
                'id'       => $item->id,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ═══════════════════════════════════════════════
    // 6. Hooks (قابلة للتجاوز في الـ subclasses)
    // ═══════════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array { return $data; }
    protected function afterCreate(Model $item, array $data, ?Request $request): void {}
    protected function afterCreateCommitted(Model $item, array $data, ?Request $request): void {}

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        if ($this->modelHasColumn('company_id') &&
            isset($data['company_id']) &&
            (int) $data['company_id'] !== (int) $item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالسجل.', 422);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        if ($this->modelHasColumn('company_id')) {
            unset($data['company_id']);
        }

        if ($this->modelHasColumn('updated_by') && auth()->check()) {
            $data['updated_by'] = auth()->id();
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
        if (method_exists(Cache::getStore(), 'tags')) {
            Cache::tags(['api', $this->getResourceName()])->flush();
            return;
        }

        foreach ($this->getCacheKeys() as $key) {
            Cache::forget($key);
        }
    }

    protected function getCacheKeys(): array
    {
        $r = $this->getResourceName();
        return ["{$r}_list", "{$r}_all", "{$r}_count"];
    }

    protected function logOperation(string $operation, Model $item): void
    {
        Log::info("Service [{$operation}] on [{$this->getResourceName()}]", [
            'resource' => $this->getResourceName(),
            'model'    => get_class($item),
            'id'       => $item->id ?? null,
            'user_id'  => auth()->id() ?? null,
        ]);
    }

    protected function modelHasColumn(string $column): bool
    {
        static $columnsCache = [];

        if (!isset($columnsCache[$this->model])) {
            $columnsCache[$this->model] = \Illuminate\Support\Facades\Schema::getColumnListing(
                (new $this->model)->getTable()
            );
        }

        return in_array($column, $columnsCache[$this->model]);
    }
}

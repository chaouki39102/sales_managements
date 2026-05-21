<?php

namespace App\Core\Services;

use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use App\Core\Exceptions\BusinessRuleException;

abstract class BaseService
{
    protected string $model;
    protected array $defaultWith = [];
    protected array $showWith    = [];

    abstract protected function getResourceName(): string;

    // ═══════════════════════════════════════════════════════════════
    // 1. القراءة
    // ═══════════════════════════════════════════════════════════════

    public function findById($id, array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge($this->defaultWith, $this->showWith));

        $query = $this->model::with($relations);
        $this->applyScopeToQuery($query);

        return $query->findOrFail($id);
    }

    public function findMany(array $ids, array $with = null): Collection
    {
        $query = $this->model::with($with ?? $this->defaultWith)
            ->whereIn('id', $ids);

        $this->applyScopeToQuery($query);

        return $query->get();
    }

    /**
     * الطبقة 6 — Soft Deletes آمن: يضيف company_id فلتراً يدوياً
     * لأن onlyTrashed() يتجاوز GlobalScope
     */
    public function findTrashedById($id): Model
    {
        if (!method_exists($this->model, 'withTrashed')) {
            throw new BusinessRuleException('هذا المورد لا يدعم الحذف المؤقت.', 400);
        }

        $query = $this->model::onlyTrashed();

        // ✅ أضف company_id يدوياً — onlyTrashed يتجاوز CompanyScope
        if ($this->modelHasColumn('company_id')) {
            try {
                $companyId = app(\App\Services\CompanyContextService::class)->get();
                if ($companyId) {
                    $query->where('company_id', $companyId);
                }
            } catch (\RuntimeException $e) {
                Log::debug('CompanyContext unavailable in findTrashedById', ['model' => $this->model]);
            }
        }

        return $query->findOrFail($id);
    }

    public function exists($id): bool
    {
        return $this->model::where('id', $id)->exists();
    }

    public function count(): int
    {
        return $this->model::count();
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. الإنشاء
    // ═══════════════════════════════════════════════════════════════

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

    public function bulkCreate(array $records, Request $request = null): Collection
    {
        $created = new Collection();

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

    // ═══════════════════════════════════════════════════════════════
    // 3. التحديث
    // ═══════════════════════════════════════════════════════════════

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
        $updated = new Collection();

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

    // ═══════════════════════════════════════════════════════════════
    // 4. الحذف والاستعادة
    // ═══════════════════════════════════════════════════════════════

    public function delete(Model $item, Request $request = null): bool
    {
        $this->beforeDelete($item);

        $deleted = DB::transaction(function () use ($item) {
            $result = $item->delete();
            $this->afterDelete($item);
            return $result;
        });

        $this->performPostCommitOperations($item, [], $request, 'delete');
        return $deleted;
    }

    public function bulkDelete(array $ids, Request $request = null): int
    {
        $count   = 0;
        $deleted = new Collection();

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
            $result = method_exists($item, 'forceDelete')
                ? $item->forceDelete()
                : $item->delete();
            $this->afterDelete($item);
            return $result;
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

    // ═══════════════════════════════════════════════════════════════
    // 5. Post-Commit
    // ═══════════════════════════════════════════════════════════════

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
            Log::warning("Post-commit failed [{$operation}]", [
                'resource' => $this->getResourceName(),
                'id'       => $item->id ?? null,
                'error'    => $e->getMessage(),
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // 6. Hooks
    // ═══════════════════════════════════════════════════════════════

    /**
     * الطبقة 4 — Mass Assignment Protection
     *
     * يحذف:
     * - company_id  → يعيّنه HasCompany تلقائياً، المهاجم لا يحدده
     * - created_by  → يعيّنه النظام، ليس المستخدم
     * - updated_by  → يعيّنه prepareDataForUpdate
     * - deleted_by  → يعيّنه نظام الحذف
     *
     * ويفلتر الحقول غير الموجودة في الجدول
     */
    protected function beforeCreate(array $data, ?Request $request): array
    {
        try {
            $columns = Schema::getColumnListing((new $this->model)->getTable());
            $data    = array_intersect_key($data, array_flip($columns));
        } catch (\Throwable $e) {
            // إذا فشل Schema نبقى مع البيانات كما هي
        }

        // ✅ الطبقة 4: حقول لا يجب أن تأتي من الـ request أبداً
        unset($data['company_id']);   // HasCompany يتولاه
        unset($data['created_by']);   // النظام يعيّنه
        unset($data['updated_by']);   // ليس عند الإنشاء
        unset($data['deleted_by']);   // ليس عند الإنشاء

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void {}
    protected function afterCreateCommitted(Model $item, array $data, ?Request $request): void {}

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        if (
            $this->modelHasColumn('company_id') &&
            isset($data['company_id']) &&
            (int) $data['company_id'] !== (int) $item->company_id
        ) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالسجل.', 422);
        }
    }

    /**
     * الطبقة 4 — Mass Assignment Protection عند التحديث
     */
    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // ✅ الطبقة 4: حقول محمية لا تُحدَّث من الـ request
        unset($data['company_id']);  // لا يتغير أبداً
        unset($data['created_by']); // لا يتغير أبداً
        unset($data['deleted_by']); // يديره نظام الحذف فقط

        // updated_by يعيّنه النظام تلقائياً
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

    // ═══════════════════════════════════════════════════════════════
    // 7. دوال مساعدة
    // ═══════════════════════════════════════════════════════════════

    protected function loadDefaultRelations(Model $item): Model
    {
        if (!empty($this->defaultWith)) {
            $item->load($this->defaultWith);
        }
        return $item;
    }

    /**
     * الطبقة 7 — Cache Keys per-Company
     *
     * المشكلة: إذا كان الـ key هو "brands_list" فقط →
     * شركة A ترى cache شركة B.
     *
     * الحل: نضيف company_id في الـ key لعزل كل شركة
     */
    protected function clearCache(): void
    {
        if (method_exists(Cache::getStore(), 'tags')) {
            $companyTag = $this->getCompanyCacheTag();
            Cache::tags(['api', $this->getResourceName(), $companyTag])->flush();
            return;
        }

        foreach ($this->getCacheKeys() as $key) {
            Cache::forget($key);
        }
    }

    /**
     * الطبقة 7 — Cache Keys تشمل company_id
     */
    protected function getCacheKeys(): array
    {
        $r = $this->getResourceName();
        $c = $this->getCurrentCompanyId() ?? 'global';

        return [
            "{$r}:{$c}:list",
            "{$r}:{$c}:all",
            "{$r}:{$c}:count",
        ];
    }

    /**
     * الطبقة 7 — Cache Tag للشركة الحالية
     */
    protected function getCompanyCacheTag(): string
    {
        $c = $this->getCurrentCompanyId() ?? 'global';
        return "company:{$c}";
    }

    /**
     * جلب company_id الحالي بأمان
     */
    protected function getCurrentCompanyId(): ?int
    {
        try {
            return app(\App\Services\CompanyContextService::class)->get();
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function logOperation(string $operation, Model $item, array $extra = []): void
    {
        $data = [
            'operation'  => $operation,
            'resource'   => $this->getResourceName(),
            'model'      => get_class($item),
            'model_id'   => $item->id ?? null,
            'user_id'    => auth()->id() ?? null,
            'company_id' => $item->company_id ?? null,
            'timestamp'  => now()->toIso8601String(),
            ...$extra,
        ];

        try {
            Log::channel('operations')->info("Service: {$operation}", $data);
        } catch (\Throwable $e) {
            Log::info("Service [{$operation}] on [{$this->getResourceName()}]", $data);
        }
    }

    protected function applyScopeToQuery(Builder $query): Builder
    {
        if (!$this->modelHasColumn('company_id')) {
            return $query;
        }

        try {
            $context = app(\App\Services\CompanyContextService::class);
            if ($context->has()) {
                $query->where('company_id', $context->get());
            }
        } catch (\RuntimeException $e) {
            Log::debug('CompanyContext unavailable', ['model' => $this->model]);
        }

        return $query;
    }

    protected function modelHasColumn(string $column): bool
    {
        static $cache = [];

        $table = (new $this->model)->getTable();

        if (!isset($cache[$table])) {
            try {
                $cache[$table] = Schema::getColumnListing($table);
            } catch (\Throwable $e) {
                return false;
            }
        }

        return in_array($column, $cache[$table], true);
    }
}

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

/**
 * ════════════════════════════════════════════════════════════════════
 * BaseService — محسّن مع دعم UpsertMany للـ Batch Operations
 *
 * الإضافات الجديدة:
 * - upsertMany()     ← تحديث/إنشاء جماعي من dictionary
 * - updateMany()     ← تحديث جماعي لـ IDs متعددة
 * - newQuery()       ← builder مباشر للـ advanced queries
 * ════════════════════════════════════════════════════════════════════
 */
abstract class BaseService
{
    protected string $model;
    protected array $defaultWith = [];
    protected array $showWith    = [];

    abstract protected function getResourceName(): string;

    // ═══════════════════════════════════════════════════════════════
    // 1. القراءة
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ FIXED: findById الآن يدعم soft deletes بشكل صحيح
     */
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
        \Log::debug('[BaseService.create] BEFORE beforeCreate', [
            'data_keys' => array_keys($data),
            'doc_num' => $data['document_number'] ?? 'NOT_SET',
            'company_id' => $data['company_id'] ?? 'NOT_SET',
            'input' => $request?->all(),
        ]);

        $data = $this->beforeCreate($data, $request);

        \Log::debug('[BaseService.create] AFTER beforeCreate', [
            'data_keys' => array_keys($data),
            'doc_num' => $data['document_number'] ?? 'NOT_SET',
            'company_id' => $data['company_id'] ?? 'NOT_SET',
        ]);

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
            return $this->loadDefaultRelations($item);
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
    // 3.1. ✅ UpsertMany — جديد! لدعم Batch Dictionary Updates
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ Upsert متعدد من dictionary
     *
     * استخدام:
     *   upsertMany(
     *     ['setting_key_1' => 'value1', 'setting_key_2' => 'value2'],
     *     ['key'],  // ← البحث بـ 'key' عن السجل الموجود
     *     $request
     *   )
     *
     * آلية العمل:
     * 1. تحويل dictionary إلى مصفوفة سجلات
     * 2. أضف company_id تلقائياً (multi-tenancy)
     * 3. لكل سجل: find or create + update
     * 4. تشغيل hooks و cache clear
     *
     * مثالي لـ Settings, Configurations, وأي batch data
     */
    public function upsertMany(
        array $recordsAsDict,
        array $uniqueBy = ['id'],
        ?Request $request = null
    ): Collection
    {
        // الخطوة 1: تحويل dictionary → records
        $records = [];
        foreach ($recordsAsDict as $key => $value) {
            $record = ['key' => $key, 'value' => $value];

            // ✅ Tenancy: أضف company_id تلقائياً
            if ($this->modelHasColumn('company_id')) {
                $companyId = $this->getCurrentCompanyId();
                if ($companyId) {
                    $record['company_id'] = $companyId;
                }
            }

            $records[] = $record;
        }

        $upserted = new Collection();

        // الخطوة 2: Upsert كل سجل في transaction
        DB::transaction(function () use ($records, $uniqueBy, $request, &$upserted) {
            foreach ($records as $data) {
                // Prepare
                $data = $this->beforeCreate($data, $request);

                // Build WHERE clause من $uniqueBy
                $whereClause = array_intersect_key($data, array_flip($uniqueBy));

                // Upsert
                $item = $this->model::updateOrCreate($whereClause, $data);

                // Hooks
                $this->afterCreate($item, $data, $request);
                $upserted->push($this->loadDefaultRelations($item));
            }
        });

        // الخطوة 3: Post-commit operations
        foreach ($upserted as $item) {
            $this->performPostCommitOperations($item, [], $request, 'create');
        }

        return $upserted;
    }

    // ═══════════════════════════════════════════════════════════════
    // 3.2. ✅ UpdateMany — جديد! تحديث جماعي بـ IDs متعددة
    // ═══════════════════════════════════════════════════════════════

    /**
     * ✅ تحديث متعدد لـ ID list نفس البيانات
     *
     * استخدام:
     *   updateMany([1, 2, 3], ['status' => 'active'], $request)
     */
    public function updateMany(
        array $ids,
        array $data,
        ?Request $request = null
    ): int
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

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // ✅ الطبقة 4: حقول محمية لا تُحدَّث من الـ request
        unset($data['company_id']);  // لا يتغير أبداً
        unset($data['created_by']); // لا يتغير أبداً
        unset($data['deleted_by']); // يديره نظام الحذف فقط

        // updated_by يعيّنه النظام تلقائياً — فقط للمستخدمين الفعليين (users).
        // سياقات مثل بوابة الزبائن تُصادِق PortalUser ولا يجب كتابة معرّفه في
        // عمود users FK.
        $actor = auth()->user();
        if ($this->modelHasColumn('updated_by') && $actor instanceof \App\Models\User) {
            $data['updated_by'] = $actor->id;
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

    // ✅ جديد! Query builder مباشر
    public function newQuery(): Builder
    {
        $query = $this->model::query();
        $this->applyScopeToQuery($query);
        return $query;
    }

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

    protected function getCompanyCacheTag(): string
    {
        $c = $this->getCurrentCompanyId() ?? 'global';
        return "company:{$c}";
    }

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

    /**
     * ✅ FIXED: applyScopeToQuery الآن آمن للـ null queries
     */
    protected function applyScopeToQuery(Builder $query): Builder
    {
        if ($query === null) {
            return $query;
        }

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

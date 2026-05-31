<?php

namespace App\Services;

use App\Models\Role;
use App\Core\Services\BaseService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Spatie\Permission\PermissionRegistrar;

class RoleService extends BaseService
{
    protected string $model        = Role::class;
    protected string $resourceName = 'role';

    // ✅ permissions دائماً في defaultWith — لأن كل role يحتاجها
    protected array $defaultWith  = ['permissions'];

    protected function getResourceName(): string
    {
        return 'role';
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ الإصلاح الجذري للتكرار:
    //
    // المشكلة: SpatieRole لا يرث HasCompany trait، لذا
    // BaseService::applyScopeToQuery() لا تُضيف WHERE company_id،
    // فتُرجع أدوار جميع الشركات (79 دور بدل 6).
    //
    // الحل: إضافة WHERE company_id يدوياً في modifyQuery،
    // مع استثناء super-admin (company_id IS NULL).
    //
    // المنطق:
    //   - أدوار tenant  → WHERE company_id = $currentCompanyId
    //   - super-admin   → WHERE company_id IS NULL  (عالمي)
    //   - المستخدم العادي يرى أدوار شركته فقط
    // ══════════════════════════════════════════════════════════════

    /**
     * ✅ getListConfig — يستخدم modifyQuery (الخاص بـ HasApiList)
     * وليس query_callback (الخاص بـ ApiListService)
     *
     * الفرق الحرج:
     * - BaseApiController → HasApiList → يقرأ 'modifyQuery'
     * - ApiListService::getList() → يقرأ 'query_callback'
     *
     * في RoleController، نستدعي getListData() → HasApiList
     * → يبحث عن 'modifyQuery'
     */
    protected function getListConfig(): array
    {
        $companyId = $this->getCurrentCompanyId();

        return [
            'searchable'      => Role::$searchableFields,
            'filterable'      => Role::$filterable,
            'sortable'        => Role::$sortable,
            'defaultSort'     => Role::$defaultSort,
            'defaultWith'     => ['permissions'],
            'allowedIncludes' => Role::$allowedIncludes,

            // ✅ استخدم modifyQuery (الخاص بـ HasApiList)
            // و return QueryBuilder دائماً!
            'modifyQuery' => function ($qb, $request) use ($companyId) {
                if ($companyId) {
                    // أدوار الشركة الحالية فقط
                    $qb->where('company_id', $companyId);
                }
                // إذا كان $companyId = null، سيُرجع كل شيء
                // (لكن SetCompanyContext يضمن وجود company_id دائماً)

                return $qb;  // ✅ يجب أن تُرجع QueryBuilder!
            },
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // Hooks
    // ══════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        // ✅ guard_name ضروري لـ Spatie — لا يحذفه BaseService
        // لكن company_id يحذفه BaseService في beforeCreate
        // نحتفظ به هنا قبل استدعاء parent
        $companyId = $data['company_id'] ?? $this->getCurrentCompanyId();

        // BaseService::beforeCreate يحذف company_id لأنه
        // يعتمد على HasCompany Scope — لكن Spatie Role
        // يحتاج company_id صريحاً في $fillable
        $data = parent::beforeCreate($data, $request);

        // ✅ نُعيد company_id بعد parent
        if ($companyId) {
            $data['company_id'] = $companyId;
        }

        $data['guard_name'] ??= 'web';

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        if (!empty($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }
        $item->load('permissions');
        $this->forgetSpatieCache();
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ override update() لمعالجة permission_ids
    // BaseService::prepareDataForUpdate يحذف company_id و permission_ids
    // نستخرج permission_ids قبل parent::update ثم نطبقها بعده
    // ══════════════════════════════════════════════════════════════

    public function update(Model $item, array $data, ?Request $request = null): Model
    {
        // استخرج permission_ids قبل أن يحذفها prepareDataForUpdate
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null;

        $item = parent::update($item, $data, $request);

        if ($permissionIds !== null) {
            $item->syncPermissions($permissionIds);
            $this->forgetSpatieCache();
        }

        return $item->fresh(['permissions']);
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        // ✅ أزل permission_ids — تُعالج في update() بعد parent
        unset($data['permission_ids']);
        return parent::prepareDataForUpdate($item, $data, $request);
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        $item->load('permissions');
    }

    protected function afterDelete(Model $item): void
    {
        $this->forgetSpatieCache();
    }

    // ══════════════════════════════════════════════════════════════
    // Helpers
    // ══════════════════════════════════════════════════════════════

    private function forgetSpatieCache(): void
    {
        try {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable $e) {
            Log::warning('forgetCachedPermissions failed', ['error' => $e->getMessage()]);
        }
    }
}

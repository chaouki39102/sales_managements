<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class RoleService extends \App\Core\Services\BaseService
{
    protected string $model        = Role::class;
    protected string $resourceName = 'role';
    protected array  $defaultWith  = ['permissions'];

    protected function getResourceName(): string
    {
        return 'role';
    }

    // ═══════════════════════════════════════════
    // تجاوز update() لحل مشكلة permission_ids
    // ═══════════════════════════════════════════
    // BaseService::update() يحذف permission_ids في prepareDataForUpdate
    // ثم يمرر $data بدونها لـ afterUpdate.
    // الحل: نستخرج permission_ids قبل parent::update() ونطبقها بعده.

    public function update(Model $item, array $data, Request $request = null): Model
    {
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null;

        $item = parent::update($item, $data, $request);

        if ($permissionIds !== null) {
            $item->syncPermissions($permissionIds);
        }

        return $item->fresh($this->defaultWith);
    }

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data['guard_name'] ??= 'web';
        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }
        $item->load('permissions');
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        unset($data['permission_ids']); // تُعالج في update() المُتجاوَز
        return parent::prepareDataForUpdate($item, $data, $request);
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // permission_ids تُعالج في update() المُتجاوَز — لا شيء هنا
        $item->load('permissions');
    }
}

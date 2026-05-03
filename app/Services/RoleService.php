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

    // ✅ الإصلاح: نخزن permission_ids هنا على الـ Service (PHP property عادية)
    // بدل تخزينها على الـ model كـ attribute، لأن Eloquent يحاول كتابة
    // أي attribute غير معروف في قاعدة البيانات وهو ما سبب الخطأ
    private ?array $pendingPermissionIds = null;

    protected function getResourceName(): string
    {
        return 'role';
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        if (array_key_exists('permission_ids', $data)) {
            // ✅ نخزّنها على الـ Service لا على الـ model
            $this->pendingPermissionIds = $data['permission_ids'] ?? [];
            unset($data['permission_ids']);
        } else {
            $this->pendingPermissionIds = null;
        }

        return parent::prepareDataForUpdate($item, $data, $request);
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        if ($this->pendingPermissionIds !== null) {
            $item->syncPermissions($this->pendingPermissionIds);
            $this->pendingPermissionIds = null; // تنظيف بعد الاستخدام
        }

        $item->load('permissions');
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
            $item->syncPermissions($data['permission_ids']);
        }
        $item->load('permissions');
    }

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $data['guard_name'] ??= 'web';
        return $data;
    }
}

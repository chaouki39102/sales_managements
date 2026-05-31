<?php

namespace App\Services;

use App\Models\Permission;
use App\Core\Services\BaseService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

class PermissionService extends BaseService
{
    protected string $model        = Permission::class;
    protected string $resourceName = 'permission';
    protected array  $defaultWith  = [];

    protected function getResourceName(): string
    {
        return 'permission';
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ الإصلاح الجذري للصلاحيات الفارغة:
    //
    // المشكلة: الصلاحيات مخزنة بـ company_id = NULL (عالمية).
    // BaseService::applyScopeToQuery() يُضيف WHERE company_id = X
    // فتُرجع total: 0 لأنه لا توجد صلاحيات بـ company_id محدد.
    //
    // الحل: تجاوز الـ scope بـ modifyQuery يُلغي أي company_id filter
    // ويطلب الصلاحيات العالمية (company_id IS NULL) فقط.
    //
    // هذا صحيح معمارياً:
    //   - الصلاحيات GLOBAL دائماً → company_id = null
    //   - الأدوار TENANT → company_id = شركة
    //   - كل شركة تربط أدوارها بنفس مجموعة الصلاحيات العالمية
    // ══════════════════════════════════════════════════════════════

    protected function getListConfig(): array
    {
        return [
            'searchable'     => Permission::$searchableFields,
            'filterable'     => Permission::$filterable,
            'sortable'       => Permission::$sortable,
            'defaultSort'    => Permission::$defaultSort,
            'defaultWith'    => [],
            'allowedIncludes'=> Permission::$allowedIncludes,
            'cache_tags'     => ['permissions'],
            'modifyQuery'    => function ($query) {
                // ✅ الصلاحيات عالمية دائماً (company_id IS NULL)
                // نُعيد تعريف الـ scope يدوياً بدل ما يطبقه BaseService خطأً
                $query->whereNull('company_id');
            },
        ];
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ getByGroup — تجميع الصلاحيات حسب المجموعة
    //
    // يُرجع: Collection<string, Collection<Permission>>
    // المفتاح = اسم المجموعة, القيمة = صلاحيات المجموعة
    // ══════════════════════════════════════════════════════════════

    public function getByGroup(?string $group = null): Collection|array
    {
        $query = $this->model::query()
            ->whereNull('company_id')   // ✅ عالمية فقط
            ->orderBy('group')
            ->orderBy('name');

        if ($group) {
            $query->where('group', $group);
            return $query->get();
        }

        // بدون group → نُرجع مجمَّعة
        return $query->get()->groupBy('group');
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ getGrouped — للفرونت إند (grouped array جاهز للعرض)
    // ══════════════════════════════════════════════════════════════

    public function getGrouped(): array
    {
        $grouped = $this->getByGroup();

        if ($grouped instanceof Collection) {
            return $grouped
                ->map(fn($perms) => $perms->values())
                ->toArray();
        }

        return [];
    }
}

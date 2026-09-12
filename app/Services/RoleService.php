<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\BaseService;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
    public function getListConfig(): array
    {
        $companyId = $this->getCurrentCompanyId();

        // الروابط العالمية (company_id IS NULL) — تشمل super-admin — يجب ألا
        // تظهر لمستخدمي الشركات العاديين إطلاقاً (عزل super-admin عن المستأجرين).
        // يُسمح بها فقط للمستخدم الذي يحمل الدور العالمي super-admin فعلاً.
        $isSuperAdmin = $this->currentUserHasFullControl($companyId);

        return [
            'search_fields'          => Role::$searchableFields,
            'filters'                => Role::$filterable,
            'sorts'                  => Role::$sortable,
            'default_sort'           => Role::$defaultSort,
            'default_sort_direction' => Role::$defaultSortDirection,
            'default_includes'       => ['permissions'],
            'relations'              => Role::$allowedIncludes,
            'cache_tags'             => Role::$cacheTags,

            'modifyQuery' => function ($qb, $request) use ($companyId, $isSuperAdmin) {
                if ($companyId) {
                    $qb->where(function ($q) use ($companyId, $isSuperAdmin) {
                        $q->where('company_id', $companyId);

                        // أدوار الشركة الحالية فقط للمستخدمين العاديين.
                        // الروابط العالمية (super-admin …) تُضاف فقط لمن يملك السيطرة الكاملة.
                        if ($isSuperAdmin) {
                            $q->orWhereNull('company_id');
                        }
                    });
                }

                return $qb;
            },
        ];
    }

    /**
     * هل يملك المستخدم الحالي الدور العالمي super-admin؟
     * فقط هكذا تظهر الروابط العالمية (company_id IS NULL) في قائمة الأدوار.
     * مالك الشركة — وإن كان "مالكاً" — ليس super-admin ولا يرى دوره أو صلاحياته.
     */
    protected function currentUserHasFullControl(?int $companyId): bool
    {
        $user = auth()->user();

        if (! $user) {
            return false;
        }

        // فقط المستخدم الذي يحمل الدور العالمي super-admin يرى الروابط العامة
        // (company_id IS NULL). مالك الشركة — وإن كان "مالكاً" — ليس super-admin
        // ولا يجب أن يرى دور super-admin أو صلاحياته إطلاقاً.
        return method_exists($user, 'hasRole') && $user->hasRole('super-admin');
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
            $this->assertCanAssignPermissions($data['permission_ids']);
            $item->syncPermissions($data['permission_ids']);
        }
        $item->load('permissions');
        $this->forgetSpatieCache();
    }

    // ══════════════════════════════════════════════════════════════
    // ✅ override create() — تجاوز Role::create() (static) الخاص بـ Spatie
    //
    // BaseService::create() يستدعي $this->model::create($data) أي
    // Role::create() (static)، الذي يمر عبر
    // PermissionRegistrar::getRole() → findByParam(['name','guard_name'])
    // وهو بحث عالَـمي يتجاهل company_id تماماً — فيرصد دوراً بنفس الاسم
    // لدى شركة أخرى ويرمي Spatie RoleAlreadyExists → HTTP 500 (كان هذا
    // سبب 20a/20b) رغم أن قيد التفرد في قاعدة البيانات مفصول بالشركة.
    //
    // الحل: لا نستخدم البنّاء الثابت الخاص بـ Spatie إطلاقاً — نسجّل عبر
    // new $this->model($data) + save() (fillable يشمل company_id)،
    // ونطبّق نفس حارس التصعيد (409) + تفرد الاسم داخل نفس الشركة (422)
    // قبل أي كتابة.
    // ══════════════════════════════════════════════════════════════

    public function create(array $data, ?Request $request = null): Model
    {
        // استخرج permission_ids قبل أن يحذفها beforeCreate (BaseService)
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null;

        // 1) حارس تصعيد الصلاحيات — قبل أي كتابة (409).
        if ($permissionIds !== null) {
            $this->assertCanAssignPermissions($permissionIds);
        }

        // 2) تفرد اسم الدور داخل نفس الشركة — قبل أي كتابة (422).
        $this->assertUniqueRoleName($data);

        $data = $this->beforeCreate($data, $request);

        $item = DB::transaction(function () use ($data, $permissionIds, $request) {
            // bypass Spatie static create: new + save لا يمر عبر findByParam العالمي
            /** @var Role $item */
            $item = new $this->model($data);
            $item->save();

            if ($permissionIds !== null) {
                $item->syncPermissions($permissionIds);
            }

            $this->afterCreate($item, $data, $request);
            return $this->loadDefaultRelations($item);
        });

        $this->performPostCommitOperations($item, $data, $request, 'create');
        return $item;
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

        // اسم الدور فريد داخل نفس الشركة — باستثناء الدور نفسه (422).
        $this->assertUniqueRoleName($data, $item->id, $item->company_id);

        $item = parent::update($item, $data, $request);

        if ($permissionIds !== null) {
            $this->assertCanAssignPermissions($permissionIds);
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

    /**
     * ═══ تفرد اسم الدور داخل نفس الشركة ═══
     *
     * القاعدة: لا يجوز لدورين في نفس الشركة (نفس guard_name) أن يحملا
     * نفس الاسم. أدوار المؤسسات مفصولة بـ company_id، بينما الأدوار
     * العالمية (super-admin …) ذوو company_id NULL — لذا الفحص يُنفَّذ
     * داخل نطاق company_id فقط، وليس عالمياً.
     *
     * يُستدعى كفحص مسبق قبل أي كتابة في create()/update() لأن مسار
     * الإنشاء لا يمر عبر FormRequest validation (قاعدة LSP في Phase 17 —
     * RegisterRequest rules لا تُنفَّذ إطلاقاً على هذا المسار)، وقاعدة
     * `unique` العالمية في StoreRoleRequest عديمة الفائدة أصلاً.
     */
    protected function assertUniqueRoleName(array $data, ?int $ignoreId = null, ?int $companyId = null): void
    {
        $companyId ??= $data['company_id'] ?? $this->getCurrentCompanyId();
        $name = $data['name'] ?? null;

        if (! $companyId || ! $name) {
            return;
        }

        $exists = Role::query()
            ->where('company_id', $companyId)
            ->where('name', $name)
            ->where('guard_name', $data['guard_name'] ?? 'web')
            ->when($ignoreId, fn ($q) => $q->where('id', '!=', $ignoreId))
            ->exists();

        if ($exists) {
            throw new BusinessRuleException(
                "اسم الدور «{$name}» مستخدم مسبقاً في هذه الشركة.",
                422
            );
        }
    }

    /**
     * ═══ حارس تصعيد الصلاحيات (Privilege Escalation Guard) ═══
     *
     * القاعدة الأمنية: «لا يمكنك منح ما لا تملك» (Azure / AWS IAM
     * delegation standard — متعدد المستأجرين وقابل للتوسع).
     *
     * كل الصلاحيات عالمية (company_id NULL) وتمنح لأي دور للشركة.
     * أي مستخدم يحمل manage_roles (المالك يحملها، ودور مخصص قد يحملها)
     * يستطيع منح أي صلاحية عالمية — متضمناً الصلاحيات العليا مثل
     * manage_settings / manage_backup / update_company /
     * transfer_ownership / view_audit_log — ما لم يُقيَّد هذا.
     *
     * الحل: مستخدم غير super-admin لا يجوز له إلا تعيين الصلاحيات
     * التي يملكها فعلاً بنفسه (getAllPermissions = أدواره ∪ صلاحياته
     * المباشرة):
     *   - super-admin  → يملك كل الصلاحيات → يستطيع تعيين أي شيء.
     *   - مالك الشركة (owner role) → يملك كل صلاحيات الشركة → يستطيع
     *     تعيين أي صلاحية نطاق الشركة.
     *   - دور مخصص يحمل manage_roles فقط → يُمنَع من منح صلاحية عليا
     *     لا يملكها.
     *
     * يفشل النظام بصمت (لا كتابة) قبل أي syncPermissions — بمجرد
     * مصادفة صلاحية لا يملكها الطالب — عبر BusinessRuleException (409).
     */
    protected function assertCanAssignPermissions(array $permissionIds): void
    {
        if (empty($permissionIds)) {
            return;
        }

        $user = auth()->user();

        // CLI / console / بلا جلسة → لا قيد (لا يوجد مهاجم محتمل).
        if (! $user || ! method_exists($user, 'getAllPermissions')) {
            return;
        }

        // super-admin يملك كل الصلاحيات فعلياً → لا قيد.
        if (method_exists($user, 'hasRole') && $user->hasRole('super-admin')) {
            return;
        }

        // الصلاحيات التي يملكها الطالب بنفسه (أدواره ∪ المباشرة).
        $held = $user->getAllPermissions()
            ->pluck('name')
            ->flip(); // name => true  (بحث O(1))

        // أسماء الصلاحيات المطلوب منحها (استعلام واحد لتجنب N+1).
        $requested = Permission::query()
            ->whereIn('id', $permissionIds)
            ->pluck('name', 'id')
            ->toArray();

        $blocked = [];
        foreach ($requested as $id => $name) {
            if (! $held->has($name)) {
                $blocked[] = $name;
            }
        }

        if ($blocked) {
            sort($blocked);
            $listed = implode('، ', array_slice($blocked, 0, 5));
            $over = count($blocked) > 5 ? ' …' : '';

            throw new BusinessRuleException(
                "لا يمكنك منح هذه الصلاحيات لأنك لا تملكها بنفسك: {$listed}{$over}. القاعدة: لا يمكنك منح ما لا تملك."
            );
        }
    }

    private function forgetSpatieCache(): void
    {
        try {
            app(PermissionRegistrar::class)->forgetCachedPermissions();
        } catch (\Throwable $e) {
            Log::warning('forgetCachedPermissions failed', ['error' => $e->getMessage()]);
        }
    }
}

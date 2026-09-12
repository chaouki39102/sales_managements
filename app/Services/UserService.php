<?php

namespace App\Services;

use App\Models\User;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class UserService extends \App\Core\Services\BaseService
{
    protected string $model        = User::class;
    protected string $resourceName = 'user';
    protected array  $defaultWith  = ['roles', 'gender', 'commune', 'wilaya'];

    protected function getResourceName(): string
    {
        return 'user';
    }

    // ═══════════════════════════════════════════
    // تجاوز update() لحل مشكلة permission_ids
    // ═══════════════════════════════════════════
    // المشكلة: BaseService::update() يحذف permission_ids في prepareDataForUpdate
    // ثم يمرر $data بدونها لـ afterUpdate — فلا تُحفظ الصلاحيات أبداً.
    // الحل: نتجاوز update() ونعالج permission_ids قبل استدعاء الـ parent.

    public function update(Model $item, array $data, ?Request $request = null): Model
    {
        // نستخرج permission_ids قبل أن يأخذها BaseService ويفقدها
        $permissionIds = array_key_exists('permission_ids', $data)
            ? ($data['permission_ids'] ?? [])
            : null; // null = لم تُرسل (لا تغيير)

        // نستدعي الـ parent الذي يعالج باقي الحقول
        $item = parent::update($item, $data, $request);

        // نطبق الصلاحيات بعد الحفظ مباشرة — مقيّدة بنطاق الشركة الحالية
        if ($permissionIds !== null) {
            $this->syncScopedPermissions($item, $permissionIds, $this->getCurrentCompanyId());
        }

        return $item->fresh($this->defaultWith);
    }

    /**
     * مزامنة الصلاحيات المباشرة ضمن نطاق الشركة الحالية فقط.
     * شركة أخرى لا يمكن أن تُمنح صلاحياتها لمستخدم هذه الشركة،
     * والصلاحيات العامة (company_id NULL) تُمنح للجميع.
     */
    protected function syncScopedPermissions(Model $item, array $permissionIds, ?int $companyId): void
    {
        $permissionClass = app(\Spatie\Permission\PermissionRegistrar::class)->getPermissionClass();

        $allowed = $permissionClass::query()
            ->whereIn('id', $permissionIds)
            ->where(function ($q) use ($companyId) {
                $q->whereNull('company_id');
                if ($companyId) {
                    $q->orWhere('company_id', $companyId);
                }
            })
            ->pluck('id')
            ->all();

        $item->syncPermissions($allowed);
    }

    // ═══════════════════════════════════════════
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $companyId          = $this->getCurrentCompanyId();
        $data['company_id'] = $companyId;
        $data['created_by'] = auth()->id();
        $data['active']      ??= true;
        $data['is_approved'] ??= true;

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $this->validateUniqueEmail($data['email'], $companyId);

        if (!empty($data['username'])) {
            $this->validateUniqueUsername($data['username']);
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        $companyId = $this->getCurrentCompanyId();

        // 1. ربط المستخدم بالشركة الحالية عبر company_user
        $item->companies()->attach($companyId, [
            'role'       => $data['role'] ?? 'member',
            'is_default' => false,
            'joined_at'  => now(),
            'active'     => true,
        ]);

        // 2. تعيين الدور المحاسبي (Spatie) باستخدام CompanyRoleService
        if (!empty($data['role'])) {
            app(\App\Services\CompanyRoleService::class)
                ->assignRole($item, $data['role'], $companyId);
        }

        // 3. الصلاحيات المباشرة (إن وجدت) — مقيّدة بنطاق الشركة الحالية
        if (isset($data['permission_ids']) && is_array($data['permission_ids'])) {
            $this->syncScopedPermissions($item, $data['permission_ids'], $companyId);
        }

        // 4. رفع الصورة (إن وجدت)
        if (!empty($data['avatar_file'])) {
            $this->handleAvatarUpload($item, $data['avatar_file']);
        }

        Log::info('User created and attached to company', [
            'user_id'    => $item->id,
            'company_id' => $companyId,
        ]);
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['company_id']) && (int)$data['company_id'] !== (int)$item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالمستخدم.', 422);
        }

        if ($request && auth()->id() === $item->id && isset($data['role'])) {
            throw new BusinessRuleException('لا يمكنك تغيير دورك الخاص.', 422);
        }

        if (isset($data['email']) && $data['email'] !== $item->email) {
            $this->validateUniqueEmail($data['email'], $item->company_id, $item->id);
        }

        if (isset($data['username']) && $data['username'] !== $item->username) {
            $this->validateUniqueUsername($data['username'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        unset($data['company_id']);
        unset($data['permission_ids']); // تُعالج في update() المُتجاوَز

        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        unset($data['avatar_file']);

        $data['updated_by'] = auth()->id();

        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        // الدور — استبدال ضمن نطاق الشركة الحالية عبر CompanyRoleService
        if (isset($data['role']) && $data['role']) {
            $companyId = $this->getCurrentCompanyId();
            if ($companyId) {
                app(\App\Services\CompanyRoleService::class)
                    ->replaceRole($item, $data['role'], $companyId);
            }
        }

        // permission_ids تُعالج في update() المُتجاوَز — لا شيء هنا

        if ($request && $request->hasFile('avatar_file')) {
            $this->handleAvatarUpload($item, $request->file('avatar_file'));
        }

        Log::info('User updated', ['user_id' => $item->id]);
    }

    protected function beforeDelete(Model $item): void
    {
        if ($item->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك حذف حسابك الخاص.', 422);
        }
    }

    protected function afterDelete(Model $item): void
    {
        $item->update(['deleted_by' => auth()->id()]);
        Log::info('User soft deleted', ['user_id' => $item->id]);
    }

    // ═══════════════════════════════════════════
    // العمليات المتقدمة
    // ═══════════════════════════════════════════

    public function changePassword(User $user, string $newPassword): void
    {
        $user->update([
            'password'   => Hash::make($newPassword),
            'updated_by' => auth()->id(),
        ]);
    }

    public function toggleActive(User $user): User
    {
        if ($user->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك تعطيل حسابك الخاص.', 422);
        }

        $user->active     = !$user->active;
        $user->updated_by = auth()->id();
        $user->save();

        return $user->fresh($this->defaultWith);
    }

    public function updateProfile(User $user, array $data): User
    {
        $allowed  = [
            'name',
            'username',
            'phone',
            'bio',
            'avatar',
            'birth_date',
            'gender_id',
            'address',
            'commune_id',
            'wilaya_id'
        ];
        $filtered = array_intersect_key($data, array_flip($allowed));

        if (isset($filtered['username']) && $filtered['username'] !== $user->username) {
            $this->validateUniqueUsername($filtered['username'], $user->id);
        }

        $user->update($filtered);

        return $user->fresh($this->defaultWith);
    }

    public function updateAvatar(User $user, $file): string
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);
        return asset('storage/' . $path);
    }

    public function updateLastLogin(User $user): void
    {
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    public function restoreUser(int $id): User
    {
        $user = User::withTrashed()->findOrFail($id);
        if ($user->trashed()) {
            $user->restore();
            $user->update(['deleted_by' => null]);
            Log::info('User restored', ['user_id' => $id]);
        }
        return $user->fresh($this->defaultWith);
    }

    public function forceDeleteUser(int $id): void
    {
        $user = User::withTrashed()->findOrFail($id);
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $user->forceDelete();
        Log::info('User permanently deleted', ['user_id' => $id]);
    }

    // ═══════════════════════════════════════════
    // دوال الاستعلام
    // ═══════════════════════════════════════════
    public function findById($id, ?array $with = null): Model
    {
        $relations = $with ?? array_unique(array_merge($this->defaultWith, $this->showWith));
        $companyId = $this->getCurrentCompanyId();

        return User::whereHas('companies', function ($q) use ($companyId) {
            $q->where('companies.id', $companyId);
        })
            ->with($relations)
            ->findOrFail($id);
    }
    public function getByRole(string $roleName)
    {
        $companyId = $this->getCurrentCompanyId();

        return User::whereHas('companies', function ($q) use ($companyId) {
            $q->where('companies.id', $companyId);
        })
            ->whereHas('roles', function ($q) use ($roleName, $companyId) {
                $q->where('name', $roleName)
                  ->where('roles.company_id', $companyId);
            })
            ->with($this->defaultWith)
            ->get();
    }

    public function getActive()
    {
        $companyId = $this->getCurrentCompanyId();

        return User::where('active', true)
            ->whereHas('companies', function ($q) use ($companyId) {
                $q->where('companies.id', $companyId);
            })
            ->with($this->defaultWith)
            ->get();
    }

    public function getInactive()
    {
        $companyId = $this->getCurrentCompanyId();

        return User::where('active', false)
            ->whereHas('companies', function ($q) use ($companyId) {
                $q->where('companies.id', $companyId);
            })
            ->with($this->defaultWith)
            ->get();
    }

    // ═══════════════════════════════════════════
    // مساعدات
    // ═══════════════════════════════════════════

    private function validateUniqueEmail(string $email, int $companyId, ?int $excludeId = null): void
    {
        $query = User::whereHas('companies', function ($q) use ($companyId) {
            $q->where('companies.id', $companyId);
        })->where('email', $email);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('البريد الإلكتروني مستخدم بالفعل داخل هذه الشركة.', 422);
        }
    }

    private function validateUniqueUsername(string $username, ?int $excludeId = null): void
    {
        $query = User::where('username', $username);
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        if ($query->exists()) {
            throw new BusinessRuleException('اسم المستخدم موجود مسبقاً.', 422);
        }
    }

    private function handleAvatarUpload(User $user, $file): void
    {
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);
    }

    protected function getCurrentCompanyId(): ?int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }
}

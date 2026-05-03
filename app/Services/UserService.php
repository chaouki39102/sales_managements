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
    // Hooks
    // ═══════════════════════════════════════════

    protected function beforeCreate(array $data, ?Request $request): array
    {
        $companyId          = $this->getCurrentCompanyId();
        $data['company_id'] = $companyId;
        $data['created_by'] = auth()->id();
        $data['active']     ??= true;

        // تشفير كلمة المرور
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        // التحقق من البريد الفريد داخل الشركة
        $this->validateUniqueEmail($data['email'], $companyId);

        // التحقق من اسم المستخدم الفريد (إن وُجد)
        if (!empty($data['username'])) {
            $this->validateUniqueUsername($data['username']);
        }

        return $data;
    }

    protected function afterCreate(Model $item, array $data, ?Request $request): void
    {
        // إسناد الدور
        if (!empty($data['role'])) {
            $item->syncRoles([$data['role']]);
        }

        // رفع الصورة الرمزية إن وُجدت
        if (!empty($data['avatar_file'])) {
            $this->handleAvatarUpload($item, $data['avatar_file']);
        }

        Log::info('User created', [
            'user_id'    => $item->id,
            'company_id' => $item->company_id,
            'created_by' => auth()->id(),
        ]);
    }

    protected function beforeUpdate(Model $item, array $data, ?Request $request): void
    {
        // منع تغيير الشركة
        if (isset($data['company_id']) && (int)$data['company_id'] !== (int)$item->company_id) {
            throw new BusinessRuleException('لا يمكن تغيير الشركة المرتبطة بالمستخدم.', 422);
        }

        // لا يمكن تغيير دور نفسك
        if ($request && auth()->id() === $item->id && isset($data['role'])) {
            throw new BusinessRuleException('لا يمكنك تغيير دورك الخاص.', 422);
        }

        // التحقق من البريد إذا تغير
        if (isset($data['email']) && $data['email'] !== $item->email) {
            $this->validateUniqueEmail($data['email'], $item->company_id, $item->id);
        }

        // التحقق من اسم المستخدم إذا تغير
        if (isset($data['username']) && $data['username'] !== $item->username) {
            $this->validateUniqueUsername($data['username'], $item->id);
        }
    }

    protected function prepareDataForUpdate(Model $item, array $data, ?Request $request): array
    {
        unset($data['company_id']);

        // معالجة كلمة المرور
        if (!empty($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        } else {
            unset($data['password']);
        }

        // معالجة الصورة الرمزية (لا تمرر إلى DB مباشرة)
        unset($data['avatar_file']);

        $data['updated_by'] = auth()->id();

        return $data;
    }

    protected function afterUpdate(Model $item, array $data, ?Request $request): void
    {
        if (isset($data['role'])) {
            $item->syncRoles([$data['role']]);
        }

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

    /**
     * تغيير كلمة المرور.
     */
    public function changePassword(User $user, string $newPassword): void
    {
        $user->update([
            'password' => Hash::make($newPassword),
            'updated_by' => auth()->id(),
        ]);
    }

    /**
     * تبديل حالة التفعيل (active ↔ inactive).
     */
    public function toggleActive(User $user): User
    {
        if ($user->id === auth()->id()) {
            throw new BusinessRuleException('لا يمكنك تعطيل حسابك الخاص.', 422);
        }

        $user->active = !$user->active;
        $user->updated_by = auth()->id();
        $user->save();

        return $user->fresh($this->defaultWith);
    }

    /**
     * تحديث البروفايل الشخصي (المستخدم نفسه يعدل بياناته).
     * يسمح فقط بحقول معينة.
     */
    public function updateProfile(User $user, array $data): User
    {
        $allowed = ['name', 'username', 'phone', 'bio', 'avatar', 'birth_date',
                    'gender_id', 'address', 'commune_id', 'wilaya_id'];

        $filtered = array_intersect_key($data, array_flip($allowed));

        if (isset($filtered['username']) && $filtered['username'] !== $user->username) {
            $this->validateUniqueUsername($filtered['username'], $user->id);
        }

        $user->update($filtered);

        return $user->fresh($this->defaultWith);
    }

    /**
     * رفع أو تحديث الصورة الرمزية.
     */
    public function updateAvatar(User $user, $file): string
    {
        // حذف القديم إن وجد
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $file->store('avatars', 'public');
        $user->update(['avatar' => $path]);

        return Storage::disk('public')->url($path);
    }

    /**
     * تحديث آخر تسجيل دخول.
     */
    public function updateLastLogin(User $user): void
    {
        $user->update([
            'last_login_at' => now(),
            'last_login_ip' => request()->ip(),
        ]);
    }

    /**
     * استعادة مستخدم محذوف.
     */
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

    /**
     * حذف نهائي.
     */
    public function forceDeleteUser(int $id): void
    {
        $user = User::withTrashed()->findOrFail($id);
        // حذف الصورة الرمزية إن وجدت
        if ($user->avatar) {
            Storage::disk('public')->delete($user->avatar);
        }
        $user->forceDelete();
        Log::info('User permanently deleted', ['user_id' => $id]);
    }

    // ═══════════════════════════════════════════
    // دوال الاستعلام
    // ═══════════════════════════════════════════

    public function getByRole(string $roleName)
    {
        return User::role($roleName)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    public function getActive()
    {
        return User::where('active', true)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    public function getInactive()
    {
        return User::where('active', false)
            ->where('company_id', $this->getCurrentCompanyId())
            ->with($this->defaultWith)
            ->get();
    }

    // ═══════════════════════════════════════════
    // مساعدات
    // ═══════════════════════════════════════════

    private function validateUniqueEmail(string $email, int $companyId, ?int $excludeId = null): void
    {
        $query = User::where('company_id', $companyId)->where('email', $email);
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

    private function getCurrentCompanyId(): int
    {
        return app(\App\Services\CompanyContextService::class)->get();
    }
}

<?php

namespace App\Services;

use App\Models\User;
use App\Models\LoginAttempt;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Authentication Service
 *
 * مسؤول عن جميع عمليات المصادقة والتفويض:
 * - تسجيل مستخدم جديد
 * - تسجيل الدخول
 * - إدارة كلمات المرور
 * - إنشاء التوكنات
 *
 * @package App\Services
 */
class AuthService extends \App\Core\Services\BaseService
{
    protected string $model = User::class;
    protected string $resourceName = 'user';

    protected int $maxLoginAttempts = 5;
    protected int $lockoutMinutes = 15;

    /**
     * تسجيل مستخدم جديد
     */
    public function register(array $data): User
    {
        if (User::where('email', $data['email'])->exists()) {
            throw new BusinessRuleException('هذا البريد الإلكتروني مسجل بالفعل', 422);
        }

        return $this->create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
        ]);
    }

    /**
     * تسجيل الدخول
     */
    public function login(string $email, string $password): User
    {
        if (LoginAttempt::isLockedOut($email, $this->maxLoginAttempts, $this->lockoutMinutes)) {
            throw new BusinessRuleException(
                'تم قفل الحساب مؤقتاً بسبب محاولات دخول فاشلة متعددة. يرجى المحاولة لاحقاً',
                423
            );
        }

        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            LoginAttempt::record($email, false);
            throw new UnauthorizedException('بيانات الدخول غير صحيحة');
        }

        LoginAttempt::record($email, true);

        return $user;
    }

    /**
     * تغيير كلمة المرور
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        if (!Hash::check($currentPassword, $user->password)) {
            throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
        }
        DB::transaction(function () use ($user, $newPassword) {
            $user->update(['password' => $newPassword]);
            $user->tokens()->delete();
        });
    }

    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // TODO: إرسال بريد ترحيب
    }
}

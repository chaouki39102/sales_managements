<?php

namespace App\Services;

use App\Models\User;
use App\Core\Exceptions\UnauthorizedException;
use App\Core\Exceptions\BusinessRuleException;
use Illuminate\Database\Eloquent\Model;
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

    /**
     * تسجيل مستخدم جديد
     */
    public function register(array $data): User
    {
        // 1. التحقق من عدم وجود المستخدم
        if (User::where('email', $data['email'])->exists()) {
            throw new BusinessRuleException('هذا البريد الإلكتروني مسجل بالفعل', 422);
        }

        // 2. إنشاء المستخدم عبر Service (كلمة المرور ستُشفر تلقائياً بواسطة الـ Model Mutator)
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
        // 1. البحث عن المستخدم
        $user = User::where('email', $email)->first();

        if (!$user || !Hash::check($password, $user->password)) {
            throw new UnauthorizedException('بيانات الدخول غير صحيحة');
        }

        return $user;
    }

    /**
     * تغيير كلمة المرور
     */
    public function changePassword(User $user, string $currentPassword, string $newPassword): void
    {
        // 1. التحقق من كلمة المرور الحالية
        if (!Hash::check($currentPassword, $user->password)) {
            throw new UnauthorizedException('كلمة المرور الحالية غير صحيحة');
        }

        // 2. تحديث كلمة المرور (سيتم تشفيرها تلقائياً بواسطة الـ Model Mutator)
        $user->update([
            'password' => $newPassword,
        ]);

        // 3. إلغاء جميع التوكنات القديمة (إجبار إعادة تسجيل دخول)
        $user->tokens()->delete();
    }

    // === Hooks (Post-Commit Operations) ===

    /**
     * بعد إنشاء المستخدم بنجاح
     * يمكن إرسال بريد تأكيد هنا
     */
    protected function afterCreateCommitted(Model $item, array $data, $request): void
    {
        // TODO: إرسال بريد ترحيب
        // Mail::send(new WelcomeEmail($item));
    }
}

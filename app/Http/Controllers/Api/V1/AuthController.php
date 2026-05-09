<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Authentication Controller - Professional Version
 *
 * المتحكم يقوم بـ:
 * 1. استقبال الطلب والتحقق من صحته
 * 2. التحقق من الصلاحيات
 * 3. تفويض العملية للخدمة
 * 4. إرجاع الرد المُنسق
 *
 * المتحكم لا يقوم بـ:
 * ❌ معالجة البيانات
 * ❌ الاتصال بـ Database مباشرة
 * ❌ معالجة الأخطاء يدوياً (handleError يتولى ذلك)
 */
class AuthController extends BaseApiController
{
    protected string $resourceName = 'user';
    protected ?string $resourceClass = null;

    protected AuthService $authService;

    public function __construct(AuthService $authService)
    {
        parent::__construct();
        $this->authService = $authService;
    }

    /**
     * تسجيل مستخدم جديد
     */
    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->register($request->validated());

            return $this->successResponse(
                [
                    'user' => new UserResource($user),
                    'token' => $user->createToken('auth_token')->plainTextToken,
                    'token_type' => 'Bearer',
                ],
                'تم التسجيل بنجاح',
                201
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'register');
        }
    }

    /**
     * تسجيل دخول مستخدم
     */
    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->login($request->email, $request->password);

            return $this->successResponse(
                [
                    'user' => new UserResource($user),
                    'token' => $user->createToken('auth_token')->plainTextToken,
                    'token_type' => 'Bearer',
                ],
                'تم دخولك بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'login');
        }
    }

    /**
     * الحصول على بيانات المستخدم الحالي
     */
public function me(Request $request): JsonResponse
{
    $user = $request->user()->load('roles');   // حمّل العلاقة

    return $this->successResponse(
        new UserResource($user),                // ← مرر المتغير الصحيح
        'تم استرجاع البيانات بنجاح'
    );
}

    /**
     * تحديث بيانات المستخدم
     */
    public function update(Request $request, $id = null): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $request->validate([
                'name' => 'sometimes|string|max:255',
                'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            ]);

            $user->update($data);

            return $this->successResponse(
                new UserResource($user),
                'تم التحديث بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    /**
     * تغيير كلمة المرور
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $user = $request->user();
            $this->authService->changePassword($user, $request->current_password, $request->new_password);

            return $this->successResponse(null, 'تم تغيير كلمة المرور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    /**
     * تسجيل خروج المستخدم
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return $this->successResponse(null, 'تم تسجيل الخروج بنجاح');
    }

    // === Abstract Methods (Required by BaseApiController) ===

    protected function getService(): AuthService
    {
        return $this->authService;
    }

    protected function getModelClass(): string
    {
        return User::class;
    }
}

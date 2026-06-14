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

class AuthController extends BaseApiController
{
    protected string $resourceName = 'user';
    protected ?string $resourceClass = null;

    public function __construct(protected AuthService $authService)
    {
        parent::__construct();
    }

    public function register(RegisterRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->register($request->validated());
            $user->load('roles');   // ✅ لازم للـ redirect في الواجهة

            return $this->successResponse([
                'user'       => new UserResource($user),
                'token'      => $user->createToken('auth_token')->plainTextToken,
                'token_type' => 'Bearer',
            ], 'تم التسجيل بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'register');
        }
    }

    public function login(LoginRequest $request): JsonResponse
    {
        try {
            $user = $this->authService->login($request->email, $request->password);
            $user->load('roles');   // ✅ الأساس — بدونه الواجهة لا تعرف الدور

            return $this->successResponse([
                'user'       => new UserResource($user),
                'token'      => $user->createToken('auth_token')->plainTextToken,
                'token_type' => 'Bearer',
            ], 'تم دخولك بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'login');
        }
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles');   // ✅ للتحقق عند إعادة تحميل الصفحة

        return $this->successResponse(
            new UserResource($user),
            'تم استرجاع البيانات بنجاح'
        );
    }

    public function update(Request $request, $id = null): JsonResponse
    {
        try {
            $user = $request->user();
            $data = $request->validate([
                'name'  => 'sometimes|string|max:255',
                'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            ]);
            $user->update($data);

            return $this->successResponse(new UserResource($user), 'تم التحديث بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        try {
            $this->authService->changePassword(
                $request->user(),
                $request->current_password,
                $request->new_password
            );
            return $this->successResponse(null, 'تم تغيير كلمة المرور بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();
        return $this->successResponse(null, 'تم تسجيل الخروج بنجاح');
    }

    protected function getService(): AuthService  { return $this->authService; }
    protected function getModelClass(): string    { return User::class; }
}

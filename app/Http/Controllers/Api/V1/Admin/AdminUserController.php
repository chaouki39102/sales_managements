<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\UserResource;
use App\Http\Resources\CompanyResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * AdminUserController
 *
 * إدارة كل مستخدمي النظام — بدون سياق شركة.
 */
class AdminUserController extends BaseApiController
{
    protected string $resourceName   = 'user';
    protected ?string $resourceClass = UserResource::class;

    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->withCount('companies')
            ->latest();

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
            );
        }

        if ($request->has('active')) {
            $query->where('is_active', filter_var($request->get('active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($role = $request->get('role')) {
            $query->where('role', $role);
        }

        $users = $query->paginate($request->get('per_page', 20));

        return $this->successResponse(
            UserResource::collection($users)->response()->getData(true),
            'قائمة المستخدمين'
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'       => 'required|string|max:255',
            'email'      => 'required|email|unique:users,email',
            'password'   => 'required|string|min:8',
            'role'       => ['nullable', Rule::in(['super_admin', 'admin', 'user'])],
            'company_id' => 'nullable|exists:companies,id',
        ]);

        try {
            $user = User::create([
                'name'      => $data['name'],
                'email'     => $data['email'],
                'password'  => Hash::make($data['password']),
                'role'      => $data['role'] ?? 'user',
                'is_active' => true,
            ]);

            if (!empty($data['company_id'])) {
                $user->companies()->attach($data['company_id'], [
                    'role'       => 'member',
                    'is_active'  => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $this->successResponse(new UserResource($user), 'تم إنشاء المستخدم', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function show(User $user): JsonResponse
    {
        $user->loadCount('companies');
        return $this->successResponse(new UserResource($user));
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name'  => 'sometimes|string|max:255',
            'email' => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'role'  => ['sometimes', Rule::in(['super_admin', 'admin', 'user'])],
        ]);

        try {
            $user->update($data);
            return $this->successResponse(new UserResource($user->fresh()), 'تم التحديث');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('لا يمكنك حذف حسابك الخاص', 422);
        }

        try {
            $user->delete();
            return $this->successResponse(null, 'تم حذف المستخدم');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'password'              => 'required|string|min:8|confirmed',
            'password_confirmation' => 'required',
        ]);

        try {
            $user->update(['password' => Hash::make($data['password'])]);
            // إلغاء كل الجلسات
            $user->tokens()->delete();
            return $this->successResponse(null, 'تم تغيير كلمة المرور وإلغاء جميع الجلسات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'resetPassword');
        }
    }

    public function toggleActive(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('لا يمكنك تعطيل حسابك الخاص', 422);
        }

        try {
            $user->update(['is_active' => !$user->is_active]);
            $msg = $user->is_active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(new UserResource($user->fresh()), $msg);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'toggleActive');
        }
    }

    public function companies(User $user): JsonResponse
    {
        $companies = $user->companies()
            ->withPivot(['role', 'is_active'])
            ->get();

        return $this->successResponse(
            CompanyResource::collection($companies),
            "شركات [{$user->name}]"
        );
    }

    protected function getModelClass(): string { return User::class; }
}

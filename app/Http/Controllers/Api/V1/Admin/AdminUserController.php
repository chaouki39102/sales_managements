<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Http\Resources\UserResource;
use App\Http\Resources\CompanyResource;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AdminUserController extends Controller
{
    use ApiResponders;

    protected string $resourceName = 'user';
    protected ?string $resourceClass = UserResource::class;

    /**
     * عرض قائمة المستخدمين
     */
    public function index(Request $request): JsonResponse
    {
        $query = User::query()
            ->withCount('companies')
            ->latest();

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($request->has('active')) {
            $query->where('active', filter_var($request->get('active'), FILTER_VALIDATE_BOOLEAN));
        }

        if ($role = $request->get('role')) {
            $query->where('role', $role);
        }

        $users = $query->paginate($request->get('per_page', 20));

        return $this->successResponse($users, 'قائمة المستخدمين');
    }

    /**
     * إنشاء مستخدم جديد
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        try {
            $user = User::create($request->validated());

            if ($request->filled('company_id')) {
                $user->companies()->attach($request->company_id, [
                    'role'       => 'member',
                    'active'     => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            return $this->successResponse(new UserResource($user), 'تم إنشاء المستخدم', 201);
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل الإنشاء: ' . $e->getMessage(), 500, 'SERVER_ERROR');
        }
    }

    /**
     * عرض مستخدم محدد
     */
    public function show(User $user): JsonResponse
    {
        $user->loadCount('companies');
        return $this->successResponse(new UserResource($user));
    }

    /**
     * تحديث بيانات مستخدم
     */
    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        try {
            $user->update($request->validated());
            return $this->successResponse(new UserResource($user->fresh()), 'تم تحديث المستخدم');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل التحديث', 500, 'SERVER_ERROR');
        }
    }

    /**
     * حذف مستخدم (soft delete)
     */
    public function destroy(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('لا يمكنك حذف حسابك الخاص', 422, 'AUTHORIZATION_ERROR');
        }

        try {
            $user->delete();
            return $this->successResponse(null, 'تم حذف المستخدم');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل الحذف', 500, 'SERVER_ERROR');
        }
    }

    /**
     * إعادة تعيين كلمة المرور
     */
    public function resetPassword(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        try {
            $user->update(['password' => Hash::make($data['password'])]);
            $user->tokens()->delete(); // إبطال جميع التوكنات
            return $this->successResponse(null, 'تم تغيير كلمة المرور وإلغاء جميع الجلسات');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل تغيير كلمة المرور', 500, 'SERVER_ERROR');
        }
    }

    /**
     * تفعيل / تعطيل مستخدم
     */
    public function toggleActive(User $user): JsonResponse
    {
        if ($user->id === auth()->id()) {
            return $this->errorResponse('لا يمكنك تعطيل حسابك الخاص', 422, 'AUTHORIZATION_ERROR');
        }

        try {
            $user->update(['active' => !$user->active]);
            $msg = $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(new UserResource($user->fresh()), $msg);
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل تغيير الحالة', 500, 'SERVER_ERROR');
        }
    }

    /**
     * قائمة شركات المستخدم
     */
    public function companies(User $user): JsonResponse
    {
        $companies = $user->companies()->withPivot(['role', 'active'])->get();
        return $this->successResponse(CompanyResource::collection($companies), "شركات [{$user->name}]");
    }
}

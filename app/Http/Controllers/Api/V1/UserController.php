<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends BaseApiController
{
    protected string  $resourceName = 'user';
    protected ?string $resourceClass = UserResource::class;

    public function __construct(private UserService $userService)
    {
        parent::__construct();
    }

    protected function getService(): UserService
    {
        return $this->userService;
    }

    protected function getModelClass(): string
    {
        return User::class;
    }

    // ─── CRUD ───────────────────────────────────


    // ─── الملف الشخصي (المستخدم نفسه) ──────────
    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user()->load(['gender', 'commune', 'wilaya', 'roles']);
            return $this->successResponse(new UserResource($user));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'profile');
        }
    }

    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        try {
            $user = $this->userService->updateProfile($request->user(), $request->validated());
            return $this->successResponse(new UserResource($user), 'تم تحديث الملف الشخصي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateProfile');
        }
    }

    public function updateAvatar(Request $request): JsonResponse
    {
        try {
            $request->validate(['avatar_file' => 'required|image|max:2048']);
            $url = $this->userService->updateAvatar($request->user(), $request->file('avatar_file'));
            return $this->successResponse(['avatar_url' => $url], 'تم تحديث الصورة الرمزية');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateAvatar');
        }
    }

    // ─── عمليات المستخدم ───────────────────────
    public function changePassword(Request $request, $id): JsonResponse
    {
        try {
            $user = $this->userService->findById($id);
            $this->authorizeAction('update', $user);
            $data = $request->validate(['password' => 'required|string|min:8|max:100']);
            $this->userService->changePassword($user, $data['password']);
            return $this->successResponse(null, 'تم تغيير كلمة المرور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePassword');
        }
    }

    public function toggleActive($id): JsonResponse
    {
        try {
            $user = $this->userService->findById($id);
            $this->authorizeAction('update', $user);
            $user = $this->userService->toggleActive($user);
            $msg = $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(new UserResource($user), $msg);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'toggleActive');
        }
    }

    public function assignRole(Request $request, $id): JsonResponse
    {
        try {
            $user = $this->userService->findById($id);
            $this->authorizeAction('update', $user);
            $data = $request->validate(['role' => 'required|string|exists:roles,name']);
            $user->syncRoles([$data['role']]);
            return $this->successResponse(new UserResource($user->load('roles')), 'تم تعيين الدور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'assignRole');
        }
    }

    // ─── المحذوفات ─────────────────────────────
    public function trashed(): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', User::class);
            $users = User::onlyTrashed()
                ->where('company_id', app(\App\Services\CompanyContextService::class)->get())
                ->with(['roles', 'gender'])
                ->paginate(20);
            return $this->successResponse(UserResource::collection($users));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'trashed');
        }
    }

    public function restore($id): JsonResponse
    {
        try {
            $user = $this->userService->restoreUser($id);
            $this->authorizeAction('restore', $user);
            return $this->successResponse(new UserResource($user), 'تم استعادة المستخدم');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'restore');
        }
    }

    public function forceDelete($id): JsonResponse
    {
        try {
            $user = User::withTrashed()->findOrFail($id);
            $this->authorizeAction('forceDelete', $user);
            $this->userService->forceDeleteUser($id);
            return $this->successResponse(null, 'تم حذف المستخدم نهائياً');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'forceDelete');
        }
    }

    // ─── استعلامات ─────────────────────────────
    public function byRole(Request $request): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        $role = $request->get('role');
        if (!$role) return $this->errorResponse('الرجاء تحديد دور', 422);
        $users = $this->userService->getByRole($role);
        return $this->successResponse(UserResource::collection($users));
    }

    public function active(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        $users = $this->userService->getActive();
        return $this->successResponse(UserResource::collection($users));
    }

    public function inactive(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        $users = $this->userService->getInactive();
        return $this->successResponse(UserResource::collection($users));
    }
}

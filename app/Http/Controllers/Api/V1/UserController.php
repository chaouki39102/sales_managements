<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
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

    public function index(Request $request): JsonResponse
{
    $companyId = app(\App\Services\CompanyContextService::class)->get();

    $users = User::whereHas('companies', function ($q) use ($companyId) {
        $q->where('companies.id', $companyId);
    })->paginate($request->get('per_page', 15));

    return $this->successResponse(
        UserResource::collection($users),
        'تم جلب المستخدمين بنجاح'
    );
}

    // ─────────────────────────────────────────────────────────────────
    // السبب الجذري للمشكلة:
    //
    // الـ route هو: /{company}/{user}
    // Laravel يمرر parameters بالترتيب للـ method signature:
    //   BaseApiController::update(Request $request, $id)
    //                                                ↑
    //                                         يستقبل {company} بدل {user}!
    //
    // الحل: قراءة {user} مباشرة من الـ route بالاسم، وليس من الـ $id.
    // نحافظ على نفس signature للـ parent لتجنب خطأ PHP type compatibility.
    // ─────────────────────────────────────────────────────────────────

    public function update(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->route('user') ?? $id;

            $item = $this->userService->findById($userId);
            $this->authorizeAction('update', $item);

            $data = $this->getValidatedData($request, $userId);
            $item = $this->userService->update($item, $data, $request);

            return $this->successResponse(
                new UserResource($item),
                "تم تحديث {$this->resourceName} بنجاح"
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    // show و destroy يعانيان من نفس مشكلة {company}/{user} parameter mixing
    public function show($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $item = $this->userService->findById($userId);
            $this->authorizeAction('view', $item);
            return $this->successResponse(new UserResource($item));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $item = $this->userService->findById($userId);
            $this->authorizeAction('delete', $item);
            $this->userService->delete($item);
            return $this->successResponse(null, "تم حذف {$this->resourceName} بنجاح");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ─── الملف الشخصي ───────────────────────────────────────────────

    public function profile(Request $request): JsonResponse
    {
        try {
            $user = $request->user()->load(['gender', 'commune', 'wilaya', 'roles']);
            return $this->successResponse(new UserResource($user));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'profile');
        }
    }

    public function updateProfile(Request $request): JsonResponse
    {
        try {
            $data = $request->validate([
                'name'       => 'sometimes|string|max:255',
                'username'   => 'nullable|string|max:50',
                'phone'      => 'nullable|string|max:20',
                'bio'        => 'nullable|string',
                'birth_date' => 'nullable|date',
                'gender_id'  => 'nullable|exists:genders,id',
                'address'    => 'nullable|string|max:500',
                'commune_id' => 'nullable|exists:communes,id',
                'wilaya_id'  => 'nullable|exists:wilayas,id',
            ]);
            $user = $this->userService->updateProfile($request->user(), $data);
            return $this->successResponse(new UserResource($user), 'تم تحديث الملف الشخصي');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateProfile');
        }
    }

    // ─── عمليات على مستخدم محدد ─────────────────────────────────────

    public function changePassword(Request $request, $id): JsonResponse
    {
        try {
            $userId = $request->route('user') ?? $id;
            $user = $this->userService->findById($userId);
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
            $userId = request()->route('user') ?? $id;
            $user = $this->userService->findById($userId);
            $this->authorizeAction('update', $user);
            $user = $this->userService->toggleActive($user);
            $msg  = $user->active ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(new UserResource($user), $msg);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'toggleActive');
        }
    }

    public function assignRole(Request $request, $id): JsonResponse
{
    try {
        $userId = $request->route('user') ?? $id;
        $user   = $this->userService->findById($userId);
        $this->authorizeAction('update', $user);

        $companyId = app(\App\Services\CompanyContextService::class)->get();

        $data = $request->validate([
            'role' => 'required|string|exists:roles,name',
        ]);

        app(\App\Services\CompanyRoleService::class)
            ->assignRole($user, $data['role'], $companyId);

        return $this->successResponse(
            new UserResource($user->load('roles')),
            'تم تعيين الدور'
        );
    } catch (\Throwable $e) {
        return $this->handleError($e, 'assignRole');
    }
}

    // ─── المحذوفات ──────────────────────────────────────────────────

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
            $userId = request()->route('user') ?? $id;
            $user = $this->userService->restoreUser($userId);
            $this->authorizeAction('restore', $user);
            return $this->successResponse(new UserResource($user), 'تم استعادة المستخدم');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'restore');
        }
    }

    public function forceDelete($id): JsonResponse
    {
        try {
            $userId = request()->route('user') ?? $id;
            $user = User::withTrashed()->findOrFail($userId);
            $this->authorizeAction('forceDelete', $user);
            $this->userService->forceDeleteUser($userId);
            return $this->successResponse(null, 'تم حذف المستخدم نهائياً');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'forceDelete');
        }
    }

    // ─── استعلامات ──────────────────────────────────────────────────

    public function byRole(Request $request): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        $role = $request->get('role');
        if (!$role) return $this->errorResponse('الرجاء تحديد دور', 422);
        return $this->successResponse(UserResource::collection($this->userService->getByRole($role)));
    }

    public function active(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        return $this->successResponse(UserResource::collection($this->userService->getActive()));
    }

    public function inactive(): JsonResponse
    {
        $this->authorizeAction('viewAny', User::class);
        return $this->successResponse(UserResource::collection($this->userService->getInactive()));
    }
}

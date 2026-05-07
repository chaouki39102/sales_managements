<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Models\User;
use App\Services\CompanyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * AdminCompanyController
 *
 * يعمل على /api/v1/admin/companies — بدون slug — بدون SetCompanyContext.
 * السوبر أدمن يتحكم في الشركات ومستخدميها مباشرة.
 */
class AdminCompanyController extends BaseApiController
{
    protected string $resourceName   = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(private CompanyService $companyService) {}

    // ──────────────────────────────────────────────────────────────────
    // CRUD الشركات
    // ──────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Company::query()
            ->withCount('users')
            ->with('owner:id,name,email')
            ->latest();

        if ($search = $request->get('search')) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$search}%")
                ->orWhere('slug', 'like', "%{$search}%")
                ->orWhere('email', 'like', "%{$search}%")
            );
        }

        if ($status = $request->get('status')) {
            match ($status) {
                'active'     => $query->where('is_active', true)->where('is_suspended', false),
                'suspended'  => $query->where('is_suspended', true),
                'inactive'   => $query->where('is_active', false),
                'verified'   => $query->whereNotNull('verified_at'),
                'unverified' => $query->whereNull('verified_at'),
                default      => null,
            };
        }

        if ($plan = $request->get('plan')) {
            $query->where('plan', $plan);
        }

        $companies = $query->paginate($request->get('per_page', 20));

        return $this->successResponse(
            CompanyResource::collection($companies)->response()->getData(true),
            'قائمة الشركات'
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'email'     => 'required|email|unique:companies,email',
            'owner_id'  => 'required|exists:users,id',
            'plan'      => ['nullable', 'string', Rule::in(array_keys(Company::PLANS))],
            'phone'     => 'nullable|string|max:30',
            'address'   => 'nullable|string|max:500',
        ]);

        try {
            $company = $this->companyService->create($data);
            return $this->successResponse(new CompanyResource($company), 'تم إنشاء الشركة', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function show(Company $company): JsonResponse
    {
        $company->loadCount('users')->load('owner:id,name,email');
        return $this->successResponse(new CompanyResource($company));
    }

    public function update(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'name'    => 'sometimes|string|max:255',
            'email'   => ['sometimes', 'email', Rule::unique('companies', 'email')->ignore($company->id)],
            'phone'   => 'nullable|string|max:30',
            'address' => 'nullable|string|max:500',
        ]);

        try {
            $company->update($data);
            return $this->successResponse(new CompanyResource($company->fresh()), 'تم التحديث');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy(Company $company): JsonResponse
    {
        try {
            $company->delete();
            return $this->successResponse(null, 'تم حذف الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // حالة الشركة
    // ──────────────────────────────────────────────────────────────────

    public function suspend(Request $request, Company $company): JsonResponse
    {
        try {
            $data = $request->validate(['reason' => 'required|string|max:500']);
            $company->suspend($data['reason'], auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), "تم تعليق [{$company->name}]");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend(Company $company): JsonResponse
    {
        try {
            $company->unsuspend();
            return $this->successResponse(new CompanyResource($company->fresh()), "تم رفع التعليق");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function activate(Company $company): JsonResponse
    {
        try {
            $company->activate();
            return $this->successResponse(new CompanyResource($company->fresh()), "تم التفعيل");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activate');
        }
    }

    public function deactivate(Company $company): JsonResponse
    {
        try {
            $company->deactivate(auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), "تم الإيقاف");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivate');
        }
    }

    public function verify(Company $company): JsonResponse
    {
        try {
            $company->verify(auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), "تم التوثيق");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify(Company $company): JsonResponse
    {
        try {
            $company->unverify();
            return $this->successResponse(null, 'تم إلغاء التوثيق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        try {
            $data = $request->validate([
                'plan'           => ['required', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'      => 'nullable|integer|min:1',
                'max_warehouses' => 'nullable|integer|min:1',
                'max_products'   => 'nullable|integer|min:1',
            ]);
            $customLimits = array_filter([
                'max_users'      => $data['max_users'] ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products'] ?? null,
            ]);
            $company->upgradePlan($data['plan'], $customLimits ?: null);
            return $this->successResponse(new CompanyResource($company->fresh()), "تم تغيير الخطة إلى {$data['plan']}");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changePlan');
        }
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        try {
            $data = $request->validate(['notes' => 'nullable|string|max:5000']);
            $company->update(['notes' => $data['notes']]);
            return $this->successResponse(null, 'تم تحديث الملاحظات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'updateNotes');
        }
    }

    // ──────────────────────────────────────────────────────────────────
    // إدارة مستخدمي الشركة — بدون الدخول إليها
    // ──────────────────────────────────────────────────────────────────

    public function users(Request $request, Company $company): JsonResponse
    {
        $users = $company->users()
            ->withPivot(['role', 'is_active', 'created_at'])
            ->orderByPivot('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return $this->successResponse(
            UserResource::collection($users)->response()->getData(true),
            "مستخدمو [{$company->name}]"
        );
    }

    public function addUser(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|max:50',
        ]);

        try {
            $already = DB::table('company_user')
                ->where('company_id', $company->id)
                ->where('user_id', $data['user_id'])
                ->exists();

            if ($already) {
                return $this->errorResponse('المستخدم موجود بالفعل في هذه الشركة', 422);
            }

            $company->users()->attach($data['user_id'], [
                'role'       => $data['role'] ?? 'member',
                'is_active'  => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->successResponse(null, 'تم إضافة المستخدم للشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'addUser');
        }
    }

    public function removeUser(Company $company, User $user): JsonResponse
    {
        try {
            $company->users()->detach($user->id);
            return $this->successResponse(null, 'تم إزالة المستخدم من الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'removeUser');
        }
    }

    public function toggleUserStatus(Company $company, User $user): JsonResponse
    {
        try {
            $membership = DB::table('company_user')
                ->where('company_id', $company->id)
                ->where('user_id', $user->id)
                ->first();

            if (!$membership) {
                return $this->errorResponse('المستخدم ليس عضواً في هذه الشركة', 404);
            }

            $newStatus = !$membership->is_active;

            DB::table('company_user')
                ->where('company_id', $company->id)
                ->where('user_id', $user->id)
                ->update(['is_active' => $newStatus, 'updated_at' => now()]);

            $statusText = $newStatus ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(['is_active' => $newStatus], $statusText);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'toggleUserStatus');
        }
    }

    protected function getService(): CompanyService { return $this->companyService; }
    protected function getModelClass(): string       { return Company::class; }
}

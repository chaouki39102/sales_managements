<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Core\Http\Controllers\Traits\ApiResponders;
use App\Http\Resources\CompanyResource;
use App\Http\Resources\UserResource;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminCompanyController extends Controller
{
    use ApiResponders;

    protected string $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    /**
     * عرض قائمة الشركات مع فلترة وبحث
     */
    public function index(Request $request): JsonResponse
    {
        $query = Company::query()
            ->withCount('users')
            ->with('owner:id,name,email')
            ->latest();

        // بحث
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // فلترة حسب الحالة
        if ($status = $request->get('status')) {
            match ($status) {
                'active'     => $query->where('active', true)->where('is_suspended', false),
                'suspended'  => $query->where('is_suspended', true),
                'inactive'   => $query->where('active', false),
                'verified'   => $query->whereNotNull('verified_at'),
                'unverified' => $query->whereNull('verified_at'),
                default      => null,
            };
        }

        // فلترة حسب الخطة
        if ($plan = $request->get('plan')) {
            $query->where('plan', $plan);
        }

        $companies = $query->paginate($request->get('per_page', 20));

        return $this->successResponse($companies, 'قائمة الشركات');
    }

    /**
     * إنشاء شركة جديدة
     */
    public function store(StoreCompanyRequest $request): JsonResponse
    {
        try {
            $company = Company::create($request->validated());
            return $this->successResponse(new CompanyResource($company), 'تم إنشاء الشركة', 201);
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل الإنشاء: ' . $e->getMessage(), 500, 'SERVER_ERROR');
        }
    }

    /**
     * عرض شركة محددة
     */
    public function show(Company $company): JsonResponse
    {
        $company->loadCount('users')->load('owner:id,name,email');
        return $this->successResponse(new CompanyResource($company));
    }

    /**
     * تحديث بيانات شركة
     */
    public function update(UpdateCompanyRequest $request, Company $company): JsonResponse
    {
        try {
            $company->update($request->validated());
            return $this->successResponse(new CompanyResource($company->fresh()), 'تم تحديث الشركة');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل التحديث', 500, 'SERVER_ERROR');
        }
    }

    /**
     * حذف شركة (soft delete)
     */
    public function destroy(Company $company): JsonResponse
    {
        try {
            $company->delete();
            return $this->successResponse(null, 'تم حذف الشركة');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل الحذف', 500, 'SERVER_ERROR');
        }
    }

    // ────────────────────────── إجراءات إضافية ──────────────────────────

    public function suspend(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate(['reason' => 'required|string|max:500']);
        try {
            $company->suspend($data['reason'], auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), "تم تعليق [{$company->name}]");
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function unsuspend(Company $company): JsonResponse
    {
        try {
            $company->unsuspend();
            return $this->successResponse(new CompanyResource($company->fresh()), "تم رفع التعليق");
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function activate(Company $company): JsonResponse
    {
        try {
            $company->activate();
            return $this->successResponse(new CompanyResource($company->fresh()), "تم التفعيل");
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function deactivate(Company $company): JsonResponse
    {
        try {
            $company->deactivate(auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), "تم الإيقاف");
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function verify(Company $company): JsonResponse
    {
        try {
            $company->verify(auth()->id());
            return $this->successResponse(new CompanyResource($company->fresh()), "تم التوثيق");
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function unverify(Company $company): JsonResponse
    {
        try {
            $company->unverify();
            return $this->successResponse(null, 'تم إلغاء التوثيق');
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function changePlan(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'plan'           => ['required', 'string', 'in:free,starter,professional,enterprise'],
            'max_users'      => 'nullable|integer|min:1',
            'max_warehouses' => 'nullable|integer|min:1',
            'max_products'   => 'nullable|integer|min:1',
        ]);

        try {
            $customLimits = array_filter([
                'max_users'      => $data['max_users'] ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products'] ?? null,
            ]);
            $company->upgradePlan($data['plan'], $customLimits ?: null);
            return $this->successResponse(new CompanyResource($company->fresh()), "تم تغيير الخطة إلى {$data['plan']}");
        } catch (\Throwable $e) {
            return $this->errorResponse($e->getMessage(), 422, 'BUSINESS_RULE');
        }
    }

    public function updateNotes(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate(['notes' => 'nullable|string|max:5000']);
        try {
            $company->update(['notes' => $data['notes']]);
            return $this->successResponse(null, 'تم تحديث الملاحظات');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل تحديث الملاحظات', 500, 'SERVER_ERROR');
        }
    }

    /**
     * عرض مستخدمي شركة معينة
     */
    public function users(Request $request, Company $company): JsonResponse
    {
        $users = $company->users()
            ->withPivot(['role', 'active', 'created_at'])
            ->orderByPivot('created_at', 'desc')
            ->paginate($request->get('per_page', 20));

        return $this->successResponse($users, "مستخدمو [{$company->name}]");
    }

    public function addUser(Request $request, Company $company): JsonResponse
    {
        $data = $request->validate([
            'user_id' => 'required|exists:users,id',
            'role'    => 'nullable|string|max:50',
        ]);

        try {
            $exists = DB::table('company_user')
                ->where('company_id', $company->id)
                ->where('user_id', $data['user_id'])
                ->exists();

            if ($exists) {
                return $this->errorResponse('المستخدم موجود بالفعل في هذه الشركة', 422, 'VALIDATION_ERROR');
            }

            $company->users()->attach($data['user_id'], [
                'role'       => $data['role'] ?? 'member',
                'active'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->successResponse(null, 'تم إضافة المستخدم للشركة');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل إضافة المستخدم', 500, 'SERVER_ERROR');
        }
    }

    public function removeUser(Company $company, User $user): JsonResponse
    {
        try {
            $company->users()->detach($user->id);
            return $this->successResponse(null, 'تم إزالة المستخدم من الشركة');
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل إزالة المستخدم', 500, 'SERVER_ERROR');
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
                return $this->errorResponse('المستخدم ليس عضواً في هذه الشركة', 404, 'NOT_FOUND');
            }

            $newStatus = !$membership->active;
            DB::table('company_user')
                ->where('company_id', $company->id)
                ->where('user_id', $user->id)
                ->update(['active' => $newStatus, 'updated_at' => now()]);

            $statusText = $newStatus ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم';
            return $this->successResponse(['active' => $newStatus], $statusText);
        } catch (\Throwable $e) {
            return $this->errorResponse('فشل تغيير حالة المستخدم', 500, 'SERVER_ERROR');
        }
    }
}

<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CompanyController extends BaseApiController
{
    protected string  $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(
        private readonly CompanyService        $companyService,
        private readonly CompanyContextService $context,
    ) {}

    protected function getService(): CompanyService
    {
        return $this->companyService;
    }
    protected function getModelClass(): string
    {
        return Company::class;
    }

    // ─── مساعد: يقبل id رقمي أو slug نصي ──────────────────────
    private function resolveCompany(string|int $identifier): Company
    {
        return is_numeric($identifier)
            ? Company::findOrFail((int) $identifier)
            : Company::where('slug', $identifier)->firstOrFail();
    }

    protected function getListConfig(): array
    {
        return [
            'search_fields'    => Company::$searchableFields,
            'filters'          => Company::$filterable,
            'sorts'            => Company::$sortable,
            'relations'        => Company::$allowedIncludes,
            'default_includes' => Company::$defaultWith,
            'default_sort'     => Company::$defaultSort,
            'default_per_page' => Company::$defaultPerPage,
            'per_page_limit'   => Company::$perPageLimit,
            'cache_ttl'        => Company::$cacheTtl,
            'cache_tags'       => Company::$cacheTags,
        ];
    }

    // ═══════════════════════════════════════════════════════════
    // ① index — قائمة الشركات
    // ═══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);

            $user  = auth()->user();
            $query = Company::query()->with(['owner:id,name,email']);

            // إذا لم يكن Super Admin → شركاته فقط
            if (!$user->isSuperAdmin()) {
                $query->whereHas('users', fn($q) => $q->where('user_id', $user->id));
            }

            // فلاتر الحالة للـ Super Admin
            if ($user->isSuperAdmin() && $request->filled('status')) {
                match ($request->status) {
                    'active'      => $query->active(),
                    'suspended'   => $query->suspended(),
                    'deactivated' => $query->deactivated(),
                    'verified'    => $query->verified(),
                    'trial'       => $query->onTrial(),
                    default       => null,
                };
            }

            // بحث
            if ($request->filled('search')) {
                $s = $request->search;
                $query->where(function ($q) use ($s) {
                    $q->where('name', 'like', "%{$s}%")
                        ->orWhere('commercial_name', 'like', "%{$s}%")
                        ->orWhere('email', 'like', "%{$s}%")
                        ->orWhere('nif', 'like', "%{$s}%")
                        ->orWhere('slug', 'like', "%{$s}%");
                });
            }

            $perPage   = min((int) $request->get('per_page', 20), 100);
            $companies = $query->orderBy('name')->paginate($perPage);

            return $this->successResponse(
                CompanyResource::collection($companies),
                'تم جلب قائمة الشركات'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ② store — إنشاء شركة جديدة
    // ═══════════════════════════════════════════════════════════


    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => 'required|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',
            'nif'             => 'nullable|string|max:50|unique:companies,nif',
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'activity'        => 'nullable|string|max:500',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'active'       => 'nullable|boolean',
            // حقول Super Admin
            'plan'            => 'nullable|string|in:free,starter,professional,enterprise',
            'max_users'       => 'nullable|integer|min:1',
            'max_warehouses'  => 'nullable|integer|min:1',
            'max_products'    => 'nullable|integer|min:1',
            'notes'           => 'nullable|string|max:5000',
        ]);

        // السماح لـ Super Admin فقط بتمرير حقول إضافية
        if (!auth()->user()->isSuperAdmin()) {
            unset($data['plan'], $data['max_users'], $data['max_warehouses'], $data['max_products'], $data['notes']);
        }

        try {
            $this->authorizeAction('create', Company::class);
            $company = $this->companyService->create($data, $request);
            // أضف هذا:
            $user = auth()->user();

            // ربط المالك بالشركة في company_user إن لم يكن موجوداً
            DB::table('company_user')->insertOrIgnore([
                'user_id'    => $user->id,
                'company_id' => $company->id,
                'role'       => 'owner',
                'active'     => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return $this->successResponse(new CompanyResource($company->load('owner:id,name,email')), 'تم إنشاء الشركة', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function update(Request $request, $id): JsonResponse
    {
        $company = $this->resolveCompany($id);
        $this->authorizeAction('update', $company);

        $data = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'commercial_name' => 'nullable|string|max:255',
            'email'           => 'nullable|email|max:100',
            'phone'           => 'nullable|string|max:20',
            'mobile'          => 'nullable|string|max:30',
            'address'         => 'nullable|string|max:500',
            'nif'             => "nullable|string|max:50|unique:companies,nif,{$company->id}",
            'nis'             => 'nullable|string|max:50',
            'rc'              => 'nullable|string|max:50',
            'ai'              => 'nullable|string|max:50',
            'activity'        => 'nullable|string|max:500',
            'legal_form_id'   => 'nullable|exists:legal_forms,id',
            'wilaya_id'       => 'nullable|exists:wilayas,id',
            'commune_id'      => 'nullable|exists:communes,id',
            'active'       => 'nullable|boolean',
            'plan'            => 'nullable|string|in:free,starter,professional,enterprise',
            'max_users'       => 'nullable|integer|min:1',
            'max_warehouses'  => 'nullable|integer|min:1',
            'max_products'    => 'nullable|integer|min:1',
            'notes'           => 'nullable|string|max:5000',
        ]);

        if (!auth()->user()->isSuperAdmin()) {
            unset($data['plan'], $data['max_users'], $data['max_warehouses'], $data['max_products'], $data['notes']);
        }

        try {
            $company = $this->companyService->update($company, $data, $request);
            return $this->successResponse(new CompanyResource($company->load('owner:id,name,email')), 'تم تحديث الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }
    // ═══════════════════════════════════════════════════════════
    // ③ show — عرض شركة واحدة
    // ═══════════════════════════════════════════════════════════

    public function show($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('view', $company);

            $company
                ->loadCount(['activeUsers', 'products', 'warehouses', 'parties'])
                ->load(['owner:id,name,email', 'legalForm:id,name', 'wilaya:id,name', 'commune:id,name']);

            return $this->successResponse(new CompanyResource($company));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ④ update — تحديث شركة (مالك أو Super Admin)
    // ═══════════════════════════════════════════════════════════


    // ═══════════════════════════════════════════════════════════
    // ⑤ destroy — تعطيل شركة (ليس حذفاً نهائياً)
    // ═══════════════════════════════════════════════════════════

    public function destroy($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('delete', $company);
            $company->deactivate(auth()->id());
            return $this->successResponse(null, 'تم تعطيل الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑥ Super Admin actions
    // ═══════════════════════════════════════════════════════════

    public function suspend(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('suspend', $company);
            $data = $request->validate(['reason' => 'nullable|string|max:500']);
            $company->suspend($data['reason'] ?? 'قرار إداري', auth()->id());
            return $this->successResponse(new CompanyResource($company), 'تم تعليق الشركة مؤقتاً');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'suspend');
        }
    }

    public function unsuspend($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('suspend', $company);
            $company->unsuspend();
            return $this->successResponse(new CompanyResource($company), 'تم رفع التعليق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unsuspend');
        }
    }

    public function verify($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('verify', $company);
            $company->verify(auth()->id());
            return $this->successResponse(new CompanyResource($company), 'تم توثيق الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'verify');
        }
    }

    public function unverify($id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('verify', $company);
            $company->unverify();
            return $this->successResponse(new CompanyResource($company), 'تم إلغاء التوثيق');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'unverify');
        }
    }

    public function upgradePlan(Request $request, $id): JsonResponse
    {
        try {
            $company = $this->resolveCompany($id);
            $this->authorizeAction('upgrade', $company);
            $data = $request->validate([
                'plan'           => ['required', 'string', Rule::in(array_keys(Company::PLANS))],
                'max_users'      => 'nullable|integer|min:1',
                'max_warehouses' => 'nullable|integer|min:1',
                'max_products'   => 'nullable|integer|min:1',
            ]);
            $company->upgradePlan($data['plan'], array_filter([
                'max_users'      => $data['max_users']      ?? null,
                'max_warehouses' => $data['max_warehouses'] ?? null,
                'max_products'   => $data['max_products']   ?? null,
            ]));
            return $this->successResponse(new CompanyResource($company), 'تم تحديث الخطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'upgradePlan');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ⑦ Company context & members (بدون تغيير)
    // ═══════════════════════════════════════════════════════════

    public function myCompanies(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);
            $companies = auth()->user()->companies()->with('owner:id,name')->get();
            return $this->successResponse(CompanyResource::collection($companies), 'شركاتك');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myCompanies');
        }
    }

    public function current(): JsonResponse
    {
        try {
            $companyId = $this->context->get();
            if (!$companyId) return $this->errorResponse('لا توجد شركة نشطة', 404, 'NO_ACTIVE_COMPANY');
            $company = $this->companyService->findById($companyId);
            $this->authorizeAction('view', $company);
            $company->load(['owner:id,name', 'legalForm:id,name', 'wilaya:id,name', 'commune:id,name']);
            return $this->successResponse(new CompanyResource($company), 'الشركة النشطة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'current');
        }
    }

    public function switch(Request $request): JsonResponse
    {
        try {
            $request->validate(['company_id' => 'required|integer|exists:companies,id']);
            $company = $this->companyService->findById($request->company_id);
            $this->authorizeAction('switch', $company);
            abort_if($company->is_suspended, 403, "الشركة معلّقة: {$company->suspension_reason}");
            abort_unless($company->active, 403, 'الشركة غير نشطة');
            $this->companyService->switchContext(auth()->user(), $company);
            return $this->successResponse(new CompanyResource($company), "تم التبديل إلى: {$company->name}");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'switch');
        }
    }

    public function members(Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            return $this->successResponse($this->companyService->getMembers($company), 'أعضاء الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'members');
        }
    }

    public function addMember(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $data = $request->validate([
                'user_id' => 'required|integer|exists:users,id',
                'role'    => ['nullable', 'string', Rule::in(Company::MEMBER_ROLES)],
            ]);
            $company->addMember($data['user_id'], $data['role'] ?? 'member', auth()->id());
            return $this->successResponse(null, 'تمت إضافة العضو', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'addMember');
        }
    }

    public function removeMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->removeMember($userId);
            return $this->successResponse(null, 'تمت إزالة العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'removeMember');
        }
    }

    public function changeMemberRole(Request $request, Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $data = $request->validate(['role' => ['required', 'string', Rule::in(Company::MEMBER_ROLES)]]);
            $company->changeMemberRole($userId, $data['role']);
            return $this->successResponse(null, 'تم تغيير الدور');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changeMemberRole');
        }
    }

    public function deactivateMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->deactivateMember($userId);
            return $this->successResponse(null, 'تم تعطيل العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'deactivateMember');
        }
    }

    public function activateMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->activateMember($userId);
            return $this->successResponse(null, 'تم إعادة تفعيل العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'activateMember');
        }
    }

    public function transferOwnership(Request $request, Company $company): JsonResponse
    {
        try {
            $this->authorizeAction('transferOwnership', $company);
            $data = $request->validate(['user_id' => 'required|integer|exists:users,id']);
            $company->transferOwnership($data['user_id']);
            return $this->successResponse(new CompanyResource($company->fresh(['owner:id,name,email'])), 'تم نقل الملكية');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'transferOwnership');
        }
    }
}

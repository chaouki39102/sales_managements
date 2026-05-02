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
use Illuminate\Validation\Rule;

/**
 * CompanyController
 *
 * يتبع نمط BaseApiController (البوّاب).
 * كل المنطق في CompanyService.
 */
class CompanyController extends BaseApiController
{
    protected string  $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(
        private readonly CompanyService        $companyService,
        private readonly CompanyContextService $context,
    ) {
        parent::__construct();
    }

    // ═══════════════════════════════════════════════════════════
    // الإجباريات لـ BaseApiController
    // ═══════════════════════════════════════════════════════════

    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
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
    // ① CRUD — مع دعم الفلاتر حسب صلاحيات المستخدم
    // ═══════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);

            $data = $this->apiListWithCallback(
                Company::class,
                function ($query) use ($request) {
                    $user = auth()->user();

                    // المستخدم العادي: فقط الشركات التي يملكها أو عضو فيها
                    if (!$user->isSuperAdmin()) {
                        $query->whereHas('members', fn($q) => $q->where('user_id', $user->id));
                    }

                    // فلاتر إضافية للسوبر أدمن
                    if ($user->isSuperAdmin() && $request->filled('status')) {
                        match ($request->status) {
                            'active'      => $query->active(),
                            'suspended'   => $query->suspended(),
                            'deactivated' => $query->deactivated(),
                            'verified'    => $query->verified(),
                            'on_trial'    => $query->onTrial(),
                            default       => null,
                        };
                    }

                    $query->with(['owner:id,name,email']);
                },
                $request,
                $this->getListConfig(),
            );

            return $this->successResponse($data, 'تم جلب قائمة الشركات');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        try {
            $this->authorizeAction('create', Company::class);
            $company = $this->companyService->create($request->validated(), $request);
            return $this->successResponse(new CompanyResource($company), 'تم إنشاء الشركة بنجاح', 201);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'store');
        }
    }

    public function show($id): JsonResponse
    {
        try {
            $company = $this->companyService->findById($id);
            $this->authorizeAction('view', $company);
            $company->loadCount(['activeUsers', 'products', 'warehouses', 'parties'])
                    ->load(['owner:id,name,email', 'legalForm:id,name', 'wilaya:id,name', 'commune:id,name']);
            return $this->successResponse(new CompanyResource($company));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    public function update(UpdateCompanyRequest $request, $id): JsonResponse
    {
        try {
            $company = $this->companyService->findById($id);
            $this->authorizeAction('update', $company);
            $company = $this->companyService->update($company, $request->validated(), $request);
            return $this->successResponse(new CompanyResource($company), 'تم تحديث بيانات الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'update');
        }
    }

    public function destroy($id): JsonResponse
    {
        try {
            $company = $this->companyService->findById($id);
            $this->authorizeAction('delete', $company);
            $this->companyService->delete($company);
            return $this->successResponse(null, 'تم إيقاف الشركة');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'destroy');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ② شركات المستخدم الحالي
    // ═══════════════════════════════════════════════════════════

    public function myCompanies(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);
            $data = $this->apiListWithCallback(
                Company::class,
                fn($query) => $query->whereHas('members', fn($q) => $q->where('user_id', auth()->id())),
                $request,
                $this->getListConfig(),
            );
            return $this->successResponse($data, 'تم جلب شركاتك');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'myCompanies');
        }
    }

    public function current(): JsonResponse
    {
        try {
            $companyId = $this->context->get();
            if (!$companyId) {
                return $this->errorResponse('لا توجد شركة نشطة حالياً', 404, 'NO_ACTIVE_COMPANY');
            }
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
            abort_if($company->is_suspended, 403, "الشركة معلّقة مؤقتاً: {$company->suspension_reason}");
            abort_unless($company->is_active, 403, 'الشركة غير نشطة');
            $this->companyService->switchContext(auth()->user(), $company, $this->context);
            return $this->successResponse(new CompanyResource($company), "تم التبديل إلى شركة: {$company->name}");
        } catch (\Throwable $e) {
            return $this->handleError($e, 'switch');
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ③ إدارة الأعضاء (بدون تغيير جوهري)
    // ═══════════════════════════════════════════════════════════

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
                'role'    => ['nullable', 'string', Rule::in(['admin', 'manager', 'member', 'viewer'])],
            ]);
            $company->addMember($data['user_id'], $data['role'] ?? 'member', auth()->id());
            return $this->successResponse(null, 'تمت إضافة العضو بنجاح', 201);
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
            $data = $request->validate(['role' => ['required', 'string', Rule::in(['admin', 'manager', 'member', 'viewer'])]]);
            $company->changeMemberRole($userId, $data['role']);
            return $this->successResponse(null, 'تم تغيير دور العضو');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'changeMemberRole');
        }
    }

    public function deactivateMember(Company $company, int $userId): JsonResponse
    {
        try {
            $this->authorizeAction('manageMember', $company);
            $company->deactivateMember($userId);
            return $this->successResponse(null, 'تم تعطيل العضو مؤقتاً');
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
            return $this->successResponse(new CompanyResource($company->fresh(['owner:id,name,email'])), 'تم نقل الملكية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'transferOwnership');
        }
    }

}

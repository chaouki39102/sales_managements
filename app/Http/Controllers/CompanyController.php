<?php
// app/Http/Controllers/Api/V1/CompanyController.php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Requests\StoreCompanyRequest;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use App\Services\CompanyService;
use App\Models\Company;
use App\Services\CompanyContextService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyController extends BaseApiController
{
    protected string $resourceName = 'company';
    protected ?string $resourceClass = CompanyResource::class;

    public function __construct(
        private CompanyService $companyService,
        private CompanyContextService $context
    ) {
        parent::__construct();
    }

    /**
     * قائمة شركات المستخدم الحالي (تجاوز للدالة الأصلية)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Company::class);
            $companies = $this->companyService->getUserCompanies();
            return $this->successResponse(CompanyResource::collection($companies));
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    /**
     * تبديل السياق إلى شركة أخرى (دالة إضافية)
     */
    public function switch(Request $request): JsonResponse
    {
        try {
            $request->validate(['company_id' => 'required|exists:companies,id']);
            $company = Company::findOrFail($request->company_id);
            $user = auth()->user();

            if (!$user->companies->contains($company->id)) {
                return $this->errorResponse('لا تملك صلاحية الوصول لهذه الشركة.', 403);
            }

            $this->context->set($company->id);
            session(['current_company_id' => $company->id, 'current_company_slug' => $company->slug]);

            return $this->successResponse(['company' => new CompanyResource($company)], 'تم التبديل إلى الشركة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'switch');
        }
    }

    /**
     * الشركة النشطة حالياً
     */
    public function current(): JsonResponse
    {
        $companyId = $this->context->get();
        if (!$companyId) {
            return $this->errorResponse('لا توجد شركة نشطة حالياً.', 404);
        }
        $company = Company::find($companyId);
        return $this->successResponse(new CompanyResource($company), 'الشركة النشطة');
    }

    // ========== الإجباريات لـ BaseApiController ==========

    protected function getService(): CompanyService
    {
        return $this->companyService;
    }

    protected function getModelClass(): string
    {
        return Company::class;
    }

    // optional: يمكن تخصيص قواعد index الافتراضية إذا أردت
    protected function getListConfig(): array
    {
        return [
            'search_fields'   => Company::$searchableFields ?? ['name', 'commercial_name'],
            'filters'         => Company::$filterable ?? ['is_active'],
            'sorts'           => Company::$sortable ?? ['id', 'name', 'created_at'],
            'relations'       => Company::$allowedIncludes ?? [],
            'default_includes'=> [],
            'default_sort'    => 'name',
            'default_per_page'=> 15,
            'per_page_limit'  => 100,
        ];
    }
}

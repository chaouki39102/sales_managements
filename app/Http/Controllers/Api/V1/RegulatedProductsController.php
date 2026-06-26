<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Fiscal\RegulatedProductsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RegulatedProductsController extends Controller
{
    public function __construct(
        private readonly RegulatedProductsService $regulatedProductsService,
    ) {}

    public function index(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $activeOnly = $request->boolean('active_only', true);
            $products   = $this->regulatedProductsService->getList($company->id, $activeOnly);

            return response()->json([
                'status' => 'success',
                'data'   => $products,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'product_key'        => 'required|string|max:80',
                'label'              => 'required|string|max:200',
                'unit_label'         => 'required|string|max:50',
                'category'           => 'required|string|max:50',
                'regulated_max_price'=> 'required|numeric|min:0',
                'regulated_margin'   => 'nullable|numeric|min:0',
                'regulation_type'    => 'string|in:price,margin',
                'legal_reference'    => 'nullable|string|max:255',
                'effective_date'     => 'nullable|date',
                'active'             => 'boolean',
                'notes'              => 'nullable|string|max:500',
            ]);

            $product = $this->regulatedProductsService->create(
                $company->id,
                $validated,
                auth()->id(),
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'تمت إضافة المادة المقنَّنة بنجاح',
                'data'    => $product,
            ], 201);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'product_key'        => 'sometimes|string|max:80',
                'label'              => 'sometimes|string|max:200',
                'unit_label'         => 'sometimes|string|max:50',
                'category'           => 'sometimes|string|max:50',
                'regulated_max_price'=> 'sometimes|numeric|min:0',
                'regulated_margin'   => 'nullable|numeric|min:0',
                'regulation_type'    => 'sometimes|string|in:price,margin',
                'legal_reference'    => 'nullable|string|max:255',
                'effective_date'     => 'nullable|date',
                'active'             => 'boolean',
                'notes'              => 'nullable|string|max:500',
            ]);

            $product = $this->regulatedProductsService->update($id, $validated, auth()->id());

            return response()->json([
                'status'  => 'success',
                'message' => 'تم تحديث المادة المقنَّنة بنجاح',
                'data'    => $product,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function toggle(Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $product = $this->regulatedProductsService->toggle($id);

            return response()->json([
                'status'  => 'success',
                'message' => $product->active ? 'تم تفعيل المادة' : 'تم تعطيل المادة',
                'data'    => $product,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Company $company, int $id): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $this->regulatedProductsService->delete($id);

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حذف المادة المقنَّنة',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function seedDefaults(Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $this->regulatedProductsService->seedDefaults($company->id);

            return response()->json([
                'status'  => 'success',
                'message' => 'تمت استعادة القائمة الافتراضية للمواد المقنَّنة',
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

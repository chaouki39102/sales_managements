<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Fiscal\G50DeclarationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class G50DeclarationController extends Controller
{
    public function __construct(
        private readonly G50DeclarationService $g50DeclarationService,
    ) {}

    public function show(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $fiscalYearId = $request->integer('fiscal_year_id');
            $month        = $request->integer('month');

            if (!$fiscalYearId || !$month) {
                return response()->json(['status' => 'error', 'message' => 'fiscal_year_id و month مطلوبان'], 422);
            }

            $declaration = $this->g50DeclarationService->getDeclaration(
                $company->id,
                $fiscalYearId,
                $month,
            );

            return response()->json([
                'status' => 'success',
                'data'   => $declaration,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function savePeriod(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('update', $company);

            $validated = $request->validate([
                'fiscal_year_id' => 'required|integer|exists:fiscal_years,id',
                'month'          => 'required|integer|min:1|max:12',
                'form_type'      => 'required|string|in:g50',
                'tva_collectee'  => 'numeric|min:0',
                'tva_deductible' => 'numeric|min:0',
                'tva_carry_fwd'  => 'numeric|min:0',
                'tva_net'        => 'numeric',
                'tva_due'        => 'numeric|min:0',
                'timbre_fiscal'  => 'numeric|min:0',
                'amount_due'     => 'numeric|min:0',
                'amount_paid'    => 'numeric|min:0',
                'status'         => 'string|in:draft,submitted,paid',
                'submitted_at'   => 'nullable|date',
                'paid_at'        => 'nullable|date',
                'notes'          => 'nullable|string|max:1000',
            ]);

            $period = $this->g50DeclarationService->savePeriod(
                $company->id,
                $validated,
                auth()->id(),
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حفظ تصريح G50',
                'data'    => $period,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function history(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $fiscalYearId = $request->integer('fiscal_year_id');

            if (!$fiscalYearId) {
                return response()->json(['status' => 'error', 'message' => 'fiscal_year_id مطلوب'], 422);
            }

            $history = $this->g50DeclarationService->getHistory($company->id, $fiscalYearId);

            return response()->json([
                'status' => 'success',
                'data'   => $history,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

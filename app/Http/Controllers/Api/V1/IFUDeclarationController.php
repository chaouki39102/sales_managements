<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Services\Fiscal\IFUDeclarationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class IFUDeclarationController extends Controller
{
    public function __construct(
        private readonly IFUDeclarationService $iFUDeclarationService,
    ) {}

    public function show(Request $request, Company $company): JsonResponse
    {
        try {
            Gate::authorize('view', $company);

            $fiscalYearId = $request->integer('fiscal_year_id');
            $month        = $request->integer('month');

            if (!$fiscalYearId) {
                return response()->json(['status' => 'error', 'message' => 'fiscal_year_id مطلوب'], 422);
            }

            $declaration = $this->iFUDeclarationService->getDeclaration(
                $company->id,
                $fiscalYearId,
                $month ?: null,
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
                'form_type'      => 'required|string|in:g12,g12bis',
                'month'          => 'nullable|integer|min:1|max:12',
                'ifu_subsidized' => 'numeric|min:0',
                'ifu_other'      => 'numeric|min:0',
                'ifu_total'      => 'numeric|min:0',
                'ifu_minimum'    => 'numeric|min:0',
                'amount_due'     => 'numeric|min:0',
                'amount_paid'    => 'numeric|min:0',
                'status'         => 'string|in:draft,submitted,paid',
                'submitted_at'   => 'nullable|date',
                'paid_at'        => 'nullable|date',
                'notes'          => 'nullable|string|max:1000',
            ]);

            $period = $this->iFUDeclarationService->savePeriod(
                $company->id,
                $validated,
                auth()->id(),
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'تم حفظ تصريح IFU',
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

            $history = $this->iFUDeclarationService->getHistory($company->id, $fiscalYearId);

            return response()->json([
                'status' => 'success',
                'data'   => $history,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}

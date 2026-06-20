<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Models\ApprovalThreshold;
use App\Services\ApprovalWorkflowService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalController extends BaseApiController
{
    protected string $resourceName = 'approval_threshold';

    public function __construct(
        private ApprovalWorkflowService $approvalService,
    ) {
        parent::__construct();
    }

    public function check($company, int $documentId): JsonResponse
    {
        try {
            $document = \App\Models\CommercialDocument::findOrFail($documentId);
            $requiresApproval = $this->approvalService->requiresApproval($document);
            $threshold = $this->approvalService->findThreshold($document);

            return response()->json([
                'requires_approval' => $requiresApproval,
                'threshold' => $threshold ? [
                    'id' => $threshold->id,
                    'min_amount' => (float) $threshold->min_amount,
                    'max_amount' => $threshold->max_amount ? (float) $threshold->max_amount : null,
                    'role_id' => $threshold->role_id,
                ] : null,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function submit($company, int $documentId): JsonResponse
    {
        try {
            $document = \App\Models\CommercialDocument::findOrFail($documentId);
            $updated = $this->approvalService->submitForApproval($document);

            return response()->json([
                'message' => 'تم إرسال المستند للموافقة',
                'document' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function approve(Request $request, $company, int $documentId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'reason' => 'nullable|string|max:1000',
            ]);

            $document = \App\Models\CommercialDocument::findOrFail($documentId);
            $updated = $this->approvalService->approve($document, auth()->id(), $validated['reason'] ?? null);

            return response()->json([
                'message' => 'تمت الموافقة على المستند',
                'document' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function reject(Request $request, $company, int $documentId): JsonResponse
    {
        try {
            $validated = $request->validate([
                'reason' => 'required|string|max:1000',
            ]);

            $document = \App\Models\CommercialDocument::findOrFail($documentId);
            $updated = $this->approvalService->reject($document, auth()->id(), $validated['reason']);

            return response()->json([
                'message' => 'تم رفض المستند',
                'document' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function thresholds($company): JsonResponse
    {
        try {
            $thresholds = ApprovalThreshold::where('company_id', (int) $company)->get();
            return response()->json($thresholds);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function storeThreshold(Request $request, $company): JsonResponse
    {
        try {
            $validated = $request->validate([
                'document_type_id' => 'required|integer|exists:document_types,id',
                'min_amount' => 'required|numeric|min:0',
                'max_amount' => 'nullable|numeric|min:0',
                'role_id' => 'nullable|integer|exists:roles,id',
                'notes' => 'nullable|string|max:500',
                'is_active' => 'nullable|boolean',
            ]);

            $threshold = ApprovalThreshold::create(array_merge($validated, [
                'company_id' => (int) $company,
                'created_by' => auth()->id(),
                'is_active' => $validated['is_active'] ?? true,
            ]));

            return response()->json($threshold, 201);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}

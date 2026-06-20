<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\BankReconciliationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BankReconciliationController extends BaseApiController
{
    public function __construct(
        private BankReconciliationService $reconciliationService,
    ) {
        parent::__construct();
    }

    public function unreconciled($company): JsonResponse
    {
        try {
            $data = $this->reconciliationService->getUnreconciledPayments();
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function reconciled($company): JsonResponse
    {
        try {
            $data = $this->reconciliationService->getReconciled();
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function reconcile(Request $request, $company): JsonResponse
    {
        try {
            $validated = $request->validate([
                'payment_id' => 'required|integer|exists:payments,id',
                'bank_reference' => 'required|string|max:255',
                'notes' => 'nullable|string|max:1000',
            ]);

            $payment = $this->reconciliationService->reconcile(
                (int) $validated['payment_id'],
                $validated['bank_reference'],
                $validated['notes'] ?? null,
            );

            return response()->json([
                'message' => 'تمت المطابقة بنجاح',
                'payment' => $payment,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function bulkReconcile(Request $request, $company): JsonResponse
    {
        try {
            $validated = $request->validate([
                'matches' => 'required|array',
                'matches.*.payment_id' => 'required|integer|exists:payments,id',
                'matches.*.bank_reference' => 'required|string|max:255',
                'matches.*.notes' => 'nullable|string|max:1000',
            ]);

            $results = $this->reconciliationService->bulkReconcile($validated['matches']);

            return response()->json([
                'message' => 'تمت المطابقة الجماعية بنجاح',
                'count' => count($results),
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function unreconcile($company, int $paymentId): JsonResponse
    {
        try {
            $payment = $this->reconciliationService->unreconcile($paymentId);
            return response()->json([
                'message' => 'تم إلغاء المطابقة بنجاح',
                'payment' => $payment,
            ]);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function suggestMatches(Request $request, $company): JsonResponse
    {
        try {
            $validated = $request->validate([
                'statements' => 'required|array',
                'statements.*.amount' => 'required|numeric',
                'statements.*.date' => 'nullable|date',
                'statements.*.reference' => 'nullable|string|max:255',
            ]);

            $suggestions = $this->reconciliationService->suggestMatches($validated['statements']);

            return response()->json($suggestions);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}

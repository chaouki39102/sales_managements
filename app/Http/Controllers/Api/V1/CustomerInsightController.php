<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\CustomerInsightService;
use App\Services\ProductSuggestionService;
use App\Services\AdvancePaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerInsightController extends BaseApiController
{
    public function __construct(
        private CustomerInsightService    $insightService,
        private ProductSuggestionService  $suggestionService,
        private AdvancePaymentService     $advanceService,
    ) {
        parent::__construct();
    }

    public function insights($company, $partyId): JsonResponse
    {
        try {
            $data = $this->insightService->getInsights((int) $partyId);
            if (empty($data)) {
                return response()->json(['message' => 'Party not found'], 404);
            }
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function productSuggestions(Request $request, $company, $partyId): JsonResponse
    {
        try {
            $isPurchase = $request->boolean('is_purchase');
            $limit      = min((int) $request->integer('limit', 5), 20);
            $data       = $this->suggestionService->getSuggestions((int) $partyId, $limit, $isPurchase);
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }

    public function advances($company, $partyId): JsonResponse
    {
        try {
            $data = $this->advanceService->getAvailableAdvances((int) $partyId);
            return response()->json($data);
        } catch (\Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 500);
        }
    }
}

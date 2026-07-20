<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\PartyBalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PartyBalanceController extends BaseApiController
{
    protected string $resourceName = 'party_balance';
    protected ?string $resourceClass = null; // لا نحتاج Resource

    public function __construct(private PartyBalanceService $balanceService)
    {
        parent::__construct();
    }

    /**
     * GET /{company}/party-balances
     * الفلاتر المدعومة: date, party_type_id, search (يدعمها ApiListService)
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', \App\Models\Party::class);

            $date = $request->input('date', now()->toDateString());
            $partyTypeId = $request->input('party_type_id');
            $search = $request->input('search');

            $balances = $this->balanceService->getAllBalancesAt($date, $partyTypeId, $search);

            return $this->successResponse($balances, 'تم جلب الأرصدة بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'index');
        }
    }

    /**
     * GET /{company}/party-balances/{partyId}
     */
    public function show($id): JsonResponse
    {
        try {
            $this->authorizeAction('view', \App\Models\Party::class);
            $partyId = $this->extractId($id);
            $date = request()->input('date', now()->toDateString());
            $balance = $this->balanceService->getBalanceAt($partyId, $date);
            return $this->successResponse($balance, 'تم جلب الرصيد بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'show');
        }
    }

    // لا نحتاج store/update/destroy لأن الأرصدة تُحسب تلقائياً أو تُعدّل عبر نقاط أخرى

    /**
     * GET /{company}/party-balances/{partyId}/history
     * سجل المعاملات (مستندات + دفعات) لطرف محدد حتى تاريخ معين
     */
    public function history($id): JsonResponse
    {
        try {
            $this->authorizeAction('view', \App\Models\Party::class);
            $partyId = $this->extractId($id);
            $date    = request()->input('date', now()->toDateString());
            $history = $this->balanceService->getHistory($partyId, $date);
            return $this->successResponse($history, 'تم جلب سجل المعاملات بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'history');
        }
    }

    /**
     * GET /{company}/party-balances/{partyId}/product-recap
     * ملخص المنتجات التي تعاملت معها الجهة حتى تاريخ معين
     */
    public function productRecap($id): JsonResponse
    {
        try {
            $this->authorizeAction('view', \App\Models\Party::class);
            $partyId = $this->extractId($id);
            $date    = request()->input('date', now()->toDateString());
            $recap   = $this->balanceService->getProductRecap($partyId, $date);
            return $this->successResponse($recap, 'تم جلب ملخص المنتجات بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'productRecap');
        }
    }

    /**
     * GET /{company}/party-balances/{partyId}/detailed-history
     * سجل المعاملات التفصيلي مع بنود كل مستند
     */
    public function detailedHistory($id): JsonResponse
    {
        try {
            $this->authorizeAction('view', \App\Models\Party::class);
            $partyId = $this->extractId($id);
            $date    = request()->input('date', now()->toDateString());
            $history = $this->balanceService->getDetailedHistory($partyId, $date);
            return $this->successResponse($history, 'تم جلب السجل التفصيلي بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'detailedHistory');
        }
    }
}

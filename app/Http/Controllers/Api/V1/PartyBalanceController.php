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
}

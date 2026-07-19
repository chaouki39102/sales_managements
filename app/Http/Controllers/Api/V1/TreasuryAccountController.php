<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountResource;
use App\Services\TreasuryAccountService;
use App\Services\TreasuryBalanceService;
use App\Models\TreasuryAccount;
use App\Models\FiscalYear;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryAccountController extends BaseApiController
{
    protected string $resourceName = 'treasury_account';
    protected ?string $resourceClass = TreasuryAccountResource::class;

    public function __construct(
        private TreasuryAccountService $treasuryAccountService,
        private TreasuryBalanceService $treasuryBalanceService,
    ) {
        parent::__construct();
    }

    protected function getListData(Request $request): mixed
    {
        $data = parent::getListData($request);

        $yearId = $request->integer('fiscal_year_id')
            ?? $request->input('filter.fiscal_year_id');

        if (!$yearId || !($data instanceof \Illuminate\Pagination\LengthAwarePaginator)) {
            return $data;
        }

        $fiscalYear = FiscalYear::withoutGlobalScopes()->find($yearId);
        if (!$fiscalYear) {
            return $data;
        }

        $date = $fiscalYear->end_date->toDateString();
        $balances = $this->treasuryBalanceService->getAllTreasuryBalancesAt($date);
        $balanceMap = collect($balances)->mapWithKeys(fn($b) => [
            $b['treasury_account_id'] => $b['current_balance'],
        ])->all();

        $data->getCollection()->transform(function ($account) use ($balanceMap) {
            if (isset($balanceMap[$account->id])) {
                $account->current_balance = $balanceMap[$account->id];
            }
            return $account;
        });

        return $data;
    }

    public function bankAccounts(Request $request): JsonResponse
    {
        try {
            $accounts = $this->treasuryAccountService->getBankAccounts();
            return $this->successResponse(TreasuryAccountResource::collection($accounts), 'تم جلب الحسابات البنكية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'bankAccounts');
        }
    }

    public function cashAccounts(Request $request): JsonResponse
    {
        try {
            $accounts = $this->treasuryAccountService->getCashAccounts();
            return $this->successResponse(TreasuryAccountResource::collection($accounts), 'تم جلب الحسابات النقدية بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'cashAccounts');
        }
    }

    public function default(Request $request): JsonResponse
    {
        try {
            $account = $this->treasuryAccountService->getDefault();
            return $this->successResponse($account ? new TreasuryAccountResource($account) : null, 'تم جلب الحساب الافتراضي بنجاح');
        } catch (\Throwable $e) {
            return $this->handleError($e, 'default');
        }
    }

    protected function getService(): TreasuryAccountService
    {
        return $this->treasuryAccountService;
    }

    protected function getModelClass(): string
    {
        return TreasuryAccount::class;
    }
}
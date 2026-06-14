<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountResource;
use App\Services\TreasuryAccountService;
use App\Models\TreasuryAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TreasuryAccountController extends BaseApiController
{
    protected string $resourceName = 'treasury_account';
    protected ?string $resourceClass = TreasuryAccountResource::class;

    public function __construct(private TreasuryAccountService $treasuryAccountService)
    {
        parent::__construct();
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
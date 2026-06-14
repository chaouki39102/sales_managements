<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TreasuryAccountTypeResource;
use App\Services\TreasuryAccountTypeService;
use App\Models\TreasuryAccountType;

class TreasuryAccountTypeController extends BaseApiController
{
    protected string $resourceName = 'treasury_account_type';
    protected ?string $resourceClass = TreasuryAccountTypeResource::class;

    public function __construct(private TreasuryAccountTypeService $treasuryAccountTypeService)
    {
        parent::__construct();
    }

    protected function getService(): TreasuryAccountTypeService
    {
        return $this->treasuryAccountTypeService;
    }

    protected function getModelClass(): string
    {
        return TreasuryAccountType::class;
    }
}

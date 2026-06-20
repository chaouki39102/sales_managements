<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\OpeningBalanceTreasuryResource;
use App\Services\OpeningBalanceTreasuryService;
use App\Models\OpeningBalanceTreasury;

class OpeningBalanceTreasuryController extends BaseApiController
{
    protected string $resourceName = 'opening_balance_treasury';
    protected ?string $resourceClass = OpeningBalanceTreasuryResource::class;

    public function __construct(private OpeningBalanceTreasuryService $openingBalanceTreasuryService)
    {
        parent::__construct();
    }

    protected function getService(): OpeningBalanceTreasuryService
    {
        return $this->openingBalanceTreasuryService;
    }

    protected function getModelClass(): string
    {
        return OpeningBalanceTreasury::class;
    }
}

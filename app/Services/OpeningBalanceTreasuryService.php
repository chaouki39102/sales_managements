<?php

namespace App\Services;

use App\Models\OpeningBalanceTreasury;

class OpeningBalanceTreasuryService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceTreasury::class;
    protected string $resourceName = 'opening_balance_treasury';
    protected array $defaultWith = ['fiscalYear', 'treasuryAccount'];
    protected function getResourceName(): string { return $this->resourceName; }
}

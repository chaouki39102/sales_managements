<?php

namespace App\Services;

use App\Models\TreasuryAccountType;

class TreasuryAccountTypeService extends \App\Core\Services\BaseService
{
    protected string $model = TreasuryAccountType::class;
    protected string $resourceName = 'treasury_account_type';
}

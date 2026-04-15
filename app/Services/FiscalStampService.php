<?php

namespace App\Services;

use App\Models\FiscalStamp;

class FiscalStampService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalStamp::class;
    protected string $resourceName = 'fiscal_stamp';
}

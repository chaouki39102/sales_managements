<?php

namespace App\Services;

use App\Models\FiscalYear;

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';
}

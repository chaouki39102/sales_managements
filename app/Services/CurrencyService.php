<?php

namespace App\Services;

use App\Models\Currency;

/**
 * Currency Service
 *
 * @package App\Services
 */
class CurrencyService extends \App\Core\Services\BaseService
{
    protected string $model = Currency::class;
    protected string $resourceName = 'currency';
}

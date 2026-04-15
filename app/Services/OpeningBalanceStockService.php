<?php

namespace App\Services;

use App\Models\OpeningBalanceStock;
use Illuminate\Http\Request;

class OpeningBalanceStockService extends \App\Core\Services\BaseService
{
    protected string $model = OpeningBalanceStock::class;
    protected string $resourceName = 'opening_balance_stock';
    protected array $defaultWith = ['fiscalYear', 'productVariant', 'warehouse'];
}
<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CurrencyResource;
use App\Services\CurrencyService;
use App\Models\Currency;
use Illuminate\Http\JsonResponse;

/**
 * Currency Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class CurrencyController extends BaseApiController
{
    protected string $resourceName = 'currency';
    protected ?string $resourceClass = CurrencyResource::class;

    public function __construct(private CurrencyService $currencyService)
    {
        parent::__construct();
    }

    protected function getService(): CurrencyService
    {
        return $this->currencyService;
    }

    protected function getModelClass(): string
    {
        return Currency::class;
    }
}

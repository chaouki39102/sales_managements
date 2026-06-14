<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\QuantityDiscountResource;
use App\Services\QuantityDiscountService;
use App\Models\QuantityDiscount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuantityDiscountController extends BaseApiController
{
    protected string $resourceName = 'quantity_discount';
    protected ?string $resourceClass = QuantityDiscountResource::class;

    public function __construct(private QuantityDiscountService $quantityDiscountService)
    {
        parent::__construct();
    }

    protected function getService(): QuantityDiscountService
    {
        return $this->quantityDiscountService;
    }

    protected function getModelClass(): string
    {
        return QuantityDiscount::class;
    }
}
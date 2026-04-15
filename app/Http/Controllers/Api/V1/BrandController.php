<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\BrandResource;
use App\Services\BrandService;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;

/**
 * Brand Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class BrandController extends BaseApiController
{
    protected string $resourceName = 'brand';
    protected ?string $resourceClass = BrandResource::class;

    public function __construct(private BrandService $brandService)
    {
        parent::__construct();
    }

    protected function getService(): BrandService
    {
        return $this->brandService;
    }

    protected function getModelClass(): string
    {
        return Brand::class;
    }
}

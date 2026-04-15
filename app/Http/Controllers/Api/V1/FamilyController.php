<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\FamilyResource;
use App\Services\FamilyService;
use App\Models\Family;
use Illuminate\Http\JsonResponse;

/**
 * Family Controller
 *
 * @package App\Http\Controllers\Api\V1
 */
class FamilyController extends BaseApiController
{
    protected string $resourceName = 'family';
    protected ?string $resourceClass = FamilyResource::class;

    public function __construct(private FamilyService $familyService)
    {
        parent::__construct();
    }

    protected function getService(): FamilyService
    {
        return $this->familyService;
    }

    protected function getModelClass(): string
    {
        return Family::class;
    }
}

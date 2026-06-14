<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\GenderResource;
use App\Services\GenderService;
use App\Models\Gender;

class GenderController extends BaseApiController
{
    protected string $resourceName = 'gender';
    protected ?string $resourceClass = GenderResource::class;

    public function __construct(private GenderService $genderService)
    {
        parent::__construct();
    }

    protected function getService(): GenderService
    {
        return $this->genderService;
    }

    protected function getModelClass(): string
    {
        return Gender::class;
    }
}

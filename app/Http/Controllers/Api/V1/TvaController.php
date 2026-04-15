<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\TvaResource;
use App\Services\TvaService;

class TvaController extends BaseApiController
{
    protected string $resourceName = 'tva';
    protected ?string $resourceClass = TvaResource::class;

    public function __construct(private TvaService $tvaService)
    {
        parent::__construct();
    }

    public function default(\Illuminate\Http\Request $request): \Illuminate\Http\JsonResponse
    {
        try {
            $rate = $this->tvaService->getDefaultRate();
            return $this->successResponse(['rate' => $rate]);
        } catch (\Throwable $e) {
            return $this->handleError($e, 'default');
        }
    }

    protected function getService(): TvaService
    {
        return $this->tvaService;
    }

    protected function getModelClass(): string
    {
        return \App\Models\Tva::class;
    }
}
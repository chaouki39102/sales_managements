<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CommuneResource;
use App\Services\CommuneService;
use App\Models\Commune;
use Illuminate\Http\JsonResponse;

class CommuneController extends BaseApiController
{
    protected string $resourceName = 'commune';
    protected ?string $resourceClass = CommuneResource::class;

    public function __construct(private CommuneService $communeService)
    {
        parent::__construct();
    }

    protected function getService(): CommuneService
    {
        return $this->communeService;
    }

    protected function getModelClass(): string
    {
        return Commune::class;
    }
    /**
     * جلب جميع البلديات التابعة لولاية معينة
     */
    public function byWilaya(Request $request, int $wilayaId): JsonResponse
    {
        try {
            $this->authorizeAction('viewAny', Commune::class);

            $communes = Commune::where('wilaya_id', $wilayaId)
                ->orderBy('name')
                ->get();

            return $this->successResponse(
                CommuneResource::collection($communes),
                'تم جلب البلديات بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byWilaya');
        }
    }
}

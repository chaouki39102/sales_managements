<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\CommuneResource;
use App\Models\Commune;
use App\Models\Wilaya;
use App\Services\CommuneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;   // ✅ الإصلاح: كان مفقوداً مما أسبب الخطأ 500

class CommuneController extends BaseApiController
{
    protected string $resourceName = 'commune';
    protected ?string $resourceClass = CommuneResource::class;

    public function __construct(private CommuneService $communeService)
    {
        parent::__construct();
    }

    /**
     * GET /api/v1/communes/by-wilaya/{wilaya}
     * ✅ مسار عام (بدون slug) — يعيد بلديات ولاية محددة
     */
    public function byWilaya(Request $request, Wilaya $wilaya): JsonResponse
    {
        try {
            $communes = Commune::where('wilaya_id', $wilaya->id)
                ->where('active', true)
                ->orderBy('name')
                ->get(['id', 'name', 'arabic_name', 'post_code', 'wilaya_id']);

            return $this->successResponse(
                CommuneResource::collection($communes),
                'تم جلب بلديات الولاية بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byWilaya');
        }
    }

    protected function getService(): CommuneService
    {
        return $this->communeService;
    }

    protected function getModelClass(): string
    {
        return Commune::class;
    }
}

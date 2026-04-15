<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\AuditResource;
use App\Services\AuditService;
use App\Models\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditController extends BaseApiController
{
    protected string $resourceName = 'audit';
    protected ?string $resourceClass = AuditResource::class;

    public function __construct(private AuditService $auditService)
    {
        parent::__construct();
    }

    public function byUser(Request $request, int $userId): JsonResponse
    {
        try {
            $audits = $this->auditService->getByUser($userId);
            return $this->successResponse(
                AuditResource::collection($audits),
                'تم جلب سجلات التدقيق للمستخدم بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byUser');
        }
    }

    public function byEvent(Request $request, string $event): JsonResponse
    {
        try {
            $audits = $this->auditService->getByEvent($event);
            return $this->successResponse(
                AuditResource::collection($audits),
                'تم جلب سجلات التدقيق حسب الحدث بنجاح'
            );
        } catch (\Throwable $e) {
            return $this->handleError($e, 'byEvent');
        }
    }

    protected function getService(): AuditService
    {
        return $this->auditService;
    }

    protected function getModelClass(): string
    {
        return Audit::class;
    }
}
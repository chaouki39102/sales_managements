<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Http\Resources\DocumentTypeResource;
use App\Services\DocumentTypeService as Service;
use App\Models\DocumentType;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class DocumentTypeController extends BaseApiController
{
    protected string $resourceName = 'document_type';
    protected ?string $resourceClass = DocumentTypeResource::class;

    public function __construct(private Service $service)
    {
        parent::__construct();
    }

    protected function getService(): Service
    {
        return $this->service;
    }

    protected function getModelClass(): string
    {
        return DocumentType::class;
    }

    /**
     * GET /api/v1/document-types
     * يُعيد قائمة أنواع المستندات مرتبةً — مضمون أن يُعيد data دائماً
     */
    public function index(Request $request): JsonResponse
    {
        try {
            $items = DocumentType::query()
                ->when($request->boolean('active_only'), fn($q) => $q->where('active', true))
                ->orderBy('display_order')
                ->orderBy('name')
                ->get();

            return response()->json([
                'data' => DocumentTypeResource::collection($items),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'data'    => [],
                'message' => 'فشل تحميل أنواع المستندات: ' . $e->getMessage(),
            ], 500);
        }
    }
}

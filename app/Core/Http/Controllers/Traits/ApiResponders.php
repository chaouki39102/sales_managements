<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * Trait ApiResponders
 *
 * يوفر دوال موحدة لجميع ردود الـ API (النجاح، الخطأ، والقوائم)
 */
trait ApiResponders
{
    /**
     * إرجاع رد نجاح موحد (JSON)
     */
    protected function successResponse($data = null, string $message = 'تم بنجاح', int $status = 200): JsonResponse
    {
        // تحويل البيانات باستخدام Resource إن وجد
        $transformedData = $this->applyResourceTransformation($data);

        $response = [
            'status' => 'success',
            'message' => $message,
            'timestamp' => now()->toISOString(),
        ];

        // معالجة ذكية للـ Paginator
        if ($transformedData instanceof AnonymousResourceCollection &&
            $transformedData->resource instanceof LengthAwarePaginator)
        {
            $paginator = $transformedData->resource;

            $response['data'] = $transformedData->collection;
            $response['meta'] = [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'has_more_pages' => $paginator->hasMorePages(),
                'is_first_page' => $paginator->currentPage() === 1,
                'is_last_page' => !$paginator->hasMorePages(),
            ];
            $response['links'] = [
                'first' => $paginator->url(1),
                'last' => $paginator->url($paginator->lastPage()),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
                'current' => $paginator->url($paginator->currentPage()),
            ];
        }
        // معالجة Paginator عادي (بدون Resource)
        elseif ($transformedData instanceof LengthAwarePaginator) {
            $response['data'] = $transformedData->items();
            $response['meta'] = [
                'current_page' => $transformedData->currentPage(),
                'last_page' => $transformedData->lastPage(),
                'per_page' => $transformedData->perPage(),
                'total' => $transformedData->total(),
                'from' => $transformedData->firstItem(),
                'to' => $transformedData->lastItem(),
                'has_more_pages' => $transformedData->hasMorePages(),
                'is_first_page' => $transformedData->currentPage() === 1,
                'is_last_page' => !$transformedData->hasMorePages(),
            ];
            $response['links'] = [
                'first' => $transformedData->url(1),
                'last' => $transformedData->url($transformedData->lastPage()),
                'prev' => $transformedData->previousPageUrl(),
                'next' => $transformedData->nextPageUrl(),
                'current' => $transformedData->url($transformedData->currentPage()),
            ];
        }
        else {
            $response['data'] = $transformedData;
        }

        return response()->json($response, $status);
    }

    /**
     * إرجاع رد خطأ موحد (JSON)
     */
    protected function errorResponse(string $message, int $status = 400, string $code = 'ERROR'): JsonResponse
    {
        return response()->json([
            'status' => 'error',
            'code' => $code,
            'message' => $message,
            'timestamp' => now()->toISOString(),
        ], $status);
    }

    /**
     * تحويل البيانات باستخدام API Resource (داخلي)
     */
    private function applyResourceTransformation($data)
    {
        // التحقق من وجود $resourceClass في الكلاس
        if (!property_exists($this, 'resourceClass') || !$this->resourceClass) {
            return $data;
        }

        if (!class_exists($this->resourceClass)) {
            return $data;
        }

        // Collection للـ Paginator
        if ($data instanceof LengthAwarePaginator) {
            return $this->resourceClass::collection($data);
        }

        // إذا كان Resource بالفعل
        if ($data instanceof JsonResource) {
            return $data;
        }

        // تحويل عنصر واحد
        return new $this->resourceClass($data);
    }
}

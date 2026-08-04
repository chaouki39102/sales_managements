<?php

namespace App\Core\Http\Controllers\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Contracts\Pagination\Paginator as PaginatorContract;
use Illuminate\Pagination\LengthAwarePaginator;
use App\Core\Pagination\KeysetPaginator;
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

        // معالجة ذكية للـ Paginator (يغطي paginate() و simplePaginate() معاً)
        $rawPaginator = null;
        if ($transformedData instanceof AnonymousResourceCollection &&
            $transformedData->resource instanceof PaginatorContract)
        {
            $rawPaginator = $transformedData->resource;
            $response['data'] = $transformedData->collection;
        } elseif ($transformedData instanceof PaginatorContract) {
            $rawPaginator = $transformedData;
            $response['data'] = $transformedData->items();
        }

        if ($rawPaginator !== null) {
            // حقول مشتركة بين LengthAwarePaginator و Paginator (simplePaginate)
            $response['meta'] = [
                'current_page'   => $rawPaginator->currentPage(),
                'per_page'       => $rawPaginator->perPage(),
                'from'           => $rawPaginator->firstItem(),
                'to'             => $rawPaginator->lastItem(),
                'has_more_pages' => $rawPaginator->hasMorePages(),
                'is_first_page'  => $rawPaginator->currentPage() === 1,
            ];
            $response['links'] = [
                'prev'    => $rawPaginator->previousPageUrl(),
                'next'    => $rawPaginator->nextPageUrl(),
                'current' => $rawPaginator->url($rawPaginator->currentPage()),
            ];

            // حقول تتطلب total count — متاحة فقط في LengthAwarePaginator
            if ($rawPaginator instanceof LengthAwarePaginator) {
                $response['meta']['last_page']    = $rawPaginator->lastPage();
                $response['meta']['total']        = $rawPaginator->total();
                $response['meta']['is_last_page'] = !$rawPaginator->hasMorePages();
                $response['links']['first'] = $rawPaginator->url(1);
                $response['links']['last']  = $rawPaginator->url($rawPaginator->lastPage());
            }

            // حقول cursor (keyset) — متاحة فقط في KeysetPaginator
            if ($rawPaginator instanceof KeysetPaginator) {
                $response['meta']['next_cursor']  = $rawPaginator->nextCursor();
                $response['meta']['has_more']     = $rawPaginator->hasMorePages();
                $response['links']['next_cursor'] = $rawPaginator->nextCursor() > 0
                    ? $rawPaginator->nextCursor()
                    : null;
            }
        }
        else {
            $response['data'] = $transformedData;
        }

        return response()->json($response, $status);
    }

    /**
     * إرجاع رد خطأ موحد (JSON)
     */
    protected function errorResponse(string $message, int $status = 400, string $code = 'ERROR', array $errors = []): JsonResponse
    {
        $body = [
            'status'    => 'error',
            'code'      => $code,
            'message'   => $message,
            'timestamp' => now()->toISOString(),
        ];
        // ✅ أضف errors فقط إذا كانت موجودة (ValidationException)
        if (!empty($errors)) {
            $body['errors'] = $errors;
        }
        return response()->json($body, $status);
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

        // لا تحوّل القيم الفارغة (مثل destroy الذي يُعيد null)
        if ($data === null) {
            return $data;
        }

        // لا تحوّل القيم الأولية (مصفوفات، أرقام، نصوص)
        // Resource يتوقع Model أو Collection — تحويل array يسبب 500
        if (!is_object($data)) {
            return $data;
        }

        // Collection للـ Paginator (يغطي paginate() و simplePaginate() معاً)
        if ($data instanceof PaginatorContract) {
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

<?php

namespace App\Core\Services;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Resources\Json\ResourceCollection;
use Illuminate\Pagination\AbstractPaginator;
use Illuminate\Support\Facades\Log;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;

/**
 * خدمة مركزية لتوحيد جميع ردود الـ API.
 */
class ApiResponseService
{
    protected ?string $resourceClass = null;

    public function setResourceClass(?string $resourceClass): self
    {
        $this->resourceClass = $resourceClass;
        return $this;
    }

    /**
     * الدالة الأساسية لإرسال رد نجاح.
     */
    public function success($data = null, ?string $message = null, int $statusCode = 200): JsonResponse
    {
        $response = [
            'status' => 'success',
            'message' => $message,
            'data' => $this->transformData($data),
        ];

        return response()->json($response, $statusCode);
    }

    /**
     * الدالة الأساسية لإرسال رد خطأ.
     */
    public function error(string $message, int $statusCode, ?string $errorCode = null, ?array $errors = null): JsonResponse
    {
        $response = [
            'status' => 'error',
            'message' => $message,
        ];

        if ($errorCode) {
            $response['error_code'] = $errorCode;
        }

        if ($errors) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $statusCode);
    }

    // --- دوال مساعدة (Helpers) ---

    public function successCreated($data, ?string $message = 'تم الإنشاء بنجاح'): JsonResponse
    {
        return $this->success($data, $message, 201);
    }

    public function successData($data, ?string $message = 'تم جلب البيانات بنجاح'): JsonResponse
    {
        return $this->success($data, $message, 200);
    }

    public function errorNotFound(string $message = 'المورد غير موجود'): JsonResponse
    {
        return $this->error($message, 404, 'NOT_FOUND');
    }

    public function errorValidation(array $errors, string $message = 'البيانات المدخلة غير صالحة'): JsonResponse
    {
        return $this->error($message, 422, 'VALIDATION_ERROR', $errors);
    }

    public function errorForbidden(string $message = 'ليس لديك الصلاحية الكافية'): JsonResponse
    {
        return $this->error($message, 403, 'FORBIDDEN');
    }

    public function errorInternal(\Throwable $exception, string $message = 'حدث خطأ غير متوقع في الخادم'): JsonResponse
    {
        Log::error($exception->getMessage(), [
            'exception' => $exception,
            'trace' => $exception->getTraceAsString(),
        ]);
        return $this->error($message, 500, 'INTERNAL_ERROR');
    }

    public function errorBusinessRule(string $message, string $errorCode = 'BUSINESS_RULE_VIOLATION', int $statusCode = 409): JsonResponse
    {
        return $this->error($message, $statusCode, $errorCode);
    }

    /**
     * تحويل البيانات باستخدام $resourceClass
     */
    protected function transformData($data)
    {
        if (!$this->resourceClass || !$data) {
            return $data;
        }
        try {
            if ($data instanceof AbstractPaginator) {
                return new $this->resourceClass($data);
            }
            if ($data instanceof Collection) {
                return $this->resourceClass::collection($data);
            }
            if ($data instanceof Model) {
                return new $this->resourceClass($data);
            }
        } catch (\Exception $e) {
            Log::warning("Failed to transform data using resource: {$this->resourceClass}", ['error' => $e->getMessage()]);
            return $data; // أرجع البيانات الأصلية في حالة الفشل
        }
        return $data;
    }
}

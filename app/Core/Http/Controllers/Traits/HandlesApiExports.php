<?php

namespace App\Core\Http\Controllers\Traits;

use App\Core\Http\Requests\ExportRequest;
use App\Core\Jobs\ProcessExportJob;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

/**
 * Provides a standardized, asynchronous export endpoint for a resource controller.
 * When a controller uses this trait, AutoDiscovery will automatically register
 * a POST '/{resource}/export' route for it.
 */
trait HandlesApiExports
{
    /**
     * Dispatches a job to process a resource export in the background.
     *
     * It captures the current request's query parameters (filters, sorts, etc.)
     * to ensure the exported file matches the user's current view.
     *
     * @param ExportRequest $request The validated export request.
     * @return JsonResponse
     */
    public function export(ExportRequest $request): JsonResponse
    {
        try {
            // Ensure the model property is set on the controller using this trait.
            if (!property_exists($this, 'model')) {
                Log::error('Export functionality called on controller without $model property', [
                    'controller' => static::class
                ]);

                return $this->errorResponse(
                    'Export functionality is not configured correctly for this resource.',
                    500,
                    'EXPORT_CONFIG_ERROR'
                );
            }

            // التحقق من الصلاحيات (إن وجدت)
            if (method_exists($this, 'authorizeAction')) {
                $this->authorizeAction('export', $this->model);
            }

            // We pass all validated query parameters, not the whole request, to the job.
            // This includes 'filter', 'sort', 'include', etc.
            $queryParams = $request->validated();

            ProcessExportJob::dispatch(
                $this->model,
                $queryParams,
                Auth::user(),
                $request->getExportOptions() // Pass format and columns
            );

            Log::info('Export job dispatched', [
                'model' => $this->model,
                'user_id' => Auth::id(),
                'format' => $request->getExportOptions()['format'] ?? 'xlsx'
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Your export has been queued. You will receive a notification when it is ready for download.',
            ], 202); // 202 Accepted

        } catch (\Exception $e) {
            Log::error('Export job dispatch failed', [
                'model' => $this->model ?? 'unknown',
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return $this->errorResponse(
                'فشل في معالجة طلب التصدير. يرجى المحاولة مرة أخرى.',
                500,
                'EXPORT_FAILED'
            );
        }
    }
}

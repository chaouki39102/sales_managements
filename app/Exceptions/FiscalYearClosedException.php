<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * استثناء مخصص لمحاولة التعديل على سنة مالية مقفلة
 */
class FiscalYearClosedException extends Exception
{
    protected $code = 403;

    /**
     * تحويل الاستثناء إلى HTTP Response
     */
    public function render(Request $request): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $this->getMessage(),
            'error_code' => 'FISCAL_YEAR_CLOSED',
        ], 403);
    }

    /**
     * تسجيل الاستثناء في Logs
     */
    public function report(): void
    {
        logger()->warning('محاولة تعديل على سنة مالية مقفلة', [
            'user_id' => auth()->id(),
            'ip' => request()->ip(),
            'url' => request()->fullUrl(),
        ]);
    }
}

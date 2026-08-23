<?php

namespace App\Http\Controllers\Api\V1;

use App\Core\Http\Controllers\BaseApiController;
use App\Services\System\WindowsPrinterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * SystemPrinterController — اكتشاف الطابعات المثبتة على نظام التشغيل (ويندوز).
 *
 * مثل BackupController: عملية على مستوى النظام وليست خاصة بشركة، لكن المسار
 * داخل {company} بصلاحية can:update_company لأنها معلومات بيئة الخادم.
 */
class SystemPrinterController extends BaseApiController
{
    protected string $resourceName = 'system-printer';

    public function __construct(private WindowsPrinterService $service)
    {
        parent::__construct();
    }

    /**
     * GET /{company}/system/printers — قائمة الطابعات المثبتة على ويندوز.
     */
    public function index(Request $request): JsonResponse
    {
        return $this->successResponse(
            $this->service->list(),
            'تم جلب قائمة طابعات النظام بنجاح',
        );
    }

    /**
     * POST /{company}/system/printers/test — طباعة صفحة اختبار عبر spooler ويندوز.
     */
    public function testPrint(Request $request): JsonResponse
    {
        $request->validate(['name' => 'required|string|max:255']);

        try {
            $this->service->testPrint((string) $request->input('name'));

            return $this->successResponse(
                ['sent' => true],
                "تم إرسال صفحة اختبار إلى «" . $request->input('name') . "»",
            );
        } catch (\Throwable $e) {
            return $this->errorResponse(
                'فشلت الطباعة التجريبية: ' . $e->getMessage(),
                500,
                'PRINTER_TEST_FAILED',
            );
        }
    }
}

<?php

namespace App\Services;

use App\Models\FiscalYear;
use App\Services\Accounting\FiscalYearClosureService;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

/**
 * ✅ إصلاح نهائي لـ FiscalYearService
 *
 * المشاكل السابقة:
 * 1. FiscalYear::refreshClosedYearsCache() → method غير موجودة على Model
 * 2. الـ close() لا يستخدم FiscalYearClosureService مما يتسبب في 500
 */
class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model      = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';

    public function __construct(
        private FiscalYearClosureService $closureService
    ) {}

        protected function getResourceName(): string
    {
        return 'fiscal_year';
    }


    public function getCurrent(): ?FiscalYear
    {
        return FiscalYear::where('is_current', true)->first();
    }

    public function getOpen()
    {
        return FiscalYear::where('is_closed', false)->get();
    }

    /**
     * ✅ إصلاح: استخدام FiscalYearClosureService بدل year->close() مباشرة
     *    FiscalYearClosureService يتولى:
     *      - التحقق من القيود غير المتوازنة
     *      - إنشاء السنة الجديدة
     *      - نقل الأرصدة
     *      - الإقفال الفعلي
     *
     * @throws \Exception إذا فشل التحقق
     */
    public function close(FiscalYear $year, int $userId, ?string $notes = null): FiscalYear
    {
        // ✅ تحديث closing_notes قبل استدعاء الـ Service
        if ($notes) {
            $year->update(['closing_notes' => $notes]);
            $year->refresh();
        }

        // ✅ استخدام الـ Closure Service الكامل الذي يتولى كل الخطوات
        $newYear = $this->closureService->closeYear($year, $userId);

        // ✅ مسح الكاش بأمان بدون استدعاء method غير موجودة
        $this->clearFiscalYearCache();

        return $newYear;
    }

    /**
     * مسح كاش السنوات المالية — آمن لجميع cache drivers
     */
    private function clearFiscalYearCache(): void
    {
        try {
            $driver = config('cache.default', 'file');

            if (in_array($driver, ['redis', 'memcached', 'dynamodb'])) {
                Cache::tags(['fiscal_years'])->flush();
            } else {
                // file / database cache لا تدعم tags
                foreach (['fiscal_years_closed', 'fiscal_years_current', 'fiscal_years_all', 'current_fiscal_year'] as $key) {
                    Cache::forget($key);
                }
            }
        } catch (\Throwable $e) {
            // لا تُفشل العملية بسبب مشكلة في الكاش
            Log::warning("فشل مسح كاش السنوات المالية: {$e->getMessage()}");
        }
    }
}

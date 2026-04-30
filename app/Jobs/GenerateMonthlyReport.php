<?php
// app/Jobs/GenerateMonthlyReport.php
namespace App\Jobs;

use App\Models\Product;
use App\Services\CompanyContextService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;

class GenerateMonthlyReport implements ShouldQueue
{
    use Dispatchable, Queueable;

    public function __construct(
        private readonly int $companyId,  // ← احفظ company_id دائماً في الـ Job
        private readonly int $year,
        private readonly int $month,
    ) {}

    public function handle(CompanyContextService $context): void
    {
        // تشغيل ضمن سياق الشركة الصحيح
        $context->runAs($this->companyId, function () {
            // هنا كل الـ Queries ستُفلتر تلقائياً بـ company_id
            $products = Product::where('active', true)->get();
            // ...
        });
    }
}

// كيفية الإطلاق من Controller:
GenerateMonthlyReport::dispatch(
    companyId: $currentCompany->id,
    year: 2026,
    month: 4
);

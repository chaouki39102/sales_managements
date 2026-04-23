<?php

namespace App\Services;

use App\Models\FiscalYear;

class FiscalYearService extends \App\Core\Services\BaseService
{
    protected string $model = FiscalYear::class;
    protected string $resourceName = 'fiscal_year';

    public function getCurrent(): ?FiscalYear
    {
        return FiscalYear::where('is_current', true)->first();
    }

    public function getOpen()
    {
        return FiscalYear::where('is_closed', false)->get();
    }

    public function close(FiscalYear $year, int $userId, ?string $notes = null): FiscalYear
    {
        $year->close($userId, $notes);
        FiscalYear::refreshClosedYearsCache();
        return $year->fresh();
    }
}

<?php

namespace App\Core\Filters;

use Spatie\QueryBuilder\Filters\Filter;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class RangeFilter implements Filter
{
    /**
     * فلتر مخصص للبحث بين قيمتين (نطاق).
     * يقبل 'from,to' أو [from, to] أو قيمة واحدة فقط.
     *
     * @param Builder $query
     * @param mixed $value
     * @param string $property
     */
public function __invoke(Builder $query, mixed $value, string $property): void    {
        // إذا كانت القيمة نصية نفصلها بفاصلة
        if (is_string($value)) {
            $value = explode(',', $value);
        }

        if (!is_array($value)) {
            return;
        }

        $from = $this->sanitizeValue($value[0] ?? null);
        $to   = $this->sanitizeValue($value[1] ?? null);

        // إذا عندنا قيمتين صحيحتين => whereBetween
        if ($from !== null && $to !== null) {
            $query->whereBetween($property, [$from, $to]);
        }
        // إذا فقط from موجودة
        elseif ($from !== null) {
            $query->where($property, '>=', $from);
        }
        // إذا فقط to موجودة
        elseif ($to !== null) {
            $query->where($property, '<=', $to);
        }
    }

    /**
     * تنظيف وتنسيق القيمة (رقم أو تاريخ)
     *
     * @param mixed $value
     * @return mixed|null
     */
    protected function sanitizeValue($value)
    {
        if ($value === null || $value === '') {
            return null;
        }

        // إذا رقم => نحوله float
        if (is_numeric($value)) {
            return (float) $value;
        }

        // إذا تاريخ صالح => نحوله بصيغة Y-m-d
        try {
            return Carbon::parse($value)->toDateTimeString();
        } catch (\Exception $e) {
            return null;
        }
    }
}

<?php

namespace App\Services;

use App\Models\NumberingSeries;
use App\Models\CommercialDocument;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NumberingSeriesService extends \App\Core\Services\BaseService
{
    protected string $model = NumberingSeries::class;
    protected string $resourceName = 'numbering_series';
    protected array $defaultWith = ['documentType', 'warehouse'];

    public function unlock(Model $item): Model
    {
        $item->update(['is_locked' => false]);
        return $item->fresh();
    }

    public function lock(Model $item): Model
    {
        $item->update(['is_locked' => true]);
        return $item->fresh();
    }

    /**
     * الحصول على الرقم التالي مع قفل الصف لمنع Race Condition
     */
    public function getNextNumberWithLock(int $seriesId): array
    {
        return DB::transaction(function () use ($seriesId) {
            $series = NumberingSeries::where('id', $seriesId)
                ->lockForUpdate()
                ->first();

            if (!$series) {
                abort(404, 'سلسلة الترقيم غير موجودة');
            }

            $nextNumber = $series->getNextNumber();
            $series->incrementNumber();

            return [
                'series_id' => $series->id,
                'next_number' => $nextNumber,
            ];
        });
    }

    /**
     * مزامنة الرقم الحالي مع أعلى رقم موجود فعلياً في المستندات من هذا النوع
     */
    public function syncWithActualDocuments(int $seriesId): Model
    {
        $series = $this->findById($seriesId);

        // استخراج أعلى رقم من المستندات الفعلية
        $maxLastNumber = CommercialDocument::where('document_type_id', $series->document_type_id)
            ->when($series->warehouse_id, function ($q) use ($series) {
                $q->where('warehouse_id', $series->warehouse_id);
            })
            ->whereNotNull('document_number')
            ->get()
            ->map(function ($doc) use ($series) {
                // استخراج الجزء الرقمي من الرقم المُنسَّق
                return $this->extractNumericPart($doc->document_number, $series);
            })
            ->max();

        $newLastNumber = max($maxLastNumber ?? ($series->start_number - 1), $series->start_number - 1);

        $series->update(['last_number' => $newLastNumber]);

        return $series->fresh();
    }

    /**
     * استخراج الجزء الرقمي من رقم مستند بناءً على صيغة السلسلة
     * (تحليل ذكي + آمن + performant)
     */
    private function extractNumericPart(string $documentNumber, NumberingSeries $series): ?int
    {
        static $compiledCache = [];

        $cacheKey = md5(
            $series->format . '|' .
                ($series->prefix ?? '') . '|' .
                ($series->suffix ?? '')
        );

        // ===============================
        // 1. بناء regex مرة واحدة فقط (Cache)
        // ===============================
        if (!isset($compiledCache[$cacheKey])) {

            $pattern = $series->format;

            // حماية prefix / suffix
            $prefix = $series->prefix ? preg_quote($series->prefix, '#') : '';
            $suffix = $series->suffix ? preg_quote($series->suffix, '#') : '';

            $pattern = str_replace('{PREFIX}', $prefix, $pattern);
            $pattern = str_replace('{SUFFIX}', $suffix, $pattern);

            // المتغيرات الزمنية
            $pattern = str_replace(
                ['{YYYY}', '{YY}', '{MM}', '{MONTH}'],
                ['\d{4}', '\d{2}', '\d{2}', '\d{2}'],
                $pattern
            );

            // {NUMBER} و {NUMBER:4}
            $pattern = preg_replace_callback('/\{NUMBER(?::(\d+))?\}/', function ($m) {
                if (isset($m[1])) {
                    return '(?P<number>\d{' . $m[1] . '})';
                }
                return '(?P<number>\d+)';
            }, $pattern);

            $compiledCache[$cacheKey] = '#^' . $pattern . '$#u';
        }

        $regex = $compiledCache[$cacheKey];

        // ===============================
        // 2. المحاولة الأساسية (مطابقة دقيقة)
        // ===============================
        if (preg_match($regex, $documentNumber, $matches)) {
            if (isset($matches['number']) && is_numeric($matches['number'])) {
                return (int) $matches['number'];
            }
        }

        // ===============================
        // 3. fallback (أكثر أمان)
        // آخر رقم فقط
        // ===============================
        if (preg_match('/(\d+)(?!.*\d)/', $documentNumber, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }
    
}

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
     * (تحليل ذكي: يفترض أن آخر جزء متغير هو الرقم)
     */
    private function extractNumericPart(string $documentNumber, NumberingSeries $series): ?int
    {
        // استراتيجية بسيطة: استبدال جميع الأجزاء الثابتة من الصيغة بفراغ
        $pattern = $series->format;

        // إزالة البادئة واللاحقة
        $pattern = str_replace('{PREFIX}', $series->prefix ?? '', $pattern);
        $pattern = str_replace('{SUFFIX}', $series->suffix ?? '', $pattern);

        // استبدال المتغيرات بعبارة (.*) لاستخراجها
        $regex = $pattern;
        $regex = str_replace(
            ['{YY}', '{YYYY}', '{MM}', '{MONTH}', '{NUMBER}', '{NUMBER:\d+}'],
            ['\d{2}', '\d{4}', '\d{2}', '\d{2}', '(\d+)', '(\d+)'],
            $regex
        );
        $regex = '#^' . $regex . '$#u';

        if (preg_match($regex, $documentNumber, $matches)) {
            // المطابقة الأخيرة ((\d+)) = الرقم
            $numberMatch = end($matches);
            if (is_numeric($numberMatch)) {
                return (int) $numberMatch;
            }
        }

        // إذا فشل التحليل الذكي، جرب استخراج أي رقم متسلسل
        if (preg_match('/\d+/', $documentNumber, $m)) {
            $parts = explode($m[0], $documentNumber);
            // لنأخذ الجزء الأخير المطابق كرقم
            $matches = [];
            preg_match_all('/\d+/', $documentNumber, $matches);
            $lastMatch = end($matches[0]);
            return (int) $lastMatch;
        }

        return null;
    }
}

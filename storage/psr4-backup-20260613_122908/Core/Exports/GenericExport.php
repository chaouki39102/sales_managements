<?php

namespace App\Core\Exports;

use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\Exportable;

/**
 * تصدير عام يعتمد على Query Builder مع تحويل للبيانات ودعم للـ Chunking.
 * - FromQuery: لتجنب جلب كل البيانات في الذاكرة.
 * - WithMapping: لتنظيف وتحويل البيانات (مثل البوليان والمصفوفات).
 * - ShouldAutoSize: لضبط عرض الأعمدة تلقائيًا.
 */
class GenericExport implements FromQuery, WithHeadings, WithMapping, WithChunkReading, ShouldAutoSize
{
    use Exportable;

    protected Builder $query;
    protected int $chunkSize;
    protected ?array $columns;

    /**
     * @param Builder $query الاستعلام الذي تم بناؤه بواسطة ApiListService
     * @param int $chunkSize حجم القطعة التي يتم معالجتها في الذاكرة
     * @param ?array $columns رؤوس الأعمدة المراد عرضها
     */
    public function __construct(Builder $query, int $chunkSize = 1000, ?array $columns = null)
    {
        $this->query = $query;
        $this->chunkSize = $chunkSize;
        $this->columns = $columns;
    }

    /**
     * 1. تنفيذ الاستعلام للحصول على البيانات في قطع صغيرة (Chunks).
     */
    public function query()
    {
        return $this->query;
    }

    /**
     * 2. تحديد رؤوس الأعمدة.
     * إما بناءً على المصفوفة الممررة ($this->columns) أو استخراجها تلقائيًا.
     */
    public function headings(): array
    {
        if ($this->columns) {
            return $this->columns;
        }

        // استخراج تلقائي من أول صف لضمان التناسق
        $first = $this->query->first();
        if (!$first) {
            return [];
        }

        $data = $first->toArray();
        return array_keys($data);
    }

    /**
     * 3. تحويل كل صف قبل تصديره.
     * الهدف: معالجة البيانات غير المتوافقة مع Excel.
     * @param mixed $row
     * @return array
     */
    public function map($row): array
    {
        // تحويل الصف إلى مصفوفة (سواء كان Model أو Array)
        $data = is_array($row) ? $row : $row->toArray();

        return array_map(function ($value) {
            // تحويل المصفوفات والكائنات إلى JSON
            if (is_array($value) || is_object($value)) {
                return json_encode($value, JSON_UNESCAPED_UNICODE);
            }
            // تحويل القيم المنطقية إلى نص عربي
            if (is_bool($value)) {
                return $value ? 'نعم' : 'لا';
            }
            // استبدال قيم NULL بسلسلة فارغة
            if (is_null($value)) {
                return '';
            }
            return $value;
        }, array_values($data));
    }

    /**
     * 4. تحديد حجم القطعة الواحدة (الـ Chunk).
     */
    public function chunkSize(): int
    {
        return $this->chunkSize;
    }
}

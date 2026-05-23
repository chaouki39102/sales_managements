<?php

namespace App\Models\Traits;

use App\Exceptions\FiscalYearClosedException;
use App\Models\FiscalYear;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Trait لمنع التعديل على سنة مالية مقفلة
 * مع تحسينات الأداء وسلامة البيانات
 */
trait BelongsToFiscalYear
{
    /**
     * Cache لتخزين حالات السنوات المقفلة
     * يتم تحديثها فقط عند إقفال سنة جديدة
     */
    protected static array $closedYearsCache = [];

    protected static function bootBelongsToFiscalYear(): void
    {
        // تحميل السنوات المقفلة مرة واحدة فقط
        static::loadClosedYears();

        // 1. منع الإنشاء في سنة مقفلة
        static::creating(function ($model) {
            $model->validateFiscalYearStatus();
        });

        // 2. منع التعديل في سنة مقفلة
        static::updating(function ($model) {
            // تحقق من السنة الأصلية
            if ($model->getOriginal('fiscal_year_id')) {
                $model->validateFiscalYearStatus($model->getOriginal('fiscal_year_id'));
            }

            // تحقق من السنة الجديدة إذا تم تغييرها
            if ($model->isDirty('fiscal_year_id')) {
                $model->validateFiscalYearStatus();
            }
        });

        // 3. منع الحذف من سنة مقفلة
        static::deleting(function ($model) {
            $model->validateFiscalYearStatus();
        });
    }

    /**
     * تحميل السنوات المقفلة من Cache أو DB (مرة واحدة فقط)
     */
    protected static function loadClosedYears(): void
    {
        if (! empty(static::$closedYearsCache)) {
            return;
        }

        try {
            static::$closedYearsCache = Cache::remember(
                'closed_fiscal_years',
                now()->addHours(24),
                fn () => FiscalYear::where('is_closed', true)
                    ->pluck('id')
                    ->toArray()
            );
        } catch (\Throwable) {
            static::$closedYearsCache = [];
        }
    }

    /**
     * التحقق من حالة السنة المالية (بدون استعلامات إضافية)
     */
    protected function validateFiscalYearStatus(?int $yearId = null): void
    {
        $yearId = $yearId ?? $this->fiscal_year_id;

        if (!$yearId) {
            return; // لا سنة مالية = العملية مسموحة
        }

        // ✅ فحص سريع من الـ Cache
        if (in_array($yearId, static::$closedYearsCache)) {
            throw new FiscalYearClosedException(
                "العملية ممنوعة: السنة المالية مقفلة (ID: {$yearId})"
            );
        }
    }

    /**
     * علاقة Eloquent مع السنة المالية
     */
    public function fiscalYear()
    {
        return $this->belongsTo(FiscalYear::class);
    }

    /**
     * يتم استدعاؤها عند إقفال سنة مالية لتحديث الـ Cache
     */
    public static function refreshClosedYearsCache(): void
    {
        Cache::forget('closed_fiscal_years');
        static::$closedYearsCache = [];
        static::loadClosedYears();
    }
}

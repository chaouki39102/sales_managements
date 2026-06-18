<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model        = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

        if (!$parentDoc) {
            throw new \App\Core\Exceptions\BusinessRuleException('الوثيقة الأم غير موجودة.', 404);
        }

        if ($parentDoc->is_locked) {
            throw new \App\Core\Exceptions\BusinessRuleException(
                'لا يمكن تعديل سطر في وثيقة مقفلة.',
                409
            );
        }

        if ($parentDoc->is_exported_to_accounting) {
            throw new \App\Core\Exceptions\BusinessRuleException(
                'لا يمكن تعديل سطر في وثيقة تم تصديرها للمحاسبة.',
                409
            );
        }
    }

    protected function beforeDelete(Model $item): void
    {
        $parentDoc = \App\Models\CommercialDocument::find($item->commercial_document_id);

        if ($parentDoc?->is_locked) {
            throw new \App\Core\Exceptions\BusinessRuleException(
                'لا يمكن حذف سطر من وثيقة مقفلة.',
                409
            );
        }
    }

    // ✅ بعد إنشاء سطر منفرد: إعادة حساب الوثيقة الأم
    protected function afterCreate(Model $item, array $data, $request): void
    {
        $this->recalculateParentDocument($item);
    }

    // ✅ بعد تعديل سطر منفرد: إعادة حساب الوثيقة الأم
    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $this->recalculateParentDocument($item);
    }

    // ✅ بعد حذف سطر: إعادة حساب الوثيقة الأم
    protected function afterDelete(Model $item): void
    {
        $this->recalculateParentDocument($item);
    }

    private function recalculateParentDocument(CommercialDocumentLine $line): void
    {
        $document = CommercialDocument::find($line->commercial_document_id);
        if (!$document) return;

        $document->load('lines');

        $totalHt       = (float) $document->lines->sum('total_ht');
        $totalTva      = (float) $document->lines->sum('total_tva');
        $totalDiscount = (float) $document->lines->sum('discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        $totalStamp = 0.0;
        try {
            $totalStamp = (float) app(FiscalStampCalculator::class)->calculate($document);
        } catch (\Throwable $e) {
            Log::warning("LineService: فشل حساب الطابع للوثيقة #{$document->id}: " . $e->getMessage());
        }

        $netToPay   = $totalTtc + $totalStamp;
        $paidAmount = (float) ($document->paid_amount ?? 0);

        $document->updateQuietly([
            'total_ht'         => round($totalHt,       4),
            'total_tva'        => round($totalTva,       4),
            'total_discount'   => round($totalDiscount,  4),
            'total_stamp'      => round($totalStamp,     4),
            'total_ttc'        => round($totalTtc,       4),
            'net_to_pay'       => round($netToPay,       4),
            'remaining_amount' => round(max(0, $netToPay - $paidAmount), 4),
        ]);
    }
}

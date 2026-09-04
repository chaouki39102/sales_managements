<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\Setting;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Log;

class CommercialDocumentLineService extends \App\Core\Services\BaseService
{
    protected string $model        = CommercialDocumentLine::class;
    protected string $resourceName = 'commercial_document_line';

    /** صورة السطر قبل أي تعديل/حذف — تُفكَّك في afterUpdate/afterDelete ثم تُصفَّر */
    private ?array $lineAuditSnapshot = null;

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

        if ($item instanceof CommercialDocumentLine) {
            $this->lineAuditSnapshot = [
                'document_id' => (int) $item->commercial_document_id,
                'line'        => $this->snapshotLine($item),
            ];
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

        if ($item instanceof CommercialDocumentLine) {
            $this->lineAuditSnapshot = [
                'document_id' => (int) $item->commercial_document_id,
                'line'        => $this->snapshotLine($item),
            ];
        }
    }

    // ✅ بعد إنشاء سطر منفرد: إعادة حساب الوثيقة الأم + تسجيل الحدث
    protected function afterCreate(Model $item, array $data, $request): void
    {
        $this->recalculateParentDocument($item);

        if ($item instanceof CommercialDocumentLine) {
            DocumentAuditLogger::log((int) $item->commercial_document_id, 'line_added', [
                'company_id' => (int) $item->company_id,
                'field_name' => 'line_' . ($item->line_order ?? '?'),
                'new_value'  => $this->snapshotLine($item),
            ]);
        }
    }

    // ✅ بعد تعديل سطر منفرد: إعادة حساب الوثيقة الأم + تسجيل التغيير الدلالي
    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $this->recalculateParentDocument($item);

        if (!($item instanceof CommercialDocumentLine)) {
            return;
        }

        $old   = $this->lineAuditSnapshot['line'] ?? null;
        $docId = (int) ($this->lineAuditSnapshot['document_id'] ?? $item->commercial_document_id);
        $this->lineAuditSnapshot = null;
        if (!$old) {
            return;
        }

        $epsilon   = 0.0001;
        $new       = $this->snapshotLine($item);

        $priceChanged = abs((float) $new['unit_price_ht'] - (float) $old['unit_price_ht']) > $epsilon;
        $discChanged  = abs((float) $new['discount_percentage'] - (float) $old['discount_percentage']) > $epsilon
            || abs((float) $new['discount_amount_per_unit'] - (float) $old['discount_amount_per_unit']) > $epsilon;
        $otherChanged = (int) $new['product_id'] !== (int) $old['product_id']
            || abs((float) $new['quantity'] - (float) $old['quantity']) > $epsilon
            || abs((float) $new['tva_rate'] - (float) $old['tva_rate']) > $epsilon;

        if ($priceChanged) {
            DocumentAuditLogger::log($docId, 'price_changed', [
                'company_id' => (int) $item->company_id,
                'field_name' => 'line_' . ($item->line_order ?? '?'),
                'old_value'  => ['product_id' => $old['product_id'], 'unit_price_ht' => $old['unit_price_ht']],
                'new_value'  => ['product_id' => $new['product_id'], 'unit_price_ht' => $new['unit_price_ht']],
            ]);
        }

        if ($discChanged) {
            DocumentAuditLogger::log($docId, 'discount_changed', [
                'company_id' => (int) $item->company_id,
                'field_name' => 'line_' . ($item->line_order ?? '?'),
                'old_value'  => [
                    'product_id'               => $old['product_id'],
                    'discount_percentage'      => $old['discount_percentage'],
                    'discount_amount_per_unit' => $old['discount_amount_per_unit'],
                ],
                'new_value'  => [
                    'product_id'               => $new['product_id'],
                    'discount_percentage'      => $new['discount_percentage'],
                    'discount_amount_per_unit' => $new['discount_amount_per_unit'],
                ],
            ]);
        }

        if ($priceChanged || $discChanged || $otherChanged) {
            DocumentAuditLogger::log($docId, 'line_modified', [
                'company_id' => (int) $item->company_id,
                'field_name' => 'line_' . ($item->line_order ?? '?'),
                'old_value'  => $old,
                'new_value'  => $new,
            ]);
        }
    }

    // ✅ بعد حذف سطر: إعادة حساب الوثيقة الأم + تسجيل السطر المحذوف
    protected function afterDelete(Model $item): void
    {
        $this->recalculateParentDocument($item);

        if ($item instanceof CommercialDocumentLine) {
            $old   = $this->lineAuditSnapshot['line'] ?? null;
            $docId = (int) ($this->lineAuditSnapshot['document_id'] ?? $item->commercial_document_id);
            $this->lineAuditSnapshot = null;

            DocumentAuditLogger::log($docId, 'line_removed', [
                'company_id' => (int) $item->company_id,
                'field_name' => 'line_' . ($old['line_order'] ?? $item->line_order ?? '?'),
                'old_value'  => $old ?: $this->snapshotLine($item),
            ]);
        }
    }

    private function recalculateParentDocument(CommercialDocumentLine $line): void
    {
        $document = CommercialDocument::find($line->commercial_document_id);
        if (!$document) return;

        $document->load('lines');

        $totalHt       = (float) $document->lines->sum('total_ht');
        $totalTva      = (float) $document->lines->sum('total_tva');
        $totalDiscount = (float) $document->lines->sum('total_discount_amount');
        $totalTtc      = $totalHt + $totalTva;

        $totalStamp = 0.0;
        $stampEnabled = Setting::getSetting('fiscal_stamp_enabled', true, $document->company_id);
        if ($stampEnabled) {
            try {
                $totalStamp = app(FiscalStampCalculator::class)->calculateFromAmount($totalTtc);
            } catch (\Throwable $e) {
                Log::warning("LineService: فشل حساب الطابع للوثيقة #{$document->id}: " . $e->getMessage());
            }
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

    /** لقطة ثابتة لحقول السطر (تُخزَّن كـ old_value في سجل التدقيق) */
    private function snapshotLine(CommercialDocumentLine $line): array
    {
        return [
            'product_id'             => (int) $line->product_id,
            'line_order'             => $line->line_order,
            'quantity'               => (float) ($line->quantity ?? 0),
            'unit_price_ht'          => (float) ($line->unit_price_ht ?? 0),
            'discount_percentage'    => (float) ($line->discount_percentage ?? 0),
            'discount_amount_per_unit' => (float) ($line->discount_amount_per_unit ?? 0),
            'tva_rate'               => (float) ($line->tva_rate ?? 0),
        ];
    }
}

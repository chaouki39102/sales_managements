<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\DocumentType;
use Illuminate\Support\Facades\DB;

class DocumentReturnService
{
    private const RETURN_MAP = [
        'FV'  => 'AV',
        'FA'  => 'AA',
        'BL'  => 'AV',
        'BR'  => 'AA',
        'POS' => 'AV',
    ];

    public function __construct(
        private CommercialDocumentService $documentService,
        private CompanyContextService     $companyContext,
    ) {}

    public function createReturn(
        CommercialDocument $source,
        array              $returnLines,
        string             $reason,
    ): CommercialDocument {
        $companyId  = $this->companyContext->get();
        $sourceCode = $source->documentType?->code;

        if (!isset(self::RETURN_MAP[$sourceCode])) {
            throw new BusinessRuleException(
                "لا يمكن إنشاء مرتجع لمستند من نوع {$sourceCode}",
                422
            );
        }

        $returnCode = self::RETURN_MAP[$sourceCode];
        $returnType = DocumentType::where('company_id', $companyId)
            ->where('code', $returnCode)
            ->firstOrFail();

        return DB::transaction(function () use ($source, $returnType, $returnLines, $reason, $companyId) {

            $linesPayload = [];
            foreach ($returnLines as $returnLine) {
                $sourceLine = $source->lines()
                    ->findOrFail($returnLine['line_id']);

                $maxReturnable = $sourceLine->quantity
                    - $sourceLine->returned_quantity;

                if ($returnLine['quantity'] > $maxReturnable) {
                    throw new BusinessRuleException(
                        "كمية المرتجع ({$returnLine['quantity']}) أكبر من القابلة للإرجاع ({$maxReturnable})",
                        422
                    );
                }

                $linesPayload[] = [
                    'product_id'               => $sourceLine->product_id,
                    'description'              => $sourceLine->description . " (مرتجع)",
                    'quantity'                 => $returnLine['quantity'],
                    'unit_price_ht'            => $sourceLine->unit_price_ht,
                    'discount_percentage'      => $sourceLine->discount_percentage,
                    'discount_amount'          => $sourceLine->discount_amount,
                    'tva_rate'                 => $sourceLine->tva_rate,
                    'packaging_id'             => $sourceLine->packaging_id,
                    'packaging_units_snapshot' => $sourceLine->packaging_units_snapshot,
                    'notes'                    => "مرتجع من سطر #{$sourceLine->id}",
                ];
            }

            $returnDoc = $this->documentService->create([
                'document_type_id'              => $returnType->id,
                'party_id'                      => $source->party_id,
                'warehouse_id'                  => $source->warehouse_id,
                'fiscal_year_id'                => $source->fiscal_year_id,
                'currency_id'                   => $source->currency_id,
                'exchange_rate'                 => $source->exchange_rate,
                'document_date'                 => now()->toDateString(),
                'notes'                         => "مرتجع من {$source->document_number}: {$reason}",
                'cancellation_reason'           => $reason,
                'cancellation_of_document_id'  => $source->id,
                'source_document_id'            => $source->id,
                'pos_session_id'                => $source->pos_session_id,
                'lines'                         => $linesPayload,
            ]);

            foreach ($returnLines as $returnLine) {
                $source->lines()
                    ->where('id', $returnLine['line_id'])
                    ->increment('returned_quantity', $returnLine['quantity']);
            }

            $source->load('lines');
            $allReturned = $source->lines->every(
                fn($l) => ($l->returned_quantity >= $l->quantity)
            );

            if ($allReturned) {
                $returnedStatus = \App\Models\DocumentStatus::where('company_id', $source->company_id)
                    ->where('name', 'returned')
                    ->value('id');

                if ($returnedStatus) {
                    $source->updateQuietly(['document_status_id' => $returnedStatus]);
                }
            }

            return $returnDoc;
        });
    }
}

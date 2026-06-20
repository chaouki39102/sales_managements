<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use Illuminate\Support\Facades\DB;

class DocumentConversionService
{
    private const CONVERSION_MAP = [
        'DEV' => ['BCC', 'BL', 'FV'],
        'BCC' => ['BL', 'FV'],
        'BL'  => ['FV'],
        'DDP' => ['BCF'],
        'BCF' => ['BR', 'FA'],
        'BR'  => ['FA'],
    ];

    public function __construct(
        private CommercialDocumentService $documentService,
        private CompanyContextService     $companyContext,
    ) {}

    public function convert(
        CommercialDocument $source,
        string             $targetCode,
        ?array             $includeLineIds = null,
        ?string            $documentDate   = null,
    ): CommercialDocument {
        $companyId  = $this->companyContext->get();
        $sourceCode = $source->documentType?->code;

        if (!isset(self::CONVERSION_MAP[$sourceCode])) {
            throw new BusinessRuleException(
                "لا يمكن تحويل مستند من نوع {$sourceCode}",
                422
            );
        }

        if (!in_array($targetCode, self::CONVERSION_MAP[$sourceCode], true)) {
            $allowed = implode(', ', self::CONVERSION_MAP[$sourceCode]);
            throw new BusinessRuleException(
                "التحويل من {$sourceCode} إلى {$targetCode} غير مسموح. المسموح: {$allowed}",
                422
            );
        }

        $targetType = DocumentType::where('company_id', $companyId)
            ->where('code', $targetCode)
            ->firstOrFail();

        $effectiveDate = $documentDate ?? now()->toDateString();

        \Log::debug('[convert] effectiveDate: ' . ($effectiveDate ?? 'null') . ' | original doc date: ' . ($source->document_date?->format('Y-m-d') ?? 'null'));

        return DB::transaction(function () use ($source, $targetType, $includeLineIds, $companyId, $effectiveDate) {
            $sourceLines = $source->lines()
                ->when($includeLineIds, fn($q) => $q->whereIn('id', $includeLineIds))
                ->get();

            if ($sourceLines->isEmpty()) {
                throw new BusinessRuleException('لا توجد أسطر للتحويل.', 422);
            }

            $linesData = $sourceLines->map(fn($line) => [
                'product_id'          => $line->product_id,
                'description'         => $line->description,
                'quantity'            => $line->quantity,
                'unit_price_ht'       => $line->unit_price_ht,
                'discount_percentage' => $line->discount_percentage,
                'discount_amount'     => $line->discount_amount,
                'tva_rate'            => $line->tva_rate,
                'packaging_id'        => $line->packaging_id,
                'notes'               => $line->notes,
            ])->toArray();

            $newDoc = $this->documentService->create([
                'document_type_id'   => $targetType->id,
                'party_id'           => $source->party_id,
                'warehouse_id'       => $source->warehouse_id,
                'fiscal_year_id'     => $source->fiscal_year_id,
                'currency_id'        => $source->currency_id,
                'exchange_rate'      => $source->exchange_rate,
                'document_date'      => $effectiveDate,
                'due_date'           => $source->due_date?->format('Y-m-d'),
                'notes'              => $source->notes,
                'internal_notes'     => "محوَّل من {$source->document_number}",
                'source_document_id' => $source->id,
                'payment_terms'      => $source->payment_terms,
                'shipping_info'      => $source->shipping_info,
            ]);

            // BaseService::beforeCreate strips non-column keys (including 'lines'),
            // so we create lines + recalculate totals here.
            $this->documentService->addLinesToDocument($newDoc, $linesData);

            if ($source->documentType?->code === 'BCC' && $targetType->code === 'BL') {
                foreach ($sourceLines as $sourceLine) {
                    $sourceLine->increment('delivered_quantity', $sourceLine->quantity);
                }

                $source->load('lines');
                $allDelivered = $source->lines->every(
                    fn($l) => $l->delivered_quantity >= $l->quantity
                );

                if ($allDelivered) {
                    $fullyDeliveredStatus = DocumentStatus::where('company_id', $source->company_id)
                        ->where('name', 'validated')->value('id');
                    $updates = [];
                    if ($fullyDeliveredStatus) {
                        $updates['document_status_id'] = $fullyDeliveredStatus;
                    }
                    if (is_null($source->delivery_date)) {
                        $updates['delivery_date'] = now()->toDateString();
                    }
                    if (!empty($updates)) {
                        $source->updateQuietly($updates);
                    }
                }
            }

            return $newDoc;
        });
    }

    public function buildChain(CommercialDocument $document): array
    {
        return [
            'ancestors'   => $this->getAncestors($document),
            'current'     => $this->formatNode($document),
            'descendants' => $this->getDescendants($document),
        ];
    }

    private function getAncestors(CommercialDocument $doc): array
    {
        $ancestors = [];
        $current   = $doc;

        while ($current->source_document_id) {
            $parent = CommercialDocument::with(['documentType', 'documentStatus'])
                ->find($current->source_document_id);
            if (!$parent) break;
            array_unshift($ancestors, $this->formatNode($parent));
            $current = $parent;
        }

        return $ancestors;
    }

    private function getDescendants(CommercialDocument $doc): array
    {
        $children = CommercialDocument::with(['documentType', 'documentStatus'])
            ->where('source_document_id', $doc->id)
            ->orWhere('cancellation_of_document_id', $doc->id)
            ->get();

        return $children->map(fn($child) => [
            ...$this->formatNode($child),
            'children' => $this->getDescendants($child),
        ])->toArray();
    }

    private function formatNode(CommercialDocument $doc): array
    {
        return [
            'id'              => $doc->id,
            'document_number' => $doc->document_number,
            'document_type'   => $doc->documentType?->code,
            'type_name'       => $doc->documentType?->name,
            'status'          => $doc->documentStatus?->name,
            'status_label'    => $doc->documentStatus?->label,
            'document_date'   => $doc->document_date?->format('Y-m-d'),
            'net_to_pay'      => $doc->net_to_pay,
            'is_cancellation' => !is_null($doc->cancellation_of_document_id),
        ];
    }

    public function getAllowedTargets(string $sourceCode): array
    {
        return self::CONVERSION_MAP[$sourceCode] ?? [];
    }
}

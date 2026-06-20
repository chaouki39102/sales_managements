<?php
// ════════════════════════════════════════════════════════════════════════════
// app/Services/CreditCheckService.php
// ════════════════════════════════════════════════════════════════════════════

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\Party;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * CreditCheckService
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * يتحقق من:
 * 1. حد الائتمان (credit_limit) — هل سيتجاوزه المستند الجديد؟
 * 2. الفواتير المتأخرة (credit_days) — هل لديه فواتير متجاوزة؟
 * 3. تاريخ الاستحقاق المقترح = تاريخ المستند + credit_days
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
class CreditCheckService
{
    public function __construct(
        private PartyBalanceService   $balanceService,
        private CompanyContextService $companyContext,
    ) {}

    /**
     * الفحص الشامل للائتمان.
     *
     * @param int    $partyId  معرف المتعامل
     * @param float  $newAmount مبلغ المستند الجديد
     * @param string $date     تاريخ المستند
     */
    public function check(int $partyId, float $newAmount, string $date): array
    {
        $companyId = $this->companyContext->get();

        $party = Party::where('company_id', $companyId)->findOrFail($partyId);

        // الرصيد الحالي
        $balanceData = $this->balanceService->getBalanceAt($partyId, $date);
        $currentBalance = $balanceData['current_balance'];

        // حد الائتمان
        $creditLimit   = (float) ($party->credit_limit ?? 0);
        $creditDays    = (int)   ($party->credit_days  ?? 0);
        $usedCredit    = $currentBalance;
        $available     = $creditLimit > 0 ? max(0, $creditLimit - $usedCredit) : null;
        $willExceed    = $creditLimit > 0 && ($usedCredit + $newAmount) > $creditLimit;
        $exceedBy      = $willExceed ? round(($usedCredit + $newAmount) - $creditLimit, 4) : 0;

        // الفواتير المتأخرة
        $overdueInvoices = $this->getOverdueInvoices($partyId, $companyId, $date);

        // تاريخ الاستحقاق المقترح
        $suggestedDueDate = $creditDays > 0
            ? Carbon::parse($date)->addDays($creditDays)->format('Y-m-d')
            : null;

        // التحذيرات
        $alerts = [];

        if ($willExceed) {
            $alerts[] = [
                'type'    => 'credit_limit_exceeded',
                'level'   => 'error',
                'message' => "سيتجاوز حد الائتمان بمقدار " . number_format($exceedBy, 2) . " دج",
            ];
        } elseif ($creditLimit > 0 && $available < $newAmount * 0.2) {
            $alerts[] = [
                'type'    => 'credit_limit_warning',
                'level'   => 'warning',
                'message' => "الائتمان المتاح منخفض: " . number_format($available, 2) . " دج",
            ];
        }

        if ($overdueInvoices['count'] > 0) {
            $alerts[] = [
                'type'    => 'overdue_invoices',
                'level'   => 'warning',
                'message' => "هذا الزبون لديه {$overdueInvoices['count']} فاتورة متأخرة بقيمة " .
                             number_format($overdueInvoices['total_amount'], 2) . " دج",
            ];
        }

        return [
            'party_id'             => $partyId,
            'party_name'           => $party->name,
            'credit_limit'         => $creditLimit,
            'credit_days'          => $creditDays,
            'used_credit'          => $usedCredit,
            'available_credit'     => $available,
            'new_amount'           => $newAmount,
            'total_after'          => $usedCredit + $newAmount,
            'will_exceed'          => $willExceed,
            'exceed_by'            => $exceedBy,
            'suggested_due_date'   => $suggestedDueDate,
            'overdue_invoices'     => $overdueInvoices,
            'is_tva_exempt'        => $party->is_tva_exempt,
            'is_final_consumer'    => $party->is_final_consumer,
            'default_price_level_id' => $party->default_price_level_id,
            'alerts'               => $alerts,
            'can_proceed'          => !$willExceed || $creditLimit === 0,
        ];
    }

    /**
     * جلب الفواتير المتأخرة للمتعامل.
     */
    private function getOverdueInvoices(int $partyId, int $companyId, string $date): array
    {
        $overdue = DB::table('commercial_documents as cd')
            ->join('document_types as dt',           'cd.document_type_id',           '=', 'dt.id')
            ->join('document_statuses as ds',         'cd.document_status_id',         '=', 'ds.id')
            ->where('cd.company_id',   $companyId)
            ->where('cd.party_id',     $partyId)
            ->where('dt.affects_accounting', true)
            ->whereIn('ds.name', ['validated', 'partially_paid', 'overdue'])
            ->where('cd.remaining_amount', '>', 0.001)
            ->whereNotNull('cd.due_date')
            ->whereDate('cd.due_date', '<', $date)
            ->whereNull('cd.deleted_at')
            ->selectRaw('COUNT(*) as count, COALESCE(SUM(cd.remaining_amount), 0) as total_amount')
            ->first();

        return [
            'count'        => (int)   ($overdue->count        ?? 0),
            'total_amount' => (float) ($overdue->total_amount ?? 0),
        ];
    }

    /**
     * تُستدعى من CommercialDocumentService::beforeCreate — تُرفع استثناء إذا تجاوز.
     * فقط إذا كانت صلاحية override غير ممنوحة.
     */
    public function enforceLimit(int $partyId, float $amount, string $date): void
    {
        $result = $this->check($partyId, $amount, $date);

        if ($result['will_exceed'] && !auth()->user()?->can('override_credit_limit')) {
            throw new BusinessRuleException(
                "تجاوز حد الائتمان: المتاح {$result['available_credit']} دج " .
                "والمطلوب {$amount} دج. تجاوز بـ {$result['exceed_by']} دج.",
                422,
                ['credit_check' => $result]
            );
        }
    }
}


// ════════════════════════════════════════════════════════════════════════════
// app/Services/DocumentConversionService.php
// ════════════════════════════════════════════════════════════════════════════

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\CommercialDocumentLine;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use Illuminate\Support\Facades\DB;

/**
 * DocumentConversionService
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * خريطة التحويلات المسموح بها:
 *
 *   DEV  → BCC, BL, FV           (عرض سعر → أمر / تسليم / فاتورة)
 *   BCC  → BL, FV                (أمر عميل → تسليم / فاتورة)
 *   BL   → FV                    (تسليم → فاتورة)
 *   DDP  → BCF                   (طلب أسعار → أمر شراء)
 *   BCF  → BR, FA                (أمر شراء → استلام / فاتورة شراء)
 *   BR   → FA                    (استلام → فاتورة شراء)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
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

    /**
     * تُحوِّل مستنداً لنوع جديد.
     *
     * @param CommercialDocument $source المستند الأصلي
     * @param string $targetCode كود نوع المستند الهدف
     * @param array|null $includeLineIds أسطر محددة للتحويل (null = كل الأسطر)
     */
    public function convert(
        CommercialDocument $source,
        string             $targetCode,
        ?array             $includeLineIds = null,
    ): CommercialDocument {
        $companyId  = $this->companyContext->get();
        $sourceCode = $source->documentType?->code;

        // التحقق من إمكانية التحويل
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

        return DB::transaction(function () use ($source, $targetType, $includeLineIds, $companyId) {
            // تحديد الأسطر
            $sourceLines = $source->lines()
                ->when($includeLineIds, fn($q) => $q->whereIn('id', $includeLineIds))
                ->get();

            if ($sourceLines->isEmpty()) {
                throw new BusinessRuleException('لا توجد أسطر للتحويل.', 422);
            }

            // إنشاء المستند الجديد
            $newDoc = $this->documentService->create([
                'document_type_id'   => $targetType->id,
                'party_id'           => $source->party_id,
                'warehouse_id'       => $source->warehouse_id,
                'fiscal_year_id'     => $source->fiscal_year_id,
                'currency_id'        => $source->currency_id,
                'exchange_rate'      => $source->exchange_rate,
                'document_date'      => now()->toDateString(),
                'due_date'           => $source->due_date?->format('Y-m-d'),
                'notes'              => $source->notes,
                'internal_notes'     => "محوَّل من {$source->document_number}",
                'source_document_id' => $source->id,
                'payment_terms'      => $source->payment_terms,
                'shipping_info'      => $source->shipping_info,
                'lines'              => $sourceLines->map(fn($line) => [
                    'product_id'          => $line->product_id,
                    'description'         => $line->description,
                    'quantity'            => $line->quantity,
                    'unit_price_ht'       => $line->unit_price_ht,
                    'discount_percentage' => $line->discount_percentage,
                    'discount_amount'     => $line->discount_amount,
                    'tva_rate'            => $line->tva_rate,
                    'packaging_id'        => $line->packaging_id,
                    'notes'               => $line->notes,
                ])->toArray(),
            ]);

            // تحديث delivered_quantity في الأسطر الأصلية (BCC → BL)
            if ($source->documentType?->code === 'BCC' && $targetType->code === 'BL') {
                foreach ($sourceLines as $sourceLine) {
                    $sourceLine->increment('delivered_quantity', $sourceLine->quantity);
                }

                // هل اكتملت كل أسطر BCC؟
                $source->load('lines');
                $allDelivered = $source->lines->every(
                    fn($l) => $l->delivered_quantity >= $l->quantity
                );

                if ($allDelivered) {
                    $fullyDeliveredStatus = DocumentStatus::where('company_id', $source->company_id)
                        ->where('name', 'validated')->value('id');
                    // يمكن إضافة حالة "fully_delivered" لاحقاً
                }
            }

            return $newDoc;
        });
    }

    /**
     * يبني سلسلة المستندات المرتبطة بمستند معين.
     * يُرجع: ancestors (الآباء) + current + descendants (الأبناء)
     */
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

    /** الأنواع المسموح بتحويل المستند إليها */
    public function getAllowedTargets(string $sourceCode): array
    {
        return self::CONVERSION_MAP[$sourceCode] ?? [];
    }
}


// ════════════════════════════════════════════════════════════════════════════
// app/Services/DocumentReturnService.php
// ════════════════════════════════════════════════════════════════════════════

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\DocumentType;
use Illuminate\Support\Facades\DB;

/**
 * DocumentReturnService
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * ينشئ مستند مرتجع:
 *   FV (فاتورة بيع)    → AV (أوار بيع)
 *   FA (فاتورة شراء)   → AA (أوار شراء)
 *
 * المرتجع:
 *   - يُرجع المخزون تلقائياً (StockMovement عكسية)
 *   - يُحدِّث returned_quantity في أسطر المستند الأصلي
 *   - يُربط بـ cancellation_of_document_id
 *   - يُضيف cancellation_reason
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
class DocumentReturnService
{
    private const RETURN_MAP = [
        'FV' => 'AV',   // أوار بيع
        'FA' => 'AA',   // أوار شراء
        'BL' => 'AV',   // مرتجع تسليم
        'BR' => 'AA',   // مرتجع استلام
    ];

    public function __construct(
        private CommercialDocumentService $documentService,
        private CompanyContextService     $companyContext,
    ) {}

    /**
     * ينشئ مستند مرتجع من فاتورة أصلية.
     *
     * @param CommercialDocument $source  المستند الأصلي
     * @param array $returnLines         [ ['line_id' => X, 'quantity' => Y], ... ]
     * @param string $reason             سبب الإرجاع
     */
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

            // بناء أسطر المرتجع مع التحقق من الكميات
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
                    'product_id'          => $sourceLine->product_id,
                    'description'         => $sourceLine->description . " (مرتجع)",
                    'quantity'            => $returnLine['quantity'],
                    'unit_price_ht'       => $sourceLine->unit_price_ht,
                    'discount_percentage' => $sourceLine->discount_percentage,
                    'discount_amount'     => $sourceLine->discount_amount,
                    'tva_rate'            => $sourceLine->tva_rate,
                    'packaging_id'        => $sourceLine->packaging_id,
                    'notes'               => "مرتجع من سطر #{$sourceLine->id}",
                ];
            }

            // إنشاء مستند المرتجع
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
                'lines'                         => $linesPayload,
            ]);

            // تحديث returned_quantity في الأسطر الأصلية
            foreach ($returnLines as $returnLine) {
                $source->lines()
                    ->where('id', $returnLine['line_id'])
                    ->increment('returned_quantity', $returnLine['quantity']);
            }

            // تحديث حالة المستند الأصلي إذا أُرجع كاملاً
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

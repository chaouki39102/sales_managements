<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Core\Services\Concerns\ValidatesTenantRelations;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\DocumentType;
use App\Models\FiscalYear;
use App\Models\Party;
use App\Models\Setting;
use App\Models\NumberingSeries;
use App\Models\Product;
use App\Models\StockMovement;
use App\Models\Payment;
use App\Services\CompanyContextService;
use App\Services\InventoryValuationService;
use App\Services\Tax\FiscalStampCalculator;
use App\Services\Tax\TaxRuleService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * ════════════════════════════════════════════════════════════════════════════
 * CommercialDocumentService — منطق مُبسَّط
 *
 * قواعد النظام:
 *   ✅ الإنشاء → الحالة مباشرة "validated" + حركات المخزون فوراً
 *   ✅ التعديل → مسموح دائماً ما لم يكن is_locked = true
 *   ✅ القفل   → is_locked عمود مستقل، لا علاقة له بالحالة
 *   ✅ الإلغاء → الحالة تصبح "cancelled" (في حالات نادرة جداً)
 *   ❌ لا مسودة، لا اعتماد لاحق، لا حذف، لا مرتجع
 *   ❌ حالات المالية (paid/overdue/partially_paid) لا تُدار هنا
 * ════════════════════════════════════════════════════════════════════════════
 */
class CommercialDocumentService extends \App\Core\Services\BaseService
{
    use ValidatesTenantRelations;

    protected string $model        = CommercialDocument::class;
    protected string $resourceName = 'commercial_document';

    protected array $defaultWith = [
        'documentType', 'party', 'warehouse',
        'currency', 'documentStatus', 'lines.product',
        'lines.packaging',
    ];

    protected array $showWith = [
        'payments',
        'lines.product.quantityDiscounts',
    ];

    protected function getResourceName(): string
    {
        return $this->resourceName;
    }

    protected function payments(): PaymentSynchronizer
    {
        return app(PaymentSynchronizer::class);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeCreate
    // يُعدّ البيانات ويُولّد رقم المستند والسلسلة الترقيمية
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeCreate(array $data, $request): array
    {
        $companyId = (int) ($data['company_id'] ?? app(CompanyContextService::class)->get());

        if (!$companyId) {
            throw new BusinessRuleException('لم يتم تحديد الشركة الحالية.', 422);
        }

        $savedLines = $data['lines'] ?? [];
        $data = parent::beforeCreate($data, $request);
        if (!empty($savedLines)) {
            $data['lines'] = $savedLines;
        }
        $data['company_id'] = $companyId;

        if (empty($data['user_id'])) {
            $data['user_id'] = auth()->id();
        }

        $data = $this->prepareDocumentData($data);

        // تحقق من نوع الوثيقة
        $documentType = DocumentType::where('company_id', $companyId)
            ->where('id', $data['document_type_id'] ?? 0)
            ->first();

        if (!$documentType) {
            throw new BusinessRuleException('نوع الوثيقة غير موجود أو لا ينتمي لشركتك.', 422);
        }

        if ($documentType->requires_party && empty($data['party_id'])) {
            $data['party_id'] = $this->resolveCashPartyId($companyId);
        }

        // السلسلة الترقيمية ورقم المستند
        if (empty($data['numbering_series_id'])) {
            $data['numbering_series_id'] = $this
                ->resolveNumberingSeries($documentType->id, $companyId)->id;
        }

        if (empty($data['document_number'])) {
            $generated = $this->generateDocumentNumber($documentType, $companyId);
            $data['document_number'] = $generated;

            \Illuminate\Support\Facades\Log::debug('[DocGen beforeCreate]', [
                'company' => $companyId,
                'doc_type_id' => $data['document_type_id'],
                'generated' => $generated,
                'data_doc_num' => $data['document_number'] ?? 'MISSING',
            ]);
        } else {
            \Illuminate\Support\Facades\Log::debug('[DocGen not-empty]', [
                'document_number' => $data['document_number'],
                'source' => 'already in data',
            ]);
        }

        // ── الإعدادات الافتراضية من Settings ─────────────────────────────
        if (empty($data['warehouse_id'])) {
            $defWh = Setting::getSetting('default_warehouse_id', null, $companyId);
            if ($defWh) $data['warehouse_id'] = $defWh;
        }

        if (empty($data['currency_id'])) {
            $defCur = Setting::getSetting('default_currency_id', 1, $companyId);
            if ($defCur) $data['currency_id'] = $defCur;
        }

        // السنة المالية
        if (empty($data['fiscal_year_id'])) {
            $behavior = Setting::getSetting('default_fiscal_year_behavior', 'current', $companyId);
            if ($behavior === 'current') {
                $data['fiscal_year_id'] = $this->getCurrentFiscalYearId($companyId)
                    ?? throw new BusinessRuleException('لا توجد سنة مالية مفتوحة.', 422);
            }
        }

        // ✅ الحالة مباشرةً "validated" — لا مسودة
        $data['validated_at'] = now();
        $data['validated_by'] = auth()->id();
        $data['document_status_id'] = $this->getStatusId($companyId, 'validated');

        $this->validateTenantRelations($data, $companyId, [
            'party_id'       => 'parties',
            'warehouse_id'   => 'warehouses',
            'fiscal_year_id' => 'fiscal_years',
            'currency_id'    => 'currencies',
        ]);

        return $data;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterCreate
    // إنشاء الأسطر + حساب الإجماليات + حركات المخزون — كل شيء في transaction واحد
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterCreate(Model $item, array $data, $request): void
    {
        $lines = $request?->input('lines') ?? $data['lines'] ?? [];

        if (!empty($lines)) {
            $this->createDocumentLines($item, $lines);
        }

        $this->recalculateTotals($item);

        // Money gate #2 (stored level): recompute every money field from first
        // principles and compare against what was stored. Runs inside the DB
        // transaction BEFORE stock movements / payments / snapshots — a mismatch
        // rolls the whole transaction back. Protects the accounting ledger from
        // any client (or code change) that could corrupt prices/totals.
        app(TransactionIntegrityService::class)->assertStoredDocumentClean($item);

        // ✅ حركات المخزون فوراً بعد الإنشاء (لأن الوثيقة معتمدة مباشرةً)
        $item->load('documentType', 'lines.product');

        if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($item);
        }

        // ✅ ربط الدفعات إذا أُرسلت مع المستند — UPSERT/DELETE pattern
        // يستخدم has() بدلاً من !empty() لضمان عمل "حذف كل الدفعات" (array فارغة)
        $hasPayments = $request?->has('payments') ?? array_key_exists('payments', $data);
        if ($hasPayments) {
            $payments = $request?->input('payments') ?? $data['payments'] ?? [];
            $this->payments()->syncPayments($item, $payments);
        }

        // ✅ التحقق من البيع بالدين: إذا كان التعامل لا يُسمح له بالبيع بالدين
        //    فيجب أن تساوي الدفعات المبلغ الإجمالي كاملاً
        if (!empty($data['party_id'])) {
            $party = \App\Models\Party::find($data['party_id']);
            if ($party && !$party->allow_credit_sale) {
                $totalPaid = $item->fresh()?->payments()->sum('amount')
                    ?? collect($request?->input('payments') ?? $data['payments'] ?? [])->sum('amount');
                $totalTtc = (float) $item->total_ttc;
                if ($totalPaid + 0.01 < $totalTtc) {
                    throw new BusinessRuleException(
                        "التعامل «{$party->name}» لا يُسمح له بالبيع بالدين. " .
                        "المبلغ المدفوع (" . number_format($totalPaid, 2) . " دج) أقل من الإجمالي (" .
                        number_format($totalTtc, 2) . " دج).",
                        422
                    );
                }
            }
        }

        // ✅ Freeze balance snapshots inside the transaction (SSOT for receipt reprinting)
        $this->persistBalanceSnapshots($item);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: beforeUpdate
    // القاعدة الوحيدة: مقفول = ممنوع التعديل
    // ═══════════════════════════════════════════════════════════════════════

    protected function beforeUpdate(Model $item, array $data, $request): void
    {
        parent::beforeUpdate($item, $data, $request);

        // R1
        if ($item->is_locked) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة مقفلة.', 409);
        }

        // R2
        if ($item->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن تعديل وثيقة تم تصديرها للمحاسبة.', 409);
        }

        // R3: لا تسمح بتغيير رقم المستند إذا كان مُعتمداً
        if (!empty($data['document_number']) && $data['document_number'] !== $item->document_number) {
            $currentStatusName = $item->documentStatus?->name
                ?? DocumentStatus::where('id', $item->document_status_id)->value('name');
            $validatedStatuses = ['validated', 'paid', 'partially_paid', 'overdue'];
            if (in_array($currentStatusName, $validatedStatuses, true)) {
                throw new BusinessRuleException(
                    'لا يمكن تغيير رقم مستند معتمد. رقم المستند محمي بعد الاعتماد.',
                    409
                );
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HOOK: afterUpdate
    // إعادة حساب الأسطر والإجماليات إذا تغيرت الأسطر
    // ─── ملاحظة: حركات المخزون لا تُعاد تلقائياً عند التعديل ───
    // ─── ملاحظة: Snapshots لا تُعاد حسابها عند التعديل (مجمّدة عند الإنشاء) ───
    // TODO: إذا احتجت لذلك لاحقاً: احذف الحركات القديمة وأنشئ جديدة
    // ═══════════════════════════════════════════════════════════════════════

    protected function afterUpdate(Model $item, array $data, $request): void
    {
        $lines    = $request?->input('lines')    ?? $data['lines']    ?? [];
        $payments = $request?->input('payments') ?? $data['payments'] ?? [];

        // AU1: تحديث الأسطر
        if (!empty($lines)) {
            $this->deleteStockMovementsForDocument($item);
            $item->lines()->delete();
            $this->createDocumentLines($item, $lines);
        }

        $this->recalculateTotals($item);

        // Money gate #2 (stored level) — same as afterCreate: verify the edited
        // transaction's money math before stock movements/payments are rewritten.
        app(TransactionIntegrityService::class)->assertStoredDocumentClean($item);

        if (!empty($lines)) {
            $item->load('documentType', 'lines.product');
            if (($item->documentType?->affects_stock_direction ?? 0) !== 0) {
                $this->createStockMovements($item);
            }
        }

        // AU3: مزامنة الدفعات — UPSERT/DELETE pattern (additive + free)
        $hasPayments = $request?->has('payments') ?? array_key_exists('payments', $data);
        if ($hasPayments) {
            $payments = $request?->input('payments') ?? $data['payments'] ?? [];
            $this->payments()->syncPayments($item, $payments);
        }

        // ✅ Snapshots intentionally NOT recomputed on update — they are frozen
        // at creation time (afterCreate) and represent the historical balance state.
    }

    // ═══════════════════════════════════════════════════════════════════════
    // OVERRIDE: delete — حذف فعلي مع تنظيف المخزون والمدفوعات
    // ═══════════════════════════════════════════════════════════════════════

    public function delete(Model $item, ?\Illuminate\Http\Request $request = null): bool
    {
        $document = $item instanceof CommercialDocument
            ? $item
            : CommercialDocument::findOrFail($item->getKey());

        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مقفلة.', 409);
        }
        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن حذف وثيقة مصدرة للمحاسبة.', 409);
        }

        DB::transaction(function () use ($document) {
            // 1. Soft-delete stock movements (عكس تأثير المخزون)
            $this->deleteStockMovementsForDocument($document);

            // 2. Unlink payments (حذف rows الوسيطة)
            $document->payments()->detach();

            // 3. Hard-delete document (DB CASCADE يحذف lines و pivot rows)
            $document->forceDelete();
        });

        $this->performPostCommitOperations($document, [], $request, 'delete');

        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC ACTIONS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * قفل المستند — يمنع أي تعديل لاحق
     */
    public function lockDocument(CommercialDocument $document): void
    {
        $document->updateQuietly(['is_locked' => true]);
    }

    /**
     * فتح قفل المستند
     */
    public function unlockDocument(CommercialDocument $document): void
    {
        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن فتح قفل وثيقة مُصدَّرة للمحاسبة.', 409);
        }

        $document->updateQuietly(['is_locked' => false]);
    }

    /**
     * إلغاء المستند — في حالات نادرة جداً
     * يضع الحالة "cancelled" ولا يؤثر على المخزون بأثر رجعي
     *
     * ⚠️ تنبيه: المخزون الذي تأثر عند الإنشاء لا يُعكس تلقائياً.
     *    إذا احتجت لعكس المخزون: أنشئ مستند مقابل (مرتجع) بدلاً من الإلغاء.
     */
    public function cancelDocument(CommercialDocument $document, string $reason): void
    {
        if ($document->is_locked) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة مقفلة. افتح القفل أولاً.', 409);
        }

        if ($document->is_exported_to_accounting) {
            throw new BusinessRuleException('لا يمكن إلغاء وثيقة تم تصديرها للمحاسبة.', 409);
        }

        $document->updateQuietly([
            'cancellation_reason' => $reason,
            'document_status_id'  => $this->getStatusId($document->company_id, 'cancelled'),
        ]);
    }

    /**
     * validateDocument — تحقق يدوي من مستند (draft → validated)
     *
     * يُستدعى عند الضغط على زر "اعتماد" من صفحة القائمة.
     */
    public function validateDocument(CommercialDocument $document, $request = null): void
    {
        $companyId = $document->company_id;

        if ($document->is_locked) {
            throw new BusinessRuleException(
                'لا يمكن اعتماد وثيقة مقفلة.',
                409
            );
        }

        $currentStatus = $document->documentStatus?->name
            ?? \App\Models\DocumentStatus::where('id', $document->document_status_id)->value('name');

        if (in_array($currentStatus, ['validated', 'paid', 'partially_paid', 'overdue'], true)) {
            throw new BusinessRuleException(
                'المستند معتمد بالفعل.',
                409
            );
        }

        if (in_array($currentStatus, ['cancelled', 'returned'], true)) {
            throw new BusinessRuleException(
                'لا يمكن اعتماد مستند ملغى أو مرتجع.',
                409
            );
        }

        if ($document->lines()->count() === 0) {
            throw new BusinessRuleException(
                'لا يمكن اعتماد مستند بدون أسطر.',
                422
            );
        }

        $validatedStatusId = $this->getStatusId($companyId, 'validated');

        if (!$validatedStatusId) {
            throw new BusinessRuleException(
                "لم يُعثر على حالة 'validated' للشركة #{$companyId}",
                500
            );
        }

        $document->updateQuietly([
            'document_status_id' => $validatedStatusId,
            'validated_at'       => now(),
            'validated_by'       => auth()->id(),
        ]);

        $document->load('documentType', 'lines.product');

        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $existingMovements = StockMovement::whereHas('commercialDocumentLine', function ($q) use ($document) {
                $q->where('commercial_document_id', $document->id);
            })->exists();

            if (!$existingMovements) {
                $this->createStockMovements($document);
            }
        }
    }

    /**
     * جلب المستندات غير المسددة (remaining_amount > 0)
     */
    public function getUnpaid()
    {
        return CommercialDocument::unpaid()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    /**
     * جلب المستندات المتأخرة (due_date < today + remaining > 0)
     */
    public function getOverdue()
    {
        return CommercialDocument::overdue()
            ->with(['party', 'documentType', 'documentStatus'])
            ->get();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء أسطر الوثيقة
    // ═══════════════════════════════════════════════════════════════════════

    private function createDocumentLines(CommercialDocument $document, array $lines): void
    {
        foreach ($lines as $order => $line) {
            $pid = $line['product_id'] ?? null;
            if ($pid === null || $pid === '' || (int) $pid <= 0) {
                throw new BusinessRuleException(
                    'المنتج ذو المعرف غير صالح في السطر ' . ($order + 1) . '.',
                    422
                );
            }
        }

        $productIds = array_values(array_filter(array_column($lines, 'product_id')));
        if (!empty($productIds)) {
            $intIds = array_map('intval', $productIds);
            $this->validateTenantRelationsMany(
                $intIds,
                'products',
                $document->company_id
            );

            $document->loadMissing('documentType');
            $docCode = $document->documentType?->code;
            $isReturn = in_array($docCode, ['AV', 'AA'], true);

            if (!$isReturn) {
                $inactiveIds = DB::table('products')
                    ->whereIn('id', $intIds)
                    ->where('company_id', $document->company_id)
                    ->where('active', false)
                    ->pluck('id')
                    ->toArray();

                if (!empty($inactiveIds)) {
                    throw new BusinessRuleException(
                        'المنتجات ذات المعرفات [' . implode(', ', $inactiveIds) . '] غير نشطة ولا يمكن بيعها.',
                        422
                    );
                }
            }
        }

        // Load party for TVA exemption enforcement
        $party  = $document->party;
        $taxSvc = app(TaxRuleService::class);

        // Resolve price level once per document for quantity-tier discount lookup.
        // commercial_documents has no price_level_id column, so derive from party/global.
        $priceLevelId = $party?->default_price_level_id
            ?? \App\Models\Setting::getSetting('default_price_level_id', null, $document->company_id);

        foreach ($lines as $order => $lineData) {
            // Money gate #1 (payload level): reject garbage/stale money fields before
            // anything touches the ledger — negative qty, invalid price, out-of-range
            // discounts/TVA, or a packaged line with no positive pack factor.
            app(TransactionIntegrityService::class)->assertPayloadLine($lineData, $order);

            // Override TVA rate if party is exempt
            $product = isset($lineData['product_id'])
                ? Product::find((int) $lineData['product_id'])
                : null;
            if ($party && $product) {
                $rule = $taxSvc->getEffectiveTvaRate($party, $product);
                if ($rule['forced']) {
                    $lineData['tva_rate'] = $rule['rate'];
                }
            }

            // Freeze the packaging-to-base-unit conversion factor at time of sale.
            // Must NEVER be re-derived from the live ProductPackaging row after this point —
            // if ProductPackaging.quantity changes later, this line keeps its original value.
            $packagingUnitsSnapshot = null;
            if (!empty($lineData['packaging_id'])) {
                $packaging = \App\Models\ProductPackaging::find((int) $lineData['packaging_id']);
                if (!$packaging) {
                    throw new BusinessRuleException(
                        'وحدة التعبئة المحدَّدة في السطر ' . ($order + 1) . ' غير موجودة.',
                        422
                    );
                }

                // Snapshot resolution (backend is the source of truth for the pack factor):
                //   1. client-sent pack_qty — NEW-sales contract (unit_price_ht = PER-UNIT)
                //   2. payload packaging_units_snapshot — verbatim copies (returns/conversions)
                //   3. live packaging row — only when neither was provided (legacy clients)
                $declaredPackQty = isset($lineData['pack_qty']) ? (float) $lineData['pack_qty'] : 0.0;
                if ($declaredPackQty > 0) {
                    $packagingUnitsSnapshot = $declaredPackQty;
                } elseif (array_key_exists('packaging_units_snapshot', $lineData)
                    && $lineData['packaging_units_snapshot'] !== null) {
                    $packagingUnitsSnapshot = (float) $lineData['packaging_units_snapshot'];
                } else {
                    $packagingUnitsSnapshot = (float) $packaging->quantity;
                }

                // The × packQty applies ONLY to the per-unit contract (client declared pack_qty).
                // Copy paths (returns/conversions) already deliver the stored PACK price, so
                // re-multiplying would double the price.
                if ($declaredPackQty > 0 && $packagingUnitsSnapshot > 0) {
                    $lineData['unit_price_ht'] = round((float) $lineData['unit_price_ht'] * $packagingUnitsSnapshot, 4);
                }
            }

            // Quantity-tier discount resolution — mutually exclusive with manual discount_percentage.
            $quantityDiscountId = null;
            if ($product && $product->manages_quantity_discounts) {
                $baseQtyForDiscount = $packagingUnitsSnapshot
                    ? round((float) $lineData['quantity'] * $packagingUnitsSnapshot, 4)
                    : (float) $lineData['quantity'];

                // Check for blocked tiers first — applicableDiscount() excludes them.
                $blockedQuery = $product->quantityDiscounts()
                    ->where('active', true)
                    ->where('is_blocked', true)
                    ->where('min_qty', '<=', $baseQtyForDiscount)
                    ->where(fn($q) => $q->whereNull('max_qty')->orWhere('max_qty', '>=', $baseQtyForDiscount));
                if ($priceLevelId) {
                    $blockedQuery->where('price_level_id', $priceLevelId);
                }
                $blockedTier = $blockedQuery->first();

                if ($blockedTier) {
                    throw new BusinessRuleException(
                        "الكمية المطلوبة للمنتج {$product->name} في السطر " . ($order + 1) .
                        " محجوبة بسياسة تسعير الكميات ولا يمكن بيعها بهذا العدد.",
                        422
                    );
                }

                $tier = $product->applicableDiscount($priceLevelId, $baseQtyForDiscount);

                if ($tier) {
                    if ($tier->discount_amount !== null && (float) $tier->discount_amount > 0) {
                        // Native fixed-amount tier — store as-is, no percentage conversion, ever.
                        $lineData['discount_amount_per_unit'] = (float) $tier->discount_amount;
                        $lineData['discount_percentage']      = 0;
                    } elseif ($tier->discount_percentage !== null && (float) $tier->discount_percentage > 0) {
                        $lineData['discount_percentage']      = (float) $tier->discount_percentage;
                        $lineData['discount_amount_per_unit'] = null;
                    }
                    $quantityDiscountId = $tier->id;
                } else {
                    // No tier matches at current qty — clear any frontend-sent discount.
                    // Prevents stale tier-2 discount persisting when qty drops below tier-2 min_qty.
                    $lineData['discount_amount_per_unit'] = null;
                    $lineData['discount_percentage']      = 0;
                    $quantityDiscountId                   = null;
                }
            }

            // Observer calculates total_ht, discount_amount, total_tva, total_ttc
            // from discount_amount_per_unit (fixed) or discount_percentage (pct)

            $document->lines()->create([
                'company_id'             => $document->company_id,
                'commercial_document_id' => $document->id,
                'line_order'             => $order + 1,
                'product_id'             => (int) $lineData['product_id'],
                'description'            => $lineData['description'] ?? null,
                'quantity'               => (float) $lineData['quantity'],
                'unit_price_ht'          => (float) $lineData['unit_price_ht'],
                'discount_percentage'    => (float) ($lineData['discount_percentage'] ?? 0),
                'discount_amount_per_unit' => isset($lineData['discount_amount_per_unit']) ? (float) $lineData['discount_amount_per_unit'] : null,
                'quantity_discount_id'   => $quantityDiscountId,
                'tva_rate'               => (float) ($lineData['tva_rate'] ?? 0),
                'packaging_id'           => $lineData['packaging_id'] ?? null,
                'packaging_units_snapshot' => $packagingUnitsSnapshot,
                'stock_lot_id'           => $lineData['stock_lot_id'] ?? null,
                'line_attributes'        => $this->buildLineAttributes($lineData),
            ]);
        }
    }

    private function computeLineTotals(array $line): array
    {
        $qty            = (float) ($line['quantity']                ?? 0);
        $price          = (float) ($line['unit_price_ht']           ?? 0);
        $discPct        = (float) ($line['discount_percentage']     ?? 0);
        $discAmtPerUnit = (float) ($line['discount_amount_per_unit'] ?? 0);
        $tvaRate        = (float) ($line['tva_rate']                ?? 0);

        $gross = $qty * $price;

        if ($discAmtPerUnit > 0) {
            $packQty = (float) ($line['packaging_units_snapshot'] ?? 1);
            $baseQty = $qty * $packQty;
            $discount = $discAmtPerUnit * $baseQty;
        } else {
            $discount = $gross * ($discPct / 100);
        }

        $ht  = $gross - $discount;
        $tva = $ht * ($tvaRate / 100);

        return [
            'total_ht'              => round($ht,       4),
            'discount_amount'       => round($discAmtPerUnit > 0 ? $discAmtPerUnit : ($price * ($discPct / 100)), 4),
            'discount_amount_per_unit' => $discAmtPerUnit > 0 ? round($discAmtPerUnit, 4) : null,
            'total_discount_amount' => round($discount, 4),
            'total_tva'             => round($tva,       4),
            'total_ttc'             => round($ht + $tva, 4),
        ];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: حذف حركات المخزون
    // ═══════════════════════════════════════════════════════════════════════

    private function deleteStockMovementsForDocument(CommercialDocument $document): void
    {
        try {
            // جلب IDs الأسطر
            $lineIds = $document->lines()->pluck('id');

            // حذف كل حركات المخزون الخاصة بهذه الوثيقة عبر أسطرها. يُستدعى هذا
            // قبل حذف الأسطر (في afterUpdate/delete)، لذا كل الحركات ما زالت مرتبطة
            // بمعرّفات الأسطر الحالية. لا يوجد عمود commercial_document_id في
            // stock_movements — الارتباط الوحيد هو commercial_document_line_id.
            \App\Models\StockMovement::where(function ($q) use ($document, $lineIds) {
                if ($lineIds->isNotEmpty()) {
                    $q->orWhereIn('commercial_document_line_id', $lineIds);
                }
                // شبكة أمان: حركات مرتبطة بأسطر (ما زالت موجودة) تابعة لهذه الوثيقة
                $q->orWhereHas('commercialDocumentLine', function ($q2) use ($document) {
                    $q2->where('commercial_document_id', $document->id);
                });
            })->delete();

        } catch (\Throwable $e) {
            Log::warning("deleteStockMovementsForDocument: فشل حذف حركات المخزون للوثيقة #{$document->id}", [
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: حساب إجماليات الوثيقة
    // ═══════════════════════════════════════════════════════════════════════

    private function recalculateTotals(CommercialDocument $document): void
    {
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
                Log::warning("FiscalStamp error doc#{$document->id}: " . $e->getMessage());
            }
        }

        $netToPay = $totalTtc + $totalStamp;

        $document->updateQuietly([
            'total_ht'         => round($totalHt,       2),
            'total_tva'        => round($totalTva,       2),
            'total_discount'   => round($totalDiscount,  2),
            'total_stamp'      => round($totalStamp,     2),
            'total_ttc'        => round($totalTtc,       2),
            'net_to_pay'       => round($netToPay,       2),
            'remaining_amount' => round($netToPay,       2), // يُحدَّث لاحقاً بعد الدفعات
        ]);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: Freeze balance snapshots for historical receipt reprinting
    //
    // Called INSIDE the DB transaction only during creation (afterCreate).
    // Snapshots are WRITE-ONCE (frozen at creation) — they represent the
    // historical balance state for receipt reprinting. Updates do NOT
    // recompute snapshots to avoid picking up other documents created since.
    // ═══════════════════════════════════════════════════════════════════════

    public function persistBalanceSnapshots(CommercialDocument $item): void
    {
        if (!$item->party_id || !$item->document_date) return;

        try {
            $balanceService = app(PartyBalanceService::class);
            $balanceData = $balanceService->getBalanceAt($item->party_id, $item->document_date);
            $currentBalance = $balanceData['current_balance'];

            $item->loadMissing('documentType.documentBaseOperation');
            $isSale = $item->documentType?->documentBaseOperation?->name === 'sale';
            $isAccounting = $item->documentType?->affects_accounting ?? true;

            $paidAmount = (float) ($item->paid_amount ?? 0);
            $previousBalance = $isAccounting
                ? ($isSale ? $currentBalance - $item->net_to_pay + $paidAmount : $currentBalance + $item->net_to_pay - $paidAmount)
                : $currentBalance;

            $item->updateQuietly([
                'previous_balance_snapshot' => round($previousBalance, 2),
                'new_balance_snapshot'      => round($currentBalance, 2),
            ]);
        } catch (\Throwable $e) {
            Log::warning("Balance snapshot failed for doc#{$item->id}: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PUBLIC: إضافة أسطر لمستند موجود + إعادة حساب الإجماليات
    // يُستخدم من DocumentConversionService لأن BaseService::beforeCreate
    // يزيل المفاتيح غير المرتبطة بعمود (مثل 'lines') من $data
    // ═══════════════════════════════════════════════════════════════════════

    public function addLinesToDocument(CommercialDocument $document, array $linesData): void
    {
        $this->createDocumentLines($document, $linesData);
        $this->recalculateTotals($document);
        $document->load('documentType', 'lines.product');
        if (($document->documentType?->affects_stock_direction ?? 0) !== 0) {
            $this->createStockMovements($document);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE: إنشاء حركات المخزون
    // ═══════════════════════════════════════════════════════════════════════

    private function createStockMovements(CommercialDocument $document): void
    {
        $documentType = $document->documentType;
        $direction    = (int) ($documentType?->affects_stock_direction ?? 0);
        if ($direction === 0) return;

        if (!$document->warehouse_id || !$document->fiscal_year_id) {
            Log::warning("createStockMovements: missing warehouse or fiscal_year for doc#{$document->id}");
            return;
        }

        $valuationService    = app(InventoryValuationService::class);

        // ✅ تحديد نوع الحركة حسب الشركة (الأنواع multi-tenant، IDs مختلفة لكل شركة)
        $typeName = match (true) {
            $direction > 0 => 'in',
            $direction < 0 => 'out',
            default        => 'adjustment',
        };
        $stockMovementType = \App\Models\StockMovementType::where('company_id', $document->company_id)
            ->where('name', $typeName)
            ->where('active', true)
            ->first();
        if (!$stockMovementType) {
            Log::warning("createStockMovements: no type '{$typeName}' for company {$document->company_id}");
            return;
        }
        $stockMovementTypeId = $stockMovementType->id;

        foreach ($document->lines as $line) {
            if (!$line->product_id || !$line->product) continue;

            $product = $line->product;
            $baseQty = ($line->packaging_id && $line->packaging_units_snapshot)
                ? round((float) $line->quantity * (float) $line->packaging_units_snapshot, 4)
                : (float) $line->quantity;

            // ── التحقق من المخزون قبل إنشاء الحركة ─────────────────────────
            $shouldCheckStock = false;
            if ($direction < 0 && $product->manages_stock) {
                $allowNegativeGlobal = Setting::getSetting('allow_negative_stock', false, $document->company_id);
                if ($allowNegativeGlobal) {
                    $shouldCheckStock = false; // الإعداد العام يسمح بالمخزون السالب
                } elseif (!$product->allow_negative_stock) {
                    $shouldCheckStock = true; // إعداد المنتج يمنع المخزون السالب
                }
            }
            if ($shouldCheckStock) {
                $available = $this->getAvailableStock(
                    $product->id,
                    $document->warehouse_id,
                    $document->fiscal_year_id,
                    $document->company_id,
                    $document->document_date,
                    $document->id
                );
                if ($baseQty > $available) {
                    throw new BusinessRuleException(
                        "الكمية المطلوبة ({$baseQty}) للمنتج «{$product->name}» تتجاوز المخزون المتاح ({$available}).",
                        409
                    );
                }
            }

            $costPrice = $direction < 0
                ? (float) $valuationService->getCostPriceForSale(
                    $product, $document->warehouse_id, $baseQty
                )
                : (float) $line->unit_price_ht;

            // Store cost price on the document line for margin reporting.
            // cost_price_ht is stored PER UNIT OF SALE (mirrors unit_price_ht): for a
            // packaged line that is per-unit cost × packaging_units_snapshot, so report
            // math `quantity × cost_price_ht` = baseQty × per-unit cost — the SAME basis
            // as total_ht (`quantity × unit_price_ht` = baseQty × per-unit price).
            // The stock movement keeps per-unit cost_price / total_price (PMP correctness).
            if ($costPrice > 0) {
                $lineCostPrice = ($direction < 0 && $line->packaging_id && $line->packaging_units_snapshot)
                    ? round($costPrice * (float) $line->packaging_units_snapshot, 4)
                    : $costPrice;
                $line->update(['cost_price_ht' => $lineCostPrice]);
            }

            StockMovement::create([
                'company_id'                  => $document->company_id,
                'fiscal_year_id'              => $document->fiscal_year_id,
                'warehouse_id'                => $document->warehouse_id,
                'product_id'                  => $line->product_id,
                'stock_movement_type_id'      => $stockMovementTypeId,
                'commercial_document_id'      => $document->id,
                'commercial_document_line_id' => $line->id,
                'quantity'                    => $baseQty,
                'unit_price'                  => (float) $line->unit_price_ht,
                'cost_price'                  => $costPrice,
                'total_price'                 => round($baseQty * $costPrice, 4),
                'movement_date'               => $document->document_date,
                'price_source'                => $direction < 0 ? 'sale' : 'purchase',
                'lot_number'                  => $line->line_attributes['lot_number'] ?? $line->lot_number ?? null,
                'manufacturing_date'          => $line->line_attributes['manufacturing_date'] ?? null,
                'expiration_date'             => $line->line_attributes['expiration_date'] ?? null,
                'is_validated'                => true,
                'user_id'                     => auth()->id(),
                'stock_balance_after'         => 0, // يُحدَّث بـ StockMovementObserver
            ]);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private function getStatusId(int $companyId, string $name): ?int
    {
        return DocumentStatus::where('company_id', $companyId)
            ->where('name', $name)
            ->value('id');
    }

    private function prepareDocumentData(array $data): array
    {
        if (!isset($data['exchange_rate']) && isset($data['currency_id'])) {
            $data['exchange_rate'] = $this->getExchangeRate((int) $data['currency_id']);
        }

        if (isset($data['document_date']) && !isset($data['issued_at'])) {
            $data['issued_at'] = $data['document_date'];
        }

        if (empty($data['document_date'])) {
            $data['document_date'] = now()->toDateString();
        }

        return $data;
    }

    private function resolveNumberingSeries(int $documentTypeId, int $companyId): NumberingSeries
    {
        return NumberingSeries::where('company_id', $companyId)
            ->where('document_type_id', $documentTypeId)
            ->where('is_locked', false)
            ->first()
            ?? NumberingSeries::create([
                'company_id'       => $companyId,
                'document_type_id' => $documentTypeId,
                'prefix'           => DocumentType::where('id', $documentTypeId)->value('code') ?? 'DOC',
                'format'           => '{PREFIX}/{YY}/{NUMBER:6}',
                'last_number'      => 0,
                'padding'          => 6,
                'start_number'     => 1,
                'reset_yearly'     => true,
                'active'           => true,
                'is_locked'        => false,
            ]);
    }

    /**
     * معاينة الرقم التالي للوثيقة — بدون استهلاك ولا قفل صف.
     * نفس منطق generateDocumentNumber() بالضبط (نفس الصيغة) لكنه للعرض فقط
     * (مثل رقم "مسودة" يُطبع قبل إتمام البيع). لا تُنشئ مستنداً ولا تزيد العداد.
     */
    public function previewNextDocumentNumber(DocumentType $documentType, int $companyId): string
    {
        $prefix = $documentType->code;
        $year   = date('Y');

        $last = CommercialDocument::withTrashed()
            ->where('company_id', $companyId)
            ->where('document_number', 'like', "{$prefix}-{$year}-%")
            ->orderByDesc('document_number')
            ->first();

        $seq = 1;
        if ($last) {
            $parts = explode('-', $last->document_number);
            $seq   = (int) end($parts) + 1;
        }

        return sprintf('%s-%s-%06d', $prefix, $year, $seq);
    }

    private function generateDocumentNumber(DocumentType $documentType, int $companyId): string
    {
        return DB::transaction(function () use ($documentType, $companyId) {
            $prefix = $documentType->code;
            $year   = date('Y');

            $last = CommercialDocument::withTrashed()
                ->where('company_id', $companyId)
                ->where('document_number', 'like', "{$prefix}-{$year}-%")
                ->orderByDesc('document_number')
                ->lockForUpdate()
                ->first();

            $seq = 1;
            if ($last) {
                $parts = explode('-', $last->document_number);
                $seq   = (int) end($parts) + 1;
            }

            $result = sprintf('%s-%s-%06d', $prefix, $year, $seq);

            \Illuminate\Support\Facades\Log::debug('[DocGen]', [
                'prefix' => $prefix,
                'year' => $year,
                'company' => $companyId,
                'last_found' => $last?->document_number,
                'seq' => $seq,
                'result' => $result,
            ]);

            return $result;
        });
    }

    private function getCurrentFiscalYearId(int $companyId): ?int
    {
        return FiscalYear::where('company_id', $companyId)
            ->where('is_current', true)
            ->value('id');
    }

    private function getExchangeRate(int $currencyId): float
    {
        if ($currencyId === 1) return 1.0;

        return (float) (\App\Models\ExchangeRate::where('from_currency_id', $currencyId)
            ->where('to_currency_id', 1)
            ->where('date', '<=', now())
            ->orderByDesc('date')
            ->value('rate') ?? 1.0);
    }

    private function getAvailableStock(
        int $productId,
        int $warehouseId,
        int $fiscalYearId,
        int $companyId,
        string $date,
        int $ignoreDocumentId = 0
    ): float
    {
        // Normalize the date to the app's LOCAL calendar day. The incoming value
        // may be a bare "Y-m-d", an app-local Carbon, or a UTC Carbon (from a
        // re-sent API ISO string) whose calendar day differs from the business
        // date (e.g. "2026-08-01T23:00:00.000000Z" == Aug 2 local in UTC+1).
        // Comparing raw datetimes here caused same-day movements to be excluded
        // → false "الكمية المطلوبة تتجاوز المخزون المتاح (0)" on doc edits.
        $date = \Illuminate\Support\Carbon::parse($date)
            ->setTimezone(config('app.timezone'))
            ->format('Y-m-d');

        $opening = (float) DB::table('opening_balances_stock')
            ->where('company_id', $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->value('opening_quantity') ?? 0;

        // التحقق من المخزون عند التعديل يجب أن يتجاهل حركات هذا المستند نفسه
        // (الفروقات الدلتا): البضاعة التي صرفها البيع الأصلي استُهلكت بالفعل،
        // فإذا حُدِّث السعر فقط دون تغيير الكمية يجب ألا يُحظر التعديل.
        $base = StockMovement::where('company_id', $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->where('product_id', $productId)
            ->where('warehouse_id', $warehouseId)
            ->where('is_validated', true)
            ->whereDate('movement_date', '<=', $date)
            ->whereNull('deleted_at');

        if ($ignoreDocumentId > 0) {
            $base = $base->whereDoesntHave('commercialDocumentLine', function ($q) use ($ignoreDocumentId) {
                $q->where('commercial_document_id', $ignoreDocumentId);
            });
        }

        $incoming = (float) (clone $base)
            ->whereHas('stockMovementType', fn($q) => $q->where('direction', '>', 0))
            ->sum('quantity');

        $outgoing = (float) (clone $base)
            ->whereHas('stockMovementType', fn($q) => $q->where('direction', '<', 0))
            ->sum('quantity');

        return $opening + $incoming - $outgoing;
    }

    private function resolveCashPartyId(int $companyId): int
    {
        $party = Party::where('company_id', $companyId)
            ->where('slug', 'client-cash')
            ->first();

        if ($party) {
            return $party->id;
        }

        $clientTypeId = DB::table('party_types')
            ->where('company_id', $companyId)
            ->where('name', 'client')
            ->value('id')
            ?? DB::table('party_types')
                ->where('company_id', $companyId)
                ->value('id');

        $party = Party::create([
            'company_id'        => $companyId,
            'party_type_id'     => $clientTypeId,
            'code'              => 'CC000',
            'name'              => 'Client Cash',
            'slug'              => 'client-cash',
            'is_tva_exempt'     => true,
            'is_taxable'        => false,
            'is_final_consumer' => true,
            'active'            => true,
        ]);

        return $party->id;
    }

    private function buildLineAttributes(array $lineData): ?array
    {
        $attrs = $lineData['line_attributes'] ?? [];
        if (!is_array($attrs)) $attrs = [];

        foreach (['lot_number', 'manufacturing_date', 'expiration_date', 'supplier_lot_number'] as $key) {
            if (!empty($lineData[$key])) {
                $attrs[$key] = $lineData[$key];
            }
        }

        return empty($attrs) ? null : $attrs;
    }
}

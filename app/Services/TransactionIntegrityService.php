<?php

namespace App\Services;

use App\Core\Exceptions\BusinessRuleException;
use App\Models\CommercialDocument;
use App\Models\DocumentStatus;
use App\Models\Setting;
use App\Models\StockMovement;
use App\Models\User;
use App\Services\Tax\FiscalStampCalculator;

/**
 * TransactionIntegrityService — the "clean and clear" money gate.
 *
 * This is a financial/accounting guard. Every document line and every document
 * total is recomputed from FIRST PRINCIPLES (quantity × price × discount × TVA ×
 * packaging snapshot) and compared against what was actually stored. A transaction
 * whose stored numbers do not match the recomputed truth is REJECTED before any
 * side effect is written (stock movement, payment, balance snapshot).
 *
 * Entry points:
 *   - assertPayloadLine()            sanity-check one payload line (create/update)
 *   - assertStoredDocumentClean()    hard gate — runs inside the DB transaction
 *                                    AFTER lines+totals are computed, BEFORE stock
 *                                    /payments/snapshots. Throws to roll everything back.
 *   - violationsForDocument()        same recompute, non-throwing — used by the
 *                                    `documents:integrity-scan` audit command.
 *
 * The recompute mirrors CommercialDocumentLineObserver::calculateLineTotals and
 * CommercialDocumentService::recalculateTotals EXACTLY — if a future change makes
 * those two diverge from the money math, this gate flags the transaction.
 */
class TransactionIntegrityService
{
    /** Tolerance in DZD per field, after rounding to 2 decimals. */
    public const TOLERANCE = 0.02;

    public function __construct(
        private FiscalStampCalculator $stampCalculator,
    ) {}

    // ═══════════════════════════════════════════════════════════════════════
    // PAYLOAD-LEVEL SANITY — runs at the top of every line before it is written
    // ═══════════════════════════════════════════════════════════════════════

    public function assertPayloadLine(array $lineData, int $order, array $perm = []): void
    {
        $errors = [];

        $qty = $lineData['quantity'] ?? null;
        if ($qty === null || !is_numeric($qty) || (float) $qty <= 0 || !is_finite((float) $qty)) {
            $errors[] = 'الكمية يجب أن تكون رقماً موجباً';
        }

        $price = $lineData['unit_price_ht'] ?? null;
        if ($price === null || !is_numeric($price) || (float) $price < 0 || !is_finite((float) $price)) {
            $errors[] = 'سعر الوحدة يجب أن يكون رقماً غير سالب';
        }

        $discPct = (float) ($lineData['discount_percentage'] ?? 0);
        if (!is_finite($discPct) || $discPct < 0 || $discPct > 100) {
            $errors[] = "نسبة الخصم ({$discPct}%) خارج النطاق المسموح (0–100%)";
        }

        $discAmt = (float) ($lineData['discount_amount_per_unit'] ?? 0);
        if (!is_finite($discAmt) || $discAmt < 0) {
            $errors[] = 'الخصم الثابت لا يمكن أن يكون سالباً';
        }

        $tva = (float) ($lineData['tva_rate'] ?? 0);
        if (!is_finite($tva) || $tva < 0 || $tva > 100) {
            $errors[] = "نسبة TVA ({$tva}%) خارج النطاق المسموح (0–100%)";
        }

        // Pack contract: a packaged line must carry a positive pack factor.
        if (!empty($lineData['packaging_id'])) {
            $declared = isset($lineData['pack_qty']) ? (float) $lineData['pack_qty'] : 0.0;
            $hasSnapshot = array_key_exists('packaging_units_snapshot', $lineData)
                && $lineData['packaging_units_snapshot'] !== null
                && (float) $lineData['packaging_units_snapshot'] > 0;
            if (!$hasSnapshot && $declared <= 0) {
                $errors[] = 'سطر معبّأ بدون معامل تعبئة (pack_qty أو packaging_units_snapshot) موجب';
            }
        }

        if (!empty($errors)) {
            throw new BusinessRuleException(
                'سطر غير سليم مادياً (' . ($order + 1) . '): ' . implode('؛ ', $errors) . '. ' .
                'تم رفض المعاملة للحفاظ على سلامة الحسابات.',
                422
            );
        }

        // Task 10 — RBAC permission gate. Runs AFTER the arithmetic sanity checks so
        // a malformed line always surfaces as the 422 shape error first; this block
        // only answers "may this actor RAISE an existing line's price/discount?".
        // On EDIT the caller resolves $perm once per document: update = editing,
        // price_allowed / discount_allowed = grants (own-draft exception applied),
        // original = the stored line snapshot keyed by line_order, or null for a
        // brand-new line. $perm === [] on create/copy flows → this block is inert.
        if (!empty($perm['update'])) {
            $this->assertLineGrants($lineData, $perm);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RBAC LINE PRICE/DISCOUNT GATE (Task 10)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Resolve whether the current actor may RAISE an existing line's price and
     * discount during an UPDATE. Only a real authenticated backend User editing an
     * EXISTING document ($update = true) is gated; create/copy flows and portal
     * actors ($user is a PortalUser, not App\Models\User) are never blocked.
     *
     * Own-draft exception: the author editing their own DRAFT may freely adjust
     * price/discount via update_own_commercial_document — mirrors the policy.
     *
     * @return array{update: bool, price_allowed: bool, discount_allowed: bool}
     */
    public function resolveLineEditPerms(mixed $user, CommercialDocument $document, bool $update): array
    {
        if (!$update || !($user instanceof User)) {
            return [
                'update'           => false,
                'price_allowed'    => true,
                'discount_allowed' => true,
            ];
        }

        $isOwnDraft = $document->documentStatus?->name === 'draft'
            && $user->can('update_own_commercial_document')
            && (int) $document->created_by === (int) $user->id;

        return [
            'update'           => true,
            'price_allowed'    => $isOwnDraft || $user->can('change_price_commercial_document'),
            'discount_allowed' => $isOwnDraft || $user->can('apply_discount_commercial_document'),
        ];
    }

    /**
     * Controller pre-save convenience: resolve the grants once for the whole
     * document, then apply them per sent line against the original stored snapshot.
     * Throws 403 on the first forbidden increase; no writes have happened yet.
     *
     * @param  array<int,array<string,mixed>>  $sentLines
     * @param  array<int,array<string,mixed>>  $originalLinesByOrder  keyed by line_order
     */
    public function assertAllowedLinePermissionChanges(
        mixed $user,
        array $sentLines,
        array $originalLinesByOrder,
        CommercialDocument $document
    ): void {
        $perm = $this->resolveLineEditPerms($user, $document, true);
        if (empty($perm['update'])) {
            return;
        }

        foreach ($sentLines as $order => $lineData) {
            $lineOrder = (int) ($lineData['line_order'] ?? ($order + 1));
            $this->assertLineGrants($lineData, $perm + [
                'original' => $originalLinesByOrder[$lineOrder] ?? null,
            ]);
        }
    }

    /**
     * Throw a 403 BusinessRuleException when the actor is not allowed to RAISE an
     * existing line's discount or price. The 422 arithmetic validation already ran
     * above; this is a pure grant check against the ORIGINAL stored line.
     */
    private function assertLineGrants(array $lineData, array $perm): void
    {
        if (empty($perm['update'])) {
            return;
        }

        $original = is_array($perm['original'] ?? null) ? $perm['original'] : null;

        // Discount first, then price.
        if (empty($perm['discount_allowed']) && $this->discountIncreased($lineData, $original)) {
            throw new BusinessRuleException('لا تملك صلاحية تطبيق الخصومات.', 403);
        }

        if (empty($perm['price_allowed']) && $this->priceChanged($lineData, $original)) {
            throw new BusinessRuleException('لا تملك صلاحية تغيير الأسعار.', 403);
        }
    }

    /**
     * True when the sent line carries MORE discount than the stored original.
     * A sent discount of zero (unset) is never a violation — quantity-only edits
     * that re-send stored values (or undercut them) always pass, so the gate only
     * ever blocks genuinely increased discounts.
     */
    private function discountIncreased(array $lineData, ?array $original): bool
    {
        $sentPct = (float) ($lineData['discount_percentage'] ?? 0);
        $sentAmt = (float) ($lineData['discount_amount_per_unit'] ?? 0);

        if ($sentPct <= 0 && $sentAmt <= 0) {
            return false;
        }

        $origPct = (float) ($original['discount_percentage'] ?? 0);
        $origAmt = (float) ($original['discount_amount_per_unit'] ?? 0);

        return $sentPct > $origPct + 0.0005 || $sentAmt > $origAmt + 0.0005;
    }

    /**
     * True when the sent line's PER-UNIT price differs from the stored original's
     * PER-UNIT price. Stored unit_price_ht is the PACK price when a packaging
     * snapshot exists; payload unit_price_ht is always PER-UNIT (Phase 51) — both
     * are normalized to the same per-unit basis before comparing.
     */
    private function priceChanged(array $lineData, ?array $original): bool
    {
        if (!is_array($original)) {
            return false; // brand-new line — a price is being created, not changed
        }

        $snap        = (float) ($original['packaging_units_snapshot'] ?? 1);
        $origPerUnit = $snap > 1
            ? (float) $original['unit_price_ht'] / $snap
            : (float) $original['unit_price_ht'];

        $sentPrice = (float) ($lineData['unit_price_ht'] ?? 0);

        return abs(round($sentPrice, 4) - round($origPerUnit, 4)) > 0.0005;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STORED-DOCUMENT RECOMPUTE — first-principles verification
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Recompute one stored line's money fields.
     *
     * Mirrors CommercialDocumentLineObserver::calculateLineTotals exactly.
     *
     * @param  array<string,mixed>  $fields  raw line attributes
     * @return array{expected: array<string,float>, stored: array<string,float>}
     */
    public function recomputeLine(array $fields): array
    {
        // Mirror the model's decimal casts (CommercialDocumentLine $casts) — the
        // observer computes totals from ACCESSOR values (e.g. quantity decimal:3),
        // never the raw stored float. Rounding here keeps the gate in lockstep:
        // 0.681818 (raw) must be read as 0.682, exactly like $line->quantity.
        $qty      = round((float) ($fields['quantity']                ?? 0), 3);
        $price    = round((float) ($fields['unit_price_ht']           ?? 0), 4);
        $tvaRate  = round((float) ($fields['tva_rate']                ?? 0), 2);
        $discPct  = round((float) ($fields['discount_percentage']     ?? 0), 4);
        $discAmt  = round((float) ($fields['discount_amount_per_unit'] ?? 0), 4);
        // Verbatim parity with CommercialDocumentLineObserver::calculateLineTotals:
        // `packaging_units_snapshot ?? 1` with NO clamping. The observer never
        // sanitizes a <=0 snapshot, so neither may the gate — any extra clamp here
        // would mask a real divergence instead of flagging it.
        $snapshot = round((float) ($fields['packaging_units_snapshot'] ?? 1), 4);

        $gross = $qty * $price;

        // Native fixed-amount path: per-base-unit × baseQty (qty × packQty)
        if ($discAmt > 0) {
            $discountTotal = $discAmt * ($qty * $snapshot);
            $unitDiscount  = $discAmt;
        } else {
            $discountTotal = $gross * ($discPct / 100);
            $unitDiscount  = $price * ($discPct / 100);
        }

        $ht  = $gross - $discountTotal;
        $tva = $ht * ($tvaRate / 100);

        return [
            'expected' => [
                'total_ht'              => round($ht, 4),
                'total_tva'             => round($tva, 4),
                'total_ttc'             => round($ht + $tva, 4),
                'total_discount_amount' => round($discountTotal, 4),
                'discount_amount'       => round($unitDiscount, 4),
            ],
            'stored' => [
                'total_ht'              => round((float) ($fields['total_ht']              ?? 0), 4),
                'total_tva'             => round((float) ($fields['total_tva']             ?? 0), 4),
                'total_ttc'             => round((float) ($fields['total_ttc']             ?? 0), 4),
                'total_discount_amount' => round((float) ($fields['total_discount_amount'] ?? 0), 4),
                'discount_amount'       => round((float) ($fields['discount_amount']       ?? 0), 4),
            ],
        ];
    }

    /**
     * Return a list of human-readable violations for a stored document.
     * Empty array = the transaction is clean and clear.
     *
     * Mirrors CommercialDocumentService::recalculateTotals for the document totals.
     *
     * @return string[]
     */
    public function violationsForDocument(CommercialDocument $document): array
    {
        $violations = [];
        $document->loadMissing('lines');

        $sumHt = 0.0;
        $sumTva = 0.0;
        $sumDisc = 0.0;

        foreach ($document->lines as $line) {
            $r = $this->recomputeLine($line->getAttributes());
            $label = 'السطر ' . ($line->line_order ?? '?') . " (#{$line->id})";

            foreach (['total_ht', 'total_tva', 'total_ttc', 'total_discount_amount', 'discount_amount'] as $f) {
                if (abs($r['stored'][$f] - $r['expected'][$f]) > self::TOLERANCE) {
                    $violations[] = "{$label}: {$f} مخزَّن {$r['stored'][$f]} ≠ متوقع {$r['expected'][$f]}";
                }
            }

            $sumHt   += $r['stored']['total_ht'];
            $sumTva  += $r['stored']['total_tva'];
            $sumDisc += $r['stored']['total_discount_amount'];
        }

        $rawTtc   = $sumHt + $sumTva;
        $docCheck = [
            'total_ht'       => round($sumHt, 2),
            'total_tva'      => round($sumTva, 2),
            'total_discount' => round($sumDisc, 2),
            'total_ttc'      => round($rawTtc, 2),
        ];

        foreach ($docCheck as $f => $expected) {
            $stored = (float) ($document->getAttribute($f) ?? 0);
            if (abs($stored - $expected) > self::TOLERANCE) {
                $violations[] = "الوثيقة: {$f} مخزَّن {$stored} ≠ متوقع {$expected}";
            }
        }

        // Fiscal stamp — only when the setting is on AND the doc type is an
        // accounting document (mirrors recalculateTotals). Non-accounting docs
        // (orders/quotes/delivery notes, affects_accounting = false) never carry
        // a stamp, so expecting one would false-positive on them.
        $document->loadMissing('documentType');
        $isAccounting = (bool) ($document->documentType?->affects_accounting ?? true);

        $stampEnabled = $isAccounting
            && Setting::getSetting('fiscal_stamp_enabled', true, $document->company_id);
        if ($stampEnabled) {
            // Mirror recalculateTotals' try/catch: a calculator failure stores
            // stamp = 0.0 there, so expecting anything else here would flag the
            // very document the service just saved as "unclean".
            try {
                $expectedStamp = round($this->stampCalculator->calculateFromAmount($rawTtc), 2);
            } catch (\Throwable) {
                $expectedStamp = 0.0;
            }
            $storedStamp   = (float) ($document->getAttribute('total_stamp') ?? 0);
            if (abs($storedStamp - $expectedStamp) > self::TOLERANCE) {
                $violations[] = "الوثيقة: total_stamp مخزَّن {$storedStamp} ≠ متوقع {$expectedStamp}";
            }

            $expectedNet = round($rawTtc + $expectedStamp, 2);
            $storedNet   = (float) ($document->getAttribute('net_to_pay') ?? 0);
            if (abs($storedNet - $expectedNet) > self::TOLERANCE) {
                $violations[] = "الوثيقة: net_to_pay مخزَّن {$storedNet} ≠ متوقع {$expectedNet}";
            }
        }

        // Cancelled-document reversal guard — a cancelled doc must have a reverse
        // movement for every one of its original stock movements, otherwise its
        // stock was never restored. The status is read FRESH from the table (the
        // in-memory relation goes stale after saveQuietly()/updateQuietly()), and
        // the movements are queried directly by line id — never through the
        // relation, whose cached collection could mask a missing reversal.
        $rawStatus = DocumentStatus::where('id', (int) $document->document_status_id)->value('name');
        $isCancelled = $rawStatus === 'cancelled';
        $affectsStock = (int) ($document->documentType?->affects_stock_direction ?? 0) !== 0;
        if ($isCancelled && $affectsStock) {
            // Load the lines relation once so pluck() works below; the movements
            // themselves stay a fresh direct query.
            if ($document->relationLoaded('lines')) {
                $lineIds = $document->lines->pluck('id')->all();
            } else {
                $lineIds = $document->lines()->pluck('id')->all();
            }

            if (!empty($lineIds)) {
                $movements = StockMovement::whereIn('commercial_document_line_id', $lineIds)
                    ->get(['id', 'parent_movement_id', 'product_id', 'reason']);
                $reversed = [];
                foreach ($movements as $m) {
                    if ($m->reason === StockMovement::CANCELLATION_REVERSAL_REASON && (int) $m->parent_movement_id > 0) {
                        $reversed[(int) $m->parent_movement_id] = (int) $m->id;
                    }
                }
                foreach ($movements as $m) {
                    if ($m->reason === StockMovement::CANCELLATION_REVERSAL_REASON) {
                        continue;
                    }
                    if (!array_key_exists((int) $m->id, $reversed)) {
                        $violations[] = "الوثيقة ملغاة: حركة المخزون #{$m->id} (منتج #{$m->product_id}) بدون حركة عكسية — المخزون لم يُسترجع";
                    }
                }
            }
        }

        return $violations;
    }

    /**
     * Hard gate. Called inside the DB transaction right after lines + totals are
     * computed and BEFORE stock movements / payments / balance snapshots.
     * Throws BusinessRuleException — BaseService rolls the whole transaction back.
     */
    public function assertStoredDocumentClean(CommercialDocument $document): void
    {
        $violations = $this->violationsForDocument($document);

        if (!empty($violations)) {
            throw new BusinessRuleException(
                'معاملة غير سليمة مادياً (' . $document->document_number . '): ' . implode(' | ', $violations)
                . '. تم رفض حفظ المعاملة للحفاظ على سلامة الحسابات.',
                422
            );
        }
    }
}

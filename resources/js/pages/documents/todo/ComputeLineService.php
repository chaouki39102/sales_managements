<?php

namespace App\Services;

use App\Models\CommercialDocument;
use App\Models\Party;
use App\Models\Product;
use App\Models\ProductLot;
use App\Models\StockMovement;
use App\Services\Tax\FiscalStampCalculator;
use Illuminate\Support\Facades\DB;

/**
 * ComputeLineService
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * المسؤولية الوحيدة: حساب كل تفاصيل سطر واحد بناءً على قواعد الباكاند الكاملة.
 *
 * يُستدعى من:
 *   - POST /{company}/documents/compute-line   (الفرونتند)
 *   - CommercialDocumentService::createDocumentLines (التحقق الداخلي)
 *
 * يضمن أن الفرونتند والباكاند يستخدمان نفس المنطق دائماً.
 *
 * ══ المدخلات ═════════════════════════════════════════════════════════════════
 *
 *   product_id      int      المنتج
 *   quantity        float    عدد العبوات (displayQty) — يُحوَّل داخلياً
 *   packaging_id    int|null التعبئة المختارة
 *   price_level_id  int|null فئة السعر
 *   warehouse_id    int|null المستودع (لفحص المخزون)
 *   party_id        int|null المتعامل (للإعفاء الضريبي)
 *   is_purchase     bool     شراء أم بيع
 *   document_date   string   تاريخ المستند (لحساب المخزون في التاريخ)
 *
 * ══ المخرجات ════════════════════════════════════════════════════════════════
 *
 *   unit_price_ht           float   سعر الوحدة الأساسية HT
 *   price_per_pack          float   سعر العبوة = unit_price_ht × pack_qty
 *   pack_qty                float   عدد الوحدات في العبوة
 *   discount_percentage     float   نسبة الخصم المُطبَّقة
 *   discount_amount_per_unit float  خصم الوحدة = unit_price × discPct/100
 *   discount_amount_per_pack float  خصم العبوة = unit_price × discPct/100 × pack_qty
 *   tva_rate                float   معدل TVA (0 إذا معفى)
 *   base_qty                float   الكمية بالوحدات الأساسية = quantity × pack_qty
 *   total_ht                float   إجمالي HT
 *   total_tva               float   إجمالي TVA
 *   total_ttc               float   إجمالي TTC
 *   stock_available         float|null  المخزون المتاح (null إذا لم يُحدَّد مستودع)
 *   lot_suggestions         array   الأكوام المقترحة مرتبة FEFO
 *   is_quantity_blocked     bool    هل النطاق محجوب (is_blocked)
 *   quantity_discount_tier  array|null  نطاق الخصم المُطبَّق
 *   is_tva_exempt           bool    هل المتعامل معفى من TVA
 *   party_credit_info       array|null  معلومات الائتمان
 *   cost_price              float   سعر التكلفة (للهامش)
 *   margin_amount           float   مبلغ الهامش = unit_price - cost_price
 *   margin_percentage       float   نسبة الهامش %
 *   warnings                array   تحذيرات (مخزون منخفض، صلاحية قريبة...)
 *
 * ══════════════════════════════════════════════════════════════════════════════
 */
class ComputeLineService
{
    public function __construct(
        private CompanyContextService $companyContext,
        private PartyBalanceService   $partyBalanceService,
    ) {}

    /**
     * الدالة الرئيسية — تحسب كل شيء عن سطر واحد.
     */
    public function compute(array $input): array
    {
        $companyId   = $this->companyContext->get();
        $productId   = (int) ($input['product_id'] ?? 0);
        $displayQty  = (float) ($input['quantity'] ?? 1);
        $packagingId = isset($input['packaging_id']) ? (int) $input['packaging_id'] : null;
        $levelId     = isset($input['price_level_id']) ? (int) $input['price_level_id'] : null;
        $warehouseId = isset($input['warehouse_id']) ? (int) $input['warehouse_id'] : null;
        $partyId     = isset($input['party_id']) ? (int) $input['party_id'] : null;
        $isPurchase  = (bool) ($input['is_purchase'] ?? false);
        $docDate     = $input['document_date'] ?? now()->toDateString();

        // ── المنتج ────────────────────────────────────────────────────────────
        $product = Product::with([
            'tva',
            'packagings',
            'prices',
            'quantityDiscounts',
            'lots' => fn($q) => $q->where('remaining_quantity', '>', 0)->orderByRaw('expiration_date IS NULL, expiration_date ASC'),
        ])->where('company_id', $companyId)->findOrFail($productId);

        // ── التعبئة ───────────────────────────────────────────────────────────
        $packaging = null;
        $packQty   = 1.0;
        if ($packagingId) {
            $packaging = $product->packagings->firstWhere('id', $packagingId);
            $packQty   = $packaging ? max(1.0, (float) $packaging->quantity) : 1.0;
        }
        if (!$packaging) {
            $packaging = $product->packagings->firstWhere('is_default', true)
                ?? $product->packagings->first();
            if ($packaging && !$packagingId) {
                $packQty = max(1.0, (float) $packaging->quantity);
            }
        }

        // الكمية بالوحدات الأساسية
        $baseQty = round($displayQty * $packQty, 6);

        // ── المتعامل (للإعفاء الضريبي والائتمان) ─────────────────────────────
        $party        = null;
        $isTvaExempt  = false;
        if ($partyId) {
            $party = Party::with('defaultPriceLevel')
                ->where('company_id', $companyId)
                ->find($partyId);
            $isTvaExempt = $party?->is_tva_exempt ?? false;

            // إذا لم يُحدَّد price_level_id → خذ من الزبون
            if (!$levelId && $party?->default_price_level_id) {
                $levelId = $party->default_price_level_id;
            }
        }

        // ── السعر ────────────────────────────────────────────────────────────
        $unitPrice = 0.0;
        if ($isPurchase) {
            $unitPrice = (float) ($product->purchase_price_ht ?? $product->current_cost_price ?? 0);
        } elseif ($levelId) {
            $unitPrice = $product->computedPrice($levelId);
            // fallback للسعر الافتراضي
            if (!$unitPrice) {
                $unitPrice = (float) ($product->default_selling_price_ht ?? 0);
            }
        } else {
            $unitPrice = (float) ($product->default_selling_price_ht ?? 0);
            // fallback سعر الشراء + 30%
            if (!$unitPrice) {
                $cost = (float) ($product->purchase_price_ht ?? $product->current_cost_price ?? 0);
                $unitPrice = $cost > 0 ? round($cost * 1.3, 4) : 0;
            }
        }

        $pricePerPack = round($unitPrice * $packQty, 4);

        // ── الخصم ────────────────────────────────────────────────────────────
        $discountPct      = 0.0;
        $isQuantityBlocked = false;
        $discountTier     = null;

        if (!$isPurchase && $levelId && $product->manages_quantity_discounts) {
            $discount = $product->applicableDiscount($levelId, $baseQty);

            if ($discount) {
                if ($discount->is_blocked) {
                    $isQuantityBlocked = true;
                } else {
                    $discountPct = (float) ($discount->discount_percentage ?? 0);
                    $discountTier = [
                        'min_qty'  => $discount->min_qty,
                        'max_qty'  => $discount->max_qty,
                        'tier_order' => $discount->tier_order,
                    ];
                }
            }
        }

        // ── TVA ───────────────────────────────────────────────────────────────
        $tvaRate = $isTvaExempt ? 0.0 : (float) ($product->tva?->rate ?? 0);

        // ── الحساب النهائي ───────────────────────────────────────────────────
        $gross       = round($unitPrice * $baseQty, 4);
        $discountAmt = round($gross * ($discountPct / 100), 4);
        $ht          = round($gross - $discountAmt, 4);
        $tva         = round($ht * ($tvaRate / 100), 4);
        $ttc         = round($ht + $tva, 4);

        $discountPerUnit = round($unitPrice * ($discountPct / 100), 4);
        $discountPerPack = round($discountPerUnit * $packQty, 4);

        // ── سعر التكلفة والهامش ──────────────────────────────────────────────
        $costPrice = (float) ($product->current_cost_price ?? $product->purchase_price_ht ?? 0);
        $marginAmount = $isPurchase ? 0.0 : round($unitPrice - $costPrice, 4);
        $marginPct    = ($costPrice > 0 && !$isPurchase)
            ? round(($marginAmount / $unitPrice) * 100, 2)
            : 0.0;

        // ── المخزون ──────────────────────────────────────────────────────────
        $stockAvailable = null;
        if ($warehouseId && $product->manages_stock) {
            $stockAvailable = (float) (
                StockMovement::where('product_id', $productId)
                    ->where('warehouse_id', $warehouseId)
                    ->latest('id')
                    ->value('stock_balance_after') ?? 0
            );
        }

        // ── الأكوام FEFO ─────────────────────────────────────────────────────
        $lotSuggestions = [];
        if ($product->has_lots) {
            $lotSuggestions = $product->lots
                ->when($warehouseId, fn($c) => $c->where('warehouse_id', $warehouseId))
                ->take(5)
                ->map(fn($lot) => [
                    'id'                  => $lot->id,
                    'lot_number'          => $lot->lot_number,
                    'remaining_quantity'  => $lot->remaining_quantity,
                    'expiration_date'     => $lot->expiration_date?->format('Y-m-d'),
                    'legal_selling_price' => $lot->legal_selling_price,
                    'is_expiring_soon'    => $lot->expiration_date
                        && $lot->expiration_date->diffInDays(now()) <= 30,
                    'is_expired'          => $lot->expiration_date
                        && $lot->expiration_date->isPast(),
                ])
                ->values()
                ->toArray();
        }

        // ── التحذيرات ────────────────────────────────────────────────────────
        $warnings = [];

        if ($isQuantityBlocked) {
            $warnings[] = [
                'type'    => 'quantity_blocked',
                'level'   => 'error',
                'message' => "هذا النطاق من الكميات محجوب بسياسة التسعير. لا يمكن البيع بهذه الكمية.",
            ];
        }

        if ($stockAvailable !== null && !$isPurchase && $product->manages_stock) {
            if ($baseQty > $stockAvailable) {
                if (!$product->allow_negative_stock) {
                    $warnings[] = [
                        'type'    => 'insufficient_stock',
                        'level'   => 'warning',
                        'message' => "الكمية المطلوبة ({$baseQty}) تتجاوز المتاح ({$stockAvailable} وحدة)",
                    ];
                } else {
                    $warnings[] = [
                        'type'    => 'negative_stock',
                        'level'   => 'info',
                        'message' => "البيع سيجعل المخزون سالباً ({$stockAvailable} - {$baseQty})",
                    ];
                }
            } elseif ($stockAvailable <= (float) ($product->min_stock_alert ?? 0)) {
                $warnings[] = [
                    'type'    => 'low_stock',
                    'level'   => 'warning',
                    'message' => "المخزون منخفض ({$stockAvailable} وحدة) — أقل من حد التنبيه",
                ];
            }
        }

        // تحذير كوم منتهية الصلاحية أو قريبة
        foreach ($lotSuggestions as $lot) {
            if ($lot['is_expired']) {
                $warnings[] = [
                    'type'    => 'lot_expired',
                    'level'   => 'error',
                    'message' => "الكوم {$lot['lot_number']} منتهية الصلاحية",
                ];
                break;
            }
            if ($lot['is_expiring_soon']) {
                $warnings[] = [
                    'type'    => 'lot_expiring_soon',
                    'level'   => 'warning',
                    'message' => "الكوم {$lot['lot_number']} ستنتهي صلاحيتها قريباً ({$lot['expiration_date']})",
                ];
                break;
            }
        }

        if ($marginPct < 0 && !$isPurchase) {
            $warnings[] = [
                'type'    => 'negative_margin',
                'level'   => 'error',
                'message' => "السعر أقل من سعر التكلفة — هامش سالب: {$marginPct}%",
            ];
        }

        // ── معلومات الائتمان ─────────────────────────────────────────────────
        $partyCreditInfo = null;
        if ($party && !$isPurchase && $party->credit_limit > 0) {
            try {
                $balance = $this->partyBalanceService->getBalanceAt($partyId, $docDate);
                $usedCredit = $balance['current_balance'];
                $available  = max(0, (float) $party->credit_limit - $usedCredit);
                $willExceed = ($usedCredit + $ttc) > (float) $party->credit_limit;

                $partyCreditInfo = [
                    'credit_limit'       => (float) $party->credit_limit,
                    'used_credit'        => $usedCredit,
                    'available_credit'   => $available,
                    'will_exceed'        => $willExceed,
                    'exceed_by'          => $willExceed
                        ? round(($usedCredit + $ttc) - (float) $party->credit_limit, 4)
                        : 0,
                    'credit_days'        => $party->credit_days,
                ];

                if ($willExceed) {
                    $warnings[] = [
                        'type'    => 'credit_limit_exceeded',
                        'level'   => 'error',
                        'message' => "سيتجاوز هذا المستند حد الائتمان بمقدار " . number_format($partyCreditInfo['exceed_by'], 2) . " دج",
                    ];
                }
            } catch (\Throwable) {
                // لا نوقف العملية بسبب فشل حساب الائتمان
            }
        }

        return [
            // السعر
            'unit_price_ht'            => $unitPrice,
            'price_per_pack'           => $pricePerPack,
            'pack_qty'                 => $packQty,
            'packaging_id'             => $packaging?->id,
            'packaging_label'          => $packaging?->label,

            // الخصم
            'discount_percentage'      => $discountPct,
            'discount_amount_per_unit' => $discountPerUnit,
            'discount_amount_per_pack' => $discountPerPack,
            'is_quantity_blocked'      => $isQuantityBlocked,
            'quantity_discount_tier'   => $discountTier,

            // TVA
            'tva_rate'                 => $tvaRate,
            'is_tva_exempt'            => $isTvaExempt,

            // الكميات
            'base_qty'                 => $baseQty,

            // الإجماليات
            'total_ht'                 => $ht,
            'total_tva'                => $tva,
            'total_ttc'                => $ttc,

            // المخزون
            'stock_available'          => $stockAvailable,
            'lot_suggestions'          => $lotSuggestions,

            // الهامش
            'cost_price'               => $costPrice,
            'margin_amount'            => $marginAmount,
            'margin_percentage'        => $marginPct,

            // فئة السعر المستخدمة
            'effective_price_level_id' => $levelId,

            // الائتمان
            'party_credit_info'        => $partyCreditInfo,

            // التحذيرات
            'warnings'                 => $warnings,
        ];
    }

    /**
     * حساب إجماليات كامل المستند (للتحقق قبل الحفظ).
     * يُستدعى من POST /documents/compute-totals
     */
    public function computeDocument(array $lines, bool $applyStamp, int $companyId): array
    {
        $totalHt       = 0;
        $totalTva      = 0;
        $totalDiscount = 0;
        $totalTtc      = 0;
        $computedLines = [];

        foreach ($lines as $line) {
            $result = $this->compute($line);
            $totalHt       += $result['total_ht'];
            $totalTva      += $result['total_tva'];
            $totalDiscount += round($result['discount_amount_per_unit'] * $result['base_qty'], 4);
            $computedLines[] = $result;
        }

        $totalTtc = round($totalHt + $totalTva, 4);

        $stampAmount = 0;
        if ($applyStamp && $totalTtc >= 30_000) {
            $stampAmount = min((int) ceil($totalTtc * 0.01), 2_500);
        }

        return [
            'total_ht'       => round($totalHt,       4),
            'total_tva'      => round($totalTva,       4),
            'total_discount' => round($totalDiscount,  4),
            'total_ttc'      => $totalTtc,
            'total_stamp'    => $stampAmount,
            'net_to_pay'     => round($totalTtc + $stampAmount, 4),
            'lines'          => $computedLines,
        ];
    }
}

<?php

namespace App\Services;

use App\Core\Traits\ResolvesFiscalYear;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * InventoryStockService — النسخة المدمجة النهائية
 * ══════════════════════════════════════════════════════════════════
 * إصلاحات عن النسخة الأصلية:
 *
 * 1. resolveFiscalYearId() بدل when(!$fiscalYear, whereRaw('1=0'))
 *    قبل: تاريخ خارج السنوات المالية → صفر صامت
 *    بعد: BusinessRuleException صريح — متسق مع PartyBalanceService
 *
 * 2. whereNull('sm.deleted_at') على stock_movements
 *    DB::table() لا يطبق SoftDeletes تلقائياً
 *
 * 3. يستخدم ResolvesFiscalYear trait — مصدر وحيد لمنطق السنة المالية
 *    مشترك مع PartyBalanceService و TreasuryBalanceService
 * ══════════════════════════════════════════════════════════════════
 */
class InventoryStockService
{
    use ResolvesFiscalYear;

    /**
     * مفتاح إصدار ذاكرة المخزون لكل شركة.
     *
     * مخزن الملفات (file cache) لا يدعم tags ولا مسحاً ببادئة، لذلك تُدمج قيمة
     * إصدار متزايدة في مفتاح stock-at. أي كتابة/حذف لحركات المخزون
     * (عبر StockMovementObserver) تزيد الإصدار فتبطل كل مفاتيح الشركة فوراً
     * دون انتظار انتهاء TTL — مهم لأن الواجهة تعيد جلب stock-at بعد كل عملية بيع.
     */
    public static function invalidateCache(int $companyId): void
    {
        Cache::increment('stock-at-version:' . $companyId);
    }

    private static function stockVersion(int $companyId): int
    {
        return (int) Cache::get('stock-at-version:' . $companyId, 0);
    }

    public function __construct(
        private CompanyContextService $companyContext
    ) {}

    /**
     * المخزون الفعلي لكل المنتجات في تاريخ محدد.
     *
     * المعادلة:
     *   current_stock = opening_quantity (للسنة المالية المطابقة للتاريخ)
     *                 + SUM(direction=+1 × quantity) حتى التاريخ
     *                 - SUM(direction=-1 × quantity) حتى التاريخ
     *
     * سعر التكلفة (بالأولوية):
     *   1. product.current_cost_price (إذا > 0)
     *   2. آخر سعر شراء من الحركات
     *   3. opening_value / opening_quantity
     *   4. صفر
     *
     * @throws \App\Core\Exceptions\BusinessRuleException
     */
    public function getStockAt(
        string  $date,
        ?int    $warehouseId  = null,
        ?string $search      = null,
        ?int    $fiscalYearId = null
    ): array {
        $companyId = $this->companyContext->get();
        $fiscalYearId ??= $this->resolveFiscalYearId($companyId, $date);

        // توحيد التاريخ إلى Y-m-d (بعض المتصلين قد يمررون datetime كاملاً)
        // ثم إغلاق اليوم بـ 23:59:59 — يُبقي المقارنة sargable لتستخدم الفهرس
        // المركب stock_movements_company_id_fiscal_year_id_movement_date_index
        // بدلاً من strftime غير القابل للفهرسة في whereDate.
        $date = substr(trim($date), 0, 10);

        // ─── 1. الرصيد الافتتاحي ─────────────────────────────────────────────
        $openingQuery = DB::table('opening_balances_stock')
            ->select(
                'product_id',
                DB::raw('SUM(opening_quantity) as opening_qty'),
                DB::raw('SUM(opening_value)    as opening_val')
            )
            ->where('company_id',     $companyId)
            ->where('fiscal_year_id', $fiscalYearId)
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->groupBy('product_id');

        // ─── 2. حركات المخزون حتى التاريخ ───────────────────────────────────
        $movementsQuery = DB::table('stock_movements as sm')
            ->join('stock_movement_types as smt', function ($j) {
                $j->on('smt.id', '=', 'sm.stock_movement_type_id')
                  ->on('smt.company_id', '=', 'sm.company_id');
            })
            ->select(
                'sm.product_id',
                DB::raw('SUM(CASE WHEN smt.direction > 0 THEN sm.quantity ELSE 0 END) as total_in'),
                DB::raw('SUM(CASE WHEN smt.direction < 0 THEN sm.quantity ELSE 0 END) as total_out'),
                DB::raw('MAX(CASE WHEN smt.direction > 0 THEN sm.unit_price ELSE NULL END) as last_purchase_price'),
            )
            ->where('sm.company_id',     $companyId)
            ->where('sm.fiscal_year_id', $fiscalYearId)
            ->where('sm.is_validated',   true)
            ->whereNull('sm.deleted_at')
            ->where('sm.movement_date', '<=', $date . ' 23:59:59')
            ->when($warehouseId, fn($q) => $q->where('sm.warehouse_id', $warehouseId))
            ->groupBy('sm.product_id');

        // ─── 2.5. عدد الدفعات النشطة لكل منتج ──────────────────────────────────
        $lotsCountQuery = DB::table('product_lots')
            ->select('product_id', DB::raw('COUNT(*) as lots_count'))
            ->where('company_id', $companyId)
            ->where('active', true)
            ->where('remaining_quantity', '>', 0)
            ->whereNull('deleted_at')
            ->when($warehouseId, fn($q) => $q->where('warehouse_id', $warehouseId))
            ->groupBy('product_id');

        // ─── 3. Query الرئيسية (مخزنة 60 ثانية) ────────────────────────────────
        $cacheKey = 'stock-at:v' . self::stockVersion($companyId) . ':' . implode('_', [$companyId, $date, $warehouseId ?? 'all', $fiscalYearId, $search ?? '']);
        $rows = Cache::remember($cacheKey, 60, function () use (
            $companyId, $date, $warehouseId, $fiscalYearId, $search, $openingQuery, $movementsQuery, $lotsCountQuery,
        ) {
            return DB::table('products as p')
            ->select(
                'p.id',
                'p.name',
                'p.ref',
                'p.min_stock_alert',
                'p.manages_stock',
                'p.active',
                DB::raw('COALESCE(ob.opening_qty, 0) as opening_quantity'),
                DB::raw('COALESCE(mv.total_in,  0)  as total_in'),
                DB::raw('COALESCE(mv.total_out, 0)  as total_out'),
                DB::raw('
                    COALESCE(ob.opening_qty, 0)
                    + COALESCE(mv.total_in,  0)
                    - COALESCE(mv.total_out, 0)
                    as current_stock
                '),
                DB::raw('
                    CASE
                        WHEN p.current_cost_price > 0
                            THEN p.current_cost_price
                        WHEN COALESCE(mv.last_purchase_price, 0) > 0
                            THEN mv.last_purchase_price
                        WHEN COALESCE(ob.opening_qty, 0) > 0
                         AND COALESCE(ob.opening_val, 0) > 0
                            THEN ob.opening_val / ob.opening_qty
                        ELSE 0
                    END as effective_cost_price
                '),
                DB::raw('
                    (
                        COALESCE(ob.opening_qty, 0)
                        + COALESCE(mv.total_in,  0)
                        - COALESCE(mv.total_out, 0)
                    )
                    *
                    CASE
                        WHEN p.current_cost_price > 0
                            THEN p.current_cost_price
                        WHEN COALESCE(mv.last_purchase_price, 0) > 0
                            THEN mv.last_purchase_price
                        WHEN COALESCE(ob.opening_qty, 0) > 0
                         AND COALESCE(ob.opening_val, 0) > 0
                            THEN ob.opening_val / ob.opening_qty
                        ELSE 0
                    END as total_value
                '),
                DB::raw('COALESCE(lc.lots_count, 0) as lots_count'),
                'f.name   as family_name',
                'u.name   as unit_name',
                'u.symbol as unit_symbol',
            )
            ->leftJoinSub($openingQuery,   'ob', fn($j) => $j->on('p.id', '=', 'ob.product_id'))
            ->leftJoinSub($movementsQuery, 'mv', fn($j) => $j->on('p.id', '=', 'mv.product_id'))
            ->leftJoinSub($lotsCountQuery, 'lc', fn($j) => $j->on('p.id', '=', 'lc.product_id'))
            ->leftJoin('families as f', 'f.id', '=', 'p.family_id')
            ->leftJoin('units as u',    'u.id', '=', 'p.unit_id')
            ->where('p.company_id',    $companyId)
            ->where('p.manages_stock', true)
            ->where('p.active',        true)
            ->whereNull('p.deleted_at')
            ->when($search, fn($q) =>
                $q->where(fn($w) =>
                    $w->where('p.name', 'like', "%{$search}%")
                      ->orWhere('p.ref',  'like', "%{$search}%")
                )
            )
            ->orderBy('p.name')
            ->get()
            ->map(fn($r) => (array) $r)
            ->toArray();
        });

        return array_map(fn($row) => [
            'id'                 => $row['id'],
            'name'               => $row['name'],
            'ref'                => $row['ref'],
            'opening_quantity'   => (float) $row['opening_quantity'],
            'total_in'           => (float) $row['total_in'],
            'total_out'          => (float) $row['total_out'],
            'current_stock'      => (float) $row['current_stock'],
            'min_stock_alert'    => (float) $row['min_stock_alert'],
            'current_cost_price' => (float) $row['effective_cost_price'],
            'total_value'        => (float) $row['total_value'],
            'manages_stock'      => (bool)  $row['manages_stock'],
            'lots_count'         => (int)   $row['lots_count'],
            'family'             => $row['family_name']
                                     ? ['name' => $row['family_name']]
                                     : null,
            'unit'               => $row['unit_name']
                                     ? ['name' => $row['unit_name'], 'symbol' => $row['unit_symbol']]
                                     : null,
        ], $rows);
    }
}

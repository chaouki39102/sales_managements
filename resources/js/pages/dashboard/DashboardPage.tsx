// pages/dashboard/DashboardPage.tsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard      from '@/components/ui/KpiCard';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import ProgressBar  from '@/components/ui/ProgressBar';
import SimpleTable  from '@/components/ui/SimpleTable';
import AlertBar     from '@/components/ui/AlertBar';
import { usePortalOrders, usePortalOrdersSummary, PORTAL_ORDER_STATUSES, type PortalAdminOrder } from '@/lib/api/endpoints/portalOrders';
import { useDashboardStats, useSalesChart, useTopProducts, useTopDebtors, useTopProfitable, useRecentTransactions } from '@/lib/api/endpoints/dashboard';
import { useStockAt, type StockAtRow } from '@/lib/api/endpoints/inventory';
import OrderPipeline from '@/pages/portal/OrderPipeline';
import { useActiveCompany } from '@/lib/store/appStore';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('fr-DZ');

const statusBadge = (status: string | null) => {
  switch (status) {
    case 'paid':      return <Badge variant="success">مدفوعة</Badge>;
    case 'pending':   return <Badge variant="warning">معلقة</Badge>;
    case 'partial':   return <Badge variant="info">جزئياً</Badge>;
    case 'cancelled': return <Badge variant="danger">ملغاة</Badge>;
    case 'confirmed': return <Badge variant="info">مؤكّدة</Badge>;
    default:          return <Badge variant="default">{status ?? '—'}</Badge>;
  }
};

const COLORS_FLAT = ['#0a8a5c', '#3b82f6', '#d9a027', '#9333ea', '#14b8a6', '#ef4444'];

// ── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ data, total, isLoading }: { data: { name: string; value: number; suffix?: string; margin?: number }[]; total: number; isLoading: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (isLoading) return <div className="text-sm text-t4 text-center py-6">جاري تحميل البيانات…</div>;
  if (!data.length || total === 0) return <div className="text-sm text-t4 text-center py-6">لا توجد بيانات</div>;

  const R = 42;
  const C = 2 * Math.PI * R;
  let accumulated = 0;

  const slices = data.map((item, i) => {
    const pct = item.value / total;
    const dashArray = `${pct * C} ${(1 - pct) * C}`;
    const dashOffset = -accumulated * C;
    accumulated += pct;
    return { ...item, pct, dashArray, dashOffset, color: COLORS_FLAT[i % COLORS_FLAT.length] };
  });

  return (
    <div className="donut-w">
      <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
          {slices.map((s, i) => (
            <circle
              key={i}
              cx="50" cy="50" r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={hoveredIdx === i ? 16 : 12}
              strokeDasharray={s.dashArray}
              strokeDashoffset={s.dashOffset}
              style={{ transition: 'stroke-width .15s', opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.45 : 1 }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', pointerEvents: 'none',
        }}>
          {hoveredIdx !== null ? (
            <>
              <div style={{ fontSize: 13, fontWeight: 800, color: COLORS_FLAT[hoveredIdx] }}>
                {Math.round(slices[hoveredIdx].pct * 100)}%
              </div>
              <div style={{ fontSize: 9, color: 'var(--t4)', maxWidth: 50, textAlign: 'center', lineHeight: 1.2 }}>
                {slices[hoveredIdx].name}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>{data.length}</div>
              <div style={{ fontSize: 9, color: 'var(--t4)' }}>منتج</div>
            </>
          )}
        </div>
      </div>
      <div className="d-legend">
        {slices.map((s, i) => (
          <div className="d-item" key={i}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{ opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.5 : 1, cursor: 'default', transition: 'opacity .15s' }}
          >
            <div className="d-dot" style={{ background: s.color }} />
            <span className="flex-1" style={{ fontSize: 11, fontWeight: 600 }}>{s.name}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>
              {fmt(s.value)} {s.suffix ?? ''}
              {s.margin != null && <span style={{ fontSize: 9, fontWeight: 500, color: 'var(--t4)', marginRight: 3 }}>({s.margin}%)</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BarChart: live sales data with tooltips + click ──────────────────────────
function BarChart({ points, isLoading, onBarClick }: {
  points: { label: string; total: number; date?: string }[];
  isLoading: boolean;
  onBarClick?: (point: { label: string; total: number; date?: string }) => void;
}) {
  const [tooltip, setTooltip] = useState<{ idx: number; x: number; y: number } | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  if (isLoading) return <div className="text-sm text-t4 text-center py-6">جاري تحميل البيانات…</div>;
  if (!points.length) return <div className="text-sm text-t4 text-center py-6">لا توجد بيانات مبيعات</div>;

  const max = Math.max(...points.map(p => p.total), 1);
  const maxEntry = points.reduce((a, b) => a.total > b.total ? a : b);
  const avg = Math.round(points.reduce((s, p) => s + p.total, 0) / points.length);
  const minEntry = points.reduce((a, b) => a.total < b.total ? a : b);
  const sum = points.reduce((s, p) => s + p.total, 0);

  const handleMouse = (e: React.MouseEvent, idx: number) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ idx, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <>
      <div ref={chartRef} className="barchart" style={{ position: 'relative' }}>
        {tooltip !== null && (
          <div style={{
            position: 'absolute',
            left: Math.min(Math.max(tooltip.x - 60, 8), (chartRef.current?.offsetWidth ?? 200) - 130),
            top: Math.max(tooltip.y - 52, 4),
            background: 'var(--bg1)',
            border: '1px solid var(--b2)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 11,
            boxShadow: 'var(--shadow2)',
            zIndex: 10,
            pointerEvents: 'none',
            minWidth: 100,
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>{points[tooltip.idx].label}</div>
            <div style={{ color: 'var(--em)', fontWeight: 800 }}>{fmt(points[tooltip.idx].total)} دج</div>
            <div style={{ color: 'var(--t4)', fontSize: 10 }}>
              {Math.round((points[tooltip.idx].total / sum) * 100)}% من الإجمالي
            </div>
          </div>
        )}
        {points.map((m, i) => {
          const pct = Math.max(4, Math.round((m.total / max) * 100));
          const hi = m === maxEntry;
          const isHovered = tooltip?.idx === i;
          return (
            <div className="bc-col" key={m.label}
              onMouseMove={(e) => handleMouse(e, i)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => onBarClick?.(m)}
              style={{ cursor: onBarClick ? 'pointer' : undefined }}
            >
              <div
                className={`bc-bar ${hi ? 'hi' : ''}`}
                style={{
                  height: `${pct}%`,
                  opacity: tooltip !== null && !isHovered ? 0.6 : 1,
                  transform: isHovered ? 'scaleY(1.03)' : undefined,
                  transformOrigin: 'bottom',
                  transition: 'opacity .15s, transform .15s',
                }}
              >
                <span className={`bc-v ${hi ? 'text-gold' : ''}`} style={{ opacity: isHovered ? 1 : undefined }}>
                  {fmt(m.total)}
                </span>
              </div>
              <div className={`bc-lbl ${hi ? 'text-gold font-extrabold' : ''}`}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 px-3 py-2 bg-3 rounded-md">
        <span className="text-sm text-t4">أدنى <strong className="text-t2">{fmt(minEntry.total)}</strong></span>
        <span className="text-sm text-t4">متوسط <strong className="text-t2">{fmt(avg)}</strong></span>
        <span className="text-sm text-t4">إجمالي <strong className="text-em">{fmt(sum)} دج</strong></span>
        <span className="text-sm text-t4">أعلى <strong className="text-gold">{fmt(maxEntry.total)} دج</strong></span>
      </div>
    </>
  );
}

// ── Financial Summary card ───────────────────────────────────────────────────
function FinancialSummary({ stats, isLoading }: { stats: NonNullable<ReturnType<typeof useDashboardStats>['data']> | undefined; isLoading: boolean }) {
  if (isLoading) return <div className="text-sm text-t4 text-center py-6">جاري التحميل…</div>;
  if (!stats) return null;

  const totalPurchases = stats.purchases_this_month;
  const totalSales = stats.month_sales;
  const profit = stats.month_profit;
  const margin = stats.profit_margin;

  const salesBar = totalSales > 0 ? 100 : 0;
  const purchaseBar = totalSales > 0 ? Math.min(100, Math.round((totalPurchases / totalSales) * 100)) : 0;
  const profitBar = totalSales > 0 ? Math.min(100, Math.round((Math.max(0, profit) / totalSales) * 100)) : 0;

  return (
    <Card
      padding={14}
      title={
        <>
          <span className="ic ic-sm" style={{ color: 'var(--teal)' }}>
            <i className="ti ti-chart-donut-2" />
          </span>
          ملخص مالي
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* Sales vs Purchases visual bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)' }}>المبيعات</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--em)' }}>{fmt(totalSales)} دج</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--b1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${salesBar}%`, borderRadius: 4, background: 'linear-gradient(90deg, var(--em), var(--em3))', transition: 'width .4s' }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)' }}>المشتريات</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--blue)' }}>{fmt(totalPurchases)} دج</span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--b1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${purchaseBar}%`, borderRadius: 4, background: 'linear-gradient(90deg, var(--blue), #93c5fd)', transition: 'width .4s' }} />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)' }}>صافي الربح</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: profit >= 0 ? 'var(--gold)' : 'var(--red)' }}>
              {fmt(profit)} دج — {margin}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--b1)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${profitBar}%`, borderRadius: 4, background: profit >= 0 ? 'linear-gradient(90deg, var(--gold), #fbbf24)' : 'linear-gradient(90deg, var(--red), #f87171)', transition: 'width .4s' }} />
          </div>
        </div>

        {/* TVA line */}
        <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--b2)' }}>
          <span style={{ fontSize: 11, color: 'var(--t4)' }}>TVA مستحقة للدولة</span>
          <Badge variant="danger">{fmt(stats.tva_due)} دج</Badge>
        </div>
      </div>
    </Card>
  );
}

// ── Customer Debt Card ───────────────────────────────────────────────────────
function DebtCard({ debtors, stats, isLoading, onNavigate }: {
  debtors: NonNullable<ReturnType<typeof useTopDebtors>['data']>;
  stats: NonNullable<ReturnType<typeof useDashboardStats>['data']> | undefined;
  isLoading: boolean;
  onNavigate: (path: string) => void;
}) {
  const maxDebt = debtors.length > 0 ? debtors[0].total_remaining : 1;

  return (
    <Card
      padding={14}
      title={
        <>
          <span className="ic ic-sm" style={{ color: 'var(--red)' }}>
            <i className="ti ti-user-dollar" />
          </span>
          ديون الزبائن
        </>
      }
      actions={
        <Button size="xs" onClick={() => onNavigate('/dashboard/debts')}>
          عرض الكل
        </Button>
      }
    >
      {isLoading && <div className="text-sm text-t4 text-center py-3">جاري التحميل…</div>}

      {/* Summary bar */}
      {stats && (
        <div className="flex gap-3 mb-3">
          <div className="flex-1 p-2 rounded" style={{ background: 'rgba(239,68,68,.08)' }}>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>الإجمالي</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--red)' }}>{fmt(stats.total_debts)} دج</div>
          </div>
          <div className="flex-1 p-2 rounded" style={{ background: 'rgba(217,160,39,.08)' }}>
            <div style={{ fontSize: 10, color: 'var(--t4)' }}>عدد المدينين</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--gold)' }}>{stats.debtors_count}</div>
          </div>
        </div>
      )}

      {/* Debtor list */}
      {debtors.map((d) => {
        const pct = maxDebt > 0 ? Math.round((d.total_remaining / maxDebt) * 100) : 0;
        return (
          <div className="sr" key={d.party_id}>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-t1">{d.party_name ?? `زبون #${d.party_id}`}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--red)' }}>{fmt(d.total_remaining)} دج</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <ProgressBar value={Math.min(pct, 100)} color="var(--red)" height={4} />
                <span className="text-xs text-t4" style={{ minWidth: 50 }}>{d.invoice_count} فاتورة</span>
              </div>
            </div>
          </div>
        );
      })}

      {!isLoading && debtors.length === 0 && (
        <div className="text-sm text-center py-3" style={{ color: 'var(--em)' }}>
          <i className="ti ti-circle-check" style={{ marginLeft: 4 }} />
          لا توجد ديون مستحقة — ممتاز!
        </div>
      )}
    </Card>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState<'monthly' | 'yearly'>('monthly');
  const [productTab, setProductTab] = useState<'qty' | 'amount' | 'profit'>('qty');
  const company = useActiveCompany();

  // Preload popular pages in background
  React.useEffect(() => {
    if (!('requestIdleCallback' in window)) return;
    const tasks = [
      () => import('@/pages/pos/POSPage'),
      () => import('@/pos-pro/POSProPage'),
      () => import('@/pages/documents/CommercialDocumentsPage'),
      () => import('@/pages/products/ProductsPage'),
    ];
    let i = 0;
    const scheduleNext = () => {
      if (i >= tasks.length) return;
      (window as any).requestIdleCallback(() => { tasks[i++]().catch(() => {}); scheduleNext(); }, { timeout: 5000 });
    };
    scheduleNext();
  }, []);

  const slug = company?.slug ?? '';
  const [linkCopied, setLinkCopied] = useState(false);
  const copyPublicOrderLink = () => {
    const url = `${window.location.origin}/portal/${slug}/order`;
    const done = () => { setLinkCopied(true); window.setTimeout(() => setLinkCopied(false), 2000); };
    if (navigator.clipboard?.writeText) { navigator.clipboard.writeText(url).then(done).catch(done); }
    else { window.prompt('رابط صفحة الطلب العام:', url); done(); }
  };

  // ── Live data hooks ───────────────────────────────────────────────
  const statsQuery      = useDashboardStats();
  const chartQuery      = useSalesChart(chartMode === 'monthly' ? 'month' : 'year');
  const topProductsQ    = useTopProducts(6);
  const topProfitableQ  = useTopProfitable(6);
  const topDebtorsQ     = useTopDebtors(5);
  const recentTxQ       = useRecentTransactions(5);

  const stockAtQ        = useStockAt({});
  const recentOrders    = usePortalOrders({ page: 1, per_page: 5 });
  const ordersSummary   = usePortalOrdersSummary();

  const s = statsQuery.data;
  const chartPoints = chartQuery.data ?? [];
  const topProducts = topProductsQ.data ?? [];
  const topProfitable = topProfitableQ.data ?? [];
  const topDebtors  = topDebtorsQ.data ?? [];
  const recentTx    = recentTxQ.data ?? [];
  const recent      = recentOrders.data?.data ?? [];
  const summary     = ordersSummary.data;

  const openCount =
    (summary?.preparing ?? 0) +
    (summary?.confirmed ?? 0) +
    (summary?.processed ?? 0) +
    (summary?.shipped ?? 0);
  const totalOrders = summary?.total ?? recentOrders.data?.meta?.total ?? 0;
  const summaryCounts = summary
    ? { preparing: summary.preparing, confirmed: summary.confirmed, processed: summary.processed, shipped: summary.shipped, delivered: summary.delivered, returned: summary.returned, cancelled: summary.cancelled }
    : undefined;

  // Low-stock product items from the stock-at endpoint
  const lowStockItems: StockAtRow[] = (stockAtQ.data ?? []).filter(
    (r: StockAtRow) => r.manages_stock && r.current_stock > 0 && r.current_stock <= r.min_stock_alert
  ).slice(0, 5);

  // Activity timeline: derive from recent transactions
  const activities = recentTx.slice(0, 5).map((tx) => {
    const timeAgo = timeSince(tx.date);
    if (tx.status === 'cancelled') return { dot: 'r' as const, time: timeAgo, text: <>فاتورة <strong>{tx.document_number}</strong> ملغاة</> };
    if (tx.status === 'paid')      return { dot: 'g' as const, time: timeAgo, text: <><strong>{tx.document_number}</strong> — {fmt(tx.total)} دج مدفوعة</> };
    return { dot: 'b' as const, time: timeAgo, text: <><strong>{tx.document_number}</strong> — {fmt(tx.total)} دج {tx.party_name ?? ''}</> };
  });

  // Donut chart data — tab-aware, filtered + sorted by the active metric
  const donutRows = (() => {
    const raw = productTab === 'qty'
      ? topProducts.map(p => ({ name: p.product_name ?? `#${p.product_id}`, value: Math.round(p.total_quantity), suffix: 'وحدة' }))
      : productTab === 'amount'
      ? topProducts.map(p => ({ name: p.product_name ?? `#${p.product_id}`, value: Math.round(p.total_amount), suffix: 'دج' }))
      : topProfitable.map(p => ({ name: p.product_name ?? `#${p.product_id}`, value: Math.round(p.total_profit), suffix: 'دج', margin: p.margin_pct }));
    return raw.filter(r => r.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);
  })();
  const donutTotal = donutRows.reduce((s, r) => s + r.value, 0);
  const donutData = donutRows;
  const donutLoading = productTab === 'profit' ? topProfitableQ.isLoading : topProductsQ.isLoading;

  // Bar chart click handler — navigate to documents page
  const handleBarClick = (point: { label: string; total: number; date?: string }) => {
    if (chartMode === 'monthly' && point.date) {
      navigate(`/documents/FV?filter[document_date]=${point.date}`);
    } else {
      navigate('/documents/FV');
    }
  };

  return (
    <div className="page on" id="p-dashboard">

      {/* ── Alert (live) ── */}
      <AlertBar variant="green">
        <strong>تنبيهات اليوم:</strong>{' '}
        {s ? (
          <>
            {s.low_stock_count > 0 && <>{s.low_stock_count} منتج بمخزون منخفض — </>}
            {s.out_of_stock_count > 0 && <>{s.out_of_stock_count} منتج نفد — </>}
            {s.pending_invoices > 0 && <>{s.pending_invoices} فاتورة معلقة</>}
            {s.total_debts > 0 && <> — دين مستحق {fmt(s.total_debts)} دج</>}
          </>
        ) : 'جاري التحميل…'}
        {' '}
        <a onClick={() => navigate('/inventory/stock')} className="cursor-pointer font-extrabold underline" style={{marginRight:4}}>
          معالجة المخزون ←
        </a>
        <a onClick={() => navigate('/dashboard/debts')} className="cursor-pointer font-extrabold underline">
          تتبع الديون ←
        </a>
      </AlertBar>

      {/* ── Mobile quick actions ── */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <Button variant="primary" size="sm" icon={<i className="ti ti-file-plus"/>}>فاتورة</Button>
        <Button size="sm" icon={<i className="ti ti-shopping-bag"/>} onClick={() => navigate('/pos')}>بيع</Button>
        <Button size="sm" icon={<i className="ti ti-package"/>} onClick={() => navigate('/inventory/stock')}>مخزون</Button>
        <Button size="sm" icon={<i className="ti ti-building-bank"/>} onClick={() => navigate('/dashboard/finance')}>خزينة</Button>
      </div>

      {/* ── KPI Row 1 ── */}
      <div className="kpis">
        <KpiCard
          variant="green" icon="ti-cash"
          label="مبيعات اليوم" value={s ? fmt(s.today_sales) : '…'} unit="دج"
          trend={s && s.today_invoices_count > 0 ? `${s.today_invoices_count} فاتورة` : undefined}
          trendDir="up"
          sub={s ? `الشهر: ${fmt(s.month_sales)} دج` : undefined}
        />
        <KpiCard
          variant="gold" icon="ti-file-text"
          label="فواتير الشهر" value={s ? String(s.month_invoices_count) : '…'}
          trend={s && s.pending_invoices > 0 ? `${s.pending_invoices} معلقة` : undefined}
          trendDir={s && s.pending_invoices > 0 ? 'down' : 'neutral'}
          sub={s ? `${s.today_invoices_count} اليوم` : undefined}
        />
        <KpiCard
          variant="blue" icon="ti-users"
          label={`زبائن جدد — ${new Date().toLocaleDateString('fr-DZ', { month: 'long' })}`}
          value={s ? String(s.new_customers_month) : '…'}
          trendDir="up"
          sub={s ? `إجمالي: ${s.customers_count} زبون` : undefined}
        />
        <KpiCard
          variant="red" icon="ti-package"
          label="مخزون منخفض" value={s ? String(s.low_stock_count + s.out_of_stock_count) : '…'}
          trend={s && s.out_of_stock_count > 0 ? `${s.out_of_stock_count} نفد` : 'متّسق'}
          trendDir={s && s.out_of_stock_count > 0 ? 'down' : 'neutral'}
          sub={s && s.out_of_stock_count > 0 ? 'منتجات نافت تماماً' : undefined}
          onClick={() => navigate('/inventory/stock')}
        />
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="kpis mb-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <KpiCard
          variant="purple" icon="ti-trending-up"
          label="مبيعات الشهر" value={s ? fmt(s.month_sales) : '…'} unit="دج"
          trend={s ? `${fmt(s.purchases_this_month)} مشتريات` : undefined}
          trendDir="up"
          sub={s ? `شراء: ${fmt(s.purchases_this_month)} دج` : undefined}
        />
        <KpiCard
          variant="teal" icon="ti-diamond"
          label="صافي الربح" value={s ? fmt(s.month_profit) : '…'} unit="دج"
          trend={s && s.profit_margin > 0 ? `${s.profit_margin}%` : undefined}
          trendDir="up"
          sub={s ? `هامش: ${s.profit_margin}%` : undefined}
        />
        <KpiCard
          variant="gold" icon="ti-calculator"
          label="TVA مستحقة" value={s ? fmt(s.tva_due) : '…'} unit="دج"
          trend="G50"
          trendDir="neutral"
          sub={s ? `محصّلة: ${fmt(s.month_tva_collected)} — مستردة: ${fmt(s.month_tva_deductible)}` : undefined}
        />
        <KpiCard
          variant="red" icon="ti-receipt"
          label="ديون الزبائن" value={s ? fmt(s.total_debts) : '…'} unit="دج"
          trend={s && s.debtors_count > 0 ? `${s.debtors_count} مدين` : 'لا ديون'}
          trendDir={s && s.debtors_count > 0 ? 'down' : 'neutral'}
          sub={s ? `${s.debtors_count} زبون متأخر` : undefined}
          onClick={() => navigate('/dashboard/debts')}
        />
        <KpiCard
          variant="gold" icon="ti-clipboard-list"
          label="طلبات البوابة" value={fmt(totalOrders)}
          trend={openCount > 0 ? `${fmt(openCount)} مفتوحة` : 'لا طلبات مفتوحة'}
          trendDir={openCount > 0 ? 'up' : 'neutral'}
          sub="طلبات سلع الزبائن عبر البوابة"
          onClick={() => navigate('/portal-orders')}
        />
      </div>

      {/* ── Portal pipeline ── */}
      <Card style={{ marginBottom: 16 }} padding={12}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 2 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--t1)' }}>
            <i className="ti ti-stack-2" style={{ marginLeft: 5, color: 'var(--gold)' }} />
            خط أنابيب طلبات البوابة
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            {slug && (
              <Button size="xs" variant="outline" icon={<i className="ti ti-link" />} onClick={copyPublicOrderLink}>
                {linkCopied ? 'تم نسخ الرابط ✓' : 'رابط الطلب العام'}
              </Button>
            )}
            <Button size="xs" onClick={() => navigate('/portal-orders')}>
              إدارة الطلبات
            </Button>
          </div>
        </div>
        <OrderPipeline
          status="preparing"
          summary={!!summary}
          counts={summaryCounts}
          onStepClick={() => navigate('/portal-orders')}
        />
      </Card>

      {/* ── Charts + Financial Row ── */}
      <div className="g65 mb-5">
        {/* Sales bar chart (live) */}
        <Card
          title={
            <>
              <span className="ic ic-sm" style={{color:'var(--em)'}}>
                <i className="ti ti-chart-bar"/>
              </span>
              {chartMode === 'monthly' ? 'مبيعات آخر 30 يوم' : 'مبيعات الأشهر'}
            </>
          }
          actions={
            <>
              <Button size="xs" onClick={() => setChartMode('yearly')}
                className={chartMode === 'yearly' ? 'bg-emb border-embo text-em' : ''}>
                شهري
              </Button>
              <Button size="xs" onClick={() => setChartMode('monthly')}
                className={chartMode === 'monthly' ? 'bg-emb border-embo text-em' : ''}>
                يومي
              </Button>
            </>
          }
        >
          <BarChart points={chartPoints} isLoading={chartQuery.isLoading} onBarClick={handleBarClick} />
          <div className="text-xs text-t4 mt-2" style={{ textAlign: 'center' }}>
            اضغط على عمود لعرض الفواتير — مرر للتفاصيل
          </div>
        </Card>

        {/* Side column: Donut + Financial Summary + Debt */}
        <div className="flex flex-col gap-4">

          {/* Top products donut chart */}
          <Card
            padding={14}
            title={
              <span className="flex items-center gap-2">
                <span className="ic ic-sm" style={{color:'var(--gold)'}}>
                  <i className="ti ti-chart-donut"/>
                </span>
                الأكثر مبيعاً
              </span>
            }
            actions={
              <div style={{ display: 'flex', gap: 2, background: 'var(--b1)', borderRadius: 6, padding: 2 }}>
                {([
                  { key: 'qty' as const,     label: 'كمياً',       icon: 'ti-stack' },
                  { key: 'amount' as const,  label: 'المبلغ',     icon: 'ti-cash' },
                  { key: 'profit' as const,  label: 'الربح',      icon: 'ti-trending-up' },
                ]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setProductTab(t.key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 3,
                      padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                      fontSize: 10, fontWeight: 700,
                      background: productTab === t.key ? 'var(--em)' : 'transparent',
                      color: productTab === t.key ? '#fff' : 'var(--t3)',
                      transition: 'all .15s',
                    }}
                  >
                    <i className={`ti ${t.icon}`} style={{ fontSize: 10 }} />
                    {t.label}
                  </button>
                ))}
              </div>
            }
          >
            <DonutChart data={donutData} total={donutTotal} isLoading={donutLoading} />
          </Card>

          {/* Financial Summary */}
          <FinancialSummary stats={s} isLoading={statsQuery.isLoading} />

          {/* Customer Debts */}
          <DebtCard
            debtors={topDebtors}
            stats={s}
            isLoading={topDebtorsQ.isLoading}
            onNavigate={navigate}
          />
        </div>
      </div>

      {/* ── Last Transactions (full-width) ── */}
      <Card
        style={{ marginBottom: 16 }}
        title={
          <span className="flex items-center gap-2">
            <span className="ic ic-sm" style={{ color: 'var(--em)' }}>
              <i className="ti ti-file-invoice"/>
            </span>
            آخر المعاملات
          </span>
        }
        actions={
          <Button size="xs" variant="primary" onClick={() => navigate('/documents/FV')}>
            عرض الكل
          </Button>
        }
      >
        {recentTxQ.isLoading ? (
          <div className="text-sm text-t4 text-center py-4">جاري التحميل…</div>
        ) : recentTx.length === 0 ? (
          <div className="text-sm text-t4 text-center py-4">لا توجد معاملات حديثة</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 90px 80px 80px 90px 80px',
              gap: 8, padding: '4px 10px',
              fontSize: 10, fontWeight: 700, color: 'var(--t4)',
              borderBottom: '1px solid var(--b2)',
            }}>
              <span>النوع</span><span>الزبون</span><span style={{ textAlign: 'center' }}>رقم</span>
              <span style={{ textAlign: 'end' }}>المبلغ TTC</span><span style={{ textAlign: 'center' }}>الحالة</span>
              <span style={{ textAlign: 'center' }}>الدفع</span><span style={{ textAlign: 'center' }}>التاريخ</span>
            </div>
            {recentTx.map((tx) => {
              const isPaid = tx.status === 'paid';
              const isCancelled = tx.status === 'cancelled' || tx.status === 'annulled';
              const docCode = (tx.document_type ?? '').slice(0, 3);
              const typeColor = docCode === 'FV' ? 'var(--em)' : docCode === 'AV' ? 'var(--red)' : docCode === 'FA' ? 'var(--blue)' : docCode === 'POS' ? 'var(--gold)' : 'var(--t3)';
              return (
                <div
                  key={tx.id}
                  onClick={() => navigate(`/documents/FV?highlight=${tx.id}`)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr 90px 80px 80px 90px 80px',
                    gap: 8, padding: '8px 10px',
                    fontSize: 12,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: 'var(--b0)',
                    opacity: isCancelled ? 0.55 : 1,
                    textDecoration: isCancelled ? 'line-through' : 'none',
                    transition: 'background .12s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--b1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--b0)'; }}
                >
                  {/* Type badge */}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    padding: '2px 6px', borderRadius: 4, fontSize: 9, fontWeight: 800,
                    background: `${typeColor}18`, color: typeColor,
                  }}>
                    {docCode || '—'}
                  </span>
                  {/* Party */}
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--t1)' }}>
                    {tx.party_name ?? '—'}
                  </span>
                  {/* Doc number */}
                  <span className="m" style={{ textAlign: 'center', fontSize: 11 }}>{tx.document_number}</span>
                  {/* Amount */}
                  <span className="e" style={{ textAlign: 'end', fontWeight: 700 }}>
                    {fmt(tx.total)} <span style={{ fontSize: 9, color: 'var(--t4)' }}>دج</span>
                  </span>
                  {/* Status */}
                  <span style={{ textAlign: 'center' }}>{statusBadge(tx.status)}</span>
                  {/* Paid indicator */}
                  <span style={{ textAlign: 'center' }}>
                    {isPaid
                      ? <i className="ti ti-circle-check" style={{ color: 'var(--em)', fontSize: 14 }} />
                      : <i className="ti ti-clock" style={{ color: 'var(--t4)', fontSize: 14 }} />
                    }
                  </span>
                  {/* Date */}
                  <span className="text-xs text-t4" style={{ textAlign: 'center' }}>{tx.date ?? '—'}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Latest portal orders (live) ── */}
      <Card
        style={{ marginBottom: 16 }}
        title={
          <>
            <span className="ic ic-sm" style={{ color: 'var(--gold)' }}>
              <i className="ti ti-clipboard-list"/>
            </span>
            أحدث طلبات البوابة
          </>
        }
        actions={
          <Button size="xs" onClick={() => navigate('/portal-orders')}>
            إدارة الطلبات
          </Button>
        }
      >
        <SimpleTable
          columns={[
            { key: 'reference', label: 'المرجع' },
            { key: 'party', label: 'الزبون', render: (_v, row) => (row.party as { name: string } | null)?.name ?? '—' },
            { key: 'status', label: 'الحالة', render: (v) => {
              const s = v as PortalAdminOrder['status'];
              const cfg = PORTAL_ORDER_STATUSES.find((x) => x.value === s);
              return <span className={`badge ${cfg?.cls ?? 'badge--t4'}`}>{cfg?.label ?? s}</span>;
            }},
            { key: 'items_count', label: 'الأصناف', render: (v) => <span className="m">{String(v)}</span> },
            { key: 'total_ttc', label: 'المبلغ (TTC)', render: (v) => <span className="e">{fmt(Number(v))} دج</span> },
            { key: 'requested_at', label: 'التاريخ', render: (v) => {
              const d = v ? new Date(String(v)) : null;
              return <span className="text-xs text-t4">{d ? d.toLocaleDateString('fr-DZ') : '—'}</span>;
            }},
          ]}
          data={recent as unknown as Record<string, unknown>[]}
          rowKey="id"
        />
        {recent.length === 0 && !recentOrders.isLoading && (
          <div className="text-sm text-t4 text-center py-3">لا توجد طلبات سلع بعد</div>
        )}
      </Card>

      {/* ── Bottom Row ── */}
      <div className="g73">
        {/* Stock alerts (live from stock-at) */}
        <div className="flex flex-col gap-4">

          {/* Stock alerts (live from stock-at) */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--red)'}}>
                  <i className="ti ti-alert-triangle"/>
                </span>
                تنبيهات المخزون
              </>
            }
          >
            <Badge variant="danger">{s ? s.low_stock_count + s.out_of_stock_count : '…'}</Badge>
            {stockAtQ.isLoading && <div className="text-sm text-t4 text-center py-3">جاري التحميل…</div>}
            {lowStockItems.map((item) => {
              const pct = item.min_stock_alert > 0 ? Math.round((item.current_stock / item.min_stock_alert) * 100) : 0;
              const isOut = item.current_stock <= 0;
              return (
                <div className="sr" key={item.id}>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-t1">{item.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <ProgressBar value={Math.min(pct, 100)} color={isOut ? 'var(--red)' : 'var(--gold)'} height={4} />
                      <span className="text-xs flex-shrink-0" style={{ color: isOut ? 'var(--red)' : 'var(--gold)', minWidth: 44 }}>
                        {item.current_stock} {item.unit?.symbol ?? 'وحدة'}
                      </span>
                    </div>
                  </div>
                  <Badge variant={isOut ? 'danger' : 'warning'}>
                    {isOut ? 'نفد' : 'منخفض'}
                  </Badge>
                </div>
              );
            })}
            {!stockAtQ.isLoading && lowStockItems.length === 0 && (
              <div className="text-sm text-t4 text-center py-3">لا توجد تنبيهات مخزون</div>
            )}
            <Button
              variant="danger" size="sm" fullWidth
              icon={<i className="ti ti-arrow-left"/>}
              className="mt-2"
              onClick={() => navigate('/inventory/stock')}
            >
              إدارة المخزون
            </Button>
          </Card>

          {/* Activity timeline (live from recent transactions) */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--teal)'}}>
                  <i className="ti ti-clock"/>
                </span>
                آخر الأحداث
              </>
            }
          >
            <div className="tl">
              {activities.map((a, i) => (
                <div className="tl-i" key={i}>
                  <div className={`tl-d ${a.dot}`} />
                  <div className="tl-t">{a.time}</div>
                  <div className="tl-x">{a.text}</div>
                </div>
              ))}
              {activities.length === 0 && !recentTxQ.isLoading && (
                <div className="text-sm text-t4 text-center py-3">لا توجد أحداث حديثة</div>
              )}
            </div>
          </Card>

          {/* TVA summary (live) */}
          <Card
            padding={14}
            style={{
              background: 'linear-gradient(135deg,var(--emb),rgba(10,138,92,.04))',
              borderColor: 'var(--embo)',
            }}
            noHeader
          >
            <div className="text-sm font-bold text-em mb-2 flex items-center gap-2">
              <i className="ti ti-landmark"/> TVA مستحقة
            </div>
            <div className="sr">
              <div className="sr-l">TVA محصّلة</div>
              <div className="sr-v text-gold">{s ? `${fmt(s.month_tva_collected)} دج` : '…'}</div>
            </div>
            <div className="sr">
              <div className="sr-l">TVA مستردة</div>
              <div className="sr-v text-blue">− {s ? `${fmt(s.month_tva_deductible)} دج` : '…'}</div>
            </div>
            <div className="sr border-t border-embo pt-2 mt-1">
              <div className="sr-l font-extrabold text-red">المستحق للدولة</div>
              <div className="sr-v text-red" style={{fontSize:16}}>{s ? `${fmt(s.tva_due)} دج` : '…'}</div>
            </div>
            <div className="text-xs text-em mt-2 px-2 py-1 rounded" style={{
              background:'rgba(10,138,92,.08)',
            }}>
              ⏰ الاستحقاق: 20 من الشهر القادم — G50
            </div>
            <Button
              variant="primary" size="sm" fullWidth
              icon={<i className="ti ti-calculator"/>}
              className="mt-2"
              onClick={() => navigate('/dashboard/tva')}
            >
              إقرار G50
            </Button>
          </Card>
        </div>
      </div>

    </div>
  );
}

// ── Simple time-ago helper (no dependency) ───────────────────────────────────
function timeSince(dateStr: string | null): string {
  if (!dateStr) return 'اليوم';
  const then = new Date(dateStr).getTime();
  const now  = Date.now();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return 'الآن';
  if (mins < 60)  return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `منذ ${hrs} ساعة`;
  const days = Math.floor(hrs / 24);
  if (days < 30)  return `منذ ${days} يوم`;
  return `منذ ${Math.floor(days / 30)} شهر`;
}

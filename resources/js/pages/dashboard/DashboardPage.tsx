// pages/dashboard/DashboardPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard      from '@/components/ui/KpiCard';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import ProgressBar  from '@/components/ui/ProgressBar';
import SimpleTable  from '@/components/ui/SimpleTable';
import AlertBar     from '@/components/ui/AlertBar';
import Avatar       from '@/components/ui/Avatar';
import { usePortalOrders, usePortalOrdersSummary, PORTAL_ORDER_STATUSES, type PortalAdminOrder } from '@/lib/api/endpoints/portalOrders';
import { useDashboardStats, useSalesChart, useTopProducts, useRecentTransactions } from '@/lib/api/endpoints/dashboard';
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

const COLORS = ['var(--em)', 'var(--blue)', 'var(--gold)', 'var(--purple)', 'var(--teal)', 'var(--red)'] as const;
const avatarColor = (i: number) => (1 + (i % 7)) as 1|2|3|4|5|6|7;

// ── BarChart: live sales data ────────────────────────────────────────────────
function BarChart({ points, isLoading }: { points: { label: string; total: number }[]; isLoading: boolean }) {
  if (isLoading) return <div className="text-sm text-t4 text-center py-6">جاري تحميل البيانات…</div>;
  if (!points.length) return <div className="text-sm text-t4 text-center py-6">لا توجد بيانات مبيعات</div>;

  const max = Math.max(...points.map(p => p.total), 1);
  const maxEntry = points.reduce((a, b) => a.total > b.total ? a : b);
  const avg = Math.round(points.reduce((s, p) => s + p.total, 0) / points.length);
  const minEntry = points.reduce((a, b) => a.total < b.total ? a : b);

  return (
    <>
      <div className="barchart">
        {points.map((m) => {
          const pct = Math.max(4, Math.round((m.total / max) * 100));
          const hi = m === maxEntry;
          return (
            <div className="bc-col" key={m.label}>
              <div className={`bc-bar ${hi ? 'hi' : ''}`} style={{ height: `${pct}%` }}>
                <span className={`bc-v ${hi ? 'text-gold' : ''}`}>{fmt(m.total)}</span>
              </div>
              <div className={`bc-lbl ${hi ? 'text-gold font-extrabold' : ''}`}>{m.label}</div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 px-3 py-2 bg-3 rounded-md">
        <span className="text-sm text-t4">أدنى <strong className="text-t2">{fmt(minEntry.total)}</strong></span>
        <span className="text-sm text-t4">متوسط <strong className="text-t2">{fmt(avg)}</strong></span>
        <span className="text-sm text-t4">أعلى <strong className="text-gold">{fmt(maxEntry.total)} دج</strong></span>
      </div>
    </>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState<'monthly' | 'yearly'>('monthly');
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
  const topProductsQ    = useTopProducts(3);
  const recentTxQ       = useRecentTransactions(5);

  const stockAtQ        = useStockAt({});
  const recentOrders    = usePortalOrders({ page: 1, per_page: 5 });
  const ordersSummary   = usePortalOrdersSummary();

  const s = statsQuery.data;
  const chartPoints = chartQuery.data ?? [];
  const topProducts = topProductsQ.data ?? [];
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

      {/* ── Charts Row ── */}
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
          <BarChart points={chartPoints} isLoading={chartQuery.isLoading} />
        </Card>

        {/* Side column */}
        <div className="flex flex-col gap-4">

          {/* Top products (live) */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--gold)'}}>
                  <i className="ti ti-star"/>
                </span>
                أكثر مبيعاً
              </>
            }
          >
            {topProductsQ.isLoading && <div className="text-sm text-t4 text-center py-3">جاري التحميل…</div>}
            {topProducts.map((p, i) => (
              <div className="sr" key={p.product_id}>
                <div className="flex-1">
                  <div className="text-sm font-bold text-t1 mb-1">
                    {p.product_name ?? `منتج #${p.product_id}`}
                  </div>
                  <ProgressBar
                    value={topProducts[0]?.total_amount ? Math.round((p.total_amount / topProducts[0].total_amount) * 100) : 0}
                    color={COLORS[i % COLORS.length]}
                    height={4}
                  />
                </div>
                <span className="text-xs text-t4" style={{minWidth:72,textAlign:'left'}}>
                  {fmt(p.total_quantity)} وحدة
                </span>
              </div>
            ))}
            {!topProductsQ.isLoading && topProducts.length === 0 && (
              <div className="text-sm text-t4 text-center py-3">لا توجد بيانات مبيعات</div>
            )}
          </Card>
        </div>
      </div>

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
        {/* Recent transactions (live) */}
        <Card
          title={
            <>
              <span className="ic ic-sm" style={{color:'var(--em)'}}>
                <i className="ti ti-file-invoice"/>
              </span>
              آخر الفواتير
            </>
          }
          actions={
            <Button size="xs" onClick={() => navigate('/documents/FV')}>
              عرض الكل
            </Button>
          }
        >
          {recentTxQ.isLoading && <div className="text-sm text-t4 text-center py-4">جاري التحميل…</div>}
          <SimpleTable
            columns={[
              { key: 'document_number', label: 'رقم', className: 'm' },
              { key: 'party_name', label: 'الزبون', render: (v, row) => (
                <div className="flex items-center gap-2">
                  <Avatar initials={String(v ?? '?')[0] ?? '?'} color={avatarColor(row._idx as number ?? 0)} size={26} />
                  <span className={row.status === 'cancelled' ? 'line-through text-t4' : ''}>
                    {String(v ?? '—')}
                  </span>
                </div>
              )},
              { key: 'total', label: 'المبلغ', render: (v, row) => (
                <span className={row.status === 'cancelled' ? 'r line-through' : 'e'}>{fmt(Number(v))} دج</span>
              )},
              { key: 'status', label: 'الحالة', render: (v) => statusBadge(v as string | null) },
              { key: 'date', label: 'التاريخ', className: 'text-xs text-t4' },
            ]}
            data={recentTx.map((tx, i) => ({ ...tx, _idx: i }))}
            rowKey="id"
          />
          {!recentTxQ.isLoading && recentTx.length === 0 && (
            <div className="text-sm text-t4 text-center py-4">لا توجد فواتير حديثة</div>
          )}
        </Card>

        {/* Right column */}
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

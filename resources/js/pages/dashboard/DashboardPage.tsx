// pages/dashboard/DashboardPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard      from '@/components/ui/KpiCard';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Avatar       from '@/components/ui/Avatar';
import AlertBar     from '@/components/ui/AlertBar';
import Button       from '@/components/ui/Button';
import ProgressBar  from '@/components/ui/ProgressBar';
import SimpleTable  from '@/components/ui/SimpleTable';
import { usePortalOrders, usePortalOrdersSummary, PORTAL_ORDER_STATUSES, type PortalAdminOrder } from '@/lib/api/endpoints/portalOrders';
import OrderPipeline from '@/pages/portal/OrderPipeline';

// ── Types ─────────────────────────────────────
interface Invoice {
  id: string; client: string; clientInitial: string; avatarColor: 1|2|3|4|5|6|7;
  amount: string; tva: string;
  status: 'paid' | 'pending' | 'partial' | 'cancelled';
  date: string; action: string;
}

interface StockAlert {
  name: string; qty: string; level: number;
  status: 'out' | 'low';
}

interface Activity {
  dot: 'e' | 'b' | 'g' | 'r' | 'z';
  time: string; text: React.ReactNode;
}

// ── Static data (will be replaced by API later) ─
const INVOICES: Invoice[] = [
  { id:'#INV-0342', client:'بوزيد أحمد',      clientInitial:'ب', avatarColor:1, amount:'24,500 دج', tva:'4,655 دج', status:'paid',      date:'اليوم 09:42',   action:'print' },
  { id:'#INV-0341', client:'فاطمة بن علي',    clientInitial:'ف', avatarColor:2, amount:'8,200 دج',  tva:'1,558 دج', status:'pending',    date:'اليوم 08:15',   action:'pay'   },
  { id:'#INV-0340', client:'الشركة الوطنية',  clientInitial:'ش', avatarColor:3, amount:'152,000 دج',tva:'28,880 دج',status:'partial',    date:'أمس 16:30',     action:'pay'   },
  { id:'#INV-0339', client:'كمال دبيح',       clientInitial:'ك', avatarColor:4, amount:'5,800 دج',  tva:'1,102 دج', status:'paid',       date:'أمس 14:08',     action:'print' },
  { id:'#INV-0338', client:'نبيل بوعزيز',     clientInitial:'ن', avatarColor:6, amount:'12,000 دج', tva:'—',        status:'cancelled',  date:'14/04 11:00',   action:'view'  },
];

const STOCK_ALERTS: StockAlert[] = [
  { name:'زيت مائدة 5L',     qty:'4 وحدة',  level:8,  status:'out' },
  { name:'دقيق مطحنة 25kg',  qty:'7 كيس',   level:20, status:'low' },
  { name:'زيت المحرك 4L',    qty:'4 علبة',  level:12, status:'out' },
];

const ACTIVITIES: Activity[] = [
  { dot:'e', time:'منذ 12 دقيقة', text: <><strong>#0342 — 24,500 دج</strong> فاتورة جديدة</> },
  { dot:'b', time:'منذ 35 دقيقة', text: <>زبون جديد: <strong>فاطمة بن علي</strong></> },
  { dot:'g', time:'منذ ساعة',     text: <>إدخال مخزون: <strong>+24 وحدة زيت</strong></> },
  { dot:'r', time:'منذ 2 ساعة',   text: <>فاتورة <strong>#0338 ملغاة</strong></> },
  { dot:'z', time:'منذ 5 ساعات',  text: <>نسخة احتياطية — <strong>2.4 MB</strong></> },
];

// ── Status helpers ─────────────────────────────
const statusBadge = (s: Invoice['status']) => {
  switch(s) {
    case 'paid':      return <Badge variant="success">مدفوعة</Badge>;
    case 'pending':   return <Badge variant="warning">معلقة</Badge>;
    case 'partial':   return <Badge variant="info">جزئياً</Badge>;
    case 'cancelled': return <Badge variant="danger">ملغاة</Badge>;
  }
};

const actionIcon = (a: string) => {
  if (a === 'print') return 'ti-printer';
  if (a === 'pay')   return 'ti-cash';
  return 'ti-eye';
};

// ── BarChart mini component ────────────────────
const MONTHS = [
  { lbl:'نوف', v:40,  val:'210K', hi:false },
  { lbl:'ديس', v:55,  val:'290K', hi:false },
  { lbl:'جان', v:46,  val:'242K', hi:false },
  { lbl:'فيف', v:64,  val:'339K', hi:false },
  { lbl:'مار', v:52,  val:'275K', hi:false },
  { lbl:'أفر', v:100, val:'524K ★', hi:true },
];

function BarChart() {
  return (
    <>
      <div className="barchart">
        {MONTHS.map((m) => (
          <div className="bc-col" key={m.lbl}>
            <div
              className={`bc-bar ${m.hi ? 'hi' : ''}`}
              style={{ height: `${m.v}%` }}
            >
              <span
                className={`bc-v ${m.hi ? 'text-gold' : ''}`}
              >
                {m.val}
              </span>
            </div>
            <div
              className={`bc-lbl ${m.hi ? 'text-gold font-extrabold' : ''}`}
            >
              {m.lbl}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-3 px-3 py-2 bg-3 rounded-md">
        <span className="text-sm text-t4">أدنى <strong className="text-t2">210K</strong></span>
        <span className="text-sm text-t4">متوسط <strong className="text-t2">313K</strong></span>
        <span className="text-sm text-t4">أعلى <strong className="text-gold">524K دج</strong></span>
      </div>
    </>
  );
}

// ── Donut chart (CSS only) ─────────────────────
const DONUT_LEGEND = [
  { color:'var(--em2)',    label:'أغذية',       pct:'38%' },
  { color:'var(--gold)',   label:'إلكترونيات',  pct:'24%' },
  { color:'var(--blue)',   label:'ملابس',        pct:'17%' },
  { color:'var(--purple)', label:'صيانة',        pct:'9%'  },
  { color:'var(--t4)',     label:'أخرى',         pct:'12%' },
];

// ── Main component ─────────────────────────────
export default function DashboardPage() {
  const navigate = useNavigate();
  const [chartMode, setChartMode] = useState<'weekly' | 'monthly'>('weekly');

  // ── Portal orders (live) ─────────────────────
  const recentOrders = usePortalOrders({ page: 1, per_page: 5 });
  const ordersSummary = usePortalOrdersSummary();
  const recent = recentOrders.data?.data ?? [];
  const summary = ordersSummary.data;
  const openCount =
    (summary?.preparing ?? 0) +
    (summary?.confirmed ?? 0) +
    (summary?.processed ?? 0) +
    (summary?.shipped ?? 0);
  const totalOrders = summary?.total ?? recentOrders.data?.meta?.total ?? 0;
  const summaryCounts = summary
    ? {
        preparing: summary.preparing,
        confirmed: summary.confirmed,
        processed: summary.processed,
        shipped:   summary.shipped,
        delivered: summary.delivered,
        returned:  summary.returned,
        cancelled: summary.cancelled,
      }
    : undefined;
  const fmt = (n: number) => n.toLocaleString('fr-DZ');

  return (
    <div className="page on" id="p-dashboard">

      {/* ── Alert ── */}
      <AlertBar variant="green">
        <strong>تنبيهات اليوم:</strong>{' '}
        5 منتجات بمخزون منخفض — 3 فواتير معلقة — دين مستحق لفاطمة بن علي منذ 5 أيام.{' '}
        <a onClick={() => navigate('/dashboard/inventory')} className="cursor-pointer font-extrabold underline" style={{marginRight:4}}>
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
        <Button size="sm" icon={<i className="ti ti-package"/>} onClick={() => navigate('/dashboard/inventory')}>مخزون</Button>
        <Button size="sm" icon={<i className="ti ti-building-bank"/>} onClick={() => navigate('/dashboard/finance')}>خزينة</Button>
      </div>

      {/* ── KPI Row 1 ── */}
      <div className="kpis">
        <KpiCard
          variant="green" icon="ti-cash"
          label="مبيعات اليوم" value="184,750" unit="دج"
          trend="▲ 12.4%" trendDir="up"
          sub="مقارنة بالأمس: 164,320 دج"
        />
        <KpiCard
          variant="gold" icon="ti-file-text"
          label="فواتير الشهر" value="342"
          trend="▲ 8" trendDir="up"
          sub="8 اليوم — 3 معلقة"
        />
        <KpiCard
          variant="blue" icon="ti-users"
          label="زبائن جدد — أفريل" value="47"
          trend="▲ 3" trendDir="up"
          sub="إجمالي: 284 زبون"
        />
        <KpiCard
          variant="red" icon="ti-package"
          label="مخزون منخفض" value="5"
          trend="تدخّل" trendDir="down"
          sub="منتج واحد نفد تماماً"
          onClick={() => navigate('/dashboard/inventory')}
        />
      </div>

      {/* ── KPI Row 2 ── */}
      <div className="kpis mb-5" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <KpiCard
          variant="purple" icon="ti-trending-up"
          label="مبيعات الشهر" value="1,248,400" unit="دج"
          trend="▲ 18%" trendDir="up"
          sub={
            <>
              هدف: 1,500,000 دج
              <div className="mt-1">
                <ProgressBar value={83} />
              </div>
            </>
          }
        />
        <KpiCard
          variant="teal" icon="ti-diamond"
          label="صافي الربح — أفريل" value="763,200" unit="دج"
          trend="▲ 22%" trendDir="up"
          sub="هامش: 61.1%"
        />
        <KpiCard
          variant="gold" icon="ti-calculator"
          label="TVA محصّلة — أفريل" value="237,196" unit="دج"
          trend="G50" trendDir="neutral"
          sub="استحقاق: 20 ماي • TVA + Timbre"
        />
        <KpiCard
          variant="red" icon="ti-receipt"
          label="ديون الزبائن" value="56,200" unit="دج"
          trend="مستحقة" trendDir="down"
          sub="3 زبائن متأخرون"
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

      {/* ── خط أنابيب طلبات البوابة (نظرة شاملة) ── */}
      <Card style={{ marginBottom: 16 }} padding={12}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 2 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--t1)' }}>
            <i className="ti ti-stack-2" style={{ marginLeft: 5, color: 'var(--gold)' }} />
            خط أنابيب طلبات البوابة
          </div>
          <Button size="xs" onClick={() => navigate('/portal-orders')}>
            إدارة الطلبات
          </Button>
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

        {/* Bar Chart */}
        <Card
          title={
            <>
              <span className="ic ic-sm" style={{color:'var(--em)'}}>
                <i className="ti ti-chart-bar"/>
              </span>
              مبيعات الأشهر الستة الأخيرة
            </>
          }
          actions={
            <>
              <Button size="xs" onClick={() => setChartMode('monthly')}
                className={chartMode === 'monthly' ? 'bg-emb border-embo text-em' : ''}>
                شهري
              </Button>
              <Button size="xs" onClick={() => setChartMode('weekly')}
                className={chartMode === 'weekly' ? 'bg-emb border-embo text-em' : ''}>
                أسبوعي
              </Button>
            </>
          }
        >
          <BarChart />
        </Card>

        {/* Side column */}
        <div className="flex flex-col gap-4">

          {/* Donut */}
          <Card
            padding={14}
            title={
              <>
                <span className="ic ic-sm" style={{color:'var(--purple)'}}>
                  <i className="ti ti-chart-donut"/>
                </span>
                توزيع المبيعات
              </>
            }
          >
            <div className="donut-w">
              <div className="donut" />
              <div className="d-legend">
                {DONUT_LEGEND.map(({ color, label, pct }) => (
                  <div className="d-item" key={label}>
                    <div className="d-dot" style={{ background: color }} />
                    <span className="text-t3 flex-1">{label}</span>
                    <strong>{pct}</strong>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Top products */}
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
            {[
              { name:'زيت مائدة 5L',    val:52,  n:'124 وحدة',   c:'var(--em)'     },
              { name:'ماء معدني 1.5L',  val:31,  n:'740 قارورة', c:'var(--blue)'   },
              { name:'سكر 1kg',         val:18,  n:'215 كيس',    c:'var(--gold)'   },
            ].map(({ name, val, n, c }) => (
              <div className="sr" key={name}>
                <div>
                  <div className="text-sm font-bold text-t1 mb-1">
                    {name}
                  </div>
                  <ProgressBar value={val} color={c} height={4} />
                </div>
                <span className="text-xs text-t4" style={{minWidth:72,textAlign:'left'}}>{n}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* ── أحدث طلبات البوابة ── */}
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
        {/* Recent invoices table */}
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
            <Button size="xs" onClick={() => navigate('/dashboard/invoices')}>
              عرض الكل
            </Button>
          }
        >
          <SimpleTable
            columns={[
              { key: 'id', label: 'رقم', className: 'm' },
              { key: 'client', label: 'الزبون', render: (_v, row) => (
                <div className="flex items-center gap-2">
                  <Avatar initials={row.clientInitial as string} color={row.avatarColor as 1|2|3|4|5|6|7} size={26} />
                  <span className={`s ${row.status === 'cancelled' ? 'line-through text-t4' : ''}`}>
                    {row.client as string}
                  </span>
                </div>
              )},
              { key: 'amount', label: 'المبلغ', render: (v, row) => (
                <span className={row.status === 'cancelled' ? 'r line-through' : 'e'}>{String(v)}</span>
              )},
              { key: 'tva', label: 'TVA', className: 'm text-t4' },
              { key: 'status', label: 'الحالة', render: (v) => statusBadge(v as Invoice['status']) },
              { key: 'date', label: 'التاريخ', className: 'text-xs text-t4' },
              { key: 'action', label: '', render: (v) => (
                <button className="btn btn-xs">
                  <span className="ic ic-xs">
                    <i className={`ti ${actionIcon(v as string)}`}/>
                  </span>
                </button>
              )},
            ]}
            data={INVOICES}
            rowKey="id"
          />
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Stock alerts */}
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
            actions={<Badge variant="danger">5</Badge>}
          >
            {STOCK_ALERTS.map(({ name, qty, level, status }) => (
              <div className="sr" key={name}>
                <div className="flex-1">
                  <div className="text-sm font-bold text-t1">{name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <ProgressBar
                      value={level}
                      color={status === 'out' ? 'var(--red)' : 'var(--gold)'}
                      height={4}
                    />
                    <span className="text-xs flex-shrink-0" style={{
                      color: status === 'out' ? 'var(--red)' : 'var(--gold)',
                      minWidth:44,
                    }}>
                      {qty}
                    </span>
                  </div>
                </div>
                <Badge variant={status === 'out' ? 'danger' : 'warning'}>
                  {status === 'out' ? 'نفد' : 'منخفض'}
                </Badge>
              </div>
            ))}
            <Button
              variant="danger" size="sm" fullWidth
              icon={<i className="ti ti-arrow-left"/>}
              className="mt-2"
              onClick={() => navigate('/dashboard/inventory')}
            >
              إدارة المخزون
            </Button>
          </Card>

          {/* Activity timeline */}
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
              {ACTIVITIES.map((a, i) => (
                <div className="tl-i" key={i}>
                  <div className={`tl-d ${a.dot}`} />
                  <div className="tl-t">{a.time}</div>
                  <div className="tl-x">{a.text}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* TVA quick card */}
          <Card
            padding={14}
            style={{
              background: 'linear-gradient(135deg,var(--emb),rgba(10,138,92,.04))',
              borderColor: 'var(--embo)',
            }}
            noHeader
          >
            <div className="text-sm font-bold text-em mb-2 flex items-center gap-2">
              <i className="ti ti-landmark"/> TVA مستحقة — أفريل 2024
            </div>
            <div className="sr">
              <div className="sr-l">TVA محصّلة</div>
              <div className="sr-v text-gold">237,196 دج</div>
            </div>
            <div className="sr">
              <div className="sr-l">TVA مستردة</div>
              <div className="sr-v text-blue">− 46,588 دج</div>
            </div>
            <div className="sr border-t border-embo pt-2 mt-1">
              <div className="sr-l font-extrabold text-red">المستحق للدولة</div>
              <div className="sr-v text-red" style={{fontSize:16}}>190,608 دج</div>
            </div>
            <div className="text-xs text-em mt-2 px-2 py-1 rounded" style={{
              background:'rgba(10,138,92,.08)',
            }}>
              ⏰ الاستحقاق: 20 ماي 2024 — G50
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

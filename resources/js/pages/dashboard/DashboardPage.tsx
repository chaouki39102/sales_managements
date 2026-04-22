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
  { dot:'b', time:'منذ 35 دقيقة', text: <>عميل جديد: <strong>فاطمة بن علي</strong></> },
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
                className="bc-v"
                style={m.hi ? { color: 'var(--gold)' } : {}}
              >
                {m.val}
              </span>
            </div>
            <div
              className="bc-lbl"
              style={m.hi ? { color: 'var(--gold)', fontWeight: 800 } : {}}
            >
              {m.lbl}
            </div>
          </div>
        ))}
      </div>
      <div style={{
        display:'flex', justifyContent:'space-between', marginTop:12,
        padding:'9px 12px', background:'var(--bg3)', borderRadius:'var(--r2)',
      }}>
        <span style={{fontSize:'11.5px',color:'var(--t4)'}}>أدنى <strong style={{color:'var(--t2)'}}>210K</strong></span>
        <span style={{fontSize:'11.5px',color:'var(--t4)'}}>متوسط <strong style={{color:'var(--t2)'}}>313K</strong></span>
        <span style={{fontSize:'11.5px',color:'var(--t4)'}}>أعلى <strong style={{color:'var(--gold)'}}>524K دج</strong></span>
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

  return (
    <div className="page on" id="p-dashboard">

      {/* ── Alert ── */}
      <AlertBar variant="green">
        <strong>تنبيهات اليوم:</strong>{' '}
        5 منتجات بمخزون منخفض — 3 فواتير معلقة — دين مستحق لفاطمة بن علي منذ 5 أيام.{' '}
        <a onClick={() => navigate('/dashboard/inventory')} style={{cursor:'pointer',fontWeight:800,textDecoration:'underline',marginRight:4}}>
          معالجة المخزون ←
        </a>
        <a onClick={() => navigate('/dashboard/debts')} style={{cursor:'pointer',fontWeight:800,textDecoration:'underline'}}>
          تتبع الديون ←
        </a>
      </AlertBar>

      {/* ── Mobile quick actions ── */}
      <div className="dash-quick" style={{gap:8,marginBottom:14,overflowX:'auto',paddingBottom:2}}>
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
          label="عملاء جدد — أفريل" value="47"
          trend="▲ 3" trendDir="up"
          sub="إجمالي: 284 عميل"
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
      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard
          variant="purple" icon="ti-trending-up"
          label="مبيعات الشهر" value="1,248,400" unit="دج"
          trend="▲ 18%" trendDir="up"
          sub={
            <>
              هدف: 1,500,000 دج
              <div style={{ marginTop: 5 }}>
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
          label="ديون العملاء" value="56,200" unit="دج"
          trend="مستحقة" trendDir="down"
          sub="3 عملاء متأخرون"
          onClick={() => navigate('/dashboard/debts')}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="g65" style={{ marginBottom: 18 }}>

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
                style={chartMode === 'monthly' ? {background:'var(--emb)',borderColor:'var(--embo)',color:'var(--em)'} : {}}>
                شهري
              </Button>
              <Button size="xs" onClick={() => setChartMode('weekly')}
                style={chartMode === 'weekly' ? {background:'var(--emb)',borderColor:'var(--embo)',color:'var(--em)'} : {}}>
                أسبوعي
              </Button>
            </>
          }
        >
          <BarChart />
        </Card>

        {/* Side column */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

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
                    <span style={{ color:'var(--t3)', flex:1 }}>{label}</span>
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
                  <div style={{fontSize:'12.5px',fontWeight:700,color:'var(--t1)',marginBottom:4}}>
                    {name}
                  </div>
                  <ProgressBar value={val} color={c} height={4} />
                </div>
                <span style={{fontSize:'11.5px',color:'var(--t4)',minWidth:72,textAlign:'left'}}>{n}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>

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
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>العميل</th>
                  <th>المبلغ</th>
                  <th>TVA</th>
                  <th>الحالة</th>
                  <th>التاريخ</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv) => (
                  <tr key={inv.id}>
                    <td className="m">{inv.id}</td>
                    <td>
                      <div style={{display:'flex',alignItems:'center',gap:7}}>
                        <Avatar initials={inv.clientInitial} color={inv.avatarColor} size={26} />
                        <span className="s"
                          style={inv.status === 'cancelled' ? {textDecoration:'line-through',color:'var(--t4)'} : {}}>
                          {inv.client}
                        </span>
                      </div>
                    </td>
                    <td className={inv.status === 'cancelled' ? 'r' : 'e'}
                      style={inv.status === 'cancelled' ? {textDecoration:'line-through'} : {}}>
                      {inv.amount}
                    </td>
                    <td className="m" style={{color:'var(--t4)'}}>{inv.tva}</td>
                    <td>{statusBadge(inv.status)}</td>
                    <td style={{fontSize:'11.5px',color:'var(--t4)'}}>{inv.date}</td>
                    <td>
                      <button className="btn btn-xs">
                        <span className="ic ic-xs">
                          <i className={`ti ${actionIcon(inv.action)}`}/>
                        </span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Right column */}
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

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
                <div style={{flex:1}}>
                  <div style={{fontSize:'12.5px',fontWeight:700,color:'var(--t1)'}}>{name}</div>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginTop:4}}>
                    <ProgressBar
                      value={level}
                      color={status === 'out' ? 'var(--red)' : 'var(--gold)'}
                      height={4}
                    />
                    <span style={{
                      fontSize:'10.5px',
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
              style={{marginTop:10}}
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
            <div style={{fontSize:12,fontWeight:700,color:'var(--em)',marginBottom:8,display:'flex',alignItems:'center',gap:6}}>
              <i className="ti ti-landmark"/> TVA مستحقة — أفريل 2024
            </div>
            <div className="sr">
              <div className="sr-l">TVA محصّلة</div>
              <div className="sr-v" style={{color:'var(--gold)'}}>237,196 دج</div>
            </div>
            <div className="sr">
              <div className="sr-l">TVA مستردة</div>
              <div className="sr-v" style={{color:'var(--blue)'}}>− 46,588 دج</div>
            </div>
            <div className="sr" style={{borderTop:'1px solid var(--embo)',paddingTop:8,marginTop:4}}>
              <div className="sr-l" style={{fontWeight:800,color:'var(--red)'}}>المستحق للدولة</div>
              <div className="sr-v" style={{color:'var(--red)',fontSize:16}}>190,608 دج</div>
            </div>
            <div style={{
              fontSize:'10.5px',color:'var(--em)',marginTop:8,
              padding:'6px 10px',background:'rgba(10,138,92,.08)',borderRadius:6,
            }}>
              ⏰ الاستحقاق: 20 ماي 2024 — G50
            </div>
            <Button
              variant="primary" size="sm" fullWidth
              icon={<i className="ti ti-calculator"/>}
              style={{marginTop:10}}
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

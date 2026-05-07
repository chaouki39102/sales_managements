// ════════════════════════════════════════════════
// pages/admin/AdminDashboardPage.tsx
// ════════════════════════════════════════════════
import { useAdminDashboard } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';

const PLAN_LABELS: Record<string, string> = {
  starter:      'مبتدئ',
  professional: 'احترافي',
  enterprise:   'مؤسسة',
  custom:       'مخصص',
};

const PLAN_COLORS: Record<string, string> = {
  starter:      '#6366f1',
  professional: '#0ea5e9',
  enterprise:   '#f59e0b',
  custom:       '#8b5cf6',
};

function KpiCard({ label, value, sub, icon, color = 'var(--em)' }: {
  label: string; value: number | string; sub?: string; icon: string; color?: string;
}) {
  return (
    <div style={{
      background: 'var(--bg1)', border: '1px solid var(--bd0)', borderRadius: 12,
      padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: color + '1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={`ti ${icon}`} style={{ fontSize: 20, color }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--tx0)', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 13, color: 'var(--tx1)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--tx2)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useAdminDashboard();
  const navigate = useNavigate();

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const s = data;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--tx0)', margin: 0 }}>لوحة تحكم النظام</h1>
        <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>نظرة شاملة على كامل المنصة</p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
        <KpiCard label="إجمالي الشركات"   value={s?.companies.total ?? 0}     icon="ti-building-store"  color="#0ea5e9" />
        <KpiCard label="شركات نشطة"        value={s?.companies.active ?? 0}    icon="ti-circle-check"    color="#10b981" />
        <KpiCard label="شركات موقوفة"      value={s?.companies.suspended ?? 0} icon="ti-ban"             color="#ef4444" />
        <KpiCard label="إجمالي المستخدمين" value={s?.users.total ?? 0}         icon="ti-users"           color="#8b5cf6" />
        <KpiCard label="مستخدمون جدد"      value={s?.users.new_this_month ?? 0} icon="ti-user-plus"      color="#f59e0b"
          sub="هذا الشهر" />
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Plans breakdown */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd0)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx0)', marginBottom: 16 }}>
            <i className="ti ti-credit-card" style={{ marginLeft: 8, color: 'var(--em)' }} />
            توزيع الخطط
          </div>
          {s?.companies.by_plan && Object.entries(s.companies.by_plan).map(([plan, count]) => {
            const total = s.companies.total || 1;
            const pct = Math.round((count as number / total) * 100);
            const color = PLAN_COLORS[plan] ?? '#6b7280';
            return (
              <div key={plan} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: 'var(--tx1)' }}>{PLAN_LABELS[plan] ?? plan}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx0)' }}>{count as number} شركة</span>
                </div>
                <div style={{ height: 6, background: 'var(--bg0)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width .4s' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Recent companies */}
        <div style={{ background: 'var(--bg1)', border: '1px solid var(--bd0)', borderRadius: 12, padding: 20 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16
          }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx0)' }}>
              <i className="ti ti-building-store" style={{ marginLeft: 8, color: 'var(--em)' }} />
              أحدث الشركات
            </div>
            <button
              onClick={() => navigate('/admin/companies')}
              style={{ fontSize: 12, color: 'var(--em)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              عرض الكل ←
            </button>
          </div>
          {s?.recent_companies?.slice(0, 5).map(co => (
            <div key={co.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
              borderBottom: '1px solid var(--bd0)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'var(--em-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--em)', flexShrink: 0,
              }}>
                {co.name[0]}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {co.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{PLAN_LABELS[co.plan] ?? co.plan} · {co.users_count} مستخدم</div>
              </div>
              <span style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                background: co.is_suspended ? '#ef44441a' : co.is_active ? '#10b9811a' : '#6b72801a',
                color: co.is_suspended ? '#ef4444' : co.is_active ? '#10b981' : '#6b7280',
              }}>
                {co.is_suspended ? 'موقوف' : co.is_active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

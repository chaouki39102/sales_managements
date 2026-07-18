import { useState } from 'react';
import { useAdminDashboard, useSystemSettings } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AdminBootModal from '@/components/modals/AdminBootModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { adminApi } from '@/lib/admin';
import { PLAN_LABELS, PLAN_COLORS, EVENT_LABELS, EVENT_COLORS } from '@/lib/admin-constants';
import { Avatar, fmtDateTime } from '@/components/admin/shared';

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useAdminDashboard();
  const navigate = useNavigate();
  const { data: systemStatus, isLoading: statusLoading } = useSystemSettings();
  const [bootDismissed, setBootDismissed] = useState(false);
  const showBootModal = !statusLoading && systemStatus?.is_ready === false && !bootDismissed;

  const { data: approvalsData } = useQuery({
    queryKey: ['admin', 'users', 'pending-approval'],
    queryFn: () => adminApi.getPendingUsers({ per_page: 1 }),
    staleTime: 60_000,
  });
  const pendingCount = (approvalsData as any)?.meta?.total ?? 0;

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12, color: 'var(--t4)' }}>
      <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin .8s linear infinite' }} />
      جارٍ التحميل...
    </div>
  );

  if (isError) return (
    <div style={{ padding: 20, textAlign: 'center', color: '#ef4444' }}>
      <i className="ti ti-alert-circle" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
      فشل تحميل البيانات.{' '}
      <Button onClick={() => refetch()}>إعادة المحاولة</Button>
    </div>
  );

  if (!stats) return null;

  const { companies, users, recent_companies, recent_users, recent_activity, growth_7d, at_risk_companies, system_health } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {showBootModal && <AdminBootModal onComplete={() => setBootDismissed(true)} />}

      {!statusLoading && systemStatus?.is_ready === false && bootDismissed && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 16px', borderRadius: 10,
          background: '#f59e0b1a', border: '1px solid #f59e0b33', fontSize: 13, color: '#f59e0b',
        }}>
          <span><i className="ti ti-alert-triangle" style={{ marginLeft: 8 }} />البيانات العالمية غير مكتملة</span>
          <button onClick={() => setBootDismissed(false)} style={{
            padding: '4px 12px', borderRadius: 7, border: '1px solid #f59e0b55',
            background: '#f59e0b22', color: '#f59e0b', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
          }}>إعداد النظام</button>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <PageHeader title="لوحة تحكم النظام" description="نظرة شاملة على كامل المنصة" />
        <Button onClick={() => refetch()} variant="secondary" icon={<i className="ti ti-refresh" />}>تحديث</Button>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        <KpiCard variant="green" icon="ti-building-store" label="إجمالي الشركات" value={companies.total} />
        <KpiCard variant="blue" icon="ti-circle-check" label="شركات نشطة" value={companies.active} />
        <KpiCard variant="red" icon="ti-ban" label="موقوفة" value={companies.suspended} />
        <KpiCard variant="purple" icon="ti-users" label="إجمالي المستخدمين" value={users.total} />
        <KpiCard variant="teal" icon="ti-user-plus" label="مستخدمون جدد" value={users.new_this_month} sub="هذا الشهر" />
        <KpiCard variant="gold" icon="ti-shield-check" label="موثّقة" value={companies.verified} />
        {pendingCount > 0 && (
          <div onClick={() => navigate('/admin/approvals')} style={{ cursor: 'pointer' }}>
            <KpiCard variant="gold" icon="ti-clock" label="بانتظار التفعيل" value={pendingCount} />
          </div>
        )}
      </div>

      {/* ── Row 2: Growth + Plan Distribution + At Risk ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Growth Sparkline */}
        <Card title="النمو خلال 7 أيام">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, padding: '8px 0' }}>
            {growth_7d.map((d: any) => {
              const maxVal = Math.max(...growth_7d.map((g: any) => Math.max(g.companies, g.users)), 1);
              const h1 = Math.max((d.companies / maxVal) * 60, 2);
              const h2 = Math.max((d.users / maxVal) * 60, 2);
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 60 }}>
                    <div style={{ width: 8, height: h1, background: '#10b981', borderRadius: 3 }} title={`${d.companies} شركة`} />
                    <div style={{ width: 8, height: h2, background: '#6366f1', borderRadius: 3 }} title={`${d.users} مستخدم`} />
                  </div>
                  <span style={{ fontSize: 8, color: 'var(--t4)' }}>{new Date(d.date).toLocaleDateString('ar-DZ', { weekday: 'narrow' })}</span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: 12, fontSize: 10, color: 'var(--t4)' }}>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#10b981', borderRadius: 2, marginLeft: 4 }} />شركات</span>
            <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#6366f1', borderRadius: 2, marginLeft: 4 }} />مستخدمون</span>
          </div>
        </Card>

        {/* Plan Distribution */}
        <Card title="توزيع الخطط">
          {Object.entries(companies.by_plan).map(([plan, count]) => {
            const total = companies.total || 1;
            const pct = Math.round((count / total) * 100);
            const color = PLAN_COLORS[plan] || '#6b7280';
            return (
              <div key={plan} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--t2)' }}>{PLAN_LABELS[plan] || plan}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{count} ({pct}%)</span>
                </div>
                <div className="pb">
                  <div className="pb-f" style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })}
        </Card>

        {/* At Risk Companies */}
        <Card
          title="شركات قارب الحد"
          actions={<span style={{ fontSize: 10, color: 'var(--t4)' }}>80%+ من الحد</span>}
        >
          {at_risk_companies.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--t4)', fontSize: 12 }}>
              <i className="ti ti-check-circle" style={{ fontSize: 24, color: '#10b981', display: 'block', marginBottom: 6 }} />
              لا توجد شركات قارب حدودها
            </div>
          ) : (
            at_risk_companies.map((co: any) => (
              <div key={co.id} onClick={() => navigate('/admin/companies')} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 0', borderBottom: '1px solid var(--b1)', cursor: 'pointer',
              }}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{co.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 6 }}>{co.current}/{co.max}</span>
                </div>
                <div style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: co.pct >= 90 ? '#ef444422' : '#f59e0b22',
                  color: co.pct >= 90 ? '#ef4444' : '#f59e0b',
                }}>{co.pct}%</div>
              </div>
            ))
          )}
        </Card>
      </div>

      {/* ── Row 3: Recent Companies + Recent Activity ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Recent Companies */}
        <Card title="أحدث الشركات" actions={<Button size="sm" onClick={() => navigate('/admin/companies')}>عرض الكل</Button>}>
          {recent_companies.slice(0, 5).map((co: any) => (
            <div key={co.id} onClick={() => navigate('/admin/companies')} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 0', borderBottom: '1px solid var(--b1)', cursor: 'pointer',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar id={co.id} name={co.name} size={32} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{co.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                    {PLAN_LABELS[co.plan] || co.plan} · {co.users_count ?? 0} مستخدم
                  </div>
                </div>
              </div>
              <Badge variant={co.is_suspended ? 'danger' : co.active ? 'success' : 'gray'}>
                {co.is_suspended ? 'موقوف' : co.active ? 'نشط' : 'معطل'}
              </Badge>
            </div>
          ))}
        </Card>

        {/* Recent Activity */}
        <Card title="آخر النشاطات" actions={<Button size="sm" onClick={() => navigate('/admin/activity')}>عرض الكل</Button>}>
          {(recent_activity || []).slice(0, 6).map((log: any) => (
            <div key={log.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '7px 0', borderBottom: '1px solid var(--b1)',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: (EVENT_COLORS[log.event] || '#6b7280') + '20',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: EVENT_COLORS[log.event] || '#6b7280',
              }}>
                <i className={`ti ti-${log.event === 'created' ? 'plus' : log.event === 'deleted' ? 'trash' : 'edit'}`} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--t1)' }}>
                  <strong>{log.user_name || 'مستخدم'}</strong>{' '}
                  {EVENT_LABELS[log.event] || log.event}
                  <span style={{ color: 'var(--t4)', fontSize: 10, marginRight: 4 }}>
                    {log.auditable_type?.split('\\').pop()}
                  </span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--t4)' }}>{fmtDateTime(log.created_at)}</div>
              </div>
            </div>
          ))}
          {(!recent_activity || recent_activity.length === 0) && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--t4)', fontSize: 12 }}>لا توجد نشاطات حديثة</div>
          )}
        </Card>
      </div>

      {/* ── Row 4: System Health ── */}
      {system_health && (
        <Card title="صحة النظام">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            <HealthItem icon="ti-server" label="قاعدة البيانات" value={`${system_health.db_size_mb} MB`} />
            <HealthItem icon="ti-hard-drive" label="المساحة الحرة" value={`${system_health.disk_free_gb} GB`} />
            <HealthItem icon="ti-php" label="PHP" value={system_health.php_version} />
            <HealthItem icon="ti-brand-laravel" label="Laravel" value={system_health.laravel_version} />
            <HealthItem icon="ti-database" label="Cache Driver" value={system_health.cache_driver} />
            <HealthItem icon="ti-stack" label="Queue Driver" value={system_health.queue_driver} />
            <HealthItem
              icon="ti-clock"
              label="Jobs معلّقة"
              value={system_health.queue_pending}
              warn={system_health.queue_pending > 10}
            />
            <HealthItem
              icon="ti-alert-triangle"
              label="Jobs فاشلة"
              value={system_health.queue_failed}
              warn={system_health.queue_failed > 0}
              danger={system_health.queue_failed > 0}
            />
            {system_health.maintenance_mode && (
              <div style={{
                gridColumn: '1 / -1', padding: '10px 14px', borderRadius: 10,
                background: '#f59e0b1a', border: '1px solid #f59e0b33', fontSize: 12, color: '#f59e0b',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className="ti ti-tool" /> الموقع في وضع الصيانة حالياً
                <Button size="sm" onClick={() => navigate('/admin/settings')} style={{ marginRight: 'auto' }}>إدارة</Button>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ── Quick Actions ── */}
      <Card title="إجراءات سريعة">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <QuickAction icon="ti-building-plus" label="إضافة شركة" to="/admin/companies" />
          <QuickAction icon="ti-users" label="إدارة المستخدمين" to="/admin/users" />
          {pendingCount > 0 && (
            <QuickAction icon="ti-user-check" label={`تفعيل (${pendingCount})`} to="/admin/approvals" highlight />
          )}
          <QuickAction icon="ti-credit-card" label="الخطط" to="/admin/plans" />
          <QuickAction icon="ti-settings" label="الإعدادات" to="/admin/settings" />
          <QuickAction icon="ti-activity" label="سجل النشاط" to="/admin/activity" />
        </div>
      </Card>

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function HealthItem({ icon, label, value, warn, danger }: {
  icon: string; label: string; value: string | number; warn?: boolean; danger?: boolean;
}) {
  const color = danger ? '#ef4444' : warn ? '#f59e0b' : 'var(--t4)';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: 8, background: danger ? '#ef44440d' : warn ? '#f59e0b0d' : 'var(--bg3)',
    }}>
      <i className={`ti ${icon}`} style={{ fontSize: 16, color }} />
      <div>
        <div style={{ fontSize: 10, color: 'var(--t4)' }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, to, highlight }: {
  icon: string; label: string; to: string; highlight?: boolean;
}) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
        borderRadius: 10, border: highlight ? '1px solid #f59e0b44' : '1px solid var(--b2)',
        background: highlight ? '#f59e0b10' : 'var(--bg3)',
        color: highlight ? '#f59e0b' : 'var(--t2)',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
        flex: '1 1 auto', minWidth: 140, justifyContent: 'center',
      }}
    >
      <i className={`ti ${icon}`} />{label}
    </button>
  );
}

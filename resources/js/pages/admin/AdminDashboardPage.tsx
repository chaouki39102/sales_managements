// ════════════════════════════════════════════════
// pages/admin/AdminDashboardPage.tsx
// لوحة تحكم احترافية للسوبر أدمن
// ════════════════════════════════════════════════
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/lib/api/core/client';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';
import { useDashboardStats } from '../../../../merged-files';

const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};

const QUICK_ACTIONS = [
  { label: 'إضافة شركة',          icon: 'ti-building-plus',     to: '/admin/companies' },
  { label: 'إدارة المستخدمين',    icon: 'ti-users',             to: '/admin/users' },
  { label: 'الإعدادات العامة',    icon: 'ti-settings',          to: '/admin/settings' },
  { label: 'سجل النشاط',          icon: 'ti-activity',          to: '/admin/activity' },
];

export default function AdminDashboardPage() {
//   const { data: stats, isLoading, isError, refetch } = useAdminDashboard();
  const { data: stats, isLoading, isError, refetch } = useDashboardStats();
  const navigate = useNavigate();

  if (isLoading) return <div className="empty" style={{ padding: 60 }}><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite', fontSize: 24, color: 'var(--em)' }} /> جار التحميل...</div>;
  if (isError) return <AlertBar variant="red">فشل تحميل البيانات. <Button onClick={() => refetch()}>إعادة المحاولة</Button></AlertBar>;
  if (!stats) return null;

  const { companies, users, recent_companies } = stats;

  return (
    <div>
      <PageHeader title="لوحة تحكم النظام" description="نظرة شاملة على كامل المنصة" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard variant="green" icon="ti-building-store" label="إجمالي الشركات" value={companies.total} />
        <KpiCard variant="blue" icon="ti-circle-check" label="شركات نشطة" value={companies.active} />
        <KpiCard variant="red" icon="ti-ban" label="موقوفة" value={companies.suspended} />
        <KpiCard variant="purple" icon="ti-users" label="إجمالي المستخدمين" value={users.total} />
        <KpiCard variant="gold" icon="ti-user-plus" label="مستخدمون جدد" value={users.new_this_month} sub="هذا الشهر" />
        <KpiCard variant="teal" icon="ti-shield-check" label="موثّقة" value={companies.verified ?? 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* توزيع الخطط */}
        <Card title="توزيع الخطط">
          {Object.entries(companies.by_plan).map(([plan, count]) => {
            const total = companies.total || 1;
            const pct = Math.round((count / total) * 100);
            const color = PLAN_COLORS[plan] || '#6b7280';
            return (
              <div key={plan} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--t2)' }}>{PLAN_LABELS[plan] || plan}</span>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{count} شركة ({pct}%)</span>
                </div>
                <div className="pb"><div className="pb-f" style={{ width: `${pct}%`, background: color }} /></div>
              </div>
            );
          })}
        </Card>

        {/* أحدث الشركات */}
        <Card title="أحدث الشركات" actions={<Button size="sm" onClick={() => navigate('/admin/companies')}>عرض الكل →</Button>}>
          {recent_companies.slice(0, 5).map(co => (
            <div key={co.id} className="sr" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--b1)' }}>
              <div>
                <strong style={{ fontSize: 13 }}>{co.name}</strong><br />
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>/{co.slug}</span>
              </div>
              <Badge variant={co.is_suspended ? 'danger' : co.active ? 'success' : 'gray'}>
                {co.is_suspended ? 'موقوف' : co.active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          ))}
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="إجراءات سريعة">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {QUICK_ACTIONS.map(action => (
            <Button
              key={action.to}
              variant="secondary"
              icon={<i className={`ti ${action.icon}`} />}
              onClick={() => navigate(action.to)}
              style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}
            >
              {action.label}
            </Button>
          ))}
          <Button variant="secondary" icon={<i className="ti ti-refresh" />} onClick={() => refetch()} style={{ flex: 1, minWidth: 160, justifyContent: 'center' }}>
            تحديث البيانات
          </Button>
        </div>
      </Card>
    </div>
  );
}

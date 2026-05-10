// pages/admin/AdminDashboardPage.tsx
import { useAdminDashboard } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AlertBar from '@/components/ui/AlertBar';

const PLAN_LABELS: Record<string, string> = {
  free: 'مجاني', starter: 'مبتدئ', professional: 'احترافي', enterprise: 'مؤسسة', custom: 'مخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};

export default function AdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = useAdminDashboard();
  const navigate = useNavigate();

  if (isLoading) return <div className="empty"><i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} /> جار التحميل...</div>;
  if (isError) return <AlertBar variant="red">فشل تحميل البيانات. <Button onClick={() => refetch()}>إعادة المحاولة</Button></AlertBar>;
  if (!stats) return null;

  const { companies, users, recent_companies } = stats;

  return (
    <div>
      <PageHeader title="لوحة تحكم النظام" description="نظرة شاملة على كامل المنصة" />
      <div className="kpis">
        <KpiCard variant="green" icon="ti-building-store" label="إجمالي الشركات" value={companies.total} />
        <KpiCard variant="blue" icon="ti-circle-check" label="شركات نشطة" value={companies.active} />
        <KpiCard variant="red" icon="ti-ban" label="موقوفة" value={companies.suspended} />
        <KpiCard variant="purple" icon="ti-users" label="إجمالي المستخدمين" value={users.total} />
        <KpiCard variant="gold" icon="ti-user-plus" label="مستخدمون جدد" value={users.new_this_month} sub="هذا الشهر" />
      </div>

      <div className="g2">
        <Card title="توزيع الخطط">
          {Object.entries(companies.by_plan).map(([plan, count]) => {
            const total = companies.total || 1;
            const pct = Math.round((count / total) * 100);
            const color = PLAN_COLORS[plan] || '#6b7280';
            return (
              <div key={plan} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span>{PLAN_LABELS[plan] || plan}</span>
                  <span>{count} شركة ({pct}%)</span>
                </div>
                <div className="pb"><div className="pb-f" style={{ width: `${pct}%`, background: color }} /></div>
              </div>
            );
          })}
        </Card>

        <Card title="أحدث الشركات" actions={<Button size="sm" onClick={() => navigate('/admin/companies')}>عرض الكل →</Button>}>
          {recent_companies.slice(0, 5).map(co => (
            <div key={co.id} className="sr">
              <div><strong>{co.name}</strong><br />/{co.slug}</div>
              <Badge variant={co.is_suspended ? 'danger' : co.active ? 'success' : 'gray'}>
                {co.is_suspended ? 'موقوف' : co.active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

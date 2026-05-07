// ════════════════════════════════════════════════
// pages/admin/AdminPlansPage.tsx
// عرض الخطط والإحصائيات
// ════════════════════════════════════════════════
import { useAdminPlans, useAdminDashboard } from '@/hooks/useAdmin';

const PLAN_ICONS: Record<string, string> = {
  starter:      'ti-seedling',
  professional: 'ti-rocket',
  enterprise:   'ti-building',
  custom:       'ti-adjustments',
};
const PLAN_COLORS: Record<string, string> = {
  starter: '#6366f1', professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};
const PLAN_LABELS_AR: Record<string, string> = {
  starter: 'المبتدئ', professional: 'الاحترافي', enterprise: 'المؤسسة', custom: 'المخصص',
};

export default function AdminPlansPage() {
  const { data: plans, isLoading } = useAdminPlans();
  const { data: stats } = useAdminDashboard();

  const byPlan = stats?.companies.by_plan ?? {};

  if (isLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
      <i className="ti ti-loader" style={{ fontSize: 28, color: 'var(--em)', animation: 'spin 1s linear infinite' }} />
    </div>
  );

  const defaultPlans = [
    { key: 'starter',      label: 'مبتدئ',     max_users: 3,   max_products: 500,  max_warehouses: 1 },
    { key: 'professional', label: 'احترافي',   max_users: 15,  max_products: 5000, max_warehouses: 5 },
    { key: 'enterprise',   label: 'مؤسسة',     max_users: 50,  max_products: 0,    max_warehouses: 20 },
    { key: 'custom',       label: 'مخصص',      max_users: 0,   max_products: 0,    max_warehouses: 0 },
  ];

  const displayPlans = (plans?.length ? plans : defaultPlans) as any[];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx0)', margin: 0 }}>الخطط</h1>
        <p style={{ fontSize: 13, color: 'var(--tx2)', marginTop: 4 }}>نظرة عامة على الخطط المتاحة واشتراكات الشركات</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {displayPlans.map((plan: any) => {
          const key = plan.key ?? plan;
          const color = PLAN_COLORS[key] ?? '#6b7280';
          const count = (byPlan as any)[key] ?? 0;
          const label = PLAN_LABELS_AR[key] ?? plan.label ?? key;

          return (
            <div key={key} style={{
              background: 'var(--bg1)', border: '1px solid var(--bd0)', borderRadius: 14,
              padding: '20px', borderTop: `3px solid ${color}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, background: color + '1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${PLAN_ICONS[key] ?? 'ti-credit-card'}`} style={{ fontSize: 18, color }} />
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--tx0)' }}>{label}</div>
                  <div style={{ fontSize: 11, color: 'var(--tx2)' }}>{count} شركة مشتركة</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  { label: 'المستخدمون', value: plan.max_users === 0 ? 'غير محدود' : plan.max_users, icon: 'ti-users' },
                  { label: 'المنتجات',   value: plan.max_products === 0 ? 'غير محدود' : plan.max_products?.toLocaleString('ar'), icon: 'ti-box' },
                  { label: 'المخازن',    value: plan.max_warehouses === 0 ? 'غير محدود' : plan.max_warehouses, icon: 'ti-building-warehouse' },
                ].map(({ label: lbl, value, icon }) => (
                  <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--bd0)' }}>
                    <span style={{ fontSize: 12, color: 'var(--tx2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className={`ti ${icon}`} style={{ fontSize: 14 }} />
                      {lbl}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx0)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Subscribers bar */}
              <div style={{ marginTop: 14 }}>
                <div style={{ fontSize: 11, color: 'var(--tx2)', marginBottom: 4 }}>
                  نسبة الاشتراك: {count} شركة
                </div>
                <div style={{ height: 5, background: 'var(--bg0)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: color, borderRadius: 3,
                    width: `${Math.min(100, (count / Math.max(stats?.companies.total ?? 1, 1)) * 100)}%`,
                    transition: 'width .4s',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Note */}
      <div style={{
        marginTop: 28, padding: '14px 18px', borderRadius: 10,
        background: 'var(--em-bg)', border: '1px solid var(--em)', fontSize: 13, color: 'var(--tx1)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <i className="ti ti-info-circle" style={{ fontSize: 16, color: 'var(--em)', flexShrink: 0, marginTop: 1 }} />
        <div>
          لتغيير خطة شركة معينة، اذهب إلى <strong>الشركات</strong> → افتح درج الشركة → تبويب <strong>الخطة</strong>.
          يمكنك تعيين حدود مخصصة لكل شركة بغض النظر عن الخطة الافتراضية.
        </div>
      </div>
    </div>
  );
}

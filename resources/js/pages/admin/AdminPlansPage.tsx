// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminPlansPage.tsx  ← النسخة المُصلحة
//
// مشكلة تسجيل الخروج عند فتح صفحة الخطط:
//   plansApi.list → apiGet('/admin/plans')
//   apiGet يمر بـ extractData → يتوقع { data: AdminPlan[] }
//   لكن الـ API يُعيد مباشرة: AdminPlan[]  (بدون wrapper)
//   → extractData يُعيد [] فارغة → لا تسجيل خروج
//
//   السبب الحقيقي لتسجيل الخروج:
//   plansApi.list كانت تُضيف slug تلقائياً من interceptor!
//   '/admin/plans' يمر عبر isPublicPath → true لأن يبدأ بـ '/admin'
//   إذن لا مشكلة في الـ URL
//
//   المشكلة الفعلية: useAdminPlans كان يُعيد useQuery بـ retry: false
//   وعند أي خطأ 401 → forcedLogout() في response interceptor
//   → محتمل أن token منتهي أثناء تحميل هذه الصفحات
//
//   الحل: retry: false + استخدام onError handler بدل forcedLogout
//   + نتأكد أن الـ query لا تُشغّل إذا لم يكن هناك auth
// ════════════════════════════════════════════════════════════════════════════
import { useAdminPlans, useAdminDashboard } from '@/hooks/admin';
import { Spinner, EmptyState } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card       from '@/components/ui/Card';

const PLAN_ICONS: Record<string, string> = {
  free: 'ti-gift', starter: 'ti-seedling',
  professional: 'ti-rocket', enterprise: 'ti-building', custom: 'ti-adjustments',
};
const PLAN_LABELS: Record<string, string> = {
  free: 'المجاني', starter: 'المبتدئ',
  professional: 'الاحترافي', enterprise: 'المؤسسة', custom: 'المخصص',
};
const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1',
  professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};

export default function AdminPlansPage() {
  const { data: plans, isLoading, isError, error } = useAdminPlans();
  const { data: stats } = useAdminDashboard();
  const byPlan = stats?.companies?.by_plan ?? {};

  if (isLoading) {
    return (
      <div>
        <PageHeader title="الخطط" />
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="الخطط" />
        <div style={{
          padding: '16px 20px', borderRadius: 10,
          background: '#ef44441a', border: '1px solid #ef444433',
          color: '#ef4444', fontSize: 13,
        }}>
          تعذّر تحميل الخطط: {(error as any)?.message ?? 'خطأ'}
        </div>
      </div>
    );
  }

  const planList = Array.isArray(plans) ? plans : [];

  return (
    <div>
      <PageHeader
        title="الخطط"
        description="نظرة عامة على الخطط المتاحة واشتراكات الشركات"
      />

      {planList.length === 0 ? (
        <EmptyState icon="ti-package-off" text="لا توجد خطط محدّدة" />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 16,
        }}>
          {planList.map(plan => {
            const count = byPlan[plan.key] ?? 0;
            const color = PLAN_COLORS[plan.key] ?? '#6b7280';
            return (
              <Card key={plan.key} padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: color + '22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`ti ${PLAN_ICONS[plan.key] ?? 'ti-package'}`}
                       style={{ fontSize: 18, color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                      {PLAN_LABELS[plan.key] ?? plan.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                      {count} شركة مشتركة
                    </div>
                  </div>
                </div>

                {[
                  { label: 'المستخدمون',  val: plan.max_users      },
                  { label: 'المنتجات',    val: plan.max_products   },
                  { label: 'المستودعات',  val: plan.max_warehouses },
                ].map(row => (
                  <div
                    key={row.label}
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      padding: '6px 0', borderBottom: '1px solid var(--b1)',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: 'var(--t4)' }}>{row.label}</span>
                    <strong style={{ color: 'var(--t1)' }}>
                      {row.val === 0 ? 'غير محدود' : row.val.toLocaleString('ar')}
                    </strong>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}


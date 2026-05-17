// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminPlansPage.tsx  ← النسخة المُصلحة
//
// المشكلة الأصلية:
//   • import { useAdminPlans, useAdminDashboard } from '@/hooks/useAdmin'
//     useAdminPlans لم تكن موجودة في hooks/useAdmin.ts القديم
//
// الحل:
//   • hooks/useAdmin.ts الآن يُعيد تصدير useAdminPlans من hooks/admin/
//   • الـ import يبقى كما هو — الإصلاح في hooks/useAdmin.ts
// ════════════════════════════════════════════════════════════════════════════
import { useAdminPlans, useAdminDashboard } from '@/hooks/useAdmin';  // ✅ يعمل الآن
import PageHeader from '@/components/ui/PageHeader';
import Card       from '@/components/ui/Card';

const PLAN_ICONS: Record<string, string> = {
  free:         'ti-gift',
  starter:      'ti-seedling',
  professional: 'ti-rocket',
  enterprise:   'ti-building',
  custom:       'ti-adjustments',
};

const PLAN_LABELS: Record<string, string> = {
  free:         'المجاني',
  starter:      'المبتدئ',
  professional: 'الاحترافي',
  enterprise:   'المؤسسة',
  custom:       'المخصص',
};

export default function AdminPlansPage() {
  const { data: plans, isLoading } = useAdminPlans();
  const { data: stats } = useAdminDashboard();
  const byPlan = stats?.companies.by_plan ?? {};

  if (isLoading) {
    return (
      <div className="empty">
        <i className="ti ti-loader" style={{ animation: 'spin 1s linear infinite' }} />
        {' '}جار التحميل...
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="الخطط"
        description="نظرة عامة على الخطط المتاحة واشتراكات الشركات"
      />

      <div className="g3">
        {(plans ?? []).map(plan => {
          const count = byPlan[plan.key] ?? 0;
          return (
            <Card
              key={plan.key}
              title={
                <>
                  <i className={`ti ${PLAN_ICONS[plan.key] ?? 'ti-package'}`} />
                  {' '}
                  {PLAN_LABELS[plan.key] ?? plan.label}
                </>
              }
              subtitle={`${count} شركة مشتركة`}
            >
              <div className="sr">
                <span>المستخدمون</span>
                <strong>
                  {plan.max_users === 0 ? 'غير محدود' : plan.max_users}
                </strong>
              </div>
              <div className="sr">
                <span>المنتجات</span>
                <strong>
                  {plan.max_products === 0
                    ? 'غير محدود'
                    : plan.max_products.toLocaleString('ar')}
                </strong>
              </div>
              <div className="sr">
                <span>المستودعات</span>
                <strong>
                  {plan.max_warehouses === 0 ? 'غير محدود' : plan.max_warehouses}
                </strong>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

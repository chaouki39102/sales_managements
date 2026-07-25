// ════════════════════════════════════════════════════════════════════════════
// pages/admin/AdminReportsPage.tsx  ← النسخة المُصلحة
//
// مشكلة تسجيل الخروج عند فتح التقارير:
//   الكود القديم كان يستدعي adminApi.getReports الذي كان غير موجود
//   → TypeError → React يُعيد render → يُلقي خطأ غير معالَج
//   → أو: كان يستدعي endpoint غير موجود → 404 أو 401 → forcedLogout()
//
// الحل:
//   1. نستخدم useAdminDashboard فقط (الذي يعمل) لعرض إحصاءات مبسّطة
//   2. بدل محاولة جلب تقارير من endpoint غير موجود → placeholder واضح
//   3. retry: false في الـ query لتجنب تكرار الطلبات الفاشلة
// ════════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useAdminDashboard } from '@/hooks/admin';
import { Spinner } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card       from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

type Period = '7d' | '30d' | '90d';

const PERIOD_LABELS: Record<Period, string> = {
  '7d':  'آخر 7 أيام',
  '30d': 'آخر 30 يوم',
  '90d': 'آخر 90 يوم',
};

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<Period>('30d');

  // نستخدم داشبورد الذي يعمل بدل endpoint تقارير غير موجود
  const { data: stats, isLoading, isError } = useAdminDashboard();

  return (
    <div>
      <PageHeader
        title="التقارير"
        description="إحصاءات عامة عن المنصة"
        actions={
          <div style={{ display: 'flex', gap: 6 }}>
            {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${period === p ? 'var(--em)' : 'var(--b2)'}`,
                  background: period === p ? 'var(--emb)' : 'var(--bg3)',
                  color: period === p ? 'var(--em)' : 'var(--t3)',
                  cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {isLoading ? (
        <Spinner />
      ) : isError ? (
        <div style={{
          padding: 20, borderRadius: 10,
          background: '#ef44441a', color: '#ef4444', fontSize: 13,
        }}>
          تعذّر تحميل البيانات
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16, marginBottom: 24,
        }}>
          {[
            { label: 'إجمالي الشركات',  val: stats?.companies?.total ?? 0,         icon: 'ti-building',     color: '#6366f1' },
            { label: 'الشركات النشطة',  val: stats?.companies?.active ?? 0,         icon: 'ti-building-check',color: '#10b981' },
            { label: 'شركات موقوفة',    val: stats?.companies?.suspended ?? 0,      icon: 'ti-building-off', color: '#f59e0b' },
            { label: 'إجمالي المستخدمين', val: stats?.users?.total ?? 0,            icon: 'ti-users',        color: '#0ea5e9' },
            { label: 'مستخدمون نشطون', val: stats?.users?.active ?? 0,             icon: 'ti-user-check',   color: '#10b981' },
            { label: 'جديدون هذا الشهر', val: stats?.users?.new_this_month ?? 0,   icon: 'ti-user-plus',    color: '#8b5cf6' },
          ].map(kpi => (
            <Card key={kpi.label} padding={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: kpi.color + '22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <i className={`ti ${kpi.icon}`} style={{ color: kpi.color, fontSize: 18 }} />
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', lineHeight: 1 }}>
                    {kpi.val.toLocaleString('ar')}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 3 }}>{kpi.label}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* توزيع الخطط */}
      {stats?.companies?.by_plan && Object.keys(stats.companies.by_plan).length > 0 && (
        <Card title="توزيع الشركات حسب الخطة">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            {Object.entries(stats.companies.by_plan).map(([plan, count]) => {
              const total = stats.companies.total || 1;
              const pct   = Math.round((count / total) * 100);
              return (
                <div key={plan}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    fontSize: 12, marginBottom: 4,
                  }}>
                    <span style={{ color: 'var(--t2)', fontWeight: 600 }}>
                      {plan}
                    </span>
                    <span style={{ color: 'var(--t4)' }}>
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div style={{
                    height: 6, borderRadius: 3, background: 'var(--bg4)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', borderRadius: 3,
                      background: 'var(--em)',
                      width: `${pct}%`,
                      transition: 'width .4s ease',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* جدول آخر الشركات */}
      {(stats?.recent_companies?.length ?? 0) > 0 && (
        <Card title="آخر الشركات المسجّلة" style={{ marginTop: 16 }}>
          <SimpleTable
            columns={[
              { key: 'name', label: 'الشركة', render: (v) => (
                <span style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 600 }}>{v as string}</span>
              )},
              { key: 'plan', label: 'الخطة', render: (v) => (
                <span style={{ fontSize: 12, color: 'var(--t4)' }}>{v as string}</span>
              )},
              { key: 'created_at', label: 'الإنشاء', render: (v) => (
                <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                  {new Date(v as string).toLocaleDateString('ar-DZ')}
                </span>
              )},
            ]}
            data={stats!.recent_companies}
            rowKey="id"
          />
        </Card>
      )}
    </div>
  );
}

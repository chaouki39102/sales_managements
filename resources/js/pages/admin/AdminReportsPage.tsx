// pages/admin/AdminReportsPage.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { adminApi } from '@/lib/api/admin';
import LineChart from '@/components/charts/LineChart';



export default function AdminReportsPage() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reports', period],
    queryFn: () => adminApi.getReports(period),
  });

  if (isLoading) return <div style={{ padding: 40, textAlign: 'center' }}>تحميل التقارير...</div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader title="تقارير النظام" description="إحصائيات الاستخدام والنمو" />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <Button variant={period === '7d' ? 'primary' : 'default'} onClick={() => setPeriod('7d')}>آخر 7 أيام</Button>
        <Button variant={period === '30d' ? 'primary' : 'default'} onClick={() => setPeriod('30d')}>آخر 30 يوم</Button>
        <Button variant={period === '90d' ? 'primary' : 'default'} onClick={() => setPeriod('90d')}>آخر 90 يوم</Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card title="عدد المستخدمين الجدد">
          <LineChart data={data?.users ?? []} height={240} color="var(--blue)" />
        </Card>
        <Card title="عدد الشركات الجديدة">
          <LineChart data={data?.companies ?? []} height={240} color="var(--em)" />
        </Card>
        <Card title="نداءات API اليومية">
          <LineChart data={data?.apiCalls ?? []} height={240} color="var(--purple)" />
        </Card>
        <Card title="الإيرادات الشهرية (MRR)">
          <LineChart data={data?.revenue ?? []} height={240} color="var(--gold)" />
        </Card>
      </div>
    </div>
  );
}

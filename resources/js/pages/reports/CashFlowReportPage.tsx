import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useCashFlowReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function CashFlowReportPage() {
  const { data, isLoading, isError, refetch } = useCashFlowReport();
  return <ReportShell title="التدفقات النقدية" isLoading={isLoading} isError={isError} refetch={refetch} reportId="cash-flow">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green" icon="ti-cash"         label="إجمالي التحصيل"     value={MONEY(data.summary.total_amount)}/>
          <KpiCard variant="blue"  icon="ti-receipt"      label="عدد الدفعات"         value={data.summary.count}/>
          <KpiCard variant="teal"  icon="ti-calculator"   label="متوسط الدفعة"        value={MONEY(data.summary.avg_amount)}/>
          <KpiCard variant="purple" icon="ti-calendar"    label="أيام بها حركات"       value={data.summary.days_with_movements}/>
        </div>
        {data.monthly.length > 0 && (
          <Card title="الإيرادات الشهرية" titleIcon="ti-calendar" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>الشهر</th><th className="num">العدد</th><th className="num">المبلغ</th></tr></thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 700 }}>{m.month}</td>
                      <td className="num">{m.count}</td>
                      <td className="num">{MONEY(m.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data.by_mode.length > 0 && (
          <Card title="حسب طريقة الدفع" titleIcon="ti-wallet" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>الطريقة</th><th className="num">العدد</th><th className="num">المبلغ</th></tr></thead>
                <tbody>
                  {data.by_mode.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{m.mode}</td>
                      <td className="num">{m.count}</td>
                      <td className="num">{MONEY(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

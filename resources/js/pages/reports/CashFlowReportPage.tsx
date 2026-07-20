import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useCashFlowReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

export default function CashFlowReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useCashFlowReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    if (data.monthly.length > 0) sheets.push({ name: 'شهري', headers: ['الشهر', 'العدد', 'المبلغ'], rows: data.monthly.map(m => [m.month, m.count, m.amount]) });
    if (data.by_mode.length > 0) sheets.push({ name: 'حسب الطريقة', headers: ['الطريقة', 'العدد', 'المبلغ'], rows: data.by_mode.map(m => [m.mode, m.count, m.total]) });
    if (data.daily.length > 0) sheets.push({ name: 'يومي', headers: ['التاريخ', 'العدد', 'المبلغ'], rows: data.daily.map(d => [d.date, d.count, d.amount]) });
    await exportToExcel(sheets.length > 0 ? sheets : [{ name: 'التدفقات', headers: ['البيان'], rows: [['لا توجد بيانات']] }], `التدفقات النقدية ${fromDate}-${toDate}`);
  };

  return <ReportShell title="التدفقات النقدية" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="cash-flow">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green" icon="ti-cash"         label="إجمالي التحصيل"     value={MONEY(data.summary.total_amount)}/>
          <KpiCard variant="blue"  icon="ti-receipt"      label="عدد الدفعات"         value={data.summary.count}/>
          <KpiCard variant="teal"  icon="ti-calculator"   label="متوسط الدفعة"        value={MONEY(data.summary.avg_amount)}/>
          <KpiCard variant="purple" icon="ti-calendar"    label="أيام بها حركات"       value={data.summary.days_with_movements}/>
        </div>
        {data.daily.length > 0 && (
          <Card title="التحصيل اليومي" titleIcon="ti-calendar-day" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>التاريخ</th><th className="num">العدد</th><th className="num">المبلغ</th></tr></thead>
                <tbody>
                  {data.daily.map((d) => (
                    <tr key={d.date}>
                      <td style={{ fontWeight: 700 }}>{d.date}</td>
                      <td className="num">{d.count}</td>
                      <td className="num">{MONEY(d.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td>الإجمالي ({data.daily.length} يوم)</td>
                    <td className="num">{data.daily.reduce((s, d) => s + d.count, 0)}</td>
                    <td className="num">{MONEY(data.summary.total_amount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
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
                <thead><tr><th>الطريقة</th><th className="num">العدد</th><th className="num">المبلغ</th><th className="num">النسبة</th></tr></thead>
                <tbody>
                  {data.by_mode.map((m, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{m.mode}</td>
                      <td className="num">{m.count}</td>
                      <td className="num">{MONEY(m.total)}</td>
                      <td className="num">{data.summary.total_amount > 0 ? ((m.total / data.summary.total_amount) * 100).toFixed(1) : 0}%</td>
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

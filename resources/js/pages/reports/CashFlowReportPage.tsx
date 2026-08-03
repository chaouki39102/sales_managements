import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT as _FMT, MONEY, PCT, REPORT_DEFAULTS } from './helpers';
import { useCashFlowReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

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

  const dailyData = data ? [
    ...data.daily,
    { __isSummary: true, date: `الإجمالي (${data.daily.length} يوم)`, count: data.daily.reduce((s, d) => s + d.count, 0), amount: data.summary.total_amount },
  ] : [];

  return <ReportShell title="التدفقات النقدية" subtitle={`حركة الإيرادات والمصروفات — ${fromDate} → ${toDate}`} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="cash-flow">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
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
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.date ?? '')}
              rowClassName={(row, _index) => (row as any).__isSummary ? 'tw-sr' : ''}
              columns={[
                { key: 'date', label: 'التاريخ', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'count', label: 'العدد', className: 'num' },
                { key: 'amount', label: 'المبلغ', className: 'num', render: (v) => MONEY(v as number) },
              ]}
              data={dailyData}
            />
          </Card>
        )}
        {data.monthly.length > 0 && (
          <Card title="الإيرادات الشهرية" titleIcon="ti-calendar" padding="sm" style={{ borderRadius: 12 }}>
            <SimpleTable
              rowKey={(row) => String(row.month ?? '')}
              columns={[
                { key: 'month', label: 'الشهر', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'count', label: 'العدد', className: 'num' },
                { key: 'amount', label: 'المبلغ', className: 'num', render: (v) => MONEY(v as number) },
              ]}
              data={data.monthly}
            />
          </Card>
        )}
        {data.by_mode.length > 0 && (
          <Card title="حسب طريقة الدفع" titleIcon="ti-wallet" padding="sm" style={{ borderRadius: 12 }}>
            <SimpleTable
              rowKey={(_row: any) => String((_row as any).mode ?? Math.random())}
              columns={[
                { key: 'mode', label: 'الطريقة', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'count', label: 'العدد', className: 'num' },
                { key: 'total', label: 'المبلغ', className: 'num', render: (v) => MONEY(v as number) },
                { key: 'pct', label: 'النسبة', className: 'num', render: (_v, row) => {
                  const m = row as any;
                  return data.summary.total_amount > 0 ? PCT((m.total / data.summary.total_amount) * 100) : '0%';
                }},
              ]}
              data={data.by_mode}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

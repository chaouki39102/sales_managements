import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { MONEY, REPORT_DEFAULTS } from './helpers';
import { useMonthlyReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

const MONTH_NAMES: Record<string, string> = {
  '01': 'جانفي', '02': 'فيفري', '03': 'مارس', '04': 'أفريل', '05': 'ماي', '06': 'جوان',
  '07': 'جويلية', '08': 'أوت', '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

function monthLabel(m: string): string {
  const [y, mm] = m.split('-');
  return `${MONTH_NAMES[mm] ?? mm} ${y}`;
}

export default function MonthlyReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useMonthlyReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'التقرير الشهري',
      headers: ['الشهر', 'المبيعات', 'المشتريات', 'الفرق'],
      rows: data.months.map((r) => [monthLabel(r.month), r.sales_ht, r.purchase_ht, r.diff]),
    }], `التقرير الشهري ${fromDate}-${toDate}`);
  };

  return (
    <ReportShell title="التقرير الشهري" subtitle={`مقارنة المبيعات والمشتريات شهراً بشهر — ${fromDate} → ${toDate}`} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="monthly">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      </div>
      {data && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard variant="blue"   icon="ti-calendar-month"  label="عدد الأشهر"        value={data.summary.months_count}/>
            <KpiCard variant="green"  icon="ti-trending-up"     label="إجمالي المبيعات"   value={MONEY(data.summary.total_sales)}/>
            <KpiCard variant="orange" icon="ti-trending-down"   label="إجمالي المشتريات"  value={MONEY(data.summary.total_purchase)}/>
            <KpiCard variant="teal"   icon="ti-scale"           label="الفرق (صافي)"      value={MONEY(data.summary.total_diff)}/>
          </div>
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <SimpleTable
              columns={[
                { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
                { key: 'month', label: 'الشهر', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{v as React.ReactNode}</span> : <span style={{ fontWeight: 700 }}>{v as React.ReactNode}</span> },
                { key: 'sales_ht', label: 'المبيعات', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{MONEY(Number(v ?? 0))}</span> : <span style={{ color: 'var(--em)', fontWeight: 700 }}>{MONEY(Number(v ?? 0))}</span> },
                { key: 'purchase_ht', label: 'المشتريات', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{MONEY(Number(v ?? 0))}</span> : <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{MONEY(Number(v ?? 0))}</span> },
                { key: 'diff', label: 'الفرق (صافي)', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{MONEY(Number(v ?? 0))}</span> : <span style={{ color: (Number(v) >= 0 ? 'var(--em)' : 'var(--red)'), fontWeight: 700 }}>{MONEY(Number(v ?? 0))}</span> },
              ]}
              data={[
                ...data.months.map((r, i) => ({ ...r, _idx: i + 1, month: monthLabel(r.month) })),
                { id: '__summary', _idx: null, month: `الإجمالي (${data.months.length} شهر)`, sales_ht: data.summary.total_sales, purchase_ht: data.summary.total_purchase, diff: data.summary.total_diff },
              ]}
              rowKey={(row) => String((row as { month: string }).month)}
            />
          </Card>
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)' }}>
            <i className="ti ti-info-circle"/> الفرق = المبيعات − المشتريات لكل شهر (مؤشر تقريبي للتدفق النقدي).
          </div>
        </>
      )}
    </ReportShell>
  );
}

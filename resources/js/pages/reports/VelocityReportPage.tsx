import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useVelocityReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = REPORT_DEFAULTS;

export default function VelocityReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useVelocityReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'سرعة البيع',
      headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'عدد الفواتير', 'السرعة/يوم', 'متوسط السعر'],
      rows: data.items.map((r, i) => [i + 1, r.product_name, r.product_ref, r.total_qty, r.doc_count, FMT(r.velocity), FMT(r.avg_price)]),
    }], `سرعة البيع ${fromDate}-${toDate}`);
  };

  return <ReportShell title="سرعة البيع" subtitle={`تحليل سرعة دوران المنتجات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="velocity">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="teal" icon="ti-package"   label="إجمالي الكمية المباعة" value={FMT(data.summary.total_qty)}/>
          <KpiCard variant="blue" icon="ti-file-text" label="عدد الوثائق"           value={data.summary.total_docs}/>
          <KpiCard variant="gold" icon="ti-calendar"  label="فترة التحليل (أيام)"   value={data.summary.period_days}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>عدد الفواتير</th><th>السرعة (يوم)</th><th>متوسط السعر</th></tr></thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{row.product_ref}</td>
                    <td>{FMT(row.total_qty)}</td>
                    <td>{row.doc_count}</td>
                    <td style={{ fontWeight: 700 }}>{FMT(row.velocity)}</td>
                    <td>{FMT(row.avg_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

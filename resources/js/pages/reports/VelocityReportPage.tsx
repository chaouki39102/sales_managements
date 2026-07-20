import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useVelocityReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function VelocityReportPage() {
  const { data, isLoading, isError, refetch } = useVelocityReport();
  return <ReportShell title="سرعة البيع" isLoading={isLoading} isError={isError} refetch={refetch} reportId="velocity">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="teal"  icon="ti-package"    label="إجمالي الكمية المباعة" value={FMT(data.summary.total_qty)}/>
          <KpiCard variant="blue"  icon="ti-file-text"  label="عدد الوثائق" value={data.summary.total_docs}/>
          <KpiCard variant="gold"  icon="ti-calendar"   label="فترة التحليل (أيام)" value={data.summary.period_days}/>
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
                    <td style={{ fontWeight: 700 }}>{row.velocity.toFixed(2)}</td>
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

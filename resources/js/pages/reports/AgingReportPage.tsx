import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useAgingReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function AgingReportPage() {
  const { data, isLoading, isError, refetch } = useAgingReport();
  return <ReportShell title="لوحة الديون" isLoading={isLoading} isError={isError} refetch={refetch} reportId="aging">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="red"  icon="ti-clock-hour-4" label="إجمالي الديون"  value={MONEY(data.summary.total_due)}/>
          <KpiCard variant="gold" icon="ti-file-text"    label="عدد الفواتير"   value={data.summary.total_count}/>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginTop: 8 }}>
          {data.buckets.map((b, i) => (
            <KpiCard key={i} variant={i === 3 ? 'red' : i === 2 ? 'gold' : i === 1 ? 'blue' : 'green'}
              icon="ti-calendar" label={b.label} value={MONEY(b.total)} unit="دج" subtitle={`${b.count} فاتورة`}/>
          ))}
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>الزبون</th><th>إجمالي المستحق</th><th>عدد الفواتير</th><th>أقدم (يوم)</th><th>التصنيف</th></tr></thead>
              <tbody>
                {data.rows.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.party_name}</td>
                    <td style={{ fontWeight: 700 }}>{FMT(row.total_due)}</td>
                    <td>{row.invoice_count}</td>
                    <td>{row.max_days}</td>
                    <td>
                      {row.bucket === '90_plus' ? <Badge variant="danger" noDot>أكثر من 90 يوم</Badge>
                        : row.bucket === '61_90' ? <Badge variant="warning" noDot>61–90 يوم</Badge>
                        : row.bucket === '31_60' ? <Badge variant="primary" noDot>31–60 يوم</Badge>
                        : <Badge variant="success" noDot>0–30 يوم</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                  <td colSpan={2}>الإجمالي</td>
                  <td>{FMT(data.summary.total_due)}</td>
                  <td>{data.summary.total_count}</td>
                  <td></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

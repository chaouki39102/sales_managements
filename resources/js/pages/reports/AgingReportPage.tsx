import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useAgingReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

export default function AgingReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useAgingReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([
      { name: 'التصنيفات', headers: ['التصنيف', 'المبلغ', 'العدد'], rows: data.buckets.map(b => [b.label, b.total, b.count]) },
      { name: 'التفاصيل', headers: ['#', 'الزبون', 'إجمالي المستحق', 'عدد الفواتير', 'أقدم (يوم)', 'التصنيف'], rows: data.rows.map((r, i) => [i + 1, r.party_name, r.total_due, r.invoice_count, r.max_days, r.bucket === '90_plus' ? 'أكثر من 90' : r.bucket === '61_90' ? '61-90' : r.bucket === '31_60' ? '31-60' : '0-30']) },
    ], `لوحة الديون ${fromDate}-${toDate}`);
  };

  return <ReportShell title="لوحة الديون" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="aging">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="red"  icon="ti-clock-hour-4" label="إجمالي الديون" value={MONEY(data.summary.total_due)}/>
          <KpiCard variant="gold" icon="ti-file-text"    label="عدد الفواتير"  value={data.summary.total_count}/>
        </div>
        {data.buckets.length > 0 && (
          <div className="kpis" style={{ gridTemplateColumns: `repeat(${data.buckets.length},1fr)`, marginTop: 8 }}>
            {data.buckets.map((b, i) => (
              <KpiCard key={i} variant={i === 3 ? 'red' : i === 2 ? 'gold' : i === 1 ? 'blue' : 'green'}
                icon="ti-calendar" label={b.label} value={MONEY(b.total)} unit="دج" sub={`${b.count} فاتورة`}/>
            ))}
          </div>
        )}
        {data.rows.length > 0 && (
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
                          : row.bucket === '31_60' ? <Badge variant="info" noDot>31–60 يوم</Badge>
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
                    <td></td><td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

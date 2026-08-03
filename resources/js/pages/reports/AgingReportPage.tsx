import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useAgingReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

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

  return <ReportShell title="لوحة الديون والمتأخرات" subtitle={`تحليل أعمار ديون الزبائن والموردين — ${fromDate} → ${toDate}`} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="aging">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
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
            <SimpleTable
              columns={[
                { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as number}</span> },
                { key: 'party_name', label: 'الزبون', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'total_due', label: 'إجمالي المستحق', render: (v) => <span style={{ fontWeight: 700 }}>{FMT(v as number)}</span> },
                { key: 'invoice_count', label: 'عدد الفواتير' },
                { key: 'max_days', label: 'أقدم (يوم)' },
                { key: 'bucket', label: 'التصنيف', render: (v) => {
                  const b = v as string;
                  return b === '90_plus' ? <Badge variant="danger" noDot>أكثر من 90 يوم</Badge>
                    : b === '61_90' ? <Badge variant="warning" noDot>61–90 يوم</Badge>
                    : b === '31_60' ? <Badge variant="info" noDot>31–60 يوم</Badge>
                    : <Badge variant="success" noDot>0–30 يوم</Badge>;
                }},
              ]}
              data={[
                ...data.rows.map((row, i) => ({ ...row, _idx: i + 1 })),
                { _isFooter: true, _idx: '', party_name: 'الإجمالي', total_due: data.summary.total_due, invoice_count: data.summary.total_count, max_days: '', bucket: '' },
              ]}
              rowKey={(row) => row._isFooter ? 'footer' : `row-${row._idx}`}
              rowClassName={(row, _index) => row._isFooter ? 'font-extrabold bg-2' : ''}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

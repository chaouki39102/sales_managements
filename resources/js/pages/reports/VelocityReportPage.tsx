import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY as _MONEY, REPORT_DEFAULTS } from './helpers';
import { useVelocityReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

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

  return <ReportShell title="سرعة البيع" subtitle={`تحليل سرعة دوران المنتجات — ${fromDate} → ${toDate}`} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="velocity">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="teal" icon="ti-package"   label="إجمالي الكمية المباعة" value={FMT(data.summary.total_qty)}/>
          <KpiCard variant="blue" icon="ti-file-text" label="عدد الوثائق"           value={data.summary.total_docs}/>
          <KpiCard variant="gold" icon="ti-calendar"  label="فترة التحليل (أيام)"   value={data.summary.period_days}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <SimpleTable
            columns={[
              { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as number}</span> },
              { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
              { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as string}</span> },
              { key: 'total_qty', label: 'الكمية', render: (v) => FMT(v as number) },
              { key: 'doc_count', label: 'عدد الفواتير' },
              { key: 'velocity', label: 'السرعة (يوم)', render: (v) => <span style={{ fontWeight: 700 }}>{FMT(v as number)}</span> },
              { key: 'avg_price', label: 'متوسط السعر', render: (v) => FMT(v as number) },
            ]}
            data={data.items.map((row, i) => ({ ...row, _idx: i + 1 }))}
            rowKey={(row) => `row-${row._idx}`}
          />
        </Card>
      </>
    )}
  </ReportShell>;
}

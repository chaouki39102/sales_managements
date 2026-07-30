import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useMarginReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function MarginReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useMarginReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'الهوامش',
      headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'إيراد HT', 'التكلفة', 'الهامش', 'النسبة %'],
      rows: data.items.map((r, i) => [i + 1, r.product_name, r.product_ref, r.total_qty, r.total_ht, r.cost_total, r.margin_amount, r.margin_pct]),
    }], `تقرير الهوامش ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الهوامش" subtitle={`هامش الربح والتكاليف — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="margin">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="إجمالي المبيعات" value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="blue"   icon="ti-trending-down" label="إجمالي التكلفة"  value={MONEY(data.summary.total_cost)}/>
          <KpiCard variant="gold"   icon="ti-coin"          label="إجمالي الهامش"   value={MONEY(data.summary.total_margin)}/>
          <KpiCard variant="purple" icon="ti-percentage"    label="نسبة الهامش"     value={`${data.summary.margin_pct}%`}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <SimpleTable
            columns={[
              { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as number}</span> },
              { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
              { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as string}</span> },
              { key: 'total_qty', label: 'الكمية' },
              { key: 'total_ht', label: 'الإيراد HT', render: (v) => FMT(v as number) },
              { key: 'cost_total', label: 'التكلفة', render: (v) => FMT(v as number) },
              { key: 'margin_amount', label: 'الهامش', render: (v, row) => {
                const val = v as number;
                return <span style={{ color: (row.margin_amount as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(val)}</span>;
              }},
              { key: 'margin_pct', label: '%', render: (v, row) => {
                const val = v as number;
                return <span style={{ color: (row.margin_pct as number) >= 0 ? 'var(--em)' : 'var(--red)' }}>{val}%</span>;
              }},
            ]}
            data={[
              ...data.items.map((row, i) => ({ ...row, _idx: i + 1 })),
              { _isFooter: true, _idx: '', product_name: `الإجمالي (${data.items.length} منتج)`, product_ref: '', total_qty: data.items.reduce((s, r) => s + r.total_qty, 0), total_ht: data.summary.total_ht, cost_total: data.summary.total_cost, margin_amount: data.summary.total_margin, margin_pct: data.summary.margin_pct },
            ]}
            rowKey={(row) => row._isFooter ? 'footer' : `row-${row._idx}`}
              rowClassName={(row, _index) => row._isFooter ? 'font-extrabold bg-2' : ''}
          />
        </Card>
      </>
    )}
  </ReportShell>;
}

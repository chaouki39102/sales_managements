import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useStockMovementsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function StockMovementsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useStockMovementsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });
  const d = data;

  const handleExport = async () => {
    if (!d || d.movements.length === 0) return;
    await exportToExcel([{
      name: 'حركات المخزون',
      headers: ['#', 'التاريخ', 'المنتج', 'المستودع', 'النوع', 'الاتجاه', 'الكمية', 'القيمة'],
      rows: d.movements.map((m, i) => [i + 1, m.movement_date, m.product_name, m.warehouse_name ?? '—', m.type_label ?? '—', m.direction === 1 ? 'وارد' : m.direction === -1 ? 'صادر' : 'تسوية', m.quantity, m.total_price] as (string | number)[]),
    }], `حركات المخزون ${fromDate}-${toDate}`);
  };

  return (
    <ReportShell title="حركات المخزون" subtitle={`واردات وصادرات المستودعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="stock-movements">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
        <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
      </div>
      {d && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard variant="green"  icon="ti-arrow-down"      label="وارد (كمية)"   value={FMT(d.summary.total_in)}/>
            <KpiCard variant="red"    icon="ti-arrow-up"        label="صادر (كمية)"    value={FMT(d.summary.total_out)}/>
            <KpiCard variant="gold"   icon="ti-adjustments"     label="تسويات"         value={FMT(d.summary.total_adjustment)}/>
            <KpiCard variant="blue"   icon="ti-arrows-exchange" label="إجمالي الحركات" value={d.summary.movement_count}/>
          </div>
          {d.movements.length > 0 && (
            <Card noHeader style={{ padding: 0, marginTop: 16 }}>
              <SimpleTable
                columns={[
                  { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
                  { key: 'movement_date', label: 'التاريخ' },
                  { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as React.ReactNode}</span> },
                  { key: 'warehouse_name', label: 'المستودع', render: (v) => (v as string) ?? '—' },
                  { key: 'type_label', label: 'النوع', render: (v) => (v as string) ?? '—' },
                  { key: '_direction', label: 'الاتجاه', render: (_v, row) => (
                    <Badge variant={row.direction === 1 ? 'success' : row.direction === -1 ? 'danger' : 'warning'} noDot>
                      {row.direction === 1 ? 'وارد' : row.direction === -1 ? 'صادر' : 'تسوية'}
                    </Badge>
                  )},
                  { key: 'quantity', label: 'الكمية', className: 'num', render: (v) => FMT(v as number) },
                  { key: 'total_price', label: 'القيمة', className: 'num', render: (v) => MONEY(v as number) },
                ]}
                data={d.movements.map((m, i) => ({ ...m, _idx: i + 1 }))}
                rowKey="id"
              />
            </Card>
          )}
        </>
      )}
    </ReportShell>
  );
}

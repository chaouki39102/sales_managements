import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useInventoryReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const STATUS_LABEL: Record<string, { text: string; variant: string }> = {
  out_of_stock: { text: 'نفد المخزون', variant: 'danger' },
  low_stock:    { text: 'مخزون منخفض', variant: 'warning' },
  in_stock:     { text: 'متوفر', variant: 'success' },
};

const def = REPORT_DEFAULTS;

export default function InventoryReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useInventoryReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'المخزون',
      headers: ['#', 'المنتج', 'المرجع', 'العائلة', 'الكمية', 'سعر الشراء HT', 'التكلفة', 'القيمة', 'الحالة'],
      rows: data.products.map((r, i) => [i + 1, r.name, r.ref, r.family ?? '—', r.stock_quantity, r.purchase_price_ht, r.current_cost_price, r.stock_value, STATUS_LABEL[r.status]?.text ?? r.status]),
    }], `تقرير المخزون ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير المخزون" subtitle={`أرصدة وحركة المنتجات في المستودعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="inventory">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="teal" icon="ti-building-warehouse" label="قيمة المخزون"  value={MONEY(data.summary.total_value)}/>
          <KpiCard variant="blue" icon="ti-package"            label="عدد المنتجات"  value={data.summary.total_products}/>
          <KpiCard variant="gold" icon="ti-alert-triangle"     label="مخزون منخفض"   value={data.summary.low_stock_count}/>
          <KpiCard variant="red"  icon="ti-package-off"        label="نفد المخزون"    value={data.summary.out_of_stock_count}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <SimpleTable
            columns={[
              { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as number}</span> },
              { key: 'name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
              { key: 'ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as string}</span> },
              { key: 'family', label: 'العائلة' },
              { key: 'stock_quantity', label: 'الكمية' },
              { key: 'purchase_price_ht', label: 'سعر الشراء HT', render: (v) => FMT(v as number) },
              { key: 'current_cost_price', label: 'التكلفة', render: (v) => FMT(v as number) },
              { key: 'stock_value', label: 'القيمة', render: (v) => FMT(v as number) },
              { key: 'status', label: 'الحالة', render: (v) => {
                const s = v as string;
                const info = STATUS_LABEL[s];
                return <Badge variant={(info?.variant ?? 'info') as 'danger' | 'warning' | 'success' | 'info'} noDot>{info?.text ?? s}</Badge>;
              }},
            ]}
            data={[
              ...data.products.map((row, i) => ({ ...row, _idx: i + 1, family: row.family ?? '—' })),
              { _isFooter: true, _idx: '', name: `الإجمالي (${data.products.length} منتج)`, ref: '', family: '', stock_quantity: data.products.reduce((s, r) => s + r.stock_quantity, 0), purchase_price_ht: '', current_cost_price: '', stock_value: data.summary.total_value, status: '' },
            ]}
            rowKey={(row: Record<string, unknown>) => {
              const r = row as Record<string, unknown>;
              return (r as any)._isFooter ? 'footer' : String((r as any).id ?? (r as any)._idx ?? '');
            }}
            rowClassName={(row, _index) => row._isFooter ? 'font-extrabold bg-2' : ''}
          />
        </Card>
      </>
    )}
  </ReportShell>;
}

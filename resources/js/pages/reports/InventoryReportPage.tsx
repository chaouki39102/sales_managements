import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useInventoryReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const STATUS_LABEL: Record<string, { text: string; variant: string }> = {
  out_of_stock: { text: 'نفد المخزون', variant: 'danger' },
  low_stock:    { text: 'مخزون منخفض', variant: 'warning' },
  in_stock:     { text: 'متوفر', variant: 'success' },
};

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

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
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>العائلة</th><th>الكمية</th><th>سعر الشراء HT</th><th>التكلفة</th><th>القيمة</th><th>الحالة</th></tr></thead>
              <tbody>
                {data.products.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.name}</td>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{row.ref}</td>
                    <td>{row.family ?? '—'}</td>
                    <td>{row.stock_quantity}</td>
                    <td>{FMT(row.purchase_price_ht)}</td>
                    <td>{FMT(row.current_cost_price)}</td>
                    <td>{FMT(row.stock_value)}</td>
                    <td><Badge variant={STATUS_LABEL[row.status]?.variant as 'danger' | 'warning' | 'success' ?? 'info'} noDot>{STATUS_LABEL[row.status]?.text ?? row.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                  <td colSpan={4}>الإجمالي ({data.products.length} منتج)</td>
                  <td>{data.products.reduce((s, r) => s + r.stock_quantity, 0)}</td>
                  <td></td><td></td>
                  <td>{FMT(data.summary.total_value)}</td>
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

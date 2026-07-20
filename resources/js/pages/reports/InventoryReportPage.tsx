import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useInventoryReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

const STATUS_LABEL: Record<string, { text: string; variant: string }> = {
  out_of_stock: { text: 'نفد المخزون', variant: 'danger' },
  low_stock:    { text: 'مخزون منخفض', variant: 'warning' },
  in_stock:     { text: 'متوفر', variant: 'success' },
};

export default function InventoryReportPage() {
  const { data, isLoading, isError, refetch } = useInventoryReport();
  return <ReportShell title="تقرير المخزون" isLoading={isLoading} isError={isError} refetch={refetch} reportId="inventory">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="teal"  icon="ti-building-warehouse" label="قيمة المخزون"   value={MONEY(data.summary.total_value)}/>
          <KpiCard variant="blue"  icon="ti-package"            label="عدد المنتجات"   value={data.summary.total_products}/>
          <KpiCard variant="gold"  icon="ti-alert-triangle"     label="مخزون منخفض"    value={data.summary.low_stock_count}/>
          <KpiCard variant="red"   icon="ti-package-off"        label="نفد المخزون"     value={data.summary.out_of_stock_count}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>العائلة</th><th>الكمية</th><th>سعر الشراء HT</th><th>الcost</th><th>القيمة</th><th>الحالة</th></tr></thead>
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
                  <td></td>
                  <td></td>
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

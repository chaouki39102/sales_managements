import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useProductsReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function ProductsReportPage() {
  const { data, isLoading, isError, refetch } = useProductsReport();
  return <ReportShell title="تقرير المنتجات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="products">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="teal"  icon="ti-building-warehouse" label="قيمة المخزون"   value={MONEY(data.summary.total_stock_value)}/>
          <KpiCard variant="green" icon="ti-package"            label="عدد المنتجات"   value={data.summary.total_products}/>
          <KpiCard variant="blue"  icon="ti-shopping-cart"      label="إجمالي المباع"  value={data.summary.total_sold}/>
          <KpiCard variant="purple" icon="ti-trending-up"       label="إجمالي المبيعات HT" value={MONEY(data.summary.total_sales_ht)}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>العائلة</th><th>المخزون</th><th>الcost</th><th>المباع</th><th>المبيعات HT</th><th>الهامش</th><th>%</th></tr></thead>
              <tbody>
                {data.products.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.name}</td>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{row.ref}</td>
                    <td>{row.family ?? '—'}</td>
                    <td>{row.stock_quantity}</td>
                    <td>{FMT(row.sales_cost)}</td>
                    <td>{row.total_sold}</td>
                    <td>{FMT(row.sales_ht)}</td>
                    <td style={{ color: row.margin_value >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(row.margin_value)}</td>
                    <td style={{ color: row.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>{row.margin_pct}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                  <td colSpan={5}>الإجمالي ({data.products.length} منتج)</td>
                  <td></td>
                  <td>{data.products.reduce((s, r) => s + r.total_sold, 0)}</td>
                  <td>{FMT(data.summary.total_sales_ht)}</td>
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

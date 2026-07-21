import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useProductsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = REPORT_DEFAULTS;

export default function ProductsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useProductsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'المنتجات',
      headers: ['#', 'المنتج', 'المرجع', 'العائلة', 'المخزون', 'التكلفة', 'المباع', 'المبيعات HT', 'الهامش', 'النسبة %'],
      rows: data.products.map((r, i) => [i + 1, r.name, r.ref, r.family ?? '—', r.stock_quantity, r.sales_cost, r.total_sold, r.sales_ht, r.margin_value, r.margin_pct]),
    }], `تقرير المنتجات ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير المنتجات" subtitle={`أداء المنتجات والمبيعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="products">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="teal"   icon="ti-building-warehouse" label="قيمة المخزون"      value={MONEY(data.summary.total_stock_value)}/>
          <KpiCard variant="green"  icon="ti-package"            label="عدد المنتجات"      value={data.summary.total_products}/>
          <KpiCard variant="blue"   icon="ti-shopping-cart"      label="إجمالي المباع"     value={data.summary.total_sold}/>
          <KpiCard variant="purple" icon="ti-trending-up"        label="إجمالي المبيعات HT" value={MONEY(data.summary.total_sales_ht)}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>العائلة</th><th>المخزون</th><th>التكلفة</th><th>المباع</th><th>المبيعات HT</th><th>الهامش</th><th>%</th></tr></thead>
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
                  <td>{FMT(data.products.reduce((s, r) => s + r.sales_cost, 0))}</td>
                  <td>{data.products.reduce((s, r) => s + r.total_sold, 0)}</td>
                  <td>{FMT(data.summary.total_sales_ht)}</td>
                  <td>{FMT(data.products.reduce((s, r) => s + r.margin_value, 0))}</td>
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

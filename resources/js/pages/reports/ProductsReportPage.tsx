import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useProductsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

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
          <SimpleTable
            columns={[
              { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v}</span> },
              { key: 'name', label: 'المنتج', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{v}</span> : <span style={{ fontWeight: 700 }}>{v}</span> },
              { key: 'ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v}</span> },
              { key: 'family', label: 'العائلة' },
              { key: 'stock_quantity', label: 'المخزون', className: 'num' },
              { key: 'sales_cost', label: 'التكلفة', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : FMT(v as number) },
              { key: 'total_sold', label: 'المباع', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{v}</span> : v },
              { key: 'sales_ht', label: 'المبيعات HT', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : FMT(v as number) },
              { key: 'margin_value', label: 'الهامش', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(v as number)}</span> },
              { key: 'margin_pct', label: '%', render: (v, row) => row.id === '__summary' ? null : <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)' }}>{v}%</span> },
            ]}
            data={[
              ...data.products.map((r, i) => ({ ...r, _idx: i + 1 })),
              { id: '__summary', _idx: null, name: `الإجمالي (${data.products.length} منتج)`, ref: '', family: '', stock_quantity: '', sales_cost: data.products.reduce((s, r) => s + r.sales_cost, 0), total_sold: data.products.reduce((s, r) => s + r.total_sold, 0), sales_ht: data.summary.total_sales_ht, margin_value: data.products.reduce((s, r) => s + r.margin_value, 0), margin_pct: '' },
            ]}
            rowKey="id"
          />
        </Card>
      </>
    )}
  </ReportShell>;
}

import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useProductMovementReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function ProductMovementPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useProductMovementReport({ from_date: fromDate || undefined, to_date: toDate || undefined });
  const d = data;

  const handleExport = async () => {
    if (!d || d.items.length === 0) return;
    await exportToExcel([{
      name: 'حركة المنتجات',
      headers: ['#', 'المنتج', 'المرجع', 'كمية المبيعات', 'قيمة المبيعات HT', 'كمية المشتريات', 'قيمة المشتريات HT', 'الصافي'],
      rows: d.items.map((item, i) => [i + 1, item.product_name, item.product_ref, item.sales_qty, item.sales_ht, item.purchase_qty, item.purchase_ht, item.net_qty]),
    }], `حركة المنتجات ${fromDate}-${toDate}`);
  };

  return (
    <ReportShell title="حركة المنتجات" subtitle={`تتبع تنقلات المنتجات بين المستودعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="product-movement">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
        <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
      </div>
      {d && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard label="المنتجات" value={d.summary.total_products} icon="ti-package" variant="blue" />
            <KpiCard label="إجمالي المبيعات (Units)" value={FMT(d.summary.total_sales_qty)} icon="ti-trending-up" variant="green" />
            <KpiCard label="إجمالي المشتريات (Units)" value={FMT(d.summary.total_purchase_qty)} icon="ti-trending-down" variant="orange" />
            <KpiCard label="صافي الوحدات" value={FMT(d.summary.total_sales_qty - d.summary.total_purchase_qty)} icon="ti-arrows-exchange" variant="purple" />
          </div>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <KpiCard label="المبيعات (HT)" value={MONEY(d.summary.total_sales_ht)} icon="ti-cash" variant="green" />
            <KpiCard label="المشتريات (HT)" value={MONEY(d.summary.total_purchase_ht)} icon="ti-cash" variant="orange" />
            <KpiCard label="صافي القيمة HT" value={MONEY(d.summary.total_sales_ht - d.summary.total_purchase_ht)} icon="ti-chart-line" variant="teal" />
          </div>
          {d.items.length > 0 && (
            <Card title={`حركة المنتجات (${d.items.length})`} titleIcon="ti-arrows-exchange" padding="sm" style={{ borderRadius: 12 }}>
              <SimpleTable
                columns={[
                  { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ fontWeight: 600 }}>{v as React.ReactNode}</span> },
                  { key: 'product_name', label: 'المنتج' },
                  { key: 'sales_qty', label: 'كمية المبيعات', className: 'num', render: (v) => FMT(v as number) },
                  { key: 'sales_ht', label: 'قيمة المبيعات HT', className: 'num', render: (v) => FMT(v as number) },
                  { key: 'purchase_qty', label: 'كمية المشتريات', className: 'num', render: (v) => FMT(v as number) },
                  { key: 'purchase_ht', label: 'قيمة المشتريات HT', className: 'num', render: (v) => FMT(v as number) },
                  { key: 'net_qty', label: 'الصافي (Units)', className: 'num', render: (v) => {
                    const n = v as number;
                    return <span style={{ fontWeight: 700, color: n > 0 ? 'var(--em)' : n < 0 ? 'var(--red)' : undefined }}>{n > 0 ? '+' : ''}{FMT(n)}</span>;
                  }},
                ]}
                data={d.items as unknown as Record<string, unknown>[]}
                rowKey="product_id"
              />
            </Card>
          )}
        </>
      )}
    </ReportShell>
  );
}

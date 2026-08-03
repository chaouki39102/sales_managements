import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useProductsReport, useProductHistory, type ProductHistoryItem } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import SimpleTable from '@/components/ui/SimpleTable';
import Modal from '@/components/ui/Modal';

const def = REPORT_DEFAULTS;

const STATUS_META: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' }> = {
  good:         { label: 'جيد',                variant: 'success' },
  reorder:      { label: '⚠ أعد الطلب',        variant: 'warning' },
  out_of_stock: { label: 'نفد',                variant: 'danger' },
};

export default function ProductsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useProductsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const [historyProduct, setHistoryProduct] = useState<{ id: number; name: string; ref: string } | null>(null);
  const { data: historyData, isLoading: historyLoading } = useProductHistory(historyProduct
    ? { product_id: historyProduct.id, from_date: fromDate || undefined, to_date: toDate || undefined }
    : undefined);

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'المنتجات',
      headers: ['#', 'المنتج', 'المرجع', 'العائلة', 'كمية المشتريات', 'قيمة المشتريات', 'متوسط سعر الشراء', 'كمية المباع', 'قيمة المبيعات', 'تكلفة البضاعة', 'الربح المقدر', 'الهامش %', 'المخزون الحالي', 'الحالة'],
      rows: data.products.map((r, i) => [i + 1, r.name, r.ref, r.family ?? '—', r.qty_bought, r.purchase_ht, r.avg_purchase_price, r.total_sold, r.sales_ht, r.cogs_estimated, r.est_profit, r.profit_pct, r.stock_quantity, STATUS_META[r.stock_status]?.label ?? r.stock_status]),
    }], `تقرير المنتجات ${fromDate}-${toDate}`);
  };

  const historyItems = (historyData?.items ?? []) as (ProductHistoryItem & { _idx?: number })[];

  return <ReportShell title="تقرير المنتجات" subtitle={`أداء المنتجات والمبيعات والمشتريات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="products">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="teal"   icon="ti-building-warehouse" label="قيمة المخزون"        value={MONEY(data.summary.total_stock_value)}/>
          <KpiCard variant="green"  icon="ti-package"            label="عدد المنتجات"        value={data.summary.total_products}/>
          <KpiCard variant="blue"   icon="ti-shopping-cart"      label="إجمالي المباع"       value={data.summary.total_sold}/>
          <KpiCard variant="purple" icon="ti-trending-up"        label="إجمالي المبيعات HT"  value={MONEY(data.summary.total_sales_ht)}/>
          <KpiCard variant="orange" icon="ti-truck"              label="قيمة المشتريات"      value={MONEY(data.summary.total_purchase_ht)}/>
          <KpiCard variant="green"  icon="ti-coins"              label="الربح المقدر"        value={MONEY(data.summary.total_est_profit)}/>
          <KpiCard variant="gold"   icon="ti-percentage"         label="هامش الربح %"        value={`${data.summary.margin_pct}%`}/>
          <KpiCard variant="red"    icon="ti-alert-triangle"     label="تحتاج إعادة طلب"     value={data.summary.reorder_count}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <SimpleTable
            columns={[
              { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
              { key: 'name', label: 'المنتج', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{v as React.ReactNode}</span> : <span style={{ fontWeight: 700 }}>{v as React.ReactNode}</span> },
              { key: 'ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
              { key: 'family', label: 'العائلة' },
              { key: 'qty_bought', label: 'كمية المشتريات', className: 'num' },
              { key: 'purchase_ht', label: 'قيمة المشتريات', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : FMT(v as number) },
              { key: 'avg_purchase_price', label: 'متوسط سعر الشراء', className: 'num', render: (v) => FMT(Number(v ?? 0)) },
              { key: 'total_sold', label: 'كمية المباع', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{v as React.ReactNode}</span> : v as React.ReactNode },
              { key: 'sales_ht', label: 'قيمة المبيعات', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : FMT(v as number) },
              { key: 'cogs_estimated', label: 'تكلفة البضاعة', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : FMT(v as number) },
              { key: 'est_profit', label: 'الربح المقدر', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(v as number)}</span> },
              { key: 'profit_pct', label: 'الهامش %', render: (v, row) => row.id === '__summary' ? null : <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)' }}>{v as React.ReactNode}%</span> },
              { key: 'stock_quantity', label: 'المخزون', className: 'num' },
              { key: 'stock_status', label: 'الحالة', render: (v, row) => row.id === '__summary' ? null : <Badge variant={STATUS_META[(v as string)]?.variant ?? 'gray'} noDot>{STATUS_META[(v as string)]?.label ?? (v as string)}</Badge> },
              { key: '_action', label: '', render: (_v, row) => row.id === '__summary' ? null : (
                <button
                  onClick={(e) => { e.stopPropagation(); setHistoryProduct({ id: row.id as number, name: row.name as string, ref: row.ref as string }); }}
                  style={{ padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border, var(--color-border-tertiary))', background: 'transparent', color: 'var(--em)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <i className="ti ti-history" style={{ fontSize: 13 }} />
                  الحركة
                </button>
              )},
            ]}
            data={[
              ...data.products.map((r, i) => ({ ...r, _idx: i + 1 })),
              { id: '__summary', _idx: null, name: `الإجمالي (${data.products.length} منتج)`, ref: '', family: '', qty_bought: data.summary.total_qty_bought, purchase_ht: data.summary.total_purchase_ht, avg_purchase_price: '', total_sold: data.summary.total_sold, sales_ht: data.summary.total_sales_ht, cogs_estimated: data.summary.total_cogs, est_profit: data.summary.total_est_profit, profit_pct: `${data.summary.margin_pct}%`, stock_quantity: '', stock_status: '' },
            ]}
            rowKey="id"
          />
        </Card>
      </>
    )}

    <Modal
      open={!!historyProduct}
      onClose={() => setHistoryProduct(null)}
      size="lg"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span>سجل حركة المنتج</span>
          {historyProduct && (
            <>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{historyProduct.name}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400, fontFamily: 'monospace' }}>{historyProduct.ref}</span>
            </>
          )}
        </div>
      }
      footer={<Button onClick={() => setHistoryProduct(null)}>إغلاق</Button>}
    >
      {historyLoading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 8 }}>جاري التحميل...</div>
        </div>
      ) : historyItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
          <i className="ti ti-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
          لا توجد وثائق لهذا المنتج في الفترة المحددة
        </div>
      ) : (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 12 }}>
            <KpiCard variant="blue"   icon="ti-file-invoice" label="عدد الوثائق"  value={historyData?.summary.doc_count ?? 0}/>
            <KpiCard variant="teal"   icon="ti-package"      label="الكمية الصافية" value={historyData?.summary.total_qty ?? 0}/>
            <KpiCard variant="green"  icon="ti-trending-up" label="الإجمالي HT"    value={MONEY(historyData?.summary.total_ht ?? 0)}/>
            <KpiCard variant="purple" icon="ti-calculator"   label="الإجمالي TTC"   value={MONEY(historyData?.summary.total_ttc ?? 0)}/>
          </div>
          <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
            <SimpleTable
              columns={[
                { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{v as React.ReactNode}</span> },
                { key: 'document_date', label: 'التاريخ', render: (v) => <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{v as React.ReactNode}</span> },
                { key: 'document_number', label: 'المرجع', render: (v, row) => {
                  const code = (row as unknown as ProductHistoryItem).type_code;
                  return <span style={{ fontFamily: 'monospace', fontSize: 12, color: code === 'AV' || code === 'AA' ? 'var(--red)' : 'var(--blue)' }}>{v as React.ReactNode}</span>;
                }},
                { key: 'type_name', label: 'النوع', render: (v, row) => {
                  const code = (row as unknown as ProductHistoryItem).type_code;
                  return <Badge variant={code === 'AV' || code === 'AA' ? 'danger' : (code === 'FV' || code === 'POS' ? 'success' : 'warning')} noDot>{v as React.ReactNode}</Badge>;
                }},
                { key: 'party_name', label: 'الطرف', render: (v) => <span>{v as React.ReactNode}</span> },
                { key: 'quantity', label: 'الكمية', className: 'num', render: (v) => <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 600 }}>{v as React.ReactNode}</span> },
                { key: 'total_ht', label: 'HT', className: 'num', render: (v) => FMT(v as number) },
                { key: 'total_tva', label: 'TVA', className: 'num', render: (v) => FMT(v as number) },
                { key: 'total_ttc', label: 'TTC', className: 'num', render: (v) => <span style={{ fontWeight: 700 }}>{FMT(v as number)}</span> },
              ]}
              data={historyItems.map((r, i) => ({ ...r, _idx: i + 1 }))}
              rowKey="id"
            />
          </div>
        </>
      )}
    </Modal>
  </ReportShell>;
}

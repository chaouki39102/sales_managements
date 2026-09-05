import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS, ReportLinesDetail } from './helpers';
import { useSalesReport } from '@/lib/api/endpoints/reports';
import { useMyPermissions } from '@/lib/api/endpoints/roles';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

export default function SalesReportPage() {
  const [fromDate, setFromDate] = useState(REPORT_DEFAULTS.from);
  const [toDate, setToDate] = useState(REPORT_DEFAULTS.to);
  const [tab, setTab] = useState<'docs' | 'products'>('docs');
  const { data, isLoading, isError, refetch } = useSalesReport({ from_date: fromDate || undefined, to_date: toDate || undefined });
  const { data: myPermissions } = useMyPermissions();
  const canViewCost = !!myPermissions?.includes('view_cost_price');

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    sheets.push({
      name: 'الوثائق',
      headers: ['#', 'رقم الوثيقة', 'التاريخ', 'الزبون', 'HT', 'TVA', 'الخصم', 'TTC', 'المدفوع', 'المتبقي', ...(canViewCost ? ['التكلفة', 'الهامش'] : []), 'الحالة'],
      rows: data.documents.map((doc, i) => [
        i + 1, doc.document_number, doc.date, doc.party_name ?? '—',
        doc.total_ht, doc.total_tva, doc.total_discount,
        doc.total_ttc, doc.paid_amount, doc.remaining_amount,
        ...(canViewCost ? [doc.doc_cost_ht, doc.margin_value] : []),
        doc.remaining_amount > 0.01 ? 'غير مسددة' : 'مسددة',
      ]),
    });
    if (data.product_recap.length > 0) {
      sheets.push({
        name: 'ملخص المنتجات',
        headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'م.الوحدة', 'HT', 'الخصم', ...(canViewCost ? ['التكلفة', 'الهامش'] : []), 'TTC', ...(canViewCost ? ['%'] : [])],
        rows: data.product_recap.map((item, i) => [
          i + 1, item.product_name, item.product_ref, item.total_qty,
          item.total_qty > 0 ? Math.round((item.total_ht + item.total_discount) / item.total_qty) : 0,
          item.total_ht, item.total_discount,
          ...(canViewCost ? [item.total_cost, item.margin_value] : []),
          item.total_ttc, ...(canViewCost ? [`${item.margin_pct}%`] : []),
        ]),
      });
    }
    await exportToExcel(sheets, `report-exports/تقرير المبيعات ${fromDate ?? 'الكل'}-${toDate ?? 'الكل'}`);
  };

  const docsData = data ? [
    ...data.documents.map((doc, i) => ({ ...doc, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.summary.count})`, total_ht: data.summary.total_ht, total_tva: data.summary.total_tva, total_discount: data.summary.total_discount, doc_cost_ht: data.summary.total_cost, margin_value: data.summary.total_margin, total_ttc: data.summary.total_ttc, paid_amount: data.summary.total_paid, remaining_amount: data.summary.total_remaining },
  ] : [];

  const productsData = data ? [
    ...data.product_recap.map((item, i) => ({
      ...item,
      _idx: i + 1,
      unit_price: item.total_qty > 0 ? Math.round((item.total_ht + item.total_discount) / item.total_qty) : null,
    })),
    { __isSummary: true, _idx: `الإجمالي (${data.product_recap.length} منتج)`, unit_price: null, total_ht: data.summary.total_ht, total_discount: data.summary.total_discount, total_cost: data.summary.total_cost, margin_value: data.summary.total_margin, total_ttc: data.summary.total_ttc, margin_pct: data.summary.margin_pct },
  ] : [];

  const summaryRow = () => 'tw-sr';

  return <ReportShell title="تقرير المبيعات" subtitle={fromDate && toDate ? `المبيعات والمستندات — ${fromDate} → ${toDate}` : 'المبيعات — سنة مالية كاملة'} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="sales">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: canViewCost ? 'repeat(7,1fr)' : 'repeat(5,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="إجمالي HT"      value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="blue"   icon="ti-receipt"       label="إجمالي TTC"     value={MONEY(data.summary.total_ttc)}/>
          <KpiCard variant="orange" icon="ti-discount"      label="الخصومات"       value={MONEY(data.summary.total_discount)}/>
          {canViewCost && <>
            <KpiCard variant="teal"   icon="ti-trending-down"  label="التكلفة"       value={MONEY(data.summary.total_cost)}/>
            <KpiCard variant="gold"   icon="ti-coin"          label="الهامش"         value={MONEY(data.summary.total_margin)} sub={`${data.summary.margin_pct}%`}/>
          </>}
          <KpiCard variant="purple" icon="ti-file-text"     label="الوثائق"        value={data.summary.count}/>
          <KpiCard variant="red"    icon="ti-clock"         label="غير مسددة"      value={data.summary.unpaid_count} sub={`${MONEY(data.summary.total_remaining)}`}/>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px' }}>
          <Button size="xs" variant={tab === 'docs' ? 'primary' : 'ghost'} onClick={() => setTab('docs')}>الوثائق ({data.summary.count})</Button>
          <Button size="xs" variant={tab === 'products' ? 'primary' : 'ghost'} onClick={() => setTab('products')}>ملخص المنتجات ({data.product_recap.length})</Button>
        </div>
        {tab === 'docs' && (
          <Card noHeader style={{ padding: 0 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.id ?? '')}
              rowClassName={summaryRow}
              expandable={(row) => !(row as any).__isSummary && Array.isArray(row.lines) && row.lines.length > 0}
              renderExpanded={(row) => <ReportLinesDetail lines={row.lines} />}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'document_number', label: 'الوثيقة', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'date', label: 'التاريخ' },
                { key: 'party_name', label: 'الزبون', render: (v) => (v as string) ?? '—' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_tva', label: 'TVA', render: (v) => FMT(v as number) },
                { key: 'total_discount', label: 'الخصم', render: (v, _row) => (v as number) > 0 ? <span style={{ color: 'var(--orange)' }}>{FMT(v as number)}</span> : '—' },
                ...(canViewCost ? [
                  { key: 'doc_cost_ht', label: 'التكلفة', render: (v: unknown) => FMT(v as number) },
                  { key: 'margin_value', label: 'الهامش', render: (v: unknown) => <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(v as number)}</span> },
                ] : []),
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
                { key: 'paid_amount', label: 'المدفوع', render: (v) => <span style={{ color: 'var(--em)' }}>{FMT(v as number)}</span> },
                { key: 'remaining_amount', label: 'المتبقي', render: (v) => <span style={{ color: (v as number) > 0 ? 'var(--red)' : 'var(--t4)', fontWeight: (v as number) > 0 ? 700 : 400 }}>{FMT(v as number)}</span> },
                { key: 'status', label: 'الحالة', render: (_v, row) => {
                  const doc = row as any;
                  return doc.status === 'Annulé' ? <Badge variant="danger" noDot>ملغاة</Badge> : doc.remaining_amount > 0.01 ? <Badge variant="warning" noDot>غير مسددة</Badge> : <Badge variant="success" noDot>مسددة</Badge>;
                }},
              ]}
              data={docsData}
            />
          </Card>
        )}
        {tab === 'products' && (
          <Card noHeader style={{ padding: 0 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.product_id ?? '')}
              rowClassName={summaryRow}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as string}</span> },
                { key: 'total_qty', label: 'الكمية' },
                { key: 'unit_price', label: 'م.الوحدة', render: (v) => v != null ? FMT(v as number) : '—' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_discount', label: 'الخصم', render: (v) => (v as number) > 0 ? <span style={{ color: 'var(--orange)' }}>{FMT(v as number)}</span> : '—' },
                ...(canViewCost ? [
                  { key: 'total_cost', label: 'التكلفة', render: (v: unknown) => FMT(v as number) },
                  { key: 'margin_value', label: 'الهامش', render: (v: unknown) => <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(v as number)}</span> },
                ] : []),
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
                ...(canViewCost ? [{ key: 'margin_pct', label: '%', render: (v: unknown) => <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)' }}>{v as React.ReactNode}%</span> }] : []),
              ]}
              data={productsData}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS, ReportLinesDetail } from './helpers';
import { usePurchasesReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function PurchasesReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const [tab, setTab] = useState<'docs' | 'products'>('docs');
  const { data, isLoading, isError, refetch } = usePurchasesReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [{
      name: 'الوثائق',
      headers: ['#', 'رقم الوثيقة', 'التاريخ', 'المورد', 'HT', 'TVA', 'TTC', 'المدفوع', 'المتبقي', 'الحالة'],
      rows: data.documents.map((doc, i) => [
        i + 1, doc.document_number, doc.date, doc.party_name ?? '—',
        doc.total_ht, doc.total_tva, doc.total_ttc, doc.paid_amount, doc.remaining_amount,
        doc.remaining_amount > 0.01 ? 'غير مسددة' : 'مسددة',
      ]),
    }];
    if (data.product_recap.length > 0) {
    sheets.push({
      name: 'ملخص المنتجات',
      headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'HT', 'الخصم', 'TVA', 'TTC'],
      rows: data.product_recap.map((item, i) => [
        i + 1, item.product_name, item.product_ref, item.total_qty,
        item.total_ht, item.total_discount, item.total_tva, item.total_ttc,
      ]),
      });
    }
    await exportToExcel(sheets, `تقرير المشتريات ${fromDate}-${toDate}`);
  };

  const docsData = data ? [
    ...data.documents.map((doc, i) => ({ ...doc, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.summary.count})`, total_ht: data.summary.total_ht, total_tva: data.summary.total_tva, total_discount: data.summary.total_discount, total_ttc: data.summary.total_ttc, paid_amount: data.summary.total_paid, remaining_amount: data.summary.total_remaining },
  ] : [];

  const productsData = data ? [
    ...data.product_recap.map((item, i) => ({ ...item, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.product_recap.length} منتج)`, total_qty: data.product_recap.reduce((s, r) => s + r.total_qty, 0), total_ht: data.summary.total_ht, total_discount: data.summary.total_discount, total_tva: data.summary.total_tva, total_ttc: data.summary.total_ttc },
  ] : [];

  return <ReportShell title="تقرير المشتريات" subtitle={`المشتريات والموردون — ${fromDate} → ${toDate}`} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="purchases">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(7,1fr)' }}>
          <KpiCard variant="blue"   icon="ti-trending-down"  label="إجمالي HT"       value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="green"  icon="ti-receipt"        label="إجمالي TTC"      value={MONEY(data.summary.total_ttc)}/>
          <KpiCard variant="orange" icon="ti-discount"       label="الخصومات"        value={MONEY(data.summary.total_discount)}/>
          <KpiCard variant="blue"   icon="ti-arrow-up-circle" label="المدفوع"        value={MONEY(data.summary.total_paid)}/>
          <KpiCard variant="red"    icon="ti-clock"          label="المتبقي"         value={MONEY(data.summary.total_remaining)}/>
          <KpiCard variant="purple" icon="ti-file-text"      label="الوثائق"         value={data.summary.count}/>
          <KpiCard variant="gold"   icon="ti-alert-triangle" label="غير مسددة"       value={data.summary.unpaid_count}/>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px' }}>
          <Button size="xs" variant={tab === 'docs' ? 'primary' : 'ghost'} onClick={() => setTab('docs')}>الوثائق ({data.summary.count})</Button>
          <Button size="xs" variant={tab === 'products' ? 'primary' : 'ghost'} onClick={() => setTab('products')}>ملخص المنتجات ({data.product_recap.length})</Button>
        </div>
        {tab === 'docs' && (
          <Card noHeader style={{ padding: 0 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.id ?? '')}
              rowClassName={(row, _index) => (row as any).__isSummary ? 'tw-sr' : ''}
              expandable={(row) => !(row as any).__isSummary && Array.isArray(row.lines) && row.lines.length > 0}
              renderExpanded={(row) => <ReportLinesDetail lines={row.lines} />}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'document_number', label: 'الوثيقة', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'date', label: 'التاريخ' },
                { key: 'party_name', label: 'المورد', render: (v) => (v as string) ?? '—' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_tva', label: 'TVA', render: (v) => FMT(v as number) },
                { key: 'total_discount', label: 'الخصم', render: (v) => (v as number) > 0 ? <span style={{ color: 'var(--orange)' }}>{FMT(v as number)}</span> : '—' },
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
                { key: 'paid_amount', label: 'المدفوع', render: (v) => <span style={{ color: 'var(--em)' }}>{FMT(v as number)}</span> },
                { key: 'remaining_amount', label: 'المتبقي', render: (v) => <span style={{ color: (v as number) > 0 ? 'var(--red)' : 'var(--t4)', fontWeight: (v as number) > 0 ? 700 : 400 }}>{FMT(v as number)}</span> },
                { key: 'status', label: 'الحالة', render: (_v, row) => {
                  const doc = row as any;
                  return doc.remaining_amount > 0.01 ? <Badge variant="warning" noDot>غير مسددة</Badge> : <Badge variant="success" noDot>مسددة</Badge>;
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
              rowClassName={(row, _index) => (row as any).__isSummary ? 'tw-sr' : ''}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as string}</span> },
                { key: 'total_qty', label: 'الكمية' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_discount', label: 'الخصم', render: (v) => (v as number) > 0 ? <span style={{ color: 'var(--orange)' }}>{FMT(v as number)}</span> : '—' },
                { key: 'total_tva', label: 'TVA', render: (v) => FMT(v as number) },
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
              ]}
              data={productsData}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

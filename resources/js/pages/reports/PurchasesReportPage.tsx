import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { usePurchasesReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

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

  return <ReportShell title="تقرير المشتريات" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="purchases">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
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
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>الوثيقة</th><th>التاريخ</th><th>المورد</th><th>HT</th><th>TVA</th><th>الخصم</th><th>TTC</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
                <tbody>
                  {data.documents.map((doc, i) => (
                    <tr key={doc.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{doc.document_number}</td>
                      <td>{doc.date}</td>
                      <td>{doc.party_name ?? '—'}</td>
                      <td>{FMT(doc.total_ht)}</td>
                      <td>{FMT(doc.total_tva)}</td>
                      <td style={{ color: doc.total_discount > 0 ? 'var(--orange)' : undefined }}>{doc.total_discount > 0 ? FMT(doc.total_discount) : '—'}</td>
                      <td>{FMT(doc.total_ttc)}</td>
                      <td style={{ color: 'var(--em)' }}>{FMT(doc.paid_amount)}</td>
                      <td style={{ color: doc.remaining_amount > 0 ? 'var(--red)' : 'var(--t4)', fontWeight: doc.remaining_amount > 0 ? 700 : 400 }}>{FMT(doc.remaining_amount)}</td>
                      <td>{doc.remaining_amount > 0.01 ? <Badge variant="warning" noDot>غير مسددة</Badge> : <Badge variant="success" noDot>مسددة</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={4}>الإجمالي ({data.summary.count})</td>
                    <td>{FMT(data.summary.total_ht)}</td>
                    <td>{FMT(data.summary.total_tva)}</td>
                    <td style={{ color: data.summary.total_discount > 0 ? 'var(--orange)' : undefined }}>{data.summary.total_discount > 0 ? FMT(data.summary.total_discount) : '—'}</td>
                    <td>{FMT(data.summary.total_ttc)}</td>
                    <td style={{ color: 'var(--em)' }}>{FMT(data.summary.total_paid)}</td>
                    <td style={{ color: data.summary.total_remaining > 0 ? 'var(--red)' : undefined }}>{FMT(data.summary.total_remaining)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
        {tab === 'products' && (
          <Card noHeader style={{ padding: 0 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>HT</th><th>الخصم</th><th>TVA</th><th>TTC</th></tr></thead>
                <tbody>
                  {data.product_recap.map((item, i) => (
                    <tr key={item.product_id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{item.product_name}</td>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{item.product_ref}</td>
                      <td>{item.total_qty}</td>
                      <td>{FMT(item.total_ht)}</td>
                      <td style={{ color: item.total_discount > 0 ? 'var(--orange)' : undefined }}>{item.total_discount > 0 ? FMT(item.total_discount) : '—'}</td>
                      <td>{FMT(item.total_tva)}</td>
                      <td>{FMT(item.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={3}>الإجمالي ({data.product_recap.length} منتج)</td>
                    <td>{data.product_recap.reduce((s, r) => s + r.total_qty, 0)}</td>
                    <td>{FMT(data.summary.total_ht)}</td>
                    <td style={{ color: data.summary.total_discount > 0 ? 'var(--orange)' : undefined }}>{data.summary.total_discount > 0 ? FMT(data.summary.total_discount) : '—'}</td>
                    <td>{FMT(data.summary.total_tva)}</td>
                    <td>{FMT(data.summary.total_ttc)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

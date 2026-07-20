import React, { useState } from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { usePurchasesReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function PurchasesReportPage() {
  const { data, isLoading, isError, refetch } = usePurchasesReport();
  const [tab, setTab] = useState<'docs' | 'products'>('docs');

  return <ReportShell title="تقرير المشتريات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="purchases">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          <KpiCard variant="blue"   icon="ti-trending-down" label="إجمالي HT"     value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="green"  icon="ti-receipt"       label="إجمالي TTC"    value={MONEY(data.summary.total_ttc)}/>
          <KpiCard variant="blue"   icon="ti-arrow-up-circle" label="المدفوع"     value={MONEY(data.summary.total_paid)}/>
          <KpiCard variant="red"    icon="ti-clock"         label="المتبقي"       value={MONEY(data.summary.total_remaining)}/>
          <KpiCard variant="purple" icon="ti-file-text"     label="الوثائق"       value={data.summary.count}/>
          <KpiCard variant="gold"   icon="ti-alert-triangle" label="غير مسددة"   value={data.summary.unpaid_count}/>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px' }}>
          <Button size="xs" variant={tab === 'docs' ? 'primary' : 'ghost'} onClick={() => setTab('docs')}>الوثائق ({data.summary.count})</Button>
          <Button size="xs" variant={tab === 'products' ? 'primary' : 'ghost'} onClick={() => setTab('products')}>ملخص المنتجات ({data.product_recap.length})</Button>
        </div>
        {tab === 'docs' && (
          <Card noHeader style={{ padding: 0 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>الوثيقة</th><th>التاريخ</th><th>المورد</th><th>HT</th><th>TVA</th><th>TTC</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
                <tbody>
                  {data.documents.map((doc, i) => (
                    <tr key={doc.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{doc.document_number}</td>
                      <td>{doc.date}</td>
                      <td>{doc.party_name ?? '—'}</td>
                      <td>{FMT(doc.total_ht)}</td>
                      <td>{FMT(doc.total_tva)}</td>
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
                <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>HT</th><th>TTC</th></tr></thead>
                <tbody>
                  {data.product_recap.map((item, i) => (
                    <tr key={item.product_id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{item.product_name}</td>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{item.product_ref}</td>
                      <td>{item.total_qty}</td>
                      <td>{FMT(item.total_ht)}</td>
                      <td>{FMT(item.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={3}>الإجمالي ({data.product_recap.length} منتج)</td>
                    <td>{data.product_recap.reduce((s, r) => s + r.total_qty, 0)}</td>
                    <td>{FMT(data.summary.total_ht)}</td>
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

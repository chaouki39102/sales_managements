import React, { useState } from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useSalesReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function SalesReportPage() {
  const { data, isLoading, isError, refetch } = useSalesReport();
  const [tab, setTab] = useState<'docs' | 'products'>('docs');

  return <ReportShell title="تقرير المبيعات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="sales">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="إجمالي HT"     value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="blue"   icon="ti-receipt"       label="إجمالي TTC"    value={MONEY(data.summary.total_ttc)}/>
          <KpiCard variant="teal"   icon="ti-trending-down"  label="التكلفة"       value={MONEY(data.summary.total_cost)}/>
          <KpiCard variant="gold"   icon="ti-coin"          label="الهامش"        value={MONEY(data.summary.total_margin)} sub={`${data.summary.margin_pct}%`}/>
          <KpiCard variant="purple" icon="ti-file-text"     label="الوثائق"       value={data.summary.count}/>
          <KpiCard variant="red"    icon="ti-clock"         label="غير مسددة"     value={data.summary.unpaid_count} sub={`${MONEY(data.summary.total_remaining)}`}/>
        </div>
        <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px' }}>
          <Button size="xs" variant={tab === 'docs' ? 'primary' : 'ghost'} onClick={() => setTab('docs')}>الوثائق ({data.summary.count})</Button>
          <Button size="xs" variant={tab === 'products' ? 'primary' : 'ghost'} onClick={() => setTab('products')}>ملخص المنتجات ({data.product_recap.length})</Button>
        </div>
        {tab === 'docs' && (
          <Card noHeader style={{ padding: 0 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>الوثيقة</th><th>التاريخ</th><th>الزبون</th><th>HT</th><th>التكلفة</th><th>الهامش</th><th>TTC</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead>
                <tbody>
                  {data.documents.map((doc, i) => (
                    <tr key={doc.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{doc.document_number}</td>
                      <td>{doc.date}</td>
                      <td>{doc.party_name ?? '—'}</td>
                      <td>{FMT(doc.total_ht)}</td>
                      <td>{FMT(doc.doc_cost_ht)}</td>
                      <td style={{ color: doc.margin_value >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(doc.margin_value)}</td>
                      <td>{FMT(doc.total_ttc)}</td>
                      <td style={{ color: 'var(--em)' }}>{FMT(doc.paid_amount)}</td>
                      <td style={{ color: doc.remaining_amount > 0 ? 'var(--red)' : 'var(--t4)', fontWeight: doc.remaining_amount > 0 ? 700 : 400 }}>{FMT(doc.remaining_amount)}</td>
                      <td>{doc.status === 'Annulé' ? <Badge variant="danger" noDot>ملغاة</Badge> : doc.remaining_amount > 0.01 ? <Badge variant="warning" noDot>غير مسددة</Badge> : <Badge variant="success" noDot>مسددة</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={4}>الإجمالي ({data.summary.count})</td>
                    <td>{FMT(data.summary.total_ht)}</td>
                    <td>{FMT(data.summary.total_cost)}</td>
                    <td style={{ color: data.summary.total_margin >= 0 ? 'var(--em)' : 'var(--red)' }}>{FMT(data.summary.total_margin)}</td>
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
                <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>م.الوحدة</th><th>HT</th><th>الخصم</th><th>التكلفة</th><th>الهامش</th><th>TTC</th><th>%</th></tr></thead>
                <tbody>
                  {data.product_recap.map((item, i) => (
                    <tr key={item.product_id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{item.product_name}</td>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{item.product_ref}</td>
                      <td>{item.total_qty}</td>
                      <td>{item.total_qty > 0 ? FMT(Math.round((item.total_ht + item.total_discount) / item.total_qty)) : '—'}</td>
                      <td>{FMT(item.total_ht)}</td>
                      <td style={{ color: item.total_discount > 0 ? 'var(--orange)' : undefined }}>{item.total_discount > 0 ? FMT(item.total_discount) : '—'}</td>
                      <td>{FMT(item.total_cost)}</td>
                      <td style={{ color: item.margin_value >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(item.margin_value)}</td>
                      <td>{FMT(item.total_ttc)}</td>
                      <td style={{ color: item.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>{item.margin_pct}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={3}>الإجمالي ({data.product_recap.length} منتج)</td>
                    <td>{data.product_recap.reduce((s, r) => s + r.total_qty, 0)}</td>
                    <td>{FMT(data.summary.total_ht)}</td>
                    <td>{FMT(data.summary.total_cost)}</td>
                    <td style={{ color: data.summary.total_margin >= 0 ? 'var(--em)' : 'var(--red)' }}>{FMT(data.summary.total_margin)}</td>
                    <td>{FMT(data.summary.total_ttc)}</td>
                    <td style={{ color: data.summary.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>{data.summary.margin_pct}%</td>
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

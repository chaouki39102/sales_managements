import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useReturnsReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function ReturnsReportPage() {
  const { data, isLoading, isError, refetch } = useReturnsReport();
  return <ReportShell title="تقرير الإرجاعات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="returns">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="red"   icon="ti-rotate-left"   label="إجمالي الإرجاعات" value={data.summary.total_returns}/>
          <KpiCard variant="orange" icon="ti-trending-up"  label="إرجاعات البيع"     value={data.summary.sale_returns} sub={MONEY(data.summary.sale_returns_ht)}/>
          <KpiCard variant="blue"  icon="ti-trending-down" label="إرجاعات الشراء"   value={data.summary.purchase_returns} sub={MONEY(data.summary.purchase_returns_ht)}/>
          <KpiCard variant="gold"  icon="ti-cash"          label="القيمة الإجمالية"  value={MONEY(data.summary.total_ht)}/>
        </div>
        {data.documents.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>رقم الوثيقة</th><th>النوع</th><th>التاريخ</th><th>العميل/المورد</th><th>HT</th><th>TTC</th></tr></thead>
                <tbody>
                  {data.documents.map((doc, i) => (
                    <tr key={doc.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{doc.document_number}</td>
                      <td><Badge>{doc.document_type}</Badge></td>
                      <td>{doc.date}</td>
                      <td>{doc.party_name ?? '—'}</td>
                      <td>{FMT(doc.total_ht)}</td>
                      <td>{FMT(doc.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data.product_recap.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>HT</th><th>TTC</th></tr></thead>
                <tbody>
                  {data.product_recap.map((p, i) => (
                    <tr key={p.product_id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{p.product_name}</td>
                      <td>{p.product_ref}</td>
                      <td>{p.total_qty}</td>
                      <td>{FMT(p.total_ht)}</td>
                      <td>{FMT(p.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data.documents.length === 0 && (
          <div className="empty" style={{ padding: 40 }}>
            <div className="empty-ic"><i className="ti ti-rotate-left"/></div>
            <div className="empty-tx">لا توجد إرجاعات في هذه الفترة</div>
          </div>
        )}
      </>
    )}
  </ReportShell>;
}

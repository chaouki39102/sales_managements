import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { usePaymentsReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function PaymentsReportPage() {
  const { data, isLoading, isError, refetch } = usePaymentsReport();
  return <ReportShell title="تقرير الدفعات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="payments">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="green" icon="ti-cash"       label="إجمالي الدفعات"   value={MONEY(data.summary.total_amount)}/>
          <KpiCard variant="blue"  icon="ti-hash"       label="عدد الدفعات"      value={data.summary.count}/>
        </div>
        {data.by_mode.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>طريقة الدفع</th><th>الإجمالي</th><th>العدد</th></tr></thead>
                <tbody>
                  {data.by_mode.map((row, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{row.mode ?? 'غير محدد'}</td>
                      <td>{FMT(row.total)}</td>
                      <td>{row.count}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={2}>الإجمالي ({data.by_mode.length} طريقة)</td>
                    <td>{FMT(data.summary.total_amount)}</td>
                    <td>{data.summary.count}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
        {data.payments.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>العميل/المورد</th><th>الوثيقة</th><th>الحالة</th></tr></thead>
                <tbody>
                  {data.payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td>{p.payment_date}</td>
                      <td style={{ fontWeight: 700 }}>{FMT(p.amount)}</td>
                      <td>{(p as any).payment_mode ?? '—'}</td>
                      <td>{(p as any).party_name ?? '—'}</td>
                      <td>{(p as any).document_number ?? '—'}</td>
                      <td><span className={`badge badge-${p.status === 'confirmed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}`}>{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

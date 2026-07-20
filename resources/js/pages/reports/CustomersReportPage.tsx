import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useCustomersReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function CustomersReportPage() {
  const { data, isLoading, isError, refetch } = useCustomersReport();
  return <ReportShell title="تقرير الزبائن" isLoading={isLoading} isError={isError} refetch={refetch} reportId="customers">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="blue"  icon="ti-users"        label="عدد الزبائن"      value={data.summary.total_customers}/>
          <KpiCard variant="red"   icon="ti-trending-up"  label="إجمالي المتبقي"   value={MONEY(data.summary.total_remaining)}/>
          <KpiCard variant="green" icon="ti-trending-up"  label="إجمالي المبيعات HT" value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="teal"  icon="ti-trending-up"  label="إجمالي المبيعات TTC" value={MONEY(data.summary.total_ttc)}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead>
                <tr><th>#</th><th>الاسم</th><th>الكود</th><th>الهاتف</th><th>الولاية</th><th>عدد الوثائق</th><th>المبيعات HT</th><th>المدفوع</th><th>المتبقي</th></tr>
              </thead>
              <tbody>
                {data.customers.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.name}</td>
                    <td style={{ color: 'var(--t4)' }}>{row.code ?? '—'}</td>
                    <td>{row.phone ?? '—'}</td>
                    <td>{row.wilaya ?? '—'}</td>
                    <td>{row.doc_count}</td>
                    <td>{FMT(row.total_ht)}</td>
                    <td style={{ color: 'var(--em)' }}>{FMT(row.total_paid)}</td>
                    <td style={{ color: row.total_remaining > 0 ? 'var(--red)' : 'var(--em)', fontWeight: 700 }}>{FMT(row.total_remaining)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                  <td colSpan={5}>الإجمالي ({data.customers.length})</td>
                  <td>{data.customers.reduce((s, r) => s + r.doc_count, 0)}</td>
                  <td>{FMT(data.customers.reduce((s, r) => s + r.total_ht, 0))}</td>
                  <td style={{ color: 'var(--em)' }}>{FMT(data.customers.reduce((s, r) => s + r.total_paid, 0))}</td>
                  <td style={{ color: 'var(--red)' }}>{FMT(data.summary.total_remaining)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

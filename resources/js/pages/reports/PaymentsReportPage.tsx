import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { usePaymentsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

export default function PaymentsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = usePaymentsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    sheets.push({ name: 'حسب طريقة الدفع', headers: ['طريقة الدفع', 'العدد', 'المبلغ'], rows: data.by_mode.map(r => [r.mode ?? 'غير محدد', r.count, r.total]) });
    if (data.payments.length > 0) {
      sheets.push({ name: 'التفاصيل', headers: ['#', 'التاريخ', 'المبلغ', 'طريقة الدفع', 'العميل/المورد', 'الوثيقة', 'المرجع', 'الحالة'], rows: data.payments.map((p, i) => [i + 1, p.payment_date, p.amount, p.payment_mode ?? '—', p.party_name ?? '—', p.document_number ?? '—', p.reference ?? '—', p.status]) });
    }
    await exportToExcel(sheets, `تقرير الدفعات ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الدفعات" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="payments">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="green" icon="ti-cash"  label="إجمالي الدفعات" value={MONEY(data.summary.total_amount)}/>
          <KpiCard variant="blue"  icon="ti-hash"  label="عدد الدفعات"   value={data.summary.count}/>
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
                <thead><tr><th>#</th><th>التاريخ</th><th>المبلغ</th><th>طريقة الدفع</th><th>العميل/المورد</th><th>الوثيقة</th><th>المرجع</th><th>الحالة</th></tr></thead>
                <tbody>
                  {data.payments.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td>{p.payment_date}</td>
                      <td style={{ fontWeight: 700 }}>{FMT(p.amount)}</td>
                      <td>{p.payment_mode ?? '—'}</td>
                      <td>{p.party_name ?? '—'}</td>
                      <td>{p.document_number ?? '—'}</td>
                      <td style={{ color: 'var(--t4)' }}>{p.reference ?? '—'}</td>
                      <td><Badge variant={p.status === 'confirmed' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'} noDot>{p.status}</Badge></td>
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

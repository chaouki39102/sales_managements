import React, { useState } from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useDailyReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

export default function DailyReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const { data, isLoading, isError, refetch } = useDailyReport({ date });
  const d = data;

  const handleExport = async () => {
    if (!d || d.documents.length === 0) return;
    await exportToExcel([{
      name: 'الوثائق',
      headers: ['رقم الوثيقة', 'النوع', 'العميل/المورد', 'HT', 'TVA', 'TTC', 'الحالة'],
      rows: d.documents.map(doc => [doc.document_number, doc.document_type, doc.party_name ?? '—', doc.total_ht, doc.total_tva, doc.total_ttc, doc.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع']),
    }], `التقرير اليومي ${date}`);
  };

  return (
    <ReportShell title="التقرير اليومي" subtitle={d?.date ? `يوم ${d.date} — حركة المبيعات والمدفوعات` : undefined} isLoading={isLoading} isError={isError} refetch={refetch} reportId="daily">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>التاريخ:</span>
        <input type="date" className="form-control" style={{ width: 200 }} value={date} onChange={(e) => setDate(e.target.value)} />
        <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
      </div>
      {d && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard label="إجمالي الوثائق" value={d.summary.total_docs} icon="ti-file" variant="blue" />
            <KpiCard label="المبيعات (HT)" value={MONEY(d.summary.sales_ht)} icon="ti-trending-up" variant="green" />
            <KpiCard label="المشتريات (HT)" value={MONEY(d.summary.purchases_ht)} icon="ti-trending-down" variant="orange" />
            <KpiCard label="المدفوعات المحصلة" value={MONEY(d.summary.payments_received)} icon="ti-cash" variant="gold" />
          </div>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard label="فواتير البيع" value={d.summary.sales_count} icon="ti-receipt" variant="green" />
            <KpiCard label="فواتير الشراء" value={d.summary.purchases_count} icon="ti-receipt" variant="orange" />
            <KpiCard label="المبيعات (TTC)" value={MONEY(d.summary.sales_ttc)} icon="ti-trending-up" variant="green" />
            <KpiCard label="عدد الدفعات" value={d.summary.payment_count} icon="ti-credit-card" variant="purple" />
          </div>
          {d.documents.length > 0 && (
            <Card title={`الوثائق (${d.documents.length})`} titleIcon="ti-file-text" padding="sm" style={{ borderRadius: 12 }}>
              <div className="tw">
                <table>
                  <thead><tr><th>رقم الوثيقة</th><th>النوع</th><th>العميل/المورد</th><th className="num">HT</th><th className="num">TVA</th><th className="num">TTC</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {d.documents.map((doc) => (
                      <tr key={doc.id}>
                        <td><span style={{ fontWeight: 600 }}>{doc.document_number}</span></td>
                        <td><Badge>{doc.document_type}</Badge></td>
                        <td>{doc.party_name ?? '—'}</td>
                        <td className="num">{FMT(doc.total_ht)}</td>
                        <td className="num">{FMT(doc.total_tva)}</td>
                        <td className="num">{FMT(doc.total_ttc)}</td>
                        <td><Badge variant={doc.payment_status === 'paid' ? 'success' : 'warning'} noDot>{doc.payment_status === 'paid' ? 'مدفوع' : 'غير مدفوع'}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </ReportShell>
  );
}

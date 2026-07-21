import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useReturnsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const def = REPORT_DEFAULTS;

export default function ReturnsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useReturnsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    if (data.documents.length > 0) {
      sheets.push({ name: 'الوثائق', headers: ['#', 'رقم الوثيقة', 'النوع', 'التاريخ', 'العميل/المورد', 'HT', 'TTC', 'السبب'], rows: data.documents.map((d, i) => [i + 1, d.document_number, d.document_type, d.date, d.party_name ?? '—', d.total_ht, d.total_ttc, d.reason ?? '—']) });
    }
    if (data.product_recap.length > 0) {
      sheets.push({ name: 'ملخص المنتجات', headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'HT', 'TTC'], rows: data.product_recap.map((p, i) => [i + 1, p.product_name, p.product_ref, p.total_qty, p.total_ht, p.total_ttc]) });
    }
    await exportToExcel(sheets.length > 0 ? sheets : [{ name: 'الإرجاعات', headers: ['البيان'], rows: [['لا توجد إرجاعات']] }], `تقرير الإرجاعات ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الإرجاعات" subtitle={`مرتجعات المبيعات والمشتريات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="returns">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
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
                <thead><tr><th>#</th><th>رقم الوثيقة</th><th>النوع</th><th>التاريخ</th><th>العميل/المورد</th><th>HT</th><th>TTC</th><th>السبب</th></tr></thead>
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
                      <td style={{ color: 'var(--t4)' }}>{doc.reason ?? '—'}</td>
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
      </>
    )}
  </ReportShell>;
}

import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useSalesTrendReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = REPORT_DEFAULTS;

export default function SalesTrendReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useSalesTrendReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    if (data.by_type.length > 0) sheets.push({ name: 'حسب النوع', headers: ['النوع', 'العدد', 'HT', 'TTC'], rows: data.by_type.map(t => [t.code, t.count, t.total_ht, t.total_ttc]) });
    if (data.monthly.length > 0) sheets.push({ name: 'شهري', headers: ['الشهر', 'العدد', 'HT', 'TTC'], rows: data.monthly.map(m => [m.month, m.count, m.total_ht, m.total_ttc]) });
    if (data.weekly.length > 0) sheets.push({ name: 'أسبوعي', headers: ['الأسبوع', 'العدد', 'HT', 'TTC'], rows: data.weekly.map(w => [w.week, w.count, w.total_ht, w.total_ttc]) });
    if (data.daily.length > 0) sheets.push({ name: 'يومي', headers: ['التاريخ', 'العدد', 'HT', 'TTC'], rows: data.daily.map(d => [d.date, d.count, d.total_ht, d.total_ttc]) });
    await exportToExcel(sheets.length > 0 ? sheets : [{ name: 'الاتجاهات', headers: ['البيان'], rows: [['لا توجد بيانات']] }], `اتجاهات المبيعات ${fromDate}-${toDate}`);
  };

  return <ReportShell title="اتجاهات المبيعات" subtitle={`تطور المبيعات الشهرية — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="sales-trend">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          <KpiCard variant="green"  icon="ti-receipt"     label="عدد الوثائق"     value={data.summary.total_docs}/>
          <KpiCard variant="blue"   icon="ti-trending-up" label="إجمالي HT"       value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="teal"   icon="ti-cash"        label="متوسط HT/فاتورة" value={MONEY(data.summary.avg_ht)}/>
          <KpiCard variant="gold"   icon="ti-calendar"    label="أيام بها مبيعات"  value={data.summary.days_with_sales}/>
          <KpiCard variant="purple" icon="ti-file-text"   label="إجمالي TTC"      value={MONEY(data.summary.total_ttc)}/>
        </div>
        {data.by_type.length > 0 && (
          <Card title="حسب نوع الوثيقة" titleIcon="ti-file-text" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>النوع</th><th className="num">العدد</th><th className="num">HT</th><th className="num">TTC</th></tr></thead>
                <tbody>
                  {data.by_type.map((t) => (
                    <tr key={t.code}>
                      <td style={{ fontWeight: 700 }}>{t.code}</td>
                      <td className="num">{t.count}</td>
                      <td className="num">{MONEY(t.total_ht)}</td>
                      <td className="num">{MONEY(t.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data.monthly.length > 0 && (
          <Card title="التطور الشهري" titleIcon="ti-chart-line" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>الشهر</th><th className="num">العدد</th><th className="num">HT</th><th className="num">TTC</th></tr></thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 700 }}>{m.month}</td>
                      <td className="num">{m.count}</td>
                      <td className="num">{MONEY(m.total_ht)}</td>
                      <td className="num">{MONEY(m.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data.weekly.length > 0 && (
          <Card title="التطور الأسبوعي" titleIcon="ti-calendar" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>الأسبوع</th><th className="num">العدد</th><th className="num">HT</th><th className="num">TTC</th></tr></thead>
                <tbody>
                  {data.weekly.map((w) => (
                    <tr key={w.week}>
                      <td style={{ fontWeight: 700 }}>{w.week}</td>
                      <td className="num">{w.count}</td>
                      <td className="num">{MONEY(w.total_ht)}</td>
                      <td className="num">{MONEY(w.total_ttc)}</td>
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

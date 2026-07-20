import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useExpensesReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

export default function ExpensesReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useExpensesReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    if (data.by_category.length > 0) {
      sheets.push({ name: 'حسب الفئة', headers: ['الفئة', 'العدد', 'المبلغ', 'النسبة'], rows: data.by_category.map(c => [c.category_name ?? 'غير مصنف', c.count, c.total, data.summary.total_expenses > 0 ? `${((c.total / data.summary.total_expenses) * 100).toFixed(1)}%` : '0%']) });
    }
    if (data.expenses.length > 0) {
      sheets.push({ name: 'التفاصيل', headers: ['#', 'رقم', 'التاريخ', 'المبلغ', 'الفئة', 'الوصف'], rows: data.expenses.map((e, i) => [i + 1, e.expense_number, e.date, e.amount, e.category_name ?? '—', e.description ?? '—']) });
    }
    await exportToExcel(sheets.length > 0 ? sheets : [{ name: 'المصروفات', headers: ['البيان'], rows: [['لا توجد بيانات']] }], `تقرير المصروفات ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير المصروفات" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="expenses">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="red"  icon="ti-wallet"  label="إجمالي المصروفات" value={MONEY(data.summary.total_expenses)}/>
          <KpiCard variant="blue" icon="ti-hash"    label="عدد المصروفات"   value={data.summary.count}/>
        </div>
        {data.by_category.length > 0 && (
          <Card title="حسب الفئة" titleIcon="ti-category" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>الفئة</th><th className="num">العدد</th><th className="num">المبلغ</th><th className="num">النسبة</th></tr></thead>
                <tbody>
                  {data.by_category.map((c, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{c.category_name}</td>
                      <td className="num">{c.count}</td>
                      <td className="num">{MONEY(c.total)}</td>
                      <td className="num">{data.summary.total_expenses > 0 ? ((c.total / data.summary.total_expenses) * 100).toFixed(1) : 0}%</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td>الإجمالي ({data.by_category.length} فئة)</td>
                    <td className="num">{data.summary.count}</td>
                    <td className="num">{MONEY(data.summary.total_expenses)}</td>
                    <td className="num">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
        {data.monthly.length > 0 && (
          <Card title="التطور الشهري" titleIcon="ti-chart-line" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>الشهر</th><th className="num">العدد</th><th className="num">المبلغ</th></tr></thead>
                <tbody>
                  {data.monthly.map((m) => (
                    <tr key={m.month}>
                      <td style={{ fontWeight: 700 }}>{m.month}</td>
                      <td className="num">{m.count}</td>
                      <td className="num">{MONEY(m.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data.expenses.length > 0 && (
          <Card title="تفاصيل المصروفات" titleIcon="ti-list" padding="sm" style={{ borderRadius: 12 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>رقم</th><th>التاريخ</th><th>المبلغ</th><th>الفئة</th><th>الوصف</th></tr></thead>
                <tbody>
                  {data.expenses.map((e, i) => (
                    <tr key={e.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td>{e.expense_number}</td>
                      <td>{e.date}</td>
                      <td className="num" style={{ fontWeight: 700 }}>{MONEY(e.amount)}</td>
                      <td>{e.category_name ?? '—'}</td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={3}>الإجمالي ({data.expenses.length})</td>
                    <td className="num">{MONEY(data.summary.total_expenses)}</td>
                    <td></td><td></td>
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

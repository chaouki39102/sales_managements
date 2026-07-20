import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useExpensesReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function ExpensesReportPage() {
  const { data, isLoading, isError, refetch } = useExpensesReport();
  return <ReportShell title="تقرير المصروفات" isLoading={isLoading} isError={isError} refetch={refetch} reportId="expenses">
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
                  {data.expenses.slice(0, 50).map((e, i) => (
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
              </table>
            </div>
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

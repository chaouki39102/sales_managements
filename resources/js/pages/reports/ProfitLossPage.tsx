import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useProfitLossReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function ProfitLossPage() {
  const { data, isLoading, isError, refetch } = useProfitLossReport();
  const d = data;

  const handleExport = async () => {
    if (!d) return;
    const sheets = [
      { name: 'نظرة عامة', headers: ['البيان', 'المبلغ'], rows: [
        ['المبيعات HT', d.revenue.sales_ht], ['المبيعات TVA', d.revenue.sales_tva],
        ['المبيعات TTC', d.revenue.sales_ttc], ['تكلفة البضاعة المباعة', d.revenue.sales_cost],
        ['الهامش الإجمالي', d.revenue.gross_margin], ['نسبة الهامش', `${d.revenue.gross_margin_pct}%`],
        ['---', '---'],
        ['المشتريات HT', d.purchases.purchase_ht], ['ضريبة المشتريات', d.purchases.purchase_tva],
        ['---', '---'],
        ['إجمالي المصروفات', d.expenses.total_expenses],
        ['---', '---'],
        ['صافي الربح/الخسارة', d.result.net_result],
      ]},
    ];
    if (d.expenses.by_category.length > 0) {
      sheets.push({ name: 'المصروفات حسب الفئة', headers: ['الفئة', 'المبلغ'], rows: d.expenses.by_category.map(c => [c.category_name ?? 'غير مصنف', c.total]) });
    }
    await exportToExcel(sheets, 'تقرير الأرباح والخسائر');
  };

  return (
    <ReportShell title="الأرباح والخسائر" subtitle="تقرير شامل للمبيعات والتكاليف والمصروفات والأرباح" isLoading={isLoading} isError={isError} refetch={refetch} reportId="profit-loss">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 4 }}>
        <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
      </div>
      {d && (
        <>
          <Card title="الإيرادات" titleIcon="ti-trending-up" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <KpiCard label="المبيعات HT" value={MONEY(d.revenue.sales_ht)} icon="ti-cash" variant="blue" />
              <KpiCard label="الضريبة TVA" value={MONEY(d.revenue.sales_tva)} icon="ti-calculator" variant="purple" />
              <KpiCard label="المبيعات TTC" value={MONEY(d.revenue.sales_ttc)} icon="ti-cash" variant="teal" />
              <KpiCard label="تكلفة البضاعة المباعة" value={MONEY(d.revenue.sales_cost)} icon="ti-package" variant="orange" />
            </div>
          </Card>
          <Card title="الهامش الإجمالي" titleIcon="ti-coin" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="الهامش الإجمالي" value={MONEY(d.revenue.gross_margin)} icon="ti-coin" variant={d.revenue.gross_margin >= 0 ? 'green' : 'red'} />
              <KpiCard label="نسبة الهامش" value={`${d.revenue.gross_margin_pct}%`} icon="ti-chart-line" variant={d.revenue.gross_margin_pct >= 0 ? 'green' : 'red'} />
            </div>
          </Card>
          <Card title="المشتريات والمصروفات" titleIcon="ti-trending-down" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="المشتريات HT" value={MONEY(d.purchases.purchase_ht)} icon="ti-trending-down" variant="orange" />
              <KpiCard label="ضريبة المشتريات" value={MONEY(d.purchases.purchase_tva)} icon="ti-calculator" variant="purple" />
            </div>
            <div className="kpis" style={{ gridTemplateColumns: '1fr', marginTop: 8 }}>
              <KpiCard label="إجمالي المصروفات" value={MONEY(d.expenses.total_expenses)} icon="ti-wallet" variant="red" />
            </div>
            {d.expenses.by_category.length > 0 && (
              <div className="tw" style={{ marginTop: 12 }}>
                <table>
                  <thead><tr><th>الفئة</th><th className="num">المبلغ</th></tr></thead>
                  <tbody>
                    {d.expenses.by_category.map((cat, i) => (
                      <tr key={i}>
                        <td>{cat.category_name ?? 'غير مصنف'}</td>
                        <td className="num">{FMT(cat.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
          <Card title="النتيجة النهائية" titleIcon="ti-chart-line" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="الهامش الإجمالي" value={MONEY(d.result.gross_margin)} icon="ti-coin" variant={d.result.gross_margin >= 0 ? 'green' : 'red'} />
              <KpiCard label="صافي الربح/الخسارة" value={MONEY(d.result.net_result)} icon={d.result.net_result >= 0 ? 'ti-mood-happy' : 'ti-mood-sad'} variant={d.result.net_result >= 0 ? 'green' : 'red'} />
            </div>
            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: d.result.net_result >= 0 ? 'var(--em-bg)' : 'var(--red-bg)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: d.result.net_result >= 0 ? 'var(--em)' : 'var(--red)' }}>
                {d.result.net_result >= 0 ? 'النتيجة صافية — ربح' : 'النتيجة صافية — خسارة'}
              </div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                الهامش الإجمالي ({FMT(d.revenue.gross_margin)}) − المصروفات ({FMT(d.expenses.total_expenses)}) = صافي ({MONEY(d.result.net_result)})
              </div>
            </div>
          </Card>
        </>
      )}
    </ReportShell>
  );
}

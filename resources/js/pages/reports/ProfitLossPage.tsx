import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useProfitLossReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function ProfitLossPage() {
  const { data, isLoading, isError, refetch } = useProfitLossReport();
  const d = data?.data;

  return (
    <ReportShell
      title="الأرباح والخسائر"
      subtitle="تقرير شامل للمبيعات والتكاليف والمصروفات والأرباح"
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      reportId="profit-loss"
    >
      {d && (
        <>
          {/* Revenue Section */}
          <Card title="الإيرادات" titleIcon="ti-trending-up" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
              <KpiCard label="المبيعات HT (بدون ضريبة)" value={MONEY(d.revenue.sales_ht)} icon="ti-cash" color="var(--blue)" />
              <KpiCard label="الضريبة TVA" value={MONEY(d.revenue.sales_tva)} icon="ti-calculator" color="var(--purple)" />
              <KpiCard label="المبيعات TTC (مع الضريبة)" value={MONEY(d.revenue.sales_ttc)} icon="ti-cash" color="var(--teal)" />
              <KpiCard label="تكلفة البضاعة المباعة" value={MONEY(d.revenue.sales_cost)} icon="ti-package" color="var(--orange)" />
            </div>
          </Card>

          {/* Gross Margin */}
          <Card title="الهامش الإجمالي" titleIcon="ti-coin" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard
                label="الهامش الإجمالي (HT - Cost)"
                value={MONEY(d.revenue.gross_margin)}
                icon="ti-coin"
                color={d.revenue.gross_margin >= 0 ? 'var(--em)' : 'var(--red)'}
              />
              <KpiCard
                label="نسبة الهامش الإجمالي"
                value={`${d.revenue.gross_margin_pct}%`}
                icon="ti-chart-line"
                color={d.revenue.gross_margin_pct >= 0 ? 'var(--em)' : 'var(--red)'}
              />
            </div>
          </Card>

          {/* Purchases & Expenses */}
          <Card title="المشتريات والمصروفات" titleIcon="ti-trending-down" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="المشتريات HT" value={MONEY(d.purchases.purchase_ht)} icon="ti-trending-down" color="var(--orange)" />
              <KpiCard label="ضريبة المشتريات" value={MONEY(d.purchases.purchase_tva)} icon="ti-calculator" color="var(--purple)" />
            </div>
            <div className="kpis" style={{ gridTemplateColumns: '1fr', marginTop: 8 }}>
              <KpiCard label="إجمالي المصروفات" value={MONEY(d.expenses.total_expenses)} icon="ti-wallet" color="var(--red)" />
            </div>

            {d.expenses.by_category.length > 0 && (
              <div className="tw" style={{ marginTop: 12 }}>
                <table>
                  <thead>
                    <tr>
                      <th>الفئة</th>
                      <th className="num">المبلغ</th>
                    </tr>
                  </thead>
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

          {/* Net Result */}
          <Card title="النتيجة النهائية" titleIcon="ti-chart-line" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard
                label="الهامش الإجمالي"
                value={MONEY(d.result.gross_margin)}
                icon="ti-coin"
                color={d.result.gross_margin >= 0 ? 'var(--em)' : 'var(--red)'}
              />
              <KpiCard
                label="صافي الربح/الخسارة"
                value={MONEY(d.result.net_result)}
                icon={d.result.net_result >= 0 ? 'ti-mood-happy' : 'ti-mood-sad'}
                color={d.result.net_result >= 0 ? 'var(--em)' : 'var(--red)'}
              />
            </div>

            <div style={{ marginTop: 12, padding: 12, borderRadius: 8, background: d.result.net_result >= 0 ? 'var(--em-bg)' : 'var(--red-bg)' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: d.result.net_result >= 0 ? 'var(--em)' : 'var(--red)' }}>
                {d.result.net_result >= 0 ? 'النتيجة صافية — ربح ✅' : 'النتيجة صافية — خسارة ⚠️'}
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

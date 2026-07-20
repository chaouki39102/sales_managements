import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useMarginReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function MarginReportPage() {
  const { data, isLoading, isError, refetch } = useMarginReport();
  return <ReportShell title="تقرير الهوامش" isLoading={isLoading} isError={isError} refetch={refetch} reportId="margin">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="إجمالي المبيعات"  value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="blue"   icon="ti-trending-down" label="إجمالي التكلفة"   value={MONEY(data.summary.total_cost)}/>
          <KpiCard variant="gold"   icon="ti-coin"          label="إجمالي الهامش"    value={MONEY(data.summary.total_margin)}/>
          <KpiCard variant="purple" icon="ti-percentage"    label="نسبة الهامش"      value={`${data.summary.margin_pct}%`}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <div className="tw">
            <table>
              <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>الإيراد HT</th><th>التكلفة</th><th>الهامش</th><th>%</th></tr></thead>
              <tbody>
                {data.items.map((row, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.product_name}</td>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{row.product_ref}</td>
                    <td>{row.total_qty}</td>
                    <td>{FMT(row.total_ht)}</td>
                    <td>{FMT(row.cost_total)}</td>
                    <td style={{ color: row.margin_amount >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(row.margin_amount)}</td>
                    <td style={{ color: row.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>{row.margin_pct}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                  <td colSpan={3}>الإجمالي ({data.items.length} منتج)</td>
                  <td>{data.items.reduce((s, r) => s + r.total_qty, 0)}</td>
                  <td>{FMT(data.summary.total_ht)}</td>
                  <td>{FMT(data.summary.total_cost)}</td>
                  <td style={{ color: data.summary.total_margin >= 0 ? 'var(--em)' : 'var(--red)' }}>{FMT(data.summary.total_margin)}</td>
                  <td style={{ color: data.summary.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>{data.summary.margin_pct}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

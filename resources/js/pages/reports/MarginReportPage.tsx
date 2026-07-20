import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useMarginReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

export default function MarginReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useMarginReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'الهوامش',
      headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'إيراد HT', 'التكلفة', 'الهامش', 'النسبة %'],
      rows: data.items.map((r, i) => [i + 1, r.product_name, r.product_ref, r.total_qty, r.total_ht, r.cost_total, r.margin_amount, r.margin_pct]),
    }], `تقرير الهوامش ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الهوامش" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="margin">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="إجمالي المبيعات" value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="blue"   icon="ti-trending-down" label="إجمالي التكلفة"  value={MONEY(data.summary.total_cost)}/>
          <KpiCard variant="gold"   icon="ti-coin"          label="إجمالي الهامش"   value={MONEY(data.summary.total_margin)}/>
          <KpiCard variant="purple" icon="ti-percentage"    label="نسبة الهامش"     value={`${data.summary.margin_pct}%`}/>
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

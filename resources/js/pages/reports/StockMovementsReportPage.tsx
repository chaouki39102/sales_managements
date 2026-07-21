import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useStockMovementsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

const def = REPORT_DEFAULTS;

export default function StockMovementsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useStockMovementsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });
  const d = data;

  const handleExport = async () => {
    if (!d || d.movements.length === 0) return;
    await exportToExcel([{
      name: 'حركات المخزون',
      headers: ['#', 'التاريخ', 'المنتج', 'المستودع', 'النوع', 'الاتجاه', 'الكمية', 'القيمة'],
      rows: d.movements.map((m, i) => [i + 1, m.movement_date, m.product_name, m.warehouse_name ?? '—', m.type_label ?? '—', m.direction === 1 ? 'وارد' : m.direction === -1 ? 'صادر' : 'تسوية', m.quantity, m.total_price]),
    }], `حركات المخزون ${fromDate}-${toDate}`);
  };

  return (
    <ReportShell title="حركات المخزون" subtitle={`واردات وصادرات المستودعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="stock-movements">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
        <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
      </div>
      {d && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard variant="green"  icon="ti-arrow-down"      label="وارد (كمية)"   value={FMT(d.summary.total_in)}/>
            <KpiCard variant="red"    icon="ti-arrow-up"        label="صادر (كمية)"    value={FMT(d.summary.total_out)}/>
            <KpiCard variant="gold"   icon="ti-adjustments"     label="تسويات"         value={FMT(d.summary.total_adjustment)}/>
            <KpiCard variant="blue"   icon="ti-arrows-exchange" label="إجمالي الحركات" value={d.summary.movement_count}/>
          </div>
          {d.movements.length > 0 && (
            <Card noHeader style={{ padding: 0, marginTop: 16 }}>
              <div className="tw">
                <table>
                  <thead><tr><th>#</th><th>التاريخ</th><th>المنتج</th><th>المستودع</th><th>النوع</th><th>الاتجاه</th><th>الكمية</th><th>القيمة</th></tr></thead>
                  <tbody>
                    {d.movements.map((m, i) => (
                      <tr key={m.id}>
                        <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                        <td>{m.movement_date}</td>
                        <td style={{ fontWeight: 700 }}>{m.product_name}</td>
                        <td>{m.warehouse_name ?? '—'}</td>
                        <td>{m.type_label ?? '—'}</td>
                        <td>
                          <Badge variant={m.direction === 1 ? 'success' : m.direction === -1 ? 'danger' : 'warning'} noDot>
                            {m.direction === 1 ? 'وارد' : m.direction === -1 ? 'صادر' : 'تسوية'}
                          </Badge>
                        </td>
                        <td className="num">{FMT(m.quantity)}</td>
                        <td className="num">{MONEY(m.total_price)}</td>
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

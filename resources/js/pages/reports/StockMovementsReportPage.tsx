import React, { useState } from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useStockMovementsReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function StockMovementsReportPage() {
  const now = new Date();
  const [fromDate, setFromDate] = useState(`${now.getFullYear()}-01-01`);
  const [toDate, setToDate] = useState(now.toISOString().slice(0, 10));

  const { data, isLoading, isError, refetch } = useStockMovementsReport({
    from_date: fromDate,
    to_date: toDate,
  });
  const d = data?.data;

  return (
    <ReportShell
      title="حركات المخزون"
      subtitle={`${fromDate} → ${toDate}`}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      reportId="stock-movements"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <span style={{ fontWeight: 600 }}>من:</span>
        <input type="date" className="form-control" style={{ width: 200 }} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <span style={{ fontWeight: 600 }}>إلى:</span>
        <input type="date" className="form-control" style={{ width: 200 }} value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      {d && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard variant="green"  icon="ti-arrow-down"     label="وارد (كمية)"    value={FMT(d.summary.total_in)}/>
            <KpiCard variant="red"    icon="ti-arrow-up"       label="صادر (كمية)"     value={FMT(d.summary.total_out)}/>
            <KpiCard variant="gold"   icon="ti-adjustments"    label="تسويات"          value={FMT(d.summary.total_adjustment)}/>
            <KpiCard variant="blue"   icon="ti-arrows-exchange" label="إجمالي الحركات"  value={d.summary.movement_count}/>
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

          {d.movements.length === 0 && (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-ic"><i className="ti ti-arrows-exchange"/></div>
              <div className="empty-tx">لا توجد حركات مخزون في هذه الفترة</div>
            </div>
          )}
        </>
      )}
    </ReportShell>
  );
}

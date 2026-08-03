import { useState } from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useForecastReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import SimpleTable from '@/components/ui/SimpleTable';

export default function ForecastReorderReportPage() {
  const [horizon, setHorizon] = useState(30);
  const { data, isLoading, isError, refetch } = useForecastReport({ horizon });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'التنبؤ وإعادة الطلب',
      headers: ['#', 'المنتج', 'المرجع', 'أول بيع', 'آخر بيع', 'أيام النشاط', 'الكمية المباعة', 'معدل يومي (كمية)', 'معدل يومي (قيمة)', 'متوسط سعر الشراء', 'التوقع (كمية)', 'التوقع (قيمة)', 'الربح المتوقع', 'المخزون الحالي', 'الكمية المقترحة'],
      rows: data.items.map((r, i) => [i + 1, r.product_name, r.product_ref, r.first_sale, r.last_sale, r.active_days, r.total_sold, r.daily_rate_qty, r.daily_rate_value, r.avg_purchase_price, r.forecast_qty, r.forecast_value, r.forecast_profit, r.current_stock, r.suggested_qty]),
    }], `التنبؤ وإعادة الطلب ${horizon} يوم`);
  };

  return (
    <ReportShell title="التنبؤ وإعادة الطلب" subtitle={`توقع الطلب على ${horizon} يوم بناءً على معدل البيع اليومي منذ أول عملية بيع — مع الكمية المقترحة لإعادة الطلب`} onExport={handleExport} isLoading={isLoading} isError={isError} refetch={refetch} reportId="forecast">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 13 }}>أفق التنبؤ (يوم):</span>
          <input
            type="number" min={1} max={365}
            className="form-control"
            style={{ width: 90 }}
            value={horizon}
            onChange={(e) => setHorizon(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
      </div>
      {data && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard variant="blue"   icon="ti-calendar-time"     label="أفق التنبؤ"           value={`${data.horizon} يوم`}/>
            <KpiCard variant="green"  icon="ti-trending-up"       label="قيمة المبيعات المتوقعة" value={MONEY(data.summary.total_forecast_value)}/>
            <KpiCard variant="purple" icon="ti-coins"             label="الربح المتوقع"        value={MONEY(data.summary.total_forecast_profit)}/>
            <KpiCard variant="orange" icon="ti-shopping-cart-plus" label="تحتاج إعادة طلب"      value={data.summary.needs_reorder_count}/>
          </div>
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <SimpleTable
              columns={[
                { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
                { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as React.ReactNode}</span> },
                { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as React.ReactNode}</span> },
                { key: 'total_sold', label: 'الكمية المباعة', className: 'num' },
                { key: 'daily_rate_qty', label: 'معدل يومي', className: 'num', render: (v) => FMT(Number(v ?? 0)) },
                { key: 'forecast_qty', label: 'التوقع (كمية)', className: 'num', render: (v) => FMT(Number(v ?? 0)) },
                { key: 'forecast_value', label: 'التوقع (قيمة)', className: 'num', render: (v) => MONEY(Number(v ?? 0)) },
                { key: 'forecast_profit', label: 'الربح المتوقع', className: 'num', render: (v) => <span style={{ color: (Number(v) >= 0 ? 'var(--em)' : 'var(--red)'), fontWeight: 700 }}>{MONEY(Number(v ?? 0))}</span> },
                { key: 'current_stock', label: 'المخزون الحالي', className: 'num' },
                { key: 'suggested_qty', label: 'الكمية المقترحة', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(Number(v ?? 0))}</span> : <span style={{ color: Number(v) > 0 ? 'var(--orange)' : 'var(--t4)', fontWeight: 700 }}>{FMT(Number(v ?? 0))}</span> },
              ]}
              data={[
                ...data.items.map((r, i) => ({ ...r, _idx: i + 1 })),
                { id: '__summary', _idx: null, product_name: `الإجمالي (${data.items.length} منتج)`, product_ref: '', total_sold: '', daily_rate_qty: '', forecast_qty: '', forecast_value: data.summary.total_forecast_value, forecast_profit: data.summary.total_forecast_profit, current_stock: '', suggested_qty: data.summary.total_suggested_qty },
              ]}
              rowKey="product_id"
            />
          </Card>
        </>
      )}
    </ReportShell>
  );
}

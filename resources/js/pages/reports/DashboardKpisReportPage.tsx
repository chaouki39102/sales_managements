import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useDashboardReport } from '@/lib/api/endpoints/reports';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';

const def = REPORT_DEFAULTS;

export default function DashboardKpisReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useDashboardReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  return (
    <ReportShell title="لوحة القيادة" subtitle={`مؤشرات الأداء الرئيسية — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="dashboard">
      <div style={{ marginBottom: 4 }}>
        <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      </div>
      {data && (
        <>
          <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
            <KpiCard variant="green"  icon="ti-trending-up"     label="إجمالي المبيعات HT" value={MONEY(data.summary.total_sales_ht)}/>
            <KpiCard variant="orange" icon="ti-trending-down"   label="إجمالي المشتريات HT" value={MONEY(data.summary.total_purchase_ht)}/>
            <KpiCard variant="blue"   icon="ti-package"         label="الوحدات المباعة"    value={FMT(data.summary.total_sold)}/>
            <KpiCard variant="purple" icon="ti-coins"           label="الربح المقدر"       value={MONEY(data.summary.total_est_profit)}/>
            <KpiCard variant="gold"   icon="ti-percentage"      label="هامش الربح"         value={`${data.summary.margin_pct}%`}/>
            <KpiCard variant="teal"   icon="ti-building-warehouse" label="قيمة المخزون"     value={MONEY(data.summary.total_stock_value)}/>
            <KpiCard variant="red"    icon="ti-alert-triangle"  label="تحتاج إعادة طلب"    value={data.summary.reorder_count}/>
            <KpiCard variant="blue"   icon="ti-package"         label="عدد المنتجات"       value={data.summary.total_products}/>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16, marginTop: 16 }}>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: 'color-mix(in srgb, var(--em) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--em) 25%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--em)', fontSize: 22,
                }}>
                  <i className="ti ti-trophy"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 4 }}>أفضل منتج ربحاً</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{data.best_product ? data.best_product.name : '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--em)', marginTop: 2 }}>
                    {data.best_product ? `${MONEY(data.best_product.est_profit)} ربح مقدر` : 'لا توجد مبيعات في الفترة'}
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: 'color-mix(in srgb, var(--red) 12%, transparent)',
                  border: '1px solid color-mix(in srgb, var(--red) 25%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--red)', fontSize: 22,
                }}>
                  <i className="ti ti-trending-down"/>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 4 }}>أضعف منتج ربحاً</div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{data.worst_product ? data.worst_product.name : '—'}</div>
                  <div style={{ fontSize: 12, color: 'var(--red)', marginTop: 2 }}>
                    {data.worst_product ? `${MONEY(data.worst_product.est_profit)} ربح مقدر` : 'لا توجد مبيعات في الفترة'}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </ReportShell>
  );
}

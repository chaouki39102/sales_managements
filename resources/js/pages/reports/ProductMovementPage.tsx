import React, { useState } from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useProductMovementReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function ProductMovementPage() {
  const now = new Date();
  const yearStart = `${now.getFullYear()}-01-01`;
  const today = now.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(yearStart);
  const [toDate, setToDate] = useState(today);

  const { data, isLoading, isError, refetch } = useProductMovementReport({
    from_date: fromDate,
    to_date: toDate,
  });
  const d = data?.data;

  return (
    <ReportShell
      title="حركة المنتجات"
      subtitle={`${fromDate} → ${toDate}`}
      isLoading={isLoading}
      isError={isError}
      refetch={refetch}
      reportId="product-movement"
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
            <KpiCard label="المنتجات" value={d.summary.total_products} icon="ti-package" variant="blue" />
            <KpiCard label="إجمالي المبيعات (Units)" value={FMT(d.summary.total_sales_qty)} icon="ti-trending-up" variant="green" />
            <KpiCard label="إجمالي المشتريات (Units)" value={FMT(d.summary.total_purchase_qty)} icon="ti-trending-down" variant="orange" />
            <KpiCard label="صافي الوحدات" value={FMT(d.summary.total_sales_qty - d.summary.total_purchase_qty)} icon="ti-arrows-exchange" variant="purple" />
          </div>

          <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
            <KpiCard label="المبيعات (HT)" value={MONEY(d.summary.total_sales_ht)} icon="ti-cash" variant="green" />
            <KpiCard label="المشتريات (HT)" value={MONEY(d.summary.total_purchase_ht)} icon="ti-cash" variant="orange" />
            <KpiCard label="صافي القيمة HT" value={MONEY(d.summary.total_sales_ht - d.summary.total_purchase_ht)} icon="ti-chart-line" variant="teal" />
          </div>

          {d.items.length > 0 && (
            <Card
              title={`حركة المنتجات (${d.items.length})`}
              titleIcon="ti-arrows-exchange"
              padding="sm"
              style={{ borderRadius: 12 }}
            >
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>المرجع</th>
                      <th>المنتج</th>
                      <th className="num">كمية المبيعات</th>
                      <th className="num">قيمة المبيعات HT</th>
                      <th className="num">كمية المشتريات</th>
                      <th className="num">قيمة المشتريات HT</th>
                      <th className="num">الصافي (Units)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.items.map((item) => (
                      <tr key={item.product_id}>
                        <td><span style={{ fontWeight: 600 }}>{item.product_ref}</span></td>
                        <td>{item.product_name}</td>
                        <td className="num">{FMT(item.sales_qty)}</td>
                        <td className="num">{FMT(item.sales_ht)}</td>
                        <td className="num">{FMT(item.purchase_qty)}</td>
                        <td className="num">{FMT(item.purchase_ht)}</td>
                        <td className="num">
                          <span style={{ fontWeight: 700, color: item.net_qty > 0 ? 'var(--em)' : item.net_qty < 0 ? 'var(--red)' : undefined }}>
                            {item.net_qty > 0 ? '+' : ''}{FMT(item.net_qty)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {d.items.length === 0 && (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-ic"><i className="ti ti-package-off"/></div>
              <div className="empty-tx">لا توجد حركات في هذه الفترة</div>
              <div className="empty-sub">جرب تغيير تواريخ البحث</div>
            </div>
          )}
        </>
      )}
    </ReportShell>
  );
}

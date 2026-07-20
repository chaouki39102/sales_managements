import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useCreativeReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function CreativeReportPage() {
  const { data, isLoading, isError, refetch } = useCreativeReport();

  return <ReportShell title="التقرير الشامل" isLoading={isLoading} isError={isError} refetch={refetch} reportId="creative">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"    label="المبيعات HT"      value={MONEY(data.overview.total_sales_ht)}/>
          <KpiCard variant="blue"   icon="ti-trending-down"  label="المشتريات HT"     value={MONEY(data.overview.total_purchases_ht)}/>
          <KpiCard variant="teal"   icon="ti-coin"           label="هامش الربح"       value={MONEY(data.overview.total_sales_margin)} subtitle={`${data.overview.sales_margin_pct}%`}/>
          <KpiCard variant="purple" icon="ti-percentage"     label="صافي الربح"       value={MONEY(data.overview.total_sales_ht - data.overview.total_purchases_ht)}/>
        </div>

        <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginTop: 8 }}>
          <KpiCard variant="green" icon="ti-wallet"           label="المتحصّل"           value={MONEY(data.cash_flow.collected)}/>
          <KpiCard variant="red"   icon="ti-clock"            label="المستحق (مبيعات)"  value={MONEY(data.cash_flow.outstanding)} subtitle={`${data.cash_flow.collection_rate}% تحصيل`}/>
          <KpiCard variant="gold"  icon="ti-receipt"          label="عدد المبيعات"       value={data.overview.sales_count} subtitle={`${data.overview.unpaid_sales_count} غير مسددة`}/>
          <KpiCard variant="blue"  icon="ti-file-text"        label="عدد المشتريات"      value={data.overview.purchases_count}/>
          <KpiCard variant="teal"  icon="ti-credit-card"      label="المدفوعات"         value={MONEY(data.overview.total_payments)}/>
        </div>

        {data.top_products.length > 0 && (
          <Card title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-trophy"/></span> أفضل 10 منتجات حسب الهامش</>}>
            <div className="tw">
              <table>
                <thead>
                  <tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>HT</th><th>التكلفة</th><th>الهامش</th><th>%</th></tr>
                </thead>
                <tbody>
                  {data.top_products.map((p, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{p.product_name}</td>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{p.product_ref}</td>
                      <td>{p.total_qty}</td>
                      <td>{FMT(p.total_ht)}</td>
                      <td>{FMT(p.total_cost)}</td>
                      <td style={{ color: p.margin_value >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(p.margin_value)}</td>
                      <td style={{ color: p.margin_pct >= 0 ? 'var(--em)' : 'var(--red)' }}>{p.margin_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {data.top_customers.length > 0 && (
          <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-crown"/></span> أفضل 10 زبائن حسب المشتريات</>}>
            <div className="tw">
              <table>
                <thead>
                  <tr><th>#</th><th>الزبون</th><th>إجمالي المشتريات TTC</th><th>عدد الوثائق</th></tr>
                </thead>
                <tbody>
                  {data.top_customers.map((c, i) => (
                    <tr key={i}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{c.party_name}</td>
                      <td>{FMT(c.total_ttc)}</td>
                      <td>{c.doc_count}</td>
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

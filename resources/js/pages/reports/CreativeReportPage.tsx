import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useCreativeReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function CreativeReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useCreativeReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [
      { name: 'نظرة عامة', headers: ['البيان', 'المبلغ'], rows: [
        ['المبيعات HT', data.overview.total_sales_ht], ['المبيعات TTC', data.overview.total_sales_ttc],
        ['تكلفة المبيعات', data.overview.total_sales_cost], ['هامش الربح', data.overview.total_sales_margin],
        ['نسبة الهامش', `${data.overview.sales_margin_pct}%`],
        ['المشتريات HT', data.overview.total_purchases_ht], ['المشتريات TTC', data.overview.total_purchases_ttc],
        ['المدفوعات', data.overview.total_payments], ['المتحصّل', data.cash_flow.collected],
        ['المستحق', data.cash_flow.outstanding], ['نسبة التحصيل', `${data.cash_flow.collection_rate}%`],
      ]},
    ];
    if (data.top_products.length > 0) {
      sheets.push({ name: 'أفضل المنتجات', headers: ['المنتج', 'المرجع', 'الكمية', 'HT', 'التكلفة', 'الهامش', 'النسبة'], rows: data.top_products.map(p => [p.product_name, p.product_ref, p.total_qty, p.total_ht, p.total_cost, p.margin_value, p.margin_pct]) });
    }
    if (data.top_customers.length > 0) {
      sheets.push({ name: 'أفضل الزبائن', headers: ['الزبون', 'TTC', 'عدد الوثائق'], rows: data.top_customers.map(c => [c.party_name, c.total_ttc, c.doc_count]) });
    }
    await exportToExcel(sheets, `التقرير الشامل ${fromDate}-${toDate}`);
  };

  return <ReportShell title="التقرير الشامل" subtitle={`ملخص شامل للمبيعات والمشتريات والأرباح — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="creative">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="green"  icon="ti-trending-up"   label="المبيعات HT"  value={MONEY(data.overview.total_sales_ht)}/>
          <KpiCard variant="blue"   icon="ti-trending-down" label="المشتريات HT" value={MONEY(data.overview.total_purchases_ht)}/>
          <KpiCard variant="teal"   icon="ti-coin"          label="هامش الربح"   value={MONEY(data.overview.total_sales_margin)} sub={`${data.overview.sales_margin_pct}%`}/>
          <KpiCard variant="purple" icon="ti-percentage"    label="صافي الربح"   value={MONEY(data.overview.total_sales_ht - data.overview.total_purchases_ht)}/>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)', marginTop: 8 }}>
          <KpiCard variant="green" icon="ti-wallet"       label="المتحصّل"          value={MONEY(data.cash_flow.collected)}/>
          <KpiCard variant="red"   icon="ti-clock"        label="المستحق (مبيعات)" value={MONEY(data.cash_flow.outstanding)} sub={`${data.cash_flow.collection_rate}% تحصيل`}/>
          <KpiCard variant="gold"  icon="ti-receipt"      label="عدد المبيعات"      value={data.overview.sales_count} sub={`${data.overview.unpaid_sales_count} غير مسددة`}/>
          <KpiCard variant="blue"  icon="ti-file-text"    label="عدد المشتريات"     value={data.overview.purchases_count}/>
          <KpiCard variant="teal"  icon="ti-credit-card"  label="المدفوعات"        value={MONEY(data.overview.total_payments)}/>
        </div>
        {data.top_products.length > 0 && (
          <Card title={<><span className="ic ic-sm" style={{ color: 'var(--em)' }}><i className="ti ti-trophy"/></span> أفضل 10 منتجات حسب الهامش</>}>
            <SimpleTable
              rowKey={(row, i) => String(i)}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v as string}</span> },
                { key: 'total_qty', label: 'الكمية' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_cost', label: 'التكلفة', render: (v) => FMT(v as number) },
                { key: 'margin_value', label: 'الهامش', render: (v) => <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>{FMT(v as number)}</span> },
                { key: 'margin_pct', label: '%', render: (v) => <span style={{ color: (v as number) >= 0 ? 'var(--em)' : 'var(--red)' }}>{v}%</span> },
              ]}
              data={data.top_products.map((p, i) => ({ ...p, _idx: i + 1 }))}
            />
          </Card>
        )}
        {data.top_customers.length > 0 && (
          <Card title={<><span className="ic ic-sm" style={{ color: 'var(--purple)' }}><i className="ti ti-crown"/></span> أفضل 10 زبائن حسب المشتريات</>}>
            <SimpleTable
              rowKey={(row, i) => String(i)}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'party_name', label: 'الزبون', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'total_ttc', label: 'إجمالي المشتريات TTC', render: (v) => FMT(v as number) },
                { key: 'doc_count', label: 'عدد الوثائق' },
              ]}
              data={data.top_customers.map((c, i) => ({ ...c, _idx: i + 1 }))}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useTvaReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = REPORT_DEFAULTS;

export default function TaxesReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useTvaReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'ملخص TVA',
      headers: ['البيان', 'المبلغ'],
      rows: [
        ['TVA محصلة (مبيعات)', data.summary.tva_collected],
        ['TVA قابلة للخصم (مشتريات)', data.summary.tva_deductible],
        ['صافي TVA المستحق', data.summary.tva_balance],
        ['---', '---'],
        ['بيعات HT', data.sales.total_ht],
        ['بيعات TVA', data.sales.total_tva],
        ['بيعات طابع جبائي', data.sales.total_stamp],
        ['بيعات TTC', data.sales.total_ttc],
        ['عدد مبيعات', data.sales.count],
        ['---', '---'],
        ['مشتريات HT', data.purchases.total_ht],
        ['مشتريات TVA', data.purchases.total_tva],
        ['مشتريات طابع جبائي', data.purchases.total_stamp],
        ['مشتريات TTC', data.purchases.total_ttc],
        ['عدد مشتريات', data.purchases.count],
      ],
    }], `تقرير الضرائب ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الضرائب — TVA" subtitle={`ضريبة القيمة المضافة — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="taxes">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="green" icon="ti-arrow-up-circle"   label="TVA محصلة (مبيعات)" value={MONEY(data.summary.tva_collected)}/>
          <KpiCard variant="blue"  icon="ti-arrow-down-circle" label="TVA قابلة للخصم"     value={MONEY(data.summary.tva_deductible)}/>
          <KpiCard variant="red"   icon="ti-calculator"        label="صافي TVA المستحق"   value={MONEY(data.summary.tva_balance)}/>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 8 }}>
          <Card title="المبيعات" titleIcon="ti-trending-up" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="الوعاء HT" value={MONEY(data.sales.total_ht)} icon="ti-cash" variant="blue"/>
              <KpiCard label="الضريبة TVA" value={MONEY(data.sales.total_tva)} icon="ti-calculator" variant="green"/>
              <KpiCard label="الطابع الجبائي" value={MONEY(data.sales.total_stamp)} icon="ti-stamp" variant="purple"/>
              <KpiCard label="العدد" value={data.sales.count} icon="ti-file-text" variant="teal"/>
            </div>
          </Card>
          <Card title="المشتريات" titleIcon="ti-trending-down" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="الوعاء HT" value={MONEY(data.purchases.total_ht)} icon="ti-cash" variant="blue"/>
              <KpiCard label="الضريبة TVA" value={MONEY(data.purchases.total_tva)} icon="ti-calculator" variant="orange"/>
              <KpiCard label="الطابع الجبائي" value={MONEY(data.purchases.total_stamp)} icon="ti-stamp" variant="purple"/>
              <KpiCard label="العدد" value={data.purchases.count} icon="ti-file-text" variant="teal"/>
            </div>
          </Card>
        </div>
        <Card title="ملخص TVA" titleIcon="ti-calculator" padding="sm" style={{ borderRadius: 12, marginTop: 8 }}>
          <div style={{ padding: 16, borderRadius: 8, background: data.summary.tva_balance > 0 ? 'var(--red-bg)' : 'var(--em-bg)' }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: data.summary.tva_balance > 0 ? 'var(--red)' : 'var(--em)' }}>
              صافي TVA المستحق: {MONEY(data.summary.tva_balance)}
            </div>
            <div style={{ fontSize: 13, marginTop: 4, opacity: 0.7 }}>
              محصل ({MONEY(data.summary.tva_collected)}) − قابل للخصم ({MONEY(data.summary.tva_deductible)})
            </div>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

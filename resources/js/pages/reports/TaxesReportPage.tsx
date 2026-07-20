import React from 'react';
import ReportShell from './ReportShell';
import { FMT, MONEY } from './helpers';
import { useTvaReport } from '@/lib/api/endpoints/reports';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';

export default function TaxesReportPage() {
  const { data, isLoading, isError, refetch } = useTvaReport();
  return <ReportShell title="تقرير الضرائب — TVA" isLoading={isLoading} isError={isError} refetch={refetch} reportId="taxes">
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
          <KpiCard variant="green" icon="ti-arrow-up-circle"   label="TVA محصلة (مبيعات)"  value={MONEY(data.summary.tva_collected)}/>
          <KpiCard variant="blue"  icon="ti-arrow-down-circle" label="TVA قابلة للخصم"      value={MONEY(data.summary.tva_deductible)}/>
          <KpiCard variant="red"   icon="ti-calculator"        label="صافي TVA المستحق"    value={MONEY(data.summary.tva_balance)}/>
        </div>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginTop: 8 }}>
          <Card title="المبيعات" titleIcon="ti-trending-up" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="الوعاء HT" value={MONEY(data.sales.total_ht)} icon="ti-cash" color="var(--blue)"/>
              <KpiCard label="الضريبة TVA" value={MONEY(data.sales.total_tva)} icon="ti-calculator" color="var(--green)"/>
              <KpiCard label="الطابع الجبائي" value={MONEY(data.sales.total_stamp)} icon="ti-stamp" color="var(--purple)"/>
              <KpiCard label="العدد" value={data.sales.count} icon="ti-file-text" color="var(--teal)"/>
            </div>
          </Card>
          <Card title="المشتريات" titleIcon="ti-trending-down" padding="sm" style={{ borderRadius: 12 }}>
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
              <KpiCard label="الوعاء HT" value={MONEY(data.purchases.total_ht)} icon="ti-cash" color="var(--blue)"/>
              <KpiCard label="الضريبة TVA" value={MONEY(data.purchases.total_tva)} icon="ti-calculator" color="var(--orange)"/>
              <KpiCard label="الطابع الجبائي" value={MONEY(data.purchases.total_stamp)} icon="ti-stamp" color="var(--purple)"/>
              <KpiCard label="العدد" value={data.purchases.count} icon="ti-file-text" color="var(--teal)"/>
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

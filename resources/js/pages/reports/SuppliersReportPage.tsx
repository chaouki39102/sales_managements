import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useSuppliersReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function SuppliersReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useSuppliersReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    await exportToExcel([{
      name: 'الموردين',
      headers: ['#', 'الاسم', 'الكود', 'NIF', 'الهاتف', 'الولاية', 'عدد الوثائق', 'المشتريات HT', 'المدفوع', 'المتبقي'],
      rows: data.suppliers.map((r, i) => [i + 1, r.name, r.code ?? '—', r.nif ?? '—', r.phone ?? '—', r.wilaya ?? '—', r.doc_count, r.total_ht, r.total_paid, r.total_remaining]),
    }], `تقرير الموردين ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الموردين" subtitle={`أرصدة وحركة المشتريات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="suppliers">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="blue"  icon="ti-truck"        label="عدد الموردين"      value={data.summary.total_suppliers}/>
          <KpiCard variant="red"   icon="ti-trending-up"  label="إجمالي المتبقي"   value={MONEY(data.summary.total_remaining)}/>
          <KpiCard variant="green" icon="ti-trending-up"  label="إجمالي المشتريات HT" value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="teal"  icon="ti-trending-up"  label="إجمالي المشتريات TTC" value={MONEY(data.summary.total_ttc)}/>
        </div>
        <Card noHeader style={{ padding: 0, marginTop: 16 }}>
          <SimpleTable
            columns={[
              { key: '_idx', label: '#', render: (v) => <span style={{ color: 'var(--t4)', fontSize: 12 }}>{v}</span> },
              { key: 'name', label: 'الاسم', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{v}</span> : <span style={{ fontWeight: 700 }}>{v}</span> },
              { key: 'code', label: 'الكود', render: (v) => <span style={{ color: 'var(--t4)' }}>{v ?? '—'}</span> },
              { key: 'nif', label: 'NIF', render: (v) => v ?? '—' },
              { key: 'phone', label: 'الهاتف', render: (v) => v ?? '—' },
              { key: 'wilaya', label: 'الولاية', render: (v) => v ?? '—' },
              { key: 'doc_count', label: 'عدد الوثائق', className: 'num' },
              { key: 'total_ht', label: 'المشتريات HT', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800 }}>{FMT(v as number)}</span> : FMT(v as number) },
              { key: 'total_paid', label: 'المدفوع', className: 'num', render: (v, row) => row.id === '__summary' ? <span style={{ fontWeight: 800, color: 'var(--em)' }}>{FMT(v as number)}</span> : <span style={{ color: 'var(--em)' }}>{FMT(v as number)}</span> },
              { key: 'total_remaining', label: 'المتبقي', className: 'num', render: (v, row) => {
                if (row.id === '__summary') return <span style={{ fontWeight: 800, color: 'var(--red)' }}>{FMT(v as number)}</span>;
                return <span style={{ color: (v as number) > 0 ? 'var(--red)' : 'var(--em)', fontWeight: 700 }}>{FMT(v as number)}</span>;
              }},
            ]}
            data={[
              ...data.suppliers.map((r, i) => ({ ...r, _idx: i + 1 })),
              { id: '__summary', _idx: null, name: `الإجمالي (${data.suppliers.length})`, code: '', nif: '', phone: '', wilaya: '', doc_count: data.suppliers.reduce((s, r) => s + r.doc_count, 0), total_ht: data.suppliers.reduce((s, r) => s + r.total_ht, 0), total_paid: data.suppliers.reduce((s, r) => s + r.total_paid, 0), total_remaining: data.summary.total_remaining },
            ]}
            rowKey="id"
          />
        </Card>
      </>
    )}
  </ReportShell>;
}

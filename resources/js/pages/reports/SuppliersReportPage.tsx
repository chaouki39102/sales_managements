import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useSuppliersReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

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
          <div className="tw">
            <table>
              <thead>
                <tr><th>#</th><th>الاسم</th><th>الكود</th><th>NIF</th><th>الهاتف</th><th>الولاية</th><th>عدد الوثائق</th><th>المشتريات HT</th><th>المدفوع</th><th>المتبقي</th></tr>
              </thead>
              <tbody>
                {data.suppliers.map((row, i) => (
                  <tr key={row.id}>
                    <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{row.name}</td>
                    <td style={{ color: 'var(--t4)' }}>{row.code ?? '—'}</td>
                    <td>{row.nif ?? '—'}</td>
                    <td>{row.phone ?? '—'}</td>
                    <td>{row.wilaya ?? '—'}</td>
                    <td>{row.doc_count}</td>
                    <td>{FMT(row.total_ht)}</td>
                    <td style={{ color: 'var(--em)' }}>{FMT(row.total_paid)}</td>
                    <td style={{ color: row.total_remaining > 0 ? 'var(--red)' : 'var(--em)', fontWeight: 700 }}>{FMT(row.total_remaining)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                  <td colSpan={6}>الإجمالي ({data.suppliers.length})</td>
                  <td>{data.suppliers.reduce((s, r) => s + r.doc_count, 0)}</td>
                  <td>{FMT(data.suppliers.reduce((s, r) => s + r.total_ht, 0))}</td>
                  <td style={{ color: 'var(--em)' }}>{FMT(data.suppliers.reduce((s, r) => s + r.total_paid, 0))}</td>
                  <td style={{ color: 'var(--red)' }}>{FMT(data.summary.total_remaining)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      </>
    )}
  </ReportShell>;
}

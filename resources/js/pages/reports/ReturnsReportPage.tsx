import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useReturnsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function ReturnsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useReturnsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    if (data.documents.length > 0) {
      sheets.push({ name: 'الوثائق', headers: ['#', 'رقم الوثيقة', 'النوع', 'التاريخ', 'العميل/المورد', 'HT', 'TTC', 'السبب'], rows: data.documents.map((d, i) => [i + 1, d.document_number, d.document_type, d.date, d.party_name ?? '—', d.total_ht, d.total_ttc, d.reason ?? '—']) });
    }
    if (data.product_recap.length > 0) {
      sheets.push({ name: 'ملخص المنتجات', headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'HT', 'TTC'], rows: data.product_recap.map((p, i) => [i + 1, p.product_name, p.product_ref, p.total_qty, p.total_ht, p.total_ttc]) });
    }
    await exportToExcel(sheets.length > 0 ? sheets : [{ name: 'الإرجاعات', headers: ['البيان'], rows: [['لا توجد إرجاعات']] }], `تقرير الإرجاعات ${fromDate}-${toDate}`);
  };

  return <ReportShell title="تقرير الإرجاعات" subtitle={`مرتجعات المبيعات والمشتريات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="returns">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
          <KpiCard variant="red"   icon="ti-rotate-left"   label="إجمالي الإرجاعات" value={data.summary.total_returns}/>
          <KpiCard variant="orange" icon="ti-trending-up"  label="إرجاعات البيع"     value={data.summary.sale_returns} sub={MONEY(data.summary.sale_returns_ht)}/>
          <KpiCard variant="blue"  icon="ti-trending-down" label="إرجاعات الشراء"   value={data.summary.purchase_returns} sub={MONEY(data.summary.purchase_returns_ht)}/>
          <KpiCard variant="gold"  icon="ti-cash"          label="القيمة الإجمالية"  value={MONEY(data.summary.total_ht)}/>
        </div>
        {data.documents.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <SimpleTable
              rowKey={(row) => String(row.id ?? '')}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'document_number', label: 'رقم الوثيقة', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'document_type', label: 'النوع', render: (v) => <Badge>{v as string}</Badge> },
                { key: 'date', label: 'التاريخ' },
                { key: 'party_name', label: 'العميل/المورد', render: (v) => v ?? '—' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
                { key: 'reason', label: 'السبب', render: (v) => <span style={{ color: 'var(--t4)' }}>{v ?? '—'}</span> },
              ]}
              data={data.documents.map((doc, i) => ({ ...doc, _idx: i + 1 }))}
            />
          </Card>
        )}
        {data.product_recap.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <SimpleTable
              rowKey={(row) => String(row.product_id ?? '')}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'product_ref', label: 'المرجع' },
                { key: 'total_qty', label: 'الكمية' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
              ]}
              data={data.product_recap.map((p, i) => ({ ...p, _idx: i + 1 }))}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

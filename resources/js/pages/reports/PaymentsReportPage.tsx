import { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { usePaymentsReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function PaymentsReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = usePaymentsReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    sheets.push({ name: 'حسب طريقة الدفع', headers: ['طريقة الدفع', 'العدد', 'المبلغ'], rows: data.by_mode.map(r => [r.mode ?? 'غير محدد', r.count, r.total]) });
    if (data.payments.length > 0) {
      sheets.push({ name: 'التفاصيل', headers: ['#', 'التاريخ', 'المبلغ', 'طريقة الدفع', 'العميل/المورد', 'الوثيقة', 'المرجع', 'الحالة'], rows: data.payments.map((p, i) => [i + 1, p.payment_date, p.amount, p.payment_mode ?? '—', p.party_name ?? '—', p.document_number ?? '—', p.reference ?? '—', p.status]) });
    }
    await exportToExcel(sheets, `تقرير الدفعات ${fromDate}-${toDate}`);
  };

  const byModeData = data ? [
    ...data.by_mode.map((row, i) => ({ ...row, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.by_mode.length} طريقة)`, total: data.summary.total_amount, count: data.summary.count },
  ] : [];

  return <ReportShell title="تقرير الدفعات" subtitle={`التحصيلات والمدفوعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="payments">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="green" icon="ti-cash"  label="إجمالي الدفعات" value={MONEY(data.summary.total_amount)}/>
          <KpiCard variant="blue"  icon="ti-hash"  label="عدد الدفعات"   value={data.summary.count}/>
        </div>
        {data.by_mode.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row._idx ?? '')}
              rowClassName={(row, _index) => (row as any).__isSummary ? 'tw-sr' : ''}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'mode', label: 'طريقة الدفع', render: (v) => <span style={{ fontWeight: 700 }}>{(v as string) ?? 'غير محدد'}</span> },
                { key: 'total', label: 'الإجمالي', render: (v) => FMT(v as number) },
                { key: 'count', label: 'العدد' },
              ]}
              data={byModeData}
            />
          </Card>
        )}
        {data.payments.length > 0 && (
          <Card noHeader style={{ padding: 0, marginTop: 16 }}>
            <SimpleTable
              rowKey={(row) => String(row.id ?? '')}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'payment_date', label: 'التاريخ' },
                { key: 'amount', label: 'المبلغ', render: (v) => <span style={{ fontWeight: 700 }}>{FMT(v as number)}</span> },
                { key: 'payment_mode', label: 'طريقة الدفع', render: (v) => (v as string) ?? '—' },
                { key: 'party_name', label: 'العميل/المورد', render: (v) => (v as string) ?? '—' },
                { key: 'document_number', label: 'الوثيقة', render: (v) => (v as string) ?? '—' },
                { key: 'reference', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)' }}>{(v as string) ?? '—'}</span> },
                { key: 'status', label: 'الحالة', render: (v) => <Badge variant={(v as string) === 'confirmed' ? 'success' : (v as string) === 'pending' ? 'warning' : 'danger'} noDot>{(v as string)}</Badge> },
              ]}
              data={data.payments.map((p, i) => ({ ...p, _idx: i + 1 }))}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

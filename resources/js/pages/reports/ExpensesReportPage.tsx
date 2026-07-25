import React, { useState } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, PCT, REPORT_DEFAULTS } from './helpers';
import { useExpensesReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function ExpensesReportPage() {
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const { data, isLoading, isError, refetch } = useExpensesReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const handleExport = async () => {
    if (!data) return;
    const sheets = [];
    if (data.by_category.length > 0) {
      sheets.push({ name: 'حسب الفئة', headers: ['الفئة', 'العدد', 'المبلغ', 'النسبة'], rows: data.by_category.map(c => [c.category_name ?? 'غير مصنف', c.count, c.total, data.summary.total_expenses > 0 ? PCT((c.total / data.summary.total_expenses) * 100) : '0%']) });
    }
    if (data.expenses.length > 0) {
      sheets.push({ name: 'التفاصيل', headers: ['#', 'رقم', 'التاريخ', 'المبلغ', 'الفئة', 'الوصف'], rows: data.expenses.map((e, i) => [i + 1, e.expense_number, e.date, e.amount, e.category_name ?? '—', e.description ?? '—']) });
    }
    await exportToExcel(sheets.length > 0 ? sheets : [{ name: 'المصروفات', headers: ['البيان'], rows: [['لا توجد بيانات']] }], `تقرير المصروفات ${fromDate}-${toDate}`);
  };

  const categoryData = data ? [
    ...data.by_category.map((c, i) => ({ ...c, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.by_category.length} فئة)`, count: data.summary.count, total: data.summary.total_expenses, pct: '100%' },
  ] : [];

  const expensesData = data ? [
    ...data.expenses.map((e, i) => ({ ...e, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.expenses.length})`, amount: data.summary.total_expenses },
  ] : [];

  return <ReportShell title="تقرير المصروفات" subtitle={`مصروفات وفئاتها — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="expenses">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
          <KpiCard variant="red"  icon="ti-wallet"  label="إجمالي المصروفات" value={MONEY(data.summary.total_expenses)}/>
          <KpiCard variant="blue" icon="ti-hash"    label="عدد المصروفات"   value={data.summary.count}/>
        </div>
        {data.by_category.length > 0 && (
          <Card title="حسب الفئة" titleIcon="ti-category" padding="sm" style={{ borderRadius: 12 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row._idx ?? '')}
              rowClassName={(row) => (row as any).__isSummary ? 'tw-sr' : undefined}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'category_name', label: 'الفئة', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'count', label: 'العدد', className: 'num' },
                { key: 'total', label: 'المبلغ', className: 'num', render: (v) => MONEY(v as number) },
                { key: 'pct', label: 'النسبة', className: 'num', render: (_v, row) => {
                  const c = row as any;
                  return data.summary.total_expenses > 0 ? PCT((c.total / data.summary.total_expenses) * 100) : '0%';
                }},
              ]}
              data={categoryData}
            />
          </Card>
        )}
        {data.monthly.length > 0 && (
          <Card title="التطور الشهري" titleIcon="ti-chart-line" padding="sm" style={{ borderRadius: 12 }}>
            <SimpleTable
              rowKey={(row) => String(row.month ?? '')}
              columns={[
                { key: 'month', label: 'الشهر', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'count', label: 'العدد', className: 'num' },
                { key: 'total', label: 'المبلغ', className: 'num', render: (v) => MONEY(v as number) },
              ]}
              data={data.monthly}
            />
          </Card>
        )}
        {data.expenses.length > 0 && (
          <Card title="تفاصيل المصروفات" titleIcon="ti-list" padding="sm" style={{ borderRadius: 12 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.id ?? '')}
              rowClassName={(row) => (row as any).__isSummary ? 'tw-sr' : undefined}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'expense_number', label: 'رقم' },
                { key: 'date', label: 'التاريخ' },
                { key: 'amount', label: 'المبلغ', className: 'num', render: (v) => <span style={{ fontWeight: 700 }}>{MONEY(v as number)}</span> },
                { key: 'category_name', label: 'الفئة', render: (v) => v ?? '—' },
                { key: 'description', label: 'الوصف', render: (v) => <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{v ?? '—'}</span> },
              ]}
              data={expensesData}
            />
          </Card>
        )}
      </>
    )}
  </ReportShell>;
}

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY, REPORT_DEFAULTS } from './helpers';
import { useCustomersReport } from '@/lib/api/endpoints/reports';
import { exportToExcel } from './exportUtils';
import { TransactionHistoryModal } from '@/pages/debts/TransactionHistoryModal';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SimpleTable from '@/components/ui/SimpleTable';

const def = REPORT_DEFAULTS;

export default function CustomersReportPage() {
  const navigate = useNavigate();
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const [tab, setTab] = useState<'table' | 'products'>('table');
  const { data, isLoading, isError, refetch } = useCustomersReport({ from_date: fromDate || undefined, to_date: toDate || undefined });

  const [historyParty, setHistoryParty] = useState<{ id: number; name: string } | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const openHistory = useCallback((id: number, name: string) => {
    setHistoryParty({ id, name });
    setHistoryOpen(true);
  }, []);

  const handleExport = async () => {
    if (!data) return;
    const sheets = [{
      name: 'الزبائن',
      headers: ['#', 'الاسم', 'الكود', 'الهاتف', 'الولاية', 'عدد الوثائق', 'المبيعات HT', 'المدفوع', 'المتبقي'],
      rows: data.customers.map((r, i) => [i + 1, r.name, r.code ?? '—', r.phone ?? '—', r.wilaya ?? '—', r.doc_count, r.total_ht, r.total_paid, r.total_remaining]),
    }];
    if (data.product_recap && data.product_recap.length > 0) {
      sheets.push({
        name: 'ملخص المنتجات',
        headers: ['#', 'المنتج', 'المرجع', 'الكمية', 'HT', 'الخصم', 'TTC'],
        rows: data.product_recap.map((p, i) => [i + 1, p.product_name, p.product_ref, p.total_qty, p.total_ht, p.total_discount, p.total_ttc]),
      });
    }
    await exportToExcel(sheets, `تقرير الزبائن ${fromDate}-${toDate}`);
  };

  const customersData = data ? [
    ...data.customers.map((row, i) => ({ ...row, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.customers.length})`, doc_count: data.customers.reduce((s, r) => s + r.doc_count, 0), total_ht: data.customers.reduce((s, r) => s + r.total_ht, 0), total_paid: data.customers.reduce((s, r) => s + r.total_paid, 0), total_remaining: data.summary.total_remaining },
  ] : [];

  const productsData = data?.product_recap ? [
    ...data.product_recap.map((p, i) => ({ ...p, _idx: i + 1 })),
    { __isSummary: true, _idx: `الإجمالي (${data.product_recap.length} منتج)`, total_qty: data.product_recap.reduce((s, r) => s + r.total_qty, 0), total_ht: data.product_recap.reduce((s, r) => s + r.total_ht, 0), total_discount: data.summary.total_discount, total_ttc: data.product_recap.reduce((s, r) => s + r.total_ttc, 0) },
  ] : [];

  return <ReportShell title="تقرير الزبائن" subtitle={`أرصدة وحركة المبيعات — ${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="customers">
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
      <ReportDateFilter fromDate={fromDate} toDate={toDate} onChangeFrom={setFromDate} onChangeTo={setToDate} />
      <Button size="xs" variant="success" icon={<i className="ti ti-file-spreadsheet"/>} onClick={handleExport}>تصدير Excel</Button>
    </div>
    {data && (
      <>
        <div className="kpis" style={{ gridTemplateColumns: 'repeat(5,1fr)' }}>
          <KpiCard variant="blue"   icon="ti-users"       label="عدد الزبائن"        value={data.summary.total_customers}/>
          <KpiCard variant="green"  icon="ti-trending-up"  label="إجمالي المبيعات HT" value={MONEY(data.summary.total_ht)}/>
          <KpiCard variant="orange" icon="ti-discount"     label="الخصومات"           value={MONEY(data.summary.total_discount)}/>
          <KpiCard variant="red"    icon="ti-clock"        label="إجمالي المتبقي"     value={MONEY(data.summary.total_remaining)}/>
          <KpiCard variant="teal"   icon="ti-receipt"      label="إجمالي TTC"         value={MONEY(data.summary.total_ttc)}/>
        </div>
        {data.product_recap && data.product_recap.length > 0 && (
          <div style={{ display: 'flex', gap: 8, margin: '16px 0 8px' }}>
            <Button size="xs" variant={tab === 'table' ? 'primary' : 'ghost'} onClick={() => setTab('table')}>الزبائن ({data.customers.length})</Button>
            <Button size="xs" variant={tab === 'products' ? 'primary' : 'ghost'} onClick={() => setTab('products')}>ملخص المنتجات ({data.product_recap.length})</Button>
          </div>
        )}
        {tab === 'table' && (
          <Card noHeader style={{ padding: 0 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.id ?? '')}
              rowClassName={(row, _index) => (row as any).__isSummary ? 'tw-sr' : ''}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'name', label: 'الاسم', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'code', label: 'الكود', render: (v) => <span style={{ color: 'var(--t4)' }}>{(v as string) ?? '—'}</span> },
                { key: 'phone', label: 'الهاتف', render: (v) => (v as string) ?? '—' },
                { key: 'wilaya', label: 'الولاية', render: (v) => (v as string) ?? '—' },
                { key: 'doc_count', label: 'عدد الوثائق' },
                { key: 'total_ht', label: 'المبيعات HT', render: (v) => FMT(v as number) },
                { key: 'total_paid', label: 'المدفوع', render: (v) => <span style={{ color: 'var(--em)' }}>{FMT(v as number)}</span> },
                { key: 'total_remaining', label: 'المتبقي', render: (v) => <span style={{ color: (v as number) > 0 ? 'var(--red)' : 'var(--em)', fontWeight: 700 }}>{FMT(v as number)}</span> },
                { key: 'action', label: '', render: (_v, row) => {
                  const r = row as any;
                  return r.__isSummary ? null : r.doc_count > 0 ? <Button size="xs" variant="gray" icon={<i className="ti ti-history"/>} onClick={() => openHistory(r.id, r.name)}>كشف حساب</Button> : null;
                }},
              ]}
              data={customersData}
            />
          </Card>
        )}
        {tab === 'products' && data.product_recap && (
          <Card noHeader style={{ padding: 0 }}>
            <SimpleTable
              rowKey={(row) => (row as any).__isSummary ? '__summary__' : String(row.product_id ?? '')}
              rowClassName={(row, _index) => (row as any).__isSummary ? 'tw-sr' : ''}
              columns={[
                { key: '_idx', label: '#' },
                { key: 'product_name', label: 'المنتج', render: (v) => <span style={{ fontWeight: 700 }}>{v as string}</span> },
                { key: 'product_ref', label: 'المرجع', render: (v) => <span style={{ color: 'var(--t4)' }}>{v as string}</span> },
                { key: 'total_qty', label: 'الكمية' },
                { key: 'total_ht', label: 'HT', render: (v) => FMT(v as number) },
                { key: 'total_discount', label: 'الخصم', render: (v) => (v as number) > 0 ? <span style={{ color: 'var(--orange)' }}>{FMT(v as number)}</span> : '—' },
                { key: 'total_ttc', label: 'TTC', render: (v) => FMT(v as number) },
              ]}
              data={productsData}
            />
          </Card>
        )}
      </>
    )}
    {historyParty && (
      <TransactionHistoryModal
        open={historyOpen}
        partyId={historyParty.id}
        partyName={historyParty.name}
        date={toDate}
        onClose={() => setHistoryOpen(false)}
        navigate={navigate}
      />
    )}
  </ReportShell>;
}

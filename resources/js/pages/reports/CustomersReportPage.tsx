import React, { useState, useCallback } from 'react';
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
            <div className="tw">
              <table>
                <thead>
                  <tr><th>#</th><th>الاسم</th><th>الكود</th><th>الهاتف</th><th>الولاية</th><th>عدد الوثائق</th><th>المبيعات HT</th><th>المدفوع</th><th>المتبقي</th><th></th></tr>
                </thead>
                <tbody>
                  {data.customers.map((row, i) => (
                    <tr key={row.id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{row.name}</td>
                      <td style={{ color: 'var(--t4)' }}>{row.code ?? '—'}</td>
                      <td>{row.phone ?? '—'}</td>
                      <td>{row.wilaya ?? '—'}</td>
                      <td>{row.doc_count}</td>
                      <td>{FMT(row.total_ht)}</td>
                      <td style={{ color: 'var(--em)' }}>{FMT(row.total_paid)}</td>
                      <td style={{ color: row.total_remaining > 0 ? 'var(--red)' : 'var(--em)', fontWeight: 700 }}>{FMT(row.total_remaining)}</td>
                      <td>
                        {row.doc_count > 0 && (
                          <Button size="xs" variant="gray" icon={<i className="ti ti-history"/>} onClick={() => openHistory(row.id, row.name)}>كشف حساب</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={5}>الإجمالي ({data.customers.length})</td>
                    <td>{data.customers.reduce((s, r) => s + r.doc_count, 0)}</td>
                    <td>{FMT(data.customers.reduce((s, r) => s + r.total_ht, 0))}</td>
                    <td style={{ color: 'var(--em)' }}>{FMT(data.customers.reduce((s, r) => s + r.total_paid, 0))}</td>
                    <td style={{ color: 'var(--red)' }}>{FMT(data.summary.total_remaining)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
        {tab === 'products' && data.product_recap && (
          <Card noHeader style={{ padding: 0 }}>
            <div className="tw">
              <table>
                <thead><tr><th>#</th><th>المنتج</th><th>المرجع</th><th>الكمية</th><th>HT</th><th>الخصم</th><th>TTC</th></tr></thead>
                <tbody>
                  {data.product_recap.map((p, i) => (
                    <tr key={p.product_id}>
                      <td style={{ color: 'var(--t4)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 700 }}>{p.product_name}</td>
                      <td style={{ color: 'var(--t4)' }}>{p.product_ref}</td>
                      <td>{p.total_qty}</td>
                      <td>{FMT(p.total_ht)}</td>
                      <td style={{ color: p.total_discount > 0 ? 'var(--orange)' : undefined }}>{p.total_discount > 0 ? FMT(p.total_discount) : '—'}</td>
                      <td>{FMT(p.total_ttc)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ fontWeight: 800, background: 'var(--bg2)' }}>
                    <td colSpan={3}>الإجمالي ({data.product_recap.length} منتج)</td>
                    <td>{data.product_recap.reduce((s, r) => s + r.total_qty, 0)}</td>
                    <td>{FMT(data.product_recap.reduce((s, r) => s + r.total_ht, 0))}</td>
                    <td style={{ color: data.summary.total_discount > 0 ? 'var(--orange)' : undefined }}>{data.summary.total_discount > 0 ? FMT(data.summary.total_discount) : '—'}</td>
                    <td>{FMT(data.product_recap.reduce((s, r) => s + r.total_ttc, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
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

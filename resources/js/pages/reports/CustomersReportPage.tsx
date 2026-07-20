import React, { useState, useCallback } from 'react';
import ReportShell from './ReportShell';
import ReportDateFilter from './ReportDateFilter';
import { FMT, MONEY } from './helpers';
import { useCustomersReport } from '@/lib/api/endpoints/reports';
import { usePartyBalanceHistory, usePartyProductRecap } from '@/lib/api/endpoints/partyBalances';
import { exportToExcel } from './exportUtils';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const def = { from: new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) };

export default function CustomersReportPage() {
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
      headers: ['#', 'الاسم', 'الكود', 'الهاتف', 'الولاية', 'عدد الوثائق', 'المبيعات HT', 'الخصم', 'المدفوع', 'المتبقي'],
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

  return <ReportShell title="تقرير الزبائن" subtitle={`${fromDate} → ${toDate}`} isLoading={isLoading} isError={isError} refetch={refetch} reportId="customers">
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
      <CustomerHistoryModal
        open={historyOpen}
        partyId={historyParty.id}
        partyName={historyParty.name}
        onClose={() => setHistoryOpen(false)}
      />
    )}
  </ReportShell>;
}

function CustomerHistoryModal({ open, partyId, partyName, onClose }: { open: boolean; partyId: number; partyName: string; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [modalTab, setModalTab] = useState<'transactions' | 'products'>('transactions');
  const { data: historyData, isLoading: histLoading } = usePartyBalanceHistory(partyId, today);
  const { data: recapData, isLoading: recapLoading } = usePartyProductRecap(partyId, today);

  const transactions = historyData?.transactions ?? [];
  const openingBalance = historyData?.opening_balance ?? 0;
  const products = recapData?.products ?? [];

  let running = openingBalance;
  const txWithBalance = transactions.map(tx => {
    running += tx.document_amount - tx.payment_amount;
    return { ...tx, running_balance: Math.round(running * 100) / 100 };
  });

  const loading = histLoading || recapLoading;

  return (
    <Modal open={open} onClose={onClose} size="xl" title={`كشف حساب – ${partyName}`}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--color-border-secondary)' }}>
        <button onClick={() => setModalTab('transactions')} style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', borderBottom: modalTab === 'transactions' ? '2px solid var(--em)' : '2px solid transparent', marginBottom: -2, background: modalTab === 'transactions' ? 'var(--color-background-secondary)' : 'transparent', color: modalTab === 'transactions' ? 'var(--em)' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: modalTab === 'transactions' ? 700 : 500, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-list" style={{ fontSize: 15 }} /> المعاملات <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: modalTab === 'transactions' ? 'var(--em)' : 'var(--color-border-tertiary)', color: modalTab === 'transactions' ? '#fff' : 'var(--color-text-tertiary)', fontWeight: 600 }}>{transactions.length}</span>
        </button>
        <button onClick={() => setModalTab('products')} style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', borderBottom: modalTab === 'products' ? '2px solid var(--em)' : '2px solid transparent', marginBottom: -2, background: modalTab === 'products' ? 'var(--color-background-secondary)' : 'transparent', color: modalTab === 'products' ? 'var(--em)' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: modalTab === 'products' ? 700 : 500, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
          <i className="ti ti-package" style={{ fontSize: 15 }} /> المنتجات <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 10, background: modalTab === 'products' ? 'var(--em)' : 'var(--color-border-tertiary)', color: modalTab === 'products' ? '#fff' : 'var(--color-text-tertiary)', fontWeight: 600 }}>{products.length}</span>
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 8, color: 'var(--color-text-secondary)' }}>جاري التحميل...</div>
        </div>
      ) : modalTab === 'transactions' ? (
        transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
            <i className="ti ti-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
            لا توجد معاملات
          </div>
        ) : (
          <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                <tr style={{ borderBottom: '2px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>التاريخ</th>
                  <th style={thStyle}>البيان</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>المستندات</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>الدفعات</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>الرصيد</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: 'var(--color-background-secondary)', fontWeight: 600 }}>
                  <td style={tdStyle}>—</td>
                  <td style={tdStyle}>—</td>
                  <td style={tdStyle}><i className="ti ti-building-bank" style={{ marginLeft: 4 }} /> رصيد افتتاحي</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{FMT(openingBalance)}</td>
                </tr>
                {txWithBalance.map((tx) => (
                  <tr key={`${tx.type}-${tx.id}`} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                    <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontSize: 11 }}>{tx.seq}</td>
                    <td style={tdStyle}>{tx.date}</td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Badge variant={tx.type === 'document' ? 'danger' : 'success'} style={{ fontSize: 11 }}>{tx.label}</Badge>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>{tx.reference || '—'}</span>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: tx.document_amount > 0 ? 600 : undefined }}>
                      {tx.document_amount !== 0 ? <span style={{ color: tx.document_amount > 0 ? 'var(--em)' : 'var(--red)' }}>{tx.document_amount > 0 ? '+' : ''}{FMT(tx.document_amount)}</span> : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: tx.payment_amount > 0 ? 600 : undefined }}>
                      {tx.payment_amount !== 0 ? <span style={{ color: 'var(--red)' }}>-{FMT(tx.payment_amount)}</span> : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700, color: tx.running_balance >= 0 ? 'var(--red)' : 'var(--em)' }}>
                      {FMT(tx.running_balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
            <i className="ti ti-package" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
            لا توجد منتجات
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>المنتج</th>
                  <th style={thStyle}>المرجع</th>
                  <th style={thStyle}>المجموعة</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>كمية البيع</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>مبيعات HT</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>TTC</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>عدد المستندات</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.product_id} style={{ borderBottom: '1px solid var(--color-border-tertiary)' }}>
                    <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{p.product_name}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{p.product_ref || '—'}</td>
                    <td style={tdStyle}>{p.family_name || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{p.sale_qty || '—'}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{FMT(p.total_ht)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{FMT(p.total_ttc)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{p.doc_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <div style={{ textAlign: 'center', marginTop: 12 }}>
        <Button onClick={onClose}>إغلاق</Button>
      </div>
    </Modal>
  );
}

const thStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', borderBottom: '2px solid var(--color-border-secondary)' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid var(--color-border-tertiary)' };

// ════════════════════════════════════════════════════════════════════════════
// pages/finance/BankReconciliationPage.tsx
// المطابقة البنكية — صفحة مستقلة
// ════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { useReconciliationQueries, useReconciliationMutations } from '@/lib/api/endpoints/reconciliation';
import type { ReconciledPayment } from '@/lib/api/endpoints/reconciliation';
import PageHeader from '@/components/ui/PageHeader';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { useConfirm } from '@/hooks/useConfirm';

const fmtDZD = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function BankReconciliationPage() {
  const { unreconciled, reconciled } = useReconciliationQueries();
  const mutations = useReconciliationMutations();
  const deleteConfirm = useConfirm();

  const [tab, setTab] = useState<'unreconciled' | 'reconciled'>('unreconciled');
  const [bankRefInput, setBankRefInput] = useState<Record<number, string>>({});

  const handleReconcile = (paymentId: number) => {
    const ref = bankRefInput[paymentId]?.trim();
    if (!ref) return;
    mutations.reconcile.mutate(
      { payment_id: paymentId, bank_reference: ref },
      { onSuccess: () => setBankRefInput(prev => { const n = { ...prev }; delete n[paymentId]; return n; }) },
    );
  };

  const handleUnreconcile = async (paymentId: number) => {
    if (await deleteConfirm.confirm('تأكيد إلغاء المطابقة؟')) {
      mutations.unreconcile.mutate(paymentId);
    }
  };

  const unreconciledCount = unreconciled.data?.length ?? 0;
  const reconciledCount = reconciled.data?.length ?? 0;

  return (
    <div className="page-container">
      <PageHeader
        title="المطابقة البنكية"
        description="مطابقة المدفوعات مع حسابات البنك"
        breadcrumb={[
          { label: 'المحاسبة', href: '/finance' },
          { label: 'المطابقة البنكية' },
        ]}
        badge={
          unreconciledCount > 0
            ? { label: `${unreconciledCount} في الانتظار`, variant: 'warning' }
            : { label: 'مطابق', variant: 'success' }
        }
      />

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTab('unreconciled')}
            className={`tab-pill ${tab === 'unreconciled' ? 'active' : ''}`}
          >
            <i className="ti ti-clock" style={{ marginLeft: 6, fontSize: 13 }} />
            غير مطابقة
            <span style={{
              marginRight: 6, fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 10,
              background: tab === 'unreconciled' ? 'rgba(255,255,255,0.25)' : 'var(--bg4)',
              color: tab === 'unreconciled' ? '#fff' : 'var(--t4)',
            }}>
              {unreconciledCount}
            </span>
          </button>
          <button
            onClick={() => setTab('reconciled')}
            className={`tab-pill ${tab === 'reconciled' ? 'active' : ''}`}
          >
            <i className="ti ti-circle-check" style={{ marginLeft: 6, fontSize: 13 }} />
            مطابقة
            <span style={{
              marginRight: 6, fontSize: 10, fontWeight: 700,
              padding: '1px 6px', borderRadius: 10,
              background: tab === 'reconciled' ? 'rgba(255,255,255,0.25)' : 'var(--bg4)',
              color: tab === 'reconciled' ? '#fff' : 'var(--t4)',
            }}>
              {reconciledCount}
            </span>
          </button>
        </div>
      </div>

      {/* ── Unreconciled Tab ────────────────────────────────────────── */}
      {tab === 'unreconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unreconciled.isLoading ? (
            <div className="card"><Skeleton variant="table" rows={4} /></div>
          ) : unreconciledCount === 0 ? (
            <div className="card">
              <EmptyState icon="ti-circle-check" text="جميع المدفوعات مطابقة" sub="لا توجد مدفوعات في انتظار المطابقة" />
            </div>
          ) : (
            unreconciled.data?.map((p) => (
              <div key={p.id} className="card recon-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Party info */}
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', marginBottom: 4 }}>
                    {p.party_name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-hash" style={{ fontSize: 11 }} />
                      {p.payment_number}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-calendar" style={{ fontSize: 11 }} />
                      {p.payment_date}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-wallet" style={{ fontSize: 11 }} />
                      {p.payment_mode}
                    </span>
                    {p.reference && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <i className="ti ti-link" style={{ fontSize: 11 }} />
                        {p.reference}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>
                  {fmtDZD(p.amount)}
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--t4)', marginRight: 2 }}>دج</span>
                </div>

                {/* Bank reference input */}
                <input
                  type="text"
                  placeholder="مرجع البنك..."
                  value={bankRefInput[p.id] ?? ''}
                  onChange={(e) => setBankRefInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleReconcile(p.id); }}
                  className="recon-input"
                />

                {/* Reconcile button */}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleReconcile(p.id)}
                  disabled={!bankRefInput[p.id]?.trim() || mutations.reconcile.isPending}
                  loading={mutations.reconcile.isPending}
                >
                  تطابق
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Reconciled Tab ──────────────────────────────────────────── */}
      {tab === 'reconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reconciled.isLoading ? (
            <div className="card"><Skeleton variant="table" rows={4} /></div>
          ) : reconciledCount === 0 ? (
            <div className="card">
              <EmptyState icon="ti-arrows-exchange" text="لا توجد مطابقات سابقة" sub="لم يتم مطابقة أي مدفوعات بعد" />
            </div>
          ) : (
            reconciled.data?.map((p) => (
              <div key={p.id} className="card recon-card" style={{ display: 'flex', alignItems: 'center', gap: 14, opacity: 0.85 }}>
                {/* Party info */}
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)', marginBottom: 4 }}>
                    {p.party_name}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--t4)', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-hash" style={{ fontSize: 11 }} />
                      {p.payment_number}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <i className="ti ti-calendar" style={{ fontSize: 11 }} />
                      {p.payment_date}
                    </span>
                    <Badge variant="success" noDot>
                      <i className="ti ti-check" style={{ marginLeft: 4, fontSize: 10 }} />
                      مطابق
                    </Badge>
                  </div>
                </div>

                {/* Amount */}
                <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>
                  {fmtDZD(p.amount)}
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--t4)', marginRight: 2 }}>دج</span>
                </div>

                {/* Bank reference */}
                <div style={{
                  fontSize: 11, color: 'var(--t2)', fontFamily: 'monospace',
                  background: 'var(--bg3)', padding: '4px 10px', borderRadius: 'var(--r1)',
                  border: '1px solid var(--b1)', whiteSpace: 'nowrap',
                }}>
                  {p.bank_reference}
                </div>

                {/* Unreconcile button */}
                <button
                  onClick={() => handleUnreconcile(p.id)}
                  disabled={mutations.unreconcile.isPending}
                  title="إلغاء المطابقة"
                  className="recon-action-btn"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <style>{`
        .page-container { padding: 20px 24px; max-width: 1200px; margin: 0 auto; direction: rtl; }
        .tab-pill {
          padding: 6px 14px; border-radius: 99px; border: none;
          font-size: 12px; font-weight: 600; cursor: pointer;
          background: var(--bg3); color: var(--t3);
          transition: all .15s; font-family: inherit;
          display: inline-flex; align-items: center;
        }
        .tab-pill:hover { background: var(--bg4); color: var(--t2); }
        .tab-pill.active { background: var(--em); color: #fff; }
        .recon-card { transition: transform .15s, box-shadow .15s; }
        .recon-card:hover { transform: translateY(-1px); box-shadow: var(--shadow2); }
        .recon-input {
          padding: 6px 10px; border-radius: var(--r1);
          border: 1px solid var(--b3); background: var(--bg1);
          color: var(--t1); font-size: 12px; font-family: inherit;
          width: 140px; outline: none; transition: border-color .15s;
        }
        .recon-input:focus { border-color: var(--em); }
        .recon-action-btn {
          width: 30px; height: 30px; border-radius: var(--r1);
          border: 1px solid var(--b1); background: var(--bg2);
          color: var(--t3); font-size: 14px; cursor: pointer;
          display: inline-flex; align-items: center; justify-content: center;
          transition: all .15s; flex-shrink: 0;
        }
        .recon-action-btn:hover { background: var(--redb); color: var(--red); border-color: var(--redbo); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

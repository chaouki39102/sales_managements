// ════════════════════════════════════════════════════════════════════════════
// pages/finance/BankReconciliationPage.tsx
// المطابقة البنكية — صفحة مستقلة
// ════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { useReconciliationQueries, useReconciliationMutations } from '@/lib/api/endpoints/reconciliation';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import Skeleton from '@/components/ui/Skeleton';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

import { fmtDZD } from '@/lib/format';

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
    <div className="recon-page-container">
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
      <Card noHeader padding={12} style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            onClick={() => setTab('unreconciled')}
            className={`recon-tab-pill ${tab === 'unreconciled' ? 'active' : ''}`}
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
            className={`recon-tab-pill ${tab === 'reconciled' ? 'active' : ''}`}
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
      </Card>

      {/* ── Unreconciled Tab ────────────────────────────────────────── */}
      {tab === 'unreconciled' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {unreconciled.isLoading ? (
            <Card noHeader><Skeleton variant="table" rows={4} /></Card>
          ) : unreconciledCount === 0 ? (
            <Card noHeader>
              <EmptyState icon="ti-circle-check" text="جميع المدفوعات مطابقة" sub="لا توجد مدفوعات في انتظار المطابقة" />
            </Card>
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
            <Card noHeader><Skeleton variant="table" rows={4} /></Card>
          ) : reconciledCount === 0 ? (
            <Card noHeader>
              <EmptyState icon="ti-arrows-exchange" text="لا توجد مطابقات سابقة" sub="لم يتم مطابقة أي مدفوعات بعد" />
            </Card>
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


      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

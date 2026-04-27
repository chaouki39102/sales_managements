// resources/js/pages/finance/TreasuryAccountsPage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import Switch from '@/components/ui/Switch';
import apiClient from '@/lib/api/client';

interface TreasuryAccount {
  id: number;
  name: string;
  code: string | null;
  treasury_account_type_id: number;
  type_name?: string;
  bank_name?: string;
  account_number?: string;
  rib?: string;
  iban?: string;
  swift_bic?: string;
  currency: string;
  initial_balance: number;
  current_balance: number;
  is_default: boolean;
  active: boolean;
  notes?: string;
  relations?: {
    treasuryAccountType?: { id: number; name: string };
  };
}

export default function TreasuryAccountsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [editing, setEditing] = useState<TreasuryAccount | null>(null);
  const modal = useModal();
  const deleteModal = useModal();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch accounts
  const { data: accounts, isLoading } = useQuery<TreasuryAccount[]>({
    queryKey: ['treasury-accounts', search, typeFilter],
    queryFn: () => apiClient.get('/treasury-accounts', {
      params: {
        search: search || undefined,
        'filter[treasury_account_type_id]': typeFilter || undefined,
        include: 'treasuryAccountType',
      },
    }).then(r => r.data.data),
  });

  // Fetch types
  const { data: accountTypes } = useQuery({
    queryKey: ['treasury-account-types'],
    queryFn: () => apiClient.get('/treasury-account-types').then(r => r.data.data),
    staleTime: Infinity,
  });

  const bankAccounts = accounts?.filter(a => a.relations?.treasuryAccountType?.name === 'bank') || [];
  const cashAccounts = accounts?.filter(a => a.relations?.treasuryAccountType?.name === 'cash') || [];
  const totalBank = bankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);
  const totalCash = cashAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/treasury-accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
      deleteModal.closeModal();
    },
    onError: (err: any) => setError(err?.response?.data?.message || 'فشل الحذف'),
  });

  const openAdd = () => { setEditing(null); modal.openModal(); };
  const openEdit = (acc: TreasuryAccount) => { setEditing(acc); modal.openModal(); };
  const handleDelete = (id: number) => { setDeletingId(id); deleteModal.openModal(); };
  const confirmDelete = () => { if (deletingId) deleteMutation.mutate(deletingId); };

  if (error) return <AlertBar variant="red">{error}</AlertBar>;

  return (
    <div className="page on" id="p-treasury-accounts">
      <PageHeader
        title="الحسابات المالية"
        subtitle={`إدارة الحسابات البنكية والصناديق — ${accounts?.length || 0} حساب`}
        actions={<Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>} onClick={openAdd}>حساب جديد</Button>}
      />

      <div className="kpis" style={{ marginBottom: 20 }}>
        <KpiCard variant="blue" icon="ti-building-bank" label="الرصيد البنكي" value={totalBank.toLocaleString('fr-DZ')} unit="دج" />
        <KpiCard variant="green" icon="ti-cash" label="الرصيد النقدي" value={totalCash.toLocaleString('fr-DZ')} unit="دج" />
        <KpiCard variant="purple" icon="ti-wallet" label="إجمالي الأرصدة" value={(totalBank + totalCash).toLocaleString('fr-DZ')} unit="دج" />
        <KpiCard variant="gold" icon="ti-list" label="عدد الحسابات" value={accounts?.length || 0} />
      </div>

      <div className="filters" style={{ marginBottom: 16 }}>
        <div className="srch" style={{ flex: 1, display: 'flex' }}>
          <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
          <input type="text" placeholder="ابحث باسم أو كود الحساب..." onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ width: 150 }}>
          <option value="">كل الأنواع</option>
          {accountTypes?.map((t: any) => <option key={t.id} value={t.id}>{t.label || t.name}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
      ) : !accounts?.length ? (
        <EmptyState icon="ti-building-bank" text="لا توجد حسابات مالية" sub="أضف أول حساب" action={<Button variant="primary" onClick={openAdd}>حساب جديد</Button>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {bankAccounts.length > 0 && (
            <Card noHeader style={{ padding: 0 }}>
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th>الاسم</th><th>الكود</th><th>البنك</th><th>الرصيد</th><th>الافتراضي</th><th>نشط</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bankAccounts.map(acc => (
                      <tr key={acc.id}>
                        <td className="s">{acc.name}</td>
                        <td className="m">{acc.code || '—'}</td>
                        <td>{acc.bank_name || '—'}</td>
                        <td className="e">{acc.current_balance?.toLocaleString('fr-DZ')} دج</td>
                        <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                        <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                        <td>
                          <Button size="xs" onClick={() => openEdit(acc)}><i className="ti ti-pencil"/></Button>
                          <Button size="xs" variant="danger" onClick={() => handleDelete(acc.id)}><i className="ti ti-trash"/></Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {cashAccounts.length > 0 && (
            <Card noHeader style={{ padding: 0 }}>
              {/* جدول مشابه للصناديق */}
            </Card>
          )}
        </div>
      )}

      <TreasuryAccountModal
        open={modal.open}
        account={editing}
        accountTypes={accountTypes || []}
        onClose={modal.closeModal}
      />

      <ConfirmDeleteModal open={deleteModal.open} onClose={deleteModal.closeModal} onConfirm={confirmDelete} loading={deleteMutation.isPending} />
    </div>
  );
}

// مكون المودال (اكتبه بنفس النمط الموجود في FinancePage)
function TreasuryAccountModal({ open, account, accountTypes, onClose }: { ... }) { ... }
function ConfirmDeleteModal({ ... }: { ... }) { ... }

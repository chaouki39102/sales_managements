// resources/js/pages/finance/FinancePage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useTreasuryAccounts, usePaymentModes, useTreasuryAccountTypes } from '@/hooks/useData';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import apiClient from '@/lib/api/client';
import type { TreasuryAccount, PaymentMode, TreasuryAccountType } from '@/types';

export default function FinancePage() {
    const [activeTab, setActiveTab] = useState('accounts');
    const accountModal = useModal();
    const modeModal = useModal();
    const qc = useQueryClient();

    const { data: accounts, isLoading: loadingAccounts } = useTreasuryAccounts();
    const { data: paymentModes, isLoading: loadingModes } = usePaymentModes();
    const { data: accountTypes } = useTreasuryAccountTypes();

    const totalBalance = accounts?.reduce((sum: number, acc: TreasuryAccount) => sum + acc.balance, 0) ?? 0;
    const bankBalance = accounts?.filter((a: TreasuryAccount) => a.type === 'bank').reduce((sum: number, acc: TreasuryAccount) => sum + acc.balance, 0) ?? 0;
    const cashBalance = accounts?.filter((a: TreasuryAccount) => a.type === 'cash').reduce((sum: number, acc: TreasuryAccount) => sum + acc.balance, 0) ?? 0;

    const deleteAccount = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/treasury-accounts/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['treasury-accounts'] }),
    });

    return (
        <div className="page on" id="p-finance">
            <PageHeader
                title="الخزينة والمالية"
                subtitle="إدارة الحسابات البنكية والصناديق وطرق الدفع"
                actions={
                    <>
                        <Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>} onClick={activeTab === 'accounts' ? accountModal.openModal : modeModal.openModal}>
                            {activeTab === 'accounts' ? 'حساب جديد' : 'طريقة دفع جديدة'}
                        </Button>
                    </>
                }
            />

            <div className="tabs" style={{ marginBottom: 20 }}>
                <div className={`tab ${activeTab === 'accounts' ? 'on' : ''}`} onClick={() => setActiveTab('accounts')}>الحسابات والصناديق</div>
                <div className={`tab ${activeTab === 'modes' ? 'on' : ''}`} onClick={() => setActiveTab('modes')}>طرق الدفع</div>
            </div>

            <div className="kpis" style={{ marginBottom: 16 }}>
                <KpiCard variant="green" icon="ti-wallet" label="إجمالي الأرصدة" value={totalBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
                <KpiCard variant="blue" icon="ti-building-bank" label="الرصيد البنكي" value={bankBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
                <KpiCard variant="gold" icon="ti-cash" label="الرصيد النقدي" value={cashBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
                <KpiCard variant="purple" icon="ti-file-text" label="عدد الحسابات" value={accounts?.length ?? 0} />
            </div>

            {activeTab === 'accounts' && (
                <Card title="الحسابات البنكية والصناديق" noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>النوع</th>
                                    <th>الكود</th>
                                    <th>البنك</th>
                                    <th>الرصيد الحالي</th>
                                    <th>الافتراضي</th>
                                    <th>الحالة</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingAccounts ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)' }}>جاري التحميل...</td></tr>
                                ) : accounts?.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)' }}>لا توجد حسابات</td></tr>
                                ) : accounts?.map((acc: TreasuryAccount) => (
                                    <tr key={acc.id}>
                                        <td className="s">{acc.name}</td>
                                        <td><Badge variant={acc.type === 'bank' ? 'info' : 'warning'}>{acc.type === 'bank' ? 'حساب بنكي' : 'صندوق نقدي'}</Badge></td>
                                        <td className="m">{acc.code ?? '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--t3)' }}>{acc.type === 'bank' ? acc.name : '—'}</td>
                                        <td className="e">{acc.balance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                        <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                        <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                <Button size="xs" icon={<i className="ti ti-pencil"/>} />
                                                <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteAccount.mutate(acc.id)} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'modes' && (
                <Card title="طرق الدفع" noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>الكود</th>
                                    <th>الحساب المرتبط</th>
                                    <th>يتطلب مرجع</th>
                                    <th>الحالة</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingModes ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)' }}>جاري التحميل...</td></tr>
                                ) : paymentModes?.length === 0 ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)' }}>لا توجد طرق دفع</td></tr>
                                ) : paymentModes?.map((mode: PaymentMode) => (
                                    <tr key={mode.id}>
                                        <td className="s">{mode.name}</td>
                                        <td className="m">{mode.code}</td>
                                        <td style={{ fontSize: 12, color: 'var(--t3)' }}>—</td>
                                        <td>{mode.requires_reference ? 'نعم' : 'لا'}</td>
                                        <td><Badge variant={mode.active ? 'success' : 'danger'}>{mode.active ? 'نشط' : 'موقوف'}</Badge></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                <Button size="xs" icon={<i className="ti ti-pencil"/>} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <AccountModal open={accountModal.open} onClose={accountModal.closeModal} />
        </div>
    );
}

function AccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const { data: accountTypes } = useTreasuryAccountTypes();

    const [form, setForm] = useState({
        name: '',
        code: '',
        treasury_account_type_id: '',
        bank_name: '',
        account_number: '',
        rib: '',
        initial_balance: '0',
        is_default: false,
    });

    const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => apiClient.post('/treasury-accounts', {
            ...data,
            treasury_account_type_id: parseInt(data.treasury_account_type_id) || null,
            initial_balance: parseFloat(data.initial_balance) || 0,
        }),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['treasury-accounts'] }); onClose(); },
    });

    return (
        <Modal open={open} onClose={onClose} title="حساب مالي جديد" size="md"
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" onClick={() => saveMutation.mutate(form)} disabled={!form.name || saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>
            <div className="fgrid">
                <div className="fg s2">
                    <label className="req">اسم الحساب</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: الصندوق الرئيسي" />
                </div>
                <div className="fg">
                    <label>الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="CP01" />
                </div>
                <div className="fg">
                    <label className="req">النوع</label>
                    <select value={form.treasury_account_type_id} onChange={e => set('treasury_account_type_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {accountTypes?.map((at: TreasuryAccountType) => (
                            <option key={at.id} value={at.id}>{at.label}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>اسم البنك</label>
                    <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} />
                </div>
                <div className="fg">
                    <label>رقم الحساب</label>
                    <input value={form.account_number} onChange={e => set('account_number', e.target.value)} style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>RIB</label>
                    <input value={form.rib} onChange={e => set('rib', e.target.value)} style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>الرصيد الافتتاحي</label>
                    <div className="inp-row">
                        <input type="number" value={form.initial_balance} onChange={e => set('initial_balance', e.target.value)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

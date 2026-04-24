// resources/js/pages/finance/FinancePage.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import Switch from '@/components/ui/Switch';
import EmptyState from '@/components/ui/EmptyState';
import AlertBar from '@/components/ui/AlertBar';
import apiClient from '@/lib/api/client';
import type { TreasuryAccount, PaymentMode } from '@/types';

// ===============================================
// MAIN COMPONENT
// ===============================================
export default function FinancePage() {
    const [activeTab, setActiveTab] = useState(0);
    const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
    const [editingMode, setEditingMode] = useState<PaymentMode | null>(null);
    const accountModal = useModal();
    const modeModal = useModal();
    const qc = useQueryClient();

    // جلب الحسابات المالية
    const { data: accounts, isLoading: loadingAccounts, error: accountsError } = useQuery({
        queryKey: ['treasury-accounts'],
        queryFn: () => apiClient.get('/treasury-accounts').then(r => r.data.data),
    });

    // جلب طرق الدفع
    const { data: paymentModes, isLoading: loadingModes } = useQuery({
        queryKey: ['payment-modes'],
        queryFn: () => apiClient.get('/payment-modes').then(r => r.data.data),
    });

    // تحويل البيانات: treasuryAccountType يحتوي على name وليس type مباشرة
    const enrichAccounts = accounts?.map((acc: any) => ({
        ...acc,
        type: acc.relations?.treasuryAccountType?.name === 'cash' ? 'cash' : 'bank',
    })) || [];

    const totalBalance = enrichAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0) || 0;
    const bankAccounts = enrichAccounts.filter((a: any) => a.type === 'bank');
    const cashAccounts = enrichAccounts.filter((a: any) => a.type === 'cash');
    const bankBalance = bankAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);
    const cashBalance = cashAccounts.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0);

    // حذف حساب
    const deleteAccount = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/treasury-accounts/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
        },
    });

    // حذف طريقة دفع
    const deleteMode = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/payment-modes/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payment-modes'] });
        },
    });

    const openAddAccount = () => { setEditingAccount(null); accountModal.openModal(); };
    const openEditAccount = (account: TreasuryAccount) => { setEditingAccount(account); accountModal.openModal(); };
    const openAddMode = () => { setEditingMode(null); modeModal.openModal(); };
    const openEditMode = (mode: PaymentMode) => { setEditingMode(mode); modeModal.openModal(); };

    return (
        <div className="page on" id="p-finance">
            <PageHeader
                title="الخزينة والمالية"
                subtitle="إدارة الحسابات البنكية والصناديق وطرق الدفع"
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-plus"/>}
                        onClick={activeTab === 0 ? openAddAccount : openAddMode}>
                        {activeTab === 0 ? 'حساب جديد' : 'طريقة دفع جديدة'}
                    </Button>
                }
            />

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 20 }}>
                <div className={`tab ${activeTab === 0 ? 'on' : ''}`} onClick={() => setActiveTab(0)}>
                    <span className="ic ic-xs"><i className="ti ti-building-bank"/></span>
                    الحسابات والصناديق
                </div>
                <div className={`tab ${activeTab === 1 ? 'on' : ''}`} onClick={() => setActiveTab(1)}>
                    <span className="ic ic-xs"><i className="ti ti-credit-card"/></span>
                    طرق الدفع
                </div>
            </div>

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-wallet" label="إجمالي الأرصدة"
                    value={totalBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${enrichAccounts.length} حساب`} />
                <KpiCard variant="blue" icon="ti-building-bank" label="الرصيد البنكي"
                    value={bankBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${bankAccounts.length} حساب بنكي`} />
                <KpiCard variant="gold" icon="ti-cash-register" label="الرصيد النقدي"
                    value={cashBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${cashAccounts.length} صندوق`} />
                <KpiCard variant="purple" icon="ti-credit-card" label="طرق الدفع"
                    value={paymentModes?.length ?? 0}
                    sub={`${paymentModes?.filter((m: PaymentMode) => m.active).length ?? 0} نشطة`} />
            </div>

            {/* رسالة خطأ إذا فشل جلب البيانات */}
            {accountsError && (
                <AlertBar variant="red">
                    فشل جلب الحسابات المالية. تأكد من اتصالك بالخادم.
                </AlertBar>
            )}

            {/* ACCOUNTS TAB */}
            {activeTab === 0 && (
                loadingAccounts ? (
                    <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
                ) : enrichAccounts.length === 0 ? (
                    <EmptyState
                        icon="ti-building-bank"
                        text="لا توجد حسابات مالية"
                        sub="أضف أول حساب بنكي أو صندوق نقدي للبدء"
                        action={<Button variant="primary" onClick={openAddAccount}>إضافة حساب جديد</Button>}
                    />
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Bank Accounts */}
                        {bankAccounts.length > 0 && (
                            <Card
                                title={<><span className="ic ic-sm" style={{ color: 'var(--blue)' }}><i className="ti ti-building-bank"/></span> الحسابات البنكية</>}
                                noHeader
                                style={{ padding: 0 }}
                            >
                                <div className="tw">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>الاسم</th>
                                                <th>الكود</th>
                                                <th>البنك</th>
                                                <th>رقم الحساب</th>
                                                <th>الرصيد</th>
                                                <th>الافتراضي</th>
                                                <th>الحالة</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bankAccounts.map((acc: any) => (
                                                <tr key={acc.id}>
                                                    <td className="s">{acc.name}</td>
                                                    <td className="m">{acc.code || '—'}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>{acc.bank_name || '—'}</td>
                                                    <td className="m" style={{ fontSize: 11 }}>{acc.account_number || acc.rib || acc.iban || '—'}</td>
                                                    <td className="e">{(acc.current_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                                    <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                                    <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 3 }}>
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEditAccount(acc)}/>
                                                            <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteAccount.mutate(acc.id)}/>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}

                        {/* Cash Accounts */}
                        {cashAccounts.length > 0 && (
                            <Card
                                title={<><span className="ic ic-sm" style={{ color: 'var(--gold)' }}><i className="ti ti-cash-register"/></span> الصناديق النقدية</>}
                                noHeader
                                style={{ padding: 0 }}
                            >
                                <div className="tw">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>الاسم</th>
                                                <th>الكود</th>
                                                <th>الرصيد</th>
                                                <th>الرصيد الافتتاحي</th>
                                                <th>الافتراضي</th>
                                                <th>الحالة</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cashAccounts.map((acc: any) => (
                                                <tr key={acc.id}>
                                                    <td className="s">{acc.name}</td>
                                                    <td className="m">{acc.code || '—'}</td>
                                                    <td className="e">{(acc.current_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                                    <td className="m">{(acc.initial_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                                    <td>{acc.is_default ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                                    <td><Badge variant={acc.active ? 'success' : 'danger'}>{acc.active ? 'نشط' : 'موقوف'}</Badge></td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 3 }}>
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEditAccount(acc)}/>
                                                            <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteAccount.mutate(acc.id)}/>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        )}
                    </div>
                )
            )}

            {/* PAYMENT MODES TAB */}
            {activeTab === 1 && (
                loadingModes ? (
                    <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
                ) : !paymentModes || paymentModes.length === 0 ? (
                    <EmptyState
                        icon="ti-credit-card"
                        text="لا توجد طرق دفع"
                        sub="أضف طريقة دفع جديدة"
                        action={<Button variant="primary" onClick={openAddMode}>طريقة دفع جديدة</Button>}
                    />
                ) : (
                    <Card noHeader style={{ padding: 0 }}>
                        <div className="tw">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الاسم</th>
                                        <th>الكود</th>
                                        <th>الحساب</th>
                                        <th>نقدي</th>
                                        <th>مرجع</th>
                                        <th>الحالة</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentModes.map((mode: PaymentMode) => (
                                        <tr key={mode.id}>
                                            <td className="s">{mode.name}</td>
                                            <td className="m">{mode.code}</td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>—</td>
                                            <td><Badge variant={mode.is_cash ? 'success' : 'gray'}>{mode.is_cash ? 'نعم' : 'لا'}</Badge></td>
                                            <td>{mode.requires_reference ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span> : '—'}</td>
                                            <td><Badge variant={mode.active ? 'success' : 'danger'}>{mode.active ? 'نشط' : 'موقوف'}</Badge></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEditMode(mode)}/>
                                                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteMode.mutate(mode.id)}/>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )
            )}

            {/* Account Modal */}
            <AccountModal
                open={accountModal.open}
                account={editingAccount}
                onClose={accountModal.closeModal}
            />

            {/* Payment Mode Modal */}
            <PaymentModeModal
                open={modeModal.open}
                mode={editingMode}
                onClose={modeModal.closeModal}
            />
        </div>
    );
}

// ===============================================
// ACCOUNT MODAL - مع useEffect صحيح
// ===============================================
function AccountModal({ open, account, onClose }: {
    open: boolean;
    account: TreasuryAccount | null;
    onClose: () => void;
}) {
    const isEdit = !!account;
    const qc = useQueryClient();

    const emptyForm = {
        name: '',
        code: '',
        type: 'bank' as 'bank' | 'cash',
        bank_name: '',
        account_number: '',
        rib: '',
        iban: '',
        swift_bic: '',
        currency: 'DZD',
        initial_balance: 0,
        current_balance: 0,
        is_default: false,
        active: true,
        notes: '',
        treasury_account_type_id: null as number | null,
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    // إعادة تعيين النموذج
    useEffect(() => {
        if (open) {
            if (account) {
                const acc = account as any;
                setForm({
                    name: acc.name || '',
                    code: acc.code || '',
                    type: acc.type || (acc.relations?.treasuryAccountType?.name === 'cash' ? 'cash' : 'bank'),
                    bank_name: acc.bank_name || '',
                    account_number: acc.account_number || '',
                    rib: acc.rib || '',
                    iban: acc.iban || '',
                    swift_bic: acc.swift_bic || '',
                    currency: acc.currency || 'DZD',
                    initial_balance: acc.initial_balance || 0,
                    current_balance: acc.current_balance || 0,
                    is_default: acc.is_default || false,
                    active: acc.active ?? true,
                    notes: acc.notes || '',
                    treasury_account_type_id: acc.treasury_account_type_id || null,
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, account]);

    const set = (k: string, v: string | boolean | number | null) => {
        setForm(f => ({ ...f, [k]: v }));
        setError('');
    };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name,
                code: data.code || null,
                treasury_account_type_id: data.type === 'cash' ? 2 : 1, // 1=bank, 2=cash
                bank_name: data.type === 'bank' ? data.bank_name : null,
                account_number: data.type === 'bank' ? data.account_number : null,
                rib: data.type === 'bank' ? data.rib : null,
                iban: data.type === 'bank' ? data.iban : null,
                swift_bic: data.type === 'bank' ? data.swift_bic : null,
                currency: data.currency,
                initial_balance: data.initial_balance,
                current_balance: data.current_balance,
                is_default: data.is_default,
                active: data.active,
                notes: data.notes || null,
            };

            if (isEdit) {
                return apiClient.put(`/treasury-accounts/${account!.id}`, payload);
            }
            return apiClient.post('/treasury-accounts', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
            onClose();
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات وحاول مجدداً.';
            setError(msg);
        },
    });

    const handleSave = () => {
        if (!form.name.trim()) {
            setError('اسم الحساب مطلوب');
            return;
        }
        saveMutation.mutate(form);
    };

    return (
        <Modal
            open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${(account as any)?.name || ''}` : 'حساب مالي جديد'}
            subtitle={isEdit ? '' : 'إضافة حساب بنكي أو صندوق نقدي'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave}
                        disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && (
                <AlertBar variant="red">{error}</AlertBar>
            )}

            <div className="fgrid c2">
                <div className="fg s2">
                    <label className="req">اسم الحساب</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: الحساب الجاري BNA" autoFocus />
                </div>
                <div className="fg">
                    <label>الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="CP01" />
                </div>
                <div className="fg">
                    <label className="req">النوع</label>
                    <select value={form.type} onChange={e => set('type', e.target.value)}>
                        <option value="bank">🏦 حساب بنكي</option>
                        <option value="cash">💵 صندوق نقدي</option>
                    </select>
                </div>

                {form.type === 'bank' && (
                    <>
                        <div className="fg">
                            <label>اسم البنك</label>
                            <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="BNA" />
                        </div>
                        <div className="fg">
                            <label>رقم الحساب</label>
                            <input value={form.account_number} onChange={e => set('account_number', e.target.value)} placeholder="00000000000" style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>RIB</label>
                            <input value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>IBAN</label>
                            <input value={form.iban} onChange={e => set('iban', e.target.value)} placeholder="DZ..." style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>SWIFT / BIC</label>
                            <input value={form.swift_bic} onChange={e => set('swift_bic', e.target.value)} placeholder="BNAL...DZ" style={{ fontFamily: 'monospace' }} />
                        </div>
                    </>
                )}

                <div className="fg">
                    <label>الرصيد الافتتاحي</label>
                    <div className="inp-row">
                        <input type="number" value={form.initial_balance} onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
                <div className="fg">
                    <label>الرصيد الحالي</label>
                    <div className="inp-row">
                        <input type="number" value={form.current_balance} onChange={e => set('current_balance', parseFloat(e.target.value) || 0)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
                <div className="fg s2">
                    <label>ملاحظات</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات إضافية..." rows={2} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>افتراضي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_default} onChange={(v) => set('is_default', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={(v) => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ===============================================
// PAYMENT MODE MODAL - مع useEffect صحيح
// ===============================================
function PaymentModeModal({ open, mode, onClose }: {
    open: boolean;
    mode: PaymentMode | null;
    onClose: () => void;
}) {
    const isEdit = !!mode;
    const qc = useQueryClient();

    const { data: treasuryAccounts } = useQuery({
        queryKey: ['treasury-accounts'],
        queryFn: () => apiClient.get('/treasury-accounts').then(r => r.data.data),
        enabled: open,
    });

    const emptyForm = {
        name: '',
        code: '',
        description: '',
        treasury_account_id: '' as string | number,
        requires_reference: false,
        is_cash: false,
        active: true,
        display_order: 0,
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            if (mode) {
                setForm({
                    name: mode.name || '',
                    code: mode.code || '',
                    description: (mode as any).description || '',
                    treasury_account_id: (mode as any).treasury_account_id || '',
                    requires_reference: mode.requires_reference || false,
                    is_cash: mode.is_cash || false,
                    active: mode.active ?? true,
                    display_order: (mode as any).display_order || 0,
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, mode]);

    const set = (k: string, v: string | boolean | number) => setForm(f => ({ ...f, [k]: v }));

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name,
                code: data.code,
                description: data.description || null,
                treasury_account_id: data.treasury_account_id ? parseInt(data.treasury_account_id as string) : null,
                requires_reference: data.requires_reference,
                is_cash: data.is_cash,
                active: data.active,
                display_order: data.display_order,
            };

            if (isEdit) {
                return apiClient.put(`/payment-modes/${mode!.id}`, payload);
            }
            return apiClient.post('/payment-modes', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['payment-modes'] });
            onClose();
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات.';
            setError(msg);
        },
    });

    return (
        <Modal
            open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${mode?.name || ''}` : 'طريقة دفع جديدة'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={() => saveMutation.mutate(form)}
                        disabled={saveMutation.isPending || !form.name.trim() || !form.code.trim()}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="fgrid">
                <div className="fg s2">
                    <label className="req">الاسم</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="نقداً، شيك، CIB..." autoFocus />
                </div>
                <div className="fg">
                    <label className="req">الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="cash, check, cib" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>الحساب الافتراضي</label>
                    <select value={form.treasury_account_id as string} onChange={e => set('treasury_account_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {(treasuryAccounts || []).map((acc: any) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order} onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نقدي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_cash} onChange={(v) => set('is_cash', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>يتطلب مرجع</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.requires_reference} onChange={(v) => set('requires_reference', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={(v) => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

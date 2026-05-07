// resources/js/pages/finance/FinancePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader    from '@/components/ui/PageHeader';
import Card          from '@/components/ui/Card';
import Badge         from '@/components/ui/Badge';
import Button        from '@/components/ui/Button';
import Modal         from '@/components/ui/Modal';
import KpiCard       from '@/components/ui/KpiCard';
import Switch        from '@/components/ui/Switch';
import EmptyState    from '@/components/ui/EmptyState';
import AlertBar      from '@/components/ui/AlertBar';
import apiClient     from '@/lib/api/client';
import type { TreasuryAccount, PaymentMode } from '@/types';

// ─── helper: استخراج data بأمان من أي هيكل استجابة ───────────────────────────
// response.data يمكن أن يكون:
//   { data: [...] }            ← Laravel Resource Collection
//   { data: { data: [...] } }  ← Laravel Paginated
//   [...]                      ← مصفوفة مباشرة (نادر)
function extractList<T>(res: any): T[] {
    // res هو الـ Axios Response Object — البيانات في res.data
    const body = res?.data;
    if (Array.isArray(body))        return body;           // []
    if (Array.isArray(body?.data))  return body.data;      // { data: [] }
    // تحقق من pagination: { data: { data: [], meta: {} } }
    if (Array.isArray(body?.data?.data)) return body.data.data;
    return [];
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function FinancePage() {
    const [activeTab,  setActiveTab]  = useState(0);
    const [typeTabId,  setTypeTabId]  = useState<number | null>(null);
    const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
    const [editingMode,    setEditingMode]    = useState<PaymentMode | null>(null);
    const accountModal = useModal();
    const modeModal    = useModal();
    const qc           = useQueryClient();

    // ─── أنواع الحسابات (global route — بدون slug، مُدرج في PUBLIC_PATH_PREFIXES) ──
    const { data: rawAccountTypes } = useQuery({
        queryKey: ['treasury-account-types'],
        queryFn:  () => apiClient.get('/treasury-account-types').then(extractList),
        staleTime: Infinity,
    });
    const accountTypes: any[] = rawAccountTypes ?? [];

    // ─── الحسابات المالية (tenant route) ─────────────────────────────────────
    // ⚠️ الإصلاح الأساسي:
    //  1. لا نرسل include كـ param — BaseService يحمّل العلاقات عبر defaultWith تلقائياً
    //  2. queryKey مختلف عن استخدام PaymentModeModal حتى لا يتعارض الـ cache
    const {
        data: rawAccounts,
        isLoading: loadingAccounts,
        error: accountsError,
    } = useQuery({
        queryKey: ['treasury-accounts', 'with-type'],
        queryFn:  () =>
            apiClient
                .get('/treasury-accounts')
                .then(extractList<TreasuryAccount>),
    });

    // ─── إثراء: نضيف _typeId و _typeName من relations أو treasury_account_type_id ──
    const enrichAccounts: any[] = useMemo(() => {
        if (!rawAccounts?.length) return [];
        return rawAccounts.map((acc: any) => ({
            ...acc,
            // relations.treasuryAccountType أولاً (إذا كان include يعمل)
            // ثم is_bank_account / is_cash_account من الـ Resource مباشرةً
            // ثم المطابقة من accountTypes عبر treasury_account_type_id
            _typeId: acc.relations?.treasuryAccountType?.id
                  ?? acc.treasury_account_type_id
                  ?? null,
            _typeName: acc.relations?.treasuryAccountType?.name
                    ?? accountTypes.find((t: any) => t.id === acc.treasury_account_type_id)?.name
                    ?? '',
            _typeCode: acc.relations?.treasuryAccountType?.code
                    ?? accountTypes.find((t: any) => t.id === acc.treasury_account_type_id)?.code
                    ?? '',
        }));
    }, [rawAccounts, accountTypes]);

    const filteredAccounts = useMemo(() =>
        typeTabId === null
            ? enrichAccounts
            : enrichAccounts.filter((a: any) => a._typeId === typeTabId),
        [enrichAccounts, typeTabId]);

    const totalBalance = enrichAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

    const kpiByType = useMemo(() => {
        const map: Record<number, { name: string; total: number; count: number }> = {};
        enrichAccounts.forEach((a: any) => {
            const id = a._typeId;
            if (!id) return;
            if (!map[id]) {
                const t = accountTypes.find((t: any) => t.id === id);
                map[id] = { name: t?.name ?? a._typeName ?? '—', total: 0, count: 0 };
            }
            map[id].total += a.current_balance || 0;
            map[id].count += 1;
        });
        return map;
    }, [enrichAccounts, accountTypes]);

    // ─── طرق الدفع ───────────────────────────────────────────────────────────
    const { data: rawModes, isLoading: loadingModes } = useQuery({
        queryKey: ['payment-modes'],
        queryFn:  () => apiClient.get('/payment-modes').then(extractList<PaymentMode>),
    });
    const paymentModes: any[] = rawModes ?? [];

    // ─── حذف ─────────────────────────────────────────────────────────────────
    const deleteAccount = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/treasury-accounts/${id}`),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['treasury-accounts'] }),
    });
    const deleteMode = useMutation({
        mutationFn: (id: number) => apiClient.delete(`/payment-modes/${id}`),
        onSuccess:  () => qc.invalidateQueries({ queryKey: ['payment-modes'] }),
    });

    const openAddAccount  = () => { setEditingAccount(null); accountModal.openModal(); };
    const openEditAccount = (a: any) => { setEditingAccount(a); accountModal.openModal(); };
    const openAddMode     = () => { setEditingMode(null); modeModal.openModal(); };
    const openEditMode    = (m: any) => { setEditingMode(m); modeModal.openModal(); };

    const KPI_COLORS = ['blue','gold','purple','teal','orange'] as const;
    const KPI_ICONS  = ['ti-building-bank','ti-cash-register','ti-piggy-bank','ti-coin','ti-wallet'];
    const TYPE_ICONS: Record<string, string> = {
        bank: 'ti-building-bank', banque: 'ti-building-bank',
        cash: 'ti-cash-register', caisse: 'ti-cash-register',
        ccp:  'ti-mailbox',       epargne: 'ti-piggy-bank',
    };
    // ⚠️ الإصلاح: typeIcon يقبل code نوع الحساب وليس كود الحساب نفسه
    const typeIcon = (code?: string) =>
        TYPE_ICONS[(code ?? '').toLowerCase()] ?? 'ti-wallet';

    const subTabStyle = (active: boolean): React.CSSProperties => ({
        padding: '7px 14px', borderRadius: '8px 8px 0 0',
        border: 'none', borderBottom: `2px solid ${active ? 'var(--em)' : 'transparent'}`,
        background: active ? 'var(--emb)' : 'transparent',
        color: active ? 'var(--em)' : 'var(--t3)',
        fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
        cursor: 'pointer', transition: '.15s',
        display: 'flex', alignItems: 'center', gap: 6,
    });
    const countBadge = (n: number, active: boolean) => (
        <span style={{
            fontSize: 10, fontWeight: 900, borderRadius: 20, padding: '1px 7px',
            background: active ? 'var(--em)' : 'var(--bg4)',
            color:      active ? '#fff'      : 'var(--t4)',
        }}>{n}</span>
    );

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

            {/* ── Tabs الرئيسية ── */}
            <div className="tabs" style={{ marginBottom: 20 }}>
                <div className={`tab ${activeTab === 0 ? 'on' : ''}`} onClick={() => setActiveTab(0)}>
                    <span className="ic ic-xs"><i className="ti ti-building-bank"/></span>
                    الحسابات والصناديق
                    {enrichAccounts.length > 0 &&
                        <span className="sbi-badge" style={{ marginRight: 6 }}>{enrichAccounts.length}</span>}
                </div>
                <div className={`tab ${activeTab === 1 ? 'on' : ''}`} onClick={() => setActiveTab(1)}>
                    <span className="ic ic-xs"><i className="ti ti-credit-card"/></span>
                    طرق الدفع
                    {paymentModes.length > 0 &&
                        <span className="sbi-badge" style={{ marginRight: 6 }}>{paymentModes.length}</span>}
                </div>
            </div>

            {/* ══════════════════ TAB 0 — الحسابات ══════════════════ */}
            {activeTab === 0 && (
                <>
                    {/* KPIs */}
                    <div className="kpis" style={{ marginBottom: 20 }}>
                        <KpiCard variant="green" icon="ti-wallet"
                            label="إجمالي الأرصدة"
                            value={totalBalance.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                            unit="دج" sub={`${enrichAccounts.length} حساب`} />

                        {Object.entries(kpiByType).map(([id, info], i) => (
                            <KpiCard key={id}
                                variant={KPI_COLORS[i % KPI_COLORS.length]}
                                icon={KPI_ICONS[i % KPI_ICONS.length]}
                                label={info.name}
                                value={info.total.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })}
                                unit="دج" sub={`${info.count} حساب`} />
                        ))}

                        <KpiCard variant="purple" icon="ti-credit-card"
                            label="طرق الدفع" value={paymentModes.length}
                            sub={`${paymentModes.filter(m => m.active).length} نشطة`} />
                    </div>

                    {/* خطأ الجلب — يشمل رسالة تشخيصية */}
                    {accountsError && (
                        <AlertBar variant="red" style={{ marginBottom: 12 }}>
                            فشل جلب الحسابات المالية — {(accountsError as any)?.message || 'تحقق من الاتصال بالخادم وصلاحية الوصول'}
                        </AlertBar>
                    )}

                    {/* Sub-tabs الأنواع */}
                    {accountTypes.length > 0 && (
                        <div style={{
                            display: 'flex', gap: 4, marginBottom: 0,
                            borderBottom: '1px solid var(--b2)', overflowX: 'auto',
                        }}>
                            <button style={subTabStyle(typeTabId === null)}
                                onClick={() => setTypeTabId(null)}>
                                <i className="ti ti-layout-grid" style={{ fontSize: 12 }} />
                                الكل {countBadge(enrichAccounts.length, typeTabId === null)}
                            </button>
                            {accountTypes.map((type: any) => {
                                const count    = enrichAccounts.filter((a: any) => a._typeId === type.id).length;
                                const isActive = typeTabId === type.id;
                                return (
                                    <button key={type.id} style={subTabStyle(isActive)}
                                        onClick={() => setTypeTabId(type.id)}>
                                        {/* ✅ typeIcon يتلقى code النوع (bank/cash) وليس code الحساب */}
                                        <i className={`ti ${typeIcon(type.code)}`} style={{ fontSize: 12 }} />
                                        {type.name}
                                        {countBadge(count, isActive)}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* جدول الحسابات */}
                    <div style={{ marginTop: 16 }}>
                        {loadingAccounts ? (
                            <div className="empty">
                                <div className="empty-ic"><i className="ti ti-loader"/></div>
                                <div className="empty-tx">جاري التحميل...</div>
                            </div>
                        ) : filteredAccounts.length === 0 ? (
                            <EmptyState icon="ti-building-bank"
                                text="لا توجد حسابات"
                                sub={typeTabId !== null
                                    ? 'لا يوجد حسابات لهذا النوع'
                                    : 'أضف أول حساب بنكي أو صندوق نقدي'}
                                action={<Button variant="primary" onClick={openAddAccount}>إضافة حساب جديد</Button>}
                            />
                        ) : (
                            <Card noHeader style={{ padding: 0 }}>
                                <div className="tw">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>الاسم</th>
                                                <th>النوع</th>
                                                <th>الكود</th>
                                                <th>البنك / التفاصيل</th>
                                                <th>رقم الحساب</th>
                                                <th>الرصيد الحالي</th>
                                                <th>الافتراضي</th>
                                                <th>الحالة</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAccounts.map((acc: any) => (
                                                <tr key={acc.id}>
                                                    <td className="s">{acc.name}</td>
                                                    <td>
                                                        <Badge variant="gray" style={{ fontSize: 10 }}>
                                                            {/* ✅ الإصلاح: _typeCode وليس acc.code */}
                                                            <i className={`ti ${typeIcon(acc._typeCode)}`} style={{ marginLeft: 4 }}/>
                                                            {acc._typeName || '—'}
                                                        </Badge>
                                                    </td>
                                                    <td className="m">{acc.code || '—'}</td>
                                                    <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                                                        {acc.bank_name || '—'}
                                                    </td>
                                                    <td className="m" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                                        {acc.account_number || acc.rib || acc.iban || '—'}
                                                    </td>
                                                    <td className="e">
                                                        {(acc.current_balance || 0).toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                                    </td>
                                                    <td>
                                                        {acc.is_default
                                                            ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        <Badge variant={acc.active ? 'success' : 'danger'}>
                                                            {acc.active ? 'نشط' : 'موقوف'}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: 3 }}>
                                                            <Button size="xs" icon={<i className="ti ti-pencil"/>}
                                                                onClick={() => openEditAccount(acc)}/>
                                                            <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>}
                                                                onClick={() => {
                                                                    if (confirm('هل تريد حذف هذا الحساب؟'))
                                                                        deleteAccount.mutate(acc.id);
                                                                }}/>
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
                </>
            )}

            {/* ══════════════════ TAB 1 — طرق الدفع ══════════════════ */}
            {activeTab === 1 && (
                <>
                    <div className="kpis" style={{ marginBottom: 20 }}>
                        <KpiCard variant="purple" icon="ti-credit-card"
                            label="إجمالي طرق الدفع" value={paymentModes.length}
                            sub={`${paymentModes.filter(m => m.active).length} نشطة`} />
                        <KpiCard variant="green" icon="ti-cash"
                            label="نقدي" value={paymentModes.filter((m: any) => m.is_cash).length} />
                        <KpiCard variant="blue" icon="ti-file-check"
                            label="يتطلب مرجع" value={paymentModes.filter((m: any) => m.requires_reference).length} />
                    </div>

                    {loadingModes ? (
                        <div className="empty">
                            <div className="empty-ic"><i className="ti ti-loader"/></div>
                            <div className="empty-tx">جاري التحميل...</div>
                        </div>
                    ) : paymentModes.length === 0 ? (
                        <EmptyState icon="ti-credit-card" text="لا توجد طرق دفع"
                            sub="أضف طريقة دفع جديدة"
                            action={<Button variant="primary" onClick={openAddMode}>طريقة دفع جديدة</Button>} />
                    ) : (
                        <Card noHeader style={{ padding: 0 }}>
                            <div className="tw">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>الاسم</th><th>الكود</th><th>الحساب</th>
                                            <th>نقدي</th><th>مرجع</th><th>الحالة</th><th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paymentModes.map((mode: any) => (
                                            <tr key={mode.id}>
                                                <td className="s">{mode.name}</td>
                                                <td className="m" style={{ fontFamily: 'monospace' }}>{mode.code}</td>
                                                <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                                                    {mode.treasury_account?.name || '—'}
                                                </td>
                                                <td>
                                                    <Badge variant={mode.is_cash ? 'success' : 'gray'}>
                                                        {mode.is_cash ? 'نعم' : 'لا'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {mode.requires_reference
                                                        ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <Badge variant={mode.active ? 'success' : 'danger'}>
                                                        {mode.active ? 'نشط' : 'موقوف'}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: 3 }}>
                                                        <Button size="xs" icon={<i className="ti ti-pencil"/>}
                                                            onClick={() => openEditMode(mode)}/>
                                                        <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>}
                                                            onClick={() => {
                                                                if (confirm('هل تريد حذف طريقة الدفع؟'))
                                                                    deleteMode.mutate(mode.id);
                                                            }}/>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </>
            )}

            <AccountModal
                open={accountModal.open}
                account={editingAccount}
                accountTypes={accountTypes}
                onClose={accountModal.closeModal}
            />
            <PaymentModeModal
                open={modeModal.open}
                mode={editingMode}
                onClose={modeModal.closeModal}
            />
        </div>
    );
}

// ════════════════════════════════════════════════
// ACCOUNT MODAL
// ════════════════════════════════════════════════
function AccountModal({ open, account, accountTypes, onClose }: {
    open:         boolean;
    account:      TreasuryAccount | null;
    accountTypes: any[];
    onClose:      () => void;
}) {
    const isEdit = !!account;
    const qc     = useQueryClient();

    const buildEmpty = (types: any[]) => ({
        name:                     '',
        code:                     '',
        treasury_account_type_id: types[0]?.id ?? (null as number | null),
        bank_name:                '',
        account_number:           '',
        rib:                      '',
        iban:                     '',
        swift_bic:                '',
        currency:                 'DZD',
        initial_balance:          0,
        is_default:               false,
        active:                   true,
        notes:                    '',
    });

    const [form, setForm] = useState(() => buildEmpty(accountTypes));
    const [error, setError] = useState('');

    const selectedType = accountTypes.find((t: any) => t.id === form.treasury_account_type_id);
    const isBankType   = selectedType
        ? ['bank','banque','بنك'].some(k =>
            selectedType.code?.toLowerCase().includes(k) ||
            selectedType.name?.toLowerCase().includes(k))
        : false;

    useEffect(() => {
        if (!open) return;
        if (account) {
            const acc = account as any;
            setForm({
                name:                     acc.name || '',
                code:                     acc.code || '',
                treasury_account_type_id: acc.relations?.treasuryAccountType?.id
                                          ?? acc.treasury_account_type_id
                                          ?? accountTypes[0]?.id
                                          ?? null,
                bank_name:      acc.bank_name || '',
                account_number: acc.account_number || '',
                rib:            acc.rib || '',
                iban:           acc.iban || '',
                swift_bic:      acc.swift_bic || '',
                currency:       acc.currency || 'DZD',
                initial_balance: acc.initial_balance || 0,
                is_default:     acc.is_default || false,
                active:         acc.active ?? true,
                notes:          acc.notes || '',
            });
        } else {
            setForm(buildEmpty(accountTypes));
        }
        setError('');
    }, [open, account]);

    const set = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name:                     data.name,
                code:                     data.code || null,
                treasury_account_type_id: data.treasury_account_type_id,
                bank_name:      isBankType ? data.bank_name      : null,
                account_number: isBankType ? data.account_number : null,
                rib:            isBankType ? data.rib            : null,
                iban:           isBankType ? data.iban           : null,
                swift_bic:      isBankType ? data.swift_bic      : null,
                currency:        data.currency,
                initial_balance: data.initial_balance,
                is_default:      data.is_default,
                active:          data.active,
                notes:           data.notes || null,
            };
            return isEdit
                ? apiClient.put(`/treasury-accounts/${(account as any).id}`, payload)
                : apiClient.post('/treasury-accounts', payload);
        },
        onSuccess: () => {
            // ✅ نبطل كل queryKey يبدأ بـ treasury-accounts
            qc.invalidateQueries({ queryKey: ['treasury-accounts'] });
            onClose();
        },
        onError: (err: any) =>
            setError(err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات.'),
    });

    const handleSave = () => {
        if (!form.name.trim())              { setError('اسم الحساب مطلوب'); return; }
        if (!form.treasury_account_type_id) { setError('نوع الحساب مطلوب'); return; }
        saveMutation.mutate(form);
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${(account as any)?.name || ''}` : 'حساب مالي جديد'}
            subtitle={isEdit ? '' : 'إضافة حساب بنكي أو صندوق نقدي'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave} disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }
        >
            {error && <AlertBar variant="red">{error}</AlertBar>}
            <div className="fgrid c2">
                <div className="fg s2">
                    <label className="req">اسم الحساب</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="مثال: الحساب الجاري BNA" autoFocus />
                </div>
                <div className="fg">
                    <label>الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="CP01" />
                </div>
                <div className="fg">
                    <label className="req">نوع الحساب</label>
                    <select
                        value={form.treasury_account_type_id ?? ''}
                        onChange={e => set('treasury_account_type_id', parseInt(e.target.value) || null)}
                    >
                        <option value="">— اختر النوع —</option>
                        {accountTypes.map((t: any) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {isBankType && (
                    <>
                        <div className="fg">
                            <label>اسم البنك</label>
                            <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="BNA" />
                        </div>
                        <div className="fg">
                            <label>رقم الحساب</label>
                            <input value={form.account_number} onChange={e => set('account_number', e.target.value)}
                                placeholder="00000000000" style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>RIB</label>
                            <input value={form.rib} onChange={e => set('rib', e.target.value)}
                                placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>IBAN</label>
                            <input value={form.iban} onChange={e => set('iban', e.target.value)}
                                placeholder="DZ..." style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>SWIFT / BIC</label>
                            <input value={form.swift_bic} onChange={e => set('swift_bic', e.target.value)}
                                placeholder="BNALDZBX" style={{ fontFamily: 'monospace' }} />
                        </div>
                    </>
                )}

                <div className="fg">
                    <label>الرصيد الافتتاحي</label>
                    <div className="inp-row">
                        <input type="number" value={form.initial_balance}
                            onChange={e => set('initial_balance', parseFloat(e.target.value) || 0)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>
                <div className="fg">
                    <label>العملة</label>
                    <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                        <option value="DZD">دينار جزائري (DZD)</option>
                        <option value="EUR">يورو (EUR)</option>
                        <option value="USD">دولار (USD)</option>
                    </select>
                </div>
                <div className="fg s2">
                    <label>ملاحظات</label>
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                        placeholder="ملاحظات إضافية..." rows={2} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>افتراضي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_default} onChange={v => set('is_default', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={v => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ════════════════════════════════════════════════
// PAYMENT MODE MODAL
// ════════════════════════════════════════════════
function PaymentModeModal({ open, mode, onClose }: {
    open:    boolean;
    mode:    PaymentMode | null;
    onClose: () => void;
}) {
    const isEdit = !!mode;
    const qc     = useQueryClient();

    // ✅ queryKey مختلف عن الحسابات الرئيسية — لا تعارض في cache
    const { data: rawAccounts } = useQuery({
        queryKey: ['treasury-accounts', 'for-select'],
        queryFn: () =>
    apiClient
        .get('/treasury-accounts')
        .then(res => {
            console.log('RAW RESPONSE:', JSON.stringify(res.data, null, 2));
            return extractList<TreasuryAccount>(res);
        }),
        enabled:  open,
        staleTime: 60_000,
    });
    const treasuryAccounts: any[] = rawAccounts ?? [];

    const emptyForm = {
        name: '', code: '', description: '',
        treasury_account_id: '' as string | number,
        requires_reference: false, is_cash: false, active: true, display_order: 0,
    };
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        if (mode) {
            const m = mode as any;
            setForm({
                name:               m.name || '',
                code:               m.code || '',
                description:        m.description || '',
                treasury_account_id:m.treasury_account_id || '',
                requires_reference: m.requires_reference || false,
                is_cash:            m.is_cash || false,
                active:             m.active ?? true,
                display_order:      m.display_order || 0,
            });
        } else {
            setForm(emptyForm);
        }
        setError('');
    }, [open, mode]);

    const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                name: data.name, code: data.code,
                description:         data.description || null,
                treasury_account_id: data.treasury_account_id ? parseInt(data.treasury_account_id as string) : null,
                requires_reference:  data.requires_reference,
                is_cash:             data.is_cash,
                active:              data.active,
                display_order:       data.display_order,
            };
            return isEdit
                ? apiClient.put(`/payment-modes/${mode!.id}`, payload)
                : apiClient.post('/payment-modes', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-modes'] }); onClose(); },
        onError:   (err: any) => setError(err?.response?.data?.message || 'فشل الحفظ.'),
    });

    return (
        <Modal open={open} onClose={onClose} size="md"
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
                    <input value={form.name} onChange={e => set('name', e.target.value)}
                        placeholder="نقداً، شيك، CIB..." autoFocus />
                </div>
                <div className="fg">
                    <label className="req">الكود</label>
                    <input value={form.code} onChange={e => set('code', e.target.value)}
                        placeholder="cash, check, cib" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>الحساب الافتراضي</label>
                    <select value={form.treasury_account_id as string}
                        onChange={e => set('treasury_account_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {treasuryAccounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order}
                        onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نقدي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_cash} onChange={v => set('is_cash', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>يتطلب مرجع</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.requires_reference} onChange={v => set('requires_reference', v)} />
                    </div>
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={v => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

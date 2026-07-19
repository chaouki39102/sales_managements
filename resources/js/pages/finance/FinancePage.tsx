// resources/js/pages/finance/FinancePage.tsx
// ════════════════════════════════════════════════════════════════════════════
// الخزينة والمالية — 4 تابات:
//   0: الحسابات والصناديق  (الأصلي)
//   1: طرق الدفع           (الأصلي)
//   2: الدفعات             (جديد) ← POST /payments
//   3: الأرصدة الافتتاحية  (جديد) ← /opening-balances/parties + /opening-balances/treasury
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useActiveSlug } from '@/lib/store/appStore';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/core/client';
import PageHeader   from '@/components/ui/PageHeader';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import Modal        from '@/components/ui/Modal';
import KpiCard      from '@/components/ui/KpiCard';
import Switch       from '@/components/ui/Switch';
import EmptyState   from '@/components/ui/EmptyState';
import AlertBar     from '@/components/ui/AlertBar';
import Avatar       from '@/components/ui/Avatar';
import { useOpeningParties, useOpeningTreasury, openingBalancesApi } from '@/lib/api/endpoints/openingBalances';
import { ConfirmDialog } from '@/components/ui';
import { ComboBox } from '@/pages/documents/components/DocumentUIPrimitives';
import type { TreasuryAccount, PaymentMode } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
    n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function inputStyle(hasError: boolean): React.CSSProperties {
    return {
        width: '100%', padding: '5px 8px', background: 'var(--bg1)',
        border: `1px solid ${hasError ? '#ef4444' : 'var(--b2)'}`,
        borderRadius: 6, color: 'var(--t1)', fontSize: 12,
        fontFamily: 'Tajawal, sans-serif', outline: 'none', boxSizing: 'border-box',
    };
}

function Th({ children, width }: { children?: React.ReactNode; width?: string }) {
    return <th style={{
        padding: '10px 12px', textAlign: 'right', fontWeight: 700,
        fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap', width,
    }}>{children}</th>;
}

function ActionBtn({ icon, color, onClick, disabled }: {
    icon: string; color: string; onClick?: () => void; disabled?: boolean;
}) {
    return (
        <button onClick={onClick} disabled={disabled} title=""
            style={{
                width: 28, height: 28, borderRadius: 6,
                background: 'var(--bg3)', border: '1px solid var(--b2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? .6 : 1, transition: 'all .1s',
            }}
            onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg1)';
                (e.currentTarget as HTMLElement).style.borderColor = color;
            }}
            onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg3)';
                (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)';
            }}>
            <i className={`ti ${icon}`} style={{ fontSize: 13, color }} />
        </button>
    );
}

const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('fr-DZ') : '—';

const STATUS_LABEL: Record<string, string> = {
    confirmed: 'مؤكدة',
    pending:   'معلقة',
    cancelled: 'ملغاة',
};
const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'gray'> = {
    confirmed: 'success',
    pending:   'warning',
    cancelled: 'danger',
};

// ─── قراءة قوائم lookups ─────────────────────────────────────────────────────
function useTreasuryAccountTypes() {
    return useQuery({
        queryKey: ['treasury-account-types'],
        queryFn:  () => apiGet<any>('/treasury-account-types').then(r => r?.data ?? []),
        staleTime: Infinity,
    });
}

function useTreasuryAccounts(slug: string, yearId: number | null) {
    return useQuery({
        queryKey: [slug, 'treasury-accounts', yearId],
        queryFn:  () => apiGet<any>('/treasury-accounts', {
            fiscal_year_id: yearId ?? undefined,
        }),
        enabled:  !!slug,
        select: (data: any) => Array.isArray(data) ? data
            : Array.isArray(data?.data) ? data.data : [],
    });
}

function usePaymentModes(slug: string) {
    return useQuery({
        queryKey: [slug, 'payment-modes'],
        queryFn:  () => apiGet<any>('/payment-modes').then(r => r?.data ?? []),
        enabled:  !!slug,
    });
}

// ─── Payments list ────────────────────────────────────────────────────────────
interface PaymentFilters {
    status?:              string;
    party_id?:            number;
    treasury_account_id?: number;
    payment_mode_id?:     number;
    date_from?:           string;
    date_to?:             string;
    search?:              string;
}

function usePayments(slug: string, yearId: number | null, filters: PaymentFilters) {
    const params: Record<string, unknown> = {
        'filter[fiscal_year_id]': yearId ?? undefined,
        per_page:       50,
        include:        'party,paymentMode,treasuryAccount',
        ...filters,
    };
    // حذف القيم الفارغة
    Object.keys(params).forEach(k => {
        if (params[k] === '' || params[k] === undefined || params[k] === null) delete params[k];
    });

    return useQuery({
        queryKey: tenantKeys.payments.list(slug, params),
        queryFn:  () => apiGet<any>('/payments', params),
        enabled:  !!slug,
        select: (data: any) => ({
            items: Array.isArray(data)
                ? data
                : Array.isArray(data?.data) ? data.data : [],
            meta: data?.meta ?? null,
        }),
    });
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function FinancePage() {
    const slug                          = useActiveSlug() ?? '';
    const { selectedYear }              = useFiscalYear();
    const [activeTab, setActiveTab]     = useState(0);
    const [typeTabId, setTypeTabId]     = useState<number | null>(null);
    const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
    const [editingMode,    setEditingMode]    = useState<PaymentMode | null>(null);
    const [editingPayment, setEditingPayment] = useState<any | null>(null);

    const accountModal = useModal();
    const modeModal    = useModal();
    const paymentModal = useModal();
    const qc           = useQueryClient();
    const notify       = useNotification();

    // ── Lookups ──────────────────────────────────────────────────────────────
    const { data: rawAccountTypes } = useTreasuryAccountTypes();
    const accountTypes: any[]       = rawAccountTypes ?? [];

    const { data: rawAccounts, isLoading: loadingAccounts, error: accountsError }
        = useTreasuryAccounts(slug, selectedYear?.id ?? null);

    const { data: rawModes, isLoading: loadingModes }
        = usePaymentModes(slug);
    const paymentModes: any[] = rawModes ?? [];

    // ── إثراء الحسابات بنوعها ────────────────────────────────────────────────
    const enrichAccounts: any[] = useMemo(() => {
        if (!rawAccounts?.length) return [];
        return rawAccounts.map((acc: any) => ({
            ...acc,
            _typeId: acc.treasury_account_type_id ?? null,
            _typeName: accountTypes.find((t: any) => t.id === acc.treasury_account_type_id)?.name ?? '',
            _typeCode: accountTypes.find((t: any) => t.id === acc.treasury_account_type_id)?.code ?? '',
        }));
    }, [rawAccounts, accountTypes]);

    const filteredAccounts = useMemo(() =>
        typeTabId === null ? enrichAccounts
            : enrichAccounts.filter((a: any) => a._typeId === typeTabId),
        [enrichAccounts, typeTabId]);

    const totalBalance = enrichAccounts.reduce((s, a) => s + (Number(a.current_balance) || 0), 0);

    const kpiByType = useMemo(() => {
        const map: Record<number, { name: string; total: number; count: number }> = {};
        enrichAccounts.forEach((a: any) => {
            const id = a._typeId;
            if (!id) return;
            if (!map[id]) map[id] = { name: a._typeName || '—', total: 0, count: 0 };
            map[id].total += Number(a.current_balance) || 0;
            map[id].count += 1;
        });
        return map;
    }, [enrichAccounts]);

    const TYPE_ICONS: Record<string, string> = {
        bank: 'ti-building-bank', banque: 'ti-building-bank',
        cash: 'ti-cash-register', caisse: 'ti-cash-register',
        ccp:  'ti-mailbox',       epargne: 'ti-piggy-bank',
    };
    const typeIcon = (code?: string) =>
        TYPE_ICONS[(code ?? '').toLowerCase()] ?? 'ti-wallet';

    const KPI_COLORS = ['blue', 'gold', 'purple', 'teal', 'orange'] as const;
    const KPI_ICONS  = ['ti-building-bank', 'ti-cash-register', 'ti-piggy-bank', 'ti-coin', 'ti-wallet'];

    // ── حذف ─────────────────────────────────────────────────────────────────
    const deleteAccount = useMutation({
        mutationFn: (id: number) => apiDelete(`/treasury-accounts/${id}`),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
            notify.success('تم الحذف');
        },
    });
    const deleteMode = useMutation({
        mutationFn: (id: number) => apiDelete(`/payment-modes/${id}`),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: [slug, 'payment-modes'] });
            notify.success('تم الحذف');
        },
    });

    const openAddAccount  = () => { setEditingAccount(null); accountModal.openModal(); };
    const openEditAccount = (a: any) => { setEditingAccount(a); accountModal.openModal(); };
    const openAddMode     = () => { setEditingMode(null); modeModal.openModal(); };
    const openEditMode    = (m: any) => { setEditingMode(m); modeModal.openModal(); };
    const openAddPayment  = () => { setEditingPayment(null); paymentModal.openModal(); };
    const openEditPayment = (p: any) => { setEditingPayment(p); paymentModal.openModal(); };

    const tabActions = [
        <Button key="acc" variant="primary" size="sm" icon={<i className="ti ti-plus"/>}
            onClick={openAddAccount}>حساب جديد</Button>,
        <Button key="mode" variant="primary" size="sm" icon={<i className="ti ti-plus"/>}
            onClick={openAddMode}>طريقة دفع جديدة</Button>,
        <Button key="pay" variant="primary" size="sm" icon={<i className="ti ti-plus"/>}
            onClick={openAddPayment}>دفعة جديدة</Button>,
        null, // تاب الأرصدة لا يحتاج زر إضافة
    ];

    const subTabStyle = (active: boolean): React.CSSProperties => ({
        padding: '7px 14px', borderRadius: '8px 8px 0 0',
        border: 'none', borderBottom: `2px solid ${active ? 'var(--em)' : 'transparent'}`,
        background: active ? 'var(--emb)' : 'transparent',
        color: active ? 'var(--em)' : 'var(--t3)',
        fontSize: 13, fontWeight: 700, fontFamily: 'Tajawal, sans-serif',
        cursor: 'pointer', transition: '.15s',
        display: 'flex', alignItems: 'center', gap: 6,
    });

    return (
        <div className="page on" id="p-finance">
            <PageHeader
                title="الخزينة والمالية"
                subtitle="الحسابات — الدفعات — الأرصدة الافتتاحية"
                actions={tabActions[activeTab] ?? undefined}
            />

            {/* ── Tabs الرئيسية ── */}
            <div className="tabs" style={{ marginBottom: 20 }}>
                {[
                    { icon: 'ti-building-bank', label: 'الحسابات',         count: enrichAccounts.length },
                    { icon: 'ti-credit-card',   label: 'طرق الدفع',        count: paymentModes.length },
                    { icon: 'ti-cash',          label: 'الدفعات',           count: null },
                    { icon: 'ti-scale',         label: 'الأرصدة الافتتاحية', count: null },
                ].map((t, i) => (
                    <div key={i} className={`tab ${activeTab === i ? 'on' : ''}`}
                        onClick={() => setActiveTab(i)}>
                        <span className="ic ic-xs"><i className={`ti ${t.icon}`}/></span>
                        {t.label}
                        {t.count !== null && t.count > 0 &&
                            <span className="sbi-badge" style={{ marginRight: 6 }}>{t.count}</span>}
                    </div>
                ))}
            </div>

            {/* ══ TAB 0 — الحسابات ══ */}
            {activeTab === 0 && (
                <AccountsTab
                    enrichAccounts={enrichAccounts}
                    filteredAccounts={filteredAccounts}
                    accountTypes={accountTypes}
                    kpiByType={kpiByType}
                    totalBalance={totalBalance}
                    paymentModes={paymentModes}
                    loadingAccounts={loadingAccounts}
                    accountsError={accountsError}
                    typeTabId={typeTabId}
                    setTypeTabId={setTypeTabId}
                    typeIcon={typeIcon}
                    subTabStyle={subTabStyle}
                    KPI_COLORS={KPI_COLORS}
                    KPI_ICONS={KPI_ICONS}
                    openEditAccount={openEditAccount}
                    deleteAccount={deleteAccount}
                    openAddAccount={openAddAccount}
                />
            )}

            {/* ══ TAB 1 — طرق الدفع ══ */}
            {activeTab === 1 && (
                <PaymentModesTab
                    paymentModes={paymentModes}
                    loadingModes={loadingModes}
                    openEditMode={openEditMode}
                    deleteMode={deleteMode}
                    openAddMode={openAddMode}
                />
            )}

            {/* ══ TAB 2 — الدفعات ══ */}
            {activeTab === 2 && (
                <PaymentsTab
                    slug={slug}
                    selectedYearId={selectedYear?.id ?? null}
                    accounts={enrichAccounts}
                    paymentModes={paymentModes}
                    openEditPayment={openEditPayment}
                    qc={qc}
                />
            )}

            {/* ══ TAB 3 — الأرصدة الافتتاحية ══ */}
            {activeTab === 3 && (
                <OpeningBalancesTab
                    slug={slug}
                    selectedYear={selectedYear}
                />
            )}

            {/* ── Modals ── */}
            <AccountModal
                open={accountModal.open}
                account={editingAccount}
                accountTypes={accountTypes}
                slug={slug}
                onClose={accountModal.closeModal}
            />
            <PaymentModeModal
                open={modeModal.open}
                mode={editingMode}
                slug={slug}
                onClose={modeModal.closeModal}
            />
            <PaymentModal
                open={paymentModal.open}
                payment={editingPayment}
                accounts={enrichAccounts}
                paymentModes={paymentModes}
                selectedYearId={selectedYear?.id ?? null}
                slug={slug}
                onClose={paymentModal.closeModal}
            />
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 0 — الحسابات والصناديق
// ════════════════════════════════════════════════════════════════════════════
function AccountsTab({
    enrichAccounts, filteredAccounts, accountTypes, kpiByType, totalBalance,
    paymentModes, loadingAccounts, accountsError, typeTabId, setTypeTabId,
    typeIcon, subTabStyle, KPI_COLORS, KPI_ICONS, openEditAccount,
    deleteAccount, openAddAccount,
}: any) {
    const deleteConfirm = useConfirm();
    return (
        <>
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-wallet"
                    label="إجمالي الأرصدة"
                    value={fmt(totalBalance)} unit="دج"
                    sub={`${enrichAccounts.length} حساب`} />
                {Object.entries(kpiByType).map(([id, info]: any, i: number) => (
                    <KpiCard key={id}
                        variant={KPI_COLORS[i % KPI_COLORS.length]}
                        icon={KPI_ICONS[i % KPI_ICONS.length]}
                        label={info.name}
                        value={fmt(info.total)} unit="دج"
                        sub={`${info.count} حساب`} />
                ))}
                <KpiCard variant="purple" icon="ti-credit-card"
                    label="طرق الدفع" value={paymentModes.length}
                    sub={`${paymentModes.filter((m: any) => m.active).length} نشطة`} />
            </div>

            {accountsError && (
                <AlertBar variant="red" style={{ marginBottom: 12 }}>
                    فشل جلب الحسابات — {(accountsError as any)?.message}
                </AlertBar>
            )}

            {/* Sub-tabs الأنواع */}
            {accountTypes.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginBottom: 0,
                    borderBottom: '1px solid var(--b2)', overflowX: 'auto' }}>
                    <button style={subTabStyle(typeTabId === null)}
                        onClick={() => setTypeTabId(null)}>
                        <i className="ti ti-layout-grid" style={{ fontSize: 12 }} />
                        الكل
                        <span style={{ fontSize: 10, fontWeight: 900, borderRadius: 20, padding: '1px 7px',
                            background: typeTabId === null ? 'var(--em)' : 'var(--bg4)',
                            color: typeTabId === null ? '#fff' : 'var(--t4)' }}>
                            {enrichAccounts.length}
                        </span>
                    </button>
                    {accountTypes.map((type: any) => {
                        const count    = enrichAccounts.filter((a: any) => a._typeId === type.id).length;
                        const isActive = typeTabId === type.id;
                        return (
                            <button key={type.id} style={subTabStyle(isActive)}
                                onClick={() => setTypeTabId(type.id)}>
                                <i className={`ti ${typeIcon(type.code)}`} style={{ fontSize: 12 }} />
                                {type.name}
                                <span style={{ fontSize: 10, fontWeight: 900, borderRadius: 20, padding: '1px 7px',
                                    background: isActive ? 'var(--em)' : 'var(--bg4)',
                                    color: isActive ? '#fff' : 'var(--t4)' }}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            <div style={{ marginTop: 16 }}>
                {loadingAccounts ? (
                    <div className="empty">
                        <div className="empty-ic"><i className="ti ti-loader"/></div>
                        <div className="empty-tx">جاري التحميل...</div>
                    </div>
                ) : filteredAccounts.length === 0 ? (
                    <EmptyState icon="ti-building-bank" text="لا توجد حسابات"
                        sub={typeTabId !== null ? 'لا يوجد حسابات لهذا النوع' : 'أضف أول حساب'}
                        action={<Button variant="primary" onClick={openAddAccount}>إضافة حساب</Button>} />
                ) : (
                    <Card noHeader style={{ padding: 0 }}>
                        <div className="tw">
                            <table>
                                <thead>
                                    <tr>
                                        <th>الاسم</th><th>النوع</th><th>الكود</th>
                                        <th>البنك</th><th>رقم الحساب</th>
                                        <th>الرصيد الحالي</th><th>الافتراضي</th><th>الحالة</th><th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAccounts.map((acc: any) => (
                                        <tr key={acc.id}>
                                            <td className="s">{acc.name}</td>
                                            <td>
                                                <Badge variant="gray" style={{ fontSize: 10 }}>
                                                    <i className={`ti ${typeIcon(acc._typeCode)}`} style={{ marginLeft: 4 }}/>
                                                    {acc._typeName || '—'}
                                                </Badge>
                                            </td>
                                            <td className="m">{acc.code || '—'}</td>
                                            <td style={{ fontSize: 12, color: 'var(--t3)' }}>{acc.bank_name || '—'}</td>
                                            <td className="m" style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                                {acc.account_number || acc.rib || acc.iban || '—'}
                                            </td>
                                            <td className="e">{fmt(Number(acc.current_balance) || 0)} دج</td>
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
                                                        onClick={async () => { if (await deleteConfirm.confirm('حذف الحساب؟')) deleteAccount.mutate(acc.id); }}/>
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

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 1 — طرق الدفع
// ════════════════════════════════════════════════════════════════════════════
function PaymentModesTab({ paymentModes, loadingModes, openEditMode, deleteMode, openAddMode }: any) {
    const deleteConfirm = useConfirm();
    return (
        <>
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="purple" icon="ti-credit-card"
                    label="إجمالي طرق الدفع" value={paymentModes.length}
                    sub={`${paymentModes.filter((m: any) => m.active).length} نشطة`} />
                <KpiCard variant="green" icon="ti-cash"
                    label="نقدي" value={paymentModes.filter((m: any) => m.is_cash).length} />
                <KpiCard variant="blue" icon="ti-file-check"
                    label="يتطلب مرجع" value={paymentModes.filter((m: any) => m.requires_reference).length} />
            </div>

            {loadingModes ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div>
                    <div className="empty-tx">جاري التحميل...</div></div>
            ) : paymentModes.length === 0 ? (
                <EmptyState icon="ti-credit-card" text="لا توجد طرق دفع"
                    action={<Button variant="primary" onClick={openAddMode}>طريقة دفع جديدة</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الاسم</th><th>الكود</th><th>الحساب</th>
                                    <th>نقدي</th><th>مرجع</th><th>الترتيب</th><th>الحالة</th><th></th>
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
                                        <td className="m">{mode.display_order ?? 0}</td>
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
                                                    onClick={async () => { if (await deleteConfirm.confirm('حذف طريقة الدفع؟')) deleteMode.mutate(mode.id); }}/>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 2 — الدفعات
// ════════════════════════════════════════════════════════════════════════════
function PaymentsTab({ slug, selectedYearId, accounts, paymentModes: _paymentModes, openEditPayment, qc }: {
    slug: string;
    selectedYearId: number | null;
    accounts: any[];
    paymentModes: any[];
    openEditPayment: (p: any) => void;
    qc: any;
}) {
    const deleteConfirm = useConfirm();
    const notify        = useNotification();
    const [_filters, _setFilters] = useState<PaymentFilters>({});
    const [search,  setSearch]  = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [accountFilter, setAccountFilter] = useState('');

    // debounce search
    const [debouncedSearch, setDebouncedSearch] = useState('');
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 400);
        return () => clearTimeout(t);
    }, [search]);

    const activeFilters: PaymentFilters = useMemo(() => ({
        search:               debouncedSearch || undefined,
        status:               statusFilter    || undefined,
        treasury_account_id:  accountFilter ? Number(accountFilter) : undefined,
    }), [debouncedSearch, statusFilter, accountFilter]);

    const { data, isLoading } = usePayments(slug, selectedYearId, activeFilters);
    const rawPayments: any[] = data?.items ?? [];

    // ── Sorting ──────────────────────────────────────────────────────────────
    type SortKey = 'id' | 'payment_number' | 'payment_date' | 'party' | 'direction' | 'amount' | 'status';
    const [sortKey, setSortKey] = useState<SortKey>('id');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const toggleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir(key === 'payment_number' || key === 'id' ? 'desc' : 'asc');
        }
    };

    const payments = useMemo(() => {
        const arr = [...rawPayments];
        arr.sort((a, b) => {
            let cmp = 0;
            switch (sortKey) {
                case 'id':
                    cmp = (a.id ?? 0) - (b.id ?? 0);
                    break;
                case 'payment_number':
                    cmp = (a.payment_number ?? `#${a.id}`).localeCompare(b.payment_number ?? `#${b.id}`, undefined, { numeric: true });
                    break;
                case 'payment_date':
                    cmp = (a.payment_date ?? '').localeCompare(b.payment_date ?? '');
                    break;
                case 'party':
                    cmp = (a.party?.name ?? '').localeCompare(b.party?.name ?? '', 'ar');
                    break;
                case 'direction':
                    cmp = (a.direction ?? '').localeCompare(b.direction ?? '');
                    break;
                case 'amount':
                    cmp = Number(a.amount_local || a.amount || 0) - Number(b.amount_local || b.amount || 0);
                    break;
                case 'status':
                    cmp = (a.status ?? '').localeCompare(b.status ?? '');
                    break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }, [rawPayments, sortKey, sortDir]);

    // ── KPIs ────────────────────────────────────────────────────────────────
    const kpiConfirmed  = payments.filter(p => p.status === 'confirmed');
    const kpiPending    = payments.filter(p => p.status === 'pending');
    const totalIn       = kpiConfirmed.filter(p => p.direction === 'in')
                            .reduce((s, p) => s + Number(p.amount_local || p.amount || 0), 0);
    const totalOut      = kpiConfirmed.filter(p => p.direction === 'out')
                            .reduce((s, p) => s + Number(p.amount_local || p.amount || 0), 0);
    const unreconciled  = kpiConfirmed.filter(p => !p.is_reconciled).length;

    const deletePayment = useMutation({
        mutationFn: (id: number) => apiDelete(`/payments/${id}`),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: [slug, 'payments'] });
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
            notify.success('تم الحذف');
        },
    });

    const confirmPayment = useMutation({
        mutationFn: (id: number) => apiPatch<any>(`/payments/${id}`, { status: 'confirmed' }),
        onSuccess:  () => {
            qc.invalidateQueries({ queryKey: [slug, 'payments'] });
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
        },
    });

    return (
        <>
            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-arrow-down-circle"
                    label="إجمالي مقبوض" value={fmt(totalIn)} unit="دج"
                    sub={`${kpiConfirmed.filter(p => p.direction === 'in').length} دفعة`} />
                <KpiCard variant="red" icon="ti-arrow-up-circle"
                    label="إجمالي مدفوع" value={fmt(totalOut)} unit="دج"
                    sub={`${kpiConfirmed.filter(p => p.direction === 'out').length} دفعة`} />
                <KpiCard variant="gold" icon="ti-clock"
                    label="معلقة" value={kpiPending.length}
                    sub="تنتظر التأكيد" />
                <KpiCard variant="purple" icon="ti-rotate"
                    label="غير مسوَّاة" value={unreconciled}
                    sub="من المؤكدة" />
            </div>

            {/* Filters */}
            <div className="filters" style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <div className="srch" style={{ flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input placeholder="رقم الدفعة، مرجع، ملاحظة..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                    style={{ minWidth: 140 }}>
                    <option value="">كل الحالات</option>
                    <option value="confirmed">مؤكدة</option>
                    <option value="pending">معلقة</option>
                    <option value="cancelled">ملغاة</option>
                </select>
                <select value={accountFilter} onChange={e => setAccountFilter(e.target.value)}
                    style={{ minWidth: 160 }}>
                    <option value="">كل الحسابات</option>
                    {accounts.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div>
                    <div className="empty-tx">جاري التحميل...</div></div>
            ) : payments.length === 0 ? (
                <EmptyState icon="ti-cash" text="لا توجد دفعات" sub="أضف أول دفعة" />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    {([
                                        ['payment_number', 'الرقم'],
                                        ['payment_date',   'التاريخ'],
                                        ['party',          'المتعامل'],
                                        ['direction',      'الاتجاه'],
                                        ['amount',         'المبلغ'],
                                        ['status',         'الحالة'],
                                    ] as [SortKey, string][]).map(([key, label]) => (
                                        <th key={key}
                                            onClick={() => toggleSort(key)}
                                            style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                            {label}
                                            {sortKey === key && (
                                                <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`}
                                                    style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>
                                            )}
                                        </th>
                                    ))}
                                    <th>طريقة الدفع</th>
                                    <th>الحساب</th>
                                    <th>مرجع</th>
                                    <th>مسوَّاة</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((p: any, i: number) => (
                                    <tr key={p.id}>
                                        <td className="m" style={{ fontFamily: 'monospace', fontSize: 12 }}>
                                            {p.payment_number || `#${p.id}`}
                                        </td>
                                        <td style={{ fontSize: 12 }}>{fmtDate(p.payment_date)}</td>
                                        <td>
                                            {p.party ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <Avatar initials={p.party.name?.[0] || '?'}
                                                        color={((i % 7) + 1) as 1|2|3|4|5|6|7} size={24}/>
                                                    <span className="s">{p.party.name}</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>
                                            )}
                                        </td>
                                        <td>
                                            <Badge variant={p.direction === 'in' ? 'success' : 'danger'}>
                                                <i className={`ti ti-arrow-${p.direction === 'in' ? 'down' : 'up'}-circle`}
                                                    style={{ marginLeft: 4 }}/>
                                                {p.direction === 'in' ? 'مقبوض' : 'مدفوع'}
                                            </Badge>
                                        </td>
                                        <td className="e" style={{
                                            color: p.direction === 'in' ? 'var(--em)' : 'var(--red)',
                                            fontWeight: 700,
                                        }}>
                                            {p.direction === 'out' ? '−' : '+'}
                                            {fmt(Number(p.amount_local || p.amount || 0))} دج
                                        </td>
                                        <td>
                                            <Badge variant={STATUS_VARIANT[p.status] ?? 'gray'}>
                                                {STATUS_LABEL[p.status] ?? p.status}
                                            </Badge>
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                                            {p.payment_mode?.name || '—'}
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--t3)' }}>
                                            {p.treasury_account?.name || '—'}
                                        </td>
                                        <td className="m" style={{ fontSize: 11, color: 'var(--t4)' }}>
                                            {p.reference || p.bank_reference || '—'}
                                        </td>
                                        <td>
                                            {p.is_reconciled
                                                ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                                                : <span style={{ color: 'var(--t4)', fontSize: 12 }}>لا</span>}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                {p.status === 'pending' && (
                                                    <Button size="xs" variant="primary"
                                                        icon={<i className="ti ti-check"/>}
                                                        onClick={() => confirmPayment.mutate(p.id)}>
                                                        تأكيد
                                                    </Button>
                                                )}
                                                <Button size="xs" icon={<i className="ti ti-pencil"/>}
                                                    onClick={() => openEditPayment(p)}/>
                                                <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>}
                                                    onClick={async () => { if (await deleteConfirm.confirm('حذف الدفعة؟')) deletePayment.mutate(p.id); }}/>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {data?.meta && (
                        <div style={{ padding: '8px 16px', fontSize: 12, color: 'var(--t4)',
                            borderTop: '1px solid var(--b1)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>إجمالي: {data.meta.total ?? payments.length} دفعة</span>
                            <span>صفحة {data.meta.current_page ?? 1} / {data.meta.last_page ?? 1}</span>
                        </div>
                    )}
                </Card>
            )}

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB 3 — الأرصدة الافتتاحية
// ════════════════════════════════════════════════════════════════════════════
function OpeningBalancesTab({ slug, selectedYear }: {
    slug: string;
    selectedYear: any | null;
}) {
    const deleteConfirm = useConfirm();
    const notify        = useNotification();
    const [subTab, setSubTab] = useState<'parties' | 'treasury'>('treasury');
    const yearId = selectedYear?.id ?? null;
    const qc = useQueryClient();

    const { data: partiesData, isLoading: loadParties } = useOpeningParties(slug, yearId);
    const { data: treasuryData, isLoading: loadTreasury } = useOpeningTreasury(slug, yearId);

    const partyRows: any[]   = Array.isArray(partiesData)  ? partiesData  : [];
    const treasuryRows: any[] = Array.isArray(treasuryData) ? treasuryData : [];

    const totalDebit  = partyRows.filter(r => r.balance_type === 'debit')
                            .reduce((s, r) => s + Number(r.opening_balance || 0), 0);
    const totalCredit = partyRows.filter(r => r.balance_type === 'credit')
                            .reduce((s, r) => s + Number(r.opening_balance || 0), 0);
    const totalTreasury = treasuryRows.reduce((s, r) => s + Number(r.opening_balance || 0), 0);

    // ── Data for dropdowns ───────────────────────────────────────────────────
    const { data: rawAccounts } = useQuery({
        queryKey: [slug, 'treasury-accounts'],
        queryFn: () => apiGet<any[]>('/treasury-accounts'),
        enabled: !!slug,
        staleTime: 60_000,
    });
    const accounts: any[] = Array.isArray(rawAccounts) ? rawAccounts
        : Array.isArray((rawAccounts as any)?.data) ? (rawAccounts as any).data
        : Array.isArray((rawAccounts as any)?.data?.data) ? (rawAccounts as any).data.data
        : [];

    const { data: rawParties } = useQuery({
        queryKey: [slug, 'parties', 'select'],
        queryFn: () => apiGet<any[]>('/parties', { per_page: 200, active: 1 }),
        enabled: !!slug,
        staleTime: 60_000,
    });
    const allParties: any[] = Array.isArray(rawParties) ? rawParties
        : Array.isArray((rawParties as any)?.data) ? (rawParties as any).data
        : Array.isArray((rawParties as any)?.data?.data) ? (rawParties as any).data.data
        : [];

    // ── Draft rows ───────────────────────────────────────────────────────────
    interface TreasuryDraft { treasury_account_id: number | ''; opening_balance: string; }
    interface PartyDraft { party_id: number | ''; balance_type: 'debit' | 'credit'; opening_balance: string; }
    const emptyTreasuryDraft = (): TreasuryDraft => ({ treasury_account_id: '', opening_balance: '' });
    const emptyPartyDraft = (): PartyDraft => ({ party_id: '', balance_type: 'debit', opening_balance: '' });

    const [treasuryDrafts, setTreasuryDrafts] = useState<TreasuryDraft[]>([]);
    const [partyDrafts, setPartyDrafts] = useState<PartyDraft[]>([]);
    const [editTreasuryId, setEditTreasuryId] = useState<number | null>(null);

    // ── Duplicate helpers ─────────────────────────────────────────────────────
    const existingPartyIds = new Set(partyRows.map((r: any) => r.party_id));
    const existingTreasuryIds = new Set(
        treasuryRows.map((r: any) => r.treasury_account_id ?? r.treasuryAccount?.id),
    );
    const [editPartyId, setEditPartyId] = useState<number | null>(null);
    const [editTreasuryVal, setEditTreasuryVal] = useState('');
    const [editPartyVal, setEditPartyVal] = useState('');
    const [editPartyType, setEditPartyType] = useState<'debit' | 'credit'>('debit');
    const [partyFilter, setPartyFilter] = useState('');

    const filteredParties = allParties.filter(p =>
        !partyFilter.trim() || p.name.toLowerCase().includes(partyFilter.toLowerCase()),
    );

    // ── Mutations ────────────────────────────────────────────────────────────
    const invalidateAll = () => {
        qc.invalidateQueries({ queryKey: tenantKeys.openingBalances.parties(slug, yearId!) });
        qc.invalidateQueries({ queryKey: tenantKeys.openingBalances.treasury(slug, yearId!) });
    };

    const createTreasuryMut = useMutation({
        mutationFn: (d: TreasuryDraft) =>
            openingBalancesApi.createTreasury({ fiscal_year_id: yearId, treasury_account_id: Number(d.treasury_account_id), opening_balance: Number(d.opening_balance) }),
        onSuccess: () => { invalidateAll(); },
    });

    const createPartyMut = useMutation({
        mutationFn: (d: PartyDraft) =>
            openingBalancesApi.createParty({ fiscal_year_id: yearId, party_id: Number(d.party_id), opening_balance: Number(d.opening_balance), balance_type: d.balance_type }),
        onSuccess: () => { invalidateAll(); },
    });

    const deleteMut = useMutation({
        mutationFn: ({ type, id }: { type: 'party' | 'treasury'; id: number }) =>
            type === 'party' ? openingBalancesApi.deleteParty(id) : openingBalancesApi.deleteTreasury(id),
        onSuccess: () => { invalidateAll(); notify.success('تم الحذف'); },
    });

    const updateTreasuryMut = useMutation({
        mutationFn: ({ id, opening_balance }: { id: number; opening_balance: number }) =>
            openingBalancesApi.updateTreasury(id, { opening_balance }),
        onSuccess: () => { invalidateAll(); setEditTreasuryId(null); },
    });

    const updatePartyMut = useMutation({
        mutationFn: ({ id, opening_balance, balance_type }: { id: number; opening_balance: number; balance_type: string }) =>
            openingBalancesApi.updateParty(id, { opening_balance, balance_type }),
        onSuccess: () => { invalidateAll(); setEditPartyId(null); },
    });

    // ── Save draft helpers ──────────────────────────────────────────────────
    const saveTreasuryDraft = async (idx: number) => {
        const d = treasuryDrafts[idx];
        if (!d.treasury_account_id || !d.opening_balance) return;
        await createTreasuryMut.mutateAsync(d);
        setTreasuryDrafts(prev => prev.filter((_, i) => i !== idx));
    };

    const savePartyDraft = async (idx: number) => {
        const d = partyDrafts[idx];
        if (!d.party_id || !d.opening_balance) return;
        await createPartyMut.mutateAsync(d);
        setPartyDrafts(prev => prev.filter((_, i) => i !== idx));
    };

    // ── Inline edit ─────────────────────────────────────────────────────────
    const startEditTreasury = (row: any) => {
        setEditTreasuryId(row.id);
        setEditTreasuryVal(row.opening_balance ?? '');
    };
    const startEditParty = (row: any) => {
        setEditPartyId(row.id);
        setEditPartyVal(row.opening_balance ?? '');
        setEditPartyType(row.balance_type ?? 'debit');
    };

    if (!yearId) {
        return (
            <EmptyState icon="ti-calendar" text="لم تُحدَّد سنة مالية"
                sub="اختر السنة المالية من القائمة العلوية" />
        );
    }

    return (
        <>
            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="blue" icon="ti-building-bank"
                    label="رصيد الخزينة الافتتاحي" value={fmt(totalTreasury)} unit="دج"
                    sub={`${treasuryRows.length} حساب`} />
                <KpiCard variant="red" icon="ti-arrow-down-circle"
                    label="الرصيد الموجب (زبائن)" value={fmt(totalDebit)} unit="دج"
                    sub={`${partyRows.filter(r => (r.current_balance ?? 0) >= 0).length} متعامل`} />
                <KpiCard variant="green" icon="ti-arrow-up-circle"
                    label="الرصيد السالب (موردون)" value={fmt(totalCredit)} unit="دج"
                    sub={`${partyRows.filter(r => (r.current_balance ?? 0) < 0).length} متعامل`} />
            </div>

            {/* Info bar */}
            <AlertBar variant="blue" style={{ marginBottom: 16 }}>
                <i className="ti ti-info-circle" style={{ marginLeft: 6 }}/>
                هذه الأرصدة خاصة بالسنة المالية: <strong>{selectedYear?.name}</strong>.
                تُحدَّث تلقائياً عند إقفال سنة مالية سابقة، أو يمكن إدخالها يدوياً عند بداية التشغيل.
            </AlertBar>

            {/* Sub-tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className={`tab ${subTab === 'treasury' ? 'on' : ''}`}
                    onClick={() => setSubTab('treasury')}>
                    <span className="ic ic-xs"><i className="ti ti-building-bank"/></span>
                    الخزينة
                    {treasuryRows.length > 0 &&
                        <span className="sbi-badge" style={{ marginRight: 6 }}>{treasuryRows.length}</span>}
                </div>
                <div className={`tab ${subTab === 'parties' ? 'on' : ''}`}
                    onClick={() => setSubTab('parties')}>
                    <span className="ic ic-xs"><i className="ti ti-users"/></span>
                    المتعاملون
                    {partyRows.length > 0 &&
                        <span className="sbi-badge" style={{ marginRight: 6 }}>{partyRows.length}</span>}
                </div>
                {!selectedYear?.is_closed && (
                    <div style={{ marginRight: 'auto', display: 'flex', gap: 6 }}>
                        <button onClick={() => {
                            if (subTab === 'treasury') setTreasuryDrafts(prev => [...prev, emptyTreasuryDraft()]);
                            else setPartyDrafts(prev => [...prev, emptyPartyDraft()]);
                        }} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 16px', background: 'var(--em)',
                            border: 'none', borderRadius: 8, color: '#fff',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer',
                            fontFamily: 'Tajawal, sans-serif',
                        }}>
                            <i className="ti ti-plus" style={{ fontSize: 15 }} />
                            إضافة سطر
                        </button>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
               TABLEAU — الخزينة
            ═══════════════════════════════════════════════════════════════ */}
            {subTab === 'treasury' && (
                loadTreasury ? (
                    <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div>
                        <div className="empty-tx">جاري التحميل...</div></div>
                ) : (
                    <Card noHeader style={{ padding: 0 }}>
                        <div className="tw">
                            <table>
                                <thead>
                                    <tr>
                                        <Th width="36px">#</Th>
                                        <Th width="180px">الحساب</Th>
                                        <Th width="100px">النوع</Th>
                                        <Th width="140px">الرصيد الافتتاحي</Th>
                                        <Th width="100px">آخر تحديث</Th>
                                        {!selectedYear?.is_closed && <Th width="100px"></Th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Draft rows — خزينة */}
                                    {treasuryDrafts.map((d, idx) => (
                                        <tr key={`td-${idx}`} style={{ background: 'var(--bg3)' }}>
                                            <td style={{ textAlign: 'center', color: 'var(--em)', fontWeight: 700, fontSize: 11 }}>
                                                D{idx + 1}
                                            </td>
                                            <td>
                                                <select value={d.treasury_account_id}
                                                    onChange={e => setTreasuryDrafts(prev => prev.map((r, i) => i === idx ? { ...r, treasury_account_id: parseInt(e.target.value) || '' } : r))}
                                                    style={{ ...inputStyle(false),
                                                        ...(d.treasury_account_id && (existingTreasuryIds.has(d.treasury_account_id) || treasuryDrafts.some((r, j) => j !== idx && r.treasury_account_id === d.treasury_account_id))
                                                            ? { border: '1px solid var(--red)' } : {}),
                                                    }}>
                                                    <option value="">— اختر —</option>
                                                    {accounts.map((a: any) => (
                                                        <option key={a.id} value={a.id}>{a.name}</option>
                                                    ))}
                                                </select>
                                                {d.treasury_account_id && (existingTreasuryIds.has(d.treasury_account_id) || treasuryDrafts.some((r, j) => j !== idx && r.treasury_account_id === d.treasury_account_id)) && (
                                                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>
                                                        <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /> هذا الحساب لديه رصيد افتتاحي بالفعل
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--t4)' }}>—</td>
                                            <td>
                                                <div className="inp-row">
                                                    <input type="number" value={d.opening_balance}
                                                        onChange={e => setTreasuryDrafts(prev => prev.map((r, i) => i === idx ? { ...r, opening_balance: e.target.value } : r))}
                                                        style={{ ...inputStyle(false), width: 100 }} />
                                                    <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--t4)' }}>—</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                        disabled={!d.treasury_account_id || !d.opening_balance || createTreasuryMut.isPending
                                                            || (!!d.treasury_account_id && (existingTreasuryIds.has(d.treasury_account_id) || treasuryDrafts.some((r, j) => j !== idx && r.treasury_account_id === d.treasury_account_id)))}
                                                        onClick={() => saveTreasuryDraft(idx)} />
                                                    <ActionBtn icon="ti-x" color="var(--red)"
                                                        onClick={() => setTreasuryDrafts(prev => prev.filter((_, i) => i !== idx))} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Existing rows — خزينة */}
                                    {treasuryRows.length === 0 && treasuryDrafts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)', fontSize: 13 }}>
                                                لا توجد أرصدة افتتاحية — أضف سطراً جديداً أعلاه
                                            </td>
                                        </tr>
                                    ) : treasuryRows.map((row: any, i: number) => (
                                        <tr key={row.id}>
                                            <td style={{ textAlign: 'center', color: 'var(--t4)', fontSize: 11 }}>{i + 1}</td>
                                            <td className="s">
                                                {row.treasury_account?.name
                                                    ?? row.treasuryAccount?.name
                                                    ?? `حساب #${row.treasury_account_id}`}
                                            </td>
                                            <td>
                                                <Badge variant="gray" style={{ fontSize: 10 }}>
                                                    {row.treasury_account?.treasury_account_type?.name
                                                        ?? row.treasuryAccount?.treasury_account_type?.name
                                                        ?? '—'}
                                                </Badge>
                                            </td>
                                            <td>
                                                {editTreasuryId === row.id ? (
                                                    <div className="inp-row">
                                                        <input type="number" value={editTreasuryVal}
                                                            onChange={e => setEditTreasuryVal(e.target.value)}
                                                            style={{ ...inputStyle(false), width: 100 }} />
                                                        <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--em)', fontWeight: 700, fontFamily: 'monospace' }}>
                                                        {fmt(Number(row.opening_balance || 0))} دج
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                                                {fmtDate(row.updated_at)}
                                            </td>
                                            {!selectedYear?.is_closed && (
                                                <td>
                                                    {editTreasuryId === row.id ? (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                                disabled={!editTreasuryVal || updateTreasuryMut.isPending}
                                                                onClick={() => updateTreasuryMut.mutate({ id: row.id, opening_balance: Number(editTreasuryVal) })} />
                                                            <ActionBtn icon="ti-x" color="var(--red)"
                                                                onClick={() => setEditTreasuryId(null)} />
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: 4 }}>
                                                            <ActionBtn icon="ti-pencil" color="var(--blue)"
                                                                onClick={() => startEditTreasury(row)} />
                                                            <ActionBtn icon="ti-trash" color="var(--red)"
                                                                onClick={async () => { if (await deleteConfirm.confirm('حذف هذا الرصيد?')) deleteMut.mutate({ type: 'treasury', id: row.id }); }} />
                                                        </div>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} style={{ fontWeight: 700, textAlign: 'end',
                                            padding: '8px 12px', color: 'var(--t3)', fontSize: 12 }}>المجموع</td>
                                        <td style={{ fontWeight: 900, color: 'var(--em)', padding: '8px 12px' }}>
                                            {fmt(totalTreasury)} دج
                                        </td>
                                        <td colSpan={!selectedYear?.is_closed ? 2 : 1}></td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 16px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)',
                            }}>
                                <button onClick={() => setTreasuryDrafts(prev => [...prev, emptyTreasuryDraft()])} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 14px', background: 'transparent',
                                    border: '1px dashed var(--b2)', borderRadius: 8,
                                    color: 'var(--t3)', fontSize: 12, cursor: 'pointer',
                                    fontFamily: 'Tajawal, sans-serif', transition: 'all .15s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t3)'; }}
                                >
                                    <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة سطر
                                </button>
                                {treasuryRows.length > 0 && (
                                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--t3)' }}>
                                        <span><strong style={{ color: 'var(--t1)' }}>{treasuryRows.length}</strong> حساب</span>
                                        <span>إجمالي{' '}<strong style={{ color: 'var(--em)' }}>{fmt(totalTreasury)} دج</strong></span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                    )
                )}

            {/* ═══════════════════════════════════════════════════════════════
               TABLEAU — المتعاملون
            ═══════════════════════════════════════════════════════════════ */}
            {subTab === 'parties' && (
                loadParties ? (
                    <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div>
                        <div className="empty-tx">جاري التحميل...</div></div>
                ) : (
                    <Card noHeader style={{ padding: 0 }}>
                        <div className="tw">
                            <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--b1)' }}>
                                <input type="text" value={partyFilter}
                                    onChange={e => setPartyFilter(e.target.value)}
                                    placeholder="ابحث عن متعامل..."
                                    style={{ ...inputStyle(false), maxWidth: 280, fontSize: 12 }}
                                />
                                {partyFilter && (
                                    <span style={{ fontSize: 11, color: 'var(--t4)', marginRight: 8 }}>
                                        {filteredParties.length} من {allParties.length}
                                    </span>
                                )}
                            </div>
                            <table>
                                <thead>
                                    <tr>
                                        <Th width="36px">#</Th>
                                        <Th>المتعامل</Th>
                                        <Th width="100px">النوع</Th>
                                        <Th width="140px">الرصيد</Th>
                                        <Th width="100px">آخر تحديث</Th>
                                        {!selectedYear?.is_closed && <Th width="100px"></Th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* Draft rows — متعاملون */}
                                    {partyDrafts.map((d, idx) => (
                                        <tr key={`pd-${idx}`} style={{ background: 'var(--bg3)' }}>
                                            <td style={{ textAlign: 'center', color: 'var(--em)', fontWeight: 700, fontSize: 11 }}>
                                                D{idx + 1}
                                            </td>
                                            <td style={{ minWidth: 200 }}>
                                                <ComboBox
                                                    options={filteredParties.map(p => ({ id: p.id, label: p.name }))}
                                                    value={String(d.party_id || '')}
                                                    onChange={id => setPartyDrafts(prev => prev.map((r, i) => i === idx ? { ...r, party_id: parseInt(id) || '' } : r))}
                                                    placeholder="— اختر —"
                                                    error={!!(d.party_id && (existingPartyIds.has(d.party_id) || partyDrafts.some((r, j) => j !== idx && r.party_id === d.party_id)))}
                                                    onAfterSelect={() => {
                                                        const el = document.querySelector<HTMLInputElement>(`[data-amount-idx="${idx}"]`);
                                                        el?.focus();
                                                    }}
                                                />
                                                {d.party_id && (existingPartyIds.has(d.party_id) || partyDrafts.some((r, j) => j !== idx && r.party_id === d.party_id)) && (
                                                    <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 3 }}>
                                                        <i className="ti ti-alert-triangle" style={{ fontSize: 11 }} /> هذا المتعامل لديه رصيد افتتاحي بالفعل
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <select value={d.balance_type}
                                                    onChange={e => setPartyDrafts(prev => prev.map((r, i) => i === idx ? { ...r, balance_type: e.target.value as 'debit' | 'credit' } : r))}
                                                    style={inputStyle(false)}>
                                                    <option value="debit">عليه</option>
                                                    <option value="credit">له</option>
                                                </select>
                                            </td>
                                            <td>
                                                <div className="inp-row">
                                                    <input type="number" value={d.opening_balance}
                                                        data-amount-idx={idx}
                                                        onChange={e => setPartyDrafts(prev => prev.map((r, i) => i === idx ? { ...r, opening_balance: e.target.value } : r))}
                                                        style={{ ...inputStyle(false), width: 100 }} />
                                                    <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--t4)' }}>—</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 4 }}>
                                                    <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                        disabled={!d.party_id || !d.opening_balance || createPartyMut.isPending
                                                            || (!!d.party_id && (existingPartyIds.has(d.party_id) || partyDrafts.some((r, j) => j !== idx && r.party_id === d.party_id)))}
                                                        onClick={() => savePartyDraft(idx)} />
                                                    <ActionBtn icon="ti-x" color="var(--red)"
                                                        onClick={() => setPartyDrafts(prev => prev.filter((_, i) => i !== idx))} />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {/* Existing rows — متعاملون */}
                                    {partyRows.length === 0 && partyDrafts.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--t4)', fontSize: 13 }}>
                                                لا توجد أرصدة افتتاحية — أضف سطراً جديداً أعلاه
                                            </td>
                                        </tr>
                                    ) : partyRows.map((row: any, i: number) => {
                                        const isDebit = editPartyId === row.id ? editPartyType === 'debit' : row.balance_type === 'debit';
                                        const bal = editPartyId === row.id ? Number(editPartyVal) : Number(row.opening_balance || 0);
                                        return (
                                            <tr key={row.id}>
                                                <td style={{ textAlign: 'center', color: 'var(--t4)', fontSize: 11 }}>{i + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                        <Avatar initials={(row.party?.name ?? '?')[0]}
                                                            color={((i % 7) + 1) as 1|2|3|4|5|6|7} size={26} />
                                                        <span className="s">{row.party?.name ?? `متعامل #${row.party_id}`}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {editPartyId === row.id ? (
                                                        <select value={editPartyType}
                                                            onChange={e => setEditPartyType(e.target.value as 'debit' | 'credit')}
                                                            style={inputStyle(false)}>
                                                            <option value="debit">عليه</option>
                                                            <option value="credit">له</option>
                                                        </select>
                                                    ) : (
                                                        <Badge variant={isDebit ? 'warning' : 'info'}>
                                                            {isDebit ? 'عليه' : 'له'}
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    {editPartyId === row.id ? (
                                                        <div className="inp-row">
                                                            <input type="number" value={editPartyVal}
                                                                onChange={e => setEditPartyVal(e.target.value)}
                                                                style={{ ...inputStyle(false), width: 100 }} />
                                                            <span style={{ fontSize: 11, color: 'var(--t4)', whiteSpace: 'nowrap' }}>دج</span>
                                                        </div>
                                                    ) : (
                                                        <span style={{
                                                            color: isDebit ? 'var(--gold)' : 'var(--blue)',
                                                            fontWeight: 700, fontFamily: 'monospace',
                                                        }}>
                                                            {fmt(bal)} دج
                                                        </span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: 11, color: 'var(--t4)' }}>
                                                    {fmtDate(row.updated_at)}
                                                </td>
                                                {!selectedYear?.is_closed && (
                                                    <td>
                                                        {editPartyId === row.id ? (
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                <ActionBtn icon="ti-device-floppy" color="var(--em)"
                                                                    disabled={!editPartyVal || updatePartyMut.isPending}
                                                                    onClick={() => updatePartyMut.mutate({ id: row.id, opening_balance: Number(editPartyVal), balance_type: editPartyType })} />
                                                                <ActionBtn icon="ti-x" color="var(--red)"
                                                                    onClick={() => setEditPartyId(null)} />
                                                            </div>
                                                        ) : (
                                                            <div style={{ display: 'flex', gap: 4 }}>
                                                                <ActionBtn icon="ti-pencil" color="var(--blue)"
                                                                    onClick={() => startEditParty(row)} />
                                                                <ActionBtn icon="ti-trash" color="var(--red)"
                                                                    onClick={async () => { if (await deleteConfirm.confirm('حذف هذا الرصيد?')) deleteMut.mutate({ type: 'party', id: row.id }); }} />
                                                            </div>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} style={{ fontWeight: 700, textAlign: 'end',
                                            padding: '8px 12px', color: 'var(--t3)', fontSize: 12 }}>المجموع</td>
                                        <td style={{ fontWeight: 900, fontFamily: 'monospace', padding: '8px 12px' }}>
                                            <span style={{ color: 'var(--red)' }}>موجب: {fmt(totalDebit)}</span>
                                            &nbsp;|&nbsp;
                                            <span style={{ color: 'var(--green)' }}>سالب: {fmt(totalCredit)}</span>
                                        </td>
                                        <td colSpan={!selectedYear?.is_closed ? 2 : 1}></td>
                                    </tr>
                                </tfoot>
                            </table>
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '10px 16px', borderTop: '1px solid var(--b1)', background: 'var(--bg3)',
                            }}>
                                <button onClick={() => setPartyDrafts(prev => [...prev, emptyPartyDraft()])} style={{
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    padding: '6px 14px', background: 'transparent',
                                    border: '1px dashed var(--b2)', borderRadius: 8,
                                    color: 'var(--t3)', fontSize: 12, cursor: 'pointer',
                                    fontFamily: 'Tajawal, sans-serif', transition: 'all .15s',
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--em)'; e.currentTarget.style.color = 'var(--em)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.color = 'var(--t3)'; }}
                                >
                                    <i className="ti ti-plus" style={{ fontSize: 14 }} /> إضافة سطر
                                </button>
                                {partyRows.length > 0 && (
                                    <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--t3)' }}>
                                        <span><strong style={{ color: 'var(--t1)' }}>{partyRows.length}</strong> متعامل</span>
                                        <span>إجمالي{' '}
                                            <strong style={{ color: 'var(--red)' }}>{fmt(totalDebit)}</strong>
                                            {' / '}
                                            <strong style={{ color: 'var(--green)' }}>{fmt(totalCredit)}</strong> دج
                                        </span>
                                    </div>
                                )}
                            </div>
                            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t4)', lineHeight: 1.6, textAlign: 'right', direction: 'rtl',
                    padding: '14px 20px',
    borderTop: '1px solid var(--b2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    flexShrink: 0,
    background: 'var(--bg3)',
    borderRadius: '0 0 var(--r4) var 20px(--r4)', }} className="al-g">
                                <strong style={{ color: 'var(--red)' }}>الرصيد الموجب
                                (+) المتعامل عليه دين - يجب عليه أن يدفع لنا </strong><br />
                                <strong style={{ color: 'var(--green)' }}>الرصيد السالب
                                (-) للمتعامل رصيد عندنا - يجب علينا أن ندفع له </strong><br />
                            </div>
                        </div>
                    </Card>
                )
            )}

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL — حساب مالي
// ════════════════════════════════════════════════════════════════════════════
function AccountModal({ open, account, accountTypes, slug, onClose }: {
    open: boolean; account: TreasuryAccount | null;
    accountTypes: any[]; slug: string; onClose: () => void;
}) {
    const isEdit = !!account;
    const qc     = useQueryClient();

    const buildEmpty = (types: any[]) => ({
        name: '', code: '',
        treasury_account_type_id: types[0]?.id ?? (null as number | null),
        bank_name: '', account_number: '', rib: '', iban: '', swift_bic: '',
        currency: 'DZD', initial_balance: 0, is_default: false, active: true, notes: '',
    });

    const [form, setForm]   = useState(() => buildEmpty(accountTypes));
    const [error, setError] = useState('');

    const selectedType = accountTypes.find((t: any) => t.id === form.treasury_account_type_id);
    const isBankType   = selectedType
        ? ['bank', 'banque', 'بنك'].some(k =>
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
                treasury_account_type_id: acc.treasury_account_type_id ?? accountTypes[0]?.id ?? null,
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
                name: data.name, code: data.code || null,
                treasury_account_type_id: data.treasury_account_type_id,
                bank_name:      isBankType ? data.bank_name      : null,
                account_number: isBankType ? data.account_number : null,
                rib:            isBankType ? data.rib            : null,
                iban:           isBankType ? data.iban           : null,
                swift_bic:      isBankType ? data.swift_bic      : null,
                currency:       data.currency,
                initial_balance: data.initial_balance,
                is_default:     data.is_default,
                active:         data.active,
                notes:          data.notes || null,
            };
            return isEdit
                ? apiPut(`/treasury-accounts/${(account as any).id}`, payload)
                : apiPost('/treasury-accounts', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
            onClose();
        },
        onError: (err: any) =>
            setError(err?.message || err?.response?.data?.message || 'فشل الحفظ.'),
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
                    <select value={form.treasury_account_type_id ?? ''}
                        onChange={e => set('treasury_account_type_id', parseInt(e.target.value) || null)}>
                        <option value="">— اختر —</option>
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
                                style={{ fontFamily: 'monospace' }} />
                        </div>
                        <div className="fg">
                            <label>RIB</label>
                            <input value={form.rib} onChange={e => set('rib', e.target.value)}
                                style={{ fontFamily: 'monospace' }} />
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
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
                </div>
                <div className="fg">
                    <label>افتراضي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_default} onChange={v => set('is_default', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={v => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL — طريقة دفع
// ════════════════════════════════════════════════════════════════════════════
function PaymentModeModal({ open, mode, slug, onClose }: {
    open: boolean; mode: PaymentMode | null; slug: string; onClose: () => void;
}) {
    const isEdit = !!mode;
    const qc     = useQueryClient();

    const { data: rawAccounts } = useQuery({
        queryKey: [slug, 'treasury-accounts'],
        queryFn:  () => apiGet<TreasuryAccount[]>('/treasury-accounts'),
        enabled:  open && !!slug,
        staleTime: 60_000,
    });
    const accounts: any[] = Array.isArray(rawAccounts) ? rawAccounts
        : Array.isArray((rawAccounts as any)?.data) ? (rawAccounts as any).data
        : [];

    const emptyForm = {
        name: '', code: '', description: '',
        treasury_account_id: '' as string | number,
        requires_reference: false, is_cash: false, active: true, display_order: 0,
    };
    const [form, setForm]   = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        if (mode) {
            const m = mode as any;
            setForm({
                name:               m.name || '',
                code:               m.code || '',
                description:        m.description || '',
                treasury_account_id: m.treasury_account_id || '',
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
                treasury_account_id: data.treasury_account_id ? Number(data.treasury_account_id) : null,
                requires_reference:  data.requires_reference,
                is_cash:             data.is_cash,
                active:              data.active,
                display_order:       data.display_order,
            };
            return isEdit
                ? apiPut(`/payment-modes/${(mode as any).id}`, payload)
                : apiPost('/payment-modes', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'payment-modes'] });
            onClose();
        },
        onError: (err: any) => setError(err?.message || 'فشل الحفظ.'),
    });

    return (
        <Modal open={open} onClose={onClose} size="md"
            title={isEdit ? `تعديل — ${(mode as any)?.name || ''}` : 'طريقة دفع جديدة'}
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
                        {accounts.map((acc: any) => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>ترتيب العرض</label>
                    <input type="number" value={form.display_order}
                        onChange={e => set('display_order', parseInt(e.target.value) || 0)} />
                </div>
                <div className="fg">
                    <label>نقدي</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_cash} onChange={v => set('is_cash', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>يتطلب مرجع</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.requires_reference} onChange={v => set('requires_reference', v)} />
                    </div>
                </div>
                <div className="fg">
                    <label>نشط</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.active} onChange={v => set('active', v)} />
                    </div>
                </div>
            </div>
        </Modal>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL — دفعة جديدة / تعديل
// ════════════════════════════════════════════════════════════════════════════
function PaymentModal({ open, payment, accounts, paymentModes, selectedYearId, slug, onClose }: {
    open: boolean;
    payment: any | null;
    accounts: any[];
    paymentModes: any[];
    selectedYearId: number | null;
    slug: string;
    onClose: () => void;
}) {
    const isEdit = !!payment;
    const qc     = useQueryClient();
    const { selectedYear: sy } = useFiscalYear();

    const defaultDate = (): string => {
        const d = new Date().toISOString().split('T')[0];
        if (sy?.start_date && sy?.end_date) {
            const s = sy.start_date.substring(0, 10);
            const e = sy.end_date.substring(0, 10);
            if (d >= s && d <= e) return d;
            return e;
        }
        return d;
    };

    const emptyForm = {
        payment_number:      '',
        payment_date:        defaultDate(),
        amount:              '' as string | number,
        currency_id:         '',
        amount_local:        '' as string | number,
        payment_mode_id:     '' as string | number,
        treasury_account_id: '' as string | number,
        party_id:            '' as string | number,
        fiscal_year_id:      selectedYearId ?? '',
        reference:           '',
        bank_reference:      '',
        notes:               '',
        status:              'confirmed' as 'confirmed' | 'pending',
        direction:           'in' as 'in' | 'out',
    };

    const [form, setForm]   = useState(emptyForm);
    const [error, setError] = useState('');

    // جلب المتعاملين للاختيار (مع partyType للكشف التلقائي عن الاتجاه)
    const { data: rawParties } = useQuery({
        queryKey: [slug, 'parties', 'select'],
        queryFn:  () => apiGet<any>('/parties', { per_page: 200, active: 1, include: 'partyType' }),
        enabled:  open && !!slug,
        select:   (data: any) =>
            Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [],
        staleTime: 5 * 60_000,
    });
    const parties: any[] = rawParties ?? [];

    useEffect(() => {
        if (!open) return;
        if (payment) {
            setForm({
                payment_number:      payment.payment_number || '',
                payment_date:        payment.payment_date?.split('T')[0] || defaultDate(),
                amount:              payment.amount || '',
                currency_id:         payment.currency_id || '',
                amount_local:        payment.amount_local || '',
                payment_mode_id:     payment.payment_mode_id || '',
                treasury_account_id: payment.treasury_account_id || '',
                party_id:            payment.party_id || '',
                fiscal_year_id:      payment.fiscal_year_id || selectedYearId || '',
                reference:           payment.reference || '',
                bank_reference:      payment.bank_reference || '',
                notes:               payment.notes || '',
                status:              payment.status || 'confirmed',
                direction:           payment.direction || 'in',
            });
        } else {
            setForm({ ...emptyForm, fiscal_year_id: selectedYearId ?? '' });
        }
        setError('');
    }, [open, payment, selectedYearId]);

    // تصحيح تلقائي للاتجاه عند تعديل الدفعة حسب نوع المتعامل
    useEffect(() => {
        if (!open || !payment || !parties.length || !form.party_id) return;
        const p = parties.find((pp: any) => String(pp.id) === String(form.party_id));
        const typeName = p?.party_type?.name;
        if (typeName === 'supplier' && form.direction !== 'out') {
            set('direction', 'out');
        } else if (typeName === 'client' && form.direction !== 'in') {
            set('direction', 'in');
        }
    }, [open, payment, parties, form.party_id]);

    const set = (k: string, v: any) => { setForm(f => ({ ...f, [k]: v })); setError(''); };

    // عند اختيار طريقة الدفع: عبئ الحساب تلقائياً إن كان لها حساب افتراضي
    const handleModeChange = (modeId: string) => {
        set('payment_mode_id', modeId);
        if (!modeId) return;
        const mode = paymentModes.find((m: any) => String(m.id) === modeId);
        if (mode?.treasury_account_id && !form.treasury_account_id) {
            set('treasury_account_id', mode.treasury_account_id);
        }
    };

    const saveMutation = useMutation({
        mutationFn: (data: typeof form) => {
            const payload: any = {
                payment_date:        data.payment_date,
                amount:              Number(data.amount),
                payment_mode_id:     Number(data.payment_mode_id),
                treasury_account_id: Number(data.treasury_account_id),
                fiscal_year_id:      Number(data.fiscal_year_id),
                party_id:            data.party_id ? Number(data.party_id) : null,
                currency_id:         data.currency_id ? Number(data.currency_id) : null,
                amount_local:        data.amount_local ? Number(data.amount_local) : null,
                reference:           data.reference || null,
                bank_reference:      data.bank_reference || null,
                notes:               data.notes || null,
                status:              data.status,
                direction:           data.direction,
            };
            if (data.payment_number) payload.payment_number = data.payment_number;
            return isEdit
                ? apiPut<any>(`/payments/${payment.id}`, payload)
                : apiPost<any>('/payments', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: [slug, 'payments'] });
            qc.invalidateQueries({ queryKey: [slug, 'treasury-accounts'] });
            onClose();
        },
        onError: (err: any) => setError(err?.message || err?.errors
            ? Object.values(err.errors || {}).flat().join(' | ')
            : 'فشل الحفظ. تحقق من البيانات.'),
    });

    const handleSave = () => {
        if (!form.payment_date)        { setError('تاريخ الدفعة مطلوب'); return; }
        if (!form.amount || Number(form.amount) <= 0) { setError('المبلغ يجب أن يكون أكبر من 0'); return; }
        if (!form.payment_mode_id)     { setError('طريقة الدفع مطلوبة'); return; }
        if (!form.treasury_account_id) { setError('الحساب المالي مطلوب'); return; }
        if (!form.fiscal_year_id)      { setError('السنة المالية مطلوبة'); return; }
        saveMutation.mutate(form);
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل دفعة — ${payment?.payment_number || ''}` : 'دفعة جديدة'}
            subtitle={isEdit ? '' : 'تسجيل دفعة مستقلة أو مرتبطة بمتعامل'}
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
            {error && <AlertBar variant="red" style={{ marginBottom: 12 }}>{error}</AlertBar>}
            <div className="fgrid c2">

                {/* الاتجاه */}
                <div className="fg s2">
                    <label className="req">اتجاه الدفعة</label>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        {[
                            { val: 'in',  label: 'مقبوض (من زبون)',  icon: 'ti-arrow-down-circle', color: 'var(--em)' },
                            { val: 'out', label: 'مدفوع (لمورد / مصروف)', icon: 'ti-arrow-up-circle', color: 'var(--red)' },
                        ].map(opt => (
                            <button key={opt.val}
                                onClick={() => set('direction', opt.val)}
                                style={{
                                    flex: 1, padding: '10px 14px', borderRadius: 'var(--r2)',
                                    border: `2px solid ${form.direction === opt.val ? opt.color : 'var(--b2)'}`,
                                    background: form.direction === opt.val ? 'var(--emb)' : 'var(--bg3)',
                                    color: form.direction === opt.val ? opt.color : 'var(--t3)',
                                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                                    fontWeight: 700, fontSize: 13,
                                    display: 'flex', alignItems: 'center', gap: 8,
                                    transition: '.15s',
                                }}>
                                <i className={`ti ${opt.icon}`}/>
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* التاريخ */}
                <div className="fg">
                    <label className="req">تاريخ الدفعة</label>
                    <input type="date" value={form.payment_date}
                        onChange={e => set('payment_date', e.target.value)} />
                </div>

                {/* المبلغ */}
                <div className="fg">
                    <label className="req">المبلغ</label>
                    <div className="inp-row">
                        <input type="number" step="0.01" min="0"
                            value={form.amount}
                            placeholder="0.00"
                            onChange={e => set('amount', e.target.value)} />
                        <div className="inp-suf">دج</div>
                    </div>
                </div>

                {/* طريقة الدفع */}
                <div className="fg">
                    <label className="req">طريقة الدفع</label>
                    <select value={form.payment_mode_id as string}
                        onChange={e => handleModeChange(e.target.value)}>
                        <option value="">— اختر —</option>
                        {paymentModes.filter((m: any) => m.active).map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {/* الحساب */}
                <div className="fg">
                    <label className="req">الحساب المالي</label>
                    <select value={form.treasury_account_id as string}
                        onChange={e => set('treasury_account_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {accounts.filter((a: any) => a.active).map((a: any) => (
                            <option key={a.id} value={a.id}>
                                {a.name} — {fmt(Number(a.current_balance) || 0)} دج
                            </option>
                        ))}
                    </select>
                </div>

                {/* المتعامل */}
                <div className="fg">
                    <label>المتعامل (اختياري)</label>
                    <select value={form.party_id as string}
                        onChange={e => {
                            const pid = e.target.value;
                            set('party_id', pid);
                            // كشف تلقائي للاتجاه حسب نوع المتعامل
                            if (pid) {
                                const p = parties.find((pp: any) => String(pp.id) === String(pid));
                                const typeName = p?.party_type?.name;
                                if (typeName === 'supplier') {
                                    set('direction', 'out');
                                } else if (typeName === 'client') {
                                    set('direction', 'in');
                                }
                                // 'both' → لا يتغير، يبقى ما اختاره المستخدم
                            }
                        }}>
                        <option value="">— بدون متعامل —</option>
                        {parties.map((p: any) => {
                            const typeName = p.party_type?.name;
                            const tag = typeName === 'supplier' ? ' مورد' : typeName === 'client' ? ' زبون' : '';
                            return <option key={p.id} value={p.id}>{p.name}{tag}</option>;
                        })}
                    </select>
                </div>

                {/* الحالة */}
                <div className="fg">
                    <label>الحالة</label>
                    <select value={form.status}
                        onChange={e => set('status', e.target.value as 'confirmed' | 'pending')}>
                        <option value="confirmed">مؤكدة — يُحدَّث الرصيد فوراً</option>
                        <option value="pending">معلقة — لا يُحدَّث الرصيد</option>
                    </select>
                </div>

                {/* المرجع */}
                <div className="fg">
                    <label>رقم المرجع</label>
                    <input value={form.reference}
                        onChange={e => set('reference', e.target.value)}
                        placeholder="رقم الشيك، CCP، وصل..." />
                </div>

                {/* المرجع البنكي */}
                <div className="fg">
                    <label>المرجع البنكي</label>
                    <input value={form.bank_reference}
                        onChange={e => set('bank_reference', e.target.value)}
                        placeholder="مرجع التحويل..." />
                </div>

                {/* رقم الدفعة */}
                <div className="fg">
                    <label>رقم الدفعة</label>
                    <input value={form.payment_number}
                        onChange={e => set('payment_number', e.target.value)}
                        placeholder="يُولَّد تلقائياً إن تُرك فارغاً"
                        style={{ fontFamily: 'monospace' }} />
                </div>

                {/* ملاحظات */}
                <div className="fg s2">
                    <label>ملاحظات</label>
                    <textarea value={form.notes}
                        onChange={e => set('notes', e.target.value)}
                        placeholder="ملاحظات إضافية..." rows={2} />
                </div>
            </div>
        </Modal>
    );
}

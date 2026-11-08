// resources/js/pages/finance/FinancePage.tsx
// ════════════════════════════════════════════════════════════════════════════
// الخزينة والمالية — 4 تابات:
//   0: الحسابات والصناديق  (الأصلي)
//   1: طرق الدفع           (الأصلي)
//   2: الدفعات             (جديد) ← POST /payments
//   3: الأرصدة الافتتاحية  (جديد) ← /opening-balances/parties + /opening-balances/treasury
// ════════════════════════════════════════════════════════════════════════════
import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import { useNotification } from '@/hooks/useNotification';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { useActiveSlug } from '@/lib/store/appStore';
import { apiDelete } from '@/lib/api/core/client';
import PageHeader   from '@/components/ui/PageHeader';
import Button       from '@/components/ui/Button';
import type { TreasuryAccount, PaymentMode } from '@/types';
import { useTreasuryAccountTypes, useTreasuryAccounts, usePaymentModes } from './hooks/useFinanceQueries';
import AccountsTab        from './components/AccountsTab';
import PaymentModesTab    from './components/PaymentModesTab';
import PaymentsTab        from './components/PaymentsTab';
import OpeningBalancesTab from './components/OpeningBalancesTab';
import AccountModal       from './components/AccountModal';
import PaymentModeModal   from './components/PaymentModeModal';
import PaymentModal       from './components/PaymentModal';

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

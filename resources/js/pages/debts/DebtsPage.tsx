// resources/js/pages/debts/DebtsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useModal } from '@/hooks/useModal';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { usePartyBalances } from '@/lib/api/endpoints/partyBalances';
import { DataTable } from '@/components/ui/DataTable/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import { fmtNumber, fmtDate } from '@/lib/utils';
import type { PartyBalance } from '@/lib/api/core/types';

export default function DebtsPage() {
    const { selectedYear } = useFiscalYear();

    const date = selectedYear?.end_date?.substring(0, 10);
    const [filterType, setFilterType] = useState<number | null>(null);
    const [search, setSearch]         = useState('');
    const [selectedBalance, setSelectedBalance] = useState<PartyBalance | null>(null);
    const detailModal = useModal();

    const { data: rawBalances = [], isLoading, refetch } = usePartyBalances({
        date,
        search: search || undefined,
    });

    // فلترة tabs محلية
    const balances = useMemo(() => {
        if (filterType === null) return rawBalances;
        return rawBalances.filter(b => b.party?.party_type_id === filterType);
    }, [rawBalances, filterType]);

    const totalDebit = useMemo(() =>
        rawBalances
            .filter(b => b.balance_type === 'debit')
            .reduce((s, b) => s + Number(b.current_balance), 0),
        [rawBalances]
    );

    const totalCredit = useMemo(() =>
        rawBalances
            .filter(b => b.balance_type === 'credit')
            .reduce((s, b) => s + Number(b.current_balance), 0),
        [rawBalances]
    );

    const clientsCount = rawBalances.filter(b =>
        b.party?.party_type?.name === 'client' || b.party?.party_type?.name === 'both'
    ).length;

    const suppliersCount = rawBalances.filter(b =>
        b.party?.party_type?.name === 'supplier' || b.party?.party_type?.name === 'both'
    ).length;

    const openDetail = useCallback((b: PartyBalance) => {
        setSelectedBalance(b);
        detailModal.openModal();
    }, [detailModal]);

    const columns = useMemo(() => [
        {
            key: 'party',
            header: 'المتعامل',
            render: (b: PartyBalance) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Avatar initials={b.party?.name?.[0]?.toUpperCase() || '؟'} size={24} />
                    <span>{b.party?.name || `#${b.party_id}`}</span>
                </div>
            ),
        },
        {
            key: 'party_type',
            header: 'النوع',
            render: (b: PartyBalance) => {
                const t = b.party?.party_type?.name;
                return (
                    <Badge variant="gray">
                        {t === 'client' ? 'عميل' : t === 'supplier' ? 'مورد' : t === 'both' ? 'عميل/مورد' : '—'}
                    </Badge>
                );
            },
        },
        {
            key: 'opening_balance',
            header: 'افتتاحي',
            render: (b: PartyBalance) => `${fmtNumber(Number(b.opening_balance))} دج`,
        },
        {
            key: 'documents_balance',
            header: 'حركة المستندات',
            render: (b: PartyBalance) => {
                const v = Number(b.documents_balance);
                return (
                    <span style={{ color: v >= 0 ? 'var(--em)' : 'var(--red)' }}>
                        {v >= 0 ? '+' : ''}{fmtNumber(v)} دج
                    </span>
                );
            },
        },
        {
            key: 'payments_total',
            header: 'الدفعات',
            render: (b: PartyBalance) => `-${fmtNumber(Number(b.payments_total))} دج`,
        },
        {
            key: 'current_balance',
            header: 'الرصيد الحالي',
            render: (b: PartyBalance) => (
                <span style={{
                    fontWeight: 700,
                    color: b.balance_type === 'debit' ? 'var(--gold)' : 'var(--blue)',
                }}>
                    {fmtNumber(Number(b.current_balance))} دج
                </span>
            ),
        },
        {
            key: 'status',
            header: 'الحالة',
            render: (b: PartyBalance) => (
                <Badge variant={b.balance_type === 'debit' ? 'warning' : 'info'}>
                    {b.balance_type === 'debit' ? 'مدين (علينا)' : 'دائن (لنا)'}
                </Badge>
            ),
        },
        {
            key: 'actions',
            header: '',
            render: (b: PartyBalance) => (
                <Button
                    size="xs"
                    icon={<i className="ti ti-eye" />}
                    onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDetail(b); }}
                />
            ),
        },
    ], [openDetail]);

    return (
        <div className="page on" id="p-debts">
            <PageHeader
                title="أرصدة المتعاملين"
                subtitle="الرصيد اللحظي لكل عميل ومورد"
                actions={
                    <>
                        {selectedYear && (
                            <span style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '4px 12px', background: 'var(--emb)',
                                borderRadius: 6, color: 'var(--em)', fontWeight: 700,
                                fontSize: 13, fontFamily: 'Tajawal, sans-serif',
                            }}>
                                <i className="ti ti-calendar" style={{ fontSize: 14 }} />
                                {selectedYear.name}{selectedYear.is_closed ? ' 🔒' : ''}
                            </span>
                        )}
                        <Button
                            size="sm"
                            variant="gray"
                            icon={<i className="ti ti-refresh" />}
                            onClick={() => refetch()}
                        />
                    </>
                }
            />

            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard
                    variant="gold"
                    icon="ti-arrow-down-circle"
                    label="إجمالي المدين (علينا)"
                    value={fmtNumber(totalDebit)}
                    unit="دج"
                />
                <KpiCard
                    variant="blue"
                    icon="ti-arrow-up-circle"
                    label="إجمالي الدائن (لنا)"
                    value={fmtNumber(totalCredit)}
                    unit="دج"
                />
                <KpiCard variant="green"  icon="ti-users" label="العملاء"  value={clientsCount} />
                <KpiCard variant="purple" icon="ti-truck" label="الموردون" value={suppliersCount} />
            </div>

            <div className="tabs" style={{ marginBottom: 16 }}>
                <div
                    className={`tab ${filterType === null ? 'on' : ''}`}
                    onClick={() => setFilterType(null)}
                >
                    الكل ({rawBalances.length})
                </div>
                <div
                    className={`tab ${filterType === 1 ? 'on' : ''}`}
                    onClick={() => setFilterType(1)}
                >
                    عملاء ({clientsCount})
                </div>
                <div
                    className={`tab ${filterType === 2 ? 'on' : ''}`}
                    onClick={() => setFilterType(2)}
                >
                    موردون ({suppliersCount})
                </div>
            </div>

            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ flex: 1 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
                    <input
                        placeholder="ابحث باسم أو كود..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={balances}
                isLoading={isLoading}
                emptyText="لا توجد أرصدة"
                rowKey={(item: PartyBalance) => item.party_id}
                rowClick={openDetail}
            />

            <BalanceDetailModal
                open={detailModal.open}
                balance={selectedBalance}
                onClose={detailModal.closeModal}
            />
        </div>
    );
}

// ─── BalanceDetailModal ──────────────────────────────────────────────────────
function BalanceDetailModal({
    open,
    balance,
    onClose,
}: {
    open: boolean;
    balance: PartyBalance | null;
    onClose: () => void;
}) {
    if (!balance) return null;

    const t = balance.party?.party_type?.name;
    const typeLabel =
        t === 'client'   ? 'عميل'      :
        t === 'supplier' ? 'مورد'       :
        t === 'both'     ? 'عميل/مورد' : '—';

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="md"
            title={`تفاصيل الرصيد – ${balance.party?.name || `#${balance.party_id}`}`}
            footer={<Button onClick={onClose}>إغلاق</Button>}
        >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="sr">
                    <span className="sr-l">التاريخ</span>
                    <span className="sr-v">{fmtDate(balance.date)}</span>
                </div>
                <div className="sr">
                    <span className="sr-l">النوع</span>
                    <Badge variant={balance.balance_type === 'debit' ? 'warning' : 'info'}>
                        {balance.balance_type === 'debit' ? 'مدين' : 'دائن'}
                    </Badge>
                </div>
                <div className="sr">
                    <span className="sr-l">نوع المتعامل</span>
                    <span className="sr-v">{typeLabel}</span>
                </div>
                <div className="sr">
                    <span className="sr-l">رصيد افتتاحي</span>
                    <span className="sr-v">{fmtNumber(Number(balance.opening_balance))} دج</span>
                </div>
                <div className="sr">
                    <span className="sr-l">حركة المستندات</span>
                    <span className="sr-v">{fmtNumber(Number(balance.documents_balance))} دج</span>
                </div>
                <div className="sr">
                    <span className="sr-l">الدفعات</span>
                    <span className="sr-v">{fmtNumber(Number(balance.payments_total))} دج</span>
                </div>
                <div className="sr" style={{ gridColumn: '1 / -1' }}>
                    <span className="sr-l"><strong>الرصيد الحالي</strong></span>
                    <span
                        className="sr-v"
                        style={{
                            fontWeight: 700,
                            fontSize: 18,
                            color: balance.balance_type === 'debit' ? 'var(--gold)' : 'var(--blue)',
                        }}
                    >
                        {fmtNumber(Number(balance.current_balance))} دج
                    </span>
                </div>
            </div>
        </Modal>
    );
}

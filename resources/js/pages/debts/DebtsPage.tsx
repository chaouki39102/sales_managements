// resources/js/pages/debts/DebtsPage.tsx
import React, { useState, useMemo } from 'react';
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
import EmptyState from '@/components/ui/EmptyState';
import { fmtNumber, fmtDate } from '@/lib/utils';
import type { PartyBalance } from '@/lib/api/core/types';

export default function DebtsPage() {
    const { selectedYear } = useFiscalYear();
    const [date, setDate] = useState(selectedYear?.start_date || new Date().toISOString().split('T')[0]);
    const [filterType, setFilterType] = useState<number | null>(null);
    const [search, setSearch] = useState('');
    const [selectedBalance, setSelectedBalance] = useState<PartyBalance | null>(null);
    const detailModal = useModal();

    const { data: balances = [], isLoading } = usePartyBalances({
        date,
        party_type_id: filterType || undefined,
        search: search || undefined,
    });

    const totalDebit = balances
        .filter(b => b.balance_type === 'debit')
        .reduce((s, b) => s + b.current_balance, 0);

    const totalCredit = balances
        .filter(b => b.balance_type === 'credit')
        .reduce((s, b) => s + b.current_balance, 0);

    const clients = balances.filter(b => b.party?.party_type?.name === 'client').length;
    const suppliers = balances.filter(b => b.party?.party_type?.name === 'supplier').length;

    const columns = useMemo(() => [
        {
            key: 'party',
            header: 'المتعامل',   // ✅ تغيير label إلى header
            render: (b: PartyBalance) => (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Avatar initials={b.party?.name?.[0] || '?'} size={24} />
                    <span>{b.party?.name || `#${b.party_id}`}</span>
                </div>
            )
        },
        {
            key: 'party_type',
            header: 'النوع',
            render: (b: PartyBalance) => (
                <Badge variant="gray">
                    {b.party?.party_type?.name === 'client' ? 'عميل' : 'مورد'}
                </Badge>
            )
        },
        {
            key: 'opening_balance',
            header: 'افتتاحي',
            render: (b: PartyBalance) => fmtNumber(b.opening_balance) + ' دج'
        },
        {
            key: 'documents_balance',
            header: 'حركة المستندات',
            render: (b: PartyBalance) => (
                <span style={{ color: b.documents_balance >= 0 ? 'var(--em)' : 'var(--red)' }}>
                    {b.documents_balance >= 0 ? '+' : ''}{fmtNumber(b.documents_balance)} دج
                </span>
            )
        },
        {
            key: 'payments_total',
            header: 'الدفعات',
            render: (b: PartyBalance) => '-' + fmtNumber(b.payments_total) + ' دج'
        },
        {
            key: 'current_balance',
            header: 'الرصيد الحالي',
            render: (b: PartyBalance) => (
                <span style={{
                    fontWeight: 700,
                    color: b.balance_type === 'debit' ? 'var(--gold)' : 'var(--blue)'
                }}>
                    {fmtNumber(b.current_balance)} دج
                </span>
            )
        },
        {
            key: 'status',
            header: 'الحالة',
            render: (b: PartyBalance) => (
                <Badge variant={b.balance_type === 'debit' ? 'warning' : 'info'}>
                    {b.balance_type === 'debit' ? 'مدين (علينا)' : 'دائن (لنا)'}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: '',
            render: (b: PartyBalance) => (
                <Button
                    size="xs"
                    icon={<i className="ti ti-eye"/>}
                    onClick={(e) => { e.stopPropagation(); setSelectedBalance(b); detailModal.openModal(); }}
                />
            )
        }
    ], []);

    return (
        <div className="page on" id="p-debts">
            <PageHeader
                title="أرصدة المتعاملين"
                subtitle="الرصيد اللحظي لكل عميل ومورد"
                actions={
                    <>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            style={{ width: 150 }}
                        />
                        <Button size="sm" variant="gray" icon={<i className="ti ti-refresh"/>} onClick={() => {}} />
                    </>
                }
            />

            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="gold" icon="ti-arrow-down-circle" label="إجمالي المدين (علينا)" value={fmtNumber(totalDebit)} unit="دج" />
                <KpiCard variant="blue" icon="ti-arrow-up-circle" label="إجمالي الدائن (لنا)" value={fmtNumber(totalCredit)} unit="دج" />
                <KpiCard variant="green" icon="ti-users" label="العملاء" value={clients} />
                <KpiCard variant="purple" icon="ti-truck" label="الموردون" value={suppliers} />
            </div>

            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className={`tab ${filterType === null ? 'on' : ''}`} onClick={() => setFilterType(null)}>
                    الكل ({balances.length})
                </div>
                <div className={`tab ${filterType === 1 ? 'on' : ''}`} onClick={() => setFilterType(1)}>
                    عملاء ({balances.filter(b => b.party?.party_type?.name === 'client').length})
                </div>
                <div className={`tab ${filterType === 2 ? 'on' : ''}`} onClick={() => setFilterType(2)}>
                    موردون ({balances.filter(b => b.party?.party_type?.name === 'supplier').length})
                </div>
            </div>

            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ flex: 1 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search" /></span>
                    <input placeholder="ابحث باسم أو كود..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
            </div>

            <DataTable
                columns={columns}
                data={balances}
                isLoading={isLoading}
                emptyText="لا توجد أرصدة"
                rowKey={(item: PartyBalance) => item.party_id}
                rowClick={(b) => { setSelectedBalance(b); detailModal.openModal(); }}
            />

            <BalanceDetailModal
                open={detailModal.open}
                balance={selectedBalance}
                onClose={detailModal.closeModal}
            />
        </div>
    );
}

// ... BalanceDetailModal كما هو ...

// ─── BalanceDetailModal ──────────────────────────────────────────────────────
function BalanceDetailModal({ open, balance, onClose }: {
    open: boolean;
    balance: PartyBalance | null;
    onClose: () => void;
}) {
    if (!balance) return null;

    return (
        <Modal open={open} onClose={onClose} size="md" title={`تفاصيل الرصيد – ${balance.party?.name || `#${balance.party_id}`}`} footer={<Button onClick={onClose}>إغلاق</Button>}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="sr"><span className="sr-l">التاريخ</span><span className="sr-v">{fmtDate(balance.date)}</span></div>
                <div className="sr"><span className="sr-l">النوع</span><Badge variant={balance.balance_type === 'debit' ? 'warning' : 'info'}>{balance.balance_type === 'debit' ? 'مدين' : 'دائن'}</Badge></div>
                <div className="sr"><span className="sr-l">الرصيد الافتتاحي</span><span className="sr-v">{fmtNumber(balance.opening_balance)} دج</span></div>
                <div className="sr"><span className="sr-l">حركة المستندات</span><span className="sr-v">{fmtNumber(balance.documents_balance)} دج</span></div>
                <div className="sr"><span className="sr-l">الدفعات</span><span className="sr-v">{fmtNumber(balance.payments_total)} دج</span></div>
                <div className="sr"><span className="sr-l"><strong>الرصيد الحالي</strong></span><span className="sr-v" style={{ fontWeight: 700, fontSize: 18, color: balance.balance_type === 'debit' ? 'var(--gold)' : 'var(--blue)' }}>{fmtNumber(balance.current_balance)} دج</span></div>
            </div>
        </Modal>
    );
}

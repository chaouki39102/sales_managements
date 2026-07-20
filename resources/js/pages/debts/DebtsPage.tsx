// resources/js/pages/debts/DebtsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '@/hooks/useModal';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { usePartyBalances, usePartyBalanceHistory } from '@/lib/api/endpoints/partyBalances';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import DatePicker from '@/components/ui/DatePicker';
import { fmtNumber, fmtDate } from '@/lib/utils';
import type { PartyBalance, PartyTransaction } from '@/lib/api/core/types';

// ─── Date presets ────────────────────────────────────────────────────────────
function getDatePresets(fyEnd: string) {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const yearEnd = now.getFullYear() + '-12-31';
    return [
        { label: 'اليوم',           value: today },
        { label: 'نهاية الشهر',     value: monthEnd },
        { label: 'نهاية السنة',     value: yearEnd > fyEnd ? fyEnd : yearEnd },
        { label: 'نهاية الفترة المالية', value: fyEnd },
    ];
}

export default function DebtsPage() {
    const { selectedYear } = useFiscalYear();
    const navigate = useNavigate();

    const today = new Date().toISOString().split('T')[0];
    const fyEnd = selectedYear?.end_date?.substring(0, 10) || today;
    const defaultDate = today <= fyEnd ? today : fyEnd;
    const [filterType, setFilterType] = useState<number | null>(null);
    const [search, setSearch]         = useState('');
    const [selectedDate, setSelectedDate] = useState(defaultDate);
    const [selectedBalance, setSelectedBalance] = useState<PartyBalance | null>(null);
    const [historyParty, setHistoryParty] = useState<{ id: number; name: string } | null>(null);
    const detailModal = useModal();
    const historyModal = useModal();

    const date = selectedDate || defaultDate;
    const presets = useMemo(() => getDatePresets(fyEnd), [fyEnd]);

    const { data: rawBalances = [], isLoading, refetch } = usePartyBalances({
        date,
        search: search || undefined,
    });

    const balances = useMemo(() => {
        if (filterType === null) return rawBalances;
        return rawBalances.filter(b => b.party?.party_type_id === filterType);
    }, [rawBalances, filterType]);

    const totalDebit = useMemo(() =>
        rawBalances
            .filter(b => (b.current_balance as number) >= 0)
            .reduce((s, b) => s + Number(b.current_balance), 0),
        [rawBalances]
    );

    const totalCredit = useMemo(() =>
        rawBalances
            .filter(b => (b.current_balance as number) < 0)
            .reduce((s, b) => s + Math.abs(Number(b.current_balance)), 0),
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

    const openHistory = useCallback((b: PartyBalance) => {
        setHistoryParty({ id: b.party_id, name: b.party?.name || `#${b.party_id}` });
        historyModal.openModal();
    }, [historyModal]);

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
                        {t === 'client' ? 'زبون' : t === 'supplier' ? 'مورد' : t === 'both' ? 'زبون/مورد' : '—'}
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
                    color: (b.current_balance as number) >= 0 ? 'var(--red)' : 'var(--green)',
                }}>
                    {(b.current_balance as number) >= 0 ? '+ ' : ''}{fmtNumber(Number(b.current_balance))} دج
                </span>
            ),
        },
        {
            key: 'status',
            header: 'الحالة',
            render: (b: PartyBalance) => {
                const bal = Number(b.current_balance);
                if (bal > 0) return <Badge variant="danger">غير مسدد</Badge>;
                if (bal < 0) return <Badge variant="success">له رصيد</Badge>;
                return <Badge variant="gray">مسدد</Badge>;
            },
        },
        {
            key: 'actions',
            header: '',
            render: (b: PartyBalance) => (
                <div style={{ display: 'flex', gap: 4 }}>
                    <Button
                        size="xs"
                        variant="gray"
                        icon={<i className="ti ti-history" />}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); openHistory(b); }}
                        title="كشف حساب"
                    />
                    <Button
                        size="xs"
                        icon={<i className="ti ti-eye" />}
                        onClick={(e: React.MouseEvent) => { e.stopPropagation(); openDetail(b); }}
                    />
                </div>
            ),
        },
    ], [openDetail, openHistory]);

    return (
        <div className="page on" id="p-debts">
            <PageHeader
                title="أرصدة المتعاملين"
                subtitle="الرصيد اللحظي لكل زبون ومورد"
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

            {/* ── Date picker + presets (above all) ─────────────────── */}
            <div style={{
                display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center',
                flexWrap: 'wrap', padding: '10px 14px',
                background: 'var(--color-background-secondary)',
                borderRadius: 8, border: '1px solid var(--color-border-tertiary)',
                position: 'relative', zIndex: 100,
            }}>
                <i className="ti ti-calendar" style={{ fontSize: 16, color: 'var(--color-text-secondary)' }} />
                <div style={{ width: 180 }}>
                    <DatePicker
                        value={selectedDate}
                        onChange={setSelectedDate}
                        max={fyEnd}
                        clearable={false}
                    />
                </div>
                <div style={{ width: 1, height: 24, background: 'var(--color-border-tertiary)' }} />
                {presets.map(p => (
                    <button
                        key={p.value}
                        onClick={() => setSelectedDate(p.value)}
                        style={{
                            padding: '4px 10px', borderRadius: 6, border: 'none',
                            background: selectedDate === p.value ? 'var(--em)' : 'var(--color-background-primary)',
                            color: selectedDate === p.value ? '#fff' : 'var(--color-text-secondary)',
                            fontSize: 12, fontWeight: selectedDate === p.value ? 600 : 400,
                            cursor: 'pointer', whiteSpace: 'nowrap',
                            fontFamily: 'Tajawal, sans-serif',
                        }}
                    >
                        {p.label}
                    </button>
                ))}
                {date && (
                    <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                        <i className="ti ti-clock" style={{ marginLeft: 4 }} />
                        {fmtDate(date)}
                    </span>
                )}
            </div>

            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard
                    variant="red"
                    icon="ti-arrow-down-circle"
                    label="الرصيد الموجب (علينا)"
                    value={fmtNumber(totalDebit)}
                    unit="دج"
                />
                <KpiCard
                    variant="green"
                    icon="ti-arrow-up-circle"
                    label="الرصيد السالب (لهم)"
                    value={fmtNumber(totalCredit)}
                    unit="دج"
                />
                <KpiCard variant="green"  icon="ti-users" label="الزبائن"  value={clientsCount} />
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
                    زبائن ({clientsCount})
                </div>
                <div
                    className={`tab ${filterType === 2 ? 'on' : ''}`}
                    onClick={() => setFilterType(2)}
                >
                    موردون ({suppliersCount})
                </div>
            </div>

            <div style={{
                display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end', flexWrap: 'wrap',
            }}>
                <div className="srch" style={{ flex: 1, minWidth: 200 }}>
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

            <TransactionHistoryModal
                open={historyModal.open}
                partyId={historyParty?.id ?? null}
                partyName={historyParty?.name ?? ''}
                date={date}
                onClose={historyModal.closeModal}
                navigate={navigate}
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
        t === 'client'   ? 'زبون'      :
        t === 'supplier' ? 'مورد'       :
        t === 'both'     ? 'زبون/مورد' : '—';

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
                <div className="sr">
                    <span className="sr-l">الرصيد الحالي</span>
                    <span className="sr-v" style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: (balance.current_balance as number) >= 0 ? 'var(--red)' : 'var(--green)',
                    }}>
                        {fmtNumber(Number(balance.current_balance))} دج
                    </span>
                </div>
            </div>
        </Modal>
    );
}

// ─── TransactionHistoryModal ─────────────────────────────────────────────────
type TxTypeFilter = 'all' | 'document' | 'payment';

function TransactionHistoryModal({
    open,
    partyId,
    partyName,
    date,
    onClose,
    navigate,
}: {
    open: boolean;
    partyId: number | null;
    partyName: string;
    date: string;
    onClose: () => void;
    navigate: (path: string) => void;
}) {
    const { data, isLoading } = usePartyBalanceHistory(partyId, date);
    const [txFilter, setTxFilter] = useState<TxTypeFilter>('all');

    const openingBalance = data?.opening_balance ?? 0;
    const allTransactions = data?.transactions ?? [];

    const transactions = useMemo(() => {
        if (txFilter === 'all') return allTransactions;
        return allTransactions.filter(t => t.type === txFilter);
    }, [allTransactions, txFilter]);

    // Running balance = opening + Σdocs - Σpayments
    const txWithBalance = useMemo(() => {
        let running = openingBalance;
        return transactions.map(tx => {
            running = running + tx.document_amount - tx.payment_amount;
            return { ...tx, running_balance: Math.round(running * 100) / 100 };
        });
    }, [transactions, openingBalance]);

    const totalDocs   = useMemo(() => allTransactions.reduce((s, t) => s + t.document_amount, 0), [allTransactions]);
    const totalPays   = useMemo(() => allTransactions.reduce((s, t) => s + t.payment_amount, 0), [allTransactions]);
    const finalBalance = openingBalance + totalDocs - totalPays;

    // Excel export columns
    const excelColumns: Column<Record<string, unknown>>[] = useMemo(() => [
        { key: '#',              header: '#',               width: 50 },
        { key: 'date',           header: 'التاريخ',         width: 120 },
        { key: 'reference',      header: 'المرجع',          width: 140 },
        { key: 'label',          header: 'البيان',          width: 140 },
        { key: 'doc_amount',     header: 'المستندات',       width: 120, align: 'center' },
        { key: 'pay_amount',     header: 'الدفعات',         width: 120, align: 'center' },
        { key: 'running_balance',header: 'الرصيد',          width: 140, align: 'center' },
    ], []);

    const handleExportExcel = useCallback(async () => {
        const rows = txWithBalance.map(tx => ({
            '#':              tx.seq,
            date:             fmtDate(tx.date),
            reference:        tx.reference || '—',
            label:            tx.type === 'document' ? tx.label : tx.label,
            doc_amount:       tx.document_amount || '',
            pay_amount:       tx.payment_amount || '',
            running_balance:  tx.running_balance,
        }));

        const allRows = [
            { '#': '', date: '', reference: '', label: `الرصيد الافتتاحي: ${fmtNumber(openingBalance)} دج`, doc_amount: '', pay_amount: '', running_balance: openingBalance },
            ...rows,
            { '#': '', date: '', reference: '', label: `الإجمالي: المستندات ${fmtNumber(totalDocs)} | الدفعات ${fmtNumber(totalPays)}`, doc_amount: totalDocs, pay_amount: totalPays, running_balance: finalBalance },
        ];

        const { exportToExcelAdvanced } = await import('@/components/ui/DataTable/excelExportAdvanced');
        await exportToExcelAdvanced(
            allRows as Record<string, unknown>[],
            excelColumns as never[],
            {
                fileName: `كشف_حساب_${partyName}_${date}`,
                title: `كشف حساب – ${partyName}`,
                sheetName: 'كشف حساب',
                documentInfo: { party: partyName, date },
                showAggregates: false,
            },
        );
    }, [txWithBalance, openingBalance, totalDocs, totalPays, finalBalance, partyName, date, excelColumns]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            size="xl"
            title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <span>كشف حساب – {partyName}</span>
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 400 }}>
                        إلى {fmtDate(date)}
                    </span>
                </div>
            }
            footerLeft={
                <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                        size="sm"
                        variant="gray"
                        icon={<i className="ti ti-file-spreadsheet" />}
                        onClick={handleExportExcel}
                        disabled={isLoading || allTransactions.length === 0}
                    >
                        Excel
                    </Button>
                    <Button
                        size="sm"
                        variant="gray"
                        icon={<i className="ti ti-printer" />}
                        onClick={() => window.print()}
                        disabled={isLoading || allTransactions.length === 0}
                    >
                        طباعة
                    </Button>
                </div>
            }
            footer={<Button onClick={onClose}>إغلاق</Button>}
        >
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                    <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
                    <div style={{ marginTop: 8 }}>جاري التحميل...</div>
                </div>
            ) : allTransactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
                    <i className="ti ti-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                    لا توجد معاملات قبل هذا التاريخ
                </div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                        <SummaryCard label="الرصيد الافتتاحي" value={openingBalance} color="var(--color-text-primary)" icon="ti-building-bank" />
                        <SummaryCard label="المستندات" value={totalDocs} color="var(--em)" icon="ti-file-invoice" />
                        <SummaryCard label="الدفعات" value={totalPays} color="var(--red)" icon="ti-wallet" />
                        <SummaryCard label="الرصيد النهائي" value={finalBalance} color={finalBalance >= 0 ? 'var(--red)' : 'var(--green)'} icon="ti-calculator" bold />
                    </div>

                    {/* Filter chips */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
                        {([
                            { key: 'all' as TxTypeFilter, label: 'الكل', count: allTransactions.length },
                            { key: 'document' as TxTypeFilter, label: 'المستندات', count: allTransactions.filter(t => t.type === 'document').length },
                            { key: 'payment' as TxTypeFilter, label: 'الدفعات', count: allTransactions.filter(t => t.type === 'payment').length },
                        ]).map(f => (
                            <button
                                key={f.key}
                                onClick={() => setTxFilter(f.key)}
                                style={{
                                    padding: '4px 12px', borderRadius: 20, border: 'none',
                                    background: txFilter === f.key ? 'var(--em)' : 'var(--color-background-secondary)',
                                    color: txFilter === f.key ? '#fff' : 'var(--color-text-secondary)',
                                    fontSize: 12, fontWeight: txFilter === f.key ? 600 : 400,
                                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                                }}
                            >
                                {f.label} ({f.count})
                            </button>
                        ))}
                        <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                            {transactions.length} معاملة
                        </span>
                    </div>

                    {/* Transactions table */}
                    <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                <tr style={{ borderBottom: '2px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
                                    <th style={thStyle}>#</th>
                                    <th style={thStyle}>التاريخ والوقت</th>
                                    <th style={thStyle}>البيان</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>المستندات</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>الدفعات</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>الرصيد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Opening balance row */}
                                <tr style={{ background: 'var(--color-background-secondary)', fontWeight: 600 }}>
                                    <td style={tdStyle}>—</td>
                                    <td style={tdStyle}>—</td>
                                    <td style={tdStyle}>
                                        <i className="ti ti-building-bank" style={{ marginLeft: 4 }} />
                                        رصيد افتتاحي
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                                        {fmtNumber(openingBalance)} دج
                                    </td>
                                </tr>

                                {txWithBalance.map((tx, i) => {
                                    const isOverdue = tx.type === 'document' && tx.remaining > 0;
                                    const txDate = new Date(tx.date);
                                    const now = new Date();
                                    const daysOld = Math.floor((now.getTime() - txDate.getTime()) / 86400000);
                                    const highlightOverdue = isOverdue && daysOld > 30;

                                    return (
                                        <tr
                                            key={`${tx.type}-${tx.id}`}
                                            style={{
                                                borderBottom: '1px solid var(--color-border-tertiary)',
                                                background: highlightOverdue
                                                    ? 'rgba(220, 38, 38, 0.04)'
                                                    : i % 2 === 0 ? 'transparent' : 'var(--color-background-secondary)',
                                            }}
                                        >
                                            <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontSize: 11 }}>
                                                {tx.seq}
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ lineHeight: 1.3 }}>
                                                    <div>{fmtDate(tx.date)}</div>
                                                    {tx.datetime && (
                                                        <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>
                                                            {new Date(tx.datetime).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={tdStyle}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    {tx.type === 'document' && tx.type_code ? (
                                                        <button
                                                            onClick={() => { navigate(`/documents/${tx.type_code}/${tx.id}/edit`); onClose(); }}
                                                            style={{
                                                                background: 'none', border: 'none', cursor: 'pointer',
                                                                fontFamily: 'monospace', fontSize: 12,
                                                                color: 'var(--text-info, #3b82f6)', textDecoration: 'underline',
                                                                padding: 0,
                                                            }}
                                                        >
                                                            {tx.reference}
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                                            {tx.reference || '—'}
                                                        </span>
                                                    )}
                                                    <Badge variant={tx.type === 'document' ? 'danger' : 'success'} style={{ fontSize: 11 }}>
                                                        {tx.label}
                                                    </Badge>
                                                </div>
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: tx.document_amount > 0 ? 600 : undefined }}>
                                                {tx.document_amount !== 0 ? (
                                                    <span style={{ color: tx.document_amount > 0 ? 'var(--em)' : 'var(--red)' }}>
                                                        {fmtNumber(tx.document_amount)} دج
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: tx.payment_amount > 0 ? 600 : undefined }}>
                                                {tx.payment_amount > 0 ? (
                                                    <span style={{ color: 'var(--red)' }}>
                                                        {fmtNumber(tx.payment_amount)} دج
                                                    </span>
                                                ) : '—'}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                                                <span style={{ color: tx.running_balance >= 0 ? 'var(--red)' : 'var(--green)' }}>
                                                    {fmtNumber(tx.running_balance)} دج
                                                </span>
                                                {tx.remaining > 0 && (
                                                    <span style={{
                                                        display: 'block', fontSize: 10, color: 'var(--red)',
                                                        opacity: 0.7, marginTop: 1,
                                                    }}>
                                                        متبقي {fmtNumber(tx.remaining)}
                                                        {highlightOverdue && ` (${daysOld} يوم)`}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}

                                {/* Footer summary row */}
                                <tr style={{
                                    fontWeight: 700,
                                    background: 'var(--color-background-secondary)',
                                    borderTop: '2px solid var(--color-border-secondary)',
                                }}>
                                    <td style={tdStyle} colSpan={3}>
                                        <i className="ti ti-calculator" style={{ marginLeft: 4 }} />
                                        الإجمالي ({allTransactions.length} معاملة)
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--em)', fontWeight: 700 }}>
                                        {fmtNumber(totalDocs)} دج
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>
                                        {fmtNumber(totalPays)} دج
                                    </td>
                                    <td style={{
                                        ...tdStyle, textAlign: 'center', fontWeight: 800,
                                        fontSize: 14, color: finalBalance >= 0 ? 'var(--red)' : 'var(--green)',
                                    }}>
                                        {fmtNumber(finalBalance)} دج
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </Modal>
    );
}

// ─── SummaryCard ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, color, icon, bold }: {
    label: string; value: number; color: string; icon: string; bold?: boolean;
}) {
    return (
        <div style={{
            padding: '10px 14px', border: '1px solid var(--color-border-secondary)',
            borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
        }}>
            <i className={`ti ${icon}`} style={{ fontSize: 20, color, opacity: 0.7 }} />
            <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
                <div style={{ fontSize: bold ? 16 : 15, fontWeight: bold ? 800 : 700, color }}>
                    {fmtNumber(value)} دج
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    padding: '8px 12px', textAlign: 'start', fontWeight: 600,
    color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
    padding: '8px 12px', whiteSpace: 'nowrap',
};

// resources/js/pages/debts/DebtsPage.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useModal } from '@/hooks/useModal';
import { useFiscalYear } from '@/context/FiscalYearContext';
import { usePartyBalances, usePartyBalanceHistory, usePartyProductRecap, usePartyDetailedHistory } from '@/lib/api/endpoints/partyBalances';
import { DataTable, type Column } from '@/components/ui/DataTable/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import PageHeader from '@/components/ui/PageHeader';
import Avatar from '@/components/ui/Avatar';
import DatePicker from '@/components/ui/DatePicker';
import { fmtNumber, fmtDate } from '@/lib/utils';
import type { PartyBalance, PartyTransaction, DetailedTransaction } from '@/lib/api/core/types';

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
type ModalTab = 'transactions' | 'products' | 'detailed';

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
    const { data: recapData, isLoading: recapLoading } = usePartyProductRecap(partyId, date);
    const { data: detailedData, isLoading: detailedLoading } = usePartyDetailedHistory(partyId, date);
    const [txFilter, setTxFilter] = useState<TxTypeFilter>('all');
    const [modalTab, setModalTab] = useState<ModalTab>('transactions');
    const [fromDate, setFromDate] = useState('');
    const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());

    const openingBalance = data?.opening_balance ?? 0;
    const allTransactions = data?.transactions ?? [];

    const filteredTransactions = useMemo(() => {
        if (!fromDate) return allTransactions;
        return allTransactions.filter(t => t.date >= fromDate);
    }, [allTransactions, fromDate]);

    const toggleDoc = useCallback((docId: number) => {
        setExpandedDocs(prev => {
            const next = new Set(prev);
            if (next.has(docId)) next.delete(docId);
            else next.add(docId);
            return next;
        });
    }, []);

    const expandAllDocs = useCallback(() => {
        const detailedAll = detailedData?.transactions ?? [];
        if (expandedDocs.size === detailedAll.filter(t => t.type === 'document').length) {
            setExpandedDocs(new Set());
        } else {
            setExpandedDocs(new Set(detailedAll.filter(t => t.type === 'document').map(t => t.id)));
        }
    }, [detailedData, expandedDocs.size]);

    const transactions = useMemo(() => {
        if (txFilter === 'all') return filteredTransactions;
        return filteredTransactions.filter(t => t.type === txFilter);
    }, [filteredTransactions, txFilter]);

    // Running balance = opening + Σdocs - Σpayments
    const txWithBalance = useMemo(() => {
        let running = openingBalance;
        return transactions.map(tx => {
            running = running + tx.document_amount - tx.payment_amount;
            return { ...tx, running_balance: Math.round(running * 100) / 100 };
        });
    }, [transactions, openingBalance]);

    const totalDocs   = useMemo(() => filteredTransactions.reduce((s, t) => s + t.document_amount, 0), [filteredTransactions]);
    const totalPays   = useMemo(() => filteredTransactions.reduce((s, t) => s + t.payment_amount, 0), [filteredTransactions]);
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

    const recapProducts = recapData?.products ?? [];
    const recapSummary = recapData?.summary;

    const recapExcelColumns: Column<Record<string, unknown>>[] = useMemo(() => [
        { key: '#',              header: '#',               width: 50 },
        { key: 'product_ref',    header: 'المرجع',          width: 120 },
        { key: 'product_name',   header: 'المنتج',          width: 180 },
        { key: 'family_name',    header: 'المجموعة',        width: 120 },
        { key: 'brand_name',     header: 'العلامة التجارية', width: 120 },
        { key: 'unit_name',      header: 'الوحدة',          width: 80,  align: 'center' },
        { key: 'sale_qty',       header: 'كمية البيع',      width: 110, align: 'center' },
        { key: 'sale_ht',        header: 'مبيعات (HT)',     width: 130, align: 'center' },
        { key: 'purchase_qty',   header: 'كمية الشراء',     width: 110, align: 'center' },
        { key: 'purchase_ht',    header: 'مشتريات (HT)',    width: 130, align: 'center' },
        { key: 'total_ht',       header: 'الإجمالي HT',     width: 130, align: 'center' },
        { key: 'total_ttc',      header: 'الإجمالي TTC',    width: 130, align: 'center' },
        { key: 'doc_count',      header: 'عدد المستندات',   width: 100, align: 'center' },
    ], []);

    const handleExportRecapExcel = useCallback(async () => {
        const rows = recapProducts.map((p, i) => ({
            '#':            i + 1,
            product_ref:    p.product_ref || '—',
            product_name:   p.product_name,
            family_name:    p.family_name || '—',
            brand_name:     p.brand_name || '—',
            unit_name:      p.unit_name || '—',
            sale_qty:       p.sale_qty || '',
            sale_ht:        p.sale_ht || '',
            purchase_qty:   p.purchase_qty || '',
            purchase_ht:    p.purchase_ht || '',
            total_ht:       p.total_ht,
            total_ttc:      p.total_ttc,
            doc_count:      p.doc_count,
        }));

        const summaryRow = recapSummary ? {
            '#': '', product_ref: '', product_name: `الإجمالي (${recapSummary.product_count} منتج)`,
            family_name: '', brand_name: '', unit_name: '', sale_qty: '', sale_ht: recapSummary.total_sale_ht,
            purchase_qty: '', purchase_ht: recapSummary.total_purchase_ht,
            total_ht: '', total_ttc: '', doc_count: '',
        } : null;

        const allRows = summaryRow ? [...rows, summaryRow] : rows;

        const { exportToExcelAdvanced } = await import('@/components/ui/DataTable/excelExportAdvanced');
        await exportToExcelAdvanced(
            allRows as Record<string, unknown>[],
            recapExcelColumns as never[],
            {
                fileName: `ملخص_المنتجات_${partyName}_${date}`,
                title: `ملخص المنتجات – ${partyName}`,
                sheetName: 'ملخص المنتجات',
                documentInfo: { party: partyName, date },
                showAggregates: false,
            },
        );
    }, [recapProducts, recapSummary, partyName, date, recapExcelColumns]);

    // Detailed export
    const detailedAll = detailedData?.transactions ?? [];
    const filteredDetailed = fromDate
        ? detailedAll.filter(t => t.date >= fromDate)
        : detailedAll;

    const detailedExcelColumns: Column<Record<string, unknown>>[] = useMemo(() => [
        { key: '#',              header: '#',               width: 50 },
        { key: 'date',           header: 'التاريخ',         width: 120 },
        { key: 'reference',      header: 'المرجع',          width: 140 },
        { key: 'label',          header: 'البيان',          width: 120 },
        { key: 'doc_amount',     header: 'المستندات',       width: 120, align: 'center' },
        { key: 'pay_amount',     header: 'الدفعات',         width: 120, align: 'center' },
        { key: 'remaining',      header: 'المتبقي',         width: 120, align: 'center' },
        { key: 'running_balance',header: 'الرصيد',          width: 120, align: 'center' },
        { key: 'product_name',   header: 'المنتج',          width: 180 },
        { key: 'product_ref',    header: 'مرجع المنتج',     width: 120 },
        { key: 'unit_name',      header: 'الوحدة',          width: 80,  align: 'center' },
        { key: 'quantity',       header: 'الكمية',          width: 100, align: 'center' },
        { key: 'line_ht',        header: 'السعر HT',        width: 120, align: 'center' },
        { key: 'line_discount',  header: 'الخصم',           width: 80,  align: 'center' },
        { key: 'line_tva_rate',  header: 'ض.ق.م %',        width: 80,  align: 'center' },
        { key: 'line_ttc',       header: 'المبلغ TTC',      width: 120, align: 'center' },
    ], []);

    const handleExportDetailedExcel = useCallback(async () => {
        const detOpening = detailedData?.opening_balance ?? 0;
        let running = detOpening;
        const rows: Record<string, unknown>[] = [];

        // Opening row
        rows.push({
            '#': '', date: '', reference: '', label: `الرصيد الافتتاحي: ${fmtNumber(detOpening)} دج`,
            doc_amount: '', pay_amount: '', remaining: '', running_balance: detOpening,
            product_name: '', product_ref: '', unit_name: '', quantity: '',
            line_ht: '', line_discount: '', line_tva_rate: '', line_ttc: '',
        });

        for (const tx of filteredDetailed) {
            running = running + tx.document_amount - tx.payment_amount;
            const runBal = Math.round(running * 100) / 100;

            if (tx.type === 'document' && tx.lines.length > 0) {
                tx.lines.forEach((line, li) => {
                    rows.push({
                        '#':              li === 0 ? tx.seq : '',
                        date:             li === 0 ? fmtDate(tx.date) : '',
                        reference:        li === 0 ? (tx.reference || '—') : '',
                        label:            li === 0 ? tx.label : '',
                        doc_amount:       li === 0 ? (tx.document_amount || '') : '',
                        pay_amount:       '',
                        remaining:        li === 0 ? (tx.remaining || '') : '',
                        running_balance:  li === 0 ? runBal : '',
                        product_name:     line.product_name,
                        product_ref:      line.product_ref,
                        unit_name:        line.unit_name,
                        quantity:         line.quantity,
                        line_ht:          line.unit_price_ht,
                        line_discount:    line.discount_pct > 0 ? `${line.discount_pct}%` : '',
                        line_tva_rate:    `${line.tva_rate}%`,
                        line_ttc:         line.total_ttc,
                    });
                });
            } else {
                rows.push({
                    '#':              tx.seq,
                    date:             fmtDate(tx.date),
                    reference:        tx.reference || '—',
                    label:            tx.label,
                    doc_amount:       tx.document_amount || '',
                    pay_amount:       tx.payment_amount || '',
                    remaining:        tx.remaining || '',
                    running_balance:  runBal,
                    product_name:     '',
                    product_ref:      '',
                    unit_name:        '',
                    quantity:         '',
                    line_ht:          '',
                    line_discount:    '',
                    line_tva_rate:    '',
                    line_ttc:         '',
                });
            }
        }

        // Summary row
        const detDocs = filteredDetailed.filter(t => t.type === 'document');
        const detPays = filteredDetailed.filter(t => t.type === 'payment');
        const detTotalDocs = detDocs.reduce((s, t) => s + t.document_amount, 0);
        const detTotalPays = detPays.reduce((s, t) => s + t.payment_amount, 0);
        rows.push({
            '#': '', date: '', reference: '',
            label: `الإجمالي: المستندات ${fmtNumber(detTotalDocs)} | الدفعات ${fmtNumber(detTotalPays)}`,
            doc_amount: detTotalDocs, pay_amount: detTotalPays, remaining: '',
            running_balance: detOpening + detTotalDocs - detTotalPays,
            product_name: '', product_ref: '', unit_name: '', quantity: '',
            line_ht: '', line_discount: '', line_tva_rate: '', line_ttc: '',
        });

        const { exportToExcelAdvanced } = await import('@/components/ui/DataTable/excelExportAdvanced');
        await exportToExcelAdvanced(
            rows,
            detailedExcelColumns as never[],
            {
                fileName: `كشف_تفصيلي_${partyName}_${date}`,
                title: `كشف حساب تفصيلي – ${partyName}`,
                sheetName: 'الحركات التفصيلية',
                documentInfo: { party: partyName, date },
                showAggregates: false,
            },
        );
    }, [filteredDetailed, detailedData, partyName, date, detailedExcelColumns]);

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
                <div style={{ display: 'flex', gap: 8 }} className="no-print">
                    <Button
                        size="sm"
                        variant="gray"
                        icon={<i className="ti ti-file-spreadsheet" />}
                        onClick={
                            modalTab === 'products' ? handleExportRecapExcel
                            : modalTab === 'detailed' ? handleExportDetailedExcel
                            : handleExportExcel
                        }
                        disabled={
                            modalTab === 'transactions' ? (isLoading || allTransactions.length === 0)
                            : modalTab === 'detailed' ? (detailedLoading || filteredDetailed.length === 0)
                            : (isLoading || recapProducts.length === 0)
                        }
                    >
                        Excel
                    </Button>
                    <Button
                        size="sm"
                        variant="gray"
                        icon={<i className="ti ti-printer" />}
                        onClick={() => window.print()}
                        disabled={
                            modalTab === 'transactions' ? (isLoading || allTransactions.length === 0)
                            : modalTab === 'detailed' ? (detailedLoading || filteredDetailed.length === 0)
                            : (isLoading || recapProducts.length === 0)
                        }
                    >
                        طباعة
                    </Button>
                </div>
            }
            footer={<div className="no-print"><Button onClick={onClose}>إغلاق</Button></div>}
        >
            {/* Print-only header */}
            <div className="print-only" style={{ display: 'none' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>كشف حساب – {partyName}</h2>
                <p style={{ fontSize: 12, color: '#666' }}>إلى {fmtDate(date)}</p>
            </div>
            {isLoading ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                    <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
                    <div style={{ marginTop: 8 }}>جاري التحميل...</div>
                </div>
            ) : allTransactions.length === 0 && recapProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
                    <i className="ti ti-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                    لا توجد معاملات قبل هذا التاريخ
                </div>
            ) : (
                <>
                    {/* Main tabs */}
                    <div className="no-print" style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid var(--color-border-secondary)' }}>
                        {([
                            { key: 'transactions' as ModalTab, label: 'المعاملات', icon: 'ti-list', count: allTransactions.length },
                            { key: 'detailed' as ModalTab, label: 'الحركات التفصيلية', icon: 'ti-list-detail', count: allTransactions.filter(t => t.type === 'document').length },
                            { key: 'products' as ModalTab, label: 'المنتجات', icon: 'ti-package', count: recapProducts.length },
                        ]).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setModalTab(tab.key)}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px 8px 0 0',
                                    border: 'none', borderBottom: modalTab === tab.key ? '2px solid var(--em)' : '2px solid transparent',
                                    marginBottom: -2,
                                    background: modalTab === tab.key ? 'var(--color-background-secondary)' : 'transparent',
                                    color: modalTab === tab.key ? 'var(--em)' : 'var(--color-text-secondary)',
                                    fontSize: 13, fontWeight: modalTab === tab.key ? 700 : 500,
                                    cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                                    display: 'flex', alignItems: 'center', gap: 6,
                                    transition: 'all .15s',
                                }}
                            >
                                <i className={`ti ${tab.icon}`} style={{ fontSize: 15 }} />
                                {tab.label}
                                <span style={{
                                    fontSize: 11, padding: '1px 7px', borderRadius: 10,
                                    background: modalTab === tab.key ? 'var(--em)' : 'var(--color-border-tertiary)',
                                    color: modalTab === tab.key ? '#fff' : 'var(--color-text-tertiary)',
                                    fontWeight: 600,
                                }}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ── Transactions tab ─────────────────────────── */}
                    {modalTab === 'transactions' && (
                        <>
                            {/* Date range filter */}
                            <div style={{
                                display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center',
                                padding: '8px 12px', background: 'var(--color-background-secondary)',
                                borderRadius: 8, border: '1px solid var(--color-border-tertiary)',
                            }} className="no-print">
                                <i className="ti ti-filter" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }} />
                                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>من:</span>
                                <div style={{ width: 150 }}>
                                    <DatePicker
                                        value={fromDate}
                                        onChange={setFromDate}
                                        max={date}
                                        clearable
                                        placeholder="كل التواريخ"
                                    />
                                </div>
                                <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>إلى:</span>
                                <div style={{ width: 150 }}>
                                    <input
                                        type="text"
                                        value={fmtDate(date)}
                                        readOnly
                                        style={{
                                            padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)',
                                            background: 'var(--color-background-primary)', fontSize: 12,
                                            color: 'var(--color-text-secondary)', width: '100%',
                                        }}
                                    />
                                </div>
                                {fromDate && (
                                    <button
                                        onClick={() => setFromDate('')}
                                        style={{
                                            padding: '4px 10px', borderRadius: 6, border: 'none',
                                            background: 'var(--red)', color: '#fff',
                                            fontSize: 11, cursor: 'pointer', fontFamily: 'Tajawal, sans-serif',
                                            fontWeight: 600,
                                        }}
                                    >
                                        مسح الفلتر
                                    </button>
                                )}
                                <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                    {filteredTransactions.length} من {allTransactions.length} معاملة
                                </span>
                            </div>

                            {/* Summary cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                                <SummaryCard label="الرصيد الافتتاحي" value={openingBalance} color="var(--color-text-primary)" icon="ti-building-bank" />
                                <SummaryCard label="المستندات" value={totalDocs} color="var(--em)" icon="ti-file-invoice" />
                                <SummaryCard label="الدفعات" value={totalPays} color="var(--red)" icon="ti-wallet" />
                                <SummaryCard label="الرصيد النهائي" value={finalBalance} color={finalBalance >= 0 ? 'var(--red)' : 'var(--green)'} icon="ti-calculator" bold />
                            </div>

                            {/* Filter chips */}
                            <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
                                {([
                            { key: 'all' as TxTypeFilter, label: 'الكل', count: filteredTransactions.length },
                            { key: 'document' as TxTypeFilter, label: 'المستندات', count: filteredTransactions.filter(t => t.type === 'document').length },
                            { key: 'payment' as TxTypeFilter, label: 'الدفعات', count: filteredTransactions.filter(t => t.type === 'payment').length },
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

                                    // Aging color: <30 = default, 30-60 = amber, 60-90 = orange, >90 = red
                                    let agingColor = 'var(--color-text-tertiary)';
                                    let agingBg = 'transparent';
                                    let agingLabel = '';
                                    if (isOverdue && tx.remaining > 0) {
                                        if (daysOld > 90) {
                                            agingColor = '#dc2626'; agingBg = 'rgba(220,38,38,0.08)'; agingLabel = `${daysOld} يوم — متأخر جداً`;
                                        } else if (daysOld > 60) {
                                            agingColor = '#ea580c'; agingBg = 'rgba(234,88,12,0.08)'; agingLabel = `${daysOld} يوم — متأخر`;
                                        } else if (daysOld > 30) {
                                            agingColor = '#d97706'; agingBg = 'rgba(217,119,6,0.08)'; agingLabel = `${daysOld} يوم`;
                                        } else if (daysOld > 0) {
                                            agingColor = 'var(--color-text-secondary)'; agingBg = 'transparent'; agingLabel = `${daysOld} يوم`;
                                        }
                                    }

                                            return (
                                                <tr
                                                    key={`${tx.type}-${tx.id}`}
                                                    style={{
                                                        borderBottom: '1px solid var(--color-border-tertiary)',
                                                        background: isOverdue && daysOld > 90
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
                                                            <div style={{ display: 'block', marginTop: 3 }}>
                                                                <span style={{ fontSize: 10, color: 'var(--red)' }}>
                                                                    متبقي {fmtNumber(tx.remaining)}
                                                                </span>
                                                                {isOverdue && daysOld > 0 && (
                                                                    <span style={{
                                                                        display: 'inline-block', fontSize: 10, marginLeft: 4,
                                                                        padding: '1px 6px', borderRadius: 8,
                                                                        background: agingBg, color: agingColor,
                                                                        fontWeight: 600, lineHeight: '16px',
                                                                    }}>
                                                                        {agingLabel}
                                                                    </span>
                                                                )}
                                                            </div>
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
                                                الإجمالي ({filteredTransactions.length} معاملة)
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

                    {/* ── Detailed transactions tab ──────────────── */}
                    {modalTab === 'detailed' && (
                        <>
                            {detailedLoading ? (
                                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                                    <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
                                    <div style={{ marginTop: 8 }}>جاري تحميل السجل التفصيلي...</div>
                                </div>
                            ) : (detailedData?.transactions ?? []).length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
                                    <i className="ti ti-folder-open" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                                    لا توجد معاملات قبل هذا التاريخ
                                </div>
                            ) : (() => {
                                const detailedAll = detailedData?.transactions ?? [];
                                const filteredDetailed = fromDate
                                    ? detailedAll.filter(t => t.date >= fromDate)
                                    : detailedAll;
                                const detOpening = detailedData?.opening_balance ?? 0;
                                const detDocs = filteredDetailed.filter(t => t.type === 'document');
                                const detPays = filteredDetailed.filter(t => t.type === 'payment');
                                const detTotalDocs = detDocs.reduce((s, t) => s + t.document_amount, 0);
                                const detTotalPays = detPays.reduce((s, t) => s + t.payment_amount, 0);
                                let detRunning = detOpening;

                                return (
                                    <>
                                        {/* Summary cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                                            <SummaryCard label="الرصيد الافتتاحي" value={detOpening} color="var(--color-text-primary)" icon="ti-building-bank" />
                                            <SummaryCard label="المستندات" value={detTotalDocs} color="var(--em)" icon="ti-file-invoice" />
                                            <SummaryCard label="الدفعات" value={detTotalPays} color="var(--red)" icon="ti-wallet" />
                                            <SummaryCard label="الرصيد النهائي" value={detOpening + detTotalDocs - detTotalPays} color={detOpening + detTotalDocs - detTotalPays >= 0 ? 'var(--red)' : 'var(--green)'} icon="ti-calculator" bold />
                                        </div>

                                        {/* Date range filter */}
                                        <div style={{
                                            display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center',
                                            padding: '8px 12px', background: 'var(--color-background-secondary)',
                                            borderRadius: 8, border: '1px solid var(--color-border-tertiary)',
                                        }} className="no-print">
                                            <i className="ti ti-filter" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }} />
                                            <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontWeight: 600 }}>من:</span>
                                            <div style={{ width: 150 }}>
                                                <DatePicker value={fromDate} onChange={setFromDate} max={date} clearable placeholder="كل التواريخ" />
                                            </div>
                                            {fromDate && (
                                                <button onClick={() => setFromDate('')} style={{
                                                    padding: '4px 10px', borderRadius: 6, border: 'none',
                                                    background: 'var(--red)', color: '#fff',
                                                    fontSize: 11, cursor: 'pointer', fontWeight: 600,
                                                }}>مسح الفلتر</button>
                                            )}
                                            <button onClick={expandAllDocs} style={{
                                                padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)',
                                                background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)',
                                                fontSize: 11, cursor: 'pointer', fontWeight: 600,
                                                fontFamily: 'Tajawal, sans-serif', marginLeft: 'auto',
                                            }}>
                                                <i className={`ti ti-${expandedDocs.size === detDocs.length ? 'layout-grid' : 'layout-list'}`} style={{ marginLeft: 4 }} />
                                                {expandedDocs.size === detDocs.length ? 'طي الكل' : 'توسيع الكل'}
                                            </button>
                                            <span style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                                                {filteredDetailed.length} معاملة
                                            </span>
                                        </div>

                                        {/* Detailed table */}
                                        <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                                    <tr style={{ borderBottom: '2px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
                                                        <th style={thStyle}></th>
                                                        <th style={thStyle}>#</th>
                                                        <th style={thStyle}>التاريخ والوقت</th>
                                                        <th style={thStyle}>البيان</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>المستندات</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>الدفعات</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>الرصيد</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {/* Opening balance */}
                                                    <tr style={{ background: 'var(--color-background-secondary)', fontWeight: 600 }}>
                                                        <td style={tdStyle}></td>
                                                        <td style={tdStyle}>—</td>
                                                        <td style={tdStyle}>—</td>
                                                        <td style={tdStyle}>
                                                            <i className="ti ti-building-bank" style={{ marginLeft: 4 }} />
                                                            رصيد افتتاحي
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                                                            {fmtNumber(detOpening)} دج
                                                        </td>
                                                    </tr>

                                                    {filteredDetailed.map((tx, i) => {
                                                        detRunning = detRunning + tx.document_amount - tx.payment_amount;
                                                        const running = Math.round(detRunning * 100) / 100;
                                                        const isDoc = tx.type === 'document';
                                                        const hasLines = isDoc && tx.lines.length > 0;
                                                        const isExpanded = expandedDocs.has(tx.id);
                                                        const isOverdue = isDoc && tx.remaining > 0;
                                                        const txDate = new Date(tx.date);
                                                        const now = new Date();
                                                        const daysOld = Math.floor((now.getTime() - txDate.getTime()) / 86400000);

                                                        let agingColor = 'var(--color-text-tertiary)';
                                                        let agingBg = 'transparent';
                                                        let agingLabel = '';
                                                        if (isOverdue && tx.remaining > 0) {
                                                            if (daysOld > 90) { agingColor = '#dc2626'; agingBg = 'rgba(220,38,38,0.08)'; agingLabel = `${daysOld} يوم`; }
                                                            else if (daysOld > 60) { agingColor = '#ea580c'; agingBg = 'rgba(234,88,12,0.08)'; agingLabel = `${daysOld} يوم`; }
                                                            else if (daysOld > 30) { agingColor = '#d97706'; agingBg = 'rgba(217,119,6,0.08)'; agingLabel = `${daysOld} يوم`; }
                                                            else if (daysOld > 0) { agingColor = 'var(--color-text-secondary)'; agingLabel = `${daysOld} يوم`; }
                                                        }

                                                        return (
                                                            <React.Fragment key={`${tx.type}-${tx.id}`}>
                                                                <tr
                                                                    style={{
                                                                        borderBottom: isExpanded && hasLines ? 'none' : '1px solid var(--color-border-tertiary)',
                                                                        background: isOverdue && daysOld > 90
                                                                            ? 'rgba(220, 38, 38, 0.04)'
                                                                            : i % 2 === 0 ? 'transparent' : 'var(--color-background-secondary)',
                                                                        cursor: hasLines ? 'pointer' : 'default',
                                                                    }}
                                                                    onClick={hasLines ? () => toggleDoc(tx.id) : undefined}
                                                                >
                                                                    <td style={{ ...tdStyle, width: 32, textAlign: 'center' }}>
                                                                        {hasLines ? (
                                                                            <i className={`ti ti-chevron-${isExpanded ? 'down' : 'left'}`} style={{
                                                                                fontSize: 12, color: 'var(--color-text-secondary)',
                                                                                transition: 'transform .15s',
                                                                                transform: isExpanded ? 'rotate(0)' : 'rotate(0)',
                                                                            }} />
                                                                        ) : isDoc ? (
                                                                            <span style={{ width: 12 }} />
                                                                        ) : (
                                                                            <i className="ti ti-wallet" style={{ fontSize: 12, color: 'var(--em)' }} />
                                                                        )}
                                                                    </td>
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
                                                                            {isDoc && tx.type_code ? (
                                                                                <button
                                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/documents/${tx.type_code}/${tx.id}/edit`); onClose(); }}
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
                                                                            <Badge variant={isDoc ? 'danger' : 'success'} style={{ fontSize: 11 }}>
                                                                                {tx.label}
                                                                            </Badge>
                                                                            {isOverdue && tx.remaining > 0 && (
                                                                                <span style={{
                                                                                    fontSize: 10, padding: '1px 6px', borderRadius: 8,
                                                                                    background: agingBg, color: agingColor, fontWeight: 600,
                                                                                }}>
                                                                                    {agingLabel}
                                                                                </span>
                                                                            )}
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
                                                                        <span style={{ color: running >= 0 ? 'var(--red)' : 'var(--green)' }}>
                                                                            {fmtNumber(running)} دج
                                                                        </span>
                                                                        {tx.remaining > 0 && (
                                                                            <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 1 }}>
                                                                                متبقي {fmtNumber(tx.remaining)}
                                                                            </div>
                                                                        )}
                                                                    </td>
                                                                </tr>

                                                                {/* Product lines sub-rows */}
                                                                {isExpanded && hasLines && tx.lines.map((line, li) => (
                                                                    <tr
                                                                        key={`line-${tx.id}-${li}`}
                                                                        style={{
                                                                            borderBottom: '1px solid var(--color-border-tertiary)',
                                                                            background: 'rgba(59, 130, 246, 0.03)',
                                                                        }}
                                                                    >
                                                                        <td style={tdStyle}></td>
                                                                        <td style={{ ...tdStyle, fontSize: 10, color: 'var(--color-text-tertiary)' }}>
                                                                            {tx.seq}.{li + 1}
                                                                        </td>
                                                                        <td colSpan={2} style={{ ...tdStyle, padding: '4px 12px 4px 36px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                                <i className="ti ti-package" style={{ fontSize: 11, color: 'var(--text-info, #3b82f6)', opacity: 0.6 }} />
                                                                                <span style={{ fontWeight: 600, fontSize: 12 }}>{line.product_name}</span>
                                                                                <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>
                                                                                    ({line.product_ref})
                                                                                </span>
                                                                                {line.unit_name && (
                                                                                    <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', padding: '1px 5px', borderRadius: 4, background: 'var(--color-background-secondary)' }}>
                                                                                        {line.unit_name}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>
                                                                            {line.quantity > 0 ? (
                                                                                <span>{fmtNumber(line.quantity)}</span>
                                                                            ) : '—'}
                                                                        </td>
                                                                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>
                                                                            {line.discount_pct > 0 && (
                                                                                <span style={{ fontSize: 10, color: 'var(--red)' }}>
                                                                                    −{line.discount_pct}%
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12, fontWeight: 600 }}>
                                                                            {fmtNumber(line.total_ttc)} دج
                                                                            <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', display: 'block' }}>
                                                                                HT: {fmtNumber(line.total_ht)} + TVA {line.tva_rate}%
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}

                                                    {/* Footer summary */}
                                                    <tr style={{
                                                        fontWeight: 700,
                                                        background: 'var(--color-background-secondary)',
                                                        borderTop: '2px solid var(--color-border-secondary)',
                                                    }}>
                                                        <td style={tdStyle}></td>
                                                        <td style={tdStyle} colSpan={2}>—</td>
                                                        <td style={tdStyle}>
                                                            <i className="ti ti-calculator" style={{ marginLeft: 4 }} />
                                                            الإجمالي ({filteredDetailed.length} معاملة)
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--em)', fontWeight: 700 }}>
                                                            {fmtNumber(detTotalDocs)} دج
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>
                                                            {fmtNumber(detTotalPays)} دج
                                                        </td>
                                                        <td style={{
                                                            ...tdStyle, textAlign: 'center', fontWeight: 800,
                                                            fontSize: 14, color: (detOpening + detTotalDocs - detTotalPays) >= 0 ? 'var(--red)' : 'var(--green)',
                                                        }}>
                                                            {fmtNumber(detOpening + detTotalDocs - detTotalPays)} دج
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}

                    {/* ── Products tab ─────────────────────────────── */}
                    {modalTab === 'products' && (
                        <>
                            {recapLoading ? (
                                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-secondary)' }}>
                                    <i className="ti ti-loader-2" style={{ fontSize: 28, animation: 'spin 1s linear infinite' }} />
                                    <div style={{ marginTop: 8 }}>جاري تحميل ملخص المنتجات...</div>
                                </div>
                            ) : recapProducts.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 48, color: 'var(--color-text-tertiary)' }}>
                                    <i className="ti ti-package-off" style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                                    لا توجد منتجات في هذه الفترة
                                </div>
                            ) : (
                                <>
                                    {/* Summary cards for products */}
                                    {recapSummary && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
                                            <SummaryCard label="عدد المنتجات" value={recapSummary.product_count} color="var(--text-info, #3b82f6)" icon="ti-package" />
                                            <SummaryCard label="مبيعات HT" value={recapSummary.total_sale_ht} color="var(--em)" icon="ti-arrow-up-circle" />
                                            <SummaryCard label="مشتريات HT" value={recapSummary.total_purchase_ht} color="var(--red)" icon="ti-arrow-down-circle" />
                                            <SummaryCard label="إجمالي TTC" value={recapSummary.total_sale_ttc + recapSummary.total_purchase_ttc} color="var(--text-info, #3b82f6)" icon="ti-calculator" bold />
                                        </div>
                                    )}

                                    {/* Products table */}
                                    <div style={{ overflowX: 'auto', maxHeight: '55vh', overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                            <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                                <tr style={{ borderBottom: '2px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
                                                    <th style={thStyle}>#</th>
                                                    <th style={thStyle}>المرجع</th>
                                                    <th style={thStyle}>المنتج</th>
                                                    <th style={thStyle}>المجموعة</th>
                                                    <th style={thStyle}>العلامة التجارية</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>الوحدة</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>كمية البيع</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>مبيعات HT</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>كمية الشراء</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>مشتريات HT</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>الإجمالي TTC</th>
                                                    <th style={{ ...thStyle, textAlign: 'center' }}>المستندات</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recapProducts.map((p, i) => (
                                                    <tr
                                                        key={p.product_id}
                                                        style={{
                                                            borderBottom: '1px solid var(--color-border-tertiary)',
                                                            background: i % 2 === 0 ? 'transparent' : 'var(--color-background-secondary)',
                                                        }}
                                                    >
                                                        <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontSize: 11 }}>
                                                            {i + 1}
                                                        </td>
                                                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                                                            {p.product_ref || '—'}
                                                        </td>
                                                        <td style={tdStyle}>{p.product_name}</td>
                                                        <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                                                            {p.family_name || '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                                                            {p.brand_name || '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                            {p.unit_name || '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            {p.sale_qty > 0 ? fmtNumber(p.sale_qty) : '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: p.sale_ht > 0 ? 600 : undefined }}>
                                                            {p.sale_ht > 0 ? (
                                                                <span style={{ color: 'var(--em)' }}>{fmtNumber(p.sale_ht)} دج</span>
                                                            ) : '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            {p.purchase_qty > 0 ? fmtNumber(p.purchase_qty) : '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: p.purchase_ht > 0 ? 600 : undefined }}>
                                                            {p.purchase_ht > 0 ? (
                                                                <span style={{ color: 'var(--red)' }}>{fmtNumber(p.purchase_ht)} دج</span>
                                                            ) : '—'}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                                                            {fmtNumber(p.total_ttc)} دج
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                                            {p.doc_count}
                                                        </td>
                                                    </tr>
                                                ))}

                                                {/* Footer summary row */}
                                                {recapSummary && (
                                                    <tr style={{
                                                        fontWeight: 700,
                                                        background: 'var(--color-background-secondary)',
                                                        borderTop: '2px solid var(--color-border-secondary)',
                                                    }}>
                                                         <td style={tdStyle} colSpan={2} />
                                                        <td style={tdStyle} colSpan={3}>
                                                            <i className="ti ti-calculator" style={{ marginLeft: 4 }} />
                                                            الإجمالي ({recapSummary.product_count} منتج)
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--em)', fontWeight: 700 }}>
                                                            {fmtNumber(recapProducts.reduce((s, p) => s + p.sale_qty, 0))}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--em)', fontWeight: 700 }}>
                                                            {fmtNumber(recapSummary.total_sale_ht)} دج
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>
                                                            {fmtNumber(recapProducts.reduce((s, p) => s + p.purchase_qty, 0))}
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>
                                                            {fmtNumber(recapSummary.total_purchase_ht)} دج
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, fontSize: 14, color: 'var(--text-info, #3b82f6)' }}>
                                                            {fmtNumber(recapSummary.total_sale_ttc + recapSummary.total_purchase_ttc)} دج
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </>
                    )}
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

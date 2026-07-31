import React, { useState, useMemo, useCallback } from 'react';
import { usePartyBalanceHistory, usePartyProductRecap, usePartyDetailedHistory } from '@/lib/api/endpoints/partyBalances';
import { type Column } from '@/components/ui/DataTable';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { fmtNumber, fmtDate } from '@/lib/utils';
import SimpleTable from '@/components/ui/SimpleTable';
import type { SimpleColumn } from '@/components/ui/SimpleTable';

type TxTypeFilter = 'all' | 'document' | 'payment';
type ModalTab = 'transactions' | 'products' | 'detailed';

const MODAL_CONTENT_HEIGHT = '65vh';

function subtractDays(dateStr: string, days: number): string {
    const d = new Date(dateStr);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
}

export function TransactionHistoryModal({
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
    const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
    const [fromDate, setFromDate] = useState('');

    const openingBalance = data?.opening_balance ?? 0;
    const allTransactions = data?.transactions ?? [];

    const computedFromBalance = useMemo(() => {
        if (!fromDate || allTransactions.length === 0) return openingBalance;
        let running = openingBalance;
        for (const tx of allTransactions) {
            if (tx.date >= fromDate) break;
            running = running + tx.document_amount - tx.payment_amount;
        }
        return Math.round(running * 100) / 100;
    }, [fromDate, allTransactions, openingBalance]);

    const filteredTransactions = useMemo(() => {
        if (!fromDate) return allTransactions;
        return allTransactions.filter(tx => tx.date >= fromDate);
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
        const detFilteredDocs = fromDate ? detailedAll.filter(t => t.type === 'document' && t.date >= fromDate) : detailedAll.filter(t => t.type === 'document');
        if (expandedDocs.size === detFilteredDocs.length) {
            setExpandedDocs(new Set());
        } else {
            setExpandedDocs(new Set(detFilteredDocs.map(t => t.id)));
        }
    }, [detailedData, expandedDocs.size, fromDate]);

    const transactions = useMemo(() => {
        if (txFilter === 'all') return filteredTransactions;
        return filteredTransactions.filter(t => t.type === txFilter);
    }, [filteredTransactions, txFilter]);

    const txWithBalance = useMemo(() => {
        let running = computedFromBalance;
        let runningMargin = 0;
        return transactions.map(tx => {
            running = running + tx.document_amount - tx.payment_amount;
            runningMargin += tx.margin_value;
            return { ...tx, running_balance: Math.round(running * 100) / 100, running_margin: Math.round(runningMargin * 100) / 100 };
        });
    }, [transactions, computedFromBalance]);

    const totalDocs   = useMemo(() => filteredTransactions.reduce((s, t) => s + t.document_amount, 0), [filteredTransactions]);
    const totalPays   = useMemo(() => filteredTransactions.reduce((s, t) => s + t.payment_amount, 0), [filteredTransactions]);
    const totalMargin = useMemo(() => filteredTransactions.reduce((s, t) => s + t.margin_value, 0), [filteredTransactions]);
    const totalCost   = useMemo(() => filteredTransactions.reduce((s, t) => s + t.doc_cost_ht, 0), [filteredTransactions]);
    const finalBalance = computedFromBalance + totalDocs - totalPays;

    const txColumns: SimpleColumn[] = useMemo(() => [
        { key: '#', label: '#', render: (v, row) => {
            if (row._rowType === 'opening' || row._rowType === 'summary') return null;
            return <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{v as React.ReactNode}</span>;
        }},
        { key: 'date', label: 'التاريخ والوقت', render: (v, row) => {
            if (row._rowType !== 'data') return v as React.ReactNode;
            const tx = row._tx as any;
            return (
                <div style={{ lineHeight: 1.3 }}>
                    <div>{fmtDate(tx.date)}</div>
                    {tx.datetime && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{new Date(tx.datetime).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</div>}
                </div>
            );
        }},
        { key: 'label', label: 'البيان', render: (v, row) => {
            if (row._rowType === 'opening') return <div><i className="ti ti-building-bank" style={{ marginLeft: 4 }} /> {v as string}</div>;
            if (row._rowType === 'summary') return <div><i className="ti ti-calculator" style={{ marginLeft: 4 }} /> {v as string}</div>;
            const tx = row._tx as any;
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {tx.type === 'document' && tx.type_code ? (
                        <button onClick={() => { navigate(`/documents/${tx.type_code}/${tx.id}/edit`); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-info, var(--blue))', textDecoration: 'underline', padding: 0 }}>{tx.reference}</button>
                    ) : (
                        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>{tx.reference || '—'}</span>
                    )}
                    <Badge variant={tx.type === 'document' ? 'danger' : 'success'} style={{ fontSize: 11 }}>{tx.label}</Badge>
                    {!!row._isOverdue && tx.remaining > 0 && (
                        <span style={{ display: 'inline-block', fontSize: 10, marginLeft: 4, padding: '1px 6px', borderRadius: 8, background: row._agingBg as string, color: row._agingColor as string, fontWeight: 600, lineHeight: '16px' }}>{row._agingLabel as string}</span>
                    )}
                </div>
            );
        }},
        { key: 'doc_amount', label: 'المستندات', align: 'center', render: (v, row) => {
            if (row._rowType === 'opening' || row._rowType === 'summary') return v as React.ReactNode;
            const amount = v as number;
            return amount !== 0 ? <span style={{ color: amount > 0 ? 'var(--em)' : 'var(--red)', fontWeight: amount > 0 ? 600 : undefined }}>{fmtNumber(amount)} دج</span> : '—';
        }},
        { key: 'cost', label: 'التكلفة', align: 'center', render: (v, row) => {
            if (row._rowType === 'opening' || row._rowType === 'summary') {
                if (row._rowType === 'summary') return <span style={{ fontWeight: 700 }}>{fmtNumber(v as number)} دج</span>;
                return v as React.ReactNode;
            }
            const cost = v as number;
            return cost > 0 ? <span style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{fmtNumber(cost)} دج</span> : '—';
        }},
        { key: 'margin', label: 'الهامش', align: 'center', render: (v, row) => {
            const margin = v as number;
            if (row._rowType === 'summary') {
                return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: margin >= 0 ? 'var(--greenb)' : 'var(--redb)', color: margin >= 0 ? 'var(--em)' : 'var(--red)' }}>{fmtNumber(margin)} دج</span>;
            }
            if (row._rowType === 'opening') return '—';
            return margin !== 0 ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: margin >= 0 ? 'var(--greenb)' : 'var(--redb)', color: margin >= 0 ? 'var(--em)' : 'var(--red)' }}>{fmtNumber(margin)} دج</span> : '—';
        }},
        { key: 'payment', label: 'الدفعات', align: 'center', render: (v, row) => {
            if (row._rowType === 'opening') return '—';
            if (row._rowType === 'summary') return <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtNumber(v as number)} دج</span>;
            const pay = v as number;
            return pay > 0 ? <span style={{ color: 'var(--red)', fontWeight: 600 }}>{fmtNumber(pay)} دج</span> : '—';
        }},
        { key: 'running_balance', label: 'الرصيد', align: 'center', render: (v, row) => {
            if (row._rowType === 'opening') return <span style={{ fontWeight: 700 }}>{fmtNumber(v as number)} دج</span>;
            if (row._rowType === 'summary') return <span style={{ fontWeight: 800, fontSize: 14, color: (v as number) >= 0 ? 'var(--red)' : 'var(--green)' }}>{fmtNumber(v as number)} دج</span>;
            const tx = row._tx as any;
            const running = v as number;
            return (
                <>
                    <span style={{ color: running >= 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{fmtNumber(running)} دج</span>
                    {tx.remaining > 0 && (
                        <div style={{ display: 'block', marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: 'var(--red)' }}>متبقي {fmtNumber(tx.remaining)}</span>
                            {!!row._isOverdue && (row._daysOld as number) > 0 && (
                                <span style={{ display: 'inline-block', fontSize: 10, marginLeft: 4, padding: '1px 6px', borderRadius: 8, background: row._agingBg as string, color: row._agingColor as string, fontWeight: 600, lineHeight: '16px' }}>{row._agingLabel as string}</span>
                            )}
                        </div>
                    )}
                </>
            );
        }},
    ], [navigate, onClose]);

    const txTableData = useMemo(() => {
        const openingRow: Record<string, unknown> = {
            _rowType: 'opening', '#': '—', date: '—',
            label: fromDate ? `رصيد حتى ${fmtDate(subtractDays(fromDate, 1))}` : 'رصيد افتتاحي',
            doc_amount: '—', cost: '—', margin: '—', payment: '—', running_balance: computedFromBalance,
        };
        const dataRows = txWithBalance.map((tx, i) => {
            const isOverdue = tx.type === 'document' && tx.remaining > 0;
            const txDate = new Date(tx.date);
            const now = new Date();
            const daysOld = Math.floor((now.getTime() - txDate.getTime()) / 86400000);
            let agingColor = 'var(--color-text-tertiary)';
            let agingBg = 'transparent';
            let agingLabel = '';
            if (isOverdue && tx.remaining > 0) {
                if (daysOld > 90) { agingColor = 'var(--red)'; agingBg = 'var(--redb)'; agingLabel = `${daysOld} يوم — متأخر جداً`; }
                else if (daysOld > 60) { agingColor = '#ea580c'; agingBg = 'rgba(234,88,12,0.08)'; agingLabel = `${daysOld} يوم — متأخر`; }
                else if (daysOld > 30) { agingColor = 'var(--gold)'; agingBg = 'var(--goldb)'; agingLabel = `${daysOld} يوم`; }
                else if (daysOld > 0) { agingColor = 'var(--color-text-secondary)'; agingBg = 'transparent'; agingLabel = `${daysOld} يوم`; }
            }
            return {
                _rowType: 'data', _tx: tx, _i: i, _isOverdue: isOverdue, _daysOld: daysOld,
                _agingColor: agingColor, _agingBg: agingBg, _agingLabel: agingLabel,
                '#': tx.seq, date: tx.date, label: tx.label,
                doc_amount: tx.document_amount, cost: tx.doc_cost_ht, margin: tx.margin_value,
                payment: tx.payment_amount, running_balance: tx.running_balance, remaining: tx.remaining,
            };
        });
        const summaryRow: Record<string, unknown> = {
            _rowType: 'summary', '#': '', date: '',
            label: `الإجمالي (${filteredTransactions.length} معاملة)`,
            doc_amount: totalDocs, cost: totalCost, margin: totalMargin,
            payment: totalPays, running_balance: finalBalance,
        };
        return [openingRow, ...dataRows, summaryRow];
    }, [txWithBalance, fromDate, filteredTransactions.length, totalDocs, totalPays, totalMargin, totalCost, finalBalance, computedFromBalance]);

    const excelColumns: Column<Record<string, unknown>>[] = useMemo(() => [
        { key: '#',              header: '#',               width: 50 },
        { key: 'date',           header: 'التاريخ',         width: 120 },
        { key: 'reference',      header: 'المرجع',          width: 140 },
        { key: 'label',          header: 'البيان',          width: 140 },
        { key: 'doc_amount',     header: 'المستندات',       width: 120, align: 'center' },
        { key: 'doc_cost',       header: 'التكلفة',         width: 120, align: 'center' },
        { key: 'margin',         header: 'الهامش',          width: 120, align: 'center' },
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
            doc_cost:         tx.doc_cost_ht || '',
            margin:           tx.margin_value || '',
            pay_amount:       tx.payment_amount || '',
            running_balance:  tx.running_balance,
        }));

        const allRows = [
            { '#': '', date: '', reference: '', label: `الرصيد الافتتاحي: ${fmtNumber(computedFromBalance)} دج`, doc_amount: '', doc_cost: '', margin: '', pay_amount: '', running_balance: computedFromBalance },
            ...rows,
            { '#': '', date: '', reference: '', label: `الإجمالي: المستندات ${fmtNumber(totalDocs)} | الدفعات ${fmtNumber(totalPays)} | الهامش ${fmtNumber(totalMargin)}`, doc_amount: totalDocs, doc_cost: totalCost, margin: totalMargin, pay_amount: totalPays, running_balance: finalBalance },
        ];

        const { exportToExcelAdvanced } = await import('@/components/ui/DataTable/excelExportAdvanced');
        await exportToExcelAdvanced(
            allRows as Record<string, unknown>[],
            excelColumns as never[],
            {
                fileName: `كشف_حساب_${partyName}_${date}`,
                title: `كشف حساب – ${partyName}`,
                sheetName: 'كشف حساب',
                documentInfo: { party: partyName, date } as any,
                showAggregates: false,
            },
        );
    }, [txWithBalance, computedFromBalance, totalDocs, totalPays, totalMargin, finalBalance, partyName, date, excelColumns, totalCost]);

    const recapProducts = recapData?.products ?? [];
    const recapSummary = recapData?.summary;

    const recapColumns: SimpleColumn[] = useMemo(() => [
        { key: '#', label: '#', render: (v) => <span style={{ color: 'var(--color-text-tertiary)', fontSize: 11 }}>{v ? String(v) : ''}</span> },
        { key: 'ref', label: 'المرجع', render: (v, row) => row._rowType === 'summary' ? null : <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v as string}</span> },
        { key: 'name', label: 'المنتج', render: (v, row) => {
            if (row._rowType === 'summary') return <div><i className="ti ti-calculator" style={{ marginLeft: 4 }} /> {v as string}</div>;
            return v as string;
        }},
        { key: 'family', label: 'المجموعة', render: (v, row) => row._rowType === 'summary' ? null : <span style={{ color: 'var(--color-text-secondary)' }}>{v as string}</span> },
        { key: 'brand', label: 'العلامة التجارية', render: (v, row) => row._rowType === 'summary' ? null : <span style={{ color: 'var(--color-text-secondary)' }}>{v as string}</span> },
        { key: 'unit', label: 'الوحدة', align: 'center', render: (v, row) => row._rowType === 'summary' ? '—' : <span style={{ color: 'var(--color-text-secondary)' }}>{v as string}</span> },
        { key: 'sale_qty', label: 'كمية البيع', align: 'center', render: (v, row) => {
            const qty = v as number;
            if (row._rowType === 'summary') return <span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmtNumber(qty)}</span>;
            return qty > 0 ? fmtNumber(qty) : '—';
        }},
        { key: 'sale_ht', label: 'مبيعات HT', align: 'center', render: (v, row) => {
            const val = v as number;
            if (row._rowType === 'summary') return <span style={{ color: 'var(--em)', fontWeight: 700 }}>{fmtNumber(val)} دج</span>;
            return val > 0 ? <span style={{ color: 'var(--em)' }}>{fmtNumber(val)} دج</span> : '—';
        }},
        { key: 'purchase_qty', label: 'كمية الشراء', align: 'center', render: (v, row) => {
            const qty = v as number;
            if (row._rowType === 'summary') return <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtNumber(qty)}</span>;
            return qty > 0 ? fmtNumber(qty) : '—';
        }},
        { key: 'purchase_ht', label: 'مشتريات HT', align: 'center', render: (v, row) => {
            const val = v as number;
            if (row._rowType === 'summary') return <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtNumber(val)} دج</span>;
            return val > 0 ? <span style={{ color: 'var(--red)' }}>{fmtNumber(val)} دج</span> : '—';
        }},
        { key: 'cost_ht', label: 'التكلفة', align: 'center', render: (v, row) => {
            const val = v as number;
            if (row._rowType === 'summary') return <span style={{ fontWeight: 700 }}>{fmtNumber(val)} دج</span>;
            return val > 0 ? <span style={{ color: 'var(--color-text-secondary)' }}>{fmtNumber(val)} دج</span> : '—';
        }},
        { key: 'total_ttc', label: 'الإجمالي TTC', align: 'center', render: (v, row) => {
            const val = v as number;
            if (row._rowType === 'summary') return <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-info, var(--blue))' }}>{fmtNumber(val)} دج</span>;
            return <span style={{ fontWeight: 700 }}>{fmtNumber(val)} دج</span>;
        }},
        { key: 'margin_value', label: 'الهامش', align: 'center', render: (v) => {
            const val = v as number;
            return <span style={{ fontWeight: 600, color: val >= 0 ? 'var(--em)' : 'var(--red)' }}>{fmtNumber(val)} دج</span>;
        }},
        { key: 'margin_pct', label: 'نسبة الهامش', align: 'center', render: (v) => {
            const val = v as number;
            return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: val >= 0 ? 'var(--greenb)' : 'var(--redb)', color: val >= 0 ? 'var(--em)' : 'var(--red)' }}>{val}%</span>;
        }},
        { key: 'doc_count', label: 'المستندات', align: 'center', render: (v, row) => {
            if (row._rowType === 'summary') return '—';
            return <span style={{ color: 'var(--color-text-secondary)' }}>{v as number}</span>;
        }},
    ], []);

    const recapTableData = useMemo(() => {
        const dataRows = recapProducts.map((p, i) => ({
            _rowType: 'data',
            '#': i + 1, ref: p.product_ref || '—', name: p.product_name,
            family: p.family_name || '—', brand: p.brand_name || '—', unit: p.unit_name || '—',
            sale_qty: p.sale_qty || 0, sale_ht: p.sale_ht || 0,
            purchase_qty: p.purchase_qty || 0, purchase_ht: p.purchase_ht || 0,
            cost_ht: p.cost_ht || 0, total_ttc: p.total_ttc,
            margin_value: p.margin_value, margin_pct: p.margin_pct, doc_count: p.doc_count,
        }));
        if (recapSummary) {
            const summaryRow: Record<string, unknown> = {
                _rowType: 'summary', '#': '', ref: '',
                name: `الإجمالي (${recapSummary.product_count} منتج)`,
                family: '', brand: '', unit: '—',
                sale_qty: recapProducts.reduce((s, p) => s + (p.sale_qty || 0), 0),
                sale_ht: recapSummary.total_sale_ht,
                purchase_qty: recapProducts.reduce((s, p) => s + (p.purchase_qty || 0), 0),
                purchase_ht: recapSummary.total_purchase_ht,
                cost_ht: recapSummary.total_cost_ht,
                total_ttc: recapSummary.total_sale_ttc + recapSummary.total_purchase_ttc,
                margin_value: recapSummary.total_margin_value,
                margin_pct: recapSummary.total_margin_pct,
                doc_count: '—',
            };
            return [...dataRows, summaryRow];
        }
        return dataRows;
    }, [recapProducts, recapSummary]);

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
                documentInfo: { party: partyName, date } as any,
                showAggregates: false,
            },
        );
    }, [recapProducts, recapSummary, partyName, date, recapExcelColumns]);

    const detailedAll = detailedData?.transactions ?? [];
    const filteredDetailed = useMemo(() => {
        if (!fromDate) return detailedAll;
        return detailedAll.filter(tx => tx.date >= fromDate);
    }, [detailedAll, fromDate]);

    const detailedExcelColumns: Column<Record<string, unknown>>[] = useMemo(() => [
        { key: '#',              header: '#',               width: 50 },
        { key: 'date',           header: 'التاريخ',         width: 120 },
        { key: 'reference',      header: 'المرجع',          width: 140 },
        { key: 'label',          header: 'البيان',          width: 120 },
        { key: 'doc_amount',     header: 'المستندات',       width: 120, align: 'center' },
        { key: 'doc_cost',       header: 'التكلفة',         width: 120, align: 'center' },
        { key: 'margin',         header: 'الهامش',          width: 120, align: 'center' },
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
        { key: 'line_cost',      header: 'التكلفة',         width: 120, align: 'center' },
        { key: 'line_margin',    header: 'الهامش',          width: 120, align: 'center' },
    ], []);

    const handleExportDetailedExcel = useCallback(async () => {
        const detOpening = detailedData?.opening_balance ?? 0;
        const detFilteredAll = fromDate ? detailedAll.filter(tx => tx.date >= fromDate) : detailedAll;
        const computedDetExportBalance = fromDate ? (() => {
            let r = detOpening;
            for (const tx of detailedAll) {
                if (tx.date >= fromDate) break;
                r = r + tx.document_amount - tx.payment_amount;
            }
            return Math.round(r * 100) / 100;
        })() : detOpening;
        let running = computedDetExportBalance;
        const rows: Record<string, unknown>[] = [];

        rows.push({
            '#': '', date: '', reference: '', label: `الرصيد الافتتاحي: ${fmtNumber(computedDetExportBalance)} دج`,
            doc_amount: '', doc_cost: '', margin: '', pay_amount: '', remaining: '', running_balance: computedDetExportBalance,
            product_name: '', product_ref: '', unit_name: '', quantity: '',
            line_ht: '', line_discount: '', line_tva_rate: '', line_ttc: '', line_cost: '', line_margin: '',
        });

        for (const tx of detFilteredAll) {
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
                        doc_cost:         li === 0 ? (tx.doc_cost_ht || '') : '',
                        margin:           li === 0 ? (tx.margin_value || '') : '',
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
                        line_cost:        line.line_cost_ht || '',
                        line_margin:      line.line_margin || '',
                    });
                });
            } else {
                rows.push({
                    '#':              tx.seq,
                    date:             fmtDate(tx.date),
                    reference:        tx.reference || '—',
                    label:            tx.label,
                    doc_amount:       tx.document_amount || '',
                    doc_cost:         tx.doc_cost_ht || '',
                    margin:           tx.margin_value || '',
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
                    line_cost:        '',
                    line_margin:      '',
                });
            }
        }

        const detDocs = detFilteredAll.filter(t => t.type === 'document');
        const detPays = detFilteredAll.filter(t => t.type === 'payment');
        const detTotalDocs = detDocs.reduce((s, t) => s + t.document_amount, 0);
        const detTotalPays = detPays.reduce((s, t) => s + t.payment_amount, 0);
        const detTotalCost = detFilteredAll.reduce((s, t) => s + t.doc_cost_ht, 0);
        const detTotalMargin = detFilteredAll.reduce((s, t) => s + t.margin_value, 0);
        rows.push({
            '#': '', date: '', reference: '',
            label: `الإجمالي: المستندات ${fmtNumber(detTotalDocs)} | الدفعات ${fmtNumber(detTotalPays)} | الهامش ${fmtNumber(detTotalMargin)}`,
            doc_amount: detTotalDocs, doc_cost: detTotalCost, margin: detTotalMargin, pay_amount: detTotalPays, remaining: '',
            running_balance: computedDetExportBalance + detTotalDocs - detTotalPays,
            product_name: '', product_ref: '', unit_name: '', quantity: '',
            line_ht: '', line_discount: '', line_tva_rate: '', line_ttc: '', line_cost: '', line_margin: '',
        });

        const { exportToExcelAdvanced } = await import('@/components/ui/DataTable/excelExportAdvanced');
        await exportToExcelAdvanced(
            rows,
            detailedExcelColumns as never[],
            {
                fileName: `كشف_تفصيلي_${partyName}_${date}`,
                title: `كشف حساب تفصيلي – ${partyName}`,
                sheetName: 'الحركات التفصيلية',
                documentInfo: { party: partyName, date } as any,
                showAggregates: false,
            },
        );
    }, [detailedData, partyName, date, detailedExcelColumns, fromDate, detailedAll]);

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
            <div className="print-only" style={{ display: 'none' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>كشف حساب – {partyName}</h2>
                <p style={{ fontSize: 12, color: 'var(--t3)' }}>إلى {fmtDate(date)}</p>
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

                    <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', padding: '8px 12px', background: 'var(--color-background-secondary)', borderRadius: 8, border: '1px solid var(--color-border-tertiary)' }}>
                        <i className="ti ti-calendar" style={{ fontSize: 14, color: 'var(--color-text-secondary)' }} />
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>من</label>
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            max={date}
                            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)', fontSize: 12, fontFamily: 'Tajawal, sans-serif', background: 'var(--color-background-primary)', color: 'var(--color-text-primary)' }}
                        />
                        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>إلى</label>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-primary)', padding: '4px 8px', background: 'var(--color-background-primary)', borderRadius: 6, border: '1px solid var(--color-border-tertiary)' }}>{fmtDate(date)}</span>
                        {fromDate && (
                            <button
                                onClick={() => setFromDate('')}
                                style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: 'var(--color-background-primary)', color: 'var(--red)', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}
                            >
                                <i className="ti ti-x" style={{ marginLeft: 2 }} /> مسح الفلتر
                            </button>
                        )}
                    </div>

                    {modalTab === 'transactions' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                                <SummaryCard label={fromDate ? `رصيد ${fmtDate(fromDate)}` : 'الرصيد الافتتاحي'} value={computedFromBalance} color="var(--color-text-primary)" icon="ti-building-bank" />
                                <SummaryCard label="المستندات" value={totalDocs} color="var(--em)" icon="ti-file-invoice" />
                                <SummaryCard label="الدفعات" value={totalPays} color="var(--red)" icon="ti-wallet" />
                                <SummaryCard label="التكلفة" value={totalCost} color="var(--red)" icon="ti-arrow-down-circle" />
                                <SummaryCard label="الهامش" value={totalMargin} color={totalMargin >= 0 ? 'var(--em)' : 'var(--red)'} icon="ti-chart-bar" />
                            </div>

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

                            <div style={{ maxHeight: MODAL_CONTENT_HEIGHT, overflowY: 'auto' }}>
                                <SimpleTable
                                    columns={txColumns}
                                    data={txTableData}
                                    rowKey={(row) => row._rowType === 'data' ? `${(row._tx as any).type}-${(row._tx as any).id}` : String(row._rowType)}
                                />
                            </div>
                        </>
                    )}

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
                                const detOpening = detailedData?.opening_balance ?? 0;
                                const detFiltered = fromDate ? detailedAll.filter(tx => tx.date >= fromDate) : detailedAll;
                                const computedDetBalance = fromDate ? (() => {
                                    let r = detOpening;
                                    for (const tx of detailedAll) {
                                        if (tx.date >= fromDate) break;
                                        r = r + tx.document_amount - tx.payment_amount;
                                    }
                                    return Math.round(r * 100) / 100;
                                })() : detOpening;
                                const detDocs = detFiltered.filter(t => t.type === 'document');
                                const detPays = detFiltered.filter(t => t.type === 'payment');
                                const detTotalDocs = detDocs.reduce((s, t) => s + t.document_amount, 0);
                                const detTotalPays = detPays.reduce((s, t) => s + t.payment_amount, 0);
                                const detTotalCost = detFiltered.reduce((s, t) => s + t.doc_cost_ht, 0);
                                const detTotalMargin = detFiltered.reduce((s, t) => s + t.margin_value, 0);
                                let detRunning = computedDetBalance;
                                let detRunningMargin = 0;

                                return (
                                    <>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                                            <SummaryCard label={fromDate ? `رصيد ${fmtDate(fromDate)}` : 'الرصيد الافتتاحي'} value={computedDetBalance} color="var(--color-text-primary)" icon="ti-building-bank" />
                                            <SummaryCard label="المستندات" value={detTotalDocs} color="var(--em)" icon="ti-file-invoice" />
                                            <SummaryCard label="الدفعات" value={detTotalPays} color="var(--red)" icon="ti-wallet" />
                                            <SummaryCard label="التكلفة" value={detTotalCost} color="var(--red)" icon="ti-arrow-down-circle" />
                                            <SummaryCard label="الهامش" value={detTotalMargin} color={detTotalMargin >= 0 ? 'var(--em)' : 'var(--red)'} icon="ti-chart-bar" />
                                        </div>

                                        <div className="no-print" style={{ display: 'flex', gap: 6, marginBottom: 12, alignItems: 'center' }}>
                                            <button onClick={expandAllDocs} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--color-border-tertiary)', background: 'var(--color-background-primary)', color: 'var(--color-text-secondary)', fontSize: 11, cursor: 'pointer', fontWeight: 600, fontFamily: 'Tajawal, sans-serif' }}>
                                                <i className={`ti ti-${expandedDocs.size === detDocs.length ? 'layout-grid' : 'layout-list'}`} style={{ marginLeft: 4 }} />
                                                {expandedDocs.size === detDocs.length ? 'طي الكل' : 'توسيع الكل'}
                                            </button>
                                            <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--color-text-tertiary)' }}>{detFiltered.length} معاملة</span>
                                        </div>

                                        <div style={{ overflowX: 'auto', maxHeight: MODAL_CONTENT_HEIGHT, overflowY: 'auto' }}>
                                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                                <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                                    <tr style={{ borderBottom: '2px solid var(--color-border-secondary)', background: 'var(--color-background-primary)' }}>
                                                        <th style={thStyle}></th>
                                                        <th style={thStyle}>#</th>
                                                        <th style={thStyle}>التاريخ والوقت</th>
                                                        <th style={thStyle}>البيان</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>المستندات</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>التكلفة</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>الهامش</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>الدفعات</th>
                                                        <th style={{ ...thStyle, textAlign: 'center' }}>الرصيد</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr style={{ background: 'var(--color-background-secondary)', fontWeight: 600 }}>
                                                        <td style={tdStyle}></td>
                                                        <td style={tdStyle}>—</td>
                                                        <td style={tdStyle}>—</td>
                                                        <td style={tdStyle}><i className="ti ti-building-bank" style={{ marginLeft: 4 }} /> {fromDate ? `رصيد حتى ${fmtDate(subtractDays(fromDate, 1))}` : 'رصيد افتتاحي'}</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>—</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{fmtNumber(computedDetBalance)} دج</td>
                                                    </tr>

                                                    {detFiltered.map((tx, i) => {
                                                        detRunning = detRunning + tx.document_amount - tx.payment_amount;
                                                        detRunningMargin += tx.margin_value;
                                                        const running = Math.round(detRunning * 100) / 100;
                                                        const isDoc = tx.type === 'document';
                                                        const hasLines = isDoc && (tx as any).lines?.length > 0;
                                                        const isExpanded = expandedDocs.has(tx.id);
                                                        const isOverdue = isDoc && tx.remaining > 0;
                                                        const txDate = new Date(tx.date);
                                                        const now = new Date();
                                                        const daysOld = Math.floor((now.getTime() - txDate.getTime()) / 86400000);

                                                        let agingColor = 'var(--color-text-tertiary)';
                                                        let agingBg = 'transparent';
                                                        let agingLabel = '';
                                                        if (isOverdue && tx.remaining > 0) {
                                                            if (daysOld > 90) { agingColor = 'var(--red)'; agingBg = 'var(--redb)'; agingLabel = `${daysOld} يوم — متأخر جداً`; }
                                                            else if (daysOld > 60) { agingColor = '#ea580c'; agingBg = 'rgba(234,88,12,0.08)'; agingLabel = `${daysOld} يوم — متأخر`; }
                                                            else if (daysOld > 30) { agingColor = 'var(--gold)'; agingBg = 'var(--goldb)'; agingLabel = `${daysOld} يوم`; }
                                                            else if (daysOld > 0) { agingColor = 'var(--color-text-secondary)'; agingBg = 'transparent'; agingLabel = `${daysOld} يوم`; }
                                                        }

                                                        return (
                                                            <React.Fragment key={`${tx.type}-${tx.id}`}>
                                                                <tr style={{ borderBottom: '1px solid var(--color-border-tertiary)', background: isOverdue && daysOld > 90 ? 'var(--redb)' : i % 2 === 0 ? 'transparent' : 'var(--color-background-secondary)' }}>
                                                                    <td style={tdStyle}>
                                                                        {hasLines && (
                                                                            <button onClick={() => toggleDoc(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--color-text-secondary)' }}>
                                                                                <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ fontSize: 14 }} />
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                    <td style={{ ...tdStyle, color: 'var(--color-text-tertiary)', fontSize: 11 }}>{tx.seq}</td>
                                                                    <td style={tdStyle}>
                                                                        <div style={{ lineHeight: 1.3 }}>
                                                                            <div>{fmtDate(tx.date)}</div>
                                                                            {tx.datetime && <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)' }}>{new Date(tx.datetime).toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}</div>}
                                                                        </div>
                                                                    </td>
                                                                    <td style={tdStyle}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                            {isDoc && tx.type_code ? (
                                                                                <button onClick={(e) => { e.stopPropagation(); navigate(`/documents/${tx.type_code}/${tx.id}/edit`); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, color: 'var(--text-info, var(--blue))', textDecoration: 'underline', padding: 0 }}>{tx.reference}</button>
                                                                            ) : (
                                                                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--color-text-secondary)' }}>{tx.reference || '—'}</span>
                                                                            )}
                                                                            <Badge variant={isDoc ? 'danger' : 'success'} style={{ fontSize: 11 }}>{tx.label}</Badge>
                                                                            {isOverdue && tx.remaining > 0 && (
                                                                                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 8, background: agingBg, color: agingColor, fontWeight: 600 }}>{agingLabel}</span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: tx.document_amount > 0 ? 600 : undefined }}>
                                                                        {tx.document_amount !== 0 ? <span style={{ color: tx.document_amount > 0 ? 'var(--em)' : 'var(--red)' }}>{fmtNumber(tx.document_amount)} دج</span> : '—'}
                                                                    </td>
                                                                    <td style={{ ...tdStyle, textAlign: 'center', fontSize: 12 }}>
                                                                        {tx.doc_cost_ht > 0 ? <span style={{ color: 'var(--color-text-secondary)' }}>{fmtNumber(tx.doc_cost_ht)} دج</span> : '—'}
                                                                    </td>
                                                                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                                        {tx.margin_value !== 0 ? (
                                                                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: tx.margin_value >= 0 ? 'var(--greenb)' : 'var(--redb)', color: tx.margin_value >= 0 ? 'var(--em)' : 'var(--red)' }}>
                                                                                {fmtNumber(tx.margin_value)} دج
                                                                            </span>
                                                                        ) : '—'}
                                                                    </td>
                                                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: tx.payment_amount > 0 ? 600 : undefined }}>
                                                                        {tx.payment_amount > 0 ? <span style={{ color: 'var(--red)' }}>{fmtNumber(tx.payment_amount)} دج</span> : '—'}
                                                                    </td>
                                                                    <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>
                                                                        <span style={{ color: running >= 0 ? 'var(--red)' : 'var(--green)' }}>{fmtNumber(running)} دج</span>
                                                                        {tx.remaining > 0 && <div style={{ fontSize: 10, color: 'var(--red)', marginTop: 1 }}>متبقي {fmtNumber(tx.remaining)}</div>}
                                                                    </td>
                                                                </tr>
                                                                {isExpanded && hasLines && (tx as any).lines.map((line: any, li: number) => (
                                                                    <tr key={`line-${tx.id}-${li}`} style={{ borderBottom: '1px solid var(--color-border-tertiary)', background: 'var(--blueb)' }}>
                                                                        <td style={tdStyle}></td>
                                                                        <td style={{ ...tdStyle, fontSize: 10, color: 'var(--color-text-tertiary)' }}>{tx.seq}.{li + 1}</td>
                                                                        <td colSpan={7} style={{ ...tdStyle, padding: '4px 12px 4px 36px' }}>
                                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 180 }}>
                                                                                    <i className="ti ti-package" style={{ fontSize: 11, color: 'var(--text-info, var(--blue))', opacity: 0.6 }} />
                                                                                    <span style={{ fontWeight: 600, fontSize: 12 }}>{line.product_name}</span>
                                                                                    <span style={{ fontSize: 11, color: 'var(--color-text-tertiary)', fontFamily: 'monospace' }}>({line.product_ref})</span>
                                                                                    {line.unit_name && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', padding: '1px 5px', borderRadius: 4, background: 'var(--color-background-secondary)' }}>{line.unit_name}</span>}
                                                                                </div>
                                                                                {line.quantity > 0 && <span style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{fmtNumber(line.quantity)} × {fmtNumber(line.unit_price_ht)} دج</span>}
                                                                                {line.discount_pct > 0 && <span style={{ fontSize: 10, color: 'var(--red)' }}>−{line.discount_pct}%</span>}
                                                                                <span style={{ fontSize: 11, fontWeight: 600 }}>{fmtNumber(line.total_ttc)} دج<span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginInlineStart: 4 }}>(HT: {fmtNumber(line.total_ht)} + TVA {line.tva_rate}%)</span></span>
                                                                                {line.cost_price_ht > 0 && <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>تكلفة: {fmtNumber(line.line_cost_ht)} دج</span>}
                                                                                {line.line_margin !== 0 && (
                                                                                    <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 8, fontSize: 10, fontWeight: 600, background: line.line_margin >= 0 ? 'var(--greenb)' : 'var(--redb)', color: line.line_margin >= 0 ? 'var(--em)' : 'var(--red)' }}>
                                                                                        هامش: {fmtNumber(line.line_margin)} دج
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </React.Fragment>
                                                        );
                                                    })}

                                                    <tr style={{ fontWeight: 700, background: 'var(--color-background-secondary)', borderTop: '2px solid var(--color-border-secondary)' }}>
                                                        <td style={tdStyle}></td>
                                                        <td style={tdStyle} colSpan={2}>—</td>
                                                        <td style={tdStyle}><i className="ti ti-calculator" style={{ marginLeft: 4 }} /> الإجمالي ({detFiltered.length} معاملة)</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--em)', fontWeight: 700 }}>{fmtNumber(detTotalDocs)} دج</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 700 }}>{fmtNumber(detTotalCost)} دج</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                                                            <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: detTotalMargin >= 0 ? 'var(--greenb)' : 'var(--redb)', color: detTotalMargin >= 0 ? 'var(--em)' : 'var(--red)' }}>{fmtNumber(detTotalMargin)} دج</span>
                                                        </td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--red)', fontWeight: 700 }}>{fmtNumber(detTotalPays)} دج</td>
                                                        <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 800, fontSize: 14, color: (computedDetBalance + detTotalDocs - detTotalPays) >= 0 ? 'var(--red)' : 'var(--green)' }}>{fmtNumber(computedDetBalance + detTotalDocs - detTotalPays)} دج</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                );
                            })()}
                        </>
                    )}

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
                                    {recapSummary && (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 16 }}>
                                            <SummaryCard label="عدد المنتجات" value={recapSummary.product_count} color="var(--text-info, #3b82f6)" icon="ti-package" />
                                            <SummaryCard label="مبيعات HT" value={recapSummary.total_sale_ht} color="var(--em)" icon="ti-arrow-up-circle" />
                                            <SummaryCard label="تكلفة الشراء" value={recapSummary.total_cost_ht} color="var(--red)" icon="ti-arrow-down-circle" />
                                            <SummaryCard label="الهامش" value={recapSummary.total_margin_value} color={recapSummary.total_margin_value >= 0 ? 'var(--em)' : 'var(--red)'} icon="ti-chart-bar" subtitle={`${recapSummary.total_margin_pct}%`} />
                                            <SummaryCard label="إجمالي TTC" value={recapSummary.total_sale_ttc + recapSummary.total_purchase_ttc} color="var(--text-info, #3b82f6)" icon="ti-calculator" bold />
                                        </div>
                                    )}

                                    <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
                                        <SimpleTable
                                            columns={recapColumns}
                                            data={recapTableData}
                                            rowKey={(row) => row._rowType === 'summary' ? 'summary' : String(row['#'])}
                                        />
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

function SummaryCard({ label, value, color, icon, bold, subtitle }: {
    label: string; value: number; color: string; icon: string; bold?: boolean; subtitle?: string;
}) {
    return (
        <div style={{ padding: '10px 14px', border: '1px solid var(--color-border-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className={`ti ${icon}`} style={{ fontSize: 20, color, opacity: 0.7 }} />
            <div>
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{label}</div>
                <div style={{ fontSize: bold ? 16 : 15, fontWeight: bold ? 800 : 700, color }}>{fmtNumber(value)} دج</div>
                {subtitle && <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 1 }}>{subtitle}</div>}
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = { padding: '8px 12px', textAlign: 'start', fontWeight: 600, color: 'var(--color-text-secondary)', fontSize: 12, whiteSpace: 'nowrap' };
const tdStyle: React.CSSProperties = { padding: '8px 12px', whiteSpace: 'nowrap' };

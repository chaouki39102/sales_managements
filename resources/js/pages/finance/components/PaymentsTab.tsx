// resources/js/pages/finance/components/PaymentsTab.tsx
// TAB 2 — الدفعات
import { useState, useEffect, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { apiPatch, apiDelete } from '@/lib/api/core/client';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import KpiCard      from '@/components/ui/KpiCard';
import EmptyState   from '@/components/ui/EmptyState';
import Avatar       from '@/components/ui/Avatar';
import SimpleTable  from '@/components/ui/SimpleTable';
import { ConfirmDialog } from '@/components/ui';
import { fmt, fmtDate, STATUS_LABEL, STATUS_VARIANT } from '../financeUtils';
import { usePayments } from '../hooks/useFinanceQueries';
import type { PaymentFilters } from '../types';

export default function PaymentsTab({ slug, selectedYearId, accounts, paymentModes: _paymentModes, openEditPayment, qc }: {
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
                    <SimpleTable
                        columns={[
                            { key: 'payment_number', label: <>الرقم{sortKey === 'payment_number' && <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>}</>, className: 'm', onHeaderClick: () => toggleSort('payment_number'), render: (v: any, row: any) => (
                                <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v || `#${row.id}`}</span>
                            )},
                            { key: 'payment_date', label: <>التاريخ{sortKey === 'payment_date' && <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>}</>, onHeaderClick: () => toggleSort('payment_date'), render: (v: any) => (
                                <span style={{ fontSize: 12 }}>{fmtDate(v)}</span>
                            )},
                            { key: 'party', label: <>المتعامل{sortKey === 'party' && <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>}</>, onHeaderClick: () => toggleSort('party'), render: (_v: any, row: any) => row.party ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Avatar initials={row.party.name?.[0] || '?'}
                                        color={((Number(row.id ?? 0) % 7) + 1) as 1|2|3|4|5|6|7} size={24}/>
                                    <span className="s">{row.party.name}</span>
                                </div>
                            ) : (
                                <span style={{ color: 'var(--t4)', fontSize: 12 }}>—</span>
                            )},
                            { key: 'direction', label: <>الاتجاه{sortKey === 'direction' && <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>}</>, onHeaderClick: () => toggleSort('direction'), render: (v: any) => (
                                <Badge variant={v === 'in' ? 'success' : 'danger'}>
                                    <i className={`ti ti-arrow-${v === 'in' ? 'down' : 'up'}-circle`} style={{ marginLeft: 4 }}/>
                                    {v === 'in' ? 'مقبوض' : 'مدفوع'}
                                </Badge>
                            )},
                            { key: 'amount', label: <>المبلغ{sortKey === 'amount' && <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>}</>, className: 'e', onHeaderClick: () => toggleSort('amount'), render: (_v: any, row: any) => (
                                <span style={{ color: row.direction === 'in' ? 'var(--em)' : 'var(--red)', fontWeight: 700 }}>
                                    {row.direction === 'out' ? '−' : '+'}
                                    {fmt(Number(row.amount_local || row.amount || 0))} دج
                                </span>
                            )},
                            { key: 'status', label: <>الحالة{sortKey === 'status' && <i className={`ti ti-arrow-${sortDir === 'asc' ? 'up' : 'down'}`} style={{ marginLeft: 4, fontSize: 11, opacity: 0.6 }}/>}</>, onHeaderClick: () => toggleSort('status'), render: (v: any) => (
                                <Badge variant={STATUS_VARIANT[v] ?? 'gray'}>{STATUS_LABEL[v] ?? v}</Badge>
                            )},
                            { key: 'payment_mode', label: 'طريقة الدفع', render: (_v: any, row: any) => (
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>{row.payment_mode?.name || '—'}</span>
                            )},
                            { key: 'treasury_account', label: 'الحساب', render: (_v: any, row: any) => (
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>{row.treasury_account?.name || '—'}</span>
                            )},
                            { key: 'reference', label: 'مرجع', className: 'm', render: (_v: any, row: any) => (
                                <span style={{ fontSize: 11, color: 'var(--t4)' }}>{row.reference || row.bank_reference || '—'}</span>
                            )},
                            { key: 'is_reconciled', label: 'مسوَّاة', render: (v: any) => v
                                ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                                : <span style={{ color: 'var(--t4)', fontSize: 12 }}>لا</span> },
                            { key: '_actions', label: '', render: (_v: any, row: any) => (
                                <div style={{ display: 'flex', gap: 3 }}>
                                    {row.status === 'pending' && (
                                        <Button size="xs" variant="primary"
                                            icon={<i className="ti ti-check"/>}
                                            onClick={() => confirmPayment.mutate(row.id)}>
                                            تأكيد
                                        </Button>
                                    )}
                                    <Button size="xs" icon={<i className="ti ti-pencil"/>}
                                        onClick={() => openEditPayment(row)}/>
                                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>}
                                        onClick={async () => { if (await deleteConfirm.confirm('حذف الدفعة؟')) deletePayment.mutate(row.id); }}/>
                                </div>
                            )},
                        ]}
                        data={payments}
                        rowKey="id"
                    />
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

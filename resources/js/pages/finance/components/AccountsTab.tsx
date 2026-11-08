// resources/js/pages/finance/components/AccountsTab.tsx
// TAB 0 — الحسابات والصناديق
import { useConfirm } from '@/hooks/useConfirm';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import KpiCard      from '@/components/ui/KpiCard';
import EmptyState   from '@/components/ui/EmptyState';
import AlertBar     from '@/components/ui/AlertBar';
import SimpleTable  from '@/components/ui/SimpleTable';
import { ConfirmDialog } from '@/components/ui';
import { fmt } from '../financeUtils';

export default function AccountsTab({
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
                        <SimpleTable
                            columns={[
                                { key: 'name', label: 'الاسم', className: 's' },
                                { key: '_typeCode', label: 'النوع', render: (_v: any, row: any) => (
                                    <Badge variant="gray" style={{ fontSize: 10 }}>
                                        <i className={`ti ${typeIcon(row._typeCode)}`} style={{ marginLeft: 4 }}/>
                                        {row._typeName || '—'}
                                    </Badge>
                                )},
                                { key: 'code', label: 'الكود', className: 'm', render: (v: any) => v || '—' },
                                { key: 'bank_name', label: 'البنك', render: (v: any) => (
                                    <span style={{ fontSize: 12, color: 'var(--t3)' }}>{v || '—'}</span>
                                )},
                                { key: 'account_number', label: 'رقم الحساب', className: 'm', render: (_v: any, row: any) => (
                                    <span style={{ fontSize: 11, fontFamily: 'monospace' }}>
                                        {row.account_number || row.rib || row.iban || '—'}
                                    </span>
                                )},
                                { key: 'current_balance', label: 'الرصيد الحالي', className: 'e', render: (v: any) => `${fmt(Number(v) || 0)} دج` },
                                { key: 'is_default', label: 'الافتراضي', render: (v: any) => v
                                    ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                                    : '—' },
                                { key: 'active', label: 'الحالة', render: (v: any) => (
                                    <Badge variant={v ? 'success' : 'danger'}>{v ? 'نشط' : 'موقوف'}</Badge>
                                )},
                                { key: '_actions', label: '', render: (_v: any, row: any) => (
                                    <div style={{ display: 'flex', gap: 3 }}>
                                        <Button size="xs" icon={<i className="ti ti-pencil"/>}
                                            onClick={() => openEditAccount(row)}/>
                                        <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>}
                                            onClick={async () => { if (await deleteConfirm.confirm('حذف الحساب؟')) deleteAccount.mutate(row.id); }}/>
                                    </div>
                                )},
                            ]}
                            data={filteredAccounts}
                            rowKey="id"
                        />
                    </Card>
                )}
            </div>

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}

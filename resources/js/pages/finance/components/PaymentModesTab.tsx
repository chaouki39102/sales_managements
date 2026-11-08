// resources/js/pages/finance/components/PaymentModesTab.tsx
// TAB 1 — طرق الدفع
import { useConfirm } from '@/hooks/useConfirm';
import Card         from '@/components/ui/Card';
import Badge        from '@/components/ui/Badge';
import Button       from '@/components/ui/Button';
import KpiCard      from '@/components/ui/KpiCard';
import EmptyState   from '@/components/ui/EmptyState';
import SimpleTable  from '@/components/ui/SimpleTable';
import { ConfirmDialog } from '@/components/ui';

export default function PaymentModesTab({ paymentModes, loadingModes, openEditMode, deleteMode, openAddMode }: any) {
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
                    <SimpleTable
                        columns={[
                            { key: 'name', label: 'الاسم', className: 's' },
                            { key: 'code', label: 'الكود', className: 'm', render: (v: any) => (
                                <span style={{ fontFamily: 'monospace' }}>{v}</span>
                            )},
                            { key: 'treasury_account', label: 'الحساب', render: (v: any) => (
                                <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                                    {v?.name || '—'}
                                </span>
                            )},
                            { key: 'is_cash', label: 'نقدي', render: (v: any) => (
                                <Badge variant={v ? 'success' : 'gray'}>{v ? 'نعم' : 'لا'}</Badge>
                            )},
                            { key: 'requires_reference', label: 'مرجع', render: (v: any) => v
                                ? <span className="ic ic-xs" style={{ color: 'var(--em)' }}><i className="ti ti-circle-check"/></span>
                                : '—' },
                            { key: 'display_order', label: 'الترتيب', className: 'm', render: (v: any) => v ?? 0 },
                            { key: 'active', label: 'الحالة', render: (v: any) => (
                                <Badge variant={v ? 'success' : 'danger'}>{v ? 'نشط' : 'موقوف'}</Badge>
                            )},
                            { key: '_actions', label: '', render: (_v: any, row: any) => (
                                <div style={{ display: 'flex', gap: 3 }}>
                                    <Button size="xs" icon={<i className="ti ti-pencil"/>}
                                        onClick={() => openEditMode(row)}/>
                                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>}
                                        onClick={async () => { if (await deleteConfirm.confirm('حذف طريقة الدفع؟')) deleteMode.mutate(row.id); }}/>
                                </div>
                            )},
                        ]}
                        data={paymentModes}
                        rowKey="id"
                    />
                </Card>
            )}

            <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
        </>
    );
}

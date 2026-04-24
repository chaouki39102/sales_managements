// resources/js/pages/debts/DebtsPage.tsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import Avatar from '@/components/ui/Avatar';
import apiClient from '@/lib/api/client';
import type { CommercialDocument } from '@/types';

export default function DebtsPage() {
    const [activeTab, setActiveTab] = useState<'unpaid' | 'overdue'>('unpaid');
    const [search, setSearch] = useState('');
    const [selectedDoc, setSelectedDoc] = useState<CommercialDocument | null>(null);
    const detailModal = useModal();
    const qc = useQueryClient();

    // جلب الفواتير غير المدفوعة
    const { data: unpaidDocs, isLoading: loadingUnpaid } = useQuery({
        queryKey: ['debts', 'unpaid', search],
        queryFn: () => apiClient.get('/commercial-documents/unpaid', {
            params: { search: search || undefined }
        }).then(r => r.data.data || []),
    });

    // جلب الفواتير المتأخرة
    const { data: overdueDocs, isLoading: loadingOverdue } = useQuery({
        queryKey: ['debts', 'overdue', search],
        queryFn: () => apiClient.get('/commercial-documents/overdue', {
            params: { search: search || undefined }
        }).then(r => r.data.data || []),
    });

    const docs = activeTab === 'unpaid' ? (unpaidDocs || []) : (overdueDocs || []);
    const totalAmount = docs.reduce((sum: number, doc: CommercialDocument) => sum + doc.amount_remaining, 0);
    const totalTTC = docs.reduce((sum: number, doc: CommercialDocument) => sum + doc.total_ttc, 0);
    const clientsCount = new Set(docs.filter((d: CommercialDocument) => d.party_id).map((d: CommercialDocument) => d.party_id)).size;

    const viewDetail = (doc: CommercialDocument) => {
        setSelectedDoc(doc);
        detailModal.openModal();
    };

    return (
        <div className="page on" id="p-debts">
            <PageHeader
                title="الديون والمستحقات"
                subtitle="متابعة الفواتير غير المدفوعة والمتأخرة"
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-download"/>}>تصدير</Button>
                        <Button size="sm" icon={<i className="ti ti-printer"/>}>طباعة</Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard
                    variant="red" icon="ti-cash" label="إجمالي الديون"
                    value={totalAmount.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                    sub={`${docs.length} مستند`}
                />
                <KpiCard
                    variant={activeTab === 'overdue' ? 'red' : 'gold'} icon="ti-clock"
                    label={activeTab === 'overdue' ? 'متأخرة' : 'معلقة'}
                    value={docs.length}
                    sub={`${clientsCount} عميل`}
                />
                <KpiCard
                    variant="blue" icon="ti-file-invoice" label="إجمالي TTC"
                    value={totalTTC.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج"
                />
                <KpiCard
                    variant="purple" icon="ti-percentage" label="نسبة التحصيل"
                    value={`${totalTTC > 0 ? Math.round((1 - totalAmount / totalTTC) * 100) : 0}%`}
                    sub="من إجمالي المستحقات"
                />
            </div>

            {/* Tabs */}
            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className={`tab ${activeTab === 'unpaid' ? 'on' : ''}`} onClick={() => setActiveTab('unpaid')}>
                    <span className="ic ic-xs"><i className="ti ti-file-text"/></span>
                    غير مدفوعة {unpaidDocs ? `(${unpaidDocs.length})` : ''}
                </div>
                <div className={`tab ${activeTab === 'overdue' ? 'on' : ''}`} onClick={() => setActiveTab('overdue')}>
                    <span className="ic ic-xs"><i className="ti ti-alert-triangle"/></span>
                    متأخرة {overdueDocs ? `(${overdueDocs.length})` : ''}
                </div>
            </div>

            {/* Search */}
            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input
                        type="text"
                        placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                        style={{ width: '100%' }}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Table */}
            {(activeTab === 'unpaid' ? loadingUnpaid : loadingOverdue) ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : docs.length === 0 ? (
                <EmptyState
                    icon="ti-receipt"
                    text={activeTab === 'unpaid' ? 'لا توجد فواتير غير مدفوعة' : 'لا توجد فواتير متأخرة'}
                    sub="جميع المدفوعات مكتملة"
                />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>رقم الفاتورة</th>
                                    <th>العميل</th>
                                    <th>TTC</th>
                                    <th>المدفوع</th>
                                    <th>المتبقي</th>
                                    <th>نسبة التحصيل</th>
                                    <th>تاريخ الاستحقاق</th>
                                    <th>الحالة</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {docs.map((doc: CommercialDocument, i: number) => {
                                    const isOverdue = doc.due_date && new Date(doc.due_date) < new Date();
                                    const percentPaid = doc.total_ttc > 0
                                        ? Math.round((doc.amount_paid / doc.total_ttc) * 100)
                                        : 0;
                                    return (
                                        <tr key={doc.id} onClick={() => viewDetail(doc)} style={{ cursor: 'pointer' }}>
                                            <td className="m">{doc.document_number}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                    <Avatar
                                                        initials={doc.party?.name?.[0] || '?'}
                                                        color={((i % 7) + 1) as 1|2|3|4|5|6|7}
                                                        size={26}
                                                    />
                                                    <span className="s">{doc.party?.name || 'عابر'}</span>
                                                </div>
                                            </td>
                                            <td className="e">{doc.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                            <td style={{ color: 'var(--em)', fontFamily: 'monospace' }}>
                                                {doc.amount_paid.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج
                                            </td>
                                            <td className="r">{doc.amount_remaining.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} دج</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <ProgressBar
                                                        value={percentPaid}
                                                        color={percentPaid > 50 ? 'var(--em)' : 'var(--red)'}
                                                        height={5}
                                                    />
                                                    <span style={{ fontSize: 10, color: 'var(--t4)', minWidth: 32 }}>
                                                        {percentPaid}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td style={{
                                                fontSize: 12,
                                                color: isOverdue ? 'var(--red)' : 'var(--t4)',
                                                fontWeight: isOverdue ? 700 : 400
                                            }}>
                                                {doc.due_date
                                                    ? new Date(doc.due_date).toLocaleDateString('fr-DZ')
                                                    : '—'}
                                            </td>
                                            <td>
                                                <Badge variant={isOverdue ? 'danger' : doc.status === 'partial' ? 'warning' : 'info'}>
                                                    {isOverdue ? 'متأخرة' : doc.status === 'partial' ? 'جزئية' : 'معلقة'}
                                                </Badge>
                                            </td>
                                            <td onClick={e => e.stopPropagation()}>
                                                <div style={{ display: 'flex', gap: 3 }}>
                                                    <Button size="xs" variant="primary" icon={<i className="ti ti-cash"/>}>
                                                        تحصيل
                                                    </Button>
                                                    <Button size="xs" icon={<i className="ti ti-eye"/>} onClick={() => viewDetail(doc)}/>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Detail Modal */}
            <DebtDetailModal
                open={detailModal.open}
                doc={selectedDoc}
                onClose={detailModal.closeModal}
            />
        </div>
    );
}

// ===============================================
// Debt Detail Modal
// ===============================================
function DebtDetailModal({ open, doc, onClose }: {
    open: boolean;
    doc: CommercialDocument | null;
    onClose: () => void;
}) {
    if (!doc) return null;

    const isOverdue = doc.due_date && new Date(doc.due_date) < new Date();
    const percentPaid = doc.total_ttc > 0 ? Math.round((doc.amount_paid / doc.total_ttc) * 100) : 0;
    const daysLate = doc.due_date
        ? Math.floor((new Date().getTime() - new Date(doc.due_date).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return (
        <Modal
            open={open} onClose={onClose} size="md"
            title={`تفاصيل — ${doc.document_number}`}
            subtitle={doc.party?.name || 'عميل عابر'}
            footer={
                <>
                    <Button onClick={onClose}>إغلاق</Button>
                    <Button variant="primary" icon={<i className="ti ti-cash"/>}>تسجيل دفعة</Button>
                </>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Status */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px',
                    background: isOverdue ? 'var(--redb)' : 'var(--goldb)',
                    border: `1px solid ${isOverdue ? 'var(--redbo)' : 'var(--goldbo)'}`,
                    borderRadius: 'var(--r2)'
                }}>
                    <span className="ic ic-sm" style={{ color: isOverdue ? 'var(--red)' : 'var(--gold)' }}>
                        <i className={`ti ${isOverdue ? 'ti-alert-triangle' : 'ti-clock'}`}/>
                    </span>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--t1)' }}>
                            {isOverdue ? `متأخرة بـ ${daysLate} يوم` : 'معلقة'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>
                            تاريخ الاستحقاق: {doc.due_date ? new Date(doc.due_date).toLocaleDateString('ar-DZ') : 'غير محدد'}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                        { label: 'الإجمالي TTC', value: doc.total_ttc.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--em)' },
                        { label: 'المدفوع', value: doc.amount_paid.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--em)' },
                        { label: 'المتبقي', value: doc.amount_remaining.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--red)' },
                        { label: 'TVA', value: doc.total_tva.toLocaleString('fr-DZ', { maximumFractionDigits: 0 }), color: 'var(--t3)' },
                    ].map(item => (
                        <div key={item.label} style={{
                            padding: 10, background: 'var(--bg3)', borderRadius: 'var(--r2)',
                            border: '1px solid var(--b1)'
                        }}>
                            <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>{item.label}</div>
                            <div style={{ fontWeight: 700, color: item.color }}>{item.value} دج</div>
                        </div>
                    ))}
                </div>

                {/* Progress */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ color: 'var(--t3)' }}>نسبة التحصيل</span>
                        <span style={{ fontWeight: 700, color: percentPaid > 50 ? 'var(--em)' : 'var(--red)' }}>{percentPaid}%</span>
                    </div>
                    <ProgressBar value={percentPaid} color={percentPaid > 50 ? 'var(--em)' : 'var(--red)'} height={8} />
                </div>

                {/* Dates */}
                <div>
                    {[
                        { label: 'تاريخ الفاتورة', value: new Date(doc.document_date).toLocaleDateString('ar-DZ') },
                        { label: 'تاريخ الاستحقاق', value: doc.due_date ? new Date(doc.due_date).toLocaleDateString('ar-DZ') : '—' },
                        { label: 'تاريخ الإنشاء', value: new Date(doc.created_at).toLocaleDateString('ar-DZ') },
                    ].map(row => (
                        <div key={row.label} className="sr">
                            <span className="sr-l">{row.label}</span>
                            <span className="sr-v">{row.value}</span>
                        </div>
                    ))}
                </div>

                {/* Client Info */}
                {doc.party && (
                    <div style={{
                        padding: 12, background: 'var(--bg3)', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b1)'
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', marginBottom: 8 }}>
                            معلومات العميل
                        </div>
                        <div className="sr">
                            <span className="sr-l">الاسم</span>
                            <span className="sr-v">{doc.party.name}</span>
                        </div>
                        {doc.party.phone && (
                            <div className="sr">
                                <span className="sr-l">الهاتف</span>
                                <span className="sr-v">{doc.party.phone}</span>
                            </div>
                        )}
                        {doc.party.nif && (
                            <div className="sr">
                                <span className="sr-l">NIF</span>
                                <span className="sr-v" style={{ fontFamily: 'monospace', fontSize: 12 }}>{doc.party.nif}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
}

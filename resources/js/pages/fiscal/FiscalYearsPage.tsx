// resources/js/pages/fiscal/FiscalYearsPage.tsx
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
import apiClient from '@/lib/api/client';
import type { FiscalYear } from '@/types';

export default function FiscalYearsPage() {
    const qc = useQueryClient();
    const modal = useModal();

    const { data, isLoading } = useQuery({
        queryKey: ['fiscal-years'],
        queryFn: () => apiClient.get('/fiscal-years').then(r => r.data.data),
    });

    const years = data ?? [];

    const closeYear = useMutation({
        mutationFn: (id: number) => apiClient.post(`/fiscal-years/${id}/close`),
        onSuccess: () => qc.invalidateQueries({ queryKey: ['fiscal-years'] }),
    });

    const currentYear = years.find((y: FiscalYear) => !y.is_closed);

    return (
        <div className="page on" id="p-fiscalyears">
            <PageHeader
                title="السنوات المالية"
                subtitle={`إدارة السنوات المالية — السنة الحالية: ${currentYear?.name ?? 'لا توجد'}`}
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-calendar-plus"/>} onClick={modal.openModal}>
                        سنة جديدة
                    </Button>
                }
            />

            <div className="kpis" style={{ marginBottom: 16 }}>
                <KpiCard variant="green" icon="ti-calendar" label="السنة الحالية" value={currentYear?.name ?? '—'} sub={`${currentYear?.start_date} — ${currentYear?.end_date}`} />
                <KpiCard variant="blue" icon="ti-check" label="السنوات المفتوحة" value={years.filter((y: FiscalYear) => !y.is_closed).length} />
                <KpiCard variant="purple" icon="ti-lock" label="السنوات المغلقة" value={years.filter((y: FiscalYear) => y.is_closed).length} />
                <KpiCard variant="gold" icon="ti-file-text" label="إجمالي السنوات" value={years.length} />
            </div>

            {isLoading ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : years.length === 0 ? (
                <EmptyState icon="ti-calendar" text="لا توجد سنوات مالية" sub="أضف أول سنة مالية" action={<Button variant="primary" onClick={modal.openModal}>سنة جديدة</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الاسم</th>
                                    <th>تاريخ البداية</th>
                                    <th>تاريخ النهاية</th>
                                    <th>الحالة</th>
                                    <th>عدد الفواتير</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {years.map((y: FiscalYear) => (
                                    <tr key={y.id}>
                                        <td className="s">{y.name}</td>
                                        <td className="m">{y.start_date}</td>
                                        <td className="m">{y.end_date}</td>
                                        <td><Badge variant={y.is_closed ? 'danger' : 'success'}>{y.is_closed ? 'مغلقة' : 'مفتوحة'}</Badge></td>
                                        <td className="m">—</td>
                                        <td>
                                            {!y.is_closed && (
                                                <Button size="xs" variant="primary" icon={<i className="ti ti-lock"/>}
                                                    onClick={() => closeYear.mutate(y.id)}>
                                                    إغلاق
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}
            <FiscalYearModal open={modal.open} onClose={modal.closeModal} />
        </div>
    );
}

function FiscalYearModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const qc = useQueryClient();
    const [form, setForm] = useState({ name: '', start_date: '', end_date: '' });

    const save = useMutation({
        mutationFn: (data: typeof form) => apiClient.post('/fiscal-years', data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['fiscal-years'] }); onClose(); },
    });

    return (
        <Modal open={open} onClose={onClose} title="سنة مالية جديدة"
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" onClick={() => save.mutate(form)} disabled={!form.name || !form.start_date || !form.end_date}>
                        {save.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>
            <div className="fgrid">
                <div className="fg">
                    <label className="req">اسم السنة</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: السنة المالية 2024" />
                </div>
                <div className="fg">
                    <label className="req">تاريخ البداية</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div className="fg">
                    <label className="req">تاريخ النهاية</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
                </div>
            </div>
        </Modal>
    );
}

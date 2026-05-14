// resources/js/pages/suppliers/SuppliersPage.tsx
import React, { useState, useEffect } from 'react';
import { useSuppliers, usePartyMutations } from '@/lib/api/endpoints/parties';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import ProgressBar from '@/components/ui/ProgressBar';
import Switch from '@/components/ui/Switch';
import AlertBar from '@/components/ui/AlertBar';
import type { Party } from '@/types';

export default function SuppliersPage() {
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState<Party | null>(null);
    const modal = useModal();

    const { data, isLoading } = useSuppliers({ search: search || undefined, per_page: 30 });
    const suppliers = data?.data ?? [];
    const meta = data?.meta;

    const openCreate = () => { setEditing(null); modal.openModal(); };
    const openEdit = (c: Party) => { setEditing(c); modal.openModal(); };

    const withDebt = suppliers.filter((c: Party) => (c.balance ?? 0) > 0).length;
    const totalDebt = suppliers.reduce((s: number, c: Party) => s + (c.balance ?? 0), 0);
    const totalBusiness = suppliers.reduce((s: number, c: Party) => s + (c.total_purchases ?? 0), 0);

    return (
        <div className="page on" id="p-suppliers">
            <PageHeader
                title="الموردون"
                subtitle={`إدارة قائمة الموردين — ${meta?.total ?? '...'} مورد`}
                actions={
                    <>
                        <Button size="sm" icon={<i className="ti ti-table-export"/>}>تصدير</Button>
                        <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus"/>} onClick={openCreate}>
                            مورد جديد
                        </Button>
                    </>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-users" label="إجمالي الموردين" value={meta?.total ?? '—'} />
                <KpiCard variant="blue" icon="ti-trending-up" label="إجمالي المشتريات" value={totalBusiness.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" />
                <KpiCard variant="red" icon="ti-receipt" label="ديون للموردين" value={totalDebt.toLocaleString('fr-DZ', { maximumFractionDigits: 0 })} unit="دج" sub={`${withDebt} مورد`} />
                <KpiCard variant="gold" icon="ti-star" label="موردون نشطون" value={suppliers.filter((s: Party) => s.active).length} />
            </div>

            {/* Search */}
            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input type="text" placeholder="ابحث بالاسم، الهاتف، NIF..." style={{ width: '100%' }} onChange={e => setSearch(e.target.value)} />
                </div>
                <select style={{ width: 140 }}>
                    <option>كل الأنواع</option>
                    <option>نشط</option>
                    <option>موقوف</option>
                </select>
            </div>

            {/* Grid */}
            {isLoading ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : suppliers.length === 0 ? (
                <EmptyState icon="ti-truck" text="لا يوجد موردون" sub="أضف موردك الأول" action={<Button variant="primary" onClick={openCreate}>مورد جديد</Button>} />
            ) : (
                <div className="g3">
                    {suppliers.map((c: Party, i: number) => {
                        const hasDebt = (c.balance ?? 0) > 0;
                        const avatarColor = ((i % 7) + 1) as 1|2|3|4|5|6|7;
                        const creditUsed = c.credit_limit > 0 ? Math.min(100, ((c.balance ?? 0) / c.credit_limit) * 100) : 0;

                        return (
                            <Card key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                                    <Avatar initials={c.name[0]} color={avatarColor} size={42} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{c.name}</div>
                                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                                            <Badge variant={c.active ? 'success' : 'danger'}>{c.active ? 'نشط' : 'موقوف'}</Badge>
                                            {hasDebt && <Badge variant="danger">دين</Badge>}
                                        </div>
                                    </div>
                                </div>

                                {(c.phone || c.nif) && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: 'var(--t3)' }}>
                                        {c.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-phone" style={{ fontSize: 13, color: 'var(--t4)' }}/><span>{c.phone}</span></div>}
                                        {c.nif && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><i className="ti ti-file-certificate" style={{ fontSize: 13, color: 'var(--t4)' }}/><span style={{ fontFamily: 'monospace', fontSize: 11 }}>NIF: {c.nif}</span></div>}
                                    </div>
                                )}

                                {c.credit_limit > 0 && (
                                    <div style={{ marginTop: 10 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t4)', marginBottom: 3 }}>
                                            <span>حد الائتمان</span>
                                            <span>{creditUsed.toFixed(0)}%</span>
                                        </div>
                                        <ProgressBar value={creditUsed} color={creditUsed > 80 ? 'var(--red)' : creditUsed > 50 ? 'var(--gold)' : 'var(--em)'} height={4} />
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 6, marginTop: 10 }} onClick={e => e.stopPropagation()}>
                                    <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(c)}>تعديل</Button>
                                    <Button size="xs" icon={<i className="ti ti-file-invoice"/>}>فواتيره</Button>
                                    {hasDebt && <Button size="xs" variant="danger" icon={<i className="ti ti-cash"/>}>تسوية</Button>}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            <SupplierModal open={modal.open} party={editing} onClose={modal.closeModal} />
        </div>
    );
}

// ===============================================
// Supplier Modal
// ===============================================
function SupplierModal({ open, party, onClose }: { open: boolean; party: Party | null; onClose: () => void }) {
    const isEdit = !!party;
    const { create: createMut, update: updateMut } = usePartyMutations();

    const emptyForm = {
        name: '',
        commercial_name: '',
        phone: '',
        mobile: '',
        email: '',
        address: '',
        nif: '',
        nis: '',
        rc: '',
        ai: '',
        credit_limit: 0,
        credit_days: 30,
        is_tva_exempt: false,
        active: true,
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            if (party) {
                setForm({
                    name: party.name || '',
                    commercial_name: party.commercial_name || '',
                    phone: party.phone || '',
                    mobile: party.mobile || '',
                    email: party.email || '',
                    address: party.address || '',
                    nif: party.nif || '',
                    nis: party.nis || '',
                    rc: party.rc || '',
                    ai: party.ai || '',
                    credit_limit: party.credit_limit || 0,
                    credit_days: party.credit_days || 30,
                    is_tva_exempt: party.is_tva_exempt || false,
                    active: party.active ?? true,
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, party]);

    const set = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = async () => {
        if (!form.name.trim()) {
            setError('اسم المورد مطلوب');
            return;
        }

        try {
            if (isEdit) {
                await updateMut.mutateAsync({ id: party!.id, data: { ...form, party_type_id: 2 } });
            } else {
                await createMut.mutateAsync({ ...form, party_type_id: 2 }); // 2 = supplier
            }
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'فشل الحفظ. تحقق من البيانات.');
        }
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${party?.name}` : 'مورد جديد'}
            subtitle={isEdit ? '' : 'إضافة مورد جديد'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>} onClick={handleSave}
                        disabled={createMut.isPending || updateMut.isPending || !form.name.trim()}>
                        {(createMut.isPending || updateMut.isPending) ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>

            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="tabs" style={{ marginBottom: 16 }}>
                <div className="tab on">المعلومات الأساسية</div>
                <div className="tab">القانونية والمالية</div>
            </div>

            <div className="fgrid c3">
                <div className="fg s2">
                    <label className="req">الاسم الكامل / الشركة</label>
                    <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="الاسم واللقب أو اسم الشركة" autoFocus />
                </div>
                <div className="fg">
                    <label>الاسم التجاري</label>
                    <input value={form.commercial_name} onChange={e => set('commercial_name', e.target.value)} placeholder="اختياري" />
                </div>
                <div className="fg">
                    <label>الهاتف</label>
                    <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="029 xx xx xx" />
                </div>
                <div className="fg">
                    <label>الجوال</label>
                    <input value={form.mobile} onChange={e => set('mobile', e.target.value)} placeholder="0555 xx xx xx" />
                </div>
                <div className="fg">
                    <label>البريد الإلكتروني</label>
                    <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@fournisseur.dz" />
                </div>
                <div className="fg s3">
                    <label>العنوان</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="العنوان الكامل" />
                </div>
                <div className="fg">
                    <label>NIF</label>
                    <input value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000000000000000" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>NIS</label>
                    <input value={form.nis} onChange={e => set('nis', e.target.value)} placeholder="رقم إحصائي" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>RC — السجل التجاري</label>
                    <input value={form.rc} onChange={e => set('rc', e.target.value)} placeholder="29/00-0012345B05" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>AI — المادة الجبائية</label>
                    <input value={form.ai} onChange={e => set('ai', e.target.value)} style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>حد الائتمان (دج)</label>
                    <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', +e.target.value)} min={0} />
                </div>
                <div className="fg">
                    <label>أجل الدفع (يوم)</label>
                    <input type="number" value={form.credit_days} onChange={e => set('credit_days', +e.target.value)} min={0} />
                </div>
                <div className="fg" style={{ justifyContent: 'flex-end' }}>
                    <label>معفى من TVA</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <Switch checked={form.is_tva_exempt} onChange={(v) => set('is_tva_exempt', v)} />
                        <span style={{ fontSize: 12, color: 'var(--t3)' }}>{form.is_tva_exempt ? 'نعم' : 'لا'}</span>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

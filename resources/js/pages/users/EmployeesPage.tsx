// resources/js/pages/users/EmployeesPage.tsx
import React, { useState, useEffect } from 'react';
import { useModal } from '@/hooks/useModal';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import KpiCard from '@/components/ui/KpiCard';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ui/EmptyState';
import Switch from '@/components/ui/Switch';
import AlertBar from '@/components/ui/AlertBar';
import { useTenantQuery, useTenantMutation } from '@/hooks/useTenantQuery';
import { employeesApi } from '@/lib/api/endpoints/employees';
import { tenantKeys } from '@/lib/api/core/queryKeys';
import { apiGet } from '@/lib/api/core/client';
import type { Employee } from '@/types';

export default function EmployeesPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const modal = useModal();

    const { data: employees, isLoading, error } = useTenantQuery<Employee[]>(
        (slug) => [slug, 'employees', search, statusFilter] as const,
        () => employeesApi.list({
            search: search || undefined,
            employment_status: statusFilter || undefined
        }),
    );

    const activeEmployees = employees?.filter((emp: any) => emp.employment_status === 'active') || [];
    const suspendedEmployees = employees?.filter((emp: any) => emp.employment_status === 'suspended') || [];
    const terminatedEmployees = employees?.filter((emp: any) => emp.employment_status === 'terminated') || [];

    const deleteMutation = useTenantMutation(
        (id: number) => employeesApi.delete(id),
        (slug) => [slug, 'employees'] as const,
    );

    const openAdd = () => { setEditingEmployee(null); modal.openModal(); };
    const openEdit = (emp: Employee) => { setEditingEmployee(emp); modal.openModal(); };

    return (
        <div className="page on" id="p-employees">
            <PageHeader
                title="الموظفون"
                subtitle={`إدارة بيانات الموظفين — ${employees?.length || 0} موظف`}
                actions={
                    <Button variant="primary" size="sm" icon={<i className="ti ti-user-plus"/>} onClick={openAdd}>
                        موظف جديد
                    </Button>
                }
            />

            {/* KPIs */}
            <div className="kpis" style={{ marginBottom: 20 }}>
                <KpiCard variant="green" icon="ti-users" label="إجمالي الموظفين" value={employees?.length || 0} />
                <KpiCard variant="blue" icon="ti-user-check" label="نشطون" value={activeEmployees.length} />
                <KpiCard variant="gold" icon="ti-user-pause" label="معلقون" value={suspendedEmployees.length} />
                <KpiCard variant="red" icon="ti-user-off" label="منتهي خدمتهم" value={terminatedEmployees.length} />
            </div>

            {/* Filters */}
            <div className="filters" style={{ marginBottom: 16 }}>
                <div className="srch" style={{ display: 'flex', flex: 1, minWidth: 200 }}>
                    <span className="srch-ic ic ic-xs"><i className="ti ti-search"/></span>
                    <input type="text" placeholder="ابحث باسم الموظف أو رقم التسجيل..." style={{ width: '100%' }}
                        onChange={e => setSearch(e.target.value)} />
                </div>
                <select style={{ width: 160 }} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="suspended">معلق</option>
                    <option value="terminated">منتهي الخدمة</option>
                </select>
            </div>

            {/* Error */}
            {error && (
                <AlertBar variant="red">
                    فشل جلب بيانات الموظفين. تأكد من اتصالك بالخادم.
                </AlertBar>
            )}

            {/* Content */}
            {isLoading ? (
                <div className="empty"><div className="empty-ic"><i className="ti ti-loader"/></div><div className="empty-tx">جاري التحميل...</div></div>
            ) : !employees || employees.length === 0 ? (
                <EmptyState icon="ti-users" text="لا يوجد موظفون" sub="أضف أول موظف" action={<Button variant="primary" onClick={openAdd}>موظف جديد</Button>} />
            ) : (
                <Card noHeader style={{ padding: 0 }}>
                    <div className="tw">
                        <table>
                            <thead>
                                <tr>
                                    <th>الموظف</th>
                                    <th>رقم التسجيل</th>
                                    <th>NSS</th>
                                    <th>تاريخ الميلاد</th>
                                    <th>تاريخ التوظيف</th>
                                    <th>الحالة الوظيفية</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp: any, i: number) => (
                                    <tr key={emp.id}>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Avatar
                                                    initials={`${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`}
                                                    color={((i % 7) + 1) as 1|2|3|4|5|6|7}
                                                    size={32}
                                                />
                                                <div>
                                                    <div className="s">{emp.first_name} {emp.last_name}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                                                        {emp.relations?.user?.email || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="m">{emp.matricule || '—'}</td>
                                        <td className="m" style={{ fontSize: 11 }}>{emp.nss || '—'}</td>
                                        <td style={{ fontSize: 12, color: 'var(--t4)' }}>
                                            {emp.birth_date ? new Date(emp.birth_date).toLocaleDateString('fr-DZ') : '—'}
                                        </td>
                                        <td style={{ fontSize: 12, color: 'var(--t4)' }}>
                                            {emp.hire_date ? new Date(emp.hire_date).toLocaleDateString('fr-DZ') : '—'}
                                        </td>
                                        <td>
                                            <Badge variant={
                                                emp.employment_status === 'active' ? 'success' :
                                                emp.employment_status === 'suspended' ? 'warning' : 'danger'
                                            }>
                                                {emp.employment_status === 'active' ? 'نشط' :
                                                 emp.employment_status === 'suspended' ? 'معلق' : 'منتهي الخدمة'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 3 }}>
                                                <Button size="xs" icon={<i className="ti ti-pencil"/>} onClick={() => openEdit(emp)}/>
                                                <Button size="xs" variant="danger" icon={<i className="ti ti-trash"/>} onClick={() => deleteMutation.mutate(emp.id)}/>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <EmployeeModal open={modal.open} employee={editingEmployee} onClose={modal.closeModal} />
        </div>
    );
}

// ===============================================
// Employee Modal
// ===============================================
function EmployeeModal({ open, employee, onClose }: {
    open: boolean;
    employee: Employee | null;
    onClose: () => void;
}) {
    const isEdit = !!employee;

    const emptyForm = {
        first_name: '',
        last_name: '',
        matricule: '',
        nss: '',
        birth_date: '',
        gender_id: '',
        rib: '',
        bank_name: '',
        hire_date: new Date().toISOString().split('T')[0],
        termination_date: '',
        employment_status: 'active',
    };

    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    // Fetch genders
    const { data: genders } = useTenantQuery(
        (slug) => tenantKeys.lookups.genders(slug),
        () => apiGet('/genders').then(r => r.data.data),
        { staleTime: 10 * 60_000, enabled: open },
    );

    // إعادة تعيين النموذج
    useEffect(() => {
        if (open) {
            if (employee) {
                const emp = employee as any;
                setForm({
                    first_name: emp.first_name || '',
                    last_name: emp.last_name || '',
                    matricule: emp.matricule || '',
                    nss: emp.nss || '',
                    birth_date: emp.birth_date ? emp.birth_date.split('T')[0] : '',
                    gender_id: emp.gender_id || '',
                    rib: emp.rib || '',
                    bank_name: emp.bank_name || '',
                    hire_date: emp.hire_date ? emp.hire_date.split('T')[0] : '',
                    termination_date: emp.termination_date ? emp.termination_date.split('T')[0] : '',
                    employment_status: emp.employment_status || 'active',
                });
            } else {
                setForm(emptyForm);
            }
            setError('');
        }
    }, [open, employee]);

    const set = (k: string, v: string) => {
        setForm(f => ({ ...f, [k]: v }));
        setError('');
    };

    // في EmployeesPage.tsx، داخل EmployeeModal، عدل saveMutation:

const saveMutation = useTenantMutation(
    (data: typeof form) => {
        const payload: any = {
            first_name: data.first_name,
            last_name: data.last_name,
            matricule: data.matricule || null,
            nss: data.nss || null,
            birth_date: data.birth_date || null,
            gender_id: data.gender_id ? parseInt(data.gender_id) : null,
            rib: data.rib || null,
            bank_name: data.bank_name || null,
            hire_date: data.hire_date || null,
            termination_date: data.termination_date || null,
            employment_status: data.employment_status || 'active',
        };

        // ✅ لا نرسل created_by - الباك-إند يجب أن يتعامل معها تلقائياً
        if (isEdit) {
            return employeesApi.update(employee!.id, payload);
        }
        return employeesApi.create(payload);
    },
    (slug) => [slug, 'employees'] as const,
    {
        onSuccess: () => onClose(),
        onError: (err: any) => {
            const msg = err?.response?.data?.message || err?.response?.data?.error || 'فشل الحفظ. تحقق من البيانات.';
            // ✅ إذا كان الخطأ يتعلق بـ created_by، نعرض رسالة أوضح
            if (msg.includes('created_by')) {
                setError('خطأ في الخادم: تأكد من تسجيل الدخول بشكل صحيح.');
            } else {
                setError(msg);
            }
        },
    },
);

    const handleSave = () => {
        if (!form.first_name.trim() || !form.last_name.trim() || !form.matricule.trim()) {
        setError('الاسم واللقب ورقم التسجيل حقول مطلوبة');
        return;
        }
        saveMutation.mutate(form);
    };

    return (
        <Modal open={open} onClose={onClose} size="lg"
            title={isEdit ? `تعديل — ${(employee as any)?.first_name} ${(employee as any)?.last_name}` : 'موظف جديد'}
            subtitle={isEdit ? '' : 'إضافة موظف جديد إلى النظام'}
            footer={
                <>
                    <Button onClick={onClose}>إلغاء</Button>
                    <Button variant="primary" icon={<i className="ti ti-device-floppy"/>}
                        onClick={handleSave}
                        disabled={saveMutation.isPending}>
                        {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
                    </Button>
                </>
            }>

            {error && <AlertBar variant="red">{error}</AlertBar>}

            <div className="fgrid c3">
                <div className="fg">
                    <label className="req">الاسم الأول</label>
                    <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="الاسم" autoFocus />
                </div>
                <div className="fg">
                    <label className="req">اللقب</label>
                    <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="اللقب" />
                </div>
                <div className="fg">
                    <label>رقم التسجيل</label>
                    <input value={form.matricule} onChange={e => set('matricule', e.target.value)} placeholder="MAT-001" />
                </div>
                <div className="fg">
                    <label>NSS</label>
                    <input value={form.nss} onChange={e => set('nss', e.target.value)} placeholder="رقم الضمان الاجتماعي" style={{ fontFamily: 'monospace' }} />
                </div>
                <div className="fg">
                    <label>تاريخ الميلاد</label>
                    <input type="date" value={form.birth_date} onChange={e => set('birth_date', e.target.value)} />
                </div>
                <div className="fg">
                    <label>الجنس</label>
                    <select value={form.gender_id} onChange={e => set('gender_id', e.target.value)}>
                        <option value="">— اختر —</option>
                        {genders?.map((g: any) => (
                            <option key={g.id} value={g.id}>{g.label || g.name}</option>
                        ))}
                    </select>
                </div>
                <div className="fg">
                    <label>تاريخ التوظيف</label>
                    <input type="date" value={form.hire_date} onChange={e => set('hire_date', e.target.value)} />
                </div>
                <div className="fg">
                    <label>تاريخ إنهاء الخدمة</label>
                    <input type="date" value={form.termination_date} onChange={e => set('termination_date', e.target.value)} />
                </div>
                <div className="fg">
                    <label>الحالة الوظيفية</label>
                    <select value={form.employment_status} onChange={e => set('employment_status', e.target.value)}>
                        <option value="active">نشط</option>
                        <option value="suspended">معلق</option>
                        <option value="terminated">منتهي الخدمة</option>
                    </select>
                </div>
                <div className="fg">
                    <label>اسم البنك</label>
                    <input value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="BNA" />
                </div>
                <div className="fg">
                    <label>RIB</label>
                    <input value={form.rib} onChange={e => set('rib', e.target.value)} placeholder="00799999000XXXXXXXX00" style={{ fontFamily: 'monospace' }} />
                </div>
            </div>
        </Modal>
    );
}

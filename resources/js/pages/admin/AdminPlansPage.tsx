import { useState } from 'react';
import { useAdminPlans, usePlanMutations, useAdminDashboard } from '@/hooks/admin';
import { Spinner, EmptyState } from '@/components/admin/shared';
import PageHeader from '@/components/ui/PageHeader';
import Card       from '@/components/ui/Card';
import Button     from '@/components/ui/Button';
import Modal      from '@/components/ui/Modal';
import { useConfirm } from '@/hooks/useConfirm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useModal } from '@/hooks/useModal';
import type { AdminPlan } from '@/types/admin';

const PLAN_COLORS: Record<string, string> = {
  free: '#6b7280', starter: '#6366f1',
  professional: '#0ea5e9', enterprise: '#f59e0b', custom: '#8b5cf6',
};

const emptyForm = {
  key: '', label: '', description: '',
  max_users: 0, max_products: 0, max_warehouses: 0,
  sort_order: 0, is_active: true,
};

export default function AdminPlansPage() {
  const { data: plans, isLoading, isError, error } = useAdminPlans();
  const { data: stats } = useAdminDashboard();
  const muts = usePlanMutations();
  const byPlan = stats?.companies?.by_plan ?? {};
  const editModal = useModal();
  const [form, setForm] = useState<Partial<AdminPlan>>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const deleteConfirm = useConfirm();

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    editModal.openModal();
  };

  const openEdit = (p: AdminPlan) => {
    setEditingId(p.id);
    setForm({
      key: p.key, label: p.label, description: p.description || '',
      max_users: p.max_users, max_products: p.max_products,
      max_warehouses: p.max_warehouses, sort_order: p.sort_order,
      is_active: p.is_active,
    });
    editModal.openModal();
  };

  const handleSave = async () => {
    if (editingId) {
      await muts.update.mutateAsync({ id: editingId, data: form });
    } else {
      await muts.create.mutateAsync(form);
    }
    editModal.closeModal();
  };

  const f = (k: string) => (form as any)[k] ?? '';
  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  if (isLoading) {
    return (
      <div>
        <PageHeader title="الخطط" />
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div>
        <PageHeader title="الخطط" />
        <div style={{
          padding: '16px 20px', borderRadius: 10,
          background: 'var(--redb)', border: '1px solid #ef444433',
          color: 'var(--red)', fontSize: 13,
        }}>
          تعذّر تحميل الخطط: {(error as any)?.message ?? 'خطأ'}
        </div>
      </div>
    );
  }

  const planList = Array.isArray(plans) ? plans : [];

  return (
    <div>
      <PageHeader
        title="الخطط"
        description="إدارة خطط الاشتراك والحدود المسموح بها"
        actions={
          <Button variant="primary" icon={<i className="ti ti-plus" />} onClick={openCreate}>
            إضافة خطة
          </Button>
        }
      />

      {planList.length === 0 ? (
        <EmptyState icon="ti-package-off" text="لا توجد خطط محدّدة" />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 16,
        }}>
          {planList.map(plan => {
            const count = byPlan[plan.key] ?? 0;
            const color = PLAN_COLORS[plan.key] ?? '#6b7280';
            return (
              <Card key={plan.id} padding={20}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: color + '22', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className="ti ti-package" style={{ fontSize: 18, color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--t1)' }}>
                      {plan.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                      {count} شركة · {plan.is_active ? 'نشطة' : 'معطلة'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => openEdit(plan)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}
                      title="تعديل"
                    >
                      <i className="ti ti-edit" />
                    </button>
                    <button
                      onClick={async () => { if (!await deleteConfirm.confirm('حذف هذه الخطة؟')) return; muts.remove.mutate(plan.id); }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4 }}
                      title="حذف"
                    >
                      <i className="ti ti-trash" />
                    </button>
                  </div>
                </div>

                {plan.description && (
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 12, lineHeight: 1.5 }}>
                    {plan.description}
                  </div>
                )}

                {[
                  { label: 'المستخدمون',  val: plan.max_users },
                  { label: 'المنتجات',    val: plan.max_products },
                  { label: 'المستودعات',  val: plan.max_warehouses },
                  { label: 'الترتيب',     val: plan.sort_order },
                ].map(row => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '5px 0', borderBottom: '1px solid var(--b1)', fontSize: 12,
                  }}>
                    <span style={{ color: 'var(--t4)' }}>{row.label}</span>
                    <strong style={{ color: 'var(--t1)' }}>
                      {row.val === 0 ? 'غير محدود' : row.val.toLocaleString('ar')}
                    </strong>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={editModal.open}
        onClose={editModal.closeModal}
        size="sm"
        title={editingId ? 'تعديل الخطة' : 'إضافة خطة جديدة'}
        footer={
          <>
            <Button onClick={editModal.closeModal} disabled={muts.create.isPending || muts.update.isPending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              icon={<i className="ti ti-device-floppy" />}
              onClick={handleSave}
              loading={muts.create.isPending || muts.update.isPending}
            >
              حفظ
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="fg" style={{ flex: 1 }}>
              <label className="req">المفتاح</label>
              <input value={f('key')} onChange={e => set('key', e.target.value)}
                disabled={!!editingId} placeholder="free, starter, ..." />
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label className="req">الاسم</label>
              <input value={f('label')} onChange={e => set('label', e.target.value)} placeholder="مجاني" />
            </div>
          </div>
          <div className="fg">
            <label>الوصف</label>
            <input value={f('description')} onChange={e => set('description', e.target.value)} placeholder="وصف الخطة" />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="fg" style={{ flex: 1 }}>
              <label>الحد الأقصى للمستخدمين</label>
              <input type="number" min={0} value={f('max_users')} onChange={e => set('max_users', parseInt(e.target.value) || 0)} />
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label>الحد الأقصى للمنتجات</label>
              <input type="number" min={0} value={f('max_products')} onChange={e => set('max_products', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="fg" style={{ flex: 1 }}>
              <label>الحد الأقصى للمستودعات</label>
              <input type="number" min={0} value={f('max_warehouses')} onChange={e => set('max_warehouses', parseInt(e.target.value) || 0)} />
            </div>
            <div className="fg" style={{ flex: 1 }}>
              <label>ترتيب الظهور</label>
              <input type="number" min={0} value={f('sort_order')} onChange={e => set('sort_order', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="fg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ margin: 0 }}>نشطة</label>
            <input type="checkbox" checked={!!form.is_active} onChange={e => set('is_active', e.target.checked)}
              style={{ width: 18, height: 18 }} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

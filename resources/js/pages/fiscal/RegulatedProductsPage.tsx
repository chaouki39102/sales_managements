import { useState, useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import Skeleton from '@/components/ui/Skeleton';
import Modal from '@/components/ui/Modal';
import { Input, Select, FormField, Textarea } from '@/components/ui/FormInputs';
import { useModal } from '@/hooks/useModal';
import { useConfirm } from '@/hooks/useConfirm';
import { useNotification } from '@/hooks/useNotification';
import { ConfirmDialog } from '@/components/ui';
import { useRegulatedProducts, useTaxManagementMutations } from '@/lib/api/endpoints/taxManagement';
import type { RegulatedProduct } from '@/lib/api/endpoints/taxManagement';

const CATEGORIES = ['huile', 'farine', 'semoul', 'sucre', 'lait', 'cafe', 'pain', 'other'];
const emptyProduct = {
  product_key: '', label: '', unit_label: '', category: 'other',
  regulated_max_price: 0, regulated_margin: undefined,
  regulation_type: 'price' as const, legal_reference: '', notes: '',
};

function RegulatedProductModal({ open, product, onClose }: { open: boolean; product?: RegulatedProduct | null; onClose: () => void }) {
  const mutations = useTaxManagementMutations();
  const isEdit = !!product;
  const [form, setForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(product ? { ...product } : { ...emptyProduct });
    }
  }, [open, product]);

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        product_key: form.product_key,
        label: form.label,
        unit_label: form.unit_label,
        category: form.category,
        regulated_max_price: Number(form.regulated_max_price),
        regulated_margin: form.regulated_margin ? Number(form.regulated_margin) : undefined,
        regulation_type: form.regulation_type,
        legal_reference: form.legal_reference,
        notes: form.notes,
      };
      if (isEdit) {
        await mutations.updateRegulatedProduct.mutateAsync({ id: product!.id, data });
      } else {
        await mutations.createRegulatedProduct.mutateAsync(data as any);
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="md"
      title={isEdit ? 'تعديل مادة مقنَّنة' : 'إضافة مادة مقنَّنة جديدة'}
      footer={<><Button onClick={onClose}>إلغاء</Button><Button variant="primary" loading={saving} onClick={handleSave}>حفظ</Button></>}>
      <div className="fgrid">
        <FormField>
          <label className="req">المفتاح</label>
          <Input value={form.product_key ?? ''} onChange={e => set('product_key', e.target.value)} placeholder="مثال: huile_1L" />
        </FormField>
        <FormField>
          <label className="req">التسمية</label>
          <Input value={form.label ?? ''} onChange={e => set('label', e.target.value)} placeholder="مثال: زيت مائدة مدعم 1ل" />
        </FormField>
        <FormField>
          <label className="req">وحدة القياس</label>
          <Input value={form.unit_label ?? ''} onChange={e => set('unit_label', e.target.value)} placeholder="مثال: لتر، كغ" />
        </FormField>
        <FormField>
          <label className="req">التصنيف</label>
          <Select value={form.category ?? 'other'} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </Select>
        </FormField>
        <FormField>
          <label className="req">نوع التنظيم</label>
          <Select value={form.regulation_type ?? 'price'} onChange={e => set('regulation_type', e.target.value)}>
            <option value="price">سعر أقصى</option>
            <option value="margin">هامش أقصى</option>
          </Select>
        </FormField>
        <FormField>
          <label className="req">{form.regulation_type === 'price' ? 'السعر الأقصى (دج)' : 'الهامش الأقصى (%)'}</label>
          <Input type="number" step="0.01" value={form.regulated_max_price ?? 0}
            placeholder={form.regulation_type === 'price' ? 'مثال: 125' : 'مثال: 10'}
            onChange={e => set('regulated_max_price', e.target.value)} />
        </FormField>
        <FormField>
          <label>هامش التنظيم (%)</label>
          <Input type="number" step="0.01" value={form.regulated_margin ?? ''}
            onChange={e => set('regulated_margin', e.target.value)} placeholder="اختياري" />
        </FormField>
        <FormField>
          <label>المرجع القانوني</label>
          <Input value={form.legal_reference ?? ''} onChange={e => set('legal_reference', e.target.value)} placeholder="مثال: م.ت 20-241" />
        </FormField>
        <FormField span={2}>
          <label>ملاحظات</label>
          <Textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}

export default function RegulatedProductsPage() {
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<RegulatedProduct | null>(null);
  const { data: products, isLoading } = useRegulatedProducts(!showInactive);
  const mutations = useTaxManagementMutations();
  const deleteConfirm = useConfirm();
  const notify = useNotification();
  const createModal = useModal();
  const editModal = useModal();

  const openEdit = (p: RegulatedProduct) => {
    setEditing(p);
    editModal.openModal();
  };

  const openCreate = () => {
    setEditing(null);
    createModal.openModal();
  };

  if (isLoading) return <Skeleton variant="table" rows={8} />;

  return (
    <div className="page on" id="p-regulated-products">
      <PageHeader
        title="المواد المقنَّنة"
        subtitle="المواد ذات السعر الأقصى المحدد قانوناً"
        actions={
          <>
            <Button size="sm" icon={<i className="ti ti-plus" />} onClick={openCreate}>
              إضافة
            </Button>
            <Button size="sm" variant={showInactive ? 'primary' : 'default'} onClick={() => setShowInactive(!showInactive)}>
              {showInactive ? 'إخفاء غير النشطة' : 'عرض الكل'}
            </Button>
            <Button size="sm" icon={<i className="ti ti-refresh" />} onClick={() => mutations.seedDefaults.mutate()}>
              استعادة الافتراضي
            </Button>
          </>
        }
      />

      <Card title="قائمة المواد المقنَّنة" subtitle={`${products?.length ?? 0} منتج`}>
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>التصنيف</th>
                <th>السعر الأقصى</th>
                <th>الهامش</th>
                <th>نوع التنظيم</th>
                <th>الحالة</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products?.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.label}</strong><br /><span style={{ fontSize: 11, color: 'var(--t4)' }}>{p.product_key}</span></td>
                  <td>{p.category}</td>
                  <td className="m">{p.regulated_max_price?.toLocaleString('fr-DZ')} دج/{p.unit_label}</td>
                  <td className="m">{p.regulated_margin ? `${p.regulated_margin}%` : '—'}</td>
                  <td><Badge variant={p.regulation_type === 'price' ? 'info' : 'warning'}>{p.regulation_type === 'price' ? 'سعر' : 'هامش'}</Badge></td>
                  <td>
                    <Switch
                      checked={p.active}
                      onChange={() => mutations.toggleRegulatedProduct.mutate(p.id)}
                    />
                  </td>
                  <td>
                    <Button size="xs" variant="info" icon={<i className="ti ti-edit" />}
                      style={{ marginLeft: 4 }} onClick={() => openEdit(p)} />
                    <Button size="xs" variant="danger" icon={<i className="ti ti-trash" />}
                      onClick={async () => { if (await deleteConfirm.confirm('حذف هذه المادة؟')) mutations.deleteRegulatedProduct.mutate(p.id, { onSuccess: () => notify.success('تم الحذف') }); }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <RegulatedProductModal open={createModal.open} product={null} onClose={createModal.closeModal} />
      <RegulatedProductModal open={editModal.open} product={editing} onClose={editModal.closeModal} />
      <ConfirmDialog {...deleteConfirm.confirmDialogProps} />
    </div>
  );
}

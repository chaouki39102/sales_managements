// resources/js/components/products/ProductModal.tsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import AlertBar from '@/components/ui/AlertBar';
import apiClient from '@/lib/api/client';

interface Props {
  open: boolean;
  record: any | null; // Product or null
  onClose: () => void;
}

// API calls
const productApi = {
  create: (data: any) => apiClient.post('/products', data).then(r => r.data),
  update: (id: number, data: any) => apiClient.put(`/products/${id}`, data).then(r => r.data),
};

export default function ProductModal({ open, record, onClose }: Props) {
  const isEdit = !!record;
  const qc = useQueryClient();

  // جلب البيانات المساعدة
  const { data: families = [] } = useQuery({
    queryKey: ['families-select'],
    queryFn: () => apiClient.get('/families', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: brands = [] } = useQuery({
    queryKey: ['brands-select'],
    queryFn: () => apiClient.get('/brands', { params: { per_page: 200 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });
  const { data: productTypes = [] } = useQuery({
    queryKey: ['product-types-select'],
    queryFn: () => apiClient.get('/product-types', { params: { per_page: 50 } }).then(r => r.data.data),
    staleTime: 5 * 60_000,
  });

  const emptyForm = {
    name: '',
    slug: '',
    description: '',
    family_id: '',
    brand_id: '',
    product_type_id: '',
    active: true,
  };

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState('');

  useEffect(() => {
    if (open) {
      if (record) {
        setForm({
          name: record.name ?? '',
          slug: record.slug ?? '',
          description: record.description ?? '',
          family_id: record.family_id?.toString() ?? '',
          brand_id: record.brand_id?.toString() ?? '',
          product_type_id: record.product_type_id?.toString() ?? '',
          active: record.active ?? true,
        });
      } else {
        setForm(emptyForm);
      }
      setErrors({});
      setServerError('');
    }
  }, [open, record]);

  const set = (key: string, value: any) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'اسم المنتج مطلوب';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = {
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || null,
        family_id: data.family_id ? parseInt(data.family_id) : null,
        brand_id: data.brand_id ? parseInt(data.brand_id) : null,
        product_type_id: data.product_type_id ? parseInt(data.product_type_id) : null,
        active: data.active,
      };
      return isEdit ? productApi.update(record.id, payload) : productApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      if (data?.errors) {
        const fieldErrors: Record<string, string> = {};
        for (const [k, v] of Object.entries(data.errors)) fieldErrors[k] = (v as string[])[0];
        setErrors(fieldErrors);
      } else {
        setServerError(data?.message || 'فشل الحفظ');
      }
    },
  });

  const handleSave = () => {
    if (!validate()) return;
    mutation.mutate(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>إلغاء</Button>
          <Button variant="primary" onClick={handleSave} disabled={mutation.isPending}>
            {mutation.isPending ? 'جارٍ الحفظ...' : 'حفظ'}
          </Button>
        </>
      }
    >
      {serverError && <AlertBar variant="red">{serverError}</AlertBar>}
      <div className="fgrid c2" style={{ gap: 14 }}>
        <div className="fg s2">
          <label className="req">اسم المنتج</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} />
          {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>{errors.name}</span>}
        </div>
        <div className="fg">
          <label>الرابط الدائم (Slug)</label>
          <input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="يُترك لتوليد تلقائي" />
        </div>
        <div className="fg s2">
          <label>الوصف</label>
          <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="fg">
          <label>الفئة</label>
          <select value={form.family_id} onChange={e => set('family_id', e.target.value)}>
            <option value="">— اختر —</option>
            {families.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>العلامة التجارية</label>
          <select value={form.brand_id} onChange={e => set('brand_id', e.target.value)}>
            <option value="">— اختر —</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>نوع المنتج</label>
          <select value={form.product_type_id} onChange={e => set('product_type_id', e.target.value)}>
            <option value="">— اختر —</option>
            {productTypes.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="fg">
          <label>نشط</label>
          <Switch checked={form.active} onChange={v => set('active', v)} />
        </div>
      </div>
    </Modal>
  );
}

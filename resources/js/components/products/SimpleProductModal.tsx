import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Switch from '@/components/ui/Switch';
import ImageUploader from '@/components/ui/ImageUploader';
import { Product, Family, Brand, ProductType } from '@/types/product';
import { useLookups } from '@/hooks/useLookups';

const productSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  description: z.string().nullable(),
  family_id: z.number().nullable(),
  brand_id: z.number().nullable(),
  product_type_id: z.number().nullable(),
  active: z.boolean().default(true),
  images: z.array(z.string()).nullable(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Props {
  open: boolean;
  initialProduct?: Product | null;
  onClose: () => void;
  onSave: (data: ProductFormData) => Promise<void>;
  isSaving?: boolean;
}

export default function SimpleProductModal({ open, initialProduct, onClose, onSave, isSaving }: Props) {
  const { families, brands, productTypes } = useLookups();
  const { control, handleSubmit, reset } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      family_id: null,
      brand_id: null,
      product_type_id: null,
      active: true,
      images: [],
    },
  });

  useEffect(() => {
    if (initialProduct && open) {
      reset({
        name: initialProduct.name,
        description: initialProduct.description ?? '',
        family_id: initialProduct.family_id ?? null,
        brand_id: initialProduct.brand_id ?? null,
        product_type_id: initialProduct.product_type_id ?? null,
        active: initialProduct.active,
        images: initialProduct.images ?? [],
      });
    } else if (open) {
      reset({
        name: '',
        description: '',
        family_id: null,
        brand_id: null,
        product_type_id: null,
        active: true,
        images: [],
      });
    }
  }, [initialProduct, open, reset]);

  const onSubmit = async (data: ProductFormData) => {
    await onSave(data);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={initialProduct ? 'تعديل المنتج' : 'إضافة منتج جديد'} size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* الاسم */}
        <div>
          <label className="block text-sm font-medium mb-1">اسم المنتج *</label>
          <Controller name="name" control={control} render={({ field }) => <input {...field} className="w-full border rounded px-3 py-2" />} />
        </div>

        {/* الوصف */}
        <div>
          <label className="block text-sm font-medium mb-1">الوصف</label>
          <Controller name="description" control={control} render={({ field }) => <textarea {...field} rows={3} className="w-full border rounded px-3 py-2" />} />
        </div>

        {/* التصنيفات */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">الفئة</label>
            <Controller name="family_id" control={control} render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="w-full border rounded px-3 py-2">
                <option value="">اختر</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">العلامة التجارية</label>
            <Controller name="brand_id" control={control} render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="w-full border rounded px-3 py-2">
                <option value="">اختر</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">نوع المنتج</label>
            <Controller name="product_type_id" control={control} render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="w-full border rounded px-3 py-2">
                <option value="">اختر</option>
                {productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )} />
          </div>
        </div>

        {/* الصور (بسيطة) */}
        <div>
          <label className="block text-sm font-medium mb-1">الصورة</label>
          <Controller name="images" control={control} render={({ field }) => (
            <ImageUploader value={field.value || []} onChange={field.onChange} />
          )} />
        </div>

        {/* الحالة */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-medium">المنتج نشط</span>
          <Controller name="active" control={control} render={({ field }) => (
            <Switch checked={field.value} onChange={field.onChange} />
          )} />
        </div>

        {/* الأزرار */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="default" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? 'جارٍ الحفظ...' : (initialProduct ? 'تحديث' : 'إضافة')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
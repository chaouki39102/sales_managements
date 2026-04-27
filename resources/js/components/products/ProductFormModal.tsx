// resources/js/components/products/ProductFormModal.tsx
import React, { useState, useEffect } from 'react';
import { FormProvider, useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import ImageUploader from '@/components/ui/ImageUploader';
import { Product, ProductVariant, Family, Brand, ProductType, Unit, TvaRate, PriceLevel, InventoryValuationMethod, Warehouse } from '@/types/product';
import { productService } from '@/services/productService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// ----- Zod Schemas (مختصرة للعرض، يمكن توسيعها) -----
const variantPriceSchema = z.object({
  price_level_id: z.number(),
  price: z.number().nullable(),
  valid_from: z.string().nullable(),
  valid_to: z.string().nullable(),
  active: z.boolean().default(true),
});

const quantityDiscountSchema = z.object({
  min_quantity: z.number().min(1),
  max_quantity: z.number().nullable(),
  discount_percentage: z.number().nullable(),
  discount_per_unit: z.number().nullable(),
  tier_order: z.number(),
  active: z.boolean().default(true),
});

const productLotSchema = z.object({
  lot_number: z.string().min(1),
  supplier_lot_number: z.string().nullable(),
  warehouse_id: z.number().nullable(),
  manufacturing_date: z.string().nullable(),
  expiration_date: z.string().nullable(),
  purchase_date: z.string().nullable(),
  purchase_price: z.number().nullable(),
  legal_selling_price: z.number().nullable(),
  margin_percentage: z.number().nullable(),
  original_quantity: z.number().min(0),
  remaining_quantity: z.number().optional(),
  active: z.boolean().default(true),
});

const variantSchema = z.object({
  id: z.number().optional(),
  ref: z.string().min(1),
  barcode: z.string().nullable(),
  variant_name: z.string().nullable(),
  unit_id: z.number().nullable(),
  tva_id: z.number().nullable(),
  weight: z.number().nullable(),
  volume: z.number().nullable(),
  length: z.number().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  variant_attributes: z.record(z.string()).nullable(),
  default_selling_price_ht: z.number().min(0),
  last_purchase_price: z.number().nullable(),
  average_cost_price: z.number().nullable(),
  manages_stock: z.boolean().default(true),
  allow_negative_stock: z.boolean().default(false),
  has_lots: z.boolean().default(false),
  has_expiration_date: z.boolean().default(false),
  min_stock_alert: z.number().nullable(),
  max_stock_alert: z.number().nullable(),
  manages_quantity_discounts: z.boolean().default(false),
  valuation_method_id: z.number().nullable(),
  active: z.boolean().default(true),
  prices: z.array(variantPriceSchema).default([]),
  quantity_discounts: z.array(quantityDiscountSchema).default([]),
  lots: z.array(productLotSchema).optional(),
});

const productSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().nullable(),
  family_id: z.number().nullable(),
  brand_id: z.number().nullable(),
  product_type_id: z.number().nullable(),
  specifications: z.record(z.string()).nullable(),
  images: z.array(z.string()).nullable(),
  meta_title: z.string().nullable(),
  meta_description: z.string().nullable(),
  meta_keywords: z.array(z.string()).nullable(),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).min(1),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Lookups {
  families: Family[];
  brands: Brand[];
  productTypes: ProductType[];
  units: Unit[];
  tvaRates: TvaRate[];
  priceLevels: PriceLevel[];
  valuationMethods: InventoryValuationMethod[];
  warehouses: Warehouse[];
}

interface Props {
  initialProduct?: Product | null;
  onClose: () => void;
  lookups: Lookups;
}

// ----- التبويبات الداخلية (سيتم تعريفها لاحقاً) -----
function BasicInfoTab({ lookups }: { lookups: Lookups }) {
  const { control } = useFormContext<ProductFormData>();
  return (
    <Card title="المعلومات الأساسية">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium">الاسم *</label><Controller name="name" control={control} render={({ field }) => <input {...field} className="w-full border rounded px-3 py-2" />} /></div>
          <div><label className="block text-sm font-medium">الرابط الدائم</label><Controller name="slug" control={control} render={({ field }) => <input {...field} className="w-full border rounded px-3 py-2" />} /></div>
          <div><label className="block text-sm font-medium">الفئة</label><Controller name="family_id" control={control} render={({ field }) => <select {...field} value={field.value ?? ''} className="w-full border rounded px-3 py-2"><option value="">اختر</option>{lookups.families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}</select>} /></div>
          <div><label className="block text-sm font-medium">العلامة التجارية</label><Controller name="brand_id" control={control} render={({ field }) => <select {...field} value={field.value ?? ''} className="w-full border rounded px-3 py-2"><option value="">اختر</option>{lookups.brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>} /></div>
          <div><label className="block text-sm font-medium">نوع المنتج</label><Controller name="product_type_id" control={control} render={({ field }) => <select {...field} value={field.value ?? ''} className="w-full border rounded px-3 py-2"><option value="">اختر</option>{lookups.productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>} /></div>
          <div className="flex items-center justify-between"><span className="text-sm font-medium">نشط</span><Controller name="active" control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} /></div>
        </div>
        <div><label className="block text-sm font-medium">الوصف</label><Controller name="description" control={control} render={({ field }) => <textarea {...field} rows={3} className="w-full border rounded px-3 py-2" />} /></div>
        <div><label className="block text-sm font-medium">الصور</label><Controller name="images" control={control} render={({ field }) => <ImageUploader value={field.value || []} onChange={field.onChange} />} /></div>
      </div>
    </Card>
  );
}

// تبويب المتغيرات (جدول ملخص) – سنستخدم مكوناً آخر لتحرير المتغيرات
function VariantsSummaryTab({ lookups }: { lookups: Lookups }) {
  const { control, watch } = useFormContext<ProductFormData>();
  const variants = watch('variants') || [];
  const [openVariantModal, setOpenVariantModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const { append, update, remove } = useFieldArray({ control, name: 'variants' });

  const handleAddEdit = (data: ProductVariant) => {
    if (editingIndex !== null) update(editingIndex, data);
    else append(data);
    setOpenVariantModal(false);
    setEditingIndex(null);
  };

  if (variants.length === 0) {
    return (
      <EmptyState icon="ti-versions" text="لا توجد متغيرات" sub="أضف متغيراً أولاً لبدء البيع" action={<Button variant="primary" onClick={() => setOpenVariantModal(true)}>+ إضافة متغير</Button>} />
    );
  }

  return (
    <Card title={`المتغيرات (${variants.length})`} actions={<Button variant="primary" size="xs" onClick={() => { setEditingIndex(null); setOpenVariantModal(true); }}>+ إضافة</Button>}>
      <div className="space-y-3">
        {variants.map((v, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">{v.variant_name || v.ref}</div>
              <div className="text-xs text-gray-500">{v.ref}{v.barcode ? ` · ${v.barcode}` : ''}</div>
            </div>
            <div className="flex gap-2">
              <Badge variant={v.active ? 'success' : 'danger'}>{v.active ? 'نشط' : 'غير نشط'}</Badge>
              <Button size="xs" variant="default" onClick={() => { setEditingIndex(idx); setOpenVariantModal(true); }}>تعديل</Button>
              <Button size="xs" variant="danger" onClick={() => remove(idx)}>حذف</Button>
            </div>
          </div>
        ))}
      </div>
      {/* مودال المتغير (يمكن تنفيذه لاحقاً) */}
    </Card>
  );
}

function PricingTab({ priceLevels }: { priceLevels: PriceLevel[] }) {
  const { control, watch } = useFormContext<ProductFormData>();
  const variants = watch('variants') || [];
  const [selectedVariant, setSelectedVariant] = useState(0);
  if (variants.length === 0) return <EmptyState icon="ti-tag" text="أضف متغيراً أولاً لإدارة الأسعار" />;
  return (
    <Card title="مستويات الأسعار">
      <div className="mb-4"><label>اختر المتغير</label><select value={selectedVariant} onChange={e => setSelectedVariant(Number(e.target.value))} className="border rounded p-2">{variants.map((v, i) => <option key={i} value={i}>{v.variant_name || v.ref}</option>)}</select></div>
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50"><tr><th>مستوى السعر</th><th>السعر (دج)</th><th>صالح من</th><th>صالح إلى</th><th>نشط</th></tr></thead>
          <tbody>
            {priceLevels.map((pl, i) => (
              <tr key={pl.id}>
                <td>{pl.name}</td>
                <td><Controller name={`variants.${selectedVariant}.prices.${i}.price`} control={control} render={({ field }) => <input type="number" {...field} value={field.value ?? ''} className="border rounded p-1 w-28" />} /></td>
                <td><Controller name={`variants.${selectedVariant}.prices.${i}.valid_from`} control={control} render={({ field }) => <input type="date" {...field} className="border rounded p-1" />} /></td>
                <td><Controller name={`variants.${selectedVariant}.prices.${i}.valid_to`} control={control} render={({ field }) => <input type="date" {...field} className="border rounded p-1" />} /></td>
                <td className="text-center"><Controller name={`variants.${selectedVariant}.prices.${i}.active`} control={control} render={({ field }) => <input type="checkbox" checked={field.value} onChange={e => field.onChange(e.target.checked)} />} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function InventoryTab({ valuationMethods }: { valuationMethods: InventoryValuationMethod[] }) {
  const { control, watch } = useFormContext<ProductFormData>();
  const variants = watch('variants') || [];
  const selectedVariant = 0; // مبسط
  if (!variants.length) return <EmptyState icon="ti-box" text="أضف متغيراً أولاً لإعدادات المخزون" />;
  const managesStock = watch(`variants.${selectedVariant}.manages_stock`);
  return (
    <Card title="إعدادات المخزون">
      <div className="space-y-4">
        <div className="flex justify-between"><span>إدارة المخزون</span><Controller name={`variants.${selectedVariant}.manages_stock`} control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} /></div>
        {managesStock && (
          <>
            <div className="flex justify-between"><span>السماح بالمخزون السالب</span><Controller name={`variants.${selectedVariant}.allow_negative_stock`} control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} /></div>
            <div className="grid grid-cols-2 gap-4"><div><label>الحد الأدنى</label><Controller name={`variants.${selectedVariant}.min_stock_alert`} control={control} render={({ field }) => <input type="number" {...field} className="border rounded p-2 w-full" />} /></div><div><label>الحد الأقصى</label><Controller name={`variants.${selectedVariant}.max_stock_alert`} control={control} render={({ field }) => <input type="number" {...field} className="border rounded p-2 w-full" />} /></div></div>
            <div><label>طريقة التقييم</label><Controller name={`variants.${selectedVariant}.valuation_method_id`} control={control} render={({ field }) => <select {...field} className="border rounded p-2 w-full"><option value="">اختر</option>{valuationMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>} /></div>
          </>
        )}
      </div>
    </Card>
  );
}

function LotsTab({ warehouses }: { warehouses: Warehouse[] }) {
  const { control, watch } = useFormContext<ProductFormData>();
  const variants = watch('variants') || [];
  const selectedVariant = 0;
  if (!variants.length) return <EmptyState icon="ti-layers" text="أضف متغيراً أولاً" />;
  const hasLots = watch(`variants.${selectedVariant}.has_lots`);
  const { fields, append, remove } = useFieldArray({ control, name: `variants.${selectedVariant}.lots` });
  return (
    <Card title="نظام الحصص والتتبع">
      <div className="flex justify-between mb-4"><span>تفعيل الحصص</span><Controller name={`variants.${selectedVariant}.has_lots`} control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} /></div>
      <div className="flex justify-between mb-4"><span>تفعيل تواريخ الصلاحية</span><Controller name={`variants.${selectedVariant}.has_expiration_date`} control={control} render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />} /></div>
      {hasLots && (
        <>
          <div className="flex justify-end mb-2"><Button size="xs" variant="primary" onClick={() => append({ lot_number: '', supplier_lot_number: '', warehouse_id: null, manufacturing_date: '', expiration_date: '', purchase_date: '', purchase_price: null, legal_selling_price: null, margin_percentage: null, original_quantity: 0, active: true })}>+ إضافة حصة</Button></div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border"><thead className="bg-gray-50"><tr><th>رقم الحصة</th><th>رقم المورد</th><th>المستودع</th><th>تاريخ الإنتاج</th><th>تاريخ الانتهاء</th><th>تاريخ الشراء</th><th>سعر الشراء</th><th>الكمية الأصلية</th><th></th></tr></thead>
            <tbody>{fields.map((field, i) => (<tr key={field.id}><td><Controller name={`variants.${selectedVariant}.lots.${i}.lot_number`} control={control} render={({ field }) => <input {...field} className="border p-1 w-24" />} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.supplier_lot_number`} control={control} render={({ field }) => <input {...field} className="border p-1 w-24" />} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.warehouse_id`} control={control} render={({ field }) => <select {...field} className="border p-1 w-28"><option value="">اختر</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}</select>} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.manufacturing_date`} control={control} render={({ field }) => <input type="date" {...field} className="border p-1 w-28" />} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.expiration_date`} control={control} render={({ field }) => <input type="date" {...field} className="border p-1 w-28" />} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.purchase_date`} control={control} render={({ field }) => <input type="date" {...field} className="border p-1 w-28" />} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.purchase_price`} control={control} render={({ field }) => <input type="number" {...field} className="border p-1 w-24" />} /></td><td><Controller name={`variants.${selectedVariant}.lots.${i}.original_quantity`} control={control} render={({ field }) => <input type="number" {...field} className="border p-1 w-24" />} /></td><td><Button size="xs" variant="danger" onClick={() => remove(i)}>حذف</Button></td></tr>))}</tbody></table>
          </div>
        </>
      )}
    </Card>
  );
}

function SpecsSeoTab() {
  const { control } = useFormContext<ProductFormData>();
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>([]);
  // يمكن استخراجها من specifications الأولية
  return (
    <Card title="المواصفات والسيو">
      <div className="space-y-6">
        <div><label className="block font-medium mb-2">المواصفات</label><div className="space-y-2">{specs.map((s, i) => (<div key={i} className="flex gap-2"><input value={s.key} onChange={e => { const newSpecs = [...specs]; newSpecs[i].key = e.target.value; setSpecs(newSpecs); }} className="border rounded p-2 flex-1" placeholder="الخاصية" /><input value={s.value} onChange={e => { const newSpecs = [...specs]; newSpecs[i].value = e.target.value; setSpecs(newSpecs); }} className="border rounded p-2 flex-1" placeholder="القيمة" /><Button variant="danger" size="xs" onClick={() => setSpecs(specs.filter((_, idx) => idx !== i))}>حذف</Button></div>))}<Button variant="default" size="xs" onClick={() => setSpecs([...specs, { key: '', value: '' }])}>+ إضافة مواصفة</Button></div></div>
        <div><label className="block font-medium mb-2">عنوان الميتا</label><Controller name="meta_title" control={control} render={({ field }) => <input {...field} className="w-full border rounded p-2" />} /></div>
        <div><label className="block font-medium mb-2">وصف الميتا</label><Controller name="meta_description" control={control} render={({ field }) => <textarea {...field} rows={3} className="w-full border rounded p-2" />} /></div>
        <div><label className="block font-medium mb-2">الكلمات المفتاحية</label><Controller name="meta_keywords" control={control} render={({ field }) => <input value={field.value?.join(', ') || ''} onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))} className="w-full border rounded p-2" placeholder="كلمة1، كلمة2، كلمة3" />} /></div>
      </div>
    </Card>
  );
}

// ----- المكون الرئيسي -----
export default function ProductFormModal({ initialProduct, onClose, lookups }: Props) {
  const qc = useQueryClient();
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '', description: '', slug: '', family_id: null, brand_id: null, product_type_id: null,
      specifications: {}, images: [], meta_title: '', meta_description: '', meta_keywords: [],
      active: true,
      variants: [],
    },
  });
  useEffect(() => {
    if (initialProduct) {
      methods.reset({
        name: initialProduct.name, slug: initialProduct.slug, description: initialProduct.description ?? '',
        family_id: initialProduct.family_id ?? null, brand_id: initialProduct.brand_id ?? null,
        product_type_id: initialProduct.product_type_id ?? null, active: initialProduct.active,
        images: initialProduct.images ?? [], meta_title: initialProduct.meta_title ?? '',
        meta_description: initialProduct.meta_description ?? '', meta_keywords: initialProduct.meta_keywords ?? [],
        specifications: initialProduct.specifications ?? {},
        variants: initialProduct.variants?.map(v => ({
          ...v,
          prices: v.prices?.map(p => ({ ...p, price: p.price ?? null })) ?? [],
          quantity_discounts: v.quantity_discounts ?? [],
          lots: v.lots ?? [],
        })) ?? [],
      });
    } else {
      // إضافة متغير افتراضي واحد لتبسيط الإدخال
      methods.setValue('variants', [{
        ref: '', variant_name: '', barcode: '', unit_id: null, tva_id: null,
        weight: null, volume: null, length: null, width: null, height: null,
        variant_attributes: {}, default_selling_price_ht: 0, last_purchase_price: null,
        average_cost_price: null, manages_stock: true, allow_negative_stock: false,
        has_lots: false, has_expiration_date: false, min_stock_alert: null, max_stock_alert: null,
        manages_quantity_discounts: false, valuation_method_id: null, active: true,
        prices: lookups.priceLevels.map(pl => ({ price_level_id: pl.id, price: null, valid_from: null, valid_to: null, active: true })),
        quantity_discounts: [],
        lots: [],
      }]);
    }
  }, [initialProduct, lookups.priceLevels, methods]);

  const mutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (initialProduct) return productService.updateProduct(initialProduct.id, data);
      return productService.createProduct(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] });
      onClose();
    },
    onError: (err) => console.error(err),
  });

  const onSubmit = (data: ProductFormData) => mutation.mutate(data);
  const [activeTab, setActiveTab] = useState('basic');

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="border-b border-gray-200">
            <TabsTrigger value="basic">بيانات أساسية</TabsTrigger>
            <TabsTrigger value="variants">المتغيرات</TabsTrigger>
            <TabsTrigger value="pricing">التسعير</TabsTrigger>
            <TabsTrigger value="inventory">المخزون</TabsTrigger>
            <TabsTrigger value="lots">الحصص والتتبع</TabsTrigger>
            <TabsTrigger value="seo">السيو والمواصفات</TabsTrigger>
          </TabsList>
          <div className="mt-6">
            <TabsContent value="basic"><BasicInfoTab lookups={lookups} /></TabsContent>
            <TabsContent value="variants"><VariantsSummaryTab lookups={lookups} /></TabsContent>
            <TabsContent value="pricing"><PricingTab priceLevels={lookups.priceLevels} /></TabsContent>
            <TabsContent value="inventory"><InventoryTab valuationMethods={lookups.valuationMethods} /></TabsContent>
            <TabsContent value="lots"><LotsTab warehouses={lookups.warehouses} /></TabsContent>
            <TabsContent value="seo"><SpecsSeoTab /></TabsContent>
          </div>
        </Tabs>
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="default" onClick={onClose}>إلغاء</Button>
          <Button variant="primary" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'جارٍ الحفظ...' : (initialProduct ? 'تحديث المنتج' : 'إضافة المنتج')}</Button>
        </div>
      </form>
    </FormProvider>
  );
}

// components/products/BasicInfoTab.tsx
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Family, Brand, ProductType } from '@/types/product';
import ImageUploader from '@/components/ui/ImageUploader';

interface BasicInfoTabProps {
  families: Family[];
  brands: Brand[];
  productTypes: ProductType[];
}

export default function BasicInfoTab({ families, brands, productTypes }: BasicInfoTabProps) {
  const { control, formState: { errors } } = useFormContext();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* الاسم */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="اسم المنتج"
              />
            )}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message as string}</p>}
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الرابط الدائم</label>
          <Controller
            name="slug"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="slug-otomatik"
              />
            )}
          />
        </div>
      </div>

      {/* الوصف */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              rows={4}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="وصف المنتج..."
            />
          )}
        />
      </div>

      {/* الصور */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الصور</label>
        <Controller
          name="images"
          control={control}
          render={({ field }) => <ImageUploader value={field.value || []} onChange={field.onChange} />}
        />
      </div>

      {/* التصنيفات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">العائلة</label>
          <Controller
            name="family_id"
            control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">-- اختر --</option>
                {families.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">العلامة التجارية</label>
          <Controller
            name="brand_id"
            control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">-- اختر --</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">نوع المنتج</label>
          <Controller
            name="product_type_id"
            control={control}
            render={({ field }) => (
              <select {...field} value={field.value ?? ''} className="w-full rounded-md border border-gray-300 px-3 py-2">
                <option value="">-- اختر --</option>
                {productTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}
          />
        </div>
      </div>

      {/* الحالة */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
        <span className="text-sm font-medium text-gray-700">المنتج نشط</span>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <button
              type="button"
              onClick={() => field.onChange(!field.value)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-blue-600' : 'bg-gray-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          )}
        />
      </div>
    </div>
  );
}

// components/products/SpecsSeoTab.tsx
import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';

export default function SpecsSeoTab() {
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name: 'specsArray' }); // سنقوم بتحويل specifications إلى array مؤقتاً

  // نقرأ الـ specifications الحالية (كائن) ونحولها إلى مصفوفة لعرضها في الجدول
  // لكن للتبسيط، سنستخدم حقل منفصل.

  return (
    <div className="space-y-8">
      {/* المواصفات (Key-Value) */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium">المواصفات</h4>
          <button
            type="button"
            onClick={() => append({ key: '', value: '' })}
            className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
          >
            + إضافة مواصفة
          </button>
        </div>
        <div className="space-y-2">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input {...register(`specs.${idx}.key`)} placeholder="الخاصية" className="flex-1 border rounded px-2 py-1" />
              <input {...register(`specs.${idx}.value`)} placeholder="القيمة" className="flex-1 border rounded px-2 py-1" />
              <button type="button" onClick={() => remove(idx)} className="text-red-600">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* SEO */}
      <div className="border-t pt-6">
        <h4 className="font-medium mb-4">بيانات تحسين محركات البحث (SEO)</h4>
        <div className="space-y-4">
          <div>
            <label>عنوان الميتا (Meta Title)</label>
            <input {...register('meta_title')} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label>وصف الميتا (Meta Description)</label>
            <textarea {...register('meta_description')} rows={3} className="w-full border rounded px-2 py-1" />
          </div>
          <div>
            <label>الكلمات المفتاحية (Meta Keywords) - مفصولة بفاصلة</label>
            <Controller
              name="meta_keywords"
              control={control}
              render={({ field }) => (
                <input
                  value={field.value?.join(', ') || ''}
                  onChange={e => field.onChange(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="w-full border rounded px-2 py-1"
                  placeholder="منتج, تجارة, الكتروني"
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

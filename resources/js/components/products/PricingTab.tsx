// components/products/PricingTab.tsx
import React from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { PriceLevel } from '@/types/product';

interface PricingTabProps {
  priceLevels: PriceLevel[];
}

export default function PricingTab({ priceLevels }: PricingTabProps) {
  const { control, watch } = useFormContext();
  // نستخدم الـ prices الخاصة بالمتغير النشط حالياً – لكن في الموديل الكامل يمكن أن يكون هناك متغيرات متعددة،
  // لذلك سنعرض جدول الأسعار للمتغير الأول فقط (أو يمكننا إضافة قائمة منسدلة لاختيار المتغير).
  // للتبسيط، نفترض أن المتغير الأول هو الأساس.
  const variants = watch('variants') || [];
  const activeVariantIndex = 0; // يمكن جعلها قابلة للتغيير عبر Select

  if (variants.length === 0) {
    return <div className="text-center py-8 text-gray-500">أضف متغيراً أولاً لإدارة أسعاره.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">اختر المتغير:</label>
        <select className="border rounded px-2 py-1">
          {variants.map((v: any, idx: number) => (
            <option key={idx} value={idx}>{v.ref} - {v.variant_name || 'بدون اسم'}</option>
          ))}
        </select>
      </div>

      {/* جدول مستويات الأسعار لهذا المتغير */}
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2">مستوى السعر</th>
              <th className="px-4 py-2">السعر</th>
              <th className="px-4 py-2">صالح من</th>
              <th className="px-4 py-2">صالح إلى</th>
              <th className="px-4 py-2">نشط</th>
            </tr>
          </thead>
          <tbody>
            {priceLevels.map((pl, idx) => {
              const priceValue = watch(`variants.${activeVariantIndex}.prices.${idx}.price`);
              return (
                <tr key={pl.id}>
                  <td className="px-4 py-2">{pl.name}</td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      {...control.register(`variants.${activeVariantIndex}.prices.${idx}.price`)}
                      className="w-32 border rounded px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input type="date" {...control.register(`variants.${activeVariantIndex}.prices.${idx}.valid_from`)} className="border rounded px-2 py-1" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="date" {...control.register(`variants.${activeVariantIndex}.prices.${idx}.valid_to`)} className="border rounded px-2 py-1" />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <input type="checkbox" {...control.register(`variants.${activeVariantIndex}.prices.${idx}.active`)} className="h-4 w-4" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* سعر البيع الافتراضي للمتغير */}
      <div className="bg-gray-50 p-4 rounded-md">
        <label className="block text-sm font-medium">سعر البيع الافتراضي (HT) *</label>
        <input
          type="number"
          step="0.01"
          {...control.register(`variants.${activeVariantIndex}.default_selling_price_ht`)}
          className="mt-1 w-48 border rounded px-2 py-1"
        />
      </div>
    </div>
  );
}

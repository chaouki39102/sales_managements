import React from 'react';
import { useFieldArray, Control, Controller } from 'react-hook-form';
import { PriceLevel } from '@/types/product';

interface PriceLevelsTableProps {
  control: Control<any>;
  priceLevels: PriceLevel[];
  variantIndex?: number; // optional, defaults to 0
}

export default function PriceLevelsTable({ control, priceLevels, variantIndex = 0 }: PriceLevelsTableProps) {
  // استخدام field array لإدارة الأسعار (لأنها مصفوفة)
  const { fields } = useFieldArray({
    control,
    name: `variants.${variantIndex}.prices`,
  });

  // إذا لم تكن الأسعار محملة بعد، نعرض رسالة
  if (fields.length === 0) {
    return <div className="text-gray-500 text-sm">لا توجد مستويات أسعار متاحة</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border border-gray-200 rounded-md">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-right">مستوى السعر</th>
            <th className="px-3 py-2 text-right">السعر (دج)</th>
            <th className="px-3 py-2 text-right">صالح من</th>
            <th className="px-3 py-2 text-right">صالح إلى</th>
            <th className="px-3 py-2 text-center">نشط</th>
          </tr>
        </thead>
        <tbody>
          {priceLevels.map((level, idx) => (
            <tr key={level.id} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium">{level.name}</td>
              <td className="px-3 py-2">
                <Controller
                  name={`variants.${variantIndex}.prices.${idx}.price`}
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      step="0.01"
                      value={field.value ?? ''}
                      className="w-28 border rounded px-2 py-1"
                      placeholder="0.00"
                    />
                  )}
                />
              </td>
              <td className="px-3 py-2">
                <Controller
                  name={`variants.${variantIndex}.prices.${idx}.valid_from`}
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="date"
                      value={field.value ?? ''}
                      className="border rounded px-2 py-1 w-36"
                    />
                  )}
                />
              </td>
              <td className="px-3 py-2">
                <Controller
                  name={`variants.${variantIndex}.prices.${idx}.valid_to`}
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="date"
                      value={field.value ?? ''}
                      className="border rounded px-2 py-1 w-36"
                    />
                  )}
                />
              </td>
              <td className="px-3 py-2 text-center">
                <Controller
                  name={`variants.${variantIndex}.prices.${idx}.active`}
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      checked={field.value ?? true}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="h-4 w-4"
                    />
                  )}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

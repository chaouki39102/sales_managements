import React from 'react';
import { useFieldArray, Control, Controller } from 'react-hook-form';

interface QuantityDiscountsProps {
  control: Control<any>;
  variantIndex?: number;
}

export default function QuantityDiscounts({ control, variantIndex = 0 }: QuantityDiscountsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.quantity_discounts`,
  });

  const addDiscount = () => {
    append({
      min_quantity: 1,
      max_quantity: null,
      discount_percentage: null,
      discount_per_unit: null,
      tier_order: fields.length + 1,
      active: true,
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={addDiscount}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + إضافة تخفيض
        </button>
      </div>

      {fields.length === 0 && (
        <div className="text-gray-500 text-sm text-center py-4">لا توجد تخفيضات كمية. أضف تخفيضاً.</div>
      )}

      {fields.map((field, idx) => (
        <div key={field.id} className="border border-gray-200 rounded-md p-3 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-600">الكمية من</label>
              <Controller
                name={`variants.${variantIndex}.quantity_discounts.${idx}.min_quantity`}
                control={control}
                rules={{ required: 'مطلوب', min: 0 }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    step="1"
                    className="w-full border rounded px-2 py-1"
                    placeholder="1"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">الكمية إلى (اختياري)</label>
              <Controller
                name={`variants.${variantIndex}.quantity_discounts.${idx}.max_quantity`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min="0"
                    step="1"
                    value={field.value ?? ''}
                    className="w-full border rounded px-2 py-1"
                    placeholder="بدون حد أقصى"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">نسبة الخصم (%)</label>
              <Controller
                name={`variants.${variantIndex}.quantity_discounts.${idx}.discount_percentage`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={field.value ?? ''}
                    className="w-full border rounded px-2 py-1"
                    placeholder="مثال: 10"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">خصم ثابت (دج)</label>
              <Controller
                name={`variants.${variantIndex}.quantity_discounts.${idx}.discount_per_unit`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    step="0.01"
                    min="0"
                    value={field.value ?? ''}
                    className="w-full border rounded px-2 py-1"
                    placeholder="مثال: 50"
                  />
                )}
              />
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-red-600 text-sm hover:underline"
            >
              حذف التخفيض
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

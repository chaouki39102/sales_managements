// components/products/InventoryTab.tsx
import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { InventoryValuationMethod } from '@/types/product';

interface InventoryTabProps {
  valuationMethods: InventoryValuationMethod[];
}

export default function InventoryTab({ valuationMethods }: InventoryTabProps) {
  const { control, watch } = useFormContext();
  const variants = watch('variants') || [];
  const activeVariantIndex = 0; // يمكن تحسينها

  if (variants.length === 0) {
    return <div className="text-center py-8 text-gray-500">أضف متغيراً أولاً لإعدادات المخزون.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
        <span>إدارة المخزون</span>
        <Controller
          name={`variants.${activeVariantIndex}.manages_stock`}
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

      {watch(`variants.${activeVariantIndex}.manages_stock`) && (
        <>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
            <span>السماح بالمخزون السالب</span>
            <Controller
              name={`variants.${activeVariantIndex}.allow_negative_stock`}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label>الحد الأدنى للمخزون</label>
              <input type="number" step="1" {...control.register(`variants.${activeVariantIndex}.min_stock_alert`)} className="w-full border rounded px-2 py-1" />
            </div>
            <div>
              <label>الحد الأقصى للمخزون</label>
              <input type="number" step="1" {...control.register(`variants.${activeVariantIndex}.max_stock_alert`)} className="w-full border rounded px-2 py-1" />
            </div>
          </div>

          <div>
            <label>طريقة تقييم المخزون</label>
            <select {...control.register(`variants.${activeVariantIndex}.valuation_method_id`)} className="w-full border rounded px-2 py-1">
              <option value="">-- اختر --</option>
              {valuationMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

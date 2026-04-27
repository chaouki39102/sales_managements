// components/products/LotsTab.tsx
import React from 'react';
import { useFormContext, useFieldArray, Controller } from 'react-hook-form';
import { Warehouse } from '@/types/product';

interface LotsTabProps {
  warehouses: Warehouse[];
}

export default function LotsTab({ warehouses }: LotsTabProps) {
  const { control, watch } = useFormContext();
  const variants = watch('variants') || [];
  const activeVariantIndex = 0;

  if (variants.length === 0) {
    return <div className="text-center py-8 text-gray-500">أضف متغيراً أولاً لإدارة الحصص.</div>;
  }

  const hasLots = watch(`variants.${activeVariantIndex}.has_lots`);
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${activeVariantIndex}.lots`,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
        <span>تفعيل نظام الحصص (Lots)</span>
        <Controller
          name={`variants.${activeVariantIndex}.has_lots`}
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

      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md">
        <span>تفعيل تاريخ الصلاحية</span>
        <Controller
          name={`variants.${activeVariantIndex}.has_expiration_date`}
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

      {hasLots && (
        <>
          <div className="flex justify-between items-center">
            <h4 className="font-medium">الحصص (Lots)</h4>
            <button
              type="button"
              onClick={() => append({ lot_number: '', supplier_lot_number: '', warehouse_id: null, manufacturing_date: '', expiration_date: '', purchase_date: '', purchase_price: null, legal_selling_price: null, margin_percentage: null, original_quantity: 0, remaining_quantity: 0, active: true })}
              className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm"
            >
              + إضافة حصة
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full border">
              <thead className="bg-gray-50">
                <tr>
                  <th>رقم الحصة</th>
                  <th>رقم حصة المورد</th>
                  <th>المستودع</th>
                  <th>تاريخ الإنتاج</th>
                  <th>تاريخ الانتهاء</th>
                  <th>تاريخ الشراء</th>
                  <th>سعر الشراء</th>
                  <th>الكمية الأصلية</th>
                  <th>نشط</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, idx) => (
                  <tr key={field.id}>
                    <td><input {...control.register(`variants.${activeVariantIndex}.lots.${idx}.lot_number`)} className="w-32 border rounded px-1" /></td>
                    <td><input {...control.register(`variants.${activeVariantIndex}.lots.${idx}.supplier_lot_number`)} className="w-32 border rounded px-1" /></td>
                    <td>
                      <select {...control.register(`variants.${activeVariantIndex}.lots.${idx}.warehouse_id`)} className="w-36 border rounded px-1">
                        <option value="">-- اختر --</option>
                        {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </td>
                    <td><input type="date" {...control.register(`variants.${activeVariantIndex}.lots.${idx}.manufacturing_date`)} className="w-28 border rounded px-1" /></td>
                    <td><input type="date" {...control.register(`variants.${activeVariantIndex}.lots.${idx}.expiration_date`)} className="w-28 border rounded px-1" /></td>
                    <td><input type="date" {...control.register(`variants.${activeVariantIndex}.lots.${idx}.purchase_date`)} className="w-28 border rounded px-1" /></td>
                    <td><input type="number" step="0.01" {...control.register(`variants.${activeVariantIndex}.lots.${idx}.purchase_price`)} className="w-24 border rounded px-1" /></td>
                    <td><input type="number" step="1" {...control.register(`variants.${activeVariantIndex}.lots.${idx}.original_quantity`)} className="w-24 border rounded px-1" /></td>
                    <td className="text-center"><input type="checkbox" {...control.register(`variants.${activeVariantIndex}.lots.${idx}.active`)} /></td>
                    <td><button type="button" onClick={() => remove(idx)} className="text-red-600">حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

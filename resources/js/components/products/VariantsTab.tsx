// components/products/VariantsTab.tsx
import React, { useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Unit, TvaRate, PriceLevel, InventoryValuationMethod, Warehouse } from '@/types/product';
import VariantModal from './VariantModal';

interface VariantsTabProps {
  units: Unit[];
  tvaRates: TvaRate[];
  priceLevels: PriceLevel[];
  valuationMethods: InventoryValuationMethod[];
  warehouses: Warehouse[];
}

export default function VariantsTab({ units, tvaRates, priceLevels, valuationMethods, warehouses }: VariantsTabProps) {
  const { control, watch, setValue } = useFormContext();
  const { fields, append, remove, update } = useFieldArray({ control, name: 'variants' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleAddVariant = (data: any) => {
    if (editingIndex !== null) {
      update(editingIndex, data);
      setEditingIndex(null);
    } else {
      append(data);
    }
    setModalOpen(false);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setModalOpen(true);
  };

  const handleDelete = (index: number) => remove(index);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">المتغيرات</h3>
        <button
          type="button"
          onClick={() => { setEditingIndex(null); setModalOpen(true); }}
          className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
        >
          + إضافة متغير
        </button>
      </div>

      {/* جدول المتغيرات */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-right text-sm font-medium">المرجع</th>
              <th className="px-4 py-2 text-right text-sm font-medium">الاسم</th>
              <th className="px-4 py-2 text-right text-sm font-medium">سعر البيع الافتراضي</th>
              <th className="px-4 py-2 text-right text-sm font-medium">الوحدة</th>
              <th className="px-4 py-2 text-right text-sm font-medium">الضريبة</th>
              <th className="px-4 py-2 text-right text-sm font-medium">نشط</th>
              <th className="px-4 py-2 text-right text-sm font-medium">إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {fields.map((field, idx) => {
              const variant = watch(`variants.${idx}`);
              return (
                <tr key={field.id} className="border-t border-gray-200">
                  <td className="px-4 py-2">{variant.ref}</td>
                  <td className="px-4 py-2">{variant.variant_name || '—'}</td>
                  <td className="px-4 py-2">{variant.default_selling_price_ht} دج</td>
                  <td className="px-4 py-2">{units.find(u => u.id === variant.unit_id)?.name || '—'}</td>
                  <td className="px-4 py-2">{tvaRates.find(t => t.id === variant.tva_id)?.rate || '—'}%</td>
                  <td className="px-4 py-2">{variant.active ? 'نشط' : 'غير نشط'}</td>
                  <td className="px-4 py-2 space-x-2">
                    <button type="button" onClick={() => handleEdit(idx)} className="text-blue-600 hover:underline">تعديل</button>
                    <button type="button" onClick={() => handleDelete(idx)} className="text-red-600 hover:underline">حذف</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {fields.length === 0 && (
          <div className="text-center py-8 text-gray-500">لا توجد متغيرات. أضف متغيراً أولاً.</div>
        )}
      </div>

      {/* نافذة إضافة/تعديل المتغير */}
      <VariantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleAddVariant}
        initialVariant={editingIndex !== null ? watch(`variants.${editingIndex}`) : null}
        units={units}
        tvaRates={tvaRates}
        priceLevels={priceLevels}
        valuationMethods={valuationMethods}
        warehouses={warehouses}
      />
    </div>
  );
}

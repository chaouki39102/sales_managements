// components/products/VariantModal.tsx
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Unit, TvaRate, PriceLevel, InventoryValuationMethod, Warehouse } from '@/types/product';
import PriceLevelsTable from './PriceLevelsTable';
import QuantityDiscounts from './QuantityDiscounts';

const variantFormSchema = z.object({
  ref: z.string().min(1, 'المرجع مطلوب'),
  barcode: z.string().nullable().optional(),
  variant_name: z.string().nullable().optional(),
  unit_id: z.number().nullable(),
  tva_id: z.number().nullable(),
  weight: z.number().nullable().optional(),
  volume: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  variant_attributes: z.record(z.string()).nullable().optional(),
  default_selling_price_ht: z.number().min(0, 'سعر البيع مطلوب'),
  last_purchase_price: z.number().nullable().optional(),
  average_cost_price: z.number().nullable().optional(),
  manages_stock: z.boolean().default(true),
  allow_negative_stock: z.boolean().default(false),
  has_lots: z.boolean().default(false),
  has_expiration_date: z.boolean().default(false),
  min_stock_alert: z.number().nullable().optional(),
  max_stock_alert: z.number().nullable().optional(),
  manages_quantity_discounts: z.boolean().default(false),
  valuation_method_id: z.number().nullable().optional(),
  active: z.boolean().default(true),
  prices: z.array(z.object({
    price_level_id: z.number(),
    price: z.number().nullable(),
    valid_from: z.string().nullable().optional(),
    valid_to: z.string().nullable().optional(),
    active: z.boolean().default(true),
  })).default([]),
  quantity_discounts: z.array(z.object({
    min_quantity: z.number(),
    max_quantity: z.number().nullable().optional(),
    discount_percentage: z.number().nullable().optional(),
    discount_per_unit: z.number().nullable().optional(),
    tier_order: z.number(),
    active: z.boolean().default(true),
  })).default([]),
});

type VariantFormData = z.infer<typeof variantFormSchema>;

interface VariantModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: VariantFormData) => void;
  initialVariant?: VariantFormData | null;
  units: Unit[];
  tvaRates: TvaRate[];
  priceLevels: PriceLevel[];
  valuationMethods: InventoryValuationMethod[];
  warehouses: Warehouse[];
}

export default function VariantModal({ open, onClose, onSave, initialVariant, units, tvaRates, priceLevels, valuationMethods }: VariantModalProps) {
  const { control, handleSubmit, reset, watch, setValue } = useForm<VariantFormData>({
    resolver: zodResolver(variantFormSchema),
    defaultValues: {
      ref: '', variant_name: '', barcode: '', unit_id: null, tva_id: null,
      weight: null, volume: null, length: null, width: null, height: null,
      variant_attributes: {},
      default_selling_price_ht: 0,
      last_purchase_price: null, average_cost_price: null,
      manages_stock: true, allow_negative_stock: false, has_lots: false, has_expiration_date: false,
      min_stock_alert: null, max_stock_alert: null,
      manages_quantity_discounts: false, valuation_method_id: null, active: true,
      prices: priceLevels.map(pl => ({ price_level_id: pl.id, price: null, active: true })),
      quantity_discounts: [],
    },
  });

  useEffect(() => {
    if (initialVariant) {
      reset(initialVariant);
    } else {
      reset({
        ref: '', variant_name: '', barcode: '', unit_id: null, tva_id: null,
        weight: null, volume: null, length: null, width: null, height: null,
        variant_attributes: {},
        default_selling_price_ht: 0,
        last_purchase_price: null, average_cost_price: null,
        manages_stock: true, allow_negative_stock: false, has_lots: false, has_expiration_date: false,
        min_stock_alert: null, max_stock_alert: null,
        manages_quantity_discounts: false, valuation_method_id: null, active: true,
        prices: priceLevels.map(pl => ({ price_level_id: pl.id, price: null, active: true })),
        quantity_discounts: [],
      });
    }
  }, [initialVariant, priceLevels, reset]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">{initialVariant ? 'تعديل متغير' : 'إضافة متغير جديد'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-6">
          {/* المعلومات الأساسية للمتغير */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label>المرجع (SKU) *</label>
              <Controller name="ref" control={control} render={({ field }) => <input {...field} className="w-full border rounded px-2 py-1" />} />
            </div>
            <div>
              <label>الباركود</label>
              <Controller name="barcode" control={control} render={({ field }) => <input {...field} className="w-full border rounded px-2 py-1" />} />
            </div>
            <div>
              <label>اسم المتغير</label>
              <Controller name="variant_name" control={control} render={({ field }) => <input {...field} className="w-full border rounded px-2 py-1" />} />
            </div>
            <div>
              <label>الوحدة</label>
              <Controller name="unit_id" control={control} render={({ field }) => (
                <select {...field} value={field.value ?? ''} className="w-full border rounded px-2 py-1">
                  <option value="">-- اختر --</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                </select>
              )} />
            </div>
            <div>
              <label>معدل الضريبة</label>
              <Controller name="tva_id" control={control} render={({ field }) => (
                <select {...field} value={field.value ?? ''} className="w-full border rounded px-2 py-1">
                  <option value="">-- اختر --</option>
                  {tvaRates.map(t => <option key={t.id} value={t.id}>{t.rate}%</option>)}
                </select>
              )} />
            </div>
            <div>
              <label>طريقة تقييم المخزون</label>
              <Controller name="valuation_method_id" control={control} render={({ field }) => (
                <select {...field} value={field.value ?? ''} className="w-full border rounded px-2 py-1">
                  <option value="">-- اختر --</option>
                  {valuationMethods.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              )} />
            </div>
          </div>

          {/* الأبعاد والوزن */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">الأبعاد والوزن</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div><label>الوزن (كغ)</label><Controller name="weight" control={control} render={({ field }) => <input type="number" step="0.001" {...field} className="w-full border rounded px-2 py-1" />} /></div>
              <div><label>الحجم (م³)</label><Controller name="volume" control={control} render={({ field }) => <input type="number" step="0.001" {...field} className="w-full border rounded px-2 py-1" />} /></div>
              <div><label>الطول (سم)</label><Controller name="length" control={control} render={({ field }) => <input type="number" step="0.1" {...field} className="w-full border rounded px-2 py-1" />} /></div>
              <div><label>العرض (سم)</label><Controller name="width" control={control} render={({ field }) => <input type="number" step="0.1" {...field} className="w-full border rounded px-2 py-1" />} /></div>
              <div><label>الارتفاع (سم)</label><Controller name="height" control={control} render={({ field }) => <input type="number" step="0.1" {...field} className="w-full border rounded px-2 py-1" />} /></div>
            </div>
          </div>

          {/* السمات الديناميكية (مبسطة: JSON editor) */}
          <div>
            <h4 className="font-medium mb-2">السمات (لون، مقاس، ...)</h4>
            <Controller name="variant_attributes" control={control} render={({ field }) => (
              <textarea
                {...field}
                value={JSON.stringify(field.value || {}, null, 2)}
                onChange={e => field.onChange(JSON.parse(e.target.value || '{}'))}
                className="w-full border rounded px-2 py-1 font-mono text-sm"
                rows={3}
                placeholder='{"اللون": "أحمر", "المقاس": "XL"}'
              />
            )} />
          </div>

          {/* مستويات الأسعار */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">مستويات الأسعار</h4>
            <PriceLevelsTable control={control} priceLevels={priceLevels} />
          </div>

          {/* تخفيضات الكميات */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">تخفيضات الكميات</h4>
              <Controller name="manages_quantity_discounts" control={control} render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${field.value ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${field.value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              )} />
            </div>
            {watch('manages_quantity_discounts') && (
              <div className="mt-2">
                <QuantityDiscounts control={control} />
              </div>
            )}
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-md hover:bg-gray-50">إلغاء</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">حفظ المتغير</button>
          </div>
        </form>
      </div>
    </div>
  );
}

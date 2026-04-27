// components/products/ProductForm.tsx
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // استخدم مكتبة radix-ui أو نفّذ تبويبات بسيطة
import BasicInfoTab from './BasicInfoTab';
import VariantsTab from './VariantsTab';
import PricingTab from './PricingTab';
import InventoryTab from './InventoryTab';
import LotsTab from './LotsTab';
import SpecsSeoTab from './SpecsSeoTab';
import { Product, ProductInput, Family, Brand, ProductType, Unit, TvaRate, PriceLevel, InventoryValuationMethod, Warehouse } from '@/types/product';
import { productService } from '@/services/productService';
import { useQuery } from '@tanstack/react-query';

// مخطط Zod للتحقق من صحة النموذج (مبسط، يمكن توسيعه)
const variantPriceSchema = z.object({
  price_level_id: z.number(),
  price: z.number().nullable(),
  valid_from: z.string().nullable().optional(),
  valid_to: z.string().nullable().optional(),
  active: z.boolean().default(true),
});

const quantityDiscountSchema = z.object({
  min_quantity: z.number().min(0),
  max_quantity: z.number().nullable().optional(),
  discount_percentage: z.number().nullable().optional(),
  discount_per_unit: z.number().nullable().optional(),
  tier_order: z.number(),
  active: z.boolean().default(true),
});

const productLotSchema = z.object({
  lot_number: z.string().min(1),
  supplier_lot_number: z.string().nullable().optional(),
  warehouse_id: z.number().nullable(),
  manufacturing_date: z.string().nullable().optional(),
  expiration_date: z.string().nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  purchase_price: z.number().nullable(),
  legal_selling_price: z.number().nullable().optional(),
  margin_percentage: z.number().nullable().optional(),
  original_quantity: z.number().min(0),
  remaining_quantity: z.number().optional(),
  active: z.boolean().default(true),
});

const variantSchema = z.object({
  id: z.number().optional(),
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
  default_selling_price_ht: z.number().min(0),
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
  prices: z.array(variantPriceSchema).default([]),
  quantity_discounts: z.array(quantityDiscountSchema).default([]),
  lots: z.array(productLotSchema).optional(),
});

const productSchema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  slug: z.string().optional(),
  description: z.string().nullable().optional(),
  family_id: z.number().nullable().optional(),
  brand_id: z.number().nullable().optional(),
  product_type_id: z.number().nullable().optional(),
  specifications: z.record(z.string()).nullable().optional(),
  images: z.array(z.string()).nullable().optional(),
  meta_title: z.string().nullable().optional(),
  meta_description: z.string().nullable().optional(),
  meta_keywords: z.array(z.string()).nullable().optional(),
  active: z.boolean().default(true),
  variants: z.array(variantSchema).min(1, 'يجب إضافة متغير واحد على الأقل'),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  initialProduct?: Product | null;
  onSubmit: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ProductForm({ initialProduct, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const [activeTab, setActiveTab] = useState('basic');

  // جلب البيانات المساعدة
  const { data: families = [] } = useQuery({ queryKey: ['families'], queryFn: productService.getFamilies, staleTime: Infinity });
  const { data: brands = [] } = useQuery({ queryKey: ['brands'], queryFn: productService.getBrands, staleTime: Infinity });
  const { data: productTypes = [] } = useQuery({ queryKey: ['product-types'], queryFn: productService.getProductTypes, staleTime: Infinity });
  const { data: units = [] } = useQuery({ queryKey: ['units'], queryFn: productService.getUnits, staleTime: Infinity });
  const { data: tvaRates = [] } = useQuery({ queryKey: ['tvas'], queryFn: productService.getTvaRates, staleTime: Infinity });
  const { data: priceLevels = [] } = useQuery({ queryKey: ['price-levels'], queryFn: productService.getPriceLevels, staleTime: Infinity });
  const { data: valuationMethods = [] } = useQuery({ queryKey: ['valuation-methods'], queryFn: productService.getValuationMethods, staleTime: Infinity });
  const { data: warehouses = [] } = useQuery({ queryKey: ['warehouses'], queryFn: productService.getWarehouses, staleTime: Infinity });

  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      active: true,
      variants: [],
      images: [],
      specifications: {},
      meta_keywords: [],
    },
  });

  // ملء النموذج عند التعديل
  useEffect(() => {
    if (initialProduct) {
      methods.reset({
        name: initialProduct.name,
        slug: initialProduct.slug,
        description: initialProduct.description ?? '',
        family_id: initialProduct.family_id ?? undefined,
        brand_id: initialProduct.brand_id ?? undefined,
        product_type_id: initialProduct.product_type_id ?? undefined,
        specifications: initialProduct.specifications ?? {},
        images: initialProduct.images ?? [],
        meta_title: initialProduct.meta_title ?? '',
        meta_description: initialProduct.meta_description ?? '',
        meta_keywords: initialProduct.meta_keywords ?? [],
        active: initialProduct.active,
        variants: initialProduct.variants?.map(v => ({
          ...v,
          unit_id: v.unit_id ?? null,
          tva_id: v.tva_id ?? null,
          weight: v.weight ?? null,
          volume: v.volume ?? null,
          length: v.length ?? null,
          width: v.width ?? null,
          height: v.height ?? null,
          variant_attributes: v.variant_attributes ?? {},
          default_selling_price_ht: v.default_selling_price_ht,
          last_purchase_price: v.last_purchase_price ?? null,
          average_cost_price: v.average_cost_price ?? null,
          manages_stock: v.manages_stock ?? true,
          allow_negative_stock: v.allow_negative_stock ?? false,
          has_lots: v.has_lots ?? false,
          has_expiration_date: v.has_expiration_date ?? false,
          min_stock_alert: v.min_stock_alert ?? null,
          max_stock_alert: v.max_stock_alert ?? null,
          manages_quantity_discounts: v.manages_quantity_discounts ?? false,
          valuation_method_id: v.valuation_method_id ?? null,
          active: v.active,
          prices: v.prices?.map(p => ({ ...p, price: p.price ?? null })) ?? [],
          quantity_discounts: v.quantity_discounts ?? [],
          lots: v.lots ?? [],
        })) ?? [],
      });
    }
  }, [initialProduct, methods]);

  const handleSubmit = methods.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit} className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-sm" dir="rtl">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="flex flex-wrap gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-t-lg">
              <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
              <TabsTrigger value="variants">المتغيرات</TabsTrigger>
              <TabsTrigger value="pricing">التسعير</TabsTrigger>
              <TabsTrigger value="inventory">المخزون</TabsTrigger>
              <TabsTrigger value="lots">الحصص والتتبع</TabsTrigger>
              <TabsTrigger value="seo">السيو والمواصفات</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <TabsContent value="basic">
            <BasicInfoTab families={families} brands={brands} productTypes={productTypes} />
          </TabsContent>
          <TabsContent value="variants">
            <VariantsTab units={units} tvaRates={tvaRates} priceLevels={priceLevels} valuationMethods={valuationMethods} warehouses={warehouses} />
          </TabsContent>
          <TabsContent value="pricing">
            <PricingTab priceLevels={priceLevels} />
          </TabsContent>
          <TabsContent value="inventory">
            <InventoryTab valuationMethods={valuationMethods} />
          </TabsContent>
          <TabsContent value="lots">
            <LotsTab warehouses={warehouses} />
          </TabsContent>
          <TabsContent value="seo">
            <SpecsSeoTab />
          </TabsContent>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            إلغاء
          </button>
          <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {isLoading ? 'جارٍ الحفظ...' : (initialProduct ? 'تحديث المنتج' : 'إضافة المنتج')}
          </button>
        </div>
      </form>
    </FormProvider>
  );
}

// pages/portal/orders/catalogPricing.ts
// Pure catalog pricing / packaging / discount helpers (mirror the server-side rules).
import type { PortalCatalogItem, PortalCatalogPackaging, PortalCatalogDiscount } from '@/lib/api/portal/portal';

export const cartKey = (productId: number, packagingId: number | null) =>
  `${productId}:${packagingId ?? 0}`;

// السعر الفعلي لوحدة الطلب (وحدة أساسية أو تعبئة مختارة)
export const unitPriceFor = (product: PortalCatalogItem, packagingId: number | null): number => {
  if (packagingId) {
    const pk = product.packagings?.find((x) => x.id === packagingId);
    return pk ? pk.pack_price_ht : product.unit_price_ht;
  }
  return product.unit_price_ht;
};

export const packFactorFor = (product: PortalCatalogItem, packagingId: number | null): number => {
  if (packagingId) {
    const pk = product.packagings?.find((x) => x.id === packagingId);
    return pk ? pk.quantity : 1;
  }
  return 1;
};

// الوحدة الافتراضية للمنتج — تُعرض دائماً (symbol ← name ← «وحدة»).
export const unitOf = (product: PortalCatalogItem): string =>
  product.unit ? (product.unit.symbol || product.unit.name || 'وحدة') : 'وحدة';

// وحدة العرض حسب التعبئة المختارة: التعبئة لها اسمها الخاص (مثل «كوليسة»)،
// وإلا تُعرض الوحدة الأساسية للمنتج.
export const unitLabelFor = (product: PortalCatalogItem, packagingId: number | null): string => {
  if (packagingId) {
    const pk = product.packagings?.find((x) => x.id === packagingId);
    if (pk && (pk.label || pk.code)) return pk.label || (pk.code as string) || '';
  }
  return unitOf(product);
};

// التعبئة الافتراضية — تعكس تماماً Product::defaultPackaging() في الخادم:
// is_default أولاً، وإلا أصغر كمية. الخادم يطبّقها تلقائياً عند إرسال طلب
// دون packaging_id، لذلك يجب أن تُعرض مسبقاً في الكتالوج ليُطابق السعر المعروض.
export const defaultPackagingFor = (product: PortalCatalogItem): PortalCatalogPackaging | null => {
  if (!product.packagings?.length) return null;
  return (
    product.packagings.find((x) => x.is_default) ??
    product.packagings.reduce((a, b) => (b.quantity < a.quantity ? b : a))
  );
};

// شريحة الخصم المطبَّقة لكمية معينة — تعكس تماماً applicableDiscount في الخادم:
// الشريحة النشطة ذات min_qty الأعلى التي تقع الكمية ضمن نطاقها (بالوحدات الأساسية).
export const discountTierFor = (product: PortalCatalogItem, baseQty: number): PortalCatalogDiscount | null => {
  if (!product.manages_quantity_discounts || !product.discounts?.length || baseQty <= 0) return null;
  let best: PortalCatalogDiscount | null = null;
  for (const d of product.discounts) {
    if (baseQty < d.min_qty) continue;
    if (d.max_qty !== null && d.max_qty !== undefined && baseQty > d.max_qty) continue;
    if (!best || d.min_qty > best.min_qty) best = d;
  }
  return best;
};

export const discountLabel = (d: PortalCatalogDiscount): string =>
  d.discount_amount !== null && d.discount_amount > 0
    ? `خصم ${d.discount_amount} دج/وحدة`
    : `خصم ${d.discount_percentage}%`;

export const tierHint = (d: PortalCatalogDiscount): string => {
  const to = d.max_qty !== null && d.max_qty !== undefined ? d.max_qty : null;
  return to !== null && to > d.min_qty ? `${d.min_qty}–${to}` : `من ${d.min_qty}`;
};

// Tabs and pricing-method constants for ProductModal

export const TABS = [
  { id: 'basic',      label: 'الأساسيات', icon: 'ti-info-circle' },
  { id: 'barcodes',   label: 'الباركودات', icon: 'ti-barcode' },
  { id: 'pricing',    label: 'الأسعار',   icon: 'ti-tag' },
  { id: 'packagings', label: 'التعبئة',   icon: 'ti-package' },
  { id: 'stock',      label: 'المخزون',   icon: 'ti-building-warehouse' },
  { id: 'discounts',  label: 'الخصومات',  icon: 'ti-discount' },
  { id: 'dimensions', label: 'الأبعاد',   icon: 'ti-ruler' },
  { id: 'images',     label: 'الصور',     icon: 'ti-photo' },
  { id: 'seo',        label: 'SEO',       icon: 'ti-world' },
] as const;

export type TabId = typeof TABS[number]['id'];
export const TAB_IDS: TabId[] = TABS.map(t => t.id);

export const PRICING_METHODS = [
  { value: 'fixed',  label: 'سعر ثابت',        icon: 'ti-cash',        hint: 'Prix de vente HT مباشرة بالدج' },
  { value: 'rate',   label: 'نسبة فوق الشراء', icon: 'ti-percentage',  hint: 'نسبة % تُضاف على سعر الشراء' },
  { value: 'margin', label: 'هامش ثابت',        icon: 'ti-trending-up', hint: 'مبلغ ثابت بالدج يُضاف للشراء' },
] as const;

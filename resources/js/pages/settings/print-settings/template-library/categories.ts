import type { TemplateCategory } from './types';

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  { id: 'invoices',        name: 'Invoices',                nameAr: 'الفواتير',               icon: 'ti-file-invoice' },
  { id: 'delivery-notes',  name: 'Delivery Notes',          nameAr: 'وصل تسليم',              icon: 'ti-truck-delivery' },
  { id: 'receipts',        name: 'Receipts',                nameAr: 'إيصالات',                icon: 'ti-receipt' },
  { id: 'quotes',          name: 'Quotations',              nameAr: 'عروض الأسعار',           icon: 'ti-file-description' },
  { id: 'purchase',        name: 'Purchase Orders',         nameAr: 'أوامر الشراء',           icon: 'ti-shopping-cart' },
  { id: 'pos',             name: 'POS Receipts',            nameAr: 'إيصالات نقاط البيع',     icon: 'ti-device-analytics' },
  { id: 'warehouse',       name: 'Warehouse',               nameAr: 'المستودعات',             icon: 'ti-building-warehouse' },
  { id: 'inventory',       name: 'Inventory',               nameAr: 'الجرد',                  icon: 'ti-packages' },
  { id: 'thermal',         name: 'Thermal Printers',        nameAr: 'طابعات حرارية',          icon: 'ti-printer' },
];

export const ALL_TAGS = [
  'algeria', 'arabic', 'fiscal', 'official', 'tva',
  'qrcode', 'barcode', 'signature', 'stamp',
  'a4', 'a5', '80mm', '58mm',
  'invoice', 'delivery', 'receipt',
] as const;

export type TagSlug = typeof ALL_TAGS[number];

export function categoryFromDocType(docType: string): string {
  const map: Record<string, string> = {
    FV:   'invoices',
    BL:   'delivery-notes',
    DEV:  'quotes',
    BCC:  'quotes',
    AA:   'receipts',
    FA:   'purchase',
    BR:   'purchase',
    AV:   'purchase',
    DDP:  'warehouse',
    BT:   'warehouse',
    POS:  'pos',
    RPT:  'pos',
    STK:  'product',
  };
  return map[docType] ?? 'invoices';
}

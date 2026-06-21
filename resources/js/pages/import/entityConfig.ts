export interface ImportField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'relation';
  required?: boolean;
  hint?: string;
}

export interface EntityConfig {
  label: string;
  labelPlural: string;
  fields: ImportField[];
  previewEndpoint: string;
  executeEndpoint: string;
  successMessage: (count: number) => string;
}

export const PRODUCT_IMPORT_CONFIG: EntityConfig = {
  label: 'منتج',
  labelPlural: 'منتجات',
  previewEndpoint: '/import/products/preview',
  executeEndpoint: '/import/products/execute',
  successMessage: (n: number) => `تم استيراد ${n} منتج بنجاح`,
  fields: [
    { key: 'name',              label: 'اسم المنتج',            type: 'string',   required: true },
    { key: 'ref',               label: 'المرجع',                type: 'string' },
    { key: 'barcode',           label: 'الباركود',              type: 'string' },
    { key: 'description',       label: 'الوصف',                 type: 'string' },
    { key: 'family',            label: 'الفئة',                 type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'brand',             label: 'الماركة',               type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'tva',               label: 'نسبة الضريبة',          type: 'string',   hint: 'رقم أو اسم' },
    { key: 'unit',              label: 'الوحدة',                type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'purchase_price_ht', label: 'سعر الشراء',            type: 'number' },
    { key: 'selling_price',     label: 'سعر البيع',             type: 'number' },
    { key: 'manages_stock',     label: 'يدير المخزون',          type: 'boolean',  hint: 'نعم/لا' },
    { key: 'min_stock_alert',   label: 'التنبيه عند النفاد',     type: 'number' },
    { key: 'active',            label: 'نشط',                   type: 'boolean',  hint: 'نعم/لا' },
  ],
};

export const PARTY_IMPORT_CONFIG: EntityConfig = {
  label: 'طرف',
  labelPlural: 'أطراف',
  previewEndpoint: '/import/parties/preview',
  executeEndpoint: '/import/parties/execute',
  successMessage: (n: number) => `تم استيراد ${n} طرف بنجاح`,
  fields: [
    { key: 'name',              label: 'الاسم',                 type: 'string',   required: true },
    { key: 'party_type',        label: 'النوع (زبون/مورد/كلاهما)', type: 'string', required: true },
    { key: 'code',              label: 'الكود',                 type: 'string' },
    { key: 'commercial_name',   label: 'الاسم التجاري',         type: 'string' },
    { key: 'activity',          label: 'النشاط',                type: 'string' },
    { key: 'phone',             label: 'الهاتف',                type: 'string' },
    { key: 'mobile',            label: 'الجوال',                type: 'string' },
    { key: 'fax',               label: 'الفاكس',                type: 'string' },
    { key: 'email',             label: 'البريد الإلكتروني',     type: 'string' },
    { key: 'address',           label: 'العنوان',               type: 'string' },
    { key: 'nif',               label: 'الرقم الجبائي',         type: 'string' },
    { key: 'rc',                label: 'السجل التجاري',         type: 'string' },
    { key: 'nis',               label: 'الرقم الإحصائي',        type: 'string' },
    { key: 'ai',                label: 'المادة رقم',            type: 'string' },
    { key: 'rc_date',           label: 'تاريخ السجل التجاري',   type: 'string',   hint: 'YYYY-MM-DD' },
    { key: 'legal_form',        label: 'الشكل القانوني',        type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'capital_amount',    label: 'رأس المال',            type: 'number' },
    { key: 'wilaya',            label: 'الولاية',               type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'commune',           label: 'البلدية',               type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'price_level',       label: 'فئة السعر',            type: 'string',   hint: 'تطابق حسب الاسم' },
    { key: 'bank_name',         label: 'اسم البنك',            type: 'string' },
    { key: 'rib',               label: 'رقم الحساب البنكي',     type: 'string' },
    { key: 'credit_days',       label: 'مدة الائتمان (أيام)',   type: 'number' },
    { key: 'credit_limit',      label: 'حد الائتمان',           type: 'number' },
    { key: 'is_tva_exempt',     label: 'معفى من الضريبة',       type: 'boolean',  hint: 'نعم/لا' },
    { key: 'is_taxable',        label: 'خاضع للضريبة',          type: 'boolean',  hint: 'نعم/لا' },
    { key: 'tax_regime',        label: 'النظام الضريبي',        type: 'string',   hint: 'forfaitaire/reel' },
    { key: 'cnas_number',       label: 'رقم CNAS',              type: 'string' },
    { key: 'is_final_consumer', label: 'مستهلك نهائي',          type: 'boolean',  hint: 'نعم/لا' },
    { key: 'active',            label: 'نشط',                   type: 'boolean',  hint: 'نعم/لا' },
  ],
};

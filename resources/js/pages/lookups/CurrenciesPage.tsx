// ════════════════════════════════════════════════
// resources/js/pages/lookups/CurrenciesPage.tsx
// DB: id, name, code, symbol, decimal_places, is_base_currency, active
// ❌ كان: is_default  ✅ الصحيح: is_base_currency
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function CurrenciesPage() {
  return (
    <LookupPage
      title="العملات"
      resource="عملة"
      endpoint="/currencies"
      icon="ti-currency-dollar"
      color="var(--gold)"
      fields={[
        { key: 'name',             label: 'اسم العملة',     required: true, placeholder: 'مثال: دينار جزائري' },
        { key: 'code',             label: 'الرمز الدولي ISO', required: true, placeholder: 'مثال: DZD'         },
        { key: 'symbol',           label: 'الإشارة',                          placeholder: 'مثال: دج'           },
        { key: 'decimal_places',   label: 'المنازل العشرية', type: 'number',  placeholder: '2'                  },
        { key: 'is_base_currency', label: 'عملة أساسية',    type: 'select',  badge: true,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },
        { key: 'active',           label: 'نشط',            type: 'select',  badge: true, showInTable: false,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },
      ]}
    />
  );
}
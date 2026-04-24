// ════════════════════════════════════════════════
// resources/js/pages/lookups/TvasPage.tsx
// معدلات TVA الجزائرية: 0%, 9%, 19%
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function TvasPage() {
  return (
    <LookupPage
      title="معدلات TVA"
      resource="معدل TVA"
      endpoint="/tvas"
      icon="ti-calculator"
      color="var(--orange)"
      emptyText="لا توجد معدلات TVA مضافة — أضف 0%, 9%, 19%"
      fields={[
        { key: 'name',       label: 'الاسم',          required: true,  placeholder: 'مثال: TVA 19%'        },
        { key: 'rate',       label: 'المعدل (%)',      required: true,  type: 'number', placeholder: '19'  },
        { key: 'is_default', label: 'افتراضي',
          type: 'select',
          badge: true,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }],
        },
        { key: 'description', label: 'الوصف',   type: 'textarea', showInTable: false },
      ]}
    />
  );
}

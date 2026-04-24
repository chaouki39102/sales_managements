// ════════════════════════════════════════════════
// resources/js/pages/lookups/PriceLevelsPage.tsx
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function PriceLevelsPage() {
  return (
    <LookupPage
      title="مستويات الأسعار"
      resource="مستوى"
      endpoint="/price-levels"
      icon="ti-tag"
      color="var(--gold)"
      fields={[
        { key: 'name',             label: 'الاسم',             required: true,  placeholder: 'مثال: الجملة'    },
        { key: 'discount_percent', label: 'نسبة الخصم (%)',    type: 'number',  placeholder: 'مثال: 10'         },
        { key: 'description',      label: 'الوصف',             type: 'textarea', showInTable: false              },
      ]}
    />
  );
}

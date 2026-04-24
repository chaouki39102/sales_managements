// ════════════════════════════════════════════════
// resources/js/pages/lookups/UnitsPage.tsx
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function UnitsPage() {
  return (
    <LookupPage
      title="وحدات القياس"
      resource="وحدة"
      endpoint="/units"
      icon="ti-ruler"
      color="var(--purple)"
      fields={[
        { key: 'name',         label: 'الاسم',         required: true,  placeholder: 'مثال: كيلوغرام' },
        { key: 'abbreviation', label: 'الاختصار',      required: true,  placeholder: 'مثال: كغ'        },
        { key: 'description',  label: 'الوصف',         showInTable: false, type: 'textarea', placeholder: 'وصف اختياري' },
      ]}
    />
  );
}
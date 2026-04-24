// ════════════════════════════════════════════════
// resources/js/pages/lookups/BrandsPage.tsx
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function BrandsPage() {
  return (
    <LookupPage
      title="العلامات التجارية"
      resource="علامة"
      endpoint="/brands"
      icon="ti-award"
      color="var(--blue)"
      fields={[
        { key: 'name',        label: 'اسم العلامة', required: true, placeholder: 'مثال: سامسونغ'  },
        { key: 'description', label: 'الوصف',        type: 'textarea', showInTable: false,
          placeholder: 'وصف اختياري' },
      ]}
    />
  );
}

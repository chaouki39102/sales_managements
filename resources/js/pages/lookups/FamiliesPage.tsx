// ════════════════════════════════════════════════
// resources/js/pages/lookups/FamiliesPage.tsx
// ✅ v3: parent_id كـ remote-select من /families
// ════════════════════════════════════════════════
import LookupPage from './LookupPage';

export default function FamiliesPage() {
  return (
    <LookupPage
      title="فئات المنتجات"
      resource="فئة"
      endpoint="/families"
      icon="ti-folder-open"
      color="var(--purple)"
      fields={[
        { key: 'name',
          label: 'اسم الفئة',
          required: true,
          placeholder: 'مثال: أغذية ومشروبات' },

        // ✅ parent_id: remote-select من نفس الـ endpoint
        { key: 'parent_id',
          label: 'الفئة الأم',
          type: 'remote-select',
          remoteEndpoint: '/families',
          remoteLabel: 'name',
          remoteValue: 'id',
          remotePlaceholder: '— فئة رئيسية (بدون أم) —',
          // في الجدول نعرض اسم الفئة الأم بدل الـ id
          showInTable: true },

        { key: 'active',
          label: 'نشط',
          type: 'select',
          badge: true,
          options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },

        { key: 'display_order',
          label: 'ترتيب العرض',
          type: 'number',
          showInTable: false,
          placeholder: '0' },

        { key: 'description',
          label: 'الوصف',
          type: 'textarea',
          showInTable: false },
      ]}
    />
  );
}

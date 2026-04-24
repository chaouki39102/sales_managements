// ════════════════════════════════════════════════
// resources/js/pages/lookups/WarehousesPage.tsx
// v4: cascade wilaya → commune
// ════════════════════════════════════════════════
import LookupPage, { FieldDef } from './LookupPage';

const fields: FieldDef[] = [
  { key: 'name',
    label: 'اسم المستودع',
    required: true,
    placeholder: 'مثال: المستودع الرئيسي' },

  { key: 'code',
    label: 'الرمز',
    placeholder: 'مثال: WH-01' },

  { key: 'manager_name',
    label: 'اسم المسؤول',
    placeholder: 'مثال: محمد بن علي' },

  { key: 'phone',
    label: 'الهاتف',
    placeholder: 'مثال: 0555 123 456' },

  // ── الولاية (الأب في الـ cascade) ──────────────
  { key: 'wilaya_id',
    label: 'الولاية',
    type: 'remote-select',
    remoteEndpoint: '/wilayas',
    remoteLabel: 'arabic_name',   // arabic_name أوضح للمستخدم
    remoteValue: 'id',
    remotePlaceholder: '— اختر الولاية —',
    showInTable: true },

  // ── البلدية (الابن في الـ cascade) ─────────────
  { key: 'commune_id',
    label: 'البلدية',
    type: 'remote-select',
    remoteEndpoint: '/communes',
    remoteLabel: 'arabic_name',
    remoteValue: 'id',
    remotePlaceholder: '— اختر الولاية أولاً —',
    // cascade: تُصفَّى حسب wilaya_id المختارة
    cascadeParent: 'wilaya_id',
    // الـ param المُرسَل للـ API: GET /communes?filter[wilaya_id]=5
    cascadeParam: 'filter[wilaya_id]',
    showInTable: false },

  { key: 'rc',
    label: 'السجل التجاري RC',
    placeholder: 'مثال: 25/00-1234567',
    showInTable: false },

  { key: 'nif',
    label: 'رقم التعريف الجبائي NIF',
    placeholder: '15 رقماً',
    showInTable: false },

  { key: 'nis',
    label: 'رقم التعريف الإحصائي NIS',
    placeholder: 'اختياري',
    showInTable: false },

  { key: 'ai',
    label: 'رقم المادة AI',
    placeholder: 'اختياري',
    showInTable: false },

  { key: 'active',
    label: 'نشط',
    type: 'select',
    badge: true,
    options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },

  { key: 'address',
    label: 'العنوان التفصيلي',
    type: 'textarea',
    showInTable: false },
];

export default function WarehousesPage() {
  return (
    <LookupPage
      title="المستودعات"
      resource="مستودع"
      endpoint="/warehouses"
      icon="ti-building-warehouse"
      color="var(--teal)"
      fields={fields}
    />
  );
}

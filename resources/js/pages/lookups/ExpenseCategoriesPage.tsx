import LookupPage from './LookupPage';

export default function ExpenseCategoriesPage() {
   return (
      <LookupPage
         title="فئات المصروفات"
         resource="فئة مصروف"
         endpoint="/expense-categories"
         icon="ti-category"
         color="var(--teal)"
         fields={[
            { key: 'name', label: 'اسم الفئة', required: true, placeholder: 'مثال: كهرباء' },
            { key: 'description', label: 'الوصف', type: 'textarea', showInTable: false },
            { key: 'active', label: 'نشط', type: 'select', badge: true, options: [{ value: 1, label: 'نعم' }, { value: 0, label: 'لا' }] },
         ]}
      />
   );
}

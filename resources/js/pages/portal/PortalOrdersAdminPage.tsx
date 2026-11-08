// ════════════════════════════════════════════════════════════════════════════
// pages/portal/PortalOrdersAdminPage.tsx — طلبات بوابة الزبائن (لوحة الإدارة)
//
// تصميم ERP حديث (بأسلوب Odoo/SAP):
//   - شريط KPI بعدادات الحالات (فلترة بالنقر)
//   - شريط خط الأنابيب (ملخص) قابل للنقر
//   - بحث + جدول بالمرجع/الزبون/الحالة
//   - نافذة تفاصيل مقسّمة (زبون، مسار، منتجات+مخزون، إجماليات، سجل الحالات)
//   - نافذة معالجة إبداعية (Process Wizard): توزيع الكميات المطلوبة على
//     المخزون المتوفر (مستودع الطلب + كل المستودعات) قبل بدء المعالجة.
//
// الانتقال الصارم خطوة واحدة في كل مرة: تعرض الواجهة فقط allowed_next
// القادمة من الخادم — أي قفزة غير قانونية يرفضها الخادم (409).
// ════════════════════════════════════════════════════════════════════════════
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useConfirm } from '@/hooks/useConfirm';
import { useAdminOrdersList } from './orders-admin/hooks/useAdminOrdersList';
import { useAdminOrderDetail } from './orders-admin/hooks/useAdminOrderDetail';
import AdminOrdersListSection from './orders-admin/components/AdminOrdersListSection';
import OrderDetailModal from './orders-admin/components/OrderDetailModal';
import ProcessWizardModal from './orders-admin/components/ProcessWizardModal';
import ConvertOrderModal from './orders-admin/components/ConvertOrderModal';

export default function PortalOrdersAdminPage() {
  const { confirm, confirmDialogProps } = useConfirm();
  const list = useAdminOrdersList();
  const detail = useAdminOrderDetail(confirm);
  const { summaryQuery, refresh } = list;

  return (
    <div>
      <PageHeader
        title="طلبات بوابة الزبائن"
        subtitle="وصل طلب سلعة المرسل من زبائن البوابة — تابع خط الأنابيب، وزّع المخزون، وحوّل إلى فواتير بيع"
        badge={{ label: `${summaryQuery.data?.total ?? 0} طلب`, variant: 'info' }}
        actions={
          <Button variant="outline" size="sm" icon={<i className="ti ti-refresh" />} onClick={refresh}>
            تحديث
          </Button>
        }
      />

      <AdminOrdersListSection {...list} openDetail={detail.openDetail} />

      {/* ════ نافذة تفاصيل الطلب ════ */}
      <OrderDetailModal {...detail} />

      {/* ════ نافذة المعالجة (Wizard) ════ */}
      <ProcessWizardModal {...detail} />

      {/* ════ نافذة تحويل الطلب إلى فاتورة (FV/POS + دفعة اختيارية) ════ */}
      <ConvertOrderModal {...detail} />

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

// pages/portal/orders/hooks/usePortalOrderConfig.ts
// Portal ordering config (/portal/config): ordering permission, limits and catalog display flags.
import { useQuery } from '@tanstack/react-query';
import { portalApi } from '@/lib/api/portal/portal';

export function usePortalOrderConfig(slug: string | undefined) {
  // إعدادات البوابة العامة — تُستخدم لتوجيه الواجهة قبل أي إرسال:
  //   - can_order: هل يستطيع الزائر/المسجّل الحالي إرسال الطلبات فعلاً؟
  //   - min/max: تحقق مسبق على العميل قبل أن يرفض الخادم (409/422)
  //   - رسالة التأكيد المخصصة بعد إرسال ناجح
  const configQuery = useQuery({
    queryKey: ['portal', slug, 'config'],
    queryFn: () => portalApi.config(),
    staleTime: 60_000,
  });

  const cfg = configQuery.data;
  const canOrder = cfg?.can_order ?? true;
  const confirmationMessage = (cfg?.order_confirmation_message ?? '').trim();

  // إعدادات عرض الكتالوج — تتحكم في ما يظهر للزبون (تُقرأ من /portal/config
  // ويديرها المسؤول في تبويب الإعدادات «إعدادات عرض الكتالوج»).
  const showStock = cfg?.show_stock ?? true;
  const showPrice = cfg?.show_price ?? true;
  const showRef = cfg?.show_ref ?? true;
  const showUnit = cfg?.show_unit ?? true;
  const showPackaging = cfg?.show_packaging ?? true;
  const allowChangePackaging = cfg?.allow_change_packaging ?? true;
  const showDiscounts = cfg?.show_discounts ?? true;
  const showTva = cfg?.show_tva ?? true;
  const showSearch = cfg?.show_search ?? true;
  const hideOutOfStock = cfg?.hide_out_of_stock ?? false;
  const showIncartBadge = cfg?.show_incart_badge ?? true;
  const showNotes = cfg?.show_notes ?? true;

  return {
    configQuery,
    cfg,
    canOrder,
    confirmationMessage,
    showStock,
    showPrice,
    showRef,
    showUnit,
    showPackaging,
    allowChangePackaging,
    showDiscounts,
    showTva,
    showSearch,
    hideOutOfStock,
    showIncartBadge,
    showNotes,
  };
}

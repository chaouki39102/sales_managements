// pages/portal/orders-admin/hooks/useAdminOrderDetail.ts
// Detail modal state: selected order, status transitions, and the editor / wizard / convert sub-hooks.
import { useMemo, useState } from 'react';
import { useNotification } from '@/hooks/useNotification';
import type { useConfirm } from '@/hooks/useConfirm';
import {
  usePortalOrderDetail,
  usePortalOrderStatusUpdate,
  usePortalOrderLinesUpdate,
  type PortalAdminOrder,
  type PortalOrderConvertResult,
} from '@/lib/api/endpoints/portalOrders';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';
import { STATUS_META } from '../ordersAdminUtils';
import { useOrderLinesEditor } from './useOrderLinesEditor';
import { useProcessWizard } from './useProcessWizard';
import { useConvertOrder } from './useConvertOrder';

export function useAdminOrderDetail(confirm: ReturnType<typeof useConfirm>['confirm']) {
  const notify = useNotification();

  const [detailId, setDetailId] = useState<number | null>(null);
  const [convertResult, setConvertResult] = useState<PortalOrderConvertResult['sale'] | null>(null);
  const [busyTarget, setBusyTarget] = useState<PortalOrderStatus | null>(null);

  const detail = usePortalOrderDetail(detailId);
  const updateStatus = usePortalOrderStatusUpdate();
  const linesMut = usePortalOrderLinesUpdate();

  const order = detail.data;
  const stockByLine = useMemo(
    () => new Map((order?.stock ?? []).map((s) => [s.line_id, s])),
    [order?.stock],
  );

  const canEdit = !!order && !['shipped', 'delivered', 'returned', 'cancelled', 'completed'].includes(order.status);
  // التحويل متاح من مؤكد/تم المعالجة/الشحن (يقفز إلى تم التسليم) ومن
  // تم التسليم نفسه (يبقى الوضع كما هو) — لا من مرتجع/ملغى.
  // التحويل مسموح مرة واحدة فقط: طلب محوّل (is_converted) يفقد الزر نهائياً.
  const convertable = !!order && !order.is_converted && ['confirmed', 'processed', 'shipped', 'delivered'].includes(order.status);

  const editor = useOrderLinesEditor({ order, detailId, linesMut });
  const wizard = useProcessWizard({ order, detailId, stockByLine, linesMut, updateStatus });
  const conv = useConvertOrder({ order, detailId, detail, setConvertResult });
  const { setEditing, setDraft } = editor;
  const { setWizardOpen } = wizard;

  const openDetail = (o: PortalAdminOrder) => {
    setDetailId(o.id);
    setConvertResult(null);
    setEditing(false);
    setDraft([]);
    setWizardOpen(false);
  };

  const closeDetail = () => {
    setDetailId(null);
    setEditing(false);
    setDraft([]);
    setWizardOpen(false);
  };

  // ── الحالة (المسموح فقط من allowed_next) ───────────────────────────────
  const applyStatus = (target: PortalOrderStatus) => {
    if (!detailId) return;
    setBusyTarget(target);
    updateStatus.mutate(
      { id: detailId, status: target },
      {
        onSuccess: () => notify.success(`تم الانتقال إلى «${STATUS_META[target].label}»`),
        onError: (e: Error) => notify.error(e.message || 'تعذر تحديث الحالة'),
        onSettled: () => setBusyTarget(null),
      },
    );
  };

  const handleGuardedStatus = async (target: PortalOrderStatus) => {
    if (target === 'cancelled' || target === 'returned') {
      const ok = await confirm(
        target === 'cancelled'
          ? 'سيتم إلغاء الطلب نهائياً — لا يمكن التراجع عن الإلغاء. متابعة؟'
          : 'سيُسجَّل الطلب كمرتجع بعد التسليم. متابعة؟',
        {
          title: STATUS_META[target].label,
          confirmText: 'تأكيد',
          variant: target === 'cancelled' ? 'danger' : 'warning',
          icon: STATUS_META[target].icon,
        },
      );
      if (!ok) return;
    }
    applyStatus(target);
  };

  return {
    ...editor,
    ...wizard,
    ...conv,
    detailId,
    setDetailId,
    convertResult,
    setConvertResult,
    busyTarget,
    setBusyTarget,
    detail,
    updateStatus,
    linesMut,
    order,
    stockByLine,
    canEdit,
    convertable,
    openDetail,
    closeDetail,
    applyStatus,
    handleGuardedStatus,
  };
}

export type AdminOrderDetailState = ReturnType<typeof useAdminOrderDetail>;
export type LoadedAdminOrder = NonNullable<AdminOrderDetailState['order']>;
/** Detail state with the order narrowed to "loaded" (used by sections rendered inside `order ? …`). */
export type WithLoadedOrder = Omit<AdminOrderDetailState, 'order'> & { order: LoadedAdminOrder };

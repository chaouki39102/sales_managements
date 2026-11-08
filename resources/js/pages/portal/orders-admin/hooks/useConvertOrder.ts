// pages/portal/orders-admin/hooks/useConvertOrder.ts
// Convert an order to a sale document (FV/POS) with an optional payment.
import { useState, type Dispatch, type SetStateAction } from 'react';
import { useNotification } from '@/hooks/useNotification';
import {
  usePortalOrderConvert,
  type PortalConvertTarget,
  type PortalConvertPayment,
  type PortalOrderConvertResult,
} from '@/lib/api/endpoints/portalOrders';
import { usePaymentModes } from '@/lib/api/endpoints/lookups';
import type { AdminOrderDetail, OrderDetailQuery } from '../types';

export function useConvertOrder({ order, detailId, detail, setConvertResult }: {
  order: AdminOrderDetail;
  detailId: number | null;
  detail: OrderDetailQuery;
  setConvertResult: Dispatch<SetStateAction<PortalOrderConvertResult['sale'] | null>>;
}) {
  const notify = useNotification();

  // ── تحويل إلى فاتورة (FV/POS + دفعة اختيارية) ─────────────────────────
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<'FV' | 'POS'>('FV');
  const [payEnabled, setPayEnabled] = useState(false);
  const [payModeId, setPayModeId] = useState<number | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payReference, setPayReference] = useState('');
  const convert = usePortalOrderConvert();
  const paymentModes = usePaymentModes();

  const openConvert = async () => {
    if (!order) return;
    if (order.is_converted) {
      notify.warning('تم تحويل هذا الطلب إلى فاتورة مسبقاً — التحويل مسموح مرة واحدة فقط.');
      return;
    }
    setConvertTarget('FV');
    setPayEnabled(false);
    setPayModeId('');
    setPayAmount('');
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayReference('');
    // تأمين ضد البيانات القديمة: أعد جلب تفاصيل الطلب قبل عرض نافذة التحويل
    try { await detail.refetch(); } catch { /* نُكمل بالبيانات الحالية */ }
    setConvertOpen(true);
  };

  const doConvert = () => {
    if (!detailId) return;
    if (payEnabled && !Number(payModeId)) {
      notify.error('اختر طريقة الدفع أولاً.');
      return;
    }
    const amount = Number(payAmount);
    if (payEnabled && (!amount || amount <= 0)) {
      notify.error('أدخل مبلغاً صحيحاً أكبر من صفر.');
      return;
    }
    const payment: PortalConvertPayment | undefined = payEnabled
      ? {
          payment_mode_id: Number(payModeId),
          amount,
          payment_date: payDate || new Date().toISOString().slice(0, 10),
          reference: payReference.trim() || undefined,
        }
      : undefined;
    const data: PortalConvertTarget = { target: convertTarget, ...(payment ? { payment } : {}) };
    convert.mutate(
      { id: detailId, data },
      {
        onSuccess: (res) => {
          setConvertOpen(false);
          setConvertResult(res.sale);
          notify.success(`تم التحويل — الفاتورة ${res.sale.document_number}`);
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر تحويل الطلب إلى فاتورة'),
      },
    );
  };

  return {
    convertOpen,
    setConvertOpen,
    convertTarget,
    setConvertTarget,
    payEnabled,
    setPayEnabled,
    payModeId,
    setPayModeId,
    payAmount,
    setPayAmount,
    payDate,
    setPayDate,
    payReference,
    setPayReference,
    convert,
    paymentModes,
    openConvert,
    doConvert,
  };
}

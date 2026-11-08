// pages/portal/orders-admin/hooks/useProcessWizard.ts
// Process wizard: allocate ordered quantities against available stock, then move to «processed».
import { useMemo, useState } from 'react';
import { useNotification } from '@/hooks/useNotification';
import type { PortalAdminStockInfo } from '@/lib/api/endpoints/portalOrders';
import type { AllocLine, AdminOrderDetail, LinesMutation, StatusMutation } from '../types';

export function useProcessWizard({ order, detailId, stockByLine, linesMut, updateStatus }: {
  order: AdminOrderDetail;
  detailId: number | null;
  stockByLine: Map<number, PortalAdminStockInfo>;
  linesMut: LinesMutation;
  updateStatus: StatusMutation;
}) {
  const notify = useNotification();

  // ── معالجة (Wizard) ────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [allocs, setAllocs] = useState<AllocLine[]>([]);

  // ── نافذة المعالجة (Wizard) ─────────────────────────────────────────────
  const openWizard = () => {
    if (!order) return;
    setAllocs((order.lines ?? []).map((it) => {
      const s = stockByLine.get(it.line_id);
      return {
        line_id:       it.line_id,
        product_id:    it.product_id,
        product_name:  it.product_name,
        product_ref:   it.product_ref,
        unit_name:     it.unit_name,
        pack_qty:      it.pack_qty || 1,
        ordered:       it.quantity,
        alloc:         it.quantity,
        available:     s?.available ?? null,
        available_all: s?.available_all ?? null,
        required:      s?.required ?? it.quantity * (it.pack_qty || 1),
      };
    }));
    setWizardOpen(true);
  };

  const fitOf = (a: AllocLine): 'na' | 'ok' | 'part' | 'bad' => {
    if (a.available === null) return 'na';
    const need = Math.max(0, a.alloc || 0) * a.pack_qty;
    if (need <= a.available) return 'ok';
    if (a.available_all !== null && need <= a.available_all) return 'part';
    return 'bad';
  };

  const wizTotals = useMemo(() => {
    const orderedBase = allocs.reduce((s, a) => s + Math.max(0, a.ordered) * a.pack_qty, 0);
    const allocBase = allocs.reduce((s, a) => s + Math.max(0, a.alloc || 0) * a.pack_qty, 0);
    const pct = orderedBase ? Math.min(100, Math.round((allocBase / orderedBase) * 100)) : 0;
    const anyBad = allocs.some((a) => fitOf(a) === 'bad');
    const anyWarn = !anyBad && allocs.some((a) => fitOf(a) === 'part');
    return { orderedBase, allocBase, pct, anyBad, anyWarn };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocs]);

  const saveProcess = () => {
    if (!detailId) return;
    if (allocs.every((a) => Math.max(0, a.alloc || 0) <= 0)) {
      notify.error('لا يمكن بدء المعالجة بطلب فارغ — حدد كميات أكبر من صفر');
      return;
    }
    const lines = allocs.map((a) => ({ line_id: a.line_id, quantity: Math.max(0, a.alloc || 0) }));
    linesMut.mutate(
      { id: detailId, lines },
      {
        onSuccess: () => {
          updateStatus.mutate(
            { id: detailId, status: 'processed' },
            {
              onSuccess: () => {
                setWizardOpen(false);
                notify.success('تمت معالجة الطلب وتوزيع الكميات');
              },
              onError: (e: Error) => notify.error(e.message || 'تعذر تحديث حالة الطلب'),
            },
          );
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر حفظ الكميات'),
      },
    );
  };

  return {
    wizardOpen,
    setWizardOpen,
    allocs,
    setAllocs,
    openWizard,
    fitOf,
    wizTotals,
    saveProcess,
  };
}

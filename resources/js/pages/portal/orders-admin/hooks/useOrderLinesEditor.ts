// pages/portal/orders-admin/hooks/useOrderLinesEditor.ts
// Draft editing of an order's lines (quantity / unit price / discount) with live totals.
import { useMemo, useState } from 'react';
import { useNotification } from '@/hooks/useNotification';
import { useProductSearch } from '@/lib/api/endpoints/products';
import type { Product } from '@/lib/api/core/types';
import type { PortalAdminOrderItem } from '@/lib/api/endpoints/portalOrders';
import { defaultPackOf } from '../ordersAdminUtils';
import type { DraftLine, AdminOrderDetail, LinesMutation } from '../types';

export function useOrderLinesEditor({ order, detailId, linesMut }: {
  order: AdminOrderDetail;
  detailId: number | null;
  linesMut: LinesMutation;
}) {
  const notify = useNotification();

  // ── تفاصيل ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [addQuery, setAddQuery] = useState('');
  const [addQty, setAddQty] = useState(1);
  const productSearch = useProductSearch(addQuery, { include: 'unit,packagings,tva', per_page: 15 });

  // ── تحرير المنتجات (حفظ عام) ───────────────────────────────────────────
  const startEditing = () => {
    if (!order) return;
    setDraft((order.lines ?? []).map((it: PortalAdminOrderItem) => {
      const packQty = it.pack_qty > 0 ? it.pack_qty : 1;
      const storedPct = it.discount_percentage ?? 0;
      const fixedTotal = it.total_discount_amount ?? 0;
      // خط بخُصم مبلغ ثابت (نسبة 0% مع خصم إجمالي > 0): نستخرج خصم الوحدة
      // الثابت (لكل وحدة قاعدة) لإعادة حساب المعاينة أثناء التحرير، وليُحمّله
      // الخادم عند الحفظ ما لم يعدّل المسؤول النسبة (خصم% وثابت حصريان).
      const fixedPerUnit =
        storedPct <= 0 && fixedTotal > 0.004
          ? fixedTotal / Math.max(1, it.quantity * packQty)
          : 0;
      return {
        line_id:       it.line_id,
        product_id:    it.product_id,
        product_name:  it.product_name,
        product_ref:   it.product_ref,
        unit_name:     it.unit_name,
        quantity:      it.quantity,
        packaging_id:  it.packaging_id,
        pack_qty:      packQty,
        // القيمة المخزّنة unit_price_ht هي سعر التعبئة — نعرض ونحرّر سعر الوحدة
        // (المخزّن ÷ عامل التعبئة) كما يفرض عقد Phase 51.
        unit_price_ht: Math.round((it.unit_price_ht / packQty) * 10000) / 10000,
        discount_percentage: storedPct,
        fixedDiscPerUnit: fixedPerUnit,
        priceTouched: false,
        discountTouched: false,
        tva_rate:      it.tva_rate ?? 0,
        tva_rate_live: it.tva_rate_live ?? it.tva_rate ?? 0,
      };
    }));
    setEditing(true);
  };

  const addProduct = (p: Product) => {
    const pack = defaultPackOf(p);
    setDraft((d) => [...d, {
      line_id:      null,
      product_id:   p.id,
      product_name: p.name,
      product_ref:  p.ref ?? null,
      unit_name:    p.unit?.symbol ?? null,
      quantity:     addQty > 0 ? addQty : 1,
      packaging_id: null,
      pack_qty:     pack?.quantity ?? 1,
      unit_price_ht: p.default_selling_price_ht ?? 0,
      discount_percentage: 0,
      fixedDiscPerUnit: 0,
      // سطر جديد: يُرسل السعر والخصم دائماً (لا قيمة مخزّنة نحافظ عليها).
      priceTouched: true,
      discountTouched: true,
      // زبون معفى → الخادم يُخزّن 0 (TaxRuleService) — نعكس ذلك في المعاينة.
      tva_rate:      order?.party?.is_tva_exempt ? 0 : (p.tva?.rate ?? 0),
      tva_rate_live: p.tva?.rate ?? 0,
    }]);
    setAddQuery('');
    setAddQty(1);
  };

  const saveLines = () => {
    if (!detailId) return;
    const payload = draft
      .filter((l) => l.quantity > 0 || l.line_id !== null)
      .map((l) => {
        const base = l.line_id !== null
          ? { line_id: l.line_id, quantity: Math.max(0, l.quantity) }
          : { product_id: l.product_id, quantity: Math.max(1, l.quantity) };
        // نُرسل سعر الوحدة والخصم فقط عند التعديل الفعلي (أو لسطر جديد):
        //  - عدم إرسال unit_price_ht يحافظ على سعر السطر المخزّن حرفياً
        //    (يمنع انحراف round(storedPack/12,4)×12 للسعر المعبّأ)
        //  - عدم إرسال discount_percentage يحافظ على خصم المبلغ الثابت
        //    (discount_amount_per_unit) المخزّن من طبقة الكميات.
        return {
          ...base,
          ...(l.priceTouched
            ? { unit_price_ht: Math.round((l.unit_price_ht ?? 0) * 10000) / 10000 }
            : {}),
          ...(l.discountTouched
            ? { discount_percentage: l.discount_percentage ?? 0 }
            : {}),
        };
      });
    if (payload.length === 0) {
      notify.error('أضف منتجاً واحداً على الأقل قبل الحفظ');
      return;
    }
    linesMut.mutate(
      { id: detailId, lines: payload },
      {
        onSuccess: () => {
          setEditing(false);
          setDraft([]);
          notify.success('تم حفظ منتجات الطلب');
        },
        onError: (e: Error) => notify.error(e.message || 'تعذر حفظ المنتجات'),
      },
    );
  };

  // إجماليات حيّة أثناء التحرير (تعكس تعديلات الكمية/السعر/الخصم) — نفس صيغة
  // CommercialDocumentLineObserver: خصم مبلغ ثابت (لكل وحدة قاعدة × كمية القاعدة)
  // أو نسبة مئوية، ثم TVA على HT.
  const draftTotals = useMemo(() => {
    let ht = 0, tva = 0, disc = 0;
    for (const l of draft) {
      const qty = Math.max(0, l.quantity);
      const baseQty = qty * (l.pack_qty > 0 ? l.pack_qty : 1);
      const gross = baseQty * (l.unit_price_ht ?? 0);
      // المسار الفعّال: خصم مبلغ ثابت (لم يلمس المسؤول النسبة) → لكل وحدة قاعدة؛
      // وإلا نسبة مئوية. يطابق المسار الذي يطبقه الخادم عند الحفظ.
      let discAmt: number;
      if (!l.discountTouched && l.fixedDiscPerUnit > 0) {
        discAmt = l.fixedDiscPerUnit * baseQty;
      } else {
        const d = Math.min(100, Math.max(0, l.discount_percentage ?? 0));
        discAmt = gross * (d / 100);
      }
      const lineHt = gross - discAmt;
      ht += lineHt;
      disc += discAmt;
      tva += lineHt * ((l.tva_rate ?? 0) / 100);
    }
    return { ht, tva, disc, ttc: ht + tva };
  }, [draft]);

  // ── عرض: قائمة + تفاصيل + معالجة ───────────────────────────────────────
  const productResults = (addQuery.trim().length >= 2 ? productSearch.data?.data ?? [] : []).filter(
    (v) => !draft.some((l) => l.line_id === null && l.product_id === v.id),
  );

  return {
    editing,
    setEditing,
    draft,
    setDraft,
    addQuery,
    setAddQuery,
    addQty,
    setAddQty,
    productSearch,
    startEditing,
    addProduct,
    saveLines,
    draftTotals,
    productResults,
  };
}

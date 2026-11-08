// pages/portal/orders-admin/types.ts
// Local types for the portal orders admin page (editor draft lines, wizard allocations, hook params).
import type {
  usePortalOrderDetail,
  usePortalOrderStatusUpdate,
  usePortalOrderLinesUpdate,
} from '@/lib/api/endpoints/portalOrders';

export interface DraftLine {
  line_id:       number | null;
  product_id:    number;
  product_name:  string;
  product_ref:   string | null;
  unit_name:     string | null;
  quantity:      number;
  packaging_id:  number | null;
  pack_qty:      number;
  // سعر الوحدة (قبل ضرب عامل التعبئة) — المسؤول يملك تعديله (عقد Phase 51:
  // unit_price_ht يُرسل كسعر وحدة والخادم يضرب في pack_qty).
  unit_price_ht: number;
  discount_percentage: number;
  // خصم مبلغ ثابت من طبقة كميات (لكل وحدة قاعدة) — يُستخرج من السطر المخزّن
  // حتى تبقى المعاينة صحيحة أثناء التحرير، ويحتفظ به الخادم عند الحفظ ما لم
  // يعدّل المسؤول النسبة.
  fixedDiscPerUnit: number;
  // هل لمس المسؤول الحقل فعلياً؟ عند عدم اللمس لا يُرسل السعر/الخصم في الحفظ:
  //  - عدم إرسال unit_price_ht يحفظ سعر السطر المخزّن حرفياً (يمنع انحراف
  //    round(storedPack/12,4)×12 للسعر المعبّأ)
  //  - عدم إرسال discount_percentage يحفظ خصم المبلغ الثابت المخزّن.
  priceTouched: boolean;
  discountTouched: boolean;
  // نسبة TVA المخزّنة على السطر (0 لزبون معفى جبائياً) + النسبة الاسمية للمنتج.
  tva_rate:      number;
  tva_rate_live: number;
}

export interface AllocLine {
  line_id:       number;
  product_id:    number;
  product_name:  string;
  product_ref:   string | null;
  unit_name:     string | null;
  pack_qty:      number;
  ordered:       number;   // وحدات البيع كما طُلبت
  alloc:         number;   // الكمية الموزَّعة (قابلة للتعديل)
  available:     number | null;
  available_all: number | null;
  required:      number;   // وحدات القاعدة المطلوبة
}

export type OrderDetailQuery = ReturnType<typeof usePortalOrderDetail>;
export type AdminOrderDetail = OrderDetailQuery['data'];
export type StatusMutation = ReturnType<typeof usePortalOrderStatusUpdate>;
export type LinesMutation = ReturnType<typeof usePortalOrderLinesUpdate>;

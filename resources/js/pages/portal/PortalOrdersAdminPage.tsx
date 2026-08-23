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
import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '@/components/ui/PageHeader';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SimpleTable from '@/components/ui/SimpleTable';
import { useNotification } from '@/hooks/useNotification';
import { useConfirm } from '@/hooks/useConfirm';
import { useProductSearch } from '@/lib/api/endpoints/products';
import { buildWhatsAppLink, waDocMessage } from '@/lib/wa';
import { documentsApi } from '@/lib/api/endpoints/documents';
import type { Product, ProductPackaging } from '@/lib/api/core/types';
import {
  usePortalOrders,
  usePortalOrdersSummary,
  usePortalOrderDetail,
  usePortalOrderStatusUpdate,
  usePortalOrderConvert,
  usePortalOrderLinesUpdate,
  type PortalAdminOrder,
  type PortalAdminOrderItem,
  type PortalAdminStockInfo,
  type PortalConvertTarget,
  type PortalConvertPayment,
  type PortalOrderConvertResult,
} from '@/lib/api/endpoints/portalOrders';
import { usePaymentModes } from '@/lib/api/endpoints/lookups';
import type { PortalOrderStatus } from '@/lib/api/portal/portal';
import OrderPipeline from './OrderPipeline';
import { exportToExcel } from '@/pages/reports/exportUtils';

const fmt = (n: number) =>
  n.toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d?: string | null) =>
  d
    ? new Date(d).toLocaleString('ar-DZ', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

// يعكس Product::defaultPackaging(): العبوة الافتراضية، وإلا الأصغر كميةً
const defaultPackOf = (p: Product): ProductPackaging | undefined => {
  const ps = p.packagings ?? [];
  return ps.find((x) => x.is_default) ?? [...ps].sort((a, b) => a.quantity - b.quantity)[0];
};

type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'orange' | 'gray';
type ButtonVariant = 'default' | 'primary' | 'danger' | 'warning' | 'info' | 'outline' | 'secondary' | 'success' | 'ghost' | 'gray';

// ── بيانات الحالات (لون/أيقونة/شارة) ────────────────────────────────────────
const STATUS_META: Record<PortalOrderStatus, { label: string; icon: string; color: string; badge: BadgeVariant }> = {
  pending:   { label: 'قيد الاعداد',  icon: 'ti-clock',            color: '#64748b', badge: 'gray'    },
  preparing: { label: 'قيد الاعداد',  icon: 'ti-pencil',           color: '#f59e0b', badge: 'warning' },
  confirmed: { label: 'مؤكد',         icon: 'ti-circle-check',     color: '#2563eb', badge: 'info'    },
  processed: { label: 'تم المعالجة',  icon: 'ti-settings',         color: '#8b5cf6', badge: 'purple'  },
  shipped:   { label: 'الشحن',        icon: 'ti-truck',            color: '#f97316', badge: 'orange'  },
  delivered: { label: 'تم التسليم',   icon: 'ti-package-import',  color: '#16a34a', badge: 'success' },
  returned:  { label: 'مرتجع',        icon: 'ti-rotate-clockwise', color: '#dc2626', badge: 'danger'  },
  cancelled: { label: 'ملغي',         icon: 'ti-x',                color: '#94a3b8', badge: 'gray'    },
  completed: { label: 'مكتمل',        icon: 'ti-check',            color: '#15803d', badge: 'success' },
};

// قراءة آمنة لأي حالة (تُحفظ الصفحة من قيم قديمة/غير معروفة في قاعدة البيانات)
const stMeta = (st: string) =>
  STATUS_META[st as PortalOrderStatus] ?? { label: st, icon: 'ti-circle', color: '#94a3b8', badge: 'gray' as BadgeVariant };

const MAIN_PIPELINE: Exclude<PortalOrderStatus, 'pending' | 'completed'>[] = ['preparing', 'confirmed', 'processed', 'shipped', 'delivered'];
const TERMINALS: Exclude<PortalOrderStatus, 'pending' | 'completed'>[] = ['returned', 'cancelled'];

// ترتيب خط الأنابيب لسجل الحالات: يُعرض التاريخ دائماً بتقدم المسار
// (قيد الاعداد ← مؤكد ← تم المعالجة ← الشحن ← تم التسليم) والفروع في الآخر.
const PIPELINE_RANK: Record<PortalOrderStatus, number> = {
  pending:   -1,
  preparing: 0,
  confirmed: 1,
  processed: 2,
  shipped:   3,
  delivered: 4,
  returned:  5,
  cancelled: 6,
  completed: 7,
};
const sortByPipeline = (
  a: { status: string; created_at?: string | null },
  b: { status: string; created_at?: string | null },
) => {
  const ra = PIPELINE_RANK[a.status as PortalOrderStatus] ?? 99;
  const rb = PIPELINE_RANK[b.status as PortalOrderStatus] ?? 99;
  if (ra !== rb) return ra - rb;
  return new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime();
};

const NEXT_ACTION_LABEL: Partial<Record<PortalOrderStatus, string>> = {
  confirmed: 'تأكيد الطلب',
  processed: 'بدء المعالجة',
  shipped:   'الشحن',
  delivered: 'تسليم الطلب',
  returned:  'إرجاع الطلب',
  cancelled: 'إلغاء الطلب',
};

const NEXT_ACTION_VARIANT: Record<PortalOrderStatus, ButtonVariant> = {
  pending:   'default',
  preparing: 'default',
  confirmed: 'info',
  processed: 'primary',
  shipped:   'primary',
  delivered: 'success',
  returned:  'danger',
  cancelled: 'danger',
  completed: 'default',
};

const initialsOf = (name?: string | null) =>
  (name || '؟').trim().split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('');

interface DraftLine {
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

interface AllocLine {
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

// ── شارة مخزون السطر (صف واحد مضغوط: متاح بالمستودع / إجمالاً / مطلوب) ──────
function StockCell({ stock }: { stock?: PortalAdminStockInfo }) {
  if (!stock) return <span className="poa-stk na"><i className="ti ti-minus" /> —</span>;
  if (stock.available === null) {
    return <span className="poa-stk na"><i className="ti ti-package-off" /> لا يدير مخزوناً</span>;
  }
  const ok = stock.sufficient !== false;
  const okAll = stock.sufficient_all !== false;
  return (
    <div
      className={`poa-stk-c ${ok && okAll ? 'ok' : 'bad'}`}
      title={`بالمستودع ${fmt(stock.available)} · إجمالاً ${fmt(stock.available_all ?? 0)} · مطلوب ${fmt(stock.required)}`}
    >
      <i className={`ti ${ok ? 'ti-box' : 'ti-alert-triangle'}`} />
      <span className="poa-stk-c-avail">{fmt(stock.available)}</span>
      {stock.available_all !== null && stock.available_all !== stock.available && (
        <span className="poa-stk-sub">/ إجمالاً {fmt(stock.available_all)}</span>
      )}
      <span className="poa-stk-sub">· مطلوب {fmt(stock.required)}</span>
    </div>
  );
}

export default function PortalOrdersAdminPage() {
  const qc = useQueryClient();
  const notify = useNotification();
  const { confirm, confirmDialogProps } = useConfirm();

  // ── قائمة ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<PortalOrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [convertResult, setConvertResult] = useState<PortalOrderConvertResult['sale'] | null>(null);

  // ── تفاصيل ─────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [addQuery, setAddQuery] = useState('');
  const [addQty, setAddQty] = useState(1);
  const [busyTarget, setBusyTarget] = useState<PortalOrderStatus | null>(null);

  // ── معالجة (Wizard) ────────────────────────────────────────────────────
  const [wizardOpen, setWizardOpen] = useState(false);
  const [allocs, setAllocs] = useState<AllocLine[]>([]);

  // ── تحويل إلى فاتورة (FV/POS + دفعة اختيارية) ─────────────────────────
  const [convertOpen, setConvertOpen] = useState(false);
  const [convertTarget, setConvertTarget] = useState<'FV' | 'POS'>('FV');
  const [payEnabled, setPayEnabled] = useState(false);
  const [payModeId, setPayModeId] = useState<number | ''>('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [payReference, setPayReference] = useState('');

  const perPage = 15;

  const { data, isLoading } = usePortalOrders({
    page, per_page: perPage, status, search: debouncedSearch,
    from_date: fromDate || undefined, to_date: toDate || undefined,
    sort_by: sortBy || undefined, sort_dir: sortBy ? sortDir : undefined,
  });
  const summaryQuery = usePortalOrdersSummary();
  const detail = usePortalOrderDetail(detailId);
  const updateStatus = usePortalOrderStatusUpdate();
  const convert = usePortalOrderConvert();
  const linesMut = usePortalOrderLinesUpdate();
  const productSearch = useProductSearch(addQuery, { include: 'unit,packagings,tva', per_page: 15 });

  const orders = data?.data ?? [];
  const meta = data?.meta;
  const from = meta ? meta.per_page * (meta.current_page - 1) + 1 : 0;
  const to = meta ? Math.min(meta.per_page * meta.current_page, meta.total) : 0;
  const pageTtc = useMemo(() => orders.reduce((s, o) => s + (o.total_ttc ?? 0), 0), [orders]);
  const hasFilters = !!status || !!debouncedSearch || !!fromDate || !!toDate;

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
  const paymentModes = usePaymentModes();

  // ── بحث مع إبطاء ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  // ── بطاقات KPI (من الملخص) ─────────────────────────────────────────────
  const kpis = useMemo(() => {
    const s = summaryQuery.data;
    const base: { key: PortalOrderStatus | ''; label: string; icon: string; color: string; count: number }[] = [
      { key: '', label: 'الكل', icon: 'ti-layout-grid', color: 'var(--em)', count: s?.total ?? 0 },
    ];
    MAIN_PIPELINE.forEach((st) => base.push({
      key: st, label: STATUS_META[st].label, icon: STATUS_META[st].icon,
      color: STATUS_META[st].color, count: s?.[st] ?? 0,
    }));
    TERMINALS.forEach((st) => base.push({
      key: st, label: STATUS_META[st].label, icon: STATUS_META[st].icon,
      color: STATUS_META[st].color, count: s?.[st] ?? 0,
    }));
    // legacy pending: طلبات قديمة غير مهاجَرة (تظهر فقط إن وُجدت)
    if ((s?.pending ?? 0) > 0) {
      base.push({
        key: 'pending', label: STATUS_META.pending.label, icon: STATUS_META.pending.icon,
        color: STATUS_META.pending.color, count: s?.pending ?? 0,
      });
    }
    return base;
  }, [summaryQuery.data]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['portal-orders'] });

  const clearFilters = () => {
    setStatus('');
    setSearch('');
    setDebouncedSearch('');
    setFromDate('');
    setToDate('');
    setPage(1);
  };

  // ── فرز الخادم (عبر رؤوس الجدول القابلة للنقر) ───────────────────────────
  const handleSort = (key: string, dir: 'asc' | 'desc') => {
    setSortBy(key);
    setSortDir(dir);
    setPage(1);
  };

  const handleExport = () => {
    if (orders.length === 0) {
      notify.error('لا توجد طلبات للتصدير');
      return;
    }
    void exportToExcel(
      [
        {
          name: 'الطلبات',
          headers: ['المرجع', 'التاريخ', 'الزبون', 'المنتجات', 'المجموع HT', 'TVA', 'المجموع TTC', 'الحالة'],
          rows: orders.map((o) => [
            o.reference,
            fmtDate(o.requested_at),
            o.party?.name ?? '',
            o.items_count,
            o.total_ht,
            o.total_tva,
            o.total_ttc,
            o.status_label,
          ]),
        },
      ],
      `طلبات-البوابة-${new Date().toISOString().slice(0, 10)}`,
    );
    notify.success(`تم تصدير ${orders.length} طلب إلى Excel`);
  };

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

  // ── عرض: قائمة + تفاصيل + معالجة ───────────────────────────────────────
  const productResults = (addQuery.trim().length >= 2 ? productSearch.data?.data ?? [] : []).filter(
    (v) => !draft.some((l) => l.line_id === null && l.product_id === v.id),
  );

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

      <div className="poa">
        {/* ── شريط بطاقات KPI ─────────────────────────────────────────── */}
        <div className="poa-kpis">
          {kpis.map((k) => (
            <button
              key={k.key}
              className={`poa-kpi${status === k.key ? ' on' : ''}`}
              style={{ ['--ac' as string]: k.color }}
              onClick={() => { setStatus(k.key); setPage(1); }}
              aria-pressed={status === k.key}
            >
              <span className="poa-kpi-ic"><i className={`ti ${k.icon}`} /></span>
              <span className="poa-kpi-meta">
                <span className="poa-kpi-num">{k.count}</span>
                <span className="poa-kpi-lbl">{k.label}</span>
              </span>
              <span className="poa-kpi-glow" />
            </button>
          ))}
        </div>

        {/* ── شريط خط الأنابيب (ملخص) ─────────────────────────────────── */}
        <div className="poa-sec poa-sec--tight">
          <OrderPipeline
            status={status === '' ? 'preparing' : status}
            counts={summaryQuery.data}
            summary
            onStepClick={(st) => { setStatus(st); setPage(1); }}
          />
        </div>

        {/* ── شريط الأدوات ─────────────────────────────────────────────── */}
        <div className="poa-bar">
          <div className="poa-bar-filters">
            <div className="poa-select">
              <i className="ti ti-tag" />
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as PortalOrderStatus | ''); setPage(1); }}
                aria-label="فلترة حسب الحالة"
              >
                <option value="">كل الحالات</option>
                {[...MAIN_PIPELINE, ...TERMINALS].map((st) => (
                  <option key={st} value={st}>{STATUS_META[st].label}</option>
                ))}
              </select>
            </div>
            <div className="poa-date">
              <i className="ti ti-calendar-plus" />
              <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} aria-label="من تاريخ" />
            </div>
            <div className="poa-date">
              <i className="ti ti-calendar-minus" />
              <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} aria-label="إلى تاريخ" />
            </div>
            <div className="poa-search">
              <i className="ti ti-search" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالمرجع أو اسم الزبون..."
              />
              {search && (
                <button className="poa-search-clear" onClick={() => setSearch('')} aria-label="مسح البحث">
                  <i className="ti ti-x" />
                </button>
              )}
            </div>
            {hasFilters && (
              <button className="poa-filters-clear" onClick={clearFilters} aria-label="إلغاء الفلاتر">
                <i className="ti ti-filter-off" /> إلغاء الفلاتر
              </button>
            )}
          </div>
          <div className="poa-bar-side">
            <span className="poa-sort-hint">
              <i className="ti ti-arrows-sort" />
              انقر على رأس العمود للترتيب
            </span>
            <span className="poa-hint">
              <i className="ti ti-clipboard-list" />
              {meta?.total ?? 0} طلب · يعرض {from}–{to}
              {pageTtc > 0 && <b className="poa-hint-ttc">المجموع {fmt(pageTtc)} دج</b>}
            </span>
            <Button variant="outline" size="sm" icon={<i className="ti ti-file-spreadsheet" />} onClick={handleExport}>
              تصدير Excel
            </Button>
          </div>
        </div>

        {/* ── الجدول ───────────────────────────────────────────────────── */}
        <SimpleTable
          className="poa-table"
          isLoading={isLoading}
          emptyText="لا توجد طلبات مطابقة"
          rowKey="id"
          onRowClick={(row) => openDetail(row as PortalAdminOrder)}
          rowClassName={(row) => (!!(row as PortalAdminOrder).customer_name ? 'poa-tr-guest' : '')}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          columns={[
            {
              key: 'reference', label: 'المرجع', align: 'center', sortable: true,
              render: (v) => <b className="poa-mono">{v as string}</b>,
            },
            {
              key: 'requested_at', label: 'التاريخ', align: 'center', sortable: true,
              render: (v) => <span className="poa-cell-date">{fmtDate(v as string)}</span>,
            },
            {
              key: 'party', label: 'الزبون',
              render: (_v, row) => {
                const o = row as PortalAdminOrder;
                const p = o.party;
                const guest = !!o.customer_name;
                const name = guest ? o.customer_name : (p?.name ?? '—');
                const sub = guest
                  ? (o.customer_phone || 'بدون هاتف')
                  : (p?.code ?? '');
                return (
                  <div className={`poa-cust ${guest ? 'poa-cust--guest' : ''}`}>
                    <span className="poa-avatar">{initialsOf(name)}</span>
                    <span className="poa-cust-meta">
                      <span className="poa-cust-name">{name}</span>
                      <span className="poa-cust-sub">{sub}</span>
                    </span>
                    {guest && (
                      <span className="poa-guest-chip" title="طلب عام — زائر غير مسجّل في البوابة">
                        <i className="ti ti-user-off" /> زائر
                      </span>
                    )}
                  </div>
                );
              },
            },
            {
              key: 'items_count', label: 'المنتجات', align: 'center', sortable: true,
              render: (v) => <span className="poa-cell-num">{v as number}</span>,
            },
            {
              key: 'total_ttc', label: 'المجموع TTC', align: 'end', sortable: true,
              render: (v) => <b>{fmt(Number(v))} <span className="poa-ttc-unit">دج</span></b>,
            },
            {
              key: 'status', label: 'الحالة', align: 'center', sortable: true,
              render: (_v, row) => {
                const st = (row as PortalAdminOrder).status;
                return <Badge variant={stMeta(st).badge} noDot>{stMeta(st).label}</Badge>;
              },
            },
            {
              key: '__actions__', label: '',
              render: (_v, row) => (
                <Button
                  variant="outline"
                  size="xs"
                  icon={<i className="ti ti-arrow-left" />}
                  onClick={(e) => { e.stopPropagation(); openDetail(row as PortalAdminOrder); }}
                >
                  فتح
                </Button>
              ),
            },
          ]}
          data={orders}
        />

        {/* ── ترقيم الصفحات ────────────────────────────────────────────── */}
        {meta && meta.total > perPage && (
          <div className="poa-bar poa-bar--mt6">
            <span className="poa-hint">صفحة {meta.current_page} من {meta.last_page}</span>
            <div className="poa-flex-gap6">
              <Button
                variant="outline" size="sm" aria-label="السابق"
                icon={<i className="ti ti-chevron-right" />}
                disabled={meta.current_page <= 1}
                onClick={() => setPage((p) => p - 1)}
              />
              <Button
                variant="outline" size="sm" aria-label="التالي"
                icon={<i className="ti ti-chevron-left" />}
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ════ نافذة تفاصيل الطلب ════ */}
      <Modal
        open={!!detailId}
        onClose={closeDetail}
        title="تفاصيل طلب"
        subtitle={order?.reference}
        size="lg"
        className="poa-modal"
        footerLeft={!editing && canEdit && (
          <Button variant="outline" size="sm" icon={<i className="ti ti-edit" />} onClick={startEditing}>
            تحرير الطلب
          </Button>
        )}
        footer={
          editing ? (
            <>
              <Button variant="secondary" onClick={() => { setEditing(false); setDraft([]); }} disabled={linesMut.isPending}>
                إلغاء
              </Button>
              <Button variant="primary" icon={<i className="ti ti-device-floppy" />} loading={linesMut.isPending} onClick={saveLines}>
                حفظ المنتجات
              </Button>
            </>
          ) : (
            <>
              {(() => {
                const phone = String(order?.party?.phone ?? order?.customer_phone ?? '');
                const msg = order ? [
                  'السلام عليكم،',
                  `طلبك رقم ${order.reference} — ${order.status_label}`,
                  `التاريخ: ${fmtDate(order.requested_at)}`,
                  `عدد الأصناف: ${order.items_count}`,
                  `المجموع: ${fmt(order.total_ttc)} دج`,
                ].join('\n') : '';
                const waLink = buildWhatsAppLink(phone, msg);
                return waLink ? (
                  <a href={waLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" icon={<i className="ti ti-brand-whatsapp" />} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }}>
                      إرسال على واتساب
                    </Button>
                  </a>
                ) : null;
              })()}
              {convertable && (
                <Button
                  variant="primary"
                  icon={<i className="ti ti-file-invoice" />}
                  onClick={openConvert}
                  className="poa-btn-gold"
                >
                  تحويل إلى فاتورة
                </Button>
              )}
              {(order?.allowed_next ?? []).map((target) => {
                const meta = STATUS_META[target];
                const onClick = target === 'processed' ? openWizard : () => handleGuardedStatus(target);
                return (
                  <Button
                    key={target}
                    variant={NEXT_ACTION_VARIANT[target]}
                    icon={<i className={`ti ${meta.icon}`} />}
                    loading={busyTarget === target}
                    onClick={onClick}
                  >
                    {NEXT_ACTION_LABEL[target] ?? meta.label}
                  </Button>
                );
              })}
            </>
          )
        }
      >
        {detail.isLoading ? (
          <div className="poa-hint poa-hint--pad">جاري التحميل...</div>
        ) : order ? (
          <div className="poa-col">
            {/* ── الزبون ─────────────────────────────────────────────── */}
            <div className="poa-sec">
              <div className="poa-cust-card">
                <span className="poa-avatar">{initialsOf(order.customer_name || order.party?.name)}</span>
                <span className="poa-cust-card-info">
                  <span className="poa-cust-card-name">
                    {order.customer_name || order.party?.name || '—'}
                  </span>
                  <span className="poa-cust-card-sub">
                    أمر زبون {order.document?.document_number ?? ''} · أُرسل في {fmtDate(order.requested_at)}
                  </span>
                </span>
                <Badge variant={stMeta(order.status).badge} className="poa-badge-auto">
                  {order.status_label}
                </Badge>
              </div>

              {!!order.customer_name && (
                <div className="poa-guest-banner">
                  <i className="ti ti-user-off" />
                  <div>
                    <b>زائر — غير مسجّل في البوابة</b>
                    <span>أرسل الطلب بدون حساب وبدون تسجيل دخول — لا يظهر في لائحة زبائنك ولا يملك كشف حساب.</span>
                  </div>
                </div>
              )}

              {!!order.customer_name ? (
                <div className="poa-cust-details">
                  <div className="poa-cust-detail">
                    <i className="ti ti-user" />
                    <div>
                      <span>الاسم الكامل</span>
                      <b>{order.customer_name}</b>
                    </div>
                  </div>
                  <div className="poa-cust-detail">
                    <i className="ti ti-phone" />
                    <div>
                      <span>رقم الهاتف</span>
                      {(() => {
                        const wa = buildWhatsAppLink(order.customer_phone || '', '');
                        return wa
                          ? <a href={wa} target="_blank" rel="noopener noreferrer" style={{ color: '#25D366' }} title="واتساب"><b>{order.customer_phone || 'غير متوفر'}</b> <i className="ti ti-brand-whatsapp" style={{ fontSize: 10 }}/></a>
                          : <b>{order.customer_phone || 'غير متوفر'}</b>;
                      })()}
                    </div>
                  </div>
                  <div className="poa-cust-detail">
                    <i className="ti ti-map-pin" />
                    <div>
                      <span>العنوان</span>
                      <b>{order.customer_address || 'غير متوفر'}</b>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="poa-chip-row">
                  {order.party?.code && (
                    <span className="poa-chip"><i className="ti ti-barcode" /> {order.party.code}</span>
                  )}
                  {order.party?.phone && (() => {
                    const wa = buildWhatsAppLink(order.party.phone, '');
                    return wa
                      ? <a href={wa} target="_blank" rel="noopener noreferrer" className="poa-chip" style={{ color: '#25D366', textDecoration: 'none' }} title="واتساب"><i className="ti ti-brand-whatsapp" /> {order.party.phone}</a>
                      : <span className="poa-chip"><i className="ti ti-phone" /> {order.party.phone}</span>;
                  })()}
                  {order.document?.document_date && (
                    <span className="poa-chip"><i className="ti ti-calendar" /> بتاريخ {order.document.document_date}</span>
                  )}
                </div>
              )}
            </div>

            {/* ── المسار ──────────────────────────────────────────────── */}
            <div className="poa-sec poa-sec--tight">
              <OrderPipeline status={order.status} />
            </div>

            {/* ── المنتجات ─────────────────────────────────────────────── */}
            {!editing && (
              <div className="poa-sec">
                <div className="poa-sec-t"><i className="ti ti-list-details" /> المنتجات ({order.items_count})</div>
                <SimpleTable
                  rowKey={(r) => `${r.product_id}-${r.line_id}`}
                  emptyText="لا توجد منتجات"
                  columns={[
                    {
                      key: 'product_name', label: 'المنتج',
                      render: (_v, row) => {
                        const it = row as PortalAdminOrderItem;
                        return (
                          <div>
                            <div className="poa-item-name">{it.product_name}</div>
                            {it.product_ref && <div className="poa-item-ref">{it.product_ref}</div>}
                          </div>
                        );
                      },
                    },
                    {
                      key: 'quantity', label: 'الكمية', align: 'center',
                      render: (_v, row) => {
                        const it = row as PortalAdminOrderItem;
                        return (
                          <span className="poa-bold">
                            {it.quantity}
                            {it.unit_name ? ` ${it.unit_name}` : ''}
                            {it.pack_qty > 1 ? <span className="poa-pack-em"> × {it.pack_qty}</span> : null}
                          </span>
                        );
                      },
                    },
                    { key: 'unit_price_ht', label: 'سعر HT', align: 'end', render: (v) => fmt(Number(v)) },
                    {
                      key: 'tva_rate', label: 'TVA', align: 'center',
                      render: (_v, row) => {
                        const it = row as PortalAdminOrderItem;
                        const live = it.tva_rate_live ?? it.tva_rate ?? 0;
                        const exempt = !!order?.party?.is_tva_exempt && live > (it.tva_rate ?? 0);
                        return (
                          <span className="poa-tva-cell">
                            <span>{live}%</span>
                            {exempt && (
                              <span className="poa-exempt" title={`معفى جبائياً — نُطبق 0% على هذا الزبون`}>معفى</span>
                            )}
                          </span>
                        );
                      },
                    },
                    { key: 'total_ttc', label: 'المجموع TTC', align: 'end', render: (v) => <b>{fmt(Number(v))}</b> },
                    {
                      key: 'stock', label: 'المخزون', align: 'center',
                      render: (_v, row) => <StockCell stock={stockByLine.get((row as PortalAdminOrderItem).line_id)} />,
                    },
                  ]}
                  data={order.lines ?? []}
                />
              </div>
            )}

            {/* ── محرر المنتجات ───────────────────────────────────────── */}
            {editing && (
              <div className="poa-sec">
                <div className="poa-sec-t">
                  <i className="ti ti-edit" /> تحرير المنتجات
                  <span className="poa-hint poa-hint--auto">
                    <i className="ti ti-info-circle" /> الكمية 0 تحذف المنتج — سعر الوحدة والخصم قابلان للتعديل
                  </span>
                </div>

                <div className="poa-edit-wrap">
                <table className="poa-edit-tbl">
                  <thead>
                    <tr>
                      <th className="poa-tas">المنتج</th>
                      <th className="poa-tac">الكمية</th>
                      <th className="poa-tac">سعر الوحدة HT</th>
                      <th className="poa-tac">الخصم %</th>
                      <th className="poa-tac">TVA</th>
                      <th className="poa-tac">المخزون</th>
                      <th className="poa-tae">المجموع TTC</th>
                      <th className="poa-taw40"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((l, i) => {
                      const stock = l.line_id !== null ? stockByLine.get(l.line_id) : undefined;
                      const insufficient = stock && stock.available !== null && l.quantity * l.pack_qty > stock.available;
                      const baseQty = Math.max(0, l.quantity) * (l.pack_qty > 0 ? l.pack_qty : 1);
                      const gross = baseQty * (l.unit_price_ht ?? 0);
                      const dPct = Math.min(100, Math.max(0, l.discount_percentage ?? 0));
                      // نفس المسار الذي يطبقه الخادم: خصم مبلغ ثابت ما لم يلمس
                      // المسؤول النسبة، وإلا نسبة مئوية.
                      const isFixed = !l.discountTouched && l.fixedDiscPerUnit > 0;
                      const discAmt = isFixed
                        ? l.fixedDiscPerUnit * baseQty
                        : gross * (dPct / 100);
                      const lineHt = gross - discAmt;
                      const lineTtc = lineHt * (1 + (l.tva_rate ?? 0) / 100);
                      // نسبة مئوية فعّالة للعرض في حقل الخصم (خط ثابت غير ملموس).
                      const effectivePct = isFixed
                        ? Math.min(100, (l.fixedDiscPerUnit / Math.max(0.0001, l.unit_price_ht ?? 0)) * 100)
                        : dPct;
                      const setField = (patch: Partial<DraftLine>) =>
                        setDraft((d) => d.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
                      return (
                        <tr key={l.line_id ?? `new-${i}`}>
                          <td>
                            <div className="poa-item-name">{l.product_name}</div>
                            <div className="poa-item-ref">
                              {l.product_ref}
                              {l.pack_qty > 1 ? <span className="poa-pack-note"> · تعبئة × {l.pack_qty}</span> : null}
                            </div>
                          </td>
                          <td className="poa-tac">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={l.quantity}
                              onChange={(e) => {
                                const q = Number(e.target.value);
                                setField({ quantity: Number.isFinite(q) ? q : 0 });
                              }}
                              className={`poa-alloc${insufficient ? ' bad' : ''}`}
                            />
                            {l.unit_name ? <span className="poa-unit-note">{l.unit_name}</span> : null}
                          </td>
                          <td className="poa-tac">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={l.unit_price_ht ?? 0}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setField({
                                  unit_price_ht: Number.isFinite(v) && v >= 0 ? v : 0,
                                  priceTouched: true,
                                });
                              }}
                              className="poa-alloc poa-price"
                            />
                          </td>
                          <td className="poa-tac">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={isFixed ? effectivePct : l.discount_percentage ?? 0}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setField({
                                  discount_percentage: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0,
                                  discountTouched: true,
                                });
                              }}
                              className="poa-alloc poa-disc"
                            />
                            {isFixed && (
                              <div
                                className="poa-fixed-disc"
                                title={`خصم مبلغ ثابت من طبقة الكميات (${fmt(l.fixedDiscPerUnit * baseQty)} دج) — كتابة نسبة تحوّله إلى خصم %`}
                              >
                                <i className="ti ti-lock" /> ثابت {fmt(l.fixedDiscPerUnit * baseQty)} دج
                              </div>
                            )}
                          </td>
                          <td className="poa-tac">
                            <span className="poa-bold">
                              {l.tva_rate_live ?? l.tva_rate ?? 0}%
                            </span>
                            {!!order?.party?.is_tva_exempt && (l.tva_rate_live ?? 0) > (l.tva_rate ?? 0) && (
                              <span className="poa-exempt" title="معفى جبائياً — نُطبق 0%">معفى</span>
                            )}
                          </td>
                          <td className="poa-tac">
                            <StockCell stock={stock} />
                            {insufficient && (
                              <div className="poa-stock-over">
                                يتجاوز المخزون
                              </div>
                            )}
                          </td>
                          <td className="poa-tae">
                            <b className="poa-cell-ttc">{fmt(lineTtc)}</b>
                          </td>
                          <td className="poa-tac">
                            <button
                              type="button"
                              className="icon-btn hover-red"
                              onClick={() => setDraft((d) => d.filter((_, xi) => xi !== i))}
                              title="حذف المنتج"
                            >
                              <i className="ti ti-trash" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {draft.length === 0 && (
                      <tr>
                        <td colSpan={8} className="poa-tbl-empty">
                          لا توجد منتجات — أضف منتجاً من الأسفل
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                </div>

                {/* إضافة منتج */}
                <div className="poa-addbox">
                  <div className="poa-hint"><i className="ti ti-plus" /> إضافة منتج للطلب</div>
                  <div className="poa-addrow">
                    <input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو المرجع..."
                      className="poa-add-input"
                    />
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value) || 1)}
                      className="poa-alloc poa-add-qty"
                      title="الكمية"
                    />
                  </div>
                  {addQuery.trim().length >= 2 && (
                    <div className="poa-search-box">
                      {productSearch.isLoading && (
                        <div className="poa-search-msg">جاري البحث...</div>
                      )}
                      {!productSearch.isLoading && productResults.length === 0 && (
                        <div className="poa-search-msg">لا توجد منتجات مطابقة</div>
                      )}
                      {productResults.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => addProduct(v)}
                          className="poa-search-row"
                        >
                          <span className="poa-search-name">
                            {v.name}
                            <span className="poa-search-sub">
                              {[v.ref, v.unit?.symbol].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span className="poa-search-price">{fmt(v.default_selling_price_ht ?? 0)} دج</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── الإجماليات ──────────────────────────────────────────── */}
            <div className="poa-sec">
              <div className="poa-sec-t"><i className="ti ti-calculator" /> الإجماليات</div>
              <div className="poa-totals">
                <div className="poa-total">
                  <div className="lbl">الزبون</div>
                  <div className="val poa-val-sm">{order.party?.name ?? '—'}</div>
                </div>
                {(editing ? draftTotals.disc : order.total_discount ?? 0) > 0.004 && (
                  <div className="poa-total">
                    <div className="lbl">الخصم</div>
                    <div className="val poa-val-gold">− {fmt(editing ? draftTotals.disc : order.total_discount ?? 0)} دج</div>
                  </div>
                )}
                <div className="poa-total"><div className="lbl">المجموع HT</div><div className="val">{fmt(editing ? draftTotals.ht : order.total_ht)}</div></div>
                <div className="poa-total"><div className="lbl">TVA</div><div className="val">{fmt(editing ? draftTotals.tva : order.total_tva)}</div></div>
                <div className="poa-total em"><div className="lbl">المجموع TTC</div><div className="val">{fmt(editing ? draftTotals.ttc : order.total_ttc)} دج</div></div>
              </div>
              {editing && (
                <div className="poa-hint poa-hint--mt6">
                  <i className="ti ti-calculator" /> إجماليات حيّة أثناء التعديل — تُحدَّث عند الحفظ
                </div>
              )}
            </div>

            {/* ── ملاحظات الزبون ──────────────────────────────────────── */}
            {order.notes && (
              <div className="poa-sec poa-sec--goldbg">
                <div className="poa-sec-t poa-sec-t--gold"><i className="ti ti-message" /> ملاحظات الزبون</div>
                <div className="poa-notes-txt">{order.notes}</div>
              </div>
            )}

            {/* ── سجل الحالات ─────────────────────────────────────────── */}
            <div className="poa-sec">
              <div className="poa-sec-t"><i className="ti ti-history" /> سجل الحالات</div>
              <div className="poa-tl">
                {[...(order.histories ?? [])].sort(sortByPipeline).map((h) => (
                  <div
                    key={h.id}
                    className={`poa-tl-item ${h.status === 'cancelled' || h.status === 'returned' ? 'bad' : h.status === 'delivered' ? 'done' : ''}`}
                  >
                    <div className="poa-tl-who">
                      <Badge variant={stMeta(h.status).badge} noDot>{stMeta(h.status).label}</Badge>
                      <span className="poa-tl-by">
                        بواسطة {h.changed_by_name ?? (h.changed_by === 'customer' ? 'الزبون' : 'المسؤول')}
                      </span>
                    </div>
                    {h.note && <div className="poa-tl-note">{h.note}</div>}
                    <div className="poa-tl-time">{fmtDateTime(h.created_at)}</div>
                  </div>
                ))}
                {(order.histories?.length ?? 0) === 0 && (
                  <div className="poa-hint">لا يوجد سجل بعد</div>
                )}
              </div>
            </div>

            {/* ── نتيجة التحويل ───────────────────────────────────────── */}
            {convertResult && (
              <div className="poa-sec poa-sec--embg">
                <div className="poa-conv-title">
                  <i className="ti ti-circle-check" />
                  تم التحويل بنجاح — أمر الزبون أصبح مستند بيع
                </div>
                <div className="poa-conv-meta">
                  <b className="poa-mono">{convertResult.document_number}</b>
                  <span className="poa-chip"><i className="ti ti-file-invoice" /> {convertResult.document_type === 'POS' ? 'فاتورة POS' : 'فاتورة بيع (FV)'}</span>
                  <span className="poa-hint"><i className="ti ti-calendar" /> {fmtDate(convertResult.document_date)}</span>
                  <span className="poa-hint"><i className="ti ti-coins" /> الصافي للدفع <b>{fmt(convertResult.net_to_pay)} DZD</b></span>
                  {convertResult.paid_amount > 0 && (
                    <span className="poa-hint poa-hint--ok"><i className="ti ti-wallet" /> مدفوع <b>{fmt(convertResult.paid_amount)} DZD</b></span>
                  )}
                  {convertResult.remaining_amount > 0 && (
                    <span className="poa-hint poa-hint--gold"><i className="ti ti-alert-triangle" /> باقي <b>{fmt(convertResult.remaining_amount)} DZD</b></span>
                  )}
                </div>
                {(() => {
                  const phone = String(order?.party?.phone ?? order?.customer_phone ?? '');
                  if (!phone) return null;
                  const handleClick = async () => {
                    let shareUrl: string | null = null;
                    try {
                      const res = await documentsApi.share(convertResult.id);
                      shareUrl = res.share_url;
                    } catch { /* share not critical */ }
                    const msg = waDocMessage({
                      document_number: convertResult.document_number,
                      document_date: convertResult.document_date,
                      document_type_name: convertResult.document_type === 'POS' ? 'فاتورة POS' : 'فاتورة بيع',
                      document_type_code: convertResult.document_type,
                      party_name: order?.party?.name ?? order?.customer_name ?? null,
                      total_ttc: convertResult.total_ttc,
                      net_to_pay: convertResult.net_to_pay,
                      paid_amount: convertResult.paid_amount,
                      remaining_amount: convertResult.remaining_amount,
                    }, shareUrl);
                    const waLink = buildWhatsAppLink(phone, msg);
                    if (waLink) window.open(waLink, '_blank', 'noopener,noreferrer');
                  };
                  return (
                    <div className="mt-8">
                      <Button size="sm" icon={<i className="ti ti-brand-whatsapp" />} style={{ background: '#25D366', borderColor: '#25D366', color: '#fff' }} onClick={handleClick}>
                        إرسال الفاتورة على واتساب
                      </Button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="poa-hint poa-hint--pad">الطلب غير موجود</div>
        )}
      </Modal>

      {/* ════ نافذة المعالجة (Wizard) ════ */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="معالجة الطلب"
        subtitle={order?.reference ? `توزيع الكميات على المخزون — ${order.reference}` : undefined}
        size="lg"
        className="poa-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setWizardOpen(false)} disabled={linesMut.isPending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              icon={<i className="ti ti-settings" />}
              loading={linesMut.isPending}
              onClick={saveProcess}
            >
              إكمال المعالجة وتوزيع الكميات
            </Button>
          </>
        }
      >
        <div className="poa-col">
          {/* ── مقياس الجاهزية ───────────────────────────────────────── */}
          <div className="poa-proc-hd">
            <div className="poa-proc-gauge-wrap">
              <div className={`poa-proc-gauge${wizTotals.pct >= 100 && !wizTotals.anyBad ? ' done' : wizTotals.anyBad ? ' bad' : ''}`}>
                <span style={{ width: `${wizTotals.pct}%` }} />
              </div>
              <div className="poa-proc-meta">
                <span>مطلوب <b>{fmt(wizTotals.orderedBase)}</b></span>
                <span>مُوزَّع <b>{fmt(wizTotals.allocBase)}</b></span>
                {wizTotals.anyBad && <span className="poa-proc-warn">⚠ كميات تتجاوز المخزون الكلي</span>}
                {!wizTotals.anyBad && wizTotals.anyWarn && <span className="poa-proc-info">ⓘ تُغطّى من مستودعات أخرى</span>}
              </div>
            </div>
            <div className="poa-proc-pct">{wizTotals.pct}%</div>
          </div>

          {/* ── صفوف المنتجات ────────────────────────────────────────── */}
          <div className="poa-proc-rows">
            {allocs.map((a, i) => {
              const need = Math.max(0, a.alloc || 0) * a.pack_qty;
              const orderedBase = a.ordered * a.pack_qty;
              const pct = orderedBase ? Math.min(100, Math.round((need / orderedBase) * 100)) : 0;
              const fit = fitOf(a);
              return (
                <div key={a.line_id} className="poa-proc-row">
                  <div className="poa-grow">
                    <div className="poa-proc-name">{a.product_name}</div>
                    <div className="poa-proc-ref">{a.product_ref ?? ''}</div>
                  </div>

                  <span className="poa-chip" title="الكمية المطلوبة">
                    <i className="ti ti-basket" /> {a.ordered} {a.unit_name ?? ''}{a.pack_qty > 1 ? ` × ${a.pack_qty}` : ''}
                  </span>

                  <div className="poa-proc-qty">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={a.alloc}
                      onChange={(e) => {
                        const q = Number(e.target.value);
                        setAllocs((list) => list.map((x, xi) => (xi === i ? { ...x, alloc: Number.isFinite(q) ? q : 0 } : x)));
                      }}
                      className={`poa-alloc${fit === 'bad' ? ' bad' : ''}`}
                      title="الكمية الموزَّعة (0 تحذف المنتج)"
                    />
                    <span className="poa-stk-sub">{a.unit_name ?? ''}</span>
                  </div>

                  <div className={`poa-bar${fit === 'ok' ? ' ok' : fit === 'bad' ? ' bad' : ''}`}>
                    <span style={{ width: `${pct}%` }} />
                  </div>

                  <div className="poa-proc-stock">
                    {a.available === null ? (
                      <span className="na"><i className="ti ti-package-off" /> لا يدير مخزوناً</span>
                    ) : (
                      <>
                        <span className={fit === 'ok' || fit === 'part' ? 'ok' : 'bad'}>
                          <i className={`ti ${fit === 'bad' ? 'ti-alert-triangle' : 'ti-circle-check'}`} />
                          المستودع: {fmt(a.available)}
                        </span>
                        <span className={fit === 'bad' ? 'bad' : 'ok'}>
                          <i className="ti ti-box" /> إجمالاً: {fmt(a.available_all ?? 0)}
                        </span>
                      </>
                    )}
                    <span>مطلوب {fmt(a.required)}</span>
                  </div>
                </div>
              );
            })}
            {allocs.length === 0 && (
              <div className="poa-hint poa-hint--pad20">لا توجد منتجات للمعالجة</div>
            )}
          </div>

          <div className="poa-hint">
            <i className="ti ti-info-circle" />
            الكمية 0 تحذف المنتج — التحقق من المخزون غير حاجز هنا، لكن التحويل إلى الفاتورة يتطلب كمية كافية.
          </div>
        </div>
      </Modal>

      {/* ════ نافذة تحويل الطلب إلى فاتورة (FV/POS + دفعة اختيارية) ════ */}
      <Modal
        open={convertOpen}
        onClose={() => {
          if (!convert.isPending) setConvertOpen(false);
        }}
        title="تحويل الطلب إلى فاتورة"
        subtitle={order?.reference ? `إنشاء مستند البيع — ${order.reference}` : undefined}
        size="sm"
        className="poa-modal"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConvertOpen(false)} disabled={convert.isPending}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              icon={<i className="ti ti-file-invoice" />}
              loading={convert.isPending}
              onClick={doConvert}
              className="poa-btn-gold"
            >
              تحويل الآن
            </Button>
          </>
        }
      >
        <div className="poa-col">
          {/* ── ملخص إجماليات الطلب قبل التحويل ─────────────────────── */}
          {order && (
            <div className="poa-cv-sum">
              <div><i className="ti ti-box" /> المنتجات <b>{order.items_count}</b></div>
              <div><i className="ti ti-percentage" /> الخصم <b>{fmt(order.total_discount ?? 0)}</b></div>
              <div><i className="ti ti-coin" /> إجمالي HT <b>{fmt(order.total_ht ?? 0)}</b></div>
              <div><i className="ti ti-cash" /> TVA <b>{fmt(order.total_tva ?? 0)}</b></div>
              <div className="poa-cv-total"><i className="ti ti-wallet" /> الصافي للدفع <b>{fmt(order.total_ttc ?? 0)} دج</b></div>
            </div>
          )}

          {/* ── اختيار نوع مستند البيع ───────────────────────────────── */}
          <div className="poa-grid2">
            <button type="button" className={`poa-cv-t${convertTarget === 'FV' ? ' on' : ''}`} onClick={() => setConvertTarget('FV')}>
              <i className="ti ti-file-invoice" />
              <b>فاتورة بيع (FV)</b>
              <span>مستند بيع محاسبي كامل</span>
            </button>
            <button type="button" className={`poa-cv-t${convertTarget === 'POS' ? ' on' : ''}`} onClick={() => setConvertTarget('POS')}>
              <i className="ti ti-device-mobile" />
              <b>فاتورة POS</b>
              <span>مستند نقطة البيع</span>
            </button>
          </div>

          <div className="poa-hint">
            <i className="ti ti-info-circle" />
            التحويل يُنشئ مستند بيع يُفعِّل حركة المخزون والطابع الجبائي وقيود الرصيد — مرة واحدة فقط ولا يمكن التراجع.
            {order && order.status !== 'delivered' ? ' الوضع يقفز إلى «تم التسليم».' : ''}
          </div>

          {/* ── دفعة اختيارية ─────────────────────────────────────────── */}
          <label className="poa-check-lbl">
            <input type="checkbox" checked={payEnabled} onChange={(e) => {
              const on = e.target.checked;
              setPayEnabled(on);
              if (on && !payAmount && order) setPayAmount(String(Math.round(order.total_ttc * 100) / 100));
            }} />
            تسجيل دفعة الآن (اختياري)
          </label>

          {payEnabled && order && (() => {
            const net = Number(order.total_ttc) || 0;
            const amt = Number(payAmount) || 0;
            const rem = net - amt;
            const overpay = amt > 0 && rem < 0;
            return (
              <div className="poa-col10">
                <div className="poa-select">
                  <i className="ti ti-credit-card" />
                  <select value={payModeId} onChange={(e) => setPayModeId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">— اختر طريقة الدفع —</option>
                    {(paymentModes.data ?? []).map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="poa-row-end">
                  <div className="poa-field">
                    <label className="poa-field-lbl">المبلغ (دج)</label>
                    <input
                      type="number" min={0.01} step="any"
                      className="poa-alloc poa-alloc--full"
                      value={payAmount}
                      placeholder="مبلغ الدفعة"
                      onChange={(e) => setPayAmount(e.target.value)}
                    />
                  </div>
                  <div className="poa-date">
                    <i className="ti ti-calendar" />
                    <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
                  </div>
                </div>
                <div className="poa-row-center">
                  <button
                    type="button"
                    className="poa-cv-full"
                    onClick={() => setPayAmount(String(Math.round(net * 100) / 100))}
                  >
                    <i className="ti ti-coins" /> المبلغ كاملاً
                  </button>
                  <span className={`poa-cv-rem${overpay ? ' over' : amt > 0 ? ' ok' : ''}`}>
                    <i className={`ti ${overpay ? 'ti-alert-triangle' : 'ti-scale'}`} />
                    {amt > 0
                      ? (overpay
                          ? `تنبيه: المبلغ أكبر من الصافي — الزيادة ${fmt(Math.abs(rem))} دج`
                          : `المتبقي بعد الدفعة: ${fmt(rem)} دج`)
                      : 'المتبقي بعد الدفعة: كامل الصافي (أدخل المبلغ)'}
                  </span>
                </div>
                <input
                  type="text"
                  className="poa-alloc poa-alloc--full"
                  placeholder="مرجع الدفعة (اختياري)"
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                />
              </div>
            );
          })()}
        </div>
      </Modal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

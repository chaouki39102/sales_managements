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
  type PortalOrderConvertResult,
} from '@/lib/api/endpoints/portalOrders';
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

  const perPage = 15;

  const { data, isLoading } = usePortalOrders({ page, per_page: perPage, status, search: debouncedSearch, from_date: fromDate || undefined, to_date: toDate || undefined });
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
  const convertable = !!order && ['confirmed', 'processed', 'shipped'].includes(order.status);

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
        discount_percentage: it.discount_percentage ?? 0,
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
        // نُرسل سعر الوحدة والخصم فقط عند التعديل الفعلي حتى لا نمس أسعار الخادم
        // في المرة الأولى (الواجهة تحمل القيم المخزّنة مطابقة، فلن يتغير شيء).
        return {
          ...base,
          unit_price_ht: Math.round((l.unit_price_ht ?? 0) * 10000) / 10000,
          discount_percentage: l.discount_percentage ?? 0,
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
  // CommercialDocumentService (قاعدة × سعر وحدة × خصم % ثم TVA على HT).
  const draftTotals = useMemo(() => {
    let ht = 0, tva = 0, disc = 0;
    for (const l of draft) {
      const qty = Math.max(0, l.quantity);
      const baseQty = qty * (l.pack_qty > 0 ? l.pack_qty : 1);
      const gross = baseQty * (l.unit_price_ht ?? 0);
      const d = Math.min(100, Math.max(0, l.discount_percentage ?? 0));
      const discAmt = gross * (d / 100);
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

  const handleConvert = async () => {
    if (!detailId) return;
    const ok = await confirm(
      'سيتم تحويل هذا الطلب إلى فاتورة بيع (FV) — تُفعَّل حركة المخزون والطابع الجبائي وقيود الرصيد ولا يمكن التراجع. متابعة؟',
      { title: 'تحويل الطلب إلى فاتورة', confirmText: 'تحويل الآن', variant: 'warning', icon: 'ti-file-invoice' },
    );
    if (!ok) return;
    convert.mutate(
      { id: detailId },
      {
        onSuccess: (res) => {
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
        <div className="poa-sec" style={{ padding: '6px 12px' }}>
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
          isLoading={isLoading}
          emptyText="لا توجد طلبات مطابقة"
          rowKey="id"
          onRowClick={(row) => openDetail(row as PortalAdminOrder)}
          columns={[
            {
              key: 'reference', label: 'المرجع', align: 'center',
              render: (v) => <b style={{ direction: 'ltr', fontFamily: 'Consolas, monospace', fontSize: 12.5 }}>{v as string}</b>,
            },
            {
              key: 'requested_at', label: 'التاريخ', align: 'center',
              render: (v) => <span style={{ color: 'var(--t3)', fontWeight: 600, fontSize: 12 }}>{fmtDate(v as string)}</span>,
            },
            {
              key: 'party', label: 'الزبون',
              render: (_v, row) => {
                const p = (row as PortalAdminOrder).party;
                return (
                  <div className="poa-cust">
                    <span className="poa-avatar">{initialsOf(p?.name)}</span>
                    <span className="poa-cust-meta">
                      <span className="poa-cust-name">{p?.name ?? '—'}</span>
                      <span className="poa-cust-sub">{p?.code ?? ''}</span>
                    </span>
                  </div>
                );
              },
            },
            {
              key: 'items_count', label: 'المنتجات', align: 'center',
              render: (v) => <span style={{ color: 'var(--t3)', fontWeight: 700 }}>{v as number}</span>,
            },
            {
              key: 'total_ttc', label: 'المجموع TTC', align: 'end',
              render: (v) => <b>{fmt(Number(v))} <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--t4)' }}>دج</span></b>,
            },
            {
              key: 'status', label: 'الحالة', align: 'center',
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
          <div className="poa-bar" style={{ marginTop: 6 }}>
            <span className="poa-hint">صفحة {meta.current_page} من {meta.last_page}</span>
            <div style={{ display: 'flex', gap: 6 }}>
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
        footerLeft={!editing && canEdit && (
          <Button variant="outline" size="sm" icon={<i className="ti ti-edit" />} onClick={startEditing}>
            تحرير المنتجات
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
              {convertable && (
                <Button
                  variant="primary"
                  icon={<i className="ti ti-file-invoice" />}
                  loading={convert.isPending}
                  onClick={handleConvert}
                  style={{ background: 'var(--gold)', borderColor: 'var(--gold)', color: '#fff' }}
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
          <div className="poa-hint" style={{ padding: 30, justifyContent: 'center' }}>جاري التحميل...</div>
        ) : order ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* ── الزبون ─────────────────────────────────────────────── */}
            <div className="poa-sec">
              <div className="poa-cust-card">
                <span className="poa-avatar">{initialsOf(order.party?.name)}</span>
                <span className="poa-cust-card-info">
                  <span className="poa-cust-card-name">{order.party?.name ?? '—'}</span>
                  <span className="poa-cust-card-sub">
                    أمر زبون {order.document?.document_number ?? ''} · أُرسل في {fmtDate(order.requested_at)}
                  </span>
                </span>
                <Badge variant={stMeta(order.status).badge} style={{ marginInlineStart: 'auto' }}>
                  {order.status_label}
                </Badge>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {order.party?.code && (
                  <span className="poa-chip"><i className="ti ti-barcode" /> {order.party.code}</span>
                )}
                {order.party?.phone && (
                  <span className="poa-chip"><i className="ti ti-phone" /> {order.party.phone}</span>
                )}
                {order.document?.document_date && (
                  <span className="poa-chip"><i className="ti ti-calendar" /> بتاريخ {order.document.document_date}</span>
                )}
              </div>
            </div>

            {/* ── المسار ──────────────────────────────────────────────── */}
            <div className="poa-sec" style={{ padding: '6px 12px' }}>
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
                            <div style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--t1)' }}>{it.product_name}</div>
                            {it.product_ref && <div style={{ fontSize: 10.5, color: 'var(--t4)', fontWeight: 600 }}>{it.product_ref}</div>}
                          </div>
                        );
                      },
                    },
                    {
                      key: 'quantity', label: 'الكمية', align: 'center',
                      render: (_v, row) => {
                        const it = row as PortalAdminOrderItem;
                        return (
                          <span style={{ fontWeight: 700 }}>
                            {it.quantity}
                            {it.unit_name ? ` ${it.unit_name}` : ''}
                            {it.pack_qty > 1 ? <span style={{ color: 'var(--em)', fontSize: 10.5 }}> × {it.pack_qty}</span> : null}
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
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
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
                  <span className="poa-hint" style={{ marginInlineStart: 'auto' }}>
                    <i className="ti ti-info-circle" /> الكمية 0 تحذف المنتج — سعر الوحدة والخصم قابلان للتعديل
                  </span>
                </div>

                <table className="poa-edit-tbl">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'start' }}>المنتج</th>
                      <th style={{ textAlign: 'center' }}>الكمية</th>
                      <th style={{ textAlign: 'center' }}>سعر الوحدة HT</th>
                      <th style={{ textAlign: 'center' }}>الخصم %</th>
                      <th style={{ textAlign: 'center' }}>TVA</th>
                      <th style={{ textAlign: 'center' }}>المخزون</th>
                      <th style={{ textAlign: 'end' }}>المجموع TTC</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.map((l, i) => {
                      const stock = l.line_id !== null ? stockByLine.get(l.line_id) : undefined;
                      const insufficient = stock && stock.available !== null && l.quantity * l.pack_qty > stock.available;
                      const baseQty = Math.max(0, l.quantity) * (l.pack_qty > 0 ? l.pack_qty : 1);
                      const gross = baseQty * (l.unit_price_ht ?? 0);
                      const dPct = Math.min(100, Math.max(0, l.discount_percentage ?? 0));
                      const lineHt = gross * (1 - dPct / 100);
                      const lineTtc = lineHt * (1 + (l.tva_rate ?? 0) / 100);
                      const setField = (patch: Partial<DraftLine>) =>
                        setDraft((d) => d.map((x, xi) => (xi === i ? { ...x, ...patch } : x)));
                      return (
                        <tr key={l.line_id ?? `new-${i}`}>
                          <td>
                            <div style={{ fontWeight: 800, fontSize: 12.5, color: 'var(--t1)' }}>{l.product_name}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--t4)', fontWeight: 600 }}>
                              {l.product_ref}
                              {l.pack_qty > 1 ? <span style={{ color: 'var(--em)' }}> · تعبئة × {l.pack_qty}</span> : null}
                            </div>
                          </td>
                          <td style={{ textAlign: 'center' }}>
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
                            {l.unit_name ? <span style={{ marginInlineStart: 5, color: 'var(--t4)', fontSize: 11 }}>{l.unit_name}</span> : null}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={l.unit_price_ht ?? 0}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setField({ unit_price_ht: Number.isFinite(v) && v >= 0 ? v : 0 });
                              }}
                              className="poa-alloc poa-price"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step="any"
                              value={l.discount_percentage ?? 0}
                              onChange={(e) => {
                                const v = Number(e.target.value);
                                setField({ discount_percentage: Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0 });
                              }}
                              className="poa-alloc poa-disc"
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 700 }}>
                              {l.tva_rate_live ?? l.tva_rate ?? 0}%
                            </span>
                            {!!order?.party?.is_tva_exempt && (l.tva_rate_live ?? 0) > (l.tva_rate ?? 0) && (
                              <span className="poa-exempt" title="معفى جبائياً — نُطبق 0%">معفى</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <StockCell stock={stock} />
                            {insufficient && (
                              <div style={{ color: 'var(--red)', fontSize: 10.5, fontWeight: 800, marginTop: 2 }}>
                                يتجاوز المخزون
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'end' }}>
                            <b style={{ fontSize: 12.5 }}>{fmt(lineTtc)}</b>
                          </td>
                          <td style={{ textAlign: 'center' }}>
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
                        <td colSpan={8} style={{ padding: '18px', textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
                          لا توجد منتجات — أضف منتجاً من الأسفل
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* إضافة منتج */}
                <div style={{ border: '1px dashed var(--b3)', borderRadius: 'var(--r2)', padding: 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="poa-hint"><i className="ti ti-plus" /> إضافة منتج للطلب</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      value={addQuery}
                      onChange={(e) => setAddQuery(e.target.value)}
                      placeholder="ابحث بالاسم أو المرجع..."
                      style={{
                        flex: 1, minWidth: 180, padding: '8px 10px', borderRadius: 'var(--r2)',
                        border: '1px solid var(--b3)', background: 'var(--bg1)', color: 'var(--t1)',
                        fontSize: 12.5, fontFamily: 'Tajawal, sans-serif', outline: 'none',
                      }}
                    />
                    <input
                      type="number"
                      min={1}
                      step="any"
                      value={addQty}
                      onChange={(e) => setAddQty(Number(e.target.value) || 1)}
                      className="poa-alloc"
                      style={{ width: 64 }}
                      title="الكمية"
                    />
                  </div>
                  {addQuery.trim().length >= 2 && (
                    <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid var(--b1)', borderRadius: 'var(--r2)', background: 'var(--bg2)' }}>
                      {productSearch.isLoading && (
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>جاري البحث...</div>
                      )}
                      {!productSearch.isLoading && productResults.length === 0 && (
                        <div style={{ padding: 12, textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>لا توجد منتجات مطابقة</div>
                      )}
                      {productResults.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => addProduct(v)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            width: '100%', padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--b1)',
                            background: 'none', cursor: 'pointer', fontSize: 12.5, fontFamily: 'Tajawal, sans-serif',
                            color: 'var(--t1)', textAlign: 'start',
                          }}
                        >
                          <span style={{ fontWeight: 700 }}>
                            {v.name}
                            <span style={{ color: 'var(--t4)', fontWeight: 500, fontSize: 11, marginInlineStart: 6 }}>
                              {[v.ref, v.unit?.symbol].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                          <span style={{ color: 'var(--em)', fontWeight: 700, fontSize: 12 }}>{fmt(v.default_selling_price_ht ?? 0)} دج</span>
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
                  <div className="val" style={{ fontSize: 12, fontWeight: 700 }}>{order.party?.name ?? '—'}</div>
                </div>
                {(editing ? draftTotals.disc : order.total_discount ?? 0) > 0.004 && (
                  <div className="poa-total">
                    <div className="lbl">الخصم</div>
                    <div className="val" style={{ color: 'var(--gold)' }}>− {fmt(editing ? draftTotals.disc : order.total_discount ?? 0)} دج</div>
                  </div>
                )}
                <div className="poa-total"><div className="lbl">المجموع HT</div><div className="val">{fmt(editing ? draftTotals.ht : order.total_ht)}</div></div>
                <div className="poa-total"><div className="lbl">TVA</div><div className="val">{fmt(editing ? draftTotals.tva : order.total_tva)}</div></div>
                <div className="poa-total em"><div className="lbl">المجموع TTC</div><div className="val">{fmt(editing ? draftTotals.ttc : order.total_ttc)} دج</div></div>
              </div>
              {editing && (
                <div className="poa-hint" style={{ marginTop: 6 }}>
                  <i className="ti ti-calculator" /> إجماليات حيّة أثناء التعديل — تُحدَّث عند الحفظ
                </div>
              )}
            </div>

            {/* ── ملاحظات الزبون ──────────────────────────────────────── */}
            {order.notes && (
              <div className="poa-sec" style={{ background: 'var(--goldb)', borderColor: 'var(--b3)' }}>
                <div className="poa-sec-t" style={{ color: 'var(--gold)' }}><i className="ti ti-message" /> ملاحظات الزبون</div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t2)' }}>{order.notes}</div>
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
                      <span style={{ color: 'var(--t4)', fontWeight: 600, fontSize: 11 }}>
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
              <div className="poa-sec" style={{ background: 'var(--emb)', borderColor: 'var(--b3)' }}>
                <div style={{ fontWeight: 800, color: 'var(--g)' }}>
                  <i className="ti ti-circle-check" style={{ marginInlineEnd: 6 }} />
                  تم التحويل بنجاح — أمر الزبون أصبح فاتورة بيع
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6, fontSize: 12.5, fontWeight: 700, color: 'var(--t2)' }}>
                  <b style={{ direction: 'ltr' }}>{convertResult.document_number}</b>
                  <span className="poa-hint"><i className="ti ti-calendar" /> {fmtDate(convertResult.document_date)}</span>
                  <span className="poa-hint"><i className="ti ti-coins" /> الصافي للدفع <b>{fmt(convertResult.net_to_pay)} DZD</b></span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="poa-hint" style={{ padding: 30, justifyContent: 'center' }}>الطلب غير موجود</div>
        )}
      </Modal>

      {/* ════ نافذة المعالجة (Wizard) ════ */}
      <Modal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        title="معالجة الطلب"
        subtitle={order?.reference ? `توزيع الكميات على المخزون — ${order.reference}` : undefined}
        size="lg"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── مقياس الجاهزية ───────────────────────────────────────── */}
          <div className="poa-proc-hd">
            <div className="poa-proc-gauge-wrap">
              <div className={`poa-proc-gauge${wizTotals.pct >= 100 && !wizTotals.anyBad ? ' done' : wizTotals.anyBad ? ' bad' : ''}`}>
                <span style={{ width: `${wizTotals.pct}%` }} />
              </div>
              <div className="poa-proc-meta">
                <span>مطلوب <b>{fmt(wizTotals.orderedBase)}</b></span>
                <span>مُوزَّع <b>{fmt(wizTotals.allocBase)}</b></span>
                {wizTotals.anyBad && <span style={{ color: 'var(--red)' }}>⚠ كميات تتجاوز المخزون الكلي</span>}
                {!wizTotals.anyBad && wizTotals.anyWarn && <span style={{ color: 'var(--gold)' }}>ⓘ تُغطّى من مستودعات أخرى</span>}
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
                  <div style={{ flex: 1, minWidth: 0 }}>
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
              <div className="poa-hint" style={{ justifyContent: 'center', padding: 20 }}>لا توجد منتجات للمعالجة</div>
            )}
          </div>

          <div className="poa-hint">
            <i className="ti ti-info-circle" />
            الكمية 0 تحذف المنتج — التحقق من المخزون غير حاجز هنا، لكن التحويل إلى الفاتورة يتطلب كمية كافية.
          </div>
        </div>
      </Modal>

      <ConfirmDialog {...confirmDialogProps} />
    </div>
  );
}

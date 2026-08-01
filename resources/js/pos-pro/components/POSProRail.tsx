// ════════════════════════════════════════════════════════════════════════════
// pos-pro/components/POSProRail.tsx
//
// شريط الإجراءات الرأسي — يمين صفحة POS PRO (الأول في ترتيب DOM فيقف يمين
// RTL). يضم الإجراءات الأساسية للكاشير:
//   • منتجات      — فتح منتقي المنتجات (زر رئيسي كبير).
//   • جديد        — بيع جديد: يعلّق السلة الحالية (إن لم تكن فارغة) ويفتح سلة فارغة.
//   • الدفع (Pay) — فتح مودال الدفع مع الزبون.
//   • دفع سريع    — زر ذهبي: بيع نقدي بضغطة واحدة بدون مودال.
//   • فتح السلة   — تمرير إلى السلة (اختصار تمرير عند السلات الطويلة).
//
// إعادة الترتيب بالسحب: كل زر قابل للسحب (مؤشر / لمس) لإعادة ترتيب الشريط؛
// الترتيب يُحفظ في localStorage لكل شركة (`pos-pro-rail-order-<slug>`).
// النقر البسيط ينفّذ الإجراء كالمعتاد — السحب فقط يعيد الترتيب.
//
// إظهار/إخفاء الأزرار: زر "تخصيص" أسفل الشريط يفتح مودال بخانات تشغيل لكل زر؛
// المخفي يُحفظ في localStorage لكل شركة (`pos-pro-rail-hidden-<slug>`)
// ويبقى محتفظاً بموقعه في الترتيب (يظهر عند إعادة تفعيله).
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useActiveSlug } from '@/lib/store/appStore';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';

interface Props {
  canSell:      boolean;
  isBusy:       boolean;
  onNewSale:    () => void;
  onOpenProducts: () => void;
  onPay:        () => void;
  onQuickPay:   () => void;
  onSession:    () => void;
  sessionAvailable: boolean;
  onHold:       () => void;
  onHeld:       () => void;
  heldCount:    number;
  onReturns:    () => void;
  onHelp:       () => void;
  onScrollToCart: () => void;
  onManual:     () => void;
  onSessionInvoices: () => void;
  onFullscreen: () => void;
  onOpenDrawer: () => void;
  onSettings:   () => void;
}

type RailAction =
  | 'products' | 'newSale' | 'pay' | 'quickPay' | 'manual' | 'hold' | 'held'
  | 'returns' | 'session' | 'sessionInvoices' | 'cart'
  | 'drawer' | 'fullscreen' | 'settings' | 'help';

const STORAGE_KEY     = 'pos-pro-rail-order-';
const STORAGE_KEY_HIDDEN = 'pos-pro-rail-hidden-';
const DRAG_THRESHOLD  = 6;

/** مواضع الفواصل (بعد الفهارس التالية في القائمة المرتّبة) */
const SEP_AFTER = new Set<number>([3, 7, 10]);

const DEFAULT_ORDER: RailAction[] = [
  'products', 'newSale', 'pay', 'quickPay', 'manual', 'hold', 'held', 'returns',
  'session', 'sessionInvoices', 'cart', 'drawer', 'fullscreen', 'settings', 'help',
];

const BUTTON_META: Record<RailAction, { label: string; icon: string; className: string; baseTitle: string }> = {
  products:        { label: 'المنتجات',      icon: 'ti-package',            className: 'pp-rail-btn pp-rail-btn--primary', baseTitle: 'فتح منتقي المنتجات' },
  newSale:         { label: 'جديد',          icon: 'ti-file-plus',          className: 'pp-rail-btn pp-rail-btn--new',     baseTitle: 'بيع جديد (تعليق السلة الحالية)' },
  pay:             { label: 'الدفع',         icon: 'ti-cash-register',      className: 'pp-rail-btn pp-rail-btn--pay',     baseTitle: 'فتح نافذة الدفع' },
  quickPay:        { label: 'دفع سريع',      icon: 'ti-bolt',               className: 'pp-rail-btn pp-rail-btn--gold',    baseTitle: 'بيع نقدي بضغطة واحدة' },
  manual:          { label: 'يدوي',          icon: 'ti-square-plus',        className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'إضافة صنف يدوي بدون منتج' },
  hold:            { label: 'تعليق',         icon: 'ti-clock-pause',        className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'تعليق الفاتورة الحالية' },
  held:            { label: 'المعلقة',       icon: 'ti-list-check',         className: 'pp-rail-btn pp-rail-btn--ghost pp-rail-btn--badge', baseTitle: 'الفواتير المعلقة' },
  returns:         { label: 'مرتجع',         icon: 'ti-receipt-refund',     className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'مرتجع من فاتورة' },
  session:         { label: 'الجلسة',        icon: 'ti-report-money',       className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'الجلسة الحالية' },
  sessionInvoices: { label: 'فواتير الجلسة', icon: 'ti-receipt-2',          className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'فواتير الجلسة الحالية' },
  cart:            { label: 'السلة',         icon: 'ti-shopping-cart-down', className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'مرّر إلى السلة' },
  drawer:          { label: 'الدرج',         icon: 'ti-cash',               className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'فتح درج النقود' },
  fullscreen:      { label: 'ملء الشاشة',    icon: 'ti-arrows-maximize',    className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'ملء الشاشة' },
  settings:        { label: 'الإعدادات',     icon: 'ti-settings',           className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'إعدادات نقطة البيع' },
  help:            { label: 'مساعدة',        icon: 'ti-keyboard',           className: 'pp-rail-btn pp-rail-btn--ghost pp-rail-btn--help', baseTitle: 'تخصيص الاختصارات (F1)' },
};

function loadOrder(slug: string | null): RailAction[] {
  if (!slug) return DEFAULT_ORDER;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${slug}`);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER;
    const valid = parsed.filter((x): x is RailAction => (DEFAULT_ORDER as readonly string[]).includes(x as string));
    const merged = [...valid, ...DEFAULT_ORDER.filter(id => !valid.includes(id))];
    return merged;
  } catch { return DEFAULT_ORDER; }
}

function loadHidden(slug: string | null): Set<RailAction> {
  const hidden = new Set<RailAction>();
  if (!slug) return hidden;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_HIDDEN}${slug}`);
    if (!raw) return hidden;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return hidden;
    for (const x of parsed) {
      if ((DEFAULT_ORDER as readonly string[]).includes(x as string)) hidden.add(x as RailAction);
    }
  } catch { /* ignore */ }
  return hidden;
}

export default function POSProRail({
  canSell, isBusy, onNewSale, onOpenProducts, onPay, onQuickPay, onSession, sessionAvailable,
  onHold, onHeld, heldCount, onReturns, onHelp, onScrollToCart,
  onManual, onSessionInvoices, onFullscreen, onOpenDrawer, onSettings,
}: Props) {
  const slug = useActiveSlug();

  const [order, setOrder]     = useState<RailAction[]>(() => loadOrder(slug));
  const [hidden, setHidden]   = useState<Set<RailAction>>(() => loadHidden(slug));
  const [manageOpen, setManageOpen] = useState(false);
  const [dragId, setDragId]   = useState<RailAction | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragAxis, setDragAxis]     = useState<'x' | 'y'>('y');
  const [overIndex, setOverIndex]   = useState<number | null>(null);

  const railRef    = useRef<HTMLElement>(null);
  const btnRefs    = useRef(new Map<RailAction, HTMLButtonElement>());
  const dragRef    = useRef<{ id: RailAction; startX: number; startY: number; active: boolean } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(`${STORAGE_KEY}${slug}`, JSON.stringify(order)); } catch { /* ignore */ }
  }, [order, slug]);

  useEffect(() => {
    if (!slug) return;
    try { localStorage.setItem(`${STORAGE_KEY_HIDDEN}${slug}`, JSON.stringify([...hidden])); } catch { /* ignore */ }
  }, [hidden, slug]);

  /* إعادة تحميل الترتيب والإخفاء عند تبديل الشركة (الصفحة قد تبقى مثبّتة) */
  const prevSlugRef = useRef(slug);
  useEffect(() => {
    if (prevSlugRef.current !== slug) {
      prevSlugRef.current = slug;
      setOrder(loadOrder(slug));
      setHidden(loadHidden(slug));
    }
  }, [slug]);

  const toggleHidden = useCallback((id: RailAction) => {
    setHidden(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const resetLayout = useCallback(() => {
    setOrder(DEFAULT_ORDER);
    setHidden(new Set());
    setManageOpen(false);
    if (!slug) return;
    try {
      localStorage.removeItem(`${STORAGE_KEY}${slug}`);
      localStorage.removeItem(`${STORAGE_KEY_HIDDEN}${slug}`);
    } catch { /* ignore */ }
  }, [slug]);

  /** محور الشريط: عمودي على سطح المكتب، أفقي على الشاشات الصغيرة */
  const railAxis = useCallback((): 'x' | 'y' => {
    const rail = railRef.current;
    if (!rail) return 'y';
    const fd = getComputedStyle(rail).flexDirection;
    return fd === 'row' || fd === 'row-reverse' ? 'x' : 'y';
  }, []);

  /** فهرس الإدراج المستهدف (قبل العنصر الأول الذي يتجاوز المؤشر وسطه) */
  const computeOverIndex = useCallback((pointer: number, dragging: RailAction): number => {
    const a = railAxis();
    let target = order.length;
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      if (id === dragging) continue;
      const el = btnRefs.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = a === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
      if (pointer < mid) { target = i; break; }
    }
    return target;
  }, [order, railAxis]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: RailAction) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, active: false };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: RailAction) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    const a  = railAxis();
    const dist = a === 'x' ? dx : dy;
    if (!d.active) {
      if (Math.abs(dist) < DRAG_THRESHOLD) return;
      d.active = true;
      setDragAxis(a);
      setDragId(id);
      setDragOffset(dist);
      setOverIndex(computeOverIndex(a === 'x' ? e.clientX : e.clientY, id));
      return;
    }
    if (e.cancelable) e.preventDefault();
    setDragOffset(dist);
    setOverIndex(computeOverIndex(a === 'x' ? e.clientX : e.clientY, id));
  }, [railAxis, computeOverIndex]);

  const handlePointerUp = useCallback((id: RailAction) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    dragRef.current = null;
    if (d.active) {
      suppressClickRef.current = true;
      requestAnimationFrame(() => { suppressClickRef.current = false; });
      const from = order.indexOf(id);
      const to   = overIndex ?? order.length;
      const next = [...order];
      const [moved] = next.splice(from, 1);
      next.splice(from < to ? to - 1 : to, 0, moved);
      setOrder(next);
    }
    setDragId(null);
    setDragOffset(0);
    setOverIndex(null);
  }, [order, overIndex]);

  const handlePointerCancel = useCallback((id: RailAction) => {
    const d = dragRef.current;
    if (!d || d.id !== id) return;
    dragRef.current = null;
    setDragId(null);
    setDragOffset(0);
    setOverIndex(null);
  }, []);

  const handleClick = useCallback((action: () => void) => {
    if (suppressClickRef.current) { suppressClickRef.current = false; return; }
    action();
  }, []);

  const buttonConfig = useCallback((id: RailAction): {
    disabled: boolean; title: string; onClick: () => void; badge: React.ReactNode;
  } => {
    const meta = BUTTON_META[id];
    switch (id) {
      case 'pay':
        return { disabled: !canSell || isBusy, title: canSell ? meta.baseTitle : 'أضف منتجات أولاً', onClick: onPay, badge: null };
      case 'quickPay':
        return { disabled: !canSell || isBusy, title: meta.baseTitle, onClick: onQuickPay, badge: null };
      case 'hold':
        return { disabled: !canSell, title: meta.baseTitle, onClick: onHold, badge: null };
      case 'held':
        return { disabled: false, title: meta.baseTitle, onClick: onHeld, badge: heldCount > 0 ? <em className="pp-rail-badge">{heldCount}</em> : null };
      case 'session':
        return { disabled: !sessionAvailable, title: sessionAvailable ? meta.baseTitle : 'لا توجد جلسة مفتوحة', onClick: onSession, badge: null };
      case 'sessionInvoices':
        return { disabled: !sessionAvailable, title: meta.baseTitle, onClick: onSessionInvoices, badge: null };
      case 'products': return { disabled: false, title: meta.baseTitle, onClick: onOpenProducts, badge: null };
      case 'newSale':  return { disabled: false, title: meta.baseTitle, onClick: onNewSale, badge: null };
      case 'manual':   return { disabled: false, title: meta.baseTitle, onClick: onManual, badge: null };
      case 'returns':  return { disabled: false, title: meta.baseTitle, onClick: onReturns, badge: null };
      case 'cart':     return { disabled: false, title: meta.baseTitle, onClick: onScrollToCart, badge: null };
      case 'drawer':   return { disabled: false, title: meta.baseTitle, onClick: onOpenDrawer, badge: null };
      case 'fullscreen': return { disabled: false, title: meta.baseTitle, onClick: onFullscreen, badge: null };
      case 'settings': return { disabled: false, title: meta.baseTitle, onClick: onSettings, badge: null };
      case 'help':     return { disabled: false, title: meta.baseTitle, onClick: onHelp, badge: null };
    }
  }, [canSell, isBusy, sessionAvailable, heldCount, onNewSale, onPay, onQuickPay, onHold, onHeld, onSession, onSessionInvoices, onOpenProducts, onManual, onReturns, onScrollToCart, onOpenDrawer, onFullscreen, onSettings, onHelp]);

  const dragging  = dragId !== null;

  const visibleIds = useMemo(() => order.filter(id => !hidden.has(id)), [order, hidden]);
  const lastVisibleId = visibleIds.length > 0 ? visibleIds[visibleIds.length - 1] : null;

  return (
    <>
      <aside
        ref={railRef}
        className={`pp-rail ${dragging ? 'pp-rail-dragging' : ''} ${dragAxis === 'x' ? 'pp-rail--h' : ''}`}
      >
        {order.map((id, i) => {
          if (hidden.has(id)) return null;
          const meta   = BUTTON_META[id];
          const config = buttonConfig(id);
          const isDragging = dragId === id;
          const dropBefore = dragging && dragId !== id && overIndex === i;
          const dropAfter  = dragging && dragId !== id && overIndex === order.length && id === lastVisibleId;
          const isDisabled = config.disabled;

          let nextVisibleIdx = -1;
          for (let j = i + 1; j < order.length; j++) {
            if (!hidden.has(order[j])) { nextVisibleIdx = j; break; }
          }
          const showSep = nextVisibleIdx !== -1
            && [...SEP_AFTER].some(s => i < s && s < nextVisibleIdx);

          return (
            <React.Fragment key={id}>
              <button
                ref={(el) => { if (el) btnRefs.current.set(id, el); else btnRefs.current.delete(id); }}
                type="button"
                className={`${meta.className} ${isDragging ? 'pp-rail-drag-on' : ''} ${dropBefore ? 'pp-rail-drop-before' : ''} ${dropAfter ? 'pp-rail-drop-after' : ''}`}
                onClick={() => handleClick(config.onClick)}
                disabled={isDisabled}
                title={config.title}
                style={isDragging ? { transform: dragAxis === 'x' ? `translateX(${dragOffset}px)` : `translateY(${dragOffset}px)`, zIndex: 20 } : undefined}
                onPointerDown={(e) => handlePointerDown(e, id)}
                onPointerMove={(e) => handlePointerMove(e, id)}
                onPointerUp={() => handlePointerUp(id)}
                onPointerCancel={() => handlePointerCancel(id)}
              >
                <i className="pp-rail-grip ti ti-grip-vertical" />
                <i className={`ti ${meta.icon}`} />
                <span>{meta.label}</span>
                {config.badge}
              </button>
              {showSep && <div className="pp-rail-sep" />}
            </React.Fragment>
          );
        })}

        <button
          type="button"
          className="pp-rail-manage"
          onClick={() => setManageOpen(o => !o)}
          title="إظهار/إخفاء أزرار الشريط"
        >
          <i className="ti ti-adjustments-horizontal" />
          <span>تخصيص</span>
        </button>

        {isBusy && (
          <div className="pp-rail-busy">
            <i className="ti ti-loader animate-spin" />
          </div>
        )}
      </aside>

      <Modal
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="تخصيص الشريط"
        subtitle="أظهر أو أخفِ الأزرار — ويمكنك سحب الأزرار في الشريط لإعادة الترتيب"
        size="sm"
        resizable={false}
        footer={
          <button className="btn" onClick={() => setManageOpen(false)} type="button">إغلاق</button>
        }
        footerLeft={
          <button className="btn btn-b" onClick={resetLayout} type="button">
            <i className="ti ti-refresh" /> إعادة ضبط الكل
          </button>
        }
      >
        <div className="pp-rail-custom">
          {order.map((id, i) => {
            const meta = BUTTON_META[id];
            const on = !hidden.has(id);
            return (
              <div key={id} className={`pp-rail-custom-row${on ? '' : ' off'}`}>
                <span className="pp-rail-custom-ic"><i className={`ti ${meta.icon}`} /></span>
                <span className="pp-rail-custom-name">{meta.label}</span>
                <span className="pp-rail-custom-pos">{i + 1}</span>
                <Switch checked={on} onChange={() => toggleHidden(id)} />
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// documents/components/DocActionRail.tsx
//
// الشريط الرأسي لمحرر المستند التجاري — يمين الصفحة (الأول في DOM فيقف يمين RTL).
// يعيد استخدام بنية .pp-rail من POS PRO تماماً (نفس الأزرار والفاصل والمؤشرات
// والبج والسبينر) مع إضافة القوائم المنبثقة الخاصة بالمستند (تصدير / قالب / المزيد).
//
// إعادة الترتيب بالسحب: كل زر قابل للسحب (مؤشر / لمس) لإعادة ترتيب الشريط؛
// الترتيب يُحفظ في localStorage لكل شركة (`doc-rail-order-<slug>`).
// النقر البسيط ينفّذ الإجراء كالمعتاد — السحب فقط يعيد الترتيب.
//
// إظهار/إخفاء الأزرار: زر "تخصيص" أسفل الشريط يفتح مودال بخانات تشغيل لكل زر؛
// المخفي يُحفظ في localStorage لكل شركة (`doc-rail-hidden-<slug>`) ويبقى
// محتفظاً بموقعه في الترتيب (يظهر عند إعادة تفعيله).
// "رجوع" و"حفظ" زرّان إلزاميان — لا يمكن إخفاؤهما (مقفلان في مودال التخصيص).
// ════════════════════════════════════════════════════════════════════════════
import React, { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useActiveSlug } from '@/lib/store/appStore';
import Modal from '@/components/ui/Modal';
import Switch from '@/components/ui/Switch';

interface DocActionRailProps {
  isEdit: boolean;
  isReadOnly: boolean;
  isPending: boolean;
  successMsg: string;
  docCode: string;
  handleSave: () => void;
  onBack: () => void;
  onPrint?: () => void;
  onPreview?: () => void;
  onPayments?: () => void;
  paymentsCount?: number;
  onExtraOptions?: () => void;
  handleExport: (format: 'excel' | 'pdf' | 'json' | 'xml') => void;
  handleDelete: () => void;
  onClone?: () => void;
  onReturnClick?: () => void;
  RETURNABLE_CODES: Set<string>;
  /** القوالب المتاحة — اختيار قالب الطباعة من الشريط عبر قائمة. */
  templates?: Array<{ id: number | null; name: string }>;
  selectedTemplateId?: number | null;
  onTemplateChange?: (id: number | null) => void;
}

type DocActionId =
  | 'back' | 'save' | 'print' | 'preview' | 'export'
  | 'template' | 'payments' | 'options' | 'more';

const noop = () => {};

const STORAGE_KEY     = 'doc-rail-order-';
const STORAGE_KEY_HIDDEN = 'doc-rail-hidden-';
const DRAG_THRESHOLD  = 6;

/** مواضع الفواصل (بعد الفهارس التالية في القائمة المرتّبة) */
const SEP_AFTER = new Set<number>([0, 6]);

/** أزرار لا يمكن إخفاؤها أبداً (إلزامية لسلامة المحرر) */
const LOCKED: ReadonlySet<DocActionId> = new Set(['back', 'save']);

const DEFAULT_ORDER: DocActionId[] = [
  'back', 'save', 'print', 'preview', 'export',
  'template', 'payments', 'options', 'more',
];

const BUTTON_META: Record<DocActionId, { label: string; icon: string; className: string; baseTitle: string }> = {
  back:     { label: 'رجوع',    icon: 'ti-arrow-right',      className: 'pp-rail-btn pp-rail-btn--ghost',  baseTitle: 'رجوع (Esc)' },
  save:     { label: 'حفظ',     icon: 'ti-device-floppy',    className: 'pp-rail-btn pp-rail-btn--primary', baseTitle: 'حفظ (F9 / Ctrl+S)' },
  print:    { label: 'طباعة',   icon: 'ti-printer',          className: 'pp-rail-btn',                      baseTitle: 'طباعة (F8)' },
  preview:  { label: 'معاينة',  icon: 'ti-eye',              className: 'pp-rail-btn',                      baseTitle: 'معاينة الطباعة' },
  export:   { label: 'تصدير',   icon: 'ti-download',         className: 'pp-rail-btn',                      baseTitle: 'تصدير المستند' },
  template: { label: 'قالب',    icon: 'ti-file-text',        className: 'pp-rail-btn',                      baseTitle: 'قالب الطباعة' },
  payments: { label: 'دفعات',   icon: 'ti-wallet',           className: 'pp-rail-btn pp-rail-btn--pay pp-rail-btn--badge', baseTitle: 'الدفعات' },
  options:  { label: 'خيارات',  icon: 'ti-adjustments',      className: 'pp-rail-btn',                      baseTitle: 'خيارات إضافية' },
  more:     { label: 'المزيد',  icon: 'ti-dots-vertical',    className: 'pp-rail-btn pp-rail-btn--ghost',   baseTitle: 'المزيد' },
};

const EXPORT_OPTIONS: Array<{ label: string; icon: string; format: 'excel' | 'pdf' | 'json' | 'xml' }> = [
  { label: 'Excel', icon: 'ti-file-spreadsheet', format: 'excel' },
  { label: 'PDF',   icon: 'ti-file-type-pdf',    format: 'pdf' },
  { label: 'JSON',  icon: 'ti-file-code',        format: 'json' },
  { label: 'XML',   icon: 'ti-file-code-2',      format: 'xml' },
];

function loadOrder(slug: string | null): DocActionId[] {
  if (!slug) return DEFAULT_ORDER;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}${slug}`);
    if (!raw) return DEFAULT_ORDER;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ORDER;
    const valid = parsed.filter((x): x is DocActionId => (DEFAULT_ORDER as readonly string[]).includes(x as string));
    return [...valid, ...DEFAULT_ORDER.filter(id => !valid.includes(id))];
  } catch { return DEFAULT_ORDER; }
}

function loadHidden(slug: string | null): Set<DocActionId> {
  const hidden = new Set<DocActionId>();
  if (!slug) return hidden;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_HIDDEN}${slug}`);
    if (!raw) return hidden;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return hidden;
    for (const x of parsed) {
      if ((DEFAULT_ORDER as readonly string[]).includes(x as string) && !LOCKED.has(x as DocActionId)) {
        hidden.add(x as DocActionId);
      }
    }
  } catch { /* ignore */ }
  return hidden;
}

interface RailMenuProps {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}

/**
 * قائمة منبثقة تُعرض عبر Portal أعلى كل العناصر (document.body) بدل أن تُقتطع
 * داخل حاوية الشريط الجانبي (التي لها overflow-y:auto). تُثبَّت عند موضع زر
 * المشغّل عبر getBoundingClientRect مع تقييد داخل الشاشة.
 */
function RailMenu({ open, triggerRef, onClose, className = '', children }: RailMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  /* يفضّل الفتح نحو داخل الصفحة (باتجاه محتوى المستند) مع تقييد على الشاشة */
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const btn = triggerRef.current;
    if (!btn) { setPos({ left: 0, top: 0 }); return; }
    const gap = 6;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // أول تنفيذ: القائمة ليست في الـ DOM بعد (نعيد null حتى تُركَّب)، لذا نضع
    // موضعاً أولياً تقريبياً فقط لجعل القائمة تظهر ثم نعيد القياس في التأثير الثاني.
    const menuW = 176;
    let left: number;
    if (r.left - gap >= menuW) {
      left = r.left - menuW - gap;
    } else if (vw - (r.right + gap) >= menuW) {
      left = r.right + gap;
    } else {
      left = r.left - menuW - gap;
    }
    left = Math.max(gap, Math.min(left, vw - menuW - gap));
    setPos({ left, top: Math.max(gap, Math.min(r.top, vh - 160 - gap)) });
  }, [open, triggerRef]);

  /* بعد تركيب القائمة، أعد القياس بأبعادها الحقيقية وصحّح الموضع (مع حارس يمنع
     حلقات اللانهاية: لا نُحدِّث إلا إذا تغيّر الموضع فعلياً). */
  useLayoutEffect(() => {
    if (!open) return;
    const btn = triggerRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const gap = 6;
    const menuW = menu.offsetWidth;
    const menuH = menu.offsetHeight;
    const r = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left: number;
    if (r.left - gap >= menuW) {
      left = r.left - menuW - gap;
    } else if (vw - (r.right + gap) >= menuW) {
      left = r.right + gap;
    } else {
      left = r.left - menuW - gap;
    }
    left = Math.max(gap, Math.min(left, vw - menuW - gap));
    const top = Math.max(gap, Math.min(r.top, vh - menuH - gap));
    setPos((prev) => {
      if (prev && Math.abs(prev.left - left) < 1 && Math.abs(prev.top - top) < 1) return prev;
      return { left, top };
    });
  }, [open, triggerRef, pos]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current && menuRef.current.contains(t)) return;
      if (triggerRef.current && triggerRef.current.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, triggerRef]);

  if (!open || !pos) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`doc-rail-menu doc-rail-menu--pop${className}`}
      style={{ left: pos.left, top: pos.top, zIndex: 10002, margin: 0 }}
    >
      {children}
    </div>,
    document.body
  );
}

export default function DocActionRail({
  isEdit, isReadOnly, isPending, successMsg, docCode,
  handleSave, onBack, onPrint, onPreview, onPayments, paymentsCount, onExtraOptions,
  handleExport, handleDelete, onClone, onReturnClick, RETURNABLE_CODES,
  templates, selectedTemplateId, onTemplateChange,
}: DocActionRailProps) {
  const slug = useActiveSlug();

  const [order, setOrder]     = useState<DocActionId[]>(() => loadOrder(slug));
  const [hidden, setHidden]   = useState<Set<DocActionId>>(() => loadHidden(slug));
  const [manageOpen, setManageOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const tplRef = useRef<HTMLDivElement>(null);

  const [dragId, setDragId]   = useState<DocActionId | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragAxis, setDragAxis]     = useState<'x' | 'y'>('y');
  const [overIndex, setOverIndex]   = useState<number | null>(null);

  const railRef    = useRef<HTMLElement>(null);
  const btnRefs    = useRef(new Map<DocActionId, HTMLButtonElement>());
  const dragRef    = useRef<{ id: DocActionId; startX: number; startY: number; active: boolean } | null>(null);
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

  const toggleHidden = useCallback((id: DocActionId) => {
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

  /** محور الشريط: عمودي دائماً هنا (المستند يبقي الشريط عمودياً في كل الأحجام) */
  const railAxis = useCallback((): 'x' | 'y' => {
    const rail = railRef.current;
    if (!rail) return 'y';
    const fd = getComputedStyle(rail).flexDirection;
    return fd === 'row' || fd === 'row-reverse' ? 'x' : 'y';
  }, []);

  /** فهرس الإدراج المستهدف (قبل العنصر الأول الذي يتجاوز المؤشر وسطه) */
  const computeOverIndex = useCallback((pointer: number, draggingId: DocActionId): number => {
    const a = railAxis();
    let target = order.length;
    for (let i = 0; i < order.length; i++) {
      const id = order[i];
      if (id === draggingId) continue;
      const el = btnRefs.current.get(id);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const mid = a === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
      if (pointer < mid) { target = i; break; }
    }
    return target;
  }, [order, railAxis]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: DocActionId) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    (e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, active: false };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLButtonElement>, id: DocActionId) => {
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

  const handlePointerUp = useCallback((id: DocActionId) => {
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

  const handlePointerCancel = useCallback((id: DocActionId) => {
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

  const canSave = !isPending && !successMsg;

  const showReturn = isEdit && !isReadOnly && RETURNABLE_CODES.has(docCode) && !!onReturnClick;
  const showDelete = isEdit && !isReadOnly && !isPending;

  /** هل الزر متاح حالياً (البروب غير موجود؟) — يحذف الأزرار غير المتوفرة من الشريط والمودال */
  const isAvailable = useCallback((id: DocActionId): boolean => {
    switch (id) {
      case 'print':    return !!onPrint;
      case 'preview':  return !!onPreview;
      case 'payments': return !!onPayments;
      case 'options':  return !!onExtraOptions;
      case 'template': return !!templates && templates.length > 0;
      case 'more':     return showReturn || showDelete || (isEdit && !!onClone);
      default:         return true; // back, save, export
    }
  }, [onPrint, onPreview, onPayments, onExtraOptions, templates, showReturn, showDelete, isEdit, onClone]);

  const actionConfig = useCallback((id: DocActionId): {
    disabled: boolean; title: string; onClick: () => void; badge: React.ReactNode; label: string; icon: string;
  } => {
    const meta = BUTTON_META[id];
    switch (id) {
      case 'save':
        return {
          disabled: !canSave, title: meta.baseTitle, onClick: handleSave, badge: null,
          label: successMsg ? 'تم الحفظ' : isPending ? 'حفظ...' : isEdit ? 'تحديث' : 'حفظ',
          icon: isEdit ? 'ti-device-floppy' : 'ti-plus',
        };
      case 'print':    return { disabled: false, title: meta.baseTitle, onClick: onPrint ?? noop, badge: null, label: meta.label, icon: meta.icon };
      case 'preview':  return { disabled: false, title: meta.baseTitle, onClick: onPreview ?? noop, badge: null, label: meta.label, icon: meta.icon };
      case 'payments': return { disabled: false, title: meta.baseTitle, onClick: onPayments ?? noop, badge: (!paymentsCount || paymentsCount <= 0) ? null : <em className="pp-rail-badge">{paymentsCount}</em>, label: meta.label, icon: meta.icon };
      case 'options':  return { disabled: isPending, title: meta.baseTitle, onClick: onExtraOptions ?? noop, badge: null, label: meta.label, icon: meta.icon };
      case 'more':     return { disabled: isPending, title: meta.baseTitle, onClick: noop, badge: null, label: meta.label, icon: meta.icon };
      case 'export':   return { disabled: false, title: meta.baseTitle, onClick: noop, badge: null, label: meta.label, icon: meta.icon };
      case 'template': return { disabled: false, title: meta.baseTitle, onClick: noop, badge: null, label: meta.label, icon: meta.icon };
      case 'back':     return { disabled: false, title: meta.baseTitle, onClick: onBack, badge: null, label: meta.label, icon: meta.icon };
    }
  }, [canSave, successMsg, isPending, isEdit, handleSave, onPrint, onPreview, onPayments, paymentsCount, onExtraOptions, onBack]);

  const dragging = dragId !== null;

  const visibleIds = useMemo(() => order.filter(id => !hidden.has(id) && isAvailable(id)), [order, hidden, isAvailable]);
  const lastVisibleId = visibleIds.length > 0 ? visibleIds[visibleIds.length - 1] : null;

  const renderBtn = (id: DocActionId, i: number, onClickOverride?: () => void) => {
    const cfg = actionConfig(id);
    const isDragging = dragId === id;
    const dropBefore = dragging && dragId !== id && overIndex === i;
    const dropAfter  = dragging && dragId !== id && overIndex === order.length && id === lastVisibleId;
    return (
      <button
        ref={(el) => { if (el) btnRefs.current.set(id, el); else btnRefs.current.delete(id); }}
        type="button"
        className={`${BUTTON_META[id].className}${isDragging ? ' pp-rail-drag-on' : ''}${dropBefore ? ' pp-rail-drop-before' : ''}${dropAfter ? ' pp-rail-drop-after' : ''}`}
        onClick={() => handleClick(onClickOverride ?? cfg.onClick)}
        disabled={cfg.disabled}
        title={cfg.title}
        style={isDragging ? { transform: dragAxis === 'x' ? `translateX(${dragOffset}px)` : `translateY(${dragOffset}px)`, zIndex: 20 } : undefined}
        onPointerDown={(e) => handlePointerDown(e, id)}
        onPointerMove={(e) => handlePointerMove(e, id)}
        onPointerUp={() => handlePointerUp(id)}
        onPointerCancel={() => handlePointerCancel(id)}
      >
        <i className="pp-rail-grip ti ti-grip-vertical" />
        <i className={`ti ${cfg.icon}`} />
        <span>{cfg.label}</span>
        {cfg.badge}
      </button>
    );
  };

  const renderAction = (id: DocActionId, i: number) => {
    switch (id) {
      case 'export':
        return (
          <div className="doc-rail-menu-wrap" ref={exportRef} key={id}>
            {renderBtn(id, i, () => setExportOpen((v) => !v))}
            <RailMenu
              open={exportOpen}
              triggerRef={exportRef}
              onClose={() => setExportOpen(false)}
            >
              {EXPORT_OPTIONS.map((opt) => (
                <button
                  key={opt.format}
                  className="doc-rail-menu-item"
                  onClick={() => { setExportOpen(false); handleExport(opt.format); }}
                  type="button"
                >
                  <i className={`ti ${opt.icon}`} />
                  {opt.label}
                </button>
              ))}
            </RailMenu>
          </div>
        );
      case 'template':
        return (
          <div className="doc-rail-menu-wrap" ref={tplRef} key={id}>
            {renderBtn(id, i, () => setTplOpen((v) => !v))}
            <RailMenu
              open={tplOpen}
              triggerRef={tplRef}
              onClose={() => setTplOpen(false)}
              className=" doc-rail-menu--tpl"
            >
              <button
                className="doc-rail-menu-item"
                onClick={() => { setTplOpen(false); onTemplateChange?.(null); }}
                type="button"
              >
                القالب الافتراضي
              </button>
              {templates?.map((t) => (
                <button
                  key={t.id}
                  className={`doc-rail-menu-item${selectedTemplateId === t.id ? ' on' : ''}`}
                  onClick={() => { setTplOpen(false); onTemplateChange?.(t.id); }}
                  type="button"
                >
                  {t.name}
                </button>
              ))}
            </RailMenu>
          </div>
        );
      case 'more':
        return (
          <div className="doc-rail-menu-wrap" ref={moreRef} key={id}>
            {renderBtn(id, i, () => setMoreOpen((v) => !v))}
            <RailMenu
              open={moreOpen}
              triggerRef={moreRef}
              onClose={() => setMoreOpen(false)}
            >
              {showReturn && (
                <button
                  className="doc-rail-menu-item"
                  onClick={() => { setMoreOpen(false); onReturnClick?.(); }}
                  type="button"
                >
                  <i className="ti ti-receipt-refund" />
                  إنشاء مرتجع
                </button>
              )}
              {isEdit && !!onClone && (
                <button
                  className="doc-rail-menu-item"
                  onClick={() => { setMoreOpen(false); onClone(); }}
                  type="button"
                >
                  <i className="ti ti-copy" />
                  نسخ كمستند جديد
                </button>
              )}
              {showDelete && (
                <button
                  className="doc-rail-menu-item danger"
                  onClick={() => { setMoreOpen(false); handleDelete(); }}
                  type="button"
                >
                  <i className="ti ti-trash" />
                  حذف
                </button>
              )}
            </RailMenu>
          </div>
        );
      default:
        return <Fragment key={id}>{renderBtn(id, i)}</Fragment>;
    }
  };

  return (
    <>
      <aside
        ref={railRef}
        className={`pp-rail doc-rail ${dragging ? 'pp-rail-dragging' : ''} ${dragAxis === 'x' ? 'pp-rail--h' : ''}`}
      >
        {order.map((id, i) => {
          if (hidden.has(id)) return null;
          if (!isAvailable(id)) return null;
          let nextVisibleIdx = -1;
          for (let j = i + 1; j < order.length; j++) {
            if (!hidden.has(order[j]) && isAvailable(order[j])) { nextVisibleIdx = j; break; }
          }
          const showSep = nextVisibleIdx !== -1
            && [...SEP_AFTER].some(s => i < s && s < nextVisibleIdx);
          return (
            <Fragment key={id}>
              {renderAction(id, i)}
              {showSep && <div className="pp-rail-sep" />}
            </Fragment>
          );
        })}

        <button
          type="button"
          className="pp-rail-manage"
          onClick={() => setManageOpen((o) => !o)}
          title="إظهار/إخفاء أزرار الشريط"
        >
          <i className="ti ti-adjustments-horizontal" />
          <span>تخصيص</span>
        </button>

        {isPending && (
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
            if (!isAvailable(id)) return null;
            const meta = BUTTON_META[id];
            const on = !hidden.has(id);
            const locked = LOCKED.has(id);
            return (
              <div key={id} className={`pp-rail-custom-row${on ? '' : ' off'}`}>
                <span className="pp-rail-custom-ic"><i className={`ti ${meta.icon}`} /></span>
                <span className="pp-rail-custom-name">{meta.label}</span>
                <span className="pp-rail-custom-pos">{i + 1}</span>
                {locked ? (
                  <em className="doc-rail-custom-lock" title="زر إلزامي — لا يمكن إخفاؤه">
                    <i className="ti ti-lock" /> دائم
                  </em>
                ) : (
                  <Switch checked={on} onChange={() => toggleHidden(id)} />
                )}
              </div>
            );
          })}
        </div>
      </Modal>
    </>
  );
}
import { useEffect, useRef, useState } from 'react';
import type { ElementKey, ElementPosition, PrintTemplate } from '../types';
import type { UniversalDocumentData } from '../types/data';
import type { PageBox, ResolvedGeometry } from '../services/freeformGeometry';
import { applyMode, clampGeometry, defaultElementMode, FLOW_FIRST_ELEMENTS, normalizeElementGeometry, pageBoxMm, rectToGeometry, snapMm } from '../services/freeformGeometry';
import PreviewSelector from './PreviewSelector';

interface ActiveDrag {
  key: ElementKey;
  box: HTMLElement;
  wrapper: HTMLElement;
  startX: number;
  startY: number;
  /** A press that never travels is a SELECTION, not a drag. Without this flag a
   *  plain click wrote a fixed box on pointerup, silently pinning an element the
   *  user had only clicked — and reporting its mode as "ثابت" instead of
   *  "تلقائي". */
  moved: boolean;
}

/** Pointer travel (px) required before a press counts as a drag. */
const DRAG_THRESHOLD_PX = 1;

export interface ElementDesignerStageProps {
  tpl: PrintTemplate;
  data?: UniversalDocumentData | null;
  onPositionChange: (key: ElementKey, pos: ElementPosition) => void;
  /** Clears the element's stored geometry so it returns to natural document flow. */
  onResetElement?: (key: ElementKey) => void;
}

/** Arabic labels for the known element keys; unknown keys fall back to the raw key. */
const ELEMENT_LABELS: Partial<Record<ElementKey, string>> = {
  'header.logo': 'شعار المؤسسة',
  'header.title': 'عنوان المستند',
  'header.company-name': 'اسم المؤسسة',
  'header.company-info': 'معلومات المؤسسة',
  'header.custom-text': 'نص إضافي',
  'header.doc-info': 'معلومات المستند',
  'header.columns': 'الترويسة (أعمدة)',
  'doc-info.client-card': 'بطاقة الزبون',
  'doc-info.delivery-card': 'بطاقة التسليم',
  'items.table': 'جدول المنتجات',
  'totals.block': 'المجاميع',
  'payments.block': 'الدفعات',
  'footer.bank-details': 'البنك والحساب',
  'footer.lines': 'أسطر التذييل',
  'footer.returns-policy': 'سياسة الإرجاع',
  'footer.thank-you': 'شكراً',
  'footer.legal': 'النص القانوني',
  'footer.barcode': 'الباركود',
  'footer.qr': 'رمز QR',
  'footer.signatures': 'التوقيعات',
  'footer.stamp': 'الختم',
};

function labelOf(key: ElementKey): string {
  return ELEMENT_LABELS[key] ?? key;
}

/** The box a flow/fixed element would take if captured from the DOM right now. */
function measuredGeometryOf(key: ElementKey, measured: ElementPosition, box: PageBox): ResolvedGeometry {
  const mode = defaultElementMode(key, null);
  return clampGeometry({
    x: mode === 'flow' ? 0 : measured.x,
    y: mode === 'flow' ? 0 : measured.y,
    w: measured.w,
    h: mode === 'flow' ? undefined : measured.h,
    rotate: 0,
    z: 0,
    mode,
  }, box);
}

export function ElementDesignerStage({ tpl, data, onPositionChange, onResetElement }: ElementDesignerStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const tplRef = useRef(tpl);
  tplRef.current = tpl;
  const [selectedKey, setSelectedKey] = useState<ElementKey | null>(null);
  const [measured, setMeasured] = useState<ElementPosition | null>(null);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (!d.moved) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
        d.moved = true;
        d.box.style.outline = '2px dashed var(--em)';
        d.box.style.outlineOffset = '2px';
        document.body.style.userSelect = 'none';
      }
      d.box.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const finishDrag = () => {
      const d = dragRef.current;
      if (!d) return;
      const wr = d.wrapper.getBoundingClientRect();
      const br = d.box.getBoundingClientRect();
      d.box.style.outline = '';
      d.box.style.outlineOffset = '';
      d.box.style.transform = '';
      document.body.style.userSelect = '';
      dragRef.current = null;
      // A press that never moved was a selection: leave the store alone so the
      // element keeps reporting "تلقائي" until the user really places it.
      if (!d.moved) return;
      if (wr.width >= 1 && wr.height >= 1) {
        const current = tplRef.current;
        const box = pageBoxMm(current);
        const prev = normalizeElementGeometry(current.element_positions?.[d.key], box);
        const geo = rectToGeometry(
          { left: br.left, top: br.top, width: br.width, height: br.height },
          { left: wr.left, top: wr.top, width: wr.width, height: wr.height },
        );
        const mode = defaultElementMode(d.key, prev);
        onPositionChangeRef.current(d.key, clampGeometry({
          ...geo,
          // Snap to the millimetre grid on DROP, not during the drag: the box
          // must track the pointer 1:1 while moving (a 1mm jump every frame
          // feels broken), and land on a clean number when released.
          x: mode === 'flow' ? 0 : snapMm(geo.x),
          // A flow element keeps its NATURAL vertical position: `geo.y` is an
          // absolute page offset while `flowBoxStyle` reads `y` as a nudge, and
          // a measured `h` would pin the auto-growing box to one page's height.
          y: mode === 'flow' ? 0 : snapMm(geo.y),
          w: snapMm(geo.w),
          h: mode === 'flow' ? undefined : (geo.h == null ? undefined : snapMm(geo.h)),
          rotate: prev?.rotate ?? 0,
          z: prev?.z ?? 0,
          mode,
        }, box));
      }
    };
    const cancelDrag = () => {
      const d = dragRef.current;
      if (!d) return;
      d.box.style.outline = '';
      d.box.style.outlineOffset = '';
      d.box.style.transform = '';
      document.body.style.userSelect = '';
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', cancelDrag);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', cancelDrag);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const cleanups: Array<() => void> = [];

    const attachDrag = (e: PointerEvent, key: ElementKey) => {
      const box = e.currentTarget as HTMLElement;
      if (e.button !== 0) return;
      const wrapper = box.closest('.ps-preview-wrapper');
      if (!(wrapper instanceof HTMLElement)) return;
      e.preventDefault();
      setSelectedKey(key);
      try {
        box.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is best-effort; window listeners still track the drag */
      }
      box.style.touchAction = 'none';
      dragRef.current = {
        key,
        box,
        wrapper,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
      };
    };

    const discover = () => {
      if (cancelled) return;
      const root = rootRef.current;
      if (!root) return;
      const wrapper = root.querySelector<HTMLElement>('.ps-preview-wrapper');
      if (!wrapper) return;
      const wrappers = Array.from(wrapper.querySelectorAll<HTMLElement>('[data-drag-key]'));
      if (wrappers.length === 0) {
        if (attempts++ < 20) window.setTimeout(discover, 50);
        return;
      }
      wrappers.forEach((w) => {
        const key = (w.getAttribute('data-drag-key') ?? 'header.logo') as ElementKey;
        const box =
          w.style.display === 'contents'
            ? (w.firstElementChild as HTMLElement | null) || w
            : w;
        const handler = (e: PointerEvent) => attachDrag(e, key);
        box.addEventListener('pointerdown', handler);
        cleanups.push(() => box.removeEventListener('pointerdown', handler));
      });
    };

    discover();

    return () => {
      cancelled = true;
      cleanups.forEach((fn) => fn());
    };
  }, [tpl]);

  // Measure the selected element so an unpositioned element still shows real
  // numbers (and so committing a single field does not blank the others).
  useEffect(() => {
    if (!selectedKey) {
      setMeasured(null);
      return;
    }
    const root = rootRef.current;
    const wrapper = root?.querySelector<HTMLElement>('.ps-preview-wrapper');
    if (!root || !wrapper) {
      setMeasured(null);
      return;
    }
    const holder = root.querySelector<HTMLElement>(`[data-drag-key="${selectedKey}"]`);
    if (!holder) {
      setMeasured(null);
      return;
    }
    const box = holder.style.display === 'contents'
      ? (holder.firstElementChild as HTMLElement | null) || holder
      : holder;
    const wr = wrapper.getBoundingClientRect();
    const br = box.getBoundingClientRect();
    if (wr.width < 1 || br.width < 1) {
      setMeasured(null);
      return;
    }
    setMeasured(rectToGeometry(
      { left: br.left, top: br.top, width: br.width, height: br.height },
      { left: wr.left, top: wr.top, width: wr.width, height: wr.height },
    ));
  }, [selectedKey, tpl, data]);

  // Keyboard nudging for the selected element: arrows = 1mm, Shift+arrows = 5mm.
  // Registered once with a refs mirror (never re-bound per render) and yields to
  // any text field — the inspector's own mm inputs are arrow-editable, and a
  // global handler would fight them.
  const nudgeRef = useRef<((dx: number, dy: number) => void) | null>(null);
  const selectedRef = useRef<ElementKey | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      };
      const step = dir[e.key];
      if (!step) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('input, textarea, select, [contenteditable="true"], .ov')) return;
      const nudgeFn = nudgeRef.current;
      if (!selectedRef.current || !nudgeFn) return;
      e.preventDefault();
      const mm = e.shiftKey ? 5 : 1;
      nudgeFn(step[0] * mm, step[1] * mm);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const box = pageBoxMm(tpl);
  const stored = selectedKey ? normalizeElementGeometry(tpl.element_positions?.[selectedKey], box) : null;
  const cur: ResolvedGeometry | null = selectedKey
    ? (stored ?? (measured ? measuredGeometryOf(selectedKey, measured, box) : null))
    : null;
  // The mode a commit will write: a stored mode always wins, otherwise fall back
  // to the element's natural default (`items.table` flows, everything else is
  // fixed). Same rule the drag-commit and `Pos` read through.
  const mode = selectedKey ? defaultElementMode(selectedKey, stored) : 'fixed';
  // The mode the mode-switch reports: no stored geometry means the element is
  // in AUTOMATIC flow, which is NOT the same as a stored `fixed` box. Reading it
  // from the store (instead of guessing `defaultElementMode`) keeps the toggle
  // honest and makes reset reachable from the same control that sets the mode.
  const shownMode: 'auto' | 'fixed' | 'flow' = stored ? stored.mode : 'auto';
  const active: ResolvedGeometry | null = cur ? { ...cur, mode } : null;

  const commit = (patch: Partial<ResolvedGeometry>) => {
    if (!selectedKey || !active) return;
    onPositionChange(selectedKey, clampGeometry({ ...active, ...patch }, box));
  };
  /** Switching modes has to drop the fields the target mode does not read, or a
   *  height measured on the page would pin the growing box to one page.
   *  `applyMode` also refuses `fixed` for flow-first elements (the items table
   *  must keep paginating), so the guard lives in one place for every caller. */
  const setMode = (next: 'fixed' | 'flow') => {
    if (!active || !selectedKey) return;
    // Guard on the mode the STORE reports, not on `active.mode`: with no stored
    // geometry the resolved mode already reads `fixed`, so an `active.mode`
    // guard would leave ثابت a dead button. Reading `shownMode` lets automatic →
    // ثابت actually write the measured box (it becomes a real pin).
    if (shownMode === next) return;
    commit(applyMode(active, next, box, selectedKey));
  };
  /** Back to automatic: drop the stored geometry entirely, which is the only way
   *  to return an element to natural document flow (a merge-based update would
   *  keep every old field). */
  const setAuto = () => {
    if (!selectedKey || shownMode === 'auto') return;
    onResetElement?.(selectedKey);
  };
  const nudge = (dx: number, dy: number) => {
    if (!active) return;
    if (active.mode === 'flow') commit({ y: Math.max(0, active.y + dy) });
    else commit({ x: Math.max(0, active.x + dx), y: Math.max(0, active.y + dy) });
  };
  // Keep the window keydown handler pointed at the live selection/geometry.
  nudgeRef.current = nudge;
  selectedRef.current = selectedKey;

  const numField = (label: string, value: number, onSet: (v: number) => void, step = 0.5, disabled = false) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#666' }}>
      <span>{label}</span>
      <input
        type="number"
        step={step}
        disabled={disabled}
        value={String(Math.round(value * 100) / 100)}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onSet(v);
        }}
        style={{ width: 62, padding: '2px 4px', fontSize: 11, border: '1px solid #d7dbe0', borderRadius: 4, background: disabled ? '#f4f5f6' : '#fff' }}
      />
      <span>mm</span>
    </label>
  );

  // `data-ff-stage` marks the ACTIVE freeform layer. `Pos` emits `data-drag-key`
  // / `data-ff-mode` in the normal (non-freeform) preview too, so neither can
  // tell "designer open" from "inert" — the stage root is the only honest signal
  // that dragging is live. Browser tests assert on it instead.
  return (
    <div
      ref={rootRef}
      data-ff-stage=""
      style={{ position: 'relative' }}
      onPointerDown={(e) => {
        // Only EMPTY page area deselects. The inspector row lives inside this
        // same root, so without the `[data-ff-inspector]` guard every click on a
        // mode button or an mm input would clear the selection it edits.
        if (!(e.target as HTMLElement).closest?.('[data-drag-key], [data-ff-inspector]')) setSelectedKey(null);
      }}
    >
      <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
        اسحب أي عنصر داخل الصفحة لتثبيته في مكانه بالملّيمتر — يُحفظ الموضع تلقائياً عند ترك المؤشر (محاذى لشبكة 1مم).
        انقر على عنصر لتحديده وضبط أرقامه بالملّيمتر، أو حرّكه بالأسهم (1مم) وShift+الأسهم (5مم).
        العناصر غير المسحوبة تبقى في تدفّقها الطبيعي.
      </div>

      {active && selectedKey && (
        <div data-ff-inspector="" style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
          padding: '6px 8px', marginBottom: 8, fontSize: 11, color: '#333',
          background: '#f7f8fa', border: '1px solid #e3e6ea', borderRadius: 6,
        }}>
          <strong style={{ fontSize: 12 }}>{labelOf(selectedKey)}</strong>
          <code style={{ fontSize: 10, color: '#888' }}>{selectedKey}</code>

          <span style={{ display: 'inline-flex', border: '1px solid #d7dbe0', borderRadius: 4, overflow: 'hidden' }}>
            {([
              ['auto', 'تلقائي'],
              ['fixed', 'ثابت'],
              ['flow', 'تدفّق'],
            ] as const).map(([m, label]) => {
              // A flow-first element can never be pinned: disabling the control
              // explains why, where silently ignoring the click would not.
              const blocked = m === 'fixed' && FLOW_FIRST_ELEMENTS.has(selectedKey as ElementKey);
              const noHandler = m === 'auto' ? !onResetElement : blocked;
              return (
                <button
                  key={m}
                  type="button"
                  disabled={noHandler}
                  title={blocked ? 'هذا العنصر يتجاوز الصفحة، فتدفّقه ضروري لاستمراره' : undefined}
                  onClick={() => (m === 'auto' ? setAuto() : setMode(m))}
                  style={{
                    fontSize: 10, padding: '2px 8px', border: 0,
                    cursor: noHandler ? 'not-allowed' : 'pointer',
                    background: shownMode === m ? '#e7f6ee' : noHandler ? '#f4f5f6' : '#fff',
                    color: shownMode === m ? '#0a7f4f' : noHandler ? '#aaa' : '#666',
                    fontWeight: shownMode === m ? 700 : 400,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </span>

          {active.mode === 'fixed' && numField('X من الحافة اليمنى', active.x, (v) => commit({ x: v }))}
          {active.mode === 'fixed' && numField('Y من الأعلى', active.y, (v) => commit({ y: v }))}
          {active.mode === 'flow' && numField('إزاحة رأسية', active.y, (v) => commit({ y: v }))}
          {numField('العرض', active.w, (v) => commit({ w: v }))}
          {active.mode === 'fixed' && numField('الارتفاع', active.h ?? 0, (v) => commit({ h: v > 0 ? v : undefined }))}
          {active.mode === 'fixed' && numField('الدوران °', active.rotate ?? 0, (v) => commit({ rotate: v }), 1)}
          {active.mode === 'fixed' && numField('الطبقة', active.z ?? 0, (v) => commit({ z: Math.round(v) }), 1)}

          <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {(active.mode === 'flow'
              ? ([['▲', 0, -1], ['▼', 0, 1]] as const)
              : ([['◀', -1, 0], ['▲', 0, -1], ['▼', 0, 1], ['▶', 1, 0]] as const)
            ).map(([g, dx, dy]) => (
              <button
                key={g}
                type="button"
                title={`تحريك ${Math.abs(dx || dy)}mm`}
                onClick={() => nudge(dx, dy)}
                style={{ width: 22, height: 20, fontSize: 11, cursor: 'pointer', border: '1px solid #d7dbe0', borderRadius: 4, background: '#fff' }}
              >
                {g}
              </button>
            ))}
          </span>

          <span style={{ fontSize: 10, color: '#888' }}>
            {shownMode === 'auto' && 'تلقائي: العنصر في تدفّقه الطبيعي داخل المستند، بلا إحداثيات محفوظة.'}
            {shownMode === 'flow' && 'تدفّق: يتبع ترتيب المستند — العرض والإزاحة الرأسية فقط، ولا يُثبَّت على الصفحة.'}
            {shownMode === 'fixed' && 'ثابت: مربوط بالصفحة — تحديد ارتفاع يقصّ أي محتوى يتجاوزه.'}
          </span>
        </div>
      )}

      <PreviewSelector tpl={tpl} data={data} />
    </div>
  );
}

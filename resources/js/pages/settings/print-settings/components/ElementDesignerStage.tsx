import { useEffect, useRef } from 'react';
import type { ElementKey, ElementPosition, PrintTemplate } from '../types';
import type { UniversalDocumentData } from '../types/data';
import { clampGeometry, defaultElementMode, normalizeElementGeometry, pageBoxMm, rectToGeometry } from '../services/freeformGeometry';
import PreviewSelector from './PreviewSelector';

interface ActiveDrag {
  key: ElementKey;
  box: HTMLElement;
  wrapper: HTMLElement;
  startX: number;
  startY: number;
}

export interface ElementDesignerStageProps {
  tpl: PrintTemplate;
  data?: UniversalDocumentData | null;
  onPositionChange: (key: ElementKey, pos: ElementPosition) => void;
}

export function ElementDesignerStage({ tpl, data, onPositionChange }: ElementDesignerStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ActiveDrag | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const tplRef = useRef(tpl);
  tplRef.current = tpl;

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
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
          // A flow element keeps its NATURAL vertical position: `geo.y` is an
          // absolute page offset while `flowBoxStyle` reads `y` as a nudge, and
          // a measured `h` would pin the auto-growing box to one page's height.
          y: mode === 'flow' ? 0 : geo.y,
          h: mode === 'flow' ? undefined : geo.h,
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
      try {
        box.setPointerCapture?.(e.pointerId);
      } catch {
        /* capture is best-effort; window listeners still track the drag */
      }
      box.style.outline = '2px dashed var(--em)';
      box.style.outlineOffset = '2px';
      box.style.touchAction = 'none';
      document.body.style.userSelect = 'none';
      dragRef.current = {
        key,
        box,
        wrapper,
        startX: e.clientX,
        startY: e.clientY,
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

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div style={{ marginBottom: 8, fontSize: 12, color: '#666' }}>
        اسحب أي عنصر داخل الصفحة لتثبيته في مكانه بالملّيمتر — يُحفظ الموضع تلقائياً عند ترك المؤشر. العناصر غير المسحوبة تبقى في تدفّقها الطبيعي.
      </div>
      <PreviewSelector tpl={tpl} data={data} />
    </div>
  );
}
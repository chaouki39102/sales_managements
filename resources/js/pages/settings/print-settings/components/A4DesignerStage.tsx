import React, { useCallback, useEffect, useRef, useState } from 'react';
import Moveable, { type OnResize, type OnResizeEnd } from 'react-moveable';
import type { PrintTemplate, SectionTarget, SectionPosition } from '../types';
import type { UniversalDocumentData } from '../types/data';
import { emptyDocumentData } from '../types/data';
import {
  computeRuleResult, getOrderedSections, showSection, sectionHighlight,
  sectionWidthPct, sectionAlign, sectionPositionOf,
} from './preview/previewHelpers';
import { SectionWrap } from './preview/shared';
import { renderReport } from './preview/ReportSection';
import { FREE_RENDERERS } from './preview/FreeformSections';
import { toolBtnStyle } from './TinyBtn';

const DESIGN_W = 900;
const DESIGN_H = 1273;
const PAPER_W = 793.8;
const MIN_WIDTH = 8;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 1.5;
const ZOOM_STEP = 0.1;
const SNAP_PCT = 5;

const ALL_TARGETS: SectionTarget[] = ['header', 'doc-info', 'items', 'totals', 'payments', 'footer'];

const SECTION_LABELS: Record<SectionTarget, string> = {
  header: 'رأس المستند',
  'doc-info': 'معلومات المستند',
  items: 'المنتجات',
  totals: 'الإجماليات',
  payments: 'الدفعات',
  footer: 'التذييل',
};

const round1 = (n: number) => Math.round(n * 10) / 10;

function autoPos(
  tpl: PrintTemplate, key: SectionTarget, index: number, count: number,
): SectionPosition {
  const width = Math.min(100, Math.max(MIN_WIDTH, sectionWidthPct(tpl, key, false)));
  const align = sectionAlign(tpl, key);
  const x = align === 'right' ? 0
    : align === 'center' ? round1((100 - width) / 2)
    : round1(100 - width);
  const y = count > 1 ? round1((index * 100) / count) : 0;
  return { x, y, width };
}

interface A4DesignerStageProps {
  tpl: PrintTemplate;
  data: UniversalDocumentData | null;
  onPositionsChange: (positions: Partial<Record<SectionTarget, SectionPosition>>) => void;
}

export default function A4DesignerStage({ tpl, data, onPositionsChange }: A4DesignerStageProps) {
  const [zoom, setZoom] = useState(0.75);
  const [selectedKey, setSelectedKey] = useState<SectionTarget | null>(null);
  const [, setRefresh] = useState(0);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const blockElsRef = useRef<Partial<Record<SectionTarget, HTMLDivElement>>>({});
  const dragRef = useRef<{
    pointerId: number; active: boolean; startX: number; startY: number;
    key: SectionTarget; startPos: SectionPosition;
  } | null>(null);
  const liveRef = useRef<{ key: SectionTarget; pos: SectionPosition } | null>(null);
  const commitRef = useRef<() => void>(() => {});
  const tplRef = useRef(tpl);
  const visibleRef = useRef<ReturnType<typeof getOrderedSections>>([]);
  const onPositionsChangeRef = useRef(onPositionsChange);
  const zoomRef = useRef(zoom);
  const selectedKeyRef = useRef<SectionTarget | null>(null);

  tplRef.current = tpl;
  onPositionsChangeRef.current = onPositionsChange;
  zoomRef.current = zoom;
  selectedKeyRef.current = selectedKey;

  const effectiveData = data ?? emptyDocumentData();

  const ordered = getOrderedSections(tpl);
  const ruleResult = computeRuleResult(tpl, effectiveData);
  const visible = ordered.filter(
    (m) => FREE_RENDERERS[m.key] && showSection(tpl, m.key, ruleResult, ordered),
  );
  visibleRef.current = visible;

  const posFor = (key: SectionTarget, index: number): SectionPosition => {
    const live = liveRef.current;
    if (live && live.key === key) return live.pos;
    return sectionPositionOf(tpl, key) ?? autoPos(tpl, key, index, visible.length);
  };

  const commit = useCallback(() => {
    const live = liveRef.current;
    const tplC = tplRef.current;
    const vis = visibleRef.current;
    if (!live || !tplC) return;
    const next: Partial<Record<SectionTarget, SectionPosition>> = {};
    for (const t of ALL_TARGETS) {
      const saved = sectionPositionOf(tplC, t);
      if (saved) next[t] = saved;
    }
    vis.forEach((m, i) => {
      if (m.key === live.key) return;
      if (!next[m.key]) next[m.key] = autoPos(tplC, m.key, i, vis.length);
    });
    next[live.key] = live.pos;
    onPositionsChangeRef.current(next);
  }, []);

  commitRef.current = commit;

  const startDrag = useCallback((
    e: React.PointerEvent<HTMLDivElement>, key: SectionTarget, pos: SectionPosition,
  ) => {
    if ((e.target as HTMLElement).closest('button, a, input, select, textarea, .moveable-control-box')) {
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    e.preventDefault();
    setSelectedKey(key);
    dragRef.current = {
      pointerId: e.pointerId, active: false,
      startX: e.clientX, startY: e.clientY,
      key, startPos: pos,
    };
    try { stage.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / zoomRef.current;
    const dy = (e.clientY - d.startY) / zoomRef.current;
    if (!d.active) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      d.active = true;
    }
    const width = d.startPos.width;
    let nx = d.startPos.x - (dx / DESIGN_W) * 100;
    let ny = d.startPos.y + (dy / DESIGN_H) * 100;
    nx = Math.max(0, Math.min(100 - width, nx));
    ny = Math.max(0, Math.min(100, ny));
    nx = Math.round(nx / SNAP_PCT) * SNAP_PCT;
    ny = Math.round(ny / SNAP_PCT) * SNAP_PCT;
    nx = Math.max(0, Math.min(100 - width, nx));
    ny = Math.max(0, Math.min(100, ny));
    liveRef.current = { key: d.key, pos: { x: round1(nx), y: round1(ny), width } };
    setRefresh((v) => v + 1);
  }, []);

  const handlePointerUp = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    const stage = stageRef.current;
    if (stage) {
      try { stage.releasePointerCapture(d.pointerId); } catch { /* ignore */ }
    }
    dragRef.current = null;
    if (d.active) commitRef.current();
    liveRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  useEffect(() => { setRefresh((v) => v + 1); }, [selectedKey]);
  useEffect(() => { setRefresh((v) => v + 1); }, []);

  const handleResize = useCallback((e: OnResize) => {
    const key = selectedKeyRef.current;
    const el = key ? blockElsRef.current[key] : null;
    if (!key || !el) return;
    const wPct = Math.max(MIN_WIDTH, Math.min(100, (e.width / DESIGN_W) * 100));
    const rightPx = e.drag.beforeTranslate[0] + e.width;
    let xPct = 100 - (rightPx / DESIGN_W) * 100;
    xPct = Math.max(0, Math.min(100 - wPct, xPct));
    const yPct = Math.max(0, Math.min(100, (el.offsetTop / DESIGN_H) * 100));
    liveRef.current = { key, pos: { x: round1(xPct), y: round1(yPct), width: round1(wPct) } };
    setRefresh((v) => v + 1);
  }, []);

  const handleResizeEnd = useCallback((e: OnResizeEnd) => {
    if (!e.isDrag) return;
    commitRef.current();
    liveRef.current = null;
    const el = selectedKeyRef.current ? blockElsRef.current[selectedKeyRef.current] : null;
    if (el) {
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.transform = '';
    }
    setRefresh((v) => v + 1);
  }, []);

  const isDragging = (key: SectionTarget) => {
    const d = dragRef.current;
    return !!d && d.active && d.key === key;
  };

  const lastBottomPct = (() => {
    let bottom = 0;
    visible.forEach((m, i) => {
      const p = posFor(m.key, i);
      const el = blockElsRef.current[m.key];
      const elH = el ? el.offsetHeight : (p.width * DESIGN_W) * 0.1;
      bottom = Math.max(bottom, (p.y / 100) * DESIGN_H + elH);
    });
    return bottom / DESIGN_H * 100;
  })();

  const moveableTarget = selectedKey ? (blockElsRef.current[selectedKey] ?? null) : null;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0, background: 'var(--bg1)' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
        padding: '6px 10px', borderBottom: '1px solid var(--b2)', background: 'var(--bg2)',
      }}>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(ZOOM_MIN, round1(z - ZOOM_STEP)))}
          style={{ ...toolBtnStyle, padding: '3px 9px', fontSize: 13, fontWeight: 900 }}
          title="تصغير"
        >
          −
        </button>
        <span style={{ fontSize: 12, fontWeight: 700, minWidth: 46, textAlign: 'center', color: 'var(--t2)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(ZOOM_MAX, round1(z + ZOOM_STEP)))}
          style={{ ...toolBtnStyle, padding: '3px 9px', fontSize: 13, fontWeight: 900 }}
          title="تكبير"
        >
          +
        </button>
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => onPositionsChange({})}
          style={{ ...toolBtnStyle, padding: '4px 9px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
          title="إعادة ضبط مواضع الكتل"
        >
          <i className="ti ti-reload" /> إعادة تعيين التخطيط
        </button>
        <span style={{ fontSize: 10.5, color: 'var(--t4)' }}>
          اسحب الكتل لترتيبها · اسحب الحافة اليسرى لتغيير العرض
        </span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: 20 }}>
        <div style={{ width: DESIGN_W * zoom, height: DESIGN_H * zoom, margin: '0 auto' }}>
          <div
            ref={stageRef}
            onPointerDown={(e) => {
              if (e.target === stageRef.current) setSelectedKey(null);
            }}
            style={{
              position: 'relative', width: DESIGN_W, height: DESIGN_H,
              background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,.18)',
              overflow: 'hidden', transform: `scale(${zoom})`, transformOrigin: 'top left',
            }}
          >
            {visible.map((m, i) => {
              const p = posFor(m.key, i);
              return (
                <div
                  key={m.key}
                  data-freeform-block={m.key}
                  ref={(el) => {
                    if (el) blockElsRef.current[m.key] = el;
                    else delete blockElsRef.current[m.key];
                  }}
                  onPointerDown={(e) => startDrag(e, m.key, p)}
                  style={{
                    position: 'absolute',
                    left: `${100 - p.x - p.width}%`,
                    top: `${p.y}%`,
                    width: `${p.width}%`,
                    cursor: 'move',
                    touchAction: 'none',
                    userSelect: 'none',
                    boxSizing: 'border-box',
                    opacity: isDragging(m.key) ? 0.55 : 1,
                    ...(selectedKey === m.key
                      ? { outline: '2px dashed var(--em)', outlineOffset: 2 }
                      : null),
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: p.y >= 8 ? -20 : 2,
                    right: 0,
                    zIndex: 3,
                    pointerEvents: 'none',
                    background: 'var(--em)', color: '#fff',
                    fontSize: 9.5, fontWeight: 800,
                    padding: '1px 6px', borderRadius: 6, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <i className="ti ti-move" style={{ fontSize: 9 }} />
                    {SECTION_LABELS[m.key]}
                  </div>
                  <SectionWrap highlight={sectionHighlight(ruleResult, m.key)}>
                    {FREE_RENDERERS[m.key]({ tpl, data: effectiveData, paperWidth: PAPER_W })}
                  </SectionWrap>
                </div>
              );
            })}

            {effectiveData.report && (
              <div
                data-freeform-report
                style={{
                  position: 'absolute', right: 0, left: 0,
                  top: `${round1(lastBottomPct + 2)}%`,
                }}
              >
                {renderReport(tpl, effectiveData, false, PAPER_W)}
              </div>
            )}

            <Moveable
              target={moveableTarget}
              container={stageRef.current ?? undefined}
              zoom={zoom}
              draggable={false}
              rotatable={false}
              scalable={false}
              snappable={false}
              origin={false}
              resizable={{ edges: { left: true, right: false, top: false, bottom: false } }}
              onResize={handleResize}
              onResizeEnd={handleResizeEnd}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
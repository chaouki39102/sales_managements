/**
 * Freeform geometry — the SSOT for every millimetre conversion in the print
 * designer. Pure module: no React, no DOM, no store. Everything that positions
 * an element (preview, print, the designer stage, the flow items table) reads
 * its numbers from here so the canvas and the paper can never disagree.
 *
 * Coordinate space: the PAGE, in millimetres.
 *   - `x` is the distance from the RIGHT edge (RTL, so it maps straight onto
 *     CSS `right` with no flip at render time).
 *   - `y` is the distance from the top edge.
 * A4 is 210×297mm. The padded content box (page minus margins) is only used to
 * convert LEGACY percentage geometry, which the first freeform prototype stored
 * relative to the content box.
 */
import type { ElementKey, ElementMode, ElementPosition, LegacyElementPosition, PrintTemplate } from '../types';

/** Pixels per millimetre used by the whole preview layer (`mm()` in
 *  `preview/shared.tsx` multiplies by 3.78). Kept as the literal inverse so the
 *  two can never drift. */
export const MM_PER_PX = 1 / 3.78;

/** Snap grid for the designer, in millimetres. */
export const SNAP_MM = 1;

/** CSS-ish bag of declarations. Declared locally so this module stays free of
 *  any React import. */
export type CssLike = Record<string, string | number | undefined>;

export type PageBox = {
  pageW: number;   // mm
  pageH: number | null; // mm — `null` for roll/thermal paper with automatic height
  padTop: number;  // mm
  padRight: number;
  padBottom: number;
  padLeft: number;
  contentW: number; // mm
  contentH: number; // mm — 0 when the page height is automatic
};

export type ResolvedGeometry = {
  x: number;
  y: number;
  w: number;
  h?: number;
  rotate: number;
  z: number;
  mode: ElementMode;
};

/** Paper sizes in mm (portrait). Landscape swaps w/h. */
const PAPER_MM: Record<string, { w: number; h: number | null }> = {
  A4: { w: 210, h: 297 },
  A5: { w: 148, h: 210 },
};

const DEFAULT_MARGIN_MM = 5;

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Page box (paper + margins) in millimetres for a template. */
export function pageBoxMm(tpl: Pick<PrintTemplate, 'paper_size' | 'page_orientation' | 'margin_top' | 'margin_sides' | 'margin_bottom' | 'paper_width_mm'>): PageBox {
  const landscape = tpl.page_orientation === 'landscape';
  const spec = PAPER_MM[tpl.paper_size];

  let pageW: number;
  let pageH: number | null;
  if (spec) {
    pageW = spec.w;
    pageH = spec.h;
  } else if (tpl.paper_size === '80mm' || tpl.paper_size === '58mm') {
    pageW = num(tpl.paper_width_mm, tpl.paper_size === '80mm' ? 80 : 58);
    pageH = null; // roll paper — height grows with content
  } else {
    // Sticker / label papers are authored in a px design space at 8px per mm.
    const m = /^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)mm$/.exec(tpl.paper_size);
    pageW = m ? Number(m[1]) : 210;
    pageH = m ? Number(m[2]) : 297;
  }
  if (landscape && pageH != null) {
    const t = pageW;
    pageW = pageH;
    pageH = t;
  }

  const padTop = Math.max(0, num(tpl.margin_top, DEFAULT_MARGIN_MM));
  const padBottom = Math.max(0, num(tpl.margin_bottom, DEFAULT_MARGIN_MM));
  const padSide = Math.max(0, num(tpl.margin_sides, DEFAULT_MARGIN_MM));

  return {
    pageW,
    pageH,
    padTop,
    padRight: padSide,
    padBottom,
    padLeft: padSide,
    contentW: Math.max(0, pageW - padSide * 2),
    contentH: pageH == null ? 0 : Math.max(0, pageH - padTop - padBottom),
  };
}

function isLegacy(raw: ElementPosition | LegacyElementPosition): raw is LegacyElementPosition {
  return typeof (raw as LegacyElementPosition).width === 'number'
    && typeof (raw as ElementPosition).w !== 'number';
}

/**
 * Normalise stored geometry (new mm, or legacy %) into millimetres on the page
 * box. Returns `null` when there is nothing usable, which the renderer treats as
 * "stay in the normal flow".
 */
export function normalizeElementGeometry(
  raw: ElementPosition | LegacyElementPosition | undefined | null,
  box: PageBox,
): ResolvedGeometry | null {
  if (!raw || typeof raw !== 'object') return null;

  let x: number;
  let y: number;
  let w: number;
  let h: number | undefined;

  if (isLegacy(raw)) {
    // Legacy % of the padded content box, `x` measured from the content's right
    // edge — so the page's own right margin has to be added back on.
    const contentH = box.contentH || 1;
    x = box.padRight + (num(raw.x, 0) / 100) * box.contentW;
    y = box.padTop + (num(raw.y, 0) / 100) * contentH;
    w = (num(raw.width, 100) / 100) * box.contentW;
  } else {
    const pos = raw as ElementPosition;
    x = num(pos.x, 0);
    y = num(pos.y, 0);
    w = num(pos.w, box.contentW);
    h = typeof pos.h === 'number' && Number.isFinite(pos.h) ? pos.h : undefined;
  }

  if (!(w > 0)) return null;

  return {
    x: Math.max(0, x),
    y: Math.max(0, y),
    w,
    h,
    rotate: num((raw as ElementPosition).rotate, 0),
    z: num((raw as ElementPosition).z, 0),
    mode: (raw as ElementPosition).mode === 'flow' ? 'flow' : 'fixed',
  };
}

/** Every element that has usable geometry, already in millimetres. */
export function resolveGeometryMap(
  tpl: Pick<PrintTemplate, 'element_positions'>,
  box: PageBox,
): Partial<Record<ElementKey, ResolvedGeometry>> {
  const out: Partial<Record<ElementKey, ResolvedGeometry>> = {};
  const raw = tpl.element_positions;
  if (!raw) return out;
  for (const key of Object.keys(raw) as ElementKey[]) {
    const geo = normalizeElementGeometry(raw[key], box);
    if (geo) out[key] = geo;
  }
  return out;
}

/** True when the template carries at least one element positioned by hand —
 *  i.e. the freeform layer must exist and the legacy geometry settings hide. */
export function hasElementGeometry(tpl: Pick<PrintTemplate, 'element_positions'>): boolean {
  const raw = tpl.element_positions;
  if (!raw) return false;
  return (Object.keys(raw) as ElementKey[]).some(k => !!raw[k] && typeof raw[k] === 'object');
}

/** Absolute box for `mode: 'fixed'`. */
export function fixedBoxStyle(geo: ResolvedGeometry): CssLike {
  return {
    position: 'absolute',
    top: `${geo.y}mm`,
    right: `${geo.x}mm`,
    width: `${geo.w}mm`,
    height: geo.h != null ? `${geo.h}mm` : undefined,
    overflow: geo.h != null ? 'hidden' : 'visible',
    transform: geo.rotate ? `rotate(${geo.rotate}deg)` : undefined,
    zIndex: 10 + geo.z,
  };
}

/** Normal-flow box for `mode: 'flow'`.
 *
 *  `geo.y` here is a NUDGE, not a page coordinate: it is the millimetre
 *  displacement applied *before* the element's natural flow position
 *  (`marginTop`). That keeps the element in the document flow — so the items
 *  table can still grow, paginate and repeat its `<thead>` — while allowing a
 *  deliberate offset from where the layout would have put it.
 *
 *  Capture a flow element from its measured rect with `y: 0` (natural
 *  placement) plus a width; feeding an absolute page-absolute `y` back through
 *  `rectToGeometry` would double-count the flow offset and break pagination.
 */
export function flowBoxStyle(geo: ResolvedGeometry): CssLike {
  return {
    width: `${geo.w}mm`,
    marginTop: `${geo.y}mm`,
    minHeight: geo.h != null ? `${geo.h}mm` : undefined,
  };
}

/** mm box → px (for the designer's overlay, which works in screen pixels). */
export function geometryToPx(geo: Pick<ResolvedGeometry, 'x' | 'y' | 'w' | 'h'>): { x: number; y: number; w: number; h?: number } {
  return {
    x: geo.x / MM_PER_PX,
    y: geo.y / MM_PER_PX,
    w: geo.w / MM_PER_PX,
    h: geo.h != null ? geo.h / MM_PER_PX : undefined,
  };
}

/** A DOM rect + the page rect it was measured against → page millimetres.
 *  Used by "capture all" to freeze the current flow layout into geometry. */
export function rectToGeometry(
  rect: { left: number; top: number; width: number; height: number },
  pageRect: { left: number; top: number; width: number; height: number },
): ElementPosition {
  // The page renders RTL, so the origin is the page's right edge, not its left.
  const fromRight = (pageRect.left + pageRect.width) - (rect.left + rect.width);
  const round = (v: number) => Math.round(v * 100) / 100;
  return {
    x: round(Math.max(0, fromRight * MM_PER_PX)),
    y: round(Math.max(0, (rect.top - pageRect.top) * MM_PER_PX)),
    w: round(Math.max(0, rect.width * MM_PER_PX)),
    h: round(Math.max(0, rect.height * MM_PER_PX)),
  };
}

/** Keep a box on the paper. Used on every drag/resize commit. */
export function clampGeometry(geo: ResolvedGeometry, box: PageBox): ResolvedGeometry {
  const w = Math.min(Math.max(1, geo.w), box.pageW);
  const maxY = box.pageH != null ? Math.max(0, box.pageH - geo.y) : undefined;
  const h = geo.h == null ? undefined
    : box.pageH != null ? Math.min(geo.h, Math.max(0, box.pageH - geo.y)) : geo.h;
  return {
    ...geo,
    w,
    x: Math.min(Math.max(0, geo.x), Math.max(0, box.pageW - w)),
    y: maxY == null ? Math.max(0, geo.y) : Math.min(Math.max(0, geo.y), maxY),
    h,
  };
}

/** Snap a millimetre value to the grid. */
export function snapMm(value: number, grid: number = SNAP_MM): number {
  if (!(grid > 0)) return value;
  return Math.round(value / grid) * grid;
}

/** Elements whose CONTENT can exceed one page, so a fixed box would clip it and
 *  silently destroy multi-page pagination. The items table is the canonical
 *  case: freezing it into an absolute millimetre box would cut off every row
 *  past the first page and stop `<thead>` from repeating. */
export const FLOW_FIRST_ELEMENTS: ReadonlySet<string> = new Set<string>(['items.table']);

/** The mode a freshly captured element should get.
 *
 *  An element that is ALREADY flow or fixed keeps that mode — re-dragging must
 *  never silently promote a paginating table to a clipped fixed box. Only an
 *  element with no stored mode falls back to the element's natural default.
 *
 *  A captured `flow` element must store `y: 0` (natural placement): `geo.y`
 *  from `rectToGeometry` is an ABSOLUTE page offset, and `flowBoxStyle` reads
 *  `y` as a NUDGE, so feeding it through would displace the element twice.
 *  `h` is dropped as well so the box keeps auto-growing.
 */
export function defaultElementMode(
  key: string,
  prev?: { mode?: ElementMode } | null,
): ElementMode {
  if (prev?.mode === 'flow') return 'flow';
  if (prev?.mode === 'fixed') return 'fixed';
  return FLOW_FIRST_ELEMENTS.has(key) ? 'flow' : 'fixed';
}

/** Convert legacy percentage geometry to millimetres for every stored element.
 *  Returns the new map plus whether anything actually changed, so a save only
 *  touches `config` when a migration really happened. */
export function migrateLegacyGeometry(
  positions: PrintTemplate['element_positions'],
  box: PageBox,
): { map: Partial<Record<ElementKey, ElementPosition>>; changed: boolean } {
  const map: Partial<Record<ElementKey, ElementPosition>> = {};
  let changed = false;
  if (!positions) return { map, changed };
  for (const key of Object.keys(positions) as ElementKey[]) {
    const raw = positions[key];
    if (!raw || typeof raw !== 'object') continue;
    if (isLegacy(raw)) {
      const geo = normalizeElementGeometry(raw, box);
      if (geo) {
        map[key] = { x: geo.x, y: geo.y, w: geo.w, ...(geo.h != null ? { h: geo.h } : {}), rotate: geo.rotate, z: geo.z, mode: geo.mode };
        changed = true;
        continue;
      }
    }
    map[key] = raw as ElementPosition;
  }
  return { map, changed };
}

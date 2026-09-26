import { describe, it, expect } from 'vitest';
import {
  MM_PER_PX,
  pageBoxMm,
  normalizeElementGeometry,
  resolveGeometryMap,
  hasElementGeometry,
  fixedBoxStyle,
  flowBoxStyle,
  geometryToPx,
  rectToGeometry,
  clampGeometry,
  snapMm,
  migrateLegacyGeometry,
  defaultElementMode,
  FLOW_FIRST_ELEMENTS,
  type PageBox,
} from '../services/freeformGeometry';

const a4 = (over: Record<string, unknown> = {}) =>
  pageBoxMm({
    paper_size: 'A4',
    page_orientation: 'portrait',
    margin_top: 5,
    margin_sides: 5,
    margin_bottom: 5,
    paper_width_mm: 80,
    ...over,
  } as never);

describe('freeformGeometry — pageBoxMm', () => {
  it('A4 portrait is 210x297mm with 5mm margins', () => {
    const b = a4();
    expect(b.pageW).toBe(210);
    expect(b.pageH).toBe(297);
    expect(b.contentW).toBe(200);
    expect(b.contentH).toBe(287);
    expect(b.padTop).toBe(5);
    expect(b.padRight).toBe(5);
    expect(b.padLeft).toBe(5);
  });

  it('landscape swaps the page dimensions', () => {
    const b = a4({ page_orientation: 'landscape' });
    expect(b.pageW).toBe(297);
    expect(b.pageH).toBe(210);
  });

  it('roll paper has a null height and contentH 0', () => {
    const b = pageBoxMm({
      paper_size: '80mm', page_orientation: 'portrait',
      margin_top: 2, margin_sides: 2, margin_bottom: 2, paper_width_mm: 80,
    } as never);
    expect(b.pageW).toBe(80);
    expect(b.pageH).toBeNull();
    expect(b.contentH).toBe(0);
  });

  it('MM_PER_PX is the inverse of the 3.78 px/mm used by the preview', () => {
    expect(MM_PER_PX * 3.78).toBeCloseTo(1, 10);
  });
});

describe('freeformGeometry — normalizeElementGeometry', () => {
  const box = a4();

  it('returns null when there is no geometry (element stays in the normal flow)', () => {
    expect(normalizeElementGeometry(undefined, box)).toBeNull();
    expect(normalizeElementGeometry(null, box)).toBeNull();
  });

  it('passes millimetre geometry through unchanged and defaults to fixed', () => {
    const g = normalizeElementGeometry({ x: 10, y: 20, w: 50, h: 30 }, box)!;
    expect(g.x).toBe(10);
    expect(g.y).toBe(20);
    expect(g.w).toBe(50);
    expect(g.h).toBe(30);
    expect(g.mode).toBe('fixed');
    expect(g.rotate).toBe(0);
    expect(g.z).toBe(0);
  });

  it('preserves flow mode, rotation and z-order', () => {
    const g = normalizeElementGeometry({ x: 0, y: 5, w: 100, mode: 'flow', rotate: 15, z: 3 }, box)!;
    expect(g.mode).toBe('flow');
    expect(g.rotate).toBe(15);
    expect(g.z).toBe(3);
  });

  it('omits height when not provided', () => {
    expect(normalizeElementGeometry({ x: 0, y: 0, w: 10 }, box)!.h).toBeUndefined();
  });

  it('converts legacy percentages to page millimetres including the page margin', () => {
    // 50% of the 200mm content width, 10% of the 287mm content height.
    const g = normalizeElementGeometry({ x: 50, y: 10, width: 50 }, box)!;
    expect(g.x).toBeCloseTo(105, 6);   // 5mm page margin + 100mm
    expect(g.y).toBeCloseTo(33.7, 6);  // 5mm page margin + 28.7mm
    expect(g.w).toBeCloseTo(100, 6);
  });

  it('rejects a non-positive width', () => {
    expect(normalizeElementGeometry({ x: 0, y: 0, w: 0 }, box)).toBeNull();
    expect(normalizeElementGeometry({ x: 0, y: 0, w: -5 }, box)).toBeNull();
  });

  it('clamps negative coordinates to the page origin', () => {
    const g = normalizeElementGeometry({ x: -10, y: -20, w: 10 }, box)!;
    expect(g.x).toBe(0);
    expect(g.y).toBe(0);
  });
});

describe('freeformGeometry — map helpers', () => {
  it('resolveGeometryMap normalises every stored element', () => {
    const map = resolveGeometryMap(
      { element_positions: { 'items.table': { x: 0, y: 0, w: 200, mode: 'flow' } } } as never,
      a4(),
    );
    expect(map['items.table']?.mode).toBe('flow');
  });

  it('resolveGeometryMap returns an empty map when nothing is stored', () => {
    expect(resolveGeometryMap({} as never, a4())).toEqual({});
  });

  it('hasElementGeometry is true only for real object entries', () => {
    expect(hasElementGeometry({ element_positions: { 'header.logo': { x: 0, y: 0, w: 1 } } } as never)).toBe(true);
    expect(hasElementGeometry({ element_positions: {} } as never)).toBe(false);
    expect(hasElementGeometry({} as never)).toBe(false);
  });
});

describe('freeformGeometry — styles', () => {
  it('fixedBoxStyle maps x to CSS right and never uses a transform for 0 rotation', () => {
    const s = fixedBoxStyle({ x: 12, y: 34, w: 56, h: 78, rotate: 0, z: 0, mode: 'fixed' });
    expect(s.position).toBe('absolute');
    expect(s.right).toBe('12mm');
    expect(s.top).toBe('34mm');
    expect(s.width).toBe('56mm');
    expect(s.height).toBe('78mm');
    expect(s.transform).toBeUndefined();
    expect(s.zIndex).toBe(10);
  });

  it('fixedBoxStyle clips only when a height is set and rotates around z-index', () => {
    expect(fixedBoxStyle({ x: 0, y: 0, w: 1, rotate: 0, z: 0, mode: 'fixed' }).overflow).toBe('visible');
    expect(fixedBoxStyle({ x: 0, y: 0, w: 1, rotate: 0, z: 0, mode: 'fixed' }).height).toBeUndefined();
    const rot = fixedBoxStyle({ x: 0, y: 0, w: 1, h: 5, rotate: 30, z: 4, mode: 'fixed' });
    expect(rot.transform).toBe('rotate(30deg)');
    expect(rot.zIndex).toBe(14);
  });

  it('flowBoxStyle uses marginTop as a nudge so the element can still paginate', () => {
    const s = flowBoxStyle({ x: 0, y: 7, w: 150, h: undefined, rotate: 0, z: 0, mode: 'flow' });
    expect(s.marginTop).toBe('7mm');
    expect(s.width).toBe('150mm');
    // No absolute positioning and no fixed height: the box must grow and paginate.
    expect(s.position).toBeUndefined();
    expect(s.height).toBeUndefined();
  });

  it('flowBoxStyle keeps minHeight but never a hard height', () => {
    const s = flowBoxStyle({ x: 0, y: 0, w: 100, h: 20, rotate: 0, z: 0, mode: 'flow' });
    expect(s.minHeight).toBe('20mm');
    expect(s.height).toBeUndefined();
  });
});

describe('freeformGeometry — measurement', () => {
  it('geometryToPx converts millimetres to pixels at the 3.78 px/mm scale', () => {
    // The preview layer draws at 3.78 px per mm (see `mm()` in preview/shared.tsx),
    // so 1mm must come out as 3.78px — NOT 10px.
    const px = geometryToPx({ x: 1, y: 2, w: 100, h: 50 });
    expect(px.x).toBeCloseTo(3.78, 6);
    expect(px.y).toBeCloseTo(7.56, 6);
    expect(px.w).toBeCloseTo(378, 6);
    expect(px.h).toBeCloseTo(189, 6);
  });

  it('geometryToPx round-trips a rect measured by rectToGeometry', () => {
    const g = rectToGeometry(
      { left: 100, top: 50, width: 200, height: 40 },
      { left: 0, top: 0, width: 400, height: 600 },
    );
    const px = geometryToPx({ x: g.x, y: g.y, w: g.w, h: g.h });
    expect(px.x).toBeCloseTo(100, 0);
    expect(px.y).toBeCloseTo(50, 0);
    expect(px.w).toBeCloseTo(200, 0);
    expect(px.h).toBeCloseTo(40, 0);
  });

  it('rectToGeometry measures x from the page RIGHT edge (RTL)', () => {
    const g = rectToGeometry(
      { left: 100, top: 50, width: 200, height: 40 },
      { left: 0, top: 0, width: 400, height: 600 },
    );
    // page right edge = 400; element right edge = 300 → 100px from the right
    expect(g.x).toBeCloseTo((100 / 3.78), 2);
    expect(g.y).toBeCloseTo((50 / 3.78), 2);
    expect(g.w).toBeCloseTo((200 / 3.78), 2);
  });

  it('rectToGeometry clamps offsets that fall outside the page to 0', () => {
    // The page is 400px wide, so a box at left 410 with a 10px width pokes past
    // the page's RIGHT edge by 20px → the right-origin x must clamp to 0.
    const g = rectToGeometry(
      { left: 410, top: -10, width: 10, height: 10 },
      { left: 0, top: 0, width: 400, height: 600 },
    );
    expect(g.x).toBe(0);
    expect(g.y).toBe(0);
  });
});

describe('freeformGeometry — clampGeometry', () => {
  it('keeps a box on the paper horizontally', () => {
    const box = a4();
    const c = clampGeometry({ x: 999, y: 10, w: 50, h: 10, rotate: 0, z: 0, mode: 'fixed' }, box);
    expect(c.x).toBe(160); // pageW - w
    expect(c.w).toBe(50);
  });

  it('clamps the height so the box cannot run past the page bottom', () => {
    const box = a4();
    const c = clampGeometry({ x: 0, y: 290, w: 50, h: 100, rotate: 0, z: 0, mode: 'fixed' }, box);
    expect(c.h).toBe(7); // pageH - y
  });

  it('never produces a zero or negative width', () => {
    const box = a4();
    expect(clampGeometry({ x: 0, y: 0, w: 0, rotate: 0, z: 0, mode: 'fixed' }, box).w).toBe(1);
    expect(clampGeometry({ x: 0, y: 0, w: 9999, rotate: 0, z: 0, mode: 'fixed' }, box).w).toBe(210);
  });

  it('leaves roll-paper (null pageH) height untouched', () => {
    const roll = pageBoxMm({
      paper_size: '80mm', page_orientation: 'portrait',
      margin_top: 2, margin_sides: 2, margin_bottom: 2, paper_width_mm: 80,
    } as never);
    const c = clampGeometry({ x: 0, y: 5000, w: 10, h: 999, rotate: 0, z: 0, mode: 'fixed' }, roll);
    expect(c.y).toBe(5000);
    expect(c.h).toBe(999);
  });
});

describe('freeformGeometry — snapMm', () => {
  it('snaps to the 1mm grid by default', () => {
    expect(snapMm(10.4)).toBe(10);
    expect(snapMm(10.6)).toBe(11);
  });

  it('respects a custom grid and passes through a non-positive one', () => {
    expect(snapMm(11, 5)).toBe(10);
    expect(snapMm(11, 0)).toBe(11);
  });
});

describe('freeformGeometry — migrateLegacyGeometry', () => {
  const box: PageBox = a4();

  it('reports no change for an empty or missing map', () => {
    expect(migrateLegacyGeometry(undefined, box)).toEqual({ map: {}, changed: false });
    expect(migrateLegacyGeometry({}, box)).toEqual({ map: {}, changed: false });
  });

  it('converts legacy entries and reports the change', () => {
    const { map, changed } = migrateLegacyGeometry(
      { 'header.logo': { x: 0, y: 0, width: 20 } } as never,
      box,
    );
    expect(changed).toBe(true);
    expect(map['header.logo']?.w).toBeCloseTo(40, 6); // 20% of 200mm
    expect(map['header.logo']?.x).toBeCloseTo(5, 6);  // the page's right margin
    expect(map['header.logo']?.mode).toBe('fixed');
  });

  it('leaves already-modern entries byte-identical and reports no change', () => {
    const modern = { x: 5, y: 6, w: 7, mode: 'flow' as const };
    const { map, changed } = migrateLegacyGeometry({ 'items.table': modern } as never, box);
    expect(changed).toBe(false);
    expect(map['items.table']).toBe(modern);
  });
});

describe('freeformGeometry — defaultElementMode', () => {
  it('keeps an element that is already flow in the flow (never promotes it)', () => {
    expect(defaultElementMode('items.table', { mode: 'flow' })).toBe('flow');
  });

  it('keeps an element that is already fixed', () => {
    expect(defaultElementMode('items.table', { mode: 'fixed' })).toBe('fixed');
    expect(defaultElementMode('header.logo', { mode: 'fixed' })).toBe('fixed');
  });

  it('defaults a never-positioned paginating element to flow', () => {
    // A first drag of the items table must NOT freeze it into a clipped box.
    expect(defaultElementMode('items.table', null)).toBe('flow');
    expect(defaultElementMode('items.table', {})).toBe('flow');
  });

  it('defaults an ordinary element with no stored mode to fixed', () => {
    expect(defaultElementMode('header.logo', null)).toBe('fixed');
    expect(defaultElementMode('totals.block', undefined)).toBe('fixed');
  });

  it('lists the items table as the flow-first element', () => {
    expect(FLOW_FIRST_ELEMENTS.has('items.table')).toBe(true);
    expect(FLOW_FIRST_ELEMENTS.has('header.logo')).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import {
  sectionsToPuckData,
  puckContentToSectionKeys,
  reorderSectionsPreservingMetas,
} from '../components/puck/sectionsOrderAdapter';
import { buildDefaultSectionsOrder } from '../services/layoutMigration';
import type { SectionMeta } from '../types/domain';

const DEFAULTS = buildDefaultSectionsOrder();

/** A realistic SectionMeta list with a few custom fields set. */
function sampleOrder(): SectionMeta[] {
  return [
    { key: 'header', visible: true, order: 0, width: 100 },
    { key: 'doc-info', visible: false, order: 1 },
    { key: 'items', visible: true, order: 2 },
    { key: 'totals', visible: true, order: 3, align: 'right', marginTop: 4, marginBottom: 4 },
    { key: 'payments', visible: true, order: 4 },
    { key: 'footer', visible: true, order: 5, minHeight: 20 },
  ];
}

describe('sectionsOrderAdapter — sectionsToPuckData', () => {
  it('maps each section to one content entry carrying only the key as props.id', () => {
    const data = sectionsToPuckData(sampleOrder());
    expect(data.root.props).toEqual({});
    expect(data.content).toHaveLength(6);
    expect(data.content.map((c) => c.type)).toEqual(DEFAULTS.map((d) => d.key));
    expect(data.content.map((c) => c.props?.id)).toEqual(DEFAULTS.map((d) => d.key));
  });

  it('returns empty content for an empty order', () => {
    const data = sectionsToPuckData([]);
    expect(data.content).toEqual([]);
  });
});

describe('sectionsOrderAdapter — puckContentToSectionKeys', () => {
  it('reads keys back in order', () => {
    const data = sectionsToPuckData(sampleOrder());
    expect(puckContentToSectionKeys(data.content)).toEqual(DEFAULTS.map((d) => d.key));
  });

  it('returns [] for null, undefined, and non-array input', () => {
    expect(puckContentToSectionKeys(null)).toEqual([]);
    expect(puckContentToSectionKeys(undefined)).toEqual([]);
    expect(puckContentToSectionKeys('nope' as never)).toEqual([]);
    expect(puckContentToSectionKeys({} as never)).toEqual([]);
  });

  it('skips entries with a missing, empty, or non-string props.id', () => {
    const keys = puckContentToSectionKeys([
      { type: 'header', props: { id: 'header' } },
      { type: 'totals', props: { id: '' } },
      { type: 'items', props: {} },
      { type: 'payments', props: { id: null } },
      { type: 'footer', props: { id: 'footer' } },
      { type: 'doc-info' },
    ]);
    expect(keys).toEqual(['header', 'footer']);
  });
});

describe('sectionsOrderAdapter — reorderSectionsPreservingMetas', () => {
  it('reproduces the dragged order with sequential order values', () => {
    const dragged = ['totals', 'items', 'payments', 'doc-info', 'header', 'footer'];
    const out = reorderSectionsPreservingMetas(sampleOrder(), dragged);
    expect(out.map((s) => s.key)).toEqual(dragged);
    out.forEach((s, i) => expect(s.order).toBe(i));
  });

  it('preserves every SectionMeta field on existing keys', () => {
    const out = reorderSectionsPreservingMetas(sampleOrder(), ['totals', 'header']);
    const totals = out.find((s) => s.key === 'totals');
    expect(totals).toMatchObject({
      key: 'totals',
      visible: true,
      align: 'right',
      marginTop: 4,
      marginBottom: 4,
    });
    const header = out.find((s) => s.key === 'header');
    expect(header).toMatchObject({ key: 'header', visible: true, width: 100 });
  });

  it('ignores unknown keys and duplicate keys, keeping untouched sections as re-appends', () => {
    const dragged = ['header', 'nope', 'totals', 'header', 'totals', 'footer'];
    const out = reorderSectionsPreservingMetas(sampleOrder(), dragged);
    expect(out.map((s) => s.key)).toEqual(['header', 'totals', 'footer', 'doc-info', 'items', 'payments']);
    out.forEach((s, i) => expect(s.order).toBe(i));
  });

  it('re-appends sections dropped from the drag surface instead of losing them', () => {
    const out = reorderSectionsPreservingMetas(sampleOrder(), ['header', 'items']);
    expect(out.map((s) => s.key)).toEqual(
      ['header', 'items', 'doc-info', 'totals', 'payments', 'footer'],
    );
    out.forEach((s, i) => expect(s.order).toBe(i));
  });

  it('only re-appends sections NOT already seen', () => {
    const out = reorderSectionsPreservingMetas(sampleOrder(), ['header', 'doc-info', 'totals']);
    expect(out.map((s) => s.key)).toEqual(['header', 'doc-info', 'totals', 'items', 'payments', 'footer']);
  });

  it('fills default metas for keys missing from current', () => {
    const current: SectionMeta[] = [{ key: 'items', visible: true, order: 0 }];
    const out = reorderSectionsPreservingMetas(current, ['header', 'items']);
    const header = out.find((s) => s.key === 'header');
    expect(header).toEqual({ key: 'header', visible: true, order: 0 });
  });

  it('returns the full default order for an empty current + empty dragged list', () => {
    const out = reorderSectionsPreservingMetas([], []);
    expect(out).toEqual(DEFAULTS);
  });
});
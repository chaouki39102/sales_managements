import { describe, it, expect } from 'vitest';
import { isSettingVisible, SETTINGS_REGISTRY } from '../services/SettingsRegistry';
import { getExpandedRegistry } from './fixtures/expanded-registry';

type DocType = 'FV' | 'BL' | 'DEV' | 'BCC' | 'AA' | 'FA' | 'BR' | 'AV' | 'DDP' | 'BT' | 'POS' | 'RPT';
type PaperSize = '80mm' | '58mm' | 'A4' | 'A5';

const ALL_DOCS: DocType[] = ['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV', 'DDP', 'BT', 'POS', 'RPT'];
const ALL_PAPERS: PaperSize[] = ['80mm', '58mm', 'A4', 'A5'];

function makeTpl(doc: DocType, paper: PaperSize, overrides: Record<string, any> = {}): Record<string, any> {
  const base: Record<string, any> = Object.fromEntries(
    Object.entries(SETTINGS_REGISTRY).map(([k, m]) => [k, m.defaultValue])
  );

  // Enable all toggle dependsOn parents so children are un-gated for doc/paper tests
  // Also set non-toggle parents to their dependsOnValue so their children are visible
  for (const [_key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (meta.dependsOn) {
      const parentMeta = SETTINGS_REGISTRY[meta.dependsOn];
      if (parentMeta && parentMeta.component === 'toggle') {
        base[meta.dependsOn] = true;
      } else if (meta.dependsOnValue !== undefined) {
        // pills/select: set parent to the dependsOnValue so child is visible
        base[meta.dependsOn] = meta.dependsOnValue;
      }
    }
  }

  return { doc_type_code: doc, paper_size: paper, ...base, ...overrides };
}

describe('VisibilityEngine — isSettingVisible', () => {
  const expanded = getExpandedRegistry();

  for (const doc of ALL_DOCS) {
    for (const paper of ALL_PAPERS) {
      it(`should show only compatible settings for ${doc}/${paper}`, () => {
        const tpl = makeTpl(doc, paper);
        for (const setting of expanded) {
          const visible = isSettingVisible(setting.key, doc, paper, tpl);
          const shouldBeVisible =
            setting.expandedDocs.includes(doc) && setting.expandedPapers.includes(paper);
          if (visible !== shouldBeVisible) {
            throw new Error(
              `FAIL: ${setting.key} visibility mismatch for ${doc}/${paper}. ` +
              `Expected ${shouldBeVisible} but got ${visible}. ` +
              `Docs: [${setting.expandedDocs}], Papers: [${setting.expandedPapers}]`
            );
          }
        }
      });
    }
  }
});

describe('VisibilityEngine — DependsOn Gating', () => {
  it('should hide children when toggle parent is OFF', () => {
    const parents = Object.entries(SETTINGS_REGISTRY).filter(
      ([, m]) => m.category !== 'global' && Object.values(SETTINGS_REGISTRY).some(
        s => s.dependsOn === m.key && m.component === 'toggle'
      )
    );

    for (const [, parentMeta] of parents) {
      const children = Object.entries(SETTINGS_REGISTRY).filter(
        ([, m]) => m.dependsOn === parentMeta.key && m.key !== 'barcode_custom_text'
      );
      if (children.length === 0) continue;

      const tpl = makeTpl('FV', '80mm');
      tpl[parentMeta.key] = false;

      for (const [childKey] of children) {
        expect(isSettingVisible(childKey, 'FV', '80mm', tpl)).toBe(false);
      }
    }
  });

  it('should show children when toggle parent is ON', () => {
    const expanded = getExpandedRegistry();

    for (const [parentKey, parentMeta] of Object.entries(SETTINGS_REGISTRY)) {
      if (parentMeta.component !== 'toggle') continue;
      const children = Object.entries(SETTINGS_REGISTRY).filter(
        ([, m]) => m.dependsOn === parentKey
      );
      if (children.length === 0) continue;

      const tpl = makeTpl('FV', '80mm');
      tpl[parentKey] = true;

      for (const [childKey] of children) {
        const childExpanded = expanded.find(s => s.key === childKey)!;
        const fitsDocPaper = childExpanded.expandedDocs.includes('FV') && childExpanded.expandedPapers.includes('80mm');
        if (!fitsDocPaper) continue;

        expect(isSettingVisible(childKey, 'FV', '80mm', tpl)).toBe(true);
      }
    }
  });
});

describe('VisibilityEngine — Edge Cases', () => {
  it('should handle unknown setting gracefully', () => {
    const tpl = makeTpl('FV', '80mm');
    expect(isSettingVisible('nonexistent_setting' as any, 'FV', '80mm', tpl)).toBe(true);
  });

  it('should handle missing tpl field', () => {
    const tpl = { doc_type_code: 'FV', paper_size: '80mm' };
    const result = isSettingVisible('show_logo', 'FV', '80mm', tpl as any);
    expect(typeof result).toBe('boolean');
  });

  it('barcode_custom_text should be visible only when barcode_content is custom', () => {
    const tpl = makeTpl('FV', '80mm');
    // dependsOnValue: 'custom' — only visible when parent equals 'custom'
    tpl['barcode_content'] = 'custom';
    expect(isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl)).toBe(true);

    tpl['barcode_content'] = 'doc-number';
    expect(isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl)).toBe(false);

    tpl['barcode_content'] = 'default';
    expect(isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl)).toBe(false);
  });
});

describe('VisibilityEngine — dependsOnValue Gating (non-toggle parents)', () => {
  it('should hide children when non-toggle parent value does not match dependsOnValue', () => {
    // Find all settings with dependsOnValue
    const withDependsOnValue = Object.entries(SETTINGS_REGISTRY).filter(
      ([, m]) => m.dependsOnValue !== undefined && m.dependsOn
    );

    for (const [childKey, childMeta] of withDependsOnValue) {
      const tpl = makeTpl('FV', '80mm');
      // Set parent to a value that does NOT match dependsOnValue
      (tpl as any)[childMeta.dependsOn!] = '__wrong_value__';
      expect(isSettingVisible(childKey, 'FV', '80mm', tpl)).toBe(false);
    }
  });

  it('should show children when non-toggle parent value matches dependsOnValue', () => {
    const withDependsOnValue = Object.entries(SETTINGS_REGISTRY).filter(
      ([, m]) => m.dependsOnValue !== undefined && m.dependsOn
    );

    for (const [childKey, childMeta] of withDependsOnValue) {
      const tpl = makeTpl('FV', '80mm');
      // Set parent to the exact dependsOnValue
      (tpl as any)[childMeta.dependsOn!] = childMeta.dependsOnValue;
      expect(isSettingVisible(childKey, 'FV', '80mm', tpl)).toBe(true);
    }
  });

  it('should handle 3-level chain: toggle OFF hides grandchild even when direct parent matches', () => {
    // Chain: show_barcode (toggle) → barcode_content (pills) → barcode_custom_text (input, dependsOnValue: 'custom')
    const tpl = makeTpl('FV', '80mm');

    // Root toggle OFF → barcode_content hidden
    tpl.show_barcode = false;
    expect(isSettingVisible('barcode_content', 'FV', '80mm', tpl)).toBe(false);

    // Even if we force-set barcode_content = 'custom', barcode_custom_text is still hidden
    // because its ancestor show_barcode is OFF
    (tpl as any).barcode_content = 'custom';
    expect(isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl)).toBe(false);

    // Now turn root ON → barcode_content visible (value='custom') → barcode_custom_text visible
    tpl.show_barcode = true;
    expect(isSettingVisible('barcode_content', 'FV', '80mm', tpl)).toBe(true);
    expect(isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl)).toBe(true);

    // Root ON but barcode_content ≠ 'custom' → barcode_custom_text hidden
    (tpl as any).barcode_content = 'doc-number';
    expect(isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl)).toBe(false);
  });
});

/**
 * The 14 legacy layout settings that only describe where a section sits inside
 * the normal document flow. Once a template carries freeform element geometry
 * the real positions live in `element_positions` (millimetres on the page), so
 * these controls become meaningless.
 *
 * All 14 are `supportedPapers: PAGE` + `supportedDocs: ALL_DOCS` with no
 * `dependsOn`, so FV/A4 is a clean "would normally be visible" baseline.
 */
const FREEFORM_OBSOLETE_KEYS = [
  'section_header_width', 'section_header_align',
  'section_doc_info_width', 'section_doc_info_align',
  'section_items_width', 'section_items_align',
  'section_totals_width', 'section_totals_align',
  'section_payments_width', 'section_payments_align',
  'section_footer_width', 'section_footer_align',
  'header_columns_gap', 'client_card_width',
];

/** Settings that live INSIDE a freeform box — they must survive the gate. */
const FREEFORM_KEPT_KEYS = [
  'col_order', 'col_widths', 'col_show', 'col_aligns', 'col_headers',
  'table_cell_padding', 'table_header_bg', 'table_header_bold',
  'items_font_family', 'items_font_size',
  'show_barcode', 'font_family',
];

describe('VisibilityEngine — freeform geometry gate', () => {
  const geometryTpl = (positions: unknown) =>
    makeTpl('FV', 'A4', { element_positions: positions });

  it('every gated key is natively visible on FV/A4 without geometry', () => {
    const tpl = makeTpl('FV', 'A4');
    for (const key of FREEFORM_OBSOLETE_KEYS) {
      expect(SETTINGS_REGISTRY[key], `${key} must exist in the registry`).toBeDefined();
      expect(isSettingVisible(key, 'FV', 'A4', tpl), `${key} should start visible`).toBe(true);
    }
  });

  it('hides all 14 positional keys once element geometry exists', () => {
    const tpl = geometryTpl({ 'items.table': { x: 0, y: 0, w: 200, mode: 'flow' } });
    for (const key of FREEFORM_OBSOLETE_KEYS) {
      expect(isSettingVisible(key, 'FV', 'A4', tpl), `${key} should be hidden`).toBe(false);
    }
  });

  it('a single positioned element is enough to arm the gate', () => {
    const tpl = geometryTpl({ 'header.logo': { x: 10, y: 10, w: 20, h: 20 } });
    expect(isSettingVisible('section_header_width', 'FV', 'A4', tpl)).toBe(false);
  });

  it('keeps the gate armed for legacy percentage geometry (width instead of w)', () => {
    const tpl = geometryTpl({ 'header.logo': { x: 0, y: 0, width: 20 } });
    expect(isSettingVisible('client_card_width', 'FV', 'A4', tpl)).toBe(false);
  });

  it('an empty or absent element_positions map leaves the layout controls alone', () => {
    for (const positions of [{}, undefined, null]) {
      const tpl = geometryTpl(positions);
      for (const key of FREEFORM_OBSOLETE_KEYS) {
        expect(isSettingVisible(key, 'FV', 'A4', tpl), `${key} should stay visible`).toBe(true);
      }
    }
  });

  it('never hides the settings that render INSIDE a freeform box', () => {
    const tpl = geometryTpl({ 'items.table': { x: 0, y: 0, w: 200, mode: 'flow' } });
    for (const key of FREEFORM_KEPT_KEYS) {
      expect(SETTINGS_REGISTRY[key], `${key} must exist in the registry`).toBeDefined();
      expect(isSettingVisible(key, 'FV', 'A4', tpl), `${key} must stay visible`).toBe(true);
    }
  });

  it('leaves a template with no tpl argument untouched (gate is opt-in)', () => {
    for (const key of FREEFORM_OBSOLETE_KEYS) {
      expect(isSettingVisible(key, 'FV', 'A4')).toBe(true);
    }
  });
});

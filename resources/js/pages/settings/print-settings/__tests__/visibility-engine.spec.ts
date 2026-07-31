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
  for (const [_key, meta] of Object.entries(SETTINGS_REGISTRY)) {
    if (meta.dependsOn) {
      const parentMeta = SETTINGS_REGISTRY[meta.dependsOn];
      if (parentMeta && parentMeta.component === 'toggle') {
        base[meta.dependsOn] = true;
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

  it('barcode_custom_text should not be auto-gated by dependsOn', () => {
    const tpl = makeTpl('FV', '80mm');
    tpl['barcode_content'] = 'doc-number';
    const visible = isSettingVisible('barcode_custom_text', 'FV', '80mm', tpl);
    expect(visible).toBe(true);
  });
});

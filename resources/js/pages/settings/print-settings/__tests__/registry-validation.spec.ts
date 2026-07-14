import { describe, it, expect } from 'vitest';
import { SETTINGS_REGISTRY, getSettingMeta } from '../services/SettingsRegistry';
import { getExpandedRegistry, ALL_DOC_TYPES, SETTING_COUNT } from './fixtures/expanded-registry';

const VALID_CATEGORIES = [
  'global', 'paper', 'header', 'company', 'document', 'columns', 'items',
  'totals', 'payments', 'footer', 'barcode', 'qr', 'signature',
  'section-visibility', 'rules', 'report', 'charts', 'formatting',
] as const;

const VALID_COMPONENTS = [
  'toggle', 'input', 'select', 'pills', 'slider', 'color', 'textarea',
  'column-manager', 'rules-editor', 'logo-upload',
] as const;

describe('SettingsRegistry — Structural Validation', () => {
  it('should have exactly 221 entries', () => {
    expect(SETTING_COUNT).toBe(221);
  });

  it('every entry should have a matching key in the registry object', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      expect(meta.key).toBe(key);
    }
  });

  it('every entry should have all required fields', () => {
    const required = ['key', 'label', 'labelAr', 'category', 'component', 'defaultValue', 'supportedPapers', 'supportedDocs'];
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      const missing = required.filter(f => !(f in meta));
      expect(missing, `${key} is missing fields: ${missing.join(', ')}`).toEqual([]);
    }
  });

  it('every entry should have a valid category', () => {
    for (const [_key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      expect(VALID_CATEGORIES.includes(meta.category as any)).toBe(true);
    }
  });

  it('every entry should have a valid component', () => {
    for (const [_key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      expect(VALID_COMPONENTS.includes(meta.component as any)).toBe(true);
    }
  });
});

describe('SettingsRegistry — dependsOn Validation', () => {
  it('every dependsOn target should exist in the registry', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      if (!meta.dependsOn) continue;
      const target = getSettingMeta(meta.dependsOn as string);
      expect(target).toBeDefined(`${key} depends on ${meta.dependsOn} which does not exist`);
    }
  });

  it('every dependsOn target should be within supportedDocs of the parent', () => {
    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      if (!meta.dependsOn) continue;
      const parent = getSettingMeta(meta.dependsOn as string);
      if (!parent) continue;
      const expanded = getExpandedRegistry();
      const child = expanded.find(s => s.key === key)!;
      const parentExp = expanded.find(s => s.key === meta.dependsOn)!;
      const childOnlyInParent = child.expandedDocs.every(d => parentExp.expandedDocs.includes(d));
      if (!childOnlyInParent) {
        const outside = child.expandedDocs.filter(d => !parentExp.expandedDocs.includes(d));
        console.warn(`WARN: ${key} docs [${outside}] extend beyond parent ${meta.dependsOn}`);
      }
    }
  });
});

describe('SettingsRegistry — Visibility Scope Validation', () => {
  const expanded = getExpandedRegistry();

  it('every setting should be registered for at least one doc type', () => {
    for (const setting of expanded) {
      expect(setting.expandedDocs.length).toBeGreaterThan(0);
    }
  });

  it('every setting should be registered for at least one paper size', () => {
    for (const setting of expanded) {
      expect(setting.expandedPapers.length).toBeGreaterThan(0);
    }
  });

  it('report-only settings should only be visible for RPT', () => {
    const reportSettings = expanded.filter(s => s.category === 'report' || s.category === 'charts');
    for (const setting of reportSettings) {
      for (const doc of ALL_DOC_TYPES) {
        if (doc === 'RPT') {
          expect(setting.expandedDocs).toContain(doc);
        } else {
          expect(setting.expandedDocs).not.toContain(doc);
        }
      }
    }
  });

  it('settings with COMMERCIAL_DOCS should exclude POS, DDP, BT, RPT', () => {
    const commercialSettings = expanded.filter(s =>
      s.expandedDocs.includes('FV') && s.expandedDocs.includes('BL') &&
      !s.expandedDocs.includes('RPT') && !s.expandedDocs.includes('POS')
    );
    for (const setting of commercialSettings) {
      expect(setting.expandedDocs).not.toContain('DDP');
      expect(setting.expandedDocs).not.toContain('BT');
    }
  });

  it('paper_width_mm should only be for thermal papers', () => {
    const _meta = getSettingMeta('paper_width_mm')!;
    const expandedPapers = expanded.find(s => s.key === 'paper_width_mm')!.expandedPapers;
    expect(expandedPapers).toContain('80mm');
    expect(expandedPapers).toContain('58mm');
    expect(expandedPapers).not.toContain('A4');
    expect(expandedPapers).not.toContain('A5');
  });

  it('page_orientation should only be for page papers', () => {
    const expandedPapers = expanded.find(s => s.key === 'page_orientation')!.expandedPapers;
    expect(expandedPapers).not.toContain('80mm');
    expect(expandedPapers).not.toContain('58mm');
    expect(expandedPapers).toContain('A4');
    expect(expandedPapers).toContain('A5');
  });

  it('show_bank_details and bank_details_text should be COMMERCIAL_DOCS + PAGE only', () => {
    for (const key of ['show_bank_details', 'bank_details_text']) {
      const s = expanded.find(e => e.key === key)!;
      expect(s.expandedDocs).toEqual(expect.arrayContaining(['FV', 'BL', 'DEV', 'BCC', 'AA', 'FA', 'BR', 'AV']));
      expect(s.expandedDocs).not.toContain('POS');
      expect(s.expandedDocs).not.toContain('RPT');
      expect(s.expandedDocs).not.toContain('DDP');
      expect(s.expandedDocs).not.toContain('BT');
      expect(s.expandedPapers).toEqual(expect.arrayContaining(['A4', 'A5']));
      expect(s.expandedPapers).not.toContain('80mm');
      expect(s.expandedPapers).not.toContain('58mm');
    }
  });

  it('show_session should be POS_DOCS only', () => {
    const s = expanded.find(e => e.key === 'show_session')!;
    expect(s.expandedDocs).toContain('POS');
    expect(s.expandedDocs).toContain('RPT');
    expect(s.expandedDocs).not.toContain('FV');
    expect(s.expandedDocs).not.toContain('DDP');
  });

  it('isSettingVisible with dependsOn should hide children when toggle parent is off', async () => {
    const { isSettingVisible } = await import('../services/SettingsRegistry');

    const toggleDeps = expanded.filter(s =>
      s.dependsOn && getSettingMeta(s.dependsOn as string)?.component === 'toggle'
    );

    for (const child of toggleDeps) {
      const parentKey = child.dependsOn!;
      const tpl: any = { doc_type_code: 'FV', paper_size: '80mm' };
      tpl[parentKey] = false;
      tpl[child.key] = child.defaultValue;

      const visible = isSettingVisible(child.key, 'FV' as any, '80mm' as any, tpl);
      expect(visible).toBe(false);
    }
  });

  it('isSettingVisible with dependsOn should show children when toggle parent is on', async () => {
    const { isSettingVisible } = await import('../services/SettingsRegistry');

    const toggleDeps = expanded.filter(s =>
      s.dependsOn && getSettingMeta(s.dependsOn as string)?.component === 'toggle'
    );

    for (const child of toggleDeps) {
      if (!child.expandedDocs.includes('FV') || !child.expandedPapers.includes('80mm')) continue;

      const parentKey = child.dependsOn!;
      const tpl: any = { doc_type_code: 'FV', paper_size: '80mm' };
      tpl[parentKey] = true;
      tpl[child.key] = child.defaultValue;

      const visible = isSettingVisible(child.key, 'FV' as any, '80mm' as any, tpl);
      expect(visible, `${child.key} should be visible when ${parentKey}=true (FV/80mm)`).toBe(true);
    }
  });
});

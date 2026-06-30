import { describe, it, expect } from 'vitest';
import { normalizeTemplate, toApiPayload, fromApiResponse, TEMPLATE_VERSION } from '../services/SettingsSerializer';
import { SETTINGS_REGISTRY } from '../services/SettingsRegistry';
import { createMockTemplate } from './fixtures/templates';

describe('SettingsSerializer — normalizeTemplate', () => {
  it('should fill all missing fields from registry defaults', () => {
    const minimal: any = { id: null, doc_type_code: 'POS', paper_size: '80mm' };
    const result = normalizeTemplate(minimal, 'POS', '80mm');

    for (const [key, meta] of Object.entries(SETTINGS_REGISTRY)) {
      if (key === 'id' || key === 'name' || key === 'doc_type_code' || key === 'paper_size') continue;
      expect(result).toHaveProperty(key);
    }
  });

  it('should preserve valid user values', () => {
    const result = normalizeTemplate(
      { id: null, doc_type_code: 'FV', paper_size: '80mm', show_logo: false, title_text: 'Ma Facture' },
      'FV', '80mm',
    );
    expect(result.show_logo).toBe(false);
    expect(result.title_text).toBe('Ma Facture');
  });

  it('should set template_version', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '80mm' }, 'POS', '80mm');
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should override old template_version', () => {
    const result = normalizeTemplate(
      { id: 1, doc_type_code: 'FV', paper_size: '80mm', template_version: 1 } as any,
      'FV', '80mm',
    );
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should set paper_width_mm for 80mm thermal', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '80mm' }, 'POS', '80mm');
    expect(result.paper_width_mm).toBe(80);
  });

  it('should set paper_width_mm for 58mm thermal', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '58mm' }, 'POS', '58mm');
    expect(result.paper_width_mm).toBe(58);
  });

  it('should not override paper_width_mm for page sizes', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'FV', paper_size: 'A4', paper_width_mm: 80 } as any, 'FV', 'A4');
    expect(result.paper_width_mm).toBe(80);
  });

  it('should ensure name is not empty', () => {
    const result = normalizeTemplate({ id: null, doc_type_code: 'POS', paper_size: '80mm', name: '' }, 'POS', '80mm');
    expect(result.name).toBeTruthy();
  });
});

describe('SettingsSerializer — toApiPayload', () => {
  it('should strip top-level fields into config', () => {
    const tpl = createMockTemplate({}, 'FV', '80mm');
    const payload = toApiPayload(tpl);

    expect(payload.name).toBe(tpl.name);
    expect(payload.doc_type_code).toBe('FV');
    expect(payload.paper_size).toBe('80mm');
    expect(payload.is_default).toBe(true);
    expect(payload.is_active).toBe(true);
    expect(payload.template_version).toBe(TEMPLATE_VERSION);

    expect(payload.config.show_logo).toBe(true);
    expect(payload.config.title_text).toBe('FACTURE');
    expect(payload.config.margin_top).toBe(3);
  });

  it('should not include id, created_at, updated_at in config', () => {
    const tpl = createMockTemplate({}, 'FV', '80mm');
    const payload = toApiPayload(tpl);

    expect(payload.config).not.toHaveProperty('id');
    expect(payload.config).not.toHaveProperty('created_at');
    expect(payload.config).not.toHaveProperty('updated_at');
  });

  it('should include template_version in top level', () => {
    const tpl = createMockTemplate({}, 'FV', '80mm');
    const payload = toApiPayload(tpl);
    expect(payload.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should handle partial templates', () => {
    const payload = toApiPayload({ name: 'Test', doc_type_code: 'POS', paper_size: '80mm' });
    expect(payload.name).toBe('Test');
    expect(payload.doc_type_code).toBe('POS');
    expect(payload.paper_size).toBe('80mm');
  });
});

describe('SettingsSerializer — fromApiResponse', () => {
  it('should reconstruct a full template from API response', () => {
    const response = {
      id: 1,
      name: 'Default Template',
      doc_type_code: 'FV',
      paper_size: '80mm',
      is_default: true,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      config: {
        show_logo: true,
        show_company_name: false,
        title_text: 'FACTURE',
        margin_top: 5,
        paper_width_mm: 80,
      },
    };

    const result = fromApiResponse(response as any);

    expect(result.id).toBe(1);
    expect(result.name).toBe('Default Template');
    expect(result.doc_type_code).toBe('FV');
    expect(result.paper_size).toBe('80mm');
    expect(result.show_logo).toBe(true);
    expect(result.show_company_name).toBe(false);
    expect(result.title_text).toBe('FACTURE');
    expect(result.margin_top).toBe(5);
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });

  it('should handle null config', () => {
    const result = fromApiResponse({
      id: 1,
      name: 'Test',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: null,
    } as any);

    expect(result.show_logo).toBeDefined();
    expect(result.title_text).toBeDefined();
  });

  it('should fill defaults for missing config fields', () => {
    const result = fromApiResponse({
      id: 1,
      name: 'Minimal',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {},
    } as any);

    expect(result.show_logo).toBe(true);
    expect(result.show_barcode).toBe(true);
    expect(result.col_order).toBeDefined();
  });
});

describe('SettingsSerializer — Round-trip Symmetry', () => {
  it('should round-trip all 144+ settings without data loss', () => {
    const original = createMockTemplate({
      show_logo: false,
      show_company_name: false,
      title_text: 'TEST INVOICE',
      margin_top: 12,
      logo_size: 100,
      header_separator: 'double',
      col_order: ['rowNumber', 'barcode', 'name', 'quantity', 'price', 'discount', 'tva', 'total'],
      footer_legal_text: 'Legal notice test',
      rules: [{ id: 'r1', condition: 'total > 100', action: 'highlight', target: 'totals' }],
      show_report_cashier: false,
    }, 'RPT', 'A4');

    const payload = toApiPayload(original);
    const restored = fromApiResponse({
      id: original.id!,
      name: original.name,
      doc_type_code: original.doc_type_code,
      paper_size: original.paper_size,
      is_default: original.is_default,
      is_active: original.is_active,
      config: payload.config as any,
    } as any);

    const settingKeys = Object.keys(SETTINGS_REGISTRY).filter(k =>
      !['id', 'name', 'doc_type_code', 'paper_size', 'template_version', 'created_at', 'updated_at'].includes(k)
    );

    for (const key of settingKeys) {
      const origVal = JSON.stringify((original as any)[key]);
      const restVal = JSON.stringify((restored as any)[key]);
      expect(restVal).toBe(origVal);
    }
  });

  it('should preserve unknown/deprecated fields', () => {
    const response = {
      id: 1,
      name: 'Test',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {
        show_logo: true,
        _deprecated_field: 'should be preserved',
        _legacy_setting: 42,
      },
    };

    const result = fromApiResponse(response as any);
    expect((result as any)._deprecated_field).toBe('should be preserved');
    expect((result as any)._legacy_setting).toBe(42);
  });

  it('should set template_version for old version-1 templates', () => {
    const result = fromApiResponse({
      id: 1, name: 'Old', doc_type_code: 'FV', paper_size: '80mm',
      is_default: false, is_active: true,
      config: {},
    } as any);
    expect(result.template_version).toBe(TEMPLATE_VERSION);
  });
});

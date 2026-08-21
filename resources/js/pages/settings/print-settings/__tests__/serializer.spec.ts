import { describe, it, expect } from 'vitest';
import { toApiPayload, fromApiResponse, TEMPLATE_VERSION } from '../services/SettingsSerializer';
import { SETTINGS_REGISTRY } from '../services/SettingsRegistry';
import { createMockTemplate } from './fixtures/templates';

/** Known top-level fields that go in the DB columns (NOT inside config). */
const KNOWN_TOP_LEVEL = new Set([
  'id', 'name', 'doc_type_code', 'paper_size', 'is_default', 'is_active',
  'template_version', 'created_at', 'updated_at',
]);

/** Keys that toApiPayload actually writes to the top-level output. */
const WRITABLE_TOP_LEVEL = new Set([
  'name', 'doc_type_code', 'paper_size', 'is_default', 'is_active', 'template_version',
]);

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

    const cfg = payload.config as Record<string, unknown>;
    expect(cfg.show_logo).toBe(true);
    expect(cfg.title_text).toBe('FACTURE');
    expect(cfg.margin_top).toBe(3);
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

  it('should skip non-serializable config values (functions, circular refs)', () => {
    const fn = () => {};
    const circular: Record<string, unknown> = {};
    circular.self = circular;

    const tpl = createMockTemplate({
      show_logo: fn as any,
      title_text: circular as any,
    }, 'FV', 'A4');

    const payload = toApiPayload(tpl);
    const config = payload.config as Record<string, unknown>;

    expect(config).not.toHaveProperty('show_logo');
    expect(config).not.toHaveProperty('title_text');
    expect(config.margin_top).toBe(3);
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

  it('should default show_qr_code ON for FV and OFF for other doc types', () => {
    const fv = fromApiResponse({
      id: 1,
      name: 'FV',
      doc_type_code: 'FV',
      paper_size: 'A4',
      is_default: false,
      is_active: true,
      config: { title_text: 'FACTURE' },
    } as any);

    expect(fv.show_qr_code).toBe(true);
    expect(fv.qr_code_size).toBe(48);
    expect(fv.qr_code_align).toBe('center');

    const pos = fromApiResponse({
      id: 2,
      name: 'POS',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {},
    } as any);

    expect(pos.show_qr_code).toBe(false);

    const fromConfig = fromApiResponse({
      id: 3,
      name: 'FV',
      doc_type_code: 'FV',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: { show_qr_code: false },
    } as any);

    expect(fromConfig.show_qr_code).toBe(false);
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

    // null config → registry defaults injected
    expect(result.show_logo).toBe(true);
    expect(result.title_text).toBe('فاتورة بيع');
  });

  it('should return only explicitly stored config keys', () => {
    const result = fromApiResponse({
      id: 1,
      name: 'Minimal',
      doc_type_code: 'POS',
      paper_size: '80mm',
      is_default: false,
      is_active: true,
      config: {},
    } as any);

    // empty config → registry defaults injected
    expect(result.show_logo).toBe(true);
    expect(result.show_barcode).toBe(true);
    expect(result.col_order).toEqual(['name', 'quantity', 'price', 'total']);
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

describe('SettingsSerializer — TOP_LEVEL_KEYS Drift Guard', () => {
  it('toApiPayload must include all writable top-level keys in its output', () => {
    const tpl = createMockTemplate({}, 'FV', 'A4');
    const payload = toApiPayload(tpl);
    const outputTopKeys = new Set(Object.keys(payload));

    for (const key of WRITABLE_TOP_LEVEL) {
      expect(outputTopKeys.has(key)).toBe(true);
    }
  });

  it('toApiPayload config must NOT contain any known top-level key', () => {
    const tpl = createMockTemplate({}, 'FV', 'A4');
    const payload = toApiPayload(tpl);
    const config = payload.config as Record<string, unknown>;

    for (const key of KNOWN_TOP_LEVEL) {
      expect(config).not.toHaveProperty(key);
    }
  });
});
